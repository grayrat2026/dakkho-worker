/**
 * Instructors routes — GET, POST, PUT, DELETE
 * D1-only: No Appwrite dependencies
 */

import { Hono } from 'hono';
import type { Env } from '../env';
import type { AuthVariables } from '../lib/auth';
import { adminAuthMiddleware } from '../lib/auth';
import { logAudit } from '../lib/audit';
import { getErrorMessage, normalizeKeys } from '../lib/utils';

const instructorRoutes = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

// Apply auth middleware to all instructor routes
instructorRoutes.use('*', adminAuthMiddleware);

// GET / — List instructors
instructorRoutes.get('/', async (c) => {
  try {
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '20');
    const search = c.req.query('search') || '';
    const offset = (page - 1) * limit;

    let where = 'WHERE 1=1';
    const params: unknown[] = [];

    if (search) {
      where += ' AND name LIKE ?';
      params.push(`%${search}%`);
    }

    const countResult = await c.env.DB.prepare(
      `SELECT COUNT(*) as total FROM instructors ${where}`
    ).bind(...params).first();
    const total = (countResult as any)?.total || 0;

    const result = await c.env.DB.prepare(
      `SELECT * FROM instructors ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
    ).bind(...params, limit, offset).all();

    return c.json({ documents: result.results, total });
  } catch (error) {
    const message = getErrorMessage(error);
    return c.json({ error: message }, 500);
  }
});

// POST / — Create instructor
instructorRoutes.post('/', async (c) => {
  try {
    const rawData = await c.req.json<Record<string, unknown>>();
    const allowedFields = ['name', 'email', 'bio', 'avatar_url', 'cover_url', 'specialization', 'rating', 'total_students', 'total_courses', 'social_links', 'is_active'];
    const data = normalizeKeys(rawData, allowedFields);
    const id = crypto.randomUUID();

    await c.env.DB.prepare(`
      INSERT INTO instructors (id, name, email, bio, avatar_url, cover_url, specialization, rating, total_students, total_courses, social_links, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      data.name || '',
      data.email || null,
      data.bio || null,
      data.avatar_url || null,
      data.cover_url || null,
      data.specialization || null,
      data.rating || 0,
      data.total_students || 0,
      data.total_courses || 0,
      data.social_links || '{}',
      data.is_active !== undefined ? (data.is_active ? 1 : 0) : 1
    ).run();

    const created = await c.env.DB.prepare('SELECT * FROM instructors WHERE id = ?').bind(id).first();

    const user = c.get('user');
    await logAudit(c.env, user.id, 'CREATE_INSTRUCTOR', 'instructors', id, data);

    return c.json({ document: created });
  } catch (error) {
    const message = getErrorMessage(error);
    return c.json({ error: message }, 500);
  }
});

// PUT / — Update instructor
instructorRoutes.put('/', async (c) => {
  try {
    const rawData = await c.req.json<Record<string, unknown>>();
    const { instructorId, ...rawUpdates } = rawData;

    if (!instructorId) {
      return c.json({ error: 'Instructor ID required' }, 400);
    }

    const allowedFields = ['name', 'email', 'bio', 'avatar_url', 'cover_url', 'specialization', 'rating', 'total_students', 'total_courses', 'social_links', 'is_active'];
    // Normalize camelCase keys from admin panel to snake_case for D1
    const updates = normalizeKeys(rawUpdates, allowedFields);
    const setClauses: string[] = [];
    const setValues: unknown[] = [];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        if (key === 'is_active') {
          setClauses.push(`${key} = ?`);
          setValues.push(value ? 1 : 0);
        } else {
          setClauses.push(`${key} = ?`);
          setValues.push(value);
        }
      }
    }

    if (setClauses.length === 0) {
      return c.json({ error: 'No valid fields to update' }, 400);
    }

    setClauses.push("updated_at = datetime('now')");
    setValues.push(String(instructorId));

    await c.env.DB.prepare(
      `UPDATE instructors SET ${setClauses.join(', ')} WHERE id = ?`
    ).bind(...setValues).run();

    const updated = await c.env.DB.prepare('SELECT * FROM instructors WHERE id = ?').bind(String(instructorId)).first();

    const user = c.get('user');
    // Specific audit logging for instructor approval/rejection (is_active toggle)
    if (updates.is_active !== undefined) {
      if (updates.is_active === 1 || updates.is_active === true) {
        await logAudit(c.env, user.id, 'APPROVE_INSTRUCTOR', 'instructors', String(instructorId), updates);
      } else {
        await logAudit(c.env, user.id, 'DEACTIVATE_INSTRUCTOR', 'instructors', String(instructorId), updates);
      }
    } else {
      await logAudit(c.env, user.id, 'UPDATE_INSTRUCTOR', 'instructors', String(instructorId), updates);
    }

    return c.json({ document: updated });
  } catch (error) {
    const message = getErrorMessage(error);
    return c.json({ error: message }, 500);
  }
});

// DELETE / — Delete instructor
instructorRoutes.delete('/', async (c) => {
  try {
    const instructorId = c.req.query('id');

    if (!instructorId) {
      return c.json({ error: 'Instructor ID required' }, 400);
    }

    await c.env.DB.prepare('DELETE FROM instructors WHERE id = ?').bind(instructorId).run();

    const user = c.get('user');
    await logAudit(c.env, user.id, 'DELETE_INSTRUCTOR', 'instructors', instructorId);

    return c.json({ success: true });
  } catch (error) {
    const message = getErrorMessage(error);
    return c.json({ error: message }, 500);
  }
});

export default instructorRoutes;
