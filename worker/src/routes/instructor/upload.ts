/**
 * Instructor upload routes
 *
 * - POST /courses/:id/thumbnail           — Upload course thumbnail (instructorOrAdmin)
 * - POST /courses/:courseId/videos/upload  — Upload video with FormData (instructorOrAdmin)
 */

import { Hono } from 'hono';
import type { Env } from '../../env';
import {
  instructorOrAdminMiddleware,
  type InstructorOrAdminAuthVariables,
} from '../../lib/instructor-auth-middleware';
import { getErrorMessage, generateId } from '../../lib/utils';
import { getPublicUrl } from '../../lib/r2';
import { verifyCourseOwnership, slugify, formatVideoRow } from './helpers';

const routes = new Hono<{ Bindings: Env; Variables: InstructorOrAdminAuthVariables }>();

// POST /courses/:id/thumbnail — Upload course thumbnail
routes.post('/courses/:id/thumbnail', instructorOrAdminMiddleware, async (c) => {
  try {
    const authRole = c.get('authRole');
    const instructorId = authRole === 'admin' ? c.req.query('instructorId')! : c.get('instructorId');
    const courseId = c.req.param('id');

    if (!instructorId) {
      return c.json({ error: 'instructorId is required' }, 400);
    }

    // Verify ownership
    const owns = await verifyCourseOwnership(c.env, courseId, instructorId);
    if (!owns) {
      return c.json({ error: 'You do not own this course' }, 403);
    }

    const formData = await c.req.formData();
    const fileEntry = formData.get('thumbnail');
    if (!fileEntry || typeof fileEntry === 'string') {
      return c.json({ error: 'No thumbnail file provided' }, 400);
    }
    const file = fileEntry as unknown as Blob & { name?: string; type?: string };

    // Upload to R2_THUMBNAILS bucket
    const key = `courses/${courseId}/${Date.now()}-${file.name || 'thumbnail'}`;
    const arrayBuffer = await file.arrayBuffer();
    await c.env.R2_THUMBNAILS.put(key, arrayBuffer, {
      httpMetadata: { contentType: file.type || 'image/jpeg' },
    });

    const thumbnailUrl = await getPublicUrl(c.env, 'thumbnails', key);

    // Update course thumbnail_url in D1
    await c.env.DB.prepare(
      'UPDATE courses SET thumbnail_url = ?, updated_at = ? WHERE id = ?'
    ).bind(thumbnailUrl, new Date().toISOString(), courseId).run();

    return c.json({ success: true, thumbnail_url: thumbnailUrl });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// POST /courses/:courseId/videos/upload — Upload video with FormData (video file, thumbnail, CC)
routes.post('/courses/:courseId/videos/upload', instructorOrAdminMiddleware, async (c) => {
  try {
    const authRole = c.get('authRole');
    const instructorId = authRole === 'admin' ? c.req.query('instructorId')! : c.get('instructorId');
    const courseId = c.req.param('courseId');

    if (!instructorId) {
      return c.json({ error: 'instructorId is required' }, 400);
    }

    // Verify ownership
    const owns = await verifyCourseOwnership(c.env, courseId, instructorId);
    if (!owns) {
      return c.json({ error: 'You do not own this course' }, 403);
    }

    const formData = await c.req.formData();

    // Metadata fields
    const title = formData.get('title') as string;
    const chapter_id = (formData.get('chapter_id') as string) || null;
    const subject_id = (formData.get('subject_id') as string) || null;
    const lesson_type = (formData.get('lesson_type') as string) || 'video';
    const sort_order = parseInt(formData.get('sort_order') as string) || 0;
    const is_preview = formData.get('is_preview') === '1' ? 1 : 0;
    const is_published = formData.get('is_published') === '1' ? 1 : 0;
    const duration = parseInt(formData.get('duration') as string) || 0;
    const description = (formData.get('description') as string) || null;

    if (!title) {
      return c.json({ error: 'title is required' }, 400);
    }

    let videoUrl = '';
    let thumbnailUrl = '';
    let ccUrl = '';

    // Upload video file to R2_VIDEOS
    const videoEntry = formData.get('video');
    if (videoEntry && typeof videoEntry !== 'string') {
      const videoFile = videoEntry as unknown as Blob & { name?: string; type?: string };
      const videoKey = `courses/${courseId}/videos/${Date.now()}-${videoFile.name || 'video.mp4'}`;
      const videoBuffer = await videoFile.arrayBuffer();
      await c.env.R2_VIDEOS.put(videoKey, videoBuffer, {
        httpMetadata: { contentType: videoFile.type || 'video/mp4' },
      });
      videoUrl = await getPublicUrl(c.env, 'videos', videoKey);
    } else {
      // Check for external URL
      const externalUrl = formData.get('video_url') as string;
      if (externalUrl) {
        videoUrl = externalUrl;
      }
    }

    // Upload thumbnail file to R2_THUMBNAILS
    const thumbEntry = formData.get('thumbnail');
    if (thumbEntry && typeof thumbEntry !== 'string') {
      const thumbFile = thumbEntry as unknown as Blob & { name?: string; type?: string };
      const thumbKey = `courses/${courseId}/thumbnails/${Date.now()}-${thumbFile.name || 'thumbnail.jpg'}`;
      const thumbBuffer = await thumbFile.arrayBuffer();
      await c.env.R2_THUMBNAILS.put(thumbKey, thumbBuffer, {
        httpMetadata: { contentType: thumbFile.type || 'image/jpeg' },
      });
      thumbnailUrl = await getPublicUrl(c.env, 'thumbnails', thumbKey);
    }

    // Upload CC/subtitle file to R2_RESOURCES
    const ccEntry = formData.get('cc_file');
    if (ccEntry && typeof ccEntry !== 'string') {
      const ccFile = ccEntry as unknown as Blob & { name?: string; type?: string };
      const ccKey = `courses/${courseId}/subtitles/${Date.now()}-${ccFile.name || 'subtitles.vtt'}`;
      const ccBuffer = await ccFile.arrayBuffer();
      await c.env.R2_RESOURCES.put(ccKey, ccBuffer, {
        httpMetadata: { contentType: ccFile.type || 'text/vtt' },
      });
      ccUrl = await getPublicUrl(c.env, 'resources', ccKey);
    }

    // Create video record in D1
    const videoId = generateId();
    const videoSlug = slugify(title);
    const now = new Date().toISOString();

    await c.env.DB.prepare(`
      INSERT INTO videos (id, course_id, title, slug, video_url, thumbnail_url, duration, sort_order, is_preview, is_published, chapter_id, subject_id, lesson_type, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      videoId, courseId, title, videoSlug, videoUrl || null,
      thumbnailUrl || null, duration, sort_order, is_preview, is_published,
      chapter_id, subject_id, lesson_type || null, now, now
    ).run();

    // If there's a CC URL, store it in course_resources as subtitle
    if (ccUrl) {
      const resourceId = generateId();
      await c.env.DB.prepare(`
        INSERT INTO course_resources (id, course_id, chapter_id, lesson_id, title, description, file_url, file_type, sort_order, uploaded_by, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)
      `).bind(
        resourceId, courseId, chapter_id, videoId,
        `${title} - Subtitles`, 'Closed captions / subtitles',
        ccUrl, 'vtt', instructorId, now, now
      ).run();
    }

    const row = await c.env.DB.prepare('SELECT * FROM videos WHERE id = ?').bind(videoId).first();
    const video = formatVideoRow(row as Record<string, unknown>);

    return c.json({ success: true, video, cc_url: ccUrl || undefined }, 201);
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

export default routes;
