/**
 * Instructor live class & support routes
 *
 * - GET  /schedule                    — Get upcoming live class schedule (instructorOrAdmin)
 * - POST /schedule                    — Create live class schedule (instructorOrAdmin)
 * - POST /support/tickets             — Create support ticket (instructorOrAdmin)
 * - GET  /support/tickets             — List instructor's tickets (instructorOrAdmin)
 * - POST /support/tickets/:id/messages — Send message on support ticket (instructorOrAdmin)
 */

import { Hono } from 'hono';
import type { Env } from '../../env';
import {
  instructorOrAdminMiddleware,
  type InstructorOrAdminAuthVariables,
} from '../../lib/instructor-auth-middleware';
import { getErrorMessage } from '../../lib/utils';
import { verifyCourseOwnership } from './helpers';

const routes = new Hono<{ Bindings: Env; Variables: InstructorOrAdminAuthVariables }>();

// GET /schedule — Get upcoming schedule from D1 live_class_schedules
routes.get('/schedule', instructorOrAdminMiddleware, async (c) => {
  try {
    const authRole = c.get('authRole');
    let instructorId: string;

    if (authRole === 'admin') {
      instructorId = c.req.query('instructorId') || '';
      if (!instructorId) {
        return c.json({ error: 'instructorId query param required for admin access' }, 400);
      }
    } else {
      instructorId = c.get('instructorId');
    }

    const limit = parseInt(c.req.query('limit') || '20');

    const result = await c.env.DB.prepare(
      "SELECT * FROM live_class_schedules WHERE instructor_id = ? AND scheduled_at > datetime('now') AND is_active = 1 ORDER BY scheduled_at ASC LIMIT ?"
    ).bind(instructorId, limit).all();

    return c.json({ success: true, schedule: result.results });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// POST /schedule — Create live class (verify course ownership if course_id provided)
routes.post('/schedule', instructorOrAdminMiddleware, async (c) => {
  try {
    const authRole = c.get('authRole');
    const instructorId = authRole === 'admin' ? c.req.query('instructorId')! : c.get('instructorId');

    if (!instructorId) {
      return c.json({ error: 'instructorId is required' }, 400);
    }

    const body = await c.req.json();
    const { title, course_id, scheduled_at, duration_minutes, meeting_url, platform, description } = body;

    if (!title || !scheduled_at || !duration_minutes || !meeting_url) {
      return c.json({ error: 'title, scheduled_at, duration_minutes, and meeting_url are required' }, 400);
    }

    // Verify course ownership if course_id provided
    if (course_id) {
      const owns = await verifyCourseOwnership(c.env, course_id, instructorId);
      if (!owns) {
        return c.json({ error: 'You do not own this course' }, 403);
      }
    }

    const now = new Date().toISOString();

    const result = await c.env.DB.prepare(`
      INSERT INTO live_class_schedules (title, course_id, instructor_id, scheduled_at, duration_minutes, meeting_url, platform, description, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `).bind(
      title, course_id || null, instructorId, scheduled_at,
      duration_minutes, meeting_url, platform || null,
      description || null, now, now
    ).run();

    const insertedId = result.meta?.last_row_id;

    const row = await c.env.DB.prepare(
      'SELECT * FROM live_class_schedules WHERE rowid = ?'
    ).bind(insertedId).first();

    return c.json({ success: true, schedule: row }, 201);
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// POST /support/tickets — Create support ticket
routes.post('/support/tickets', instructorOrAdminMiddleware, async (c) => {
  try {
    const authRole = c.get('authRole');
    let instructorId: string;
    let instructorEmail: string;
    let instructorName: string;

    if (authRole === 'admin') {
      instructorId = c.req.query('instructorId') || '';
      instructorEmail = c.req.query('instructorEmail') || '';
      instructorName = c.req.query('instructorName') || '';
    } else {
      instructorId = c.get('instructorId');
      instructorEmail = c.get('instructorEmail');
      instructorName = c.get('instructorName');
    }

    const body = await c.req.json();
    const { category, subject, description, priority } = body;

    if (!category || !subject || !description) {
      return c.json({ error: 'category, subject, and description are required' }, 400);
    }

    const ticketId = `TK-${String(Math.floor(100000 + Math.random() * 900000))}`;
    const now = new Date().toISOString();

    await c.env.DB.prepare(`
      INSERT INTO support_tickets (ticket_id, user_id, name, email, category, subject, description, priority, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?)
    `).bind(
      ticketId,
      instructorId,
      instructorName,
      instructorEmail,
      category,
      subject,
      description,
      priority || 'medium',
      now,
      now
    ).run();

    return c.json({
      success: true,
      ticket: {
        ticketId,
        status: 'open',
        createdAt: now,
      },
    }, 201);
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// GET /support/tickets — List instructor's tickets
routes.get('/support/tickets', instructorOrAdminMiddleware, async (c) => {
  try {
    const authRole = c.get('authRole');
    let instructorId: string;

    if (authRole === 'admin') {
      instructorId = c.req.query('instructorId') || '';
      if (!instructorId) {
        return c.json({ error: 'instructorId query param required for admin access' }, 400);
      }
    } else {
      instructorId = c.get('instructorId');
    }

    const limit = parseInt(c.req.query('limit') || '20');
    const offset = parseInt(c.req.query('offset') || '0');
    const status = c.req.query('status');

    let query = 'SELECT * FROM support_tickets WHERE user_id = ?';
    const params: unknown[] = [instructorId];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const result = await c.env.DB.prepare(query).bind(...params).all();

    return c.json({ success: true, tickets: result.results });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// POST /support/tickets/:id/messages — Send message on support ticket
routes.post('/support/tickets/:id/messages', instructorOrAdminMiddleware, async (c) => {
  try {
    const authRole = c.get('authRole');
    const instructorId = authRole === 'admin' ? c.req.query('instructorId')! : c.get('instructorId');
    const ticketId = c.req.param('id');

    if (!instructorId) {
      return c.json({ error: 'instructorId is required' }, 400);
    }

    // Verify the ticket belongs to this instructor
    const ticket = await c.env.DB.prepare(
      'SELECT user_id, status FROM support_tickets WHERE id = ?'
    ).bind(ticketId).first<{ user_id: string; status: string }>();

    if (!ticket) {
      return c.json({ error: 'Ticket not found' }, 404);
    }

    if (ticket.user_id !== instructorId) {
      return c.json({ error: 'You can only message on your own tickets' }, 403);
    }

    const body = await c.req.json();
    const { message } = body;

    if (!message) {
      return c.json({ error: 'message is required' }, 400);
    }

    const now = new Date().toISOString();

    const result = await c.env.DB.prepare(`
      INSERT INTO support_messages (ticket_id, user_id, message, is_admin, created_at)
      VALUES (?, ?, ?, 0, ?)
    `).bind(ticketId, instructorId, message, now).run();

    // Update ticket status to 'waiting' if it was 'replied' or 'resolved'
    if (ticket.status !== 'open') {
      await c.env.DB.prepare(
        "UPDATE support_tickets SET status = 'waiting', updated_at = ? WHERE id = ?"
      ).bind(now, ticketId).run();
    } else {
      await c.env.DB.prepare(
        'UPDATE support_tickets SET updated_at = ? WHERE id = ?'
      ).bind(now, ticketId).run();
    }

    const insertedId = result.meta?.last_row_id;

    const row = await c.env.DB.prepare(
      'SELECT * FROM support_messages WHERE rowid = ?'
    ).bind(insertedId).first();

    return c.json({ success: true, message: row }, 201);
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

export default routes;
