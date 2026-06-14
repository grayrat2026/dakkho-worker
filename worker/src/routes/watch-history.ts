/**
 * Watch History routes — Student-facing
 * GET  /api/watch-history       — List watch history for authenticated student
 * POST /api/watch-history       — Upsert a watch history entry
 * DELETE /api/watch-history     — Clear all watch history for student
 * DELETE /api/watch-history/:id — Delete a single history entry
 *
 * Uses the student_activity D1 table to persist watch events.
 */

import { Hono } from 'hono';
import type { Env } from '../env';
import type { StudentAuthVariables } from '../lib/student-auth-middleware';
import { studentAuthMiddleware } from '../lib/student-auth-middleware';
import { getErrorMessage } from '../lib/utils';

const watchHistoryRoutes = new Hono<{ Bindings: Env; Variables: StudentAuthVariables }>();

// Apply student auth middleware to all routes
watchHistoryRoutes.use('*', studentAuthMiddleware);

// GET / — List watch history for current student
watchHistoryRoutes.get('/', async (c) => {
  try {
    const userId = c.get('studentId');
    const limit = Math.min(parseInt(c.req.query('limit') || '50'), 200);
    const offset = parseInt(c.req.query('offset') || '0');

    // Fetch watch history from student_activity table, joined with video/course info
    const { results } = await c.env.DB.prepare(
      `SELECT
        sa.id,
        sa.resource_id AS video_id,
        sa.title AS video_title,
        sa.metadata,
        sa.created_at AS watched_at,
        v.course_id,
        v.duration AS video_duration,
        v.thumbnail_url AS video_thumbnail,
        c.title AS course_name,
        c.thumbnail_url AS course_thumbnail
      FROM student_activity sa
      LEFT JOIN videos v ON v.id = sa.resource_id
      LEFT JOIN courses c ON c.id = v.course_id
      WHERE sa.user_id = ? AND sa.activity_type = 'watch'
      ORDER BY sa.created_at DESC
      LIMIT ? OFFSET ?`
    )
      .bind(userId, limit, offset)
      .all();

    // Get total count
    const countResult = await c.env.DB.prepare(
      `SELECT COUNT(*) as total FROM student_activity WHERE user_id = ? AND activity_type = 'watch'`
    )
      .bind(userId)
      .first<{ total: number }>();

    // Parse metadata JSON for each item
    const history = results.map((row: any) => {
      let metadata: Record<string, any> = {};
      try {
        metadata = row.metadata ? JSON.parse(row.metadata) : {};
      } catch {}
      return {
        id: row.id,
        videoId: row.video_id,
        videoTitle: row.video_title || '',
        courseId: row.course_id || '',
        courseName: row.course_name || '',
        watchedAt: row.watched_at,
        progress: metadata.progress || 0,
        lastPosition: metadata.lastPosition || 0,
        duration: row.video_duration || metadata.duration || 0,
        videoThumbnail: row.video_thumbnail || '',
        courseThumbnail: row.course_thumbnail || '',
      };
    });

    return c.json({
      history,
      total: countResult?.total || 0,
      limit,
      offset,
    });
  } catch (error) {
    const message = getErrorMessage(error);
    console.error('Watch history GET error:', error);
    return c.json({ error: message }, 500);
  }
});

// POST / — Upsert a watch history entry
watchHistoryRoutes.post('/', async (c) => {
  try {
    const userId = c.get('studentId');
    const body = await c.req.json<{
      videoId: string;
      videoTitle?: string;
      courseId?: string;
      progress?: number;
      lastPosition?: number;
      duration?: number;
    }>();

    if (!body.videoId) {
      return c.json({ error: 'videoId is required' }, 400);
    }

    const metadata = JSON.stringify({
      progress: body.progress || 0,
      lastPosition: body.lastPosition || 0,
      duration: body.duration || 0,
      courseId: body.courseId || '',
    });

    // Check if an entry already exists for this user + video
    const existing = await c.env.DB.prepare(
      `SELECT id FROM student_activity WHERE user_id = ? AND activity_type = 'watch' AND resource_id = ?`
    )
      .bind(userId, body.videoId)
      .first<{ id: number }>();

    if (existing) {
      // Update existing entry — bump timestamp to top of history
      await c.env.DB.prepare(
        `UPDATE student_activity
         SET title = ?, metadata = ?, created_at = datetime('now')
         WHERE id = ?`
      )
        .bind(body.videoTitle || '', metadata, existing.id)
        .run();

      return c.json({
        success: true,
        id: String(existing.id),
        action: 'updated',
      });
    }

    // Insert new entry — id is AUTOINCREMENT, omit it
    await c.env.DB.prepare(
      `INSERT INTO student_activity (user_id, activity_type, resource_type, resource_id, title, description, metadata, created_at)
       VALUES (?, 'watch', 'video', ?, ?, '', ?, datetime('now'))`
    )
      .bind(userId, body.videoId, body.videoTitle || '', metadata)
      .run();

    // Get the auto-generated id
    const newEntry = await c.env.DB.prepare(
      `SELECT id FROM student_activity WHERE user_id = ? AND activity_type = 'watch' AND resource_id = ? ORDER BY created_at DESC LIMIT 1`
    )
      .bind(userId, body.videoId)
      .first<{ id: number }>();

    return c.json({
      success: true,
      id: String(newEntry?.id || ''),
      action: 'created',
    });
  } catch (error) {
    const message = getErrorMessage(error);
    console.error('Watch history POST error:', error);
    return c.json({ error: message }, 500);
  }
});

// DELETE / — Clear all watch history for current student
watchHistoryRoutes.delete('/', async (c) => {
  try {
    const userId = c.get('studentId');

    const result = await c.env.DB.prepare(
      `DELETE FROM student_activity WHERE user_id = ? AND activity_type = 'watch'`
    )
      .bind(userId)
      .run();

    return c.json({
      success: true,
      deleted: result.meta?.changes || 0,
    });
  } catch (error) {
    const message = getErrorMessage(error);
    console.error('Watch history DELETE all error:', error);
    return c.json({ error: message }, 500);
  }
});

// DELETE /:id — Delete a single watch history entry
watchHistoryRoutes.delete('/:id', async (c) => {
  try {
    const userId = c.get('studentId');
    const entryId = c.req.param('id');

    const result = await c.env.DB.prepare(
      `DELETE FROM student_activity WHERE id = ? AND user_id = ? AND activity_type = 'watch'`
    )
      .bind(entryId, userId)
      .run();

    if (!result.meta?.changes) {
      return c.json({ error: 'History entry not found' }, 404);
    }

    return c.json({ success: true });
  } catch (error) {
    const message = getErrorMessage(error);
    console.error('Watch history DELETE single error:', error);
    return c.json({ error: message }, 500);
  }
});

export default watchHistoryRoutes;
