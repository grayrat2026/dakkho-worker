/**
 * Admin routes — GET /audit, DELETE /sessions, PUT /config/reset
 */

import { Hono } from 'hono';
import type { Env } from '../env';
import type { AuthVariables } from '../lib/auth';
import { adminAuthMiddleware } from '../lib/auth';
import { logAudit } from '../lib/audit';
import { DEFAULT_CONFIG } from '../lib/types';
import { getErrorMessage } from '../lib/utils';

const adminRoutes = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

// Apply auth middleware to all admin routes
adminRoutes.use('*', adminAuthMiddleware);

// GET /audit — Get audit logs with pagination
adminRoutes.get('/audit', async (c) => {
  try {
    const limit = Math.min(parseInt(c.req.query('limit') || '20'), 100);
    const offset = parseInt(c.req.query('offset') || '0');
    const action = c.req.query('action');

    let query = 'SELECT id, action, resource_type, resource_id, user_id, user_email, details, created_at FROM audit_logs';
    const params: unknown[] = [];

    if (action) {
      query += ' WHERE action = ?';
      params.push(action);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const { results } = await c.env.DB.prepare(query).bind(...params).all();

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM audit_logs';
    const countParams: unknown[] = [];
    if (action) {
      countQuery += ' WHERE action = ?';
      countParams.push(action);
    }
    const countResult = await c.env.DB.prepare(countQuery).bind(...countParams).first<{ total: number }>();

    return c.json({
      logs: results,
      total: countResult?.total || 0,
      limit,
      offset,
    });
  } catch (error) {
    const message = getErrorMessage(error);
    return c.json({ error: message }, 500);
  }
});

// DELETE /sessions — Clear all admin sessions
adminRoutes.delete('/sessions', async (c) => {
  try {
    const user = c.get('user');

    await c.env.DB.prepare(
      'UPDATE admin_sessions SET is_active = 0 WHERE is_active = 1'
    ).run();

    await logAudit(c.env, user.id, 'CLEAR_SESSIONS', 'admin', undefined, { action: 'clear_all' });

    return c.json({ success: true, message: 'All sessions cleared' });
  } catch (error) {
    const message = getErrorMessage(error);
    return c.json({ error: message }, 500);
  }
});

export default adminRoutes;
