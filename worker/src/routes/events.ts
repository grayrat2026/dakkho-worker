/**
 * Events & Special Days Admin Routes
 */

import { Hono } from 'hono';
import type { Env } from '../env';
import type { AuthVariables } from '../lib/auth';
import { adminAuthMiddleware } from '../lib/auth';
import { sendPushNotification } from '../lib/onesignal';
import { logAudit } from '../lib/audit';
import { getErrorMessage } from '../lib/utils';

const eventRoutes = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

eventRoutes.use('*', adminAuthMiddleware);

// GET / — List events
eventRoutes.get('/', async (c) => {
  try {
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '20');
    const offset = (page - 1) * limit;
    const type = c.req.query('type');
    const activeOnly = c.req.query('active') === 'true';

    let query = 'SELECT * FROM events';
    let countQuery = 'SELECT COUNT(*) as total FROM events';
    const params: any[] = [];
    const conditions: string[] = [];

    if (type) {
      conditions.push('event_type = ?');
      params.push(type);
    }
    if (activeOnly) {
      conditions.push('is_active = 1');
    }

    if (conditions.length > 0) {
      const whereClause = ' WHERE ' + conditions.join(' AND ');
      query += whereClause;
      countQuery += whereClause;
    }

    query += ' ORDER BY start_date DESC LIMIT ? OFFSET ?';

    const countResult = await c.env.DB.prepare(countQuery).bind(...params).first();
    const total = (countResult as any)?.total || 0;

    const result = await c.env.DB.prepare(query).bind(...params, limit, offset).all();

    return c.json({ events: result.results, total });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// POST / — Create event
eventRoutes.post('/', async (c) => {
  try {
    const data = await c.req.json();
    const { title, title_bn, description, description_bn, event_type, banner_url, start_date, end_date, is_featured, metadata } = data;

    if (!title || !event_type || !start_date) {
      return c.json({ error: 'title, event_type, start_date required' }, 400);
    }

    const user = c.get('user');
    const result = await c.env.DB.prepare(`
      INSERT INTO events (title, title_bn, description, description_bn, event_type, banner_url, start_date, end_date, is_featured, metadata, is_active, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    `).bind(
      title, title_bn || null, description || null, description_bn || null,
      event_type, banner_url || null, start_date, end_date || null,
      is_featured ? 1 : 0, metadata ? JSON.stringify(metadata) : '{}', user.id
    ).run();

    await logAudit(c.env, user.id, 'CREATE_EVENT', 'events', String((result.meta as any)?.last_row_id), data);

    return c.json({ success: true, message: 'Event created successfully' });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// PUT /:id — Update event
eventRoutes.put('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const data = await c.req.json();
    const user = c.get('user');

    const updates: string[] = [];
    const params: any[] = [];

    const allowedFields = ['title', 'title_bn', 'description', 'description_bn', 'event_type', 'banner_url', 'start_date', 'end_date', 'is_featured', 'is_active'];
    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        updates.push(`${field} = ?`);
        params.push(data[field]);
      }
    }

    if (data.metadata !== undefined) {
      updates.push('metadata = ?');
      params.push(JSON.stringify(data.metadata));
    }

    if (updates.length === 0) {
      return c.json({ error: 'No fields to update' }, 400);
    }

    updates.push("updated_at = datetime('now')");
    params.push(id);

    await c.env.DB.prepare(
      `UPDATE events SET ${updates.join(', ')} WHERE id = ?`
    ).bind(...params).run();

    await logAudit(c.env, user.id, 'UPDATE_EVENT', 'events', id, data);

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// DELETE /:id — Delete event
eventRoutes.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const user = c.get('user');

    await c.env.DB.prepare(
      "UPDATE events SET is_active = 0, updated_at = datetime('now') WHERE id = ?"
    ).bind(id).run();

    await logAudit(c.env, user.id, 'DELETE_EVENT', 'events', id);

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// POST /:id/broadcast — Broadcast event via push notification
eventRoutes.post('/:id/broadcast', async (c) => {
  try {
    const id = c.req.param('id');
    const user = c.get('user');

    const event = await c.env.DB.prepare('SELECT * FROM events WHERE id = ?').bind(id).first();
    if (!event) {
      return c.json({ error: 'Event not found' }, 404);
    }

    const e = event as any;

    const result = await sendPushNotification(c.env, {
      title: e.title,
      titleBn: e.title_bn || e.title,
      message: e.description || 'Check out this event!',
      messageBn: e.description_bn || e.description || 'এই ইভেন্টটি দেখুন!',
      url: `/events/${id}`,
    });

    // Log notification
    await c.env.DB.prepare(`
      INSERT INTO notification_logs (type, category, title, message, target_type, sent_count, failed_count, metadata, created_by)
      VALUES ('push', 'event', ?, ?, 'all', ?, ?, ?, ?)
    `).bind(e.title, e.description || '', result.recipients, result.errors.length, JSON.stringify({ event_id: id }), user.id).run();

    await logAudit(c.env, user.id, 'BROADCAST_EVENT', 'events', id);

    return c.json({ success: result.success, recipients: result.recipients });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

export default eventRoutes;
