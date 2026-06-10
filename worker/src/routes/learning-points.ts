/**
 * Learning Points routes — GET, POST, PUT, DELETE
 * D1-only: CRUD for course_learning_points
 */

import { Hono } from 'hono';
import type { Env } from '../env';
import type { AuthVariables } from '../lib/auth';
import { adminAuthMiddleware } from '../lib/auth';
import { logAudit } from '../lib/audit';
import { getErrorMessage, normalizeKeys } from '../lib/utils';

const learningPointRoutes = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

// Apply auth middleware to all learning point routes
learningPointRoutes.use('*', adminAuthMiddleware);

// GET / — List learning points, filter by courseId
learningPointRoutes.get('/', async (c) => {
  try {
    const courseId = c.req.query('courseId') || '';

    let where = 'WHERE 1=1';
    const params: unknown[] = [];

    if (courseId) {
      where += ' AND course_id = ?';
      params.push(courseId);
    }

    const result = await c.env.DB.prepare(
      `SELECT * FROM course_learning_points ${where} ORDER BY sort_order ASC`
    ).bind(...params).all();

    return c.json({ documents: result.results, total: result.results.length });
  } catch (error) {
    const message = getErrorMessage(error);
    return c.json({ error: message }, 500);
  }
});

// POST / — Create learning point
learningPointRoutes.post('/', async (c) => {
  try {
    const rawData = await c.req.json<Record<string, unknown>>();
    const allowedFields = ['course_id', 'point_text', 'sort_order'];
    const data = normalizeKeys(rawData, allowedFields);

    if (!data.course_id) {
      return c.json({ error: 'Course ID is required' }, 400);
    }
    if (!data.point_text) {
      return c.json({ error: 'Point text is required' }, 400);
    }

    const result = await c.env.DB.prepare(`
      INSERT INTO course_learning_points (course_id, point_text, sort_order)
      VALUES (?, ?, ?)
    `).bind(
      data.course_id,
      data.point_text,
      data.sort_order || 0
    ).run();

    // Get the newly created learning point
    const created = await c.env.DB.prepare(
      'SELECT * FROM course_learning_points WHERE course_id = ? AND point_text = ? ORDER BY created_at DESC LIMIT 1'
    ).bind(data.course_id, data.point_text).first();

    const user = c.get('user');
    await logAudit(c.env, user.id, 'CREATE_LEARNING_POINT', 'course_learning_points', (created as any)?.id, data);

    return c.json({ document: created });
  } catch (error) {
    const message = getErrorMessage(error);
    return c.json({ error: message }, 500);
  }
});

// PUT / — Update learning point (requires id in body)
learningPointRoutes.put('/', async (c) => {
  try {
    const rawData = await c.req.json<Record<string, unknown>>();
    const { id, ...rawUpdates } = rawData;

    if (!id) {
      return c.json({ error: 'Learning point ID required' }, 400);
    }

    // Check if learning point exists
    const existing = await c.env.DB.prepare(
      'SELECT id FROM course_learning_points WHERE id = ?'
    ).bind(Number(id)).first();
    if (!existing) {
      return c.json({ error: 'Learning point not found' }, 404);
    }

    const allowedFields = ['point_text', 'sort_order'];
    // Normalize camelCase keys from admin panel to snake_case for D1
    const updates = normalizeKeys(rawUpdates, allowedFields);
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
    setValues.push(Number(id));

    await c.env.DB.prepare(
      `UPDATE course_learning_points SET ${setClauses.join(', ')} WHERE id = ?`
    ).bind(...setValues).run();

    const updated = await c.env.DB.prepare('SELECT * FROM course_learning_points WHERE id = ?').bind(Number(id)).first();

    const user = c.get('user');
    await logAudit(c.env, user.id, 'UPDATE_LEARNING_POINT', 'course_learning_points', String(id), updates);

    return c.json({ document: updated });
  } catch (error) {
    const message = getErrorMessage(error);
    return c.json({ error: message }, 500);
  }
});

// DELETE / — Delete learning point (requires id query param)
learningPointRoutes.delete('/', async (c) => {
  try {
    const id = c.req.query('id');

    if (!id) {
      return c.json({ error: 'Learning point ID required' }, 400);
    }

    await c.env.DB.prepare('DELETE FROM course_learning_points WHERE id = ?').bind(Number(id)).run();

    const user = c.get('user');
    await logAudit(c.env, user.id, 'DELETE_LEARNING_POINT', 'course_learning_points', id);

    return c.json({ success: true });
  } catch (error) {
    const message = getErrorMessage(error);
    return c.json({ error: message }, 500);
  }
});

export default learningPointRoutes;
