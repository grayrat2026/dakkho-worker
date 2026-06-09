/**
 * Notifications routes — GET, POST
 * D1-only: All notifications stored in D1 notifications table + notification_logs
 * Also sends OneSignal push notifications
 */

import { Hono } from 'hono';
import type { Env } from '../env';
import type { AuthVariables } from '../lib/auth';
import { adminAuthMiddleware } from '../lib/auth';
import { logAudit } from '../lib/audit';
import { getErrorMessage } from '../lib/utils';
import { sendPushNotification, getUserPushTokens, getBatchUserPushTokens, checkUserNotifPrefs } from '../lib/onesignal';

const notificationRoutes = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

// Apply auth middleware to all notification routes
notificationRoutes.use('*', adminAuthMiddleware);

// GET / — List notifications
notificationRoutes.get('/', async (c) => {
  try {
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '20');
    const userId = c.req.query('userId') || '';
    const offset = (page - 1) * limit;

    let where = 'WHERE 1=1';
    const params: unknown[] = [];

    if (userId) {
      where += ' AND user_id = ?';
      params.push(userId);
    }

    // Count total
    const countResult = await c.env.DB.prepare(
      `SELECT COUNT(*) as total FROM notifications ${where}`
    ).bind(...params).first();
    const total = (countResult as any)?.total || 0;

    // Get notifications
    const result = await c.env.DB.prepare(
      `SELECT * FROM notifications ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
    ).bind(...params, limit, offset).all();

    // Also get notification logs for broadcast/sent info
    const logsResult = await c.env.DB.prepare(
      "SELECT * FROM notification_logs ORDER BY created_at DESC LIMIT ? OFFSET ?"
    ).bind(limit, offset).all();

    // Combine results
    const documents = [
      ...(result.results as any[]).map(row => ({
        id: row.id,
        title: row.title,
        message: row.message,
        type: row.type || 'info',
        userId: row.user_id,
        isRead: !!row.is_read,
        actionUrl: row.action_url,
        createdAt: row.created_at,
        source: 'd1',
      })),
      ...(logsResult.results as any[]).map(row => ({
        id: `log-${row.id}`,
        title: row.title,
        message: row.message,
        type: row.metadata ? (JSON.parse(row.metadata || '{}').notifType || 'info') : 'info',
        targetType: row.target_type,
        targetId: row.target_id,
        sentCount: row.sent_count,
        failedCount: row.failed_count,
        createdAt: row.created_at,
        source: 'log',
      })),
    ];

    // Sort combined by date
    documents.sort((a, b) => new Date(String(b.createdAt)).getTime() - new Date(String(a.createdAt)).getTime());

    return c.json({ documents: documents.slice(0, limit), total: Math.max(total, documents.length) });
  } catch (error) {
    const message = getErrorMessage(error);
    return c.json({ error: message }, 500);
  }
});

// POST / — Send notification(s)
notificationRoutes.post('/', async (c) => {
  try {
    const data = await c.req.json<{
      title: string;
      message: string;
      type?: string;
      targetAll?: boolean;
      targetUserId?: string;
      targetInstitute?: string;
      actionUrl?: string;
      [key: string]: unknown;
    }>();

    const { title, message, type = 'info', targetAll, targetUserId, targetInstitute, actionUrl, ...extraData } = data;

    if (!title || !message) {
      return c.json({ error: 'Title and message are required' }, 400);
    }

    const created: Record<string, unknown>[] = [];
    let failedCount = 0;
    let targetType = 'user';
    let targetId = targetUserId || '';

    if (targetAll) {
      targetType = 'all';
      targetId = 'all';
      // Send to all users — paginate through users
      let offset = 0;
      const limit = 100;
      let hasMore = true;

      while (hasMore) {
        const usersResult = await c.env.DB.prepare(
          'SELECT id FROM users WHERE is_active = 1 LIMIT ? OFFSET ?'
        ).bind(limit, offset).all();

        for (const user of usersResult.results as { id: string }[]) {
          try {
            const notifId = crypto.randomUUID();
            await c.env.DB.prepare(`
              INSERT INTO notifications (id, user_id, title, message, type, is_read, action_url)
              VALUES (?, ?, ?, ?, ?, 0, ?)
            `).bind(notifId, user.id, title, message, type, actionUrl || null).run();
            created.push({ id: notifId, userId: user.id });
          } catch (docErr) {
            failedCount++;
            console.error('Failed to create notification for user:', user.id, getErrorMessage(docErr));
          }
        }

        offset += limit;
        hasMore = usersResult.results.length === limit;
      }
    } else if (targetInstitute) {
      targetType = 'institute';
      targetId = targetInstitute;
      // Send to all users in an institute
      const usersResult = await c.env.DB.prepare(
        'SELECT id FROM users WHERE institute_id = ? AND is_active = 1 LIMIT 500'
      ).bind(targetInstitute).all();

      for (const user of usersResult.results as { id: string }[]) {
        try {
          const notifId = crypto.randomUUID();
          await c.env.DB.prepare(`
            INSERT INTO notifications (id, user_id, title, message, type, is_read, action_url)
            VALUES (?, ?, ?, ?, ?, 0, ?)
          `).bind(notifId, user.id, title, message, type, actionUrl || null).run();
          created.push({ id: notifId, userId: user.id });
        } catch (docErr) {
          failedCount++;
          console.error('Failed to create notification for user:', user.id, getErrorMessage(docErr));
        }
      }
    } else if (targetUserId) {
      // Send to specific user
      try {
        const notifId = crypto.randomUUID();
        await c.env.DB.prepare(`
          INSERT INTO notifications (id, user_id, title, message, type, is_read, action_url)
          VALUES (?, ?, ?, ?, ?, 0, ?)
        `).bind(notifId, targetUserId, title, message, type, actionUrl || null).run();
        created.push({ id: notifId, userId: targetUserId });
      } catch (docErr) {
        failedCount++;
        console.error('Failed to create notification:', getErrorMessage(docErr));
      }
    } else {
      return c.json({ error: 'Specify targetAll, targetUserId, or targetInstitute' }, 400);
    }

    // Send OneSignal push notification in addition to in-app
    // Check user notification preferences before sending push
    try {
      if (targetAll) {
        // For targetAll, we can't check individual prefs efficiently — send to all via segment
        await sendPushNotification(c.env, {
          title,
          message,
          targetSegment: 'All',
          url: actionUrl || undefined,
        });
      } else if (targetUserId) {
        // Check individual user's notification preferences
        const prefs = await checkUserNotifPrefs(c.env, targetUserId, type);
        if (prefs.push) {
          const pushTokens = await getUserPushTokens(c.env, targetUserId);
          if (pushTokens.length > 0) {
            await sendPushNotification(c.env, {
              title,
              message,
              targetPlayerIds: pushTokens,
              url: actionUrl || undefined,
            });
          }
        }
      } else if (targetInstitute) {
        // Check individual notification preferences for each user in the institute
        const instituteUsersResult = await c.env.DB.prepare(
          'SELECT id FROM users WHERE institute_id = ? AND is_active = 1 LIMIT 500'
        ).bind(targetInstitute).all();

        const allowedUserIds: string[] = [];
        for (const user of instituteUsersResult.results as { id: string }[]) {
          const prefs = await checkUserNotifPrefs(c.env, user.id, type);
          if (prefs.push) {
            allowedUserIds.push(user.id);
          }
        }

        if (allowedUserIds.length > 0) {
          const pushTokens = await getBatchUserPushTokens(c.env, allowedUserIds);
          if (pushTokens.length > 0) {
            await sendPushNotification(c.env, {
              title,
              message,
              targetPlayerIds: pushTokens,
              url: actionUrl || undefined,
            });
          }
        }
      }
    } catch (pushErr) {
      console.error('Push notification failed:', getErrorMessage(pushErr));
    }

    // Log to notification_logs
    const user = c.get('user');
    const logMetadata = JSON.stringify({ notifType: type, actionUrl: actionUrl || '', ...extraData });

    await c.env.DB.prepare(`
      INSERT INTO notification_logs (type, category, title, message, target_type, target_id, sent_count, failed_count, metadata, created_by)
      VALUES ('in-app', 'targeted', ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      title,
      message,
      targetType,
      targetId,
      created.length,
      failedCount,
      logMetadata,
      user.id
    ).run();

    await logAudit(c.env, user.id, 'SEND_NOTIFICATION', 'notifications', undefined, {
      targetType,
      targetId,
      targetAll,
      targetUserId,
      targetInstitute,
      sentCount: created.length,
      failedCount,
    });

    return c.json({ created, count: created.length, failedCount, logged: true });
  } catch (error) {
    const message = getErrorMessage(error);
    return c.json({ error: message }, 500);
  }
});

export default notificationRoutes;
