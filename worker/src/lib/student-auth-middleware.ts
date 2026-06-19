/**
 * Hono middleware for Student API authentication
 * Replaces the per-route getStudentAuth() boilerplate
 */

import type { Context, Next } from 'hono';
import type { Env } from '../env';
import { validateStudentSession } from './student-auth';

export interface StudentAuthVariables {
  studentId: string;
  studentEmail: string;
  studentName: string;
  sessionId: string;  // ← NEW: exposes the session row ID for force-logout signaling
}

/**
 * Middleware that validates student session from Authorization header
 * Sets c.set('studentId'), c.set('studentEmail'), c.set('studentName'), c.set('sessionId')
 * Also enforces email verification — unverified users get 403
 */
export async function studentAuthMiddleware(c: Context<{ Bindings: Env; Variables: StudentAuthVariables }>, next: Next) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized — login required' }, 401);
  }

  const token = authHeader.substring(7);
  const result = await validateStudentSession(c.env, token);

  if (!result.authorized) {
    return c.json({ error: 'Session expired — please login again' }, 401);
  }

  // Enforce email verification for all authenticated routes
  if (!result.emailVerified) {
    return c.json({ error: 'Email verification required', code: 'EMAIL_NOT_VERIFIED' }, 403);
  }

  c.set('studentId', result.userId!);
  c.set('studentEmail', result.email || '');
  c.set('studentName', result.name || '');
  c.set('sessionId', result.sessionId!);  // ← NEW

  await next();
}

/**
 * Optional auth — doesn't fail if no token, but sets vars if present
 */
export async function optionalStudentAuthMiddleware(c: Context<{ Bindings: Env; Variables: StudentAuthVariables }>, next: Next) {
  const authHeader = c.req.header('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const result = await validateStudentSession(c.env, token);
    if (result.authorized) {
      c.set('studentId', result.userId!);
      c.set('studentEmail', result.email || '');
      c.set('studentName', result.name || '');
    }
  }
  await next();
}
