/**
 * Users routes — GET, PUT, DELETE
 * D1-only: No Appwrite dependencies
 */

import { Hono } from 'hono';
import type { Env } from '../env';
import type { AuthVariables } from '../lib/auth';
import { adminAuthMiddleware } from '../lib/auth';
import { logAudit } from '../lib/audit';
import { getErrorMessage } from '../lib/utils';

const userRoutes = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

// Apply auth middleware to all user routes
userRoutes.use('*', adminAuthMiddleware);

// GET / — List users
userRoutes.get('/', async (c) => {
  try {
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '20');
    const search = c.req.query('search') || '';
    const role = c.req.query('role') || '';
    const status = c.req.query('status') || '';
    const offset = (page - 1) * limit;

    let where = 'WHERE 1=1';
    const params: unknown[] = [];

    if (search) {
      where += ' AND full_name LIKE ?';
      params.push(`%${search}%`);
    }
    if (role) {
      where += ' AND role = ?';
      params.push(role);
    }
    if (status === 'active') {
      where += ' AND is_active = 1';
    }
    if (status === 'inactive') {
      where += ' AND is_active = 0';
    }

    const countResult = await c.env.DB.prepare(
      `SELECT COUNT(*) as total FROM users ${where}`
    ).bind(...params).first();

    const total = (countResult as any)?.total || 0;

    const result = await c.env.DB.prepare(
      `SELECT u.id, u.email, u.full_name, u.phone, u.bio, u.institute_id, u.technology, u.semester, u.avatar_url, u.role, u.email_verified, u.is_active, u.enrolled_course_ids, u.created_at, u.updated_at, i.name as institute_name, t.name as technology_name FROM users u LEFT JOIN institutes i ON u.institute_id = i.id LEFT JOIN technologies t ON u.technology = t.short_code ${where} ORDER BY u.created_at DESC LIMIT ? OFFSET ?`
    ).bind(...params, limit, offset).all();

    return c.json({ documents: result.results, total });
  } catch (error) {
    const message = getErrorMessage(error);
    return c.json({ error: message }, 500);
  }
});

// PUT / — Update user
userRoutes.put('/', async (c) => {
  try {
    const data = await c.req.json<Record<string, unknown>>();
    const { userId, ...updates } = data;

    if (!userId) {
      return c.json({ error: 'User ID required' }, 400);
    }

    // Build SET clause dynamically from allowed fields
    const allowedFields = ['full_name', 'phone', 'bio', 'institute_id', 'technology', 'semester', 'avatar_url', 'role', 'email_verified', 'is_active', 'enrolled_course_ids'];
    const setClauses: string[] = [];
    const setValues: unknown[] = [];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        setClauses.push(`${key} = ?`);
        setValues.push(value);
      }
    }

    if (setClauses.length === 0) {
      return c.json({ error: 'No valid fields to update' }, 400);
    }

    setClauses.push("updated_at = datetime('now')");
    setValues.push(userId);

    await c.env.DB.prepare(
      `UPDATE users SET ${setClauses.join(', ')} WHERE id = ?`
    ).bind(...setValues).run();

    // If admin deactivates a user, invalidate their student sessions
    if (updates.is_active === 0 || updates.is_active === false) {
      try {
        await c.env.DB.prepare(
          'DELETE FROM student_sessions WHERE user_id = ?'
        ).bind(userId).run();
      } catch {}
    }

    const updatedUser = await c.env.DB.prepare(
      'SELECT u.id, u.email, u.full_name, u.phone, u.bio, u.institute_id, u.technology, u.semester, u.avatar_url, u.role, u.email_verified, u.is_active, u.enrolled_course_ids, u.created_at, u.updated_at, i.name as institute_name, t.name as technology_name FROM users u LEFT JOIN institutes i ON u.institute_id = i.id LEFT JOIN technologies t ON u.technology = t.short_code WHERE u.id = ?'
    ).bind(userId).first();

    const user = c.get('user');
    await logAudit(c.env, user.id, 'UPDATE_USER', 'users', userId as string, updates);

    return c.json({ document: updatedUser });
  } catch (error) {
    const message = getErrorMessage(error);
    return c.json({ error: message }, 500);
  }
});

// DELETE / — Delete user
userRoutes.delete('/', async (c) => {
  try {
    const userId = c.req.query('id');

    if (!userId) {
      return c.json({ error: 'User ID required' }, 400);
    }

    await c.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(userId).run();

    const user = c.get('user');
    await logAudit(c.env, user.id, 'DELETE_USER', 'users', userId);

    return c.json({ success: true });
  } catch (error) {
    const message = getErrorMessage(error);
    return c.json({ error: message }, 500);
  }
});

export default userRoutes;
