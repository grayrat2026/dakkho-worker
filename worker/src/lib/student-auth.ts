/**
 * Student authentication for DAKKHO Student API
 * Validates student sessions against D1 database
 */

import type { Env } from '../env';
import { generateId, getSessionExpiry } from './utils';

/**
 * Validate a student session token
 * Returns authorized status and user info if valid
 */
export async function validateStudentSession(
  env: Env,
  token: string
): Promise<{ authorized: boolean; userId?: string; email?: string; name?: string; emailVerified?: boolean; sessionId?: string }> {
  try {
    const session = await env.DB.prepare(
      'SELECT id, user_id, email, name, expires_at, is_active FROM student_sessions WHERE id = ? AND is_active = 1'
    )
      .bind(token)
      .first<{ id: string; user_id: string; email: string; name: string | null; expires_at: string; is_active: number }>();

    if (!session) {
      return { authorized: false };
    }

    // Check expiration
    const expiresAt = new Date(session.expires_at);
    if (expiresAt < new Date()) {
      await env.DB.prepare(
        'UPDATE student_sessions SET is_active = 0 WHERE id = ?'
      ).bind(token).run();
      return { authorized: false };
    }

    // Check email_verified status from users table
    let emailVerified = false;
    try {
      const user = await env.DB.prepare(
        'SELECT email_verified FROM users WHERE id = ?'
      ).bind(session.user_id).first<{ email_verified: number }>();
      if (user) {
        emailVerified = !!user.email_verified;
      }
    } catch {
      // If we can't check, assume not verified
    }

    return {
      authorized: true,
      userId: session.user_id,
      sessionId: session.id,  // ← NEW: expose session ID for force-logout signaling
      email: session.email,
      name: session.name || undefined,
      emailVerified,
    };
  } catch (error) {
    console.error('Student session validation error:', error);
    return { authorized: false };
  }
}

/**
 * Create a new student session
 * Returns the session token (ID)
 */
export async function createStudentSession(
  env: Env,
  userId: string,
  email: string,
  deviceInfo?: string,
  ipAddress?: string
): Promise<string> {
  const sessionId = generateId();
  const expiresAt = getSessionExpiry(30); // 30-day session for students

  await env.DB.prepare(
    `INSERT INTO student_sessions (id, user_id, email, name, device_info, ip_address, expires_at, is_active, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1, datetime('now'))`
  )
    .bind(sessionId, userId, email, null, deviceInfo || null, ipAddress || null, expiresAt)
    .run();

  return sessionId;
}

/**
 * Delete (deactivate) a student session
 */
export async function deleteStudentSession(
  env: Env,
  token: string
): Promise<boolean> {
  try {
    await env.DB.prepare(
      'UPDATE student_sessions SET is_active = 0 WHERE id = ?'
    ).bind(token).run();
    return true;
  } catch {
    return false;
  }
}
