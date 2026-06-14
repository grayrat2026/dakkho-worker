/**
 * Unified Auth routes — Role-agnostic login for all user types
 *
 * POST /login — Auto-detects role (student/instructor/admin) and creates appropriate session
 * GET /check — Validates current session and returns role info
 * POST /logout — Invalidates current session
 */

import { Hono } from 'hono';
import type { Env } from '../env';
import { getErrorMessage, generateId, getSessionExpiry } from '../lib/utils';
import { verifyPassword, authenticateUser } from '../lib/auth-password';
import { createInstructorSession, validateInstructorSession, deleteInstructorSession } from '../lib/instructor-auth';

const unifiedAuthRoutes = new Hono<{ Bindings: Env }>();

// POST /login — Unified login (auto-detects role: student/instructor/admin)
unifiedAuthRoutes.post('/login', async (c) => {
  try {
    const { email, password } = await c.req.json<{ email: string; password: string }>();

    if (!email || !password) {
      return c.json({ error: 'Email and password are required' }, 400);
    }

    // Step 1: Look up user in D1 users table
    const user = await c.env.DB.prepare(
      'SELECT id, email, full_name, role, password_hash, is_active, avatar_url FROM users WHERE email = ? AND is_active = 1'
    )
      .bind(email)
      .first<{ id: string; email: string; full_name: string; role: string; password_hash: string; is_active: number; avatar_url: string | null }>();

    if (!user) {
      return c.json({ error: 'Invalid email or password' }, 401);
    }

    // Step 2: Verify password
    const validPassword = await verifyPassword(password, user.password_hash);
    if (!validPassword) {
      return c.json({ error: 'Invalid email or password' }, 401);
    }

    const role = user.role || 'student';
    const token: string = generateId();
    const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';
    const ua = c.req.header('user-agent') || 'unknown';

    // Step 3: Create role-specific session
    if (role === 'admin' || role === 'super_admin') {
      // Admin session
      const expiresAt = getSessionExpiry(7);
      await c.env.DB.prepare('DELETE FROM admin_sessions WHERE user_id = ?').bind(user.id).run();
      await c.env.DB.prepare(
        `INSERT INTO admin_sessions (id, user_id, email, name, role, ip_address, user_agent, expires_at, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`
      ).bind(token, user.id, user.email, user.full_name, role, ip, ua, expiresAt).run();

    } else if (role === 'instructor') {
      // Instructor session
      await c.env.DB.prepare('DELETE FROM instructor_sessions WHERE user_id = ?').bind(user.id).run();
      await c.env.DB.prepare(
        `INSERT INTO instructor_sessions (id, user_id, email, name, ip_address, device_info, expires_at, is_active, avatar_url)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)`
      ).bind(token, user.id, user.email, user.full_name, ip, ua, getSessionExpiry(7), user.avatar_url || null).run();

    } else {
      // Student session (keep existing sessions for Active Sessions page)
      await c.env.DB.prepare(
        `INSERT INTO student_sessions (id, user_id, email, name, ip_address, device_info, expires_at, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1)`
      ).bind(token, user.id, user.email, user.full_name, ip, ua, getSessionExpiry(30)).run();
    }

    // Step 4: Return success
    return c.json({
      success: true,
      token,
      role,
      user: {
        id: user.id,
        email: user.email,
        name: user.full_name,
        role,
        avatarUrl: user.avatar_url || '',
      },
    });
  } catch (error) {
    const message = getErrorMessage(error);
    console.error('Unified login error:', error);
    return c.json({ error: message }, 401);
  }
});

// GET /check — Unified session check (auto-detects role from token)
unifiedAuthRoutes.get('/check', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ authenticated: false }, 401);
    }

    const token = authHeader.substring(7);

    // Try admin session
    const adminSession = await c.env.DB.prepare(
      'SELECT user_id, email, name, role, expires_at, is_active FROM admin_sessions WHERE id = ? AND is_active = 1'
    ).bind(token).first<{ user_id: string; email: string; name: string; role: string; expires_at: string; is_active: number }>();

    if (adminSession && new Date(adminSession.expires_at) > new Date()) {
      return c.json({
        authenticated: true,
        role: adminSession.role || 'admin',
        user: { id: adminSession.user_id, email: adminSession.email, name: adminSession.name, role: adminSession.role || 'admin' },
      });
    }

    // Try instructor session
    const instructorSession = await c.env.DB.prepare(
      'SELECT user_id, email, name, avatar_url, expires_at, is_active FROM instructor_sessions WHERE id = ? AND is_active = 1'
    ).bind(token).first<{ user_id: string; email: string; name: string; avatar_url: string | null; expires_at: string; is_active: number }>();

    if (instructorSession && new Date(instructorSession.expires_at) > new Date()) {
      return c.json({
        authenticated: true,
        role: 'instructor',
        instructor: {
          id: instructorSession.user_id,
          email: instructorSession.email,
          name: instructorSession.name,
          avatar_url: instructorSession.avatar_url,
        },
        user: {
          id: instructorSession.user_id,
          email: instructorSession.email,
          name: instructorSession.name,
          role: 'instructor',
          avatarUrl: instructorSession.avatar_url || '',
        },
      });
    }

    // Try student session
    const studentSession = await c.env.DB.prepare(
      'SELECT user_id, email, name, expires_at, is_active FROM student_sessions WHERE id = ? AND is_active = 1'
    ).bind(token).first<{ user_id: string; email: string; name: string; expires_at: string; is_active: number }>();

    if (studentSession && new Date(studentSession.expires_at) > new Date()) {
      return c.json({
        authenticated: true,
        role: 'student',
        user: {
          id: studentSession.user_id,
          email: studentSession.email,
          name: studentSession.name,
          role: 'student',
        },
      });
    }

    return c.json({ authenticated: false }, 401);
  } catch {
    return c.json({ authenticated: false }, 401);
  }
});

// POST /logout — Unified logout (auto-detects session type)
unifiedAuthRoutes.post('/logout', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ success: true });
    }

    const token = authHeader.substring(7);

    // Try to invalidate in all session tables
    try { await c.env.DB.prepare('UPDATE admin_sessions SET is_active = 0 WHERE id = ?').bind(token).run(); } catch {}
    try { await c.env.DB.prepare('UPDATE instructor_sessions SET is_active = 0 WHERE id = ?').bind(token).run(); } catch {}
    try { await c.env.DB.prepare('UPDATE student_sessions SET is_active = 0 WHERE id = ?').bind(token).run(); } catch {}

    return c.json({ success: true });
  } catch {
    return c.json({ success: true });
  }
});

export default unifiedAuthRoutes;
