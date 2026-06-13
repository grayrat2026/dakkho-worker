/**
 * Student Video Routes
 * Video streaming session URL
 */

import { Hono } from 'hono';
import type { Env } from '../../env';
import {
  getStudentAuth,
  getBucketForType,
  getPublicUrl,
  getErrorMessage,
  type StudentAuthVariables,
} from './helpers';

const routes = new Hono<{ Bindings: Env; Variables: StudentAuthVariables }>();

// GET /video/stream-url — Get streaming URL for a video
routes.get('/video/stream-url', async (c) => {
  try {
    const auth = await getStudentAuth(c);
    if (!auth.authorized) {
      return c.json({ error: 'Unauthorized — login required to stream videos' }, 401);
    }
    if (!auth.emailVerified) {
      return c.json({ error: 'Email verification required', code: 'EMAIL_NOT_VERIFIED' }, 403);
    }

    const key = c.req.query('key');
    const bucket = c.req.query('bucket') || 'videos';

    if (!key) {
      return c.json({ error: 'key parameter required' }, 400);
    }

    const r2Bucket = getBucketForType(bucket, c.env);
    const fileInfo = await r2Bucket.head(key);
    if (!fileInfo) {
      return c.json({ error: 'Video not found' }, 404);
    }

    // Check enrollment for video access
    if (auth.userId) {
      // Look up the video record to get the course_id
      const video = await c.env.DB.prepare(
        'SELECT course_id, is_preview FROM videos WHERE video_url = ? OR id = ? LIMIT 1'
      ).bind(key, key).first<{ course_id: string; is_preview: number }>();

      if (video) {
        const enrollment = await c.env.DB.prepare(
          'SELECT id FROM enrollments WHERE user_id = ? AND course_id = ?'
        ).bind(auth.userId, video.course_id).first();

        if (!enrollment && !video.is_preview) {
          return c.json({ error: 'Not enrolled in this course' }, 403);
        }
      }
    }

    const url = getPublicUrl(c.env, bucket, key);

    return c.json({ url });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

export default routes;
