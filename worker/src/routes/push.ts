/**
 * Push Notification Admin Routes
 * Send push notifications to students via OneSignal
 */

import { Hono } from 'hono';
import type { Env } from '../env';
import type { AuthVariables } from '../lib/auth';
import { adminAuthMiddleware } from '../lib/auth';
import { sendPushNotification, getUserPushTokens, getBatchUserPushTokens } from '../lib/onesignal';
import { logAudit } from '../lib/audit';
import { getErrorMessage } from '../lib/utils';

const pushRoutes = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

pushRoutes.use('*', adminAuthMiddleware);

// POST /broadcast — Send push to all students
pushRoutes.post('/broadcast', async (c) => {
  try {
    const { title, titleBn, message, messageBn, url, data } = await c.req.json();

    if (!title || !message) {
      return c.json({ error: 'title and message required' }, 400);
    }

    const result = await sendPushNotification(c.env, {
      title,
      titleBn,
      message,
      messageBn,
      url,
      data,
      targetSegment: 'All',
    });

    // Log the notification
    await c.env.DB.prepare(`
      INSERT INTO notification_logs (type, category, title, message, target_type, sent_count, failed_count, metadata, created_by)
      VALUES ('push', 'broadcast', ?, ?, 'all', ?, ?, ?, ?)
    `).bind(title, message, result.recipients, result.errors.length, JSON.stringify(data || {}), c.get('user').id).run();

    const user = c.get('user');
    await logAudit(c.env, user.id, 'BROADCAST_PUSH', 'notifications', undefined, { title, recipients: result.recipients });

    return c.json({ success: result.success, recipients: result.recipients, errors: result.errors });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// POST /send — Send push to specific users
pushRoutes.post('/send', async (c) => {
  try {
    const { userIds, title, titleBn, message, messageBn, url, data } = await c.req.json();

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return c.json({ error: 'userIds array required' }, 400);
    }

    if (!title || !message) {
      return c.json({ error: 'title and message required' }, 400);
    }

    const tokens = await getBatchUserPushTokens(c.env, userIds);

    if (tokens.length === 0) {
      return c.json({ success: false, message: 'No push tokens found for specified users' });
    }

    const result = await sendPushNotification(c.env, {
      title,
      titleBn,
      message,
      messageBn,
      url,
      data,
      targetPlayerIds: tokens,
    });

    // Log
    await c.env.DB.prepare(`
      INSERT INTO notification_logs (type, category, title, message, target_type, target_id, sent_count, failed_count, metadata, created_by)
      VALUES ('push', 'targeted', ?, ?, 'users', ?, ?, ?, ?, ?)
    `).bind(title, message, userIds.join(','), result.recipients, result.errors.length, JSON.stringify(data || {}), c.get('user').id).run();

    return c.json({ success: result.success, recipients: result.recipients, errors: result.errors });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// GET /stats — Get push notification stats
pushRoutes.get('/stats', async (c) => {
  try {
    const totalTokens = await c.env.DB.prepare(
      'SELECT COUNT(*) as count FROM user_push_tokens WHERE is_active = 1'
    ).first();

    const recentLogs = await c.env.DB.prepare(
      "SELECT * FROM notification_logs WHERE type = 'push' ORDER BY created_at DESC LIMIT 10"
    ).all();

    return c.json({
      totalSubscribers: (totalTokens as any)?.count || 0,
      recentNotifications: recentLogs.results,
    });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// GET /logs — Get notification logs
pushRoutes.get('/logs', async (c) => {
  try {
    const type = c.req.query('type') || 'all';
    const category = c.req.query('category') || 'all';
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '20');
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM notification_logs';
    let countQuery = 'SELECT COUNT(*) as total FROM notification_logs';
    const params: any[] = [];

    const conditions: string[] = [];
    if (type !== 'all') {
      conditions.push('type = ?');
      params.push(type);
    }
    if (category !== 'all') {
      conditions.push('category = ?');
      params.push(category);
    }

    if (conditions.length > 0) {
      const whereClause = ' WHERE ' + conditions.join(' AND ');
      query += whereClause;
      countQuery += whereClause;
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';

    const countResult = await c.env.DB.prepare(countQuery).bind(...params).first();
    const total = (countResult as any)?.total || 0;

    const result = await c.env.DB.prepare(query).bind(...params, limit, offset).all();

    return c.json({ logs: result.results, total });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

export default pushRoutes;
