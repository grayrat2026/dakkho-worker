/**
 * Live Classes Admin Routes
 */

import { Hono } from 'hono';
import type { Env } from '../env';
import type { AuthVariables } from '../lib/auth';
import { adminAuthMiddleware } from '../lib/auth';
import { logAudit } from '../lib/audit';
import { getErrorMessage } from '../lib/utils';

const liveClassRoutes = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

liveClassRoutes.use('*', adminAuthMiddleware);

// GET / — List live classes
liveClassRoutes.get('/', async (c) => {
  try {
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '20');
    const offset = (page - 1) * limit;
    const status = c.req.query('status');

    let query = 'SELECT * FROM live_class_schedules';
    let countQuery = 'SELECT COUNT(*) as total FROM live_class_schedules';
    const params: any[] = [];

    if (status) {
      query += ' WHERE status = ?';
      countQuery += ' WHERE status = ?';
      params.push(status);
    }

    query += ' ORDER BY scheduled_at DESC LIMIT ? OFFSET ?';

    const countResult = await c.env.DB.prepare(countQuery).bind(...params).first();
    const total = (countResult as any)?.total || 0;

    const result = await c.env.DB.prepare(query).bind(...params, limit, offset).all();

    return c.json({ liveClasses: result.results, total });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// POST / — Schedule live class
liveClassRoutes.post('/', async (c) => {
  try {
    const data = await c.req.json();
    const { course_id, title, title_bn, description, instructor_id, technology_id, scheduled_at, duration_minutes, meeting_url, platform } = data;

    if (!title || !scheduled_at) {
      return c.json({ error: 'title and scheduled_at required' }, 400);
    }

    const user = c.get('user');
    const result = await c.env.DB.prepare(`
      INSERT INTO live_class_schedules (course_id, title, title_bn, description, instructor_id, technology_id, scheduled_at, duration_minutes, meeting_url, platform, status, is_active, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', 1, ?)
    `).bind(
      course_id || null, title, title_bn || null, description || null,
      instructor_id || null, technology_id || null, scheduled_at,
      duration_minutes || 60, meeting_url || null, platform || 'jitsi', user.id
    ).run();

    await logAudit(c.env, user.id, 'CREATE_LIVE_CLASS', 'live_classes', String((result.meta as any)?.last_row_id), data);

    return c.json({ success: true, message: 'Live class scheduled successfully' });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// PUT /:id — Update live class
liveClassRoutes.put('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const data = await c.req.json();
    const user = c.get('user');

    const updates: string[] = [];
    const params: any[] = [];

    const allowedFields = ['course_id', 'title', 'title_bn', 'description', 'instructor_id', 'technology_id', 'scheduled_at', 'duration_minutes', 'meeting_url', 'platform', 'status', 'recording_url', 'is_active'];
    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        updates.push(`${field} = ?`);
        params.push(data[field]);
      }
    }

    if (updates.length === 0) {
      return c.json({ error: 'No fields to update' }, 400);
    }

    updates.push("updated_at = datetime('now')");
    params.push(id);

    await c.env.DB.prepare(
      `UPDATE live_class_schedules SET ${updates.join(', ')} WHERE id = ?`
    ).bind(...params).run();

    await logAudit(c.env, user.id, 'UPDATE_LIVE_CLASS', 'live_classes', id, data);

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// DELETE /:id — Cancel live class
liveClassRoutes.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const user = c.get('user');

    await c.env.DB.prepare(`
      UPDATE live_class_schedules SET status = 'cancelled', is_active = 0, updated_at = datetime('now') WHERE id = ?
    `).bind(id).run();

    await logAudit(c.env, user.id, 'CANCEL_LIVE_CLASS', 'live_classes', id);

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

export default liveClassRoutes;
