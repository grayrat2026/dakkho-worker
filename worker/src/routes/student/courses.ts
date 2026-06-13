/**
 * Student Course Detail Routes
 * Course detail, curriculum, course videos
 */

import { Hono } from 'hono';
import type { Env } from '../../env';
import {
  getStudentAuth,
  getErrorMessage,
  type StudentAuthVariables,
} from './helpers';

const routes = new Hono<{ Bindings: Env; Variables: StudentAuthVariables }>();

// GET /courses/:id — Get course detail
routes.get('/courses/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const course = await c.env.DB.prepare(
      'SELECT * FROM courses WHERE id = ? AND is_published = 1'
    ).bind(id).first();

    if (!course) {
      return c.json({ error: 'Course not found' }, 404);
    }

    // Fetch all instructors for this course via course_instructors join table
    let instructors: unknown[] = [];
    try {
      const instResult = await c.env.DB.prepare(
        'SELECT i.* FROM instructors i JOIN course_instructors ci ON i.id = ci.instructor_id WHERE ci.course_id = ? ORDER BY ci.sort_order ASC'
      ).bind(id).all();
      instructors = instResult.results;
    } catch {
      // course_instructors table may not exist or no entries — fallback empty
    }

    // Fetch learning points for this course
    let learningPoints: unknown[] = [];
    try {
      const lpResult = await c.env.DB.prepare(
        'SELECT id, point_text, sort_order FROM course_learning_points WHERE course_id = ? ORDER BY sort_order ASC'
      ).bind(id).all();
      learningPoints = lpResult.results;
    } catch {
      // course_learning_points table may not exist — fallback empty
    }

    // Fetch subjects for this course via course_subjects join table
    let subjects: unknown[] = [];
    try {
      const subResult = await c.env.DB.prepare(
        'SELECT s.* FROM subjects s JOIN course_subjects cs ON s.id = cs.subject_id WHERE cs.course_id = ? ORDER BY cs.sort_order ASC'
      ).bind(id).all();
      subjects = subResult.results;
    } catch {
      // course_subjects or subjects table may not exist — fallback empty
    }

    // Auto-calculate duration from videos
    let videoStats: any = null;
    try {
      videoStats = await c.env.DB.prepare(
        'SELECT COUNT(*) as count, COALESCE(SUM(duration), 0) as total_duration FROM videos WHERE course_id = ?'
      ).bind(id).first();
    } catch {
      // videos table may not exist — fallback empty
    }
    const videoCount = videoStats?.count || 0;
    const totalDuration = videoStats?.total_duration || 0;
    const avgDuration = videoCount > 0 ? Math.round(totalDuration / videoCount * 10) / 10 : 0;

    return c.json({
      course: {
        ...(course as any),
        duration: avgDuration,
        total_videos: videoCount,
        total_video_duration: totalDuration,
      },
      instructors,
      learningPoints,
      subjects,
    });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// GET /courses/:id/curriculum — Get full curriculum structure for a course
routes.get('/courses/:id/curriculum', async (c) => {
  try {
    const id = c.req.param('id');

    // Verify course exists
    const course = await c.env.DB.prepare(
      'SELECT id FROM courses WHERE id = ? AND is_published = 1'
    ).bind(id).first();

    if (!course) {
      return c.json({ error: 'Course not found' }, 404);
    }

    // Fetch subjects for this course via course_subjects join table
    let subjects: unknown[] = [];
    try {
      const subResult = await c.env.DB.prepare(
        'SELECT s.* FROM subjects s JOIN course_subjects cs ON s.id = cs.subject_id WHERE cs.course_id = ? ORDER BY cs.sort_order ASC'
      ).bind(id).all();
      subjects = subResult.results;
    } catch {
      // fallback empty
    }

    // Fetch chapters for this course
    let chapters: unknown[] = [];
    try {
      const chapResult = await c.env.DB.prepare(
        'SELECT * FROM chapters WHERE course_id = ? ORDER BY subject_id, sort_order ASC'
      ).bind(id).all();
      chapters = chapResult.results;
    } catch {
      // fallback empty
    }

    // Fetch lessons for this course
    let lessons: unknown[] = [];
    try {
      const lesResult = await c.env.DB.prepare(
        'SELECT * FROM lessons WHERE course_id = ? ORDER BY chapter_id, sort_order ASC'
      ).bind(id).all();
      lessons = lesResult.results;
    } catch {
      // fallback empty
    }

    // Fetch videos for this course
    let videos: unknown[] = [];
    try {
      const vidResult = await c.env.DB.prepare(
        'SELECT * FROM videos WHERE course_id = ? ORDER BY sort_order ASC'
      ).bind(id).all();
      videos = vidResult.results;
    } catch {
      // fallback empty
    }

    // Fetch learning points for this course
    let learningPoints: unknown[] = [];
    try {
      const lpResult = await c.env.DB.prepare(
        'SELECT id, point_text, sort_order FROM course_learning_points WHERE course_id = ? ORDER BY sort_order ASC'
      ).bind(id).all();
      learningPoints = lpResult.results;
    } catch {
      // fallback empty
    }

    return c.json({
      subjects,
      chapters,
      lessons,
      videos,
      learningPoints,
    });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// GET /courses/:id/videos — List videos for a course
routes.get('/courses/:id/videos', async (c) => {
  try {
    const id = c.req.param('id');
    const limit = parseInt(c.req.query('limit') || '100');
    const offset = parseInt(c.req.query('offset') || '0');

    // Check if user is enrolled (optional auth)
    const auth = await getStudentAuth(c);
    let isEnrolled = false;
    if (auth.authorized && auth.userId) {
      const enrollment = await c.env.DB.prepare(
        'SELECT id FROM enrollments WHERE user_id = ? AND course_id = ?'
      ).bind(auth.userId, id).first();
      isEnrolled = !!enrollment;
    }

    const countResult = await c.env.DB.prepare(
      'SELECT COUNT(*) as total FROM videos WHERE course_id = ?'
    ).bind(id).first();
    const total = (countResult as any)?.total || 0;

    const result = await c.env.DB.prepare(
      'SELECT * FROM videos WHERE course_id = ? ORDER BY sort_order ASC LIMIT ? OFFSET ?'
    ).bind(id, limit, offset).all();

    // Filter out unpublished videos for non-enrolled users
    const videos = (result.results as any[]).map(video => {
      if (!isEnrolled && !video.is_preview) {
        // Return limited info for non-enrolled non-preview videos
        return {
          ...video,
          stream_url: null,
          is_locked: true,
        };
      }
      return { ...video, is_locked: false };
    });

    return c.json({ videos, total });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

export default routes;
