/**
 * Instructor auth routes
 *
 * - POST /auth/login          — Instructor login (public, rate-limited)
 * - POST /auth/forgot-password — Forgot password OTP (public, rate-limited)
 * - POST /auth/reset-password  — Reset password with OTP (public)
 * - GET  /auth/check           — Verify instructor session (instructorAuth)
 * - DELETE /auth/logout        — Instructor logout (instructorAuth)
 * - POST /change-password      — Change password (instructorAuth)
 */

import { Hono } from 'hono';
import type { Env } from '../../env';
import {
  instructorAuthMiddleware,
  type InstructorOrAdminAuthVariables,
} from '../../lib/instructor-auth-middleware';
import { deleteInstructorSession, createInstructorSession } from '../../lib/instructor-auth';
import { authenticateUser, hashPassword, verifyPassword } from '../../lib/auth-password';
import { getErrorMessage } from '../../lib/utils';
import { rateLimit } from '../../lib/rate-limit';
import { formatInstructorRow } from './helpers';

const routes = new Hono<{ Bindings: Env; Variables: InstructorOrAdminAuthVariables }>();

// POST /auth/login — Instructor login (public, no auth middleware)
routes.post('/auth/login', async (c) => {
  // Rate limit: 5 per 15 min
  const limited = await rateLimit(c, 'auth');
  if (limited) return limited;

  try {
    const { email, password } = await c.req.json<{ email: string; password: string }>();

    if (!email || !password) {
      return c.json({ error: 'Email and password are required' }, 400);
    }

    // Authenticate user via D1
    const authResult = await authenticateUser(c.env, email, password);

    if (!authResult.success) {
      return c.json({ error: 'Invalid email or password' }, 401);
    }

    const userId = authResult.userId!;
    const userEmail = authResult.userEmail!;
    const userName = authResult.userName!;
    const userRole = authResult.userRole || 'student';
    const avatarUrl = authResult.avatarUrl || '';

    // Only allow instructor role
    if (userRole !== 'instructor') {
      return c.json({ error: 'This login is for instructors only. Please use the student or admin portal.' }, 403);
    }

    // Create instructor session
    const token = await createInstructorSession(
      c.env,
      userId,
      userEmail,
      userName,
      c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown',
      c.req.header('user-agent') || 'unknown',
      avatarUrl
    );

    // Also fetch the full instructor profile
    let profile: Record<string, unknown> | null = null;
    try {
      const row = await c.env.DB.prepare(
        'SELECT * FROM instructors WHERE id = ?'
      ).bind(userId).first();
      if (row) {
        profile = formatInstructorRow(row as Record<string, unknown>);
      }
    } catch {}

    return c.json({
      success: true,
      token,
      user: {
        id: userId,
        email: userEmail,
        name: userName,
        role: 'instructor',
        avatarUrl,
        ...(profile || {}),
      },
    });
  } catch (error) {
    const message = getErrorMessage(error);
    console.error('Instructor login error:', error);
    return c.json({ error: message }, 401);
  }
});

// POST /auth/forgot-password — Instructor forgot password (public)
routes.post('/auth/forgot-password', async (c) => {
  // Rate limit: 3 per 5 min
  const limited = await rateLimit(c, 'otp');
  if (limited) return limited;

  try {
    const { email } = await c.req.json<{ email: string }>();
    if (!email) return c.json({ error: 'Email is required' }, 400);

    // Check if instructor exists in D1
    const user = await c.env.DB.prepare(
      "SELECT id, email, name, role FROM users WHERE email = ? AND role = 'instructor'"
    ).bind(email).first();

    if (!user) {
      // Always return success to prevent email enumeration
      return c.json({ success: true, message: 'If an instructor account exists with this email, you will receive a password reset code.' });
    }

    // Generate 6-digit OTP
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    await c.env.DB.prepare(`
      INSERT INTO otp_codes (target, code, type, expires_at, verified, attempts)
      VALUES (?, ?, 'password_reset', ?, 0, 0)
    `).bind(email, otp, expiresAt).run();

    // Send OTP email via Resend
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${c.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: c.env.RESEND_FROM_EMAIL,
          to: [email],
          subject: 'DAKKHO Instructor - Password Reset Code',
          html: `<div style="font-family:sans-serif;text-align:center;max-width:500px;margin:0 auto;">
            <div style="background:linear-gradient(135deg,#0a0a0a,#333);padding:24px;border-radius:16px 16px 0 0;">
              <h1 style="color:white;margin:0;font-size:20px;">DAKKHO Instructor</h1>
            </div>
            <div style="padding:24px;background:white;border-radius:0 0 16px 16px;">
              <h2 style="color:#1e293b;">Password Reset</h2>
              <p style="color:#64748b;">Your reset code:</p>
              <div style="background:#f1f5f9;padding:16px;border-radius:12px;margin:16px 0;">
                <span style="font-size:28px;font-weight:bold;letter-spacing:8px;color:#0a0a0a;">${otp}</span>
              </div>
              <p style="color:#94a3b8;font-size:13px;">Expires in 10 minutes. Do not share this code.</p>
            </div>
          </div>`,
        }),
      });
    } catch (err) {
      console.error('Failed to send OTP email:', err);
    }

    return c.json({ success: true, message: 'If an instructor account exists with this email, you will receive a password reset code.' });
  } catch {
    return c.json({ success: true, message: 'If an instructor account exists with this email, you will receive a password reset code.' });
  }
});

// POST /auth/reset-password — Reset password with OTP (public)
routes.post('/auth/reset-password', async (c) => {
  try {
    const { email, otp, password } = await c.req.json<{ email: string; otp: string; password: string }>();
    if (!email || !otp || !password) {
      return c.json({ error: 'email, otp, and password are required' }, 400);
    }
    if (password.length < 8) {
      return c.json({ error: 'Password must be at least 8 characters' }, 400);
    }

    // Verify OTP
    const otpRecord = await c.env.DB.prepare(
      "SELECT id, expires_at, verified FROM otp_codes WHERE target = ? AND code = ? AND type = 'password_reset' ORDER BY created_at DESC LIMIT 1"
    ).bind(email, otp).first<{ id: number; expires_at: string; verified: number }>();

    if (!otpRecord || otpRecord.verified || new Date(otpRecord.expires_at) < new Date()) {
      return c.json({ error: 'Invalid or expired OTP code' }, 400);
    }

    // Mark OTP as used
    await c.env.DB.prepare('UPDATE otp_codes SET verified = 1 WHERE id = ?').bind(otpRecord.id).run();

    // Find user
    const user = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first<{ id: string }>();
    if (!user) return c.json({ error: 'User not found' }, 404);

    // Update password
    const passwordHash = await hashPassword(password);
    await c.env.DB.prepare(
      'UPDATE users SET password_hash = ?, password_migrated = 1, updated_at = ? WHERE id = ?'
    ).bind(passwordHash, new Date().toISOString(), user.id).run();

    // Invalidate all sessions
    try { await c.env.DB.prepare('UPDATE instructor_sessions SET is_active = 0 WHERE user_id = ?').bind(user.id).run(); } catch {}

    return c.json({ success: true, message: 'Password has been reset successfully. Please login with your new password.' });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// GET /auth/check — Verify instructor session
routes.get('/auth/check', instructorAuthMiddleware, async (c) => {
  try {
    const instructorId = c.get('instructorId');
    const instructorEmail = c.get('instructorEmail');
    const instructorName = c.get('instructorName');
    const instructorAvatarUrl = c.get('instructorAvatarUrl');

    return c.json({
      authenticated: true,
      user: {
        id: instructorId,
        email: instructorEmail,
        name: instructorName,
        avatarUrl: instructorAvatarUrl,
        role: 'instructor',
      },
    });
  } catch (error) {
    return c.json({ authenticated: false }, 401);
  }
});

// DELETE /auth/logout — Instructor logout
routes.delete('/auth/logout', instructorAuthMiddleware, async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const token = authHeader?.substring(7) || '';

    await deleteInstructorSession(c.env, token);

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// POST /change-password — Change instructor password (instructorAuth ONLY)
routes.post('/change-password', instructorAuthMiddleware, async (c) => {
  try {
    const instructorId = c.get('instructorId');
    const instructorEmail = c.get('instructorEmail');
    const { current_password, new_password } = await c.req.json<{ current_password: string; new_password: string }>();

    if (!current_password || !new_password) {
      return c.json({ error: 'Current and new password are required' }, 400);
    }

    if (new_password.length < 8) {
      return c.json({ error: 'New password must be at least 8 characters' }, 400);
    }

    // Verify current password using D1 lookup + verifyPassword
    const user = await c.env.DB.prepare(
      'SELECT id, email, password_hash, password_migrated FROM users WHERE id = ?'
    ).bind(instructorId).first<{ id: string; email: string; password_hash: string | null; password_migrated: number }>();

    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    if (user.password_hash && user.password_migrated === 1) {
      // Fully migrated — verify with D1 password hash
      const valid = await verifyPassword(current_password, user.password_hash);
      if (!valid) {
        return c.json({ error: 'Current password is incorrect' }, 400);
      }
    } else {
      // Not migrated yet — use authenticateUser which falls back to Appwrite
      const authResult = await authenticateUser(c.env, instructorEmail, current_password);
      if (!authResult.success) {
        return c.json({ error: 'Current password is incorrect' }, 400);
      }
    }

    // Hash the new password and update in D1
    const newPasswordHash = await hashPassword(new_password);
    await c.env.DB.prepare(
      'UPDATE users SET password_hash = ?, password_migrated = 1, updated_at = ? WHERE id = ?'
    ).bind(newPasswordHash, new Date().toISOString(), instructorId).run();

    return c.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

export default routes;
