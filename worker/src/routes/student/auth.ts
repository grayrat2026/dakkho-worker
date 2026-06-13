/**
 * Student Auth Routes
 * Signup, login, logout, me, verify-otp, forgot-password, reset-password, resend-otp, otp-cooldown
 */

import { Hono } from 'hono';
import type { Env } from '../../env';
import {
  getStudentAuth,
  getStudentUserDoc,
  getInstituteName,
  getTechnologyName,
  generateOTP,
  sendPasswordResetEmail,
  checkDailyEmailRateLimit,
  getErrorMessage,
  hashPassword,
  verifyPassword,
  createStudentSession,
  deleteStudentSession,
  rateLimit,
  type StudentAuthVariables,
} from './helpers';
import { logError } from '../../lib/error-monitor';

const routes = new Hono<{ Bindings: Env; Variables: StudentAuthVariables }>();

// POST /auth/signup — Create student account
routes.post('/auth/signup', async (c) => {
  try {
    // Rate limit: 3 registrations per 15 min
    const limited = await rateLimit(c, 'register');
    if (limited) return limited;

    const { fullName, email, password, instituteId, technology } = await c.req.json();

    if (!fullName || !email || !password) {
      return c.json({ error: 'fullName, email, and password are required' }, 400);
    }

    if (password.length < 8) {
      return c.json({ error: 'Password must be at least 8 characters' }, 400);
    }

    // Check if user already exists
    const existing = await c.env.DB.prepare(
      'SELECT id FROM users WHERE email = ?'
    ).bind(email).first();

    if (existing) {
      return c.json({ error: 'An account with this email already exists' }, 400);
    }

    // Create user in D1
    const userId = crypto.randomUUID();
    const passwordHash = await hashPassword(password);

    await c.env.DB.prepare(`
      INSERT INTO users (id, email, full_name, institute_id, technology, role, email_verified, is_active, enrolled_course_ids, password_hash)
      VALUES (?, ?, ?, ?, ?, 'student', 0, 1, '[]', ?)
    `).bind(userId, email, fullName, instituteId || null, technology || null, passwordHash).run();

    // Create default user preferences
    await c.env.DB.prepare(`
      INSERT OR IGNORE INTO user_preferences (user_id, theme_mode, accent_color, font_size, border_radius, compact_mode)
      VALUES (?, 'system', '#0ea5e9', 16, 16, 0)
    `).bind(userId).run();

    // Create default notification preferences
    await c.env.DB.prepare(
      'INSERT OR IGNORE INTO notification_preferences (user_id) VALUES (?)'
    ).bind(userId).run();

    // ── Per-user daily rate limit for verification emails ──
    const rl = await checkDailyEmailRateLimit(c.env.DB, email);
    if (!rl.allowed) {
      return c.json({ error: `Too many verification emails. You can send up to ${rl.limit} emails per day. Please try again tomorrow.`, code: 'RATE_LIMITED' }, 429);
    }

    // Generate and send email verification OTP (cryptographically secure)
    const verifyOtp = generateOTP();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    await c.env.DB.prepare(
      'INSERT INTO password_reset_otps (email, otp, purpose, expires_at, used, created_at) VALUES (?, ?, ?, ?, 0, ?)'
    ).bind(email, verifyOtp, 'email_verification', otpExpiresAt, new Date().toISOString()).run();

    // Send verification email
    try {
      const { sendEmail } = await import('../../lib/resend');
      await sendEmail(c.env, email, 'DAKKHO — Verify Your Email Address', `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #0ea5e9; font-size: 28px; margin: 0;">DAKKHO</h1>
            <p style="color: #64748b; margin: 4px 0 0;">Bangladesh's Premier Polytechnic Platform</p>
          </div>
          <div style="background: #f8fafc; border-radius: 16px; padding: 32px; text-align: center;">
            <h2 style="color: #0f172a; font-size: 20px; margin: 0 0 8px;">Welcome to DAKKHO, ${fullName}!</h2>
            <p style="color: #334155; font-size: 16px; margin: 0 0 24px;">Please verify your email address to get started.</p>
            <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #0ea5e9; background: white; border: 2px dashed #e2e8f0; border-radius: 12px; padding: 16px; display: inline-block;">
              ${verifyOtp}
            </div>
            <p style="color: #64748b; font-size: 14px; margin: 16px 0 0;">This code expires in 10 minutes.</p>
            <p style="color: #94a3b8; font-size: 13px; margin: 8px 0 0;">If you did not create an account, please ignore this email.</p>
          </div>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          <p style="color: #94a3b8; font-size: 12px; text-align: center;">
            Sent from DAKKHO — Bangladesh's Premier Polytechnic Student Platform<br />
            noreply@dakkho.pro.bd
          </p>
        </div>
      `);
    } catch (emailError: any) {
      console.error('Failed to send verification email:', emailError.message);
      // Don't fail signup if email fails, but log it
    }

    // Look up institute name and technology name for the response
    const instituteName = await getInstituteName(c.env, instituteId || null);
    const technologyName = await getTechnologyName(c.env, technology || null);

    // Create D1 student session
    const token = await createStudentSession(c.env, userId, email);

    return c.json({
      success: true,
      token,
      userId,
      user: {
        id: userId,
        name: fullName,
        email,
        instituteId: instituteId || null,
        instituteName: instituteName || null,
        technology: technology || null,
        technologyName: technologyName || null,
        emailVerified: false,
        packages: [],
        themeMode: 'system',
      },
    });
  } catch (error) {
    await logError(c.env.KV_CONFIG, {
      error,
      route: '/api/auth/signup',
      method: 'POST',
      ip: c.req.header('CF-Connecting-IP'),
      userAgent: c.req.header('User-Agent'),
      statusCode: 500,
    });
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// POST /auth/login — Login student
routes.post('/auth/login', async (c) => {
  try {
    // Rate limit: 5 login attempts per 15 min
    const limited = await rateLimit(c, 'auth');
    if (limited) return limited;

    const { email, password } = await c.req.json();

    if (!email || !password) {
      return c.json({ error: 'Email and password are required' }, 400);
    }

    // Look up user in D1
    const user = await c.env.DB.prepare(
      'SELECT id, email, full_name, role, password_hash, institute_id, technology, email_verified, is_active, avatar_url FROM users WHERE email = ? AND is_active = 1'
    ).bind(email).first<{ id: string; email: string; full_name: string; role: string; password_hash: string; institute_id: number | null; technology: string | null; email_verified: number; is_active: number; avatar_url: string | null }>();

    if (!user) {
      return c.json({ error: 'Invalid email or password' }, 401);
    }

    // Verify password using PBKDF2 (supports salt:hash format)
    const validPassword = await verifyPassword(password, user.password_hash);
    if (!validPassword) {
      return c.json({ error: 'Invalid email or password' }, 401);
    }

    // Verify this is a student (not admin/super_admin)
    if (user.role === 'admin' || user.role === 'super_admin') {
      return c.json({ error: 'Admin accounts cannot login here. Use the admin panel.' }, 403);
    }

    // Get user packages from D1
    let userPackages: any[] = [];
    try {
      const pkgResult = await c.env.DB.prepare(
        "SELECT up.*, cp.package_type, cp.price, cp.duration_months FROM user_packages up JOIN course_packages cp ON up.package_id = cp.id WHERE up.user_id = ? AND up.status = 'active' ORDER BY up.activated_at DESC"
      ).bind(user.id).all();
      userPackages = pkgResult.results as any[];
    } catch {}

    // Get user theme preference from D1
    let themeMode = 'system';
    try {
      const prefs = await c.env.DB.prepare(
        'SELECT theme_mode FROM user_preferences WHERE user_id = ?'
      ).bind(user.id).first();
      if (prefs && (prefs as any).theme_mode) {
        themeMode = (prefs as any).theme_mode;
      }
    } catch {}

    // Look up institute name and technology name
    const instituteName = await getInstituteName(c.env, user.institute_id || null);
    const technologyName = await getTechnologyName(c.env, user.technology || null);

    // Delete any existing D1 sessions and create new one
    await c.env.DB.prepare('DELETE FROM student_sessions WHERE user_id = ?').bind(user.id).run();
    const token = await createStudentSession(c.env, user.id, user.email);

    return c.json({
      success: true,
      token,
      userId: user.id,
      user: {
        id: user.id,
        name: user.full_name,
        email: user.email,
        instituteId: user.institute_id || null,
        instituteName: instituteName || null,
        technology: user.technology || null,
        technologyName: technologyName || null,
        emailVerified: !!user.email_verified,
        avatarUrl: user.avatar_url || '',
        packages: userPackages,
        themeMode,
      },
    });
  } catch (error) {
    const msg = getErrorMessage(error);
    await logError(c.env.KV_CONFIG, {
      error,
      route: '/api/auth/login',
      method: 'POST',
      ip: c.req.header('CF-Connecting-IP'),
      userAgent: c.req.header('User-Agent'),
      statusCode: 401,
    });
    return c.json({ error: msg.includes('Invalid') ? msg : 'Invalid email or password' }, 401);
  }
});

// POST /auth/logout — Logout student
routes.post('/auth/logout', async (c) => {
  try {
    const auth = await getStudentAuth(c);
    if (!auth.authorized) {
      return c.json({ success: true });
    }

    const authHeader = c.req.header('Authorization');
    const token = authHeader?.substring(7) || '';
    await deleteStudentSession(c.env, token);

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// GET /auth/me — Get current student profile
routes.get('/auth/me', async (c) => {
  try {
    const auth = await getStudentAuth(c);
    if (!auth.authorized) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Get user from D1
    const userDoc = await getStudentUserDoc(c.env, auth.userId!);

    // Get user packages from D1
    let userPackages: any[] = [];
    try {
      const pkgResult = await c.env.DB.prepare(
        "SELECT up.*, cp.package_type, cp.price, cp.duration_months FROM user_packages up JOIN course_packages cp ON up.package_id = cp.id WHERE up.user_id = ? AND up.status = 'active' ORDER BY up.activated_at DESC"
      ).bind(auth.userId).all();
      userPackages = pkgResult.results as any[];
    } catch {}

    const u = userDoc as any;

    // Get user theme preference from D1
    let themeMode = 'system';
    try {
      const prefs = await c.env.DB.prepare(
        'SELECT theme_mode FROM user_preferences WHERE user_id = ?'
      ).bind(auth.userId!).first();
      if (prefs && (prefs as any).theme_mode) {
        themeMode = (prefs as any).theme_mode;
      }
    } catch {}

    // Look up institute name and technology name
    const instituteName = await getInstituteName(c.env, (u?.institute_id as number) || null);
    const technologyName = await getTechnologyName(c.env, (u?.technology as string) || null);

    return c.json({
      user: {
        id: auth.userId,
        name: u?.full_name || auth.name || '',
        email: auth.email || u?.email || '',
        phone: u?.phone || null,
        bio: u?.bio || null,
        semester: u?.semester || null,
        instituteId: u?.institute_id || null,
        instituteName: instituteName || null,
        technology: u?.technology || null,
        technologyName: technologyName || null,
        emailVerified: !!u?.email_verified,
        avatarUrl: u?.avatar_url || '',
        role: u?.role || 'student',
        isActive: u?.is_active !== undefined ? !!u?.is_active : true,
        packages: userPackages,
        themeMode,
      },
    });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// POST /auth/verify-otp — Verify email with OTP
routes.post('/auth/verify-otp', async (c) => {
  try {
    const { email, otp } = await c.req.json();

    if (!email || !otp) {
      return c.json({ error: 'email and otp are required' }, 400);
    }

    // Validate OTP against stored codes — only email_verification purpose
    const otpRecord = await c.env.DB.prepare(
      'SELECT * FROM password_reset_otps WHERE email = ? AND otp = ? AND purpose = ? AND used = 0 ORDER BY created_at DESC LIMIT 1'
    ).bind(email, otp, 'email_verification').first<{ id: number; email: string; otp: string; purpose: string; expires_at: string; used: number; created_at: string }>();

    if (!otpRecord) {
      // Debug: check if the OTP exists but is already used or has different purpose
      const anyOtpRecord = await c.env.DB.prepare(
        'SELECT id, email, otp, purpose, used, expires_at FROM password_reset_otps WHERE email = ? AND otp = ? ORDER BY created_at DESC LIMIT 1'
      ).bind(email, otp).first<{ id: number; email: string; otp: string; purpose: string; used: number | null; expires_at: string }>();
      if (anyOtpRecord) {
        console.log(`OTP verify failed: email=${email}, otp=${otp}, found_purpose=${anyOtpRecord.purpose}, found_used=${anyOtpRecord.used}, expected_purpose=email_verification, expected_used=0`);
      } else {
        console.log(`OTP verify failed: no record found for email=${email}, otp=${otp}`);
      }
      return c.json({ success: false, message: 'Invalid or expired OTP' }, 400);
    }

    // Check expiry in JavaScript — works correctly with ISO 8601 dates
    if (new Date(otpRecord.expires_at) < new Date()) {
      // Mark expired OTP as used so it can't be retried
      await c.env.DB.prepare(
        'UPDATE password_reset_otps SET used = 1 WHERE id = ?'
      ).bind(otpRecord.id).run();
      return c.json({ success: false, message: 'OTP has expired. Please request a new one.' }, 400);
    }

    // Mark OTP as used
    await c.env.DB.prepare(
      'UPDATE password_reset_otps SET used = 1 WHERE id = ?'
    ).bind(otpRecord.id).run();

    // Mark email as verified
    const session = await c.env.DB.prepare(
      "SELECT user_id FROM student_sessions WHERE email = ? AND is_active = 1 ORDER BY created_at DESC LIMIT 1"
    ).bind(email).first<{ user_id: string }>();

    if (session?.user_id) {
      await c.env.DB.prepare(
        'UPDATE users SET email_verified = 1 WHERE id = ?'
      ).bind(session.user_id).run();
    } else {
      // Fallback: verify by email directly
      await c.env.DB.prepare(
        'UPDATE users SET email_verified = 1 WHERE email = ?'
      ).bind(email).run();
    }

    return c.json({ success: true, message: 'Email verified successfully' });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// GET /auth/otp-cooldown — Get remaining cooldown seconds for resending OTP
routes.get('/auth/otp-cooldown', async (c) => {
  try {
    const email = c.req.query('email');
    if (!email) {
      return c.json({ error: 'email query parameter is required' }, 400);
    }

    // Find the most recent OTP sent to this email (any purpose)
    const lastOtp = await c.env.DB.prepare(
      'SELECT created_at FROM password_reset_otps WHERE email = ? ORDER BY created_at DESC LIMIT 1'
    ).bind(email).first<{ created_at: string | null }>();

    if (!lastOtp || !lastOtp.created_at) {
      return c.json({ cooldownSeconds: 0 });
    }

    // Calculate remaining cooldown (60 seconds since last OTP was sent)
    const RESEND_COOLDOWN_SECONDS = 60;
    const sentAt = new Date(lastOtp.created_at).getTime();
    const now = Date.now();
    const elapsed = Math.floor((now - sentAt) / 1000);
    const remaining = Math.max(0, RESEND_COOLDOWN_SECONDS - elapsed);

    return c.json({ cooldownSeconds: remaining });
  } catch (error) {
    // On error, return 0 cooldown so user isn't stuck
    return c.json({ cooldownSeconds: 0 });
  }
});

// POST /auth/forgot-password — Request password reset OTP
routes.post('/auth/forgot-password', async (c) => {
  try {
    const { email } = await c.req.json();

    if (!email) {
      return c.json({ error: 'Email is required' }, 400);
    }

    // Check if user exists
    const user = await c.env.DB.prepare(
      'SELECT id FROM users WHERE email = ? AND is_active = 1'
    ).bind(email).first();

    if (user) {
      // ── Per-user daily rate limit ──
      const rl = await checkDailyEmailRateLimit(c.env.DB, email);
      if (!rl.allowed) {
        // Don't reveal rate limit to prevent email enumeration — still return success
        return c.json({ success: true, message: 'If an account exists with this email, a reset code has been sent.' });
      }

      // Delete any previous unused OTPs for this email with password_reset purpose
      await c.env.DB.prepare(
        'DELETE FROM password_reset_otps WHERE email = ? AND used = 0 AND purpose = ?'
      ).bind(email, 'password_reset').run();

      // Generate a 6-digit OTP
      const otp = generateOTP();

      // Store OTP in D1 with 5-minute expiration
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      await c.env.DB.prepare(
        'INSERT INTO password_reset_otps (email, otp, purpose, expires_at, used, created_at) VALUES (?, ?, ?, ?, 0, ?)'
      ).bind(email, otp, 'password_reset', expiresAt, new Date().toISOString()).run();

      // Send OTP email via Resend
      try {
        await sendPasswordResetEmail(c.env, email, otp);
      } catch (emailError) {
        console.error('Failed to send password reset email:', emailError);
        // Still return success for security — don't reveal email sending failure
      }
    }

    // Always return success for security (don't reveal if email exists)
    return c.json({ success: true, message: 'If an account exists with this email, a reset code has been sent.' });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// POST /auth/reset-password — Verify OTP and set new password
routes.post('/auth/reset-password', async (c) => {
  try {
    const { email, otp, newPassword } = await c.req.json();

    if (!email || !otp || !newPassword) {
      return c.json({ error: 'email, otp, and newPassword are required' }, 400);
    }

    if (newPassword.length < 8) {
      return c.json({ error: 'Password must be at least 8 characters' }, 400);
    }

    // Look up the most recent unused OTP for this email with password_reset purpose
    const otpRecord = await c.env.DB.prepare(
      'SELECT id, otp, expires_at, used FROM password_reset_otps WHERE email = ? AND purpose = ? AND used = 0 ORDER BY created_at DESC LIMIT 1'
    ).bind(email, 'password_reset').first<{ id: number; otp: string; expires_at: string; used: number }>();

    if (!otpRecord) {
      return c.json({ error: 'Invalid or expired reset code. Please request a new one.' }, 400);
    }

    // Check if OTP has expired
    if (new Date(otpRecord.expires_at) < new Date()) {
      // Mark expired OTP as used
      await c.env.DB.prepare(
        'UPDATE password_reset_otps SET used = 1 WHERE id = ?'
      ).bind(otpRecord.id).run();
      return c.json({ error: 'Reset code has expired. Please request a new one.' }, 400);
    }

    // Verify OTP
    if (otpRecord.otp !== otp) {
      return c.json({ error: 'Invalid reset code. Please try again.' }, 400);
    }

    // Mark OTP as used
    await c.env.DB.prepare(
      'UPDATE password_reset_otps SET used = 1 WHERE id = ?'
    ).bind(otpRecord.id).run();

    // Update the user's password
    const newPasswordHash = await hashPassword(newPassword);
    await c.env.DB.prepare(
      'UPDATE users SET password_hash = ?, updated_at = datetime(\'now\') WHERE email = ?'
    ).bind(newPasswordHash, email).run();

    // Invalidate all active student sessions for this user (force re-login)
    await c.env.DB.prepare(
      'UPDATE student_sessions SET is_active = 0 WHERE email = ?'
    ).bind(email).run();

    return c.json({ success: true, message: 'Password has been reset successfully.' });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// POST /auth/resend-otp — Resend OTP for email verification or password reset
routes.post('/auth/resend-otp', async (c) => {
  try {
    const { email } = await c.req.json();

    if (!email) {
      return c.json({ error: 'Email is required' }, 400);
    }

    // Check if user exists
    const user = await c.env.DB.prepare(
      'SELECT id FROM users WHERE email = ? AND is_active = 1'
    ).bind(email).first();

    if (user) {
      // Delete any previous unused OTPs for this email (both purposes)
      const userForPurpose = await c.env.DB.prepare(
        'SELECT email_verified FROM users WHERE email = ?'
      ).bind(email).first<{ email_verified: number }>();
      const resendPurpose = (userForPurpose && !userForPurpose.email_verified) ? 'email_verification' : 'password_reset';

      // ── Server-side cooldown: prevent resend within 60 seconds ──
      const lastOtp = await c.env.DB.prepare(
        'SELECT created_at FROM password_reset_otps WHERE email = ? ORDER BY created_at DESC LIMIT 1'
      ).bind(email).first<{ created_at: string | null }>();
      if (lastOtp?.created_at) {
        const lastSentAt = new Date(lastOtp.created_at).getTime();
        const elapsedSec = Math.floor((Date.now() - lastSentAt) / 1000);
        if (elapsedSec < 60) {
          return c.json({
            error: `Please wait ${60 - elapsedSec} seconds before requesting a new code.`,
            code: 'COOLDOWN_ACTIVE',
            cooldownSeconds: 60 - elapsedSec,
          }, 429);
        }
      }

      // ── Per-user daily rate limit ──
      const rl = await checkDailyEmailRateLimit(c.env.DB, email);
      if (!rl.allowed) {
        return c.json({
          error: `Too many verification emails. You can send up to ${rl.limit} emails per day. Please try again tomorrow.`,
          code: 'RATE_LIMITED',
        }, 429);
      }

      await c.env.DB.prepare(
        'DELETE FROM password_reset_otps WHERE email = ? AND used = 0 AND purpose = ?'
      ).bind(email, resendPurpose).run();

      // Generate a new 6-digit OTP
      const otp = generateOTP();

      // Store OTP with appropriate expiry: 10 min for email_verification, 5 min for password_reset
      const expiryMinutes = resendPurpose === 'email_verification' ? 10 : 5;
      const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000).toISOString();
      await c.env.DB.prepare(
        'INSERT INTO password_reset_otps (email, otp, purpose, expires_at, used, created_at) VALUES (?, ?, ?, ?, 0, ?)'
      ).bind(email, otp, resendPurpose, expiresAt, new Date().toISOString()).run();

      // Send OTP email via Resend
      try {
        if (resendPurpose === 'email_verification') {
          const { sendEmail } = await import('../../lib/resend');
          await sendEmail(c.env, email, 'DAKKHO — Your Verification Code', `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
              <div style="text-align: center; margin-bottom: 24px;">
                <h1 style="color: #0ea5e9; font-size: 28px; margin: 0;">DAKKHO</h1>
                <p style="color: #64748b; margin: 4px 0 0;">Email Verification</p>
              </div>
              <div style="background: #f8fafc; border-radius: 16px; padding: 32px; text-align: center;">
                <p style="color: #334155; font-size: 16px; margin: 0 0 16px;">Your email verification code is:</p>
                <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #0ea5e9; background: white; border: 2px dashed #e2e8f0; border-radius: 12px; padding: 16px; display: inline-block;">
                  ${otp}
                </div>
                <p style="color: #64748b; font-size: 14px; margin: 16px 0 0;">This code expires in ${expiryMinutes} minutes.</p>
                <p style="color: #94a3b8; font-size: 13px; margin: 8px 0 0;">If you did not request this, please ignore this email.</p>
              </div>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
              <p style="color: #94a3b8; font-size: 12px; text-align: center;">
                Sent from DAKKHO — Bangladesh's Premier Polytechnic Student Platform<br />
                noreply@dakkho.pro.bd
              </p>
            </div>
          `);
        } else {
          await sendPasswordResetEmail(c.env, email, otp);
        }
      } catch (emailError) {
        console.error('Failed to resend OTP email:', emailError);
      }
    }

    // Always return success for security
    return c.json({ success: true, message: 'If an account exists, a new code has been sent.' });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

export default routes;
