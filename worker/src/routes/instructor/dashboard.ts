/**
 * Instructor dashboard routes
 *
 * - GET /dashboard       — Dashboard stats (instructorOrAdmin)
 * - GET /notifications   — List notifications (instructorOrAdmin)
 * - PUT /notifications/:id/read — Mark notification as read (instructorOrAdmin)
 * - PUT /notifications/read-all — Mark all notifications as read (instructorOrAdmin)
 */

import { Hono } from 'hono';
import type { Env } from '../../env';
import {
  instructorOrAdminMiddleware,
  type InstructorOrAdminAuthVariables,
} from '../../lib/instructor-auth-middleware';
import { getErrorMessage } from '../../lib/utils';

const routes = new Hono<{ Bindings: Env; Variables: InstructorOrAdminAuthVariables }>();

// GET /dashboard — Instructor dashboard stats
routes.get('/dashboard', instructorOrAdminMiddleware, async (c) => {
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

    // Course count
    let courseCount = 0;
    try {
      const cc = await c.env.DB.prepare('SELECT COUNT(*) as total FROM courses WHERE instructor_id = ?').bind(instructorId).first<{ total: number }>();
      courseCount = cc?.total || 0;
    } catch {}

    // Total students (from enrollments across all instructor courses)
    let totalStudents = 0;
    try {
      const ts = await c.env.DB.prepare(
        'SELECT COUNT(DISTINCT user_id) as total FROM enrollments WHERE course_id IN (SELECT id FROM courses WHERE instructor_id = ?)'
      ).bind(instructorId).first<{ total: number }>();
      totalStudents = ts?.total || 0;
    } catch {}

    // Average rating
    let avgRating = 0;
    let totalReviews = 0;
    try {
      const rs = await c.env.DB.prepare(
        'SELECT AVG(rating) as avg, COUNT(*) as count FROM instructor_reviews WHERE instructor_id = ?'
      ).bind(instructorId).first<{ avg: number; count: number }>();
      avgRating = rs?.avg ? Math.round(rs.avg * 10) / 10 : 0;
      totalReviews = rs?.count || 0;
    } catch {}

    // Total revenue (from payments for instructor's courses)
    let totalRevenue = 0;
    try {
      const rev = await c.env.DB.prepare(
        "SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE course_id IN (SELECT id FROM courses WHERE instructor_id = ?) AND status = 'completed'"
      ).bind(instructorId).first<{ total: number }>();
      totalRevenue = rev?.total || 0;
    } catch {}

    // Upcoming classes count
    let upcomingClasses = 0;
    try {
      const uc = await c.env.DB.prepare(
        "SELECT COUNT(*) as total FROM live_class_schedules WHERE instructor_id = ? AND scheduled_at > datetime('now') AND is_active = 1"
      ).bind(instructorId).first<{ total: number }>();
      upcomingClasses = uc?.total || 0;
    } catch {}

    return c.json({
      success: true,
      dashboard: {
        courseCount,
        totalStudents,
        avgRating,
        totalReviews,
        totalRevenue,
        upcomingClasses,
      },
    });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// GET /notifications — Get notifications for instructor from D1
routes.get('/notifications', instructorOrAdminMiddleware, async (c) => {
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
    const unreadOnly = c.req.query('unread') === 'true';

    let query = 'SELECT * FROM notifications WHERE user_id = ?';
    const params: unknown[] = [instructorId];

    if (unreadOnly) {
      query += ' AND read = 0';
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const result = await c.env.DB.prepare(query).bind(...params).all();

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM notifications WHERE user_id = ?';
    const countParams: unknown[] = [instructorId];
    if (unreadOnly) {
      countQuery += ' AND read = 0';
    }
    const countResult = await c.env.DB.prepare(countQuery).bind(...countParams).first<{ total: number }>();
    const total = countResult?.total || 0;

    return c.json({ success: true, notifications: result.results, total });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// PUT /notifications/:id/read — Mark notification as read in D1
routes.put('/notifications/:id/read', instructorOrAdminMiddleware, async (c) => {
  try {
    const notificationId = c.req.param('id');

    await c.env.DB.prepare(
      'UPDATE notifications SET read = 1 WHERE id = ?'
    ).bind(notificationId).run();

    return c.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// PUT /notifications/read-all — Mark all notifications as read
routes.put('/notifications/read-all', instructorOrAdminMiddleware, async (c) => {
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

    await c.env.DB.prepare(
      'UPDATE notifications SET read = 1 WHERE user_id = ? AND read = 0'
    ).bind(instructorId).run();

    return c.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

export default routes;
