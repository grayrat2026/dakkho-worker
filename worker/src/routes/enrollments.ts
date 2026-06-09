/**
 * Enrollments routes — GET, DELETE
 * Admin management for course enrollments
 */

import { Hono } from 'hono';
import type { Env } from '../env';
import type { AuthVariables } from '../lib/auth';
import { adminAuthMiddleware } from '../lib/auth';
import { logAudit } from '../lib/audit';
import { getErrorMessage } from '../lib/utils';

const enrollmentRoutes = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

// Apply auth middleware
enrollmentRoutes.use('*', adminAuthMiddleware);

// GET / — List enrollments with user/course info
enrollmentRoutes.get('/', async (c) => {
  try {
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '20');
    const userId = c.req.query('userId') || '';
    const courseId = c.req.query('courseId') || '';
    const offset = (page - 1) * limit;

    let where = 'WHERE 1=1';
    const params: unknown[] = [];

    if (userId) {
      where += ' AND e.user_id = ?';
      params.push(userId);
    }
    if (courseId) {
      where += ' AND e.course_id = ?';
      params.push(courseId);
    }

    const countResult = await c.env.DB.prepare(
      `SELECT COUNT(*) as total FROM enrollments e ${where}`
    ).bind(...params).first();
    const total = (countResult as any)?.total || 0;

    const result = await c.env.DB.prepare(
      `SELECT e.*, u.full_name as user_name, u.email as user_email, c.title as course_title
       FROM enrollments e
       LEFT JOIN users u ON e.user_id = u.id
       LEFT JOIN courses c ON e.course_id = c.id
       ${where}
       ORDER BY e.created_at DESC LIMIT ? OFFSET ?`
    ).bind(...params, limit, offset).all();

    return c.json({ documents: result.results, total });
  } catch (error) {
    const message = getErrorMessage(error);
    return c.json({ error: message }, 500);
  }
});

// DELETE / — Remove enrollment
enrollmentRoutes.delete('/', async (c) => {
  try {
    const enrollmentId = c.req.query('id');

    if (!enrollmentId) {
      return c.json({ error: 'Enrollment ID required' }, 400);
    }

    await c.env.DB.prepare('DELETE FROM enrollments WHERE id = ?').bind(enrollmentId).run();

    const user = c.get('user');
    await logAudit(c.env, user.id, 'DELETE_ENROLLMENT', 'enrollments', enrollmentId);

    return c.json({ success: true });
  } catch (error) {
    const message = getErrorMessage(error);
    return c.json({ error: message }, 500);
  }
});

export default enrollmentRoutes;
