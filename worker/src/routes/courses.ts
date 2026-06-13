/**
 * Courses routes — GET, POST, PUT, DELETE
 * D1-only: No Appwrite dependencies
 */

import { Hono } from 'hono';
import type { Env } from '../env';
import type { AuthVariables } from '../lib/auth';
import { adminAuthMiddleware } from '../lib/auth';
import { logAudit } from '../lib/audit';
import { getErrorMessage, normalizeKeys } from '../lib/utils';

const courseRoutes = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

// Apply auth middleware to all course routes
courseRoutes.use('*', adminAuthMiddleware);

// Helper: generate slug from title
function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// GET / — List courses
courseRoutes.get('/', async (c) => {
  try {
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '20');
    const search = c.req.query('search') || '';
    const level = c.req.query('level') || '';
    const published = c.req.query('published') || '';
    const featured = c.req.query('featured') || '';
    const offset = (page - 1) * limit;

    let where = 'WHERE 1=1';
    const params: unknown[] = [];

    if (search) {
      where += ' AND title LIKE ?';
      params.push(`%${search}%`);
    }
    if (level) {
      where += ' AND level = ?';
      params.push(level);
    }
    if (published === 'true') {
      where += ' AND is_published = 1';
    }
    if (published === 'false') {
      where += ' AND is_published = 0';
    }
    if (featured === 'true') {
      where += ' AND is_featured = 1';
    }

    const countResult = await c.env.DB.prepare(
      `SELECT COUNT(*) as total FROM courses ${where}`
    ).bind(...params).first();
    const total = (countResult as any)?.total || 0;

    const result = await c.env.DB.prepare(
      `SELECT * FROM courses ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
    ).bind(...params, limit, offset).all();

    // Enrich courses with junction table data
    const enrichedResults = await Promise.all(result.results.map(async (course: any) => {
      const [cats, insts, subs, vidInfo] = await Promise.all([
        c.env.DB.prepare('SELECT category_id FROM course_categories WHERE course_id = ? ORDER BY sort_order').bind(course.id).all(),
        c.env.DB.prepare('SELECT instructor_id FROM course_instructors WHERE course_id = ? ORDER BY sort_order').bind(course.id).all(),
        c.env.DB.prepare('SELECT subject_id FROM course_subjects WHERE course_id = ? ORDER BY sort_order').bind(course.id).all(),
        c.env.DB.prepare('SELECT COUNT(*) as count, COALESCE(SUM(duration), 0) as total_duration FROM videos WHERE course_id = ?').bind(course.id).first(),
      ]);
      const videoCount = (vidInfo as any)?.count || 0;
      const totalDuration = (vidInfo as any)?.total_duration || 0;
      const avgDuration = videoCount > 0 ? Math.round(totalDuration / videoCount * 10) / 10 : 0;
      return {
        ...course,
        category_ids: cats.results.map((r: any) => r.category_id),
        instructor_ids: insts.results.map((r: any) => r.instructor_id),
        subject_ids: subs.results.map((r: any) => r.subject_id),
        total_videos: videoCount,
        duration: avgDuration,
        total_video_duration: totalDuration,
      };
    }));

    return c.json({ documents: enrichedResults, total });
  } catch (error) {
    const message = getErrorMessage(error);
    return c.json({ error: message }, 500);
  }
});

// POST / — Create course
courseRoutes.post('/', async (c) => {
  try {
    const rawData = await c.req.json<Record<string, unknown>>();
    const allowedFields = ['title', 'slug', 'description', 'thumbnail_url', 'preview_video_url', 'category_id', 'instructor_id', 'technology_id', 'level', 'language', 'duration', 'total_videos', 'rating', 'total_reviews', 'total_students', 'price', 'is_featured', 'is_published', 'tags', 'semester', 'what_you_learn'];
    const data = normalizeKeys(rawData, allowedFields);
    const id = crypto.randomUUID();
    const slug = (data.slug as string) || slugify(data.title as string);

    await c.env.DB.prepare(`
      INSERT INTO courses (id, title, slug, description, thumbnail_url, preview_video_url, category_id, instructor_id, technology_id, level, language, duration, total_videos, rating, total_reviews, total_students, price, is_featured, is_published, tags, semester, what_you_learn)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      data.title || '',
      slug,
      data.description || null,
      data.thumbnail_url || null,
      data.preview_video_url || null,
      data.category_id || null,
      data.instructor_id || null,
      data.technology_id || null,
      data.level || 'beginner',
      data.language || 'bangla',
      data.duration || 0,
      data.total_videos || 0,
      data.rating || 0,
      data.total_reviews || 0,
      data.total_students || 0,
      data.price || 0,
      data.is_featured ? 1 : 0,
      data.is_published ? 1 : 0,
      data.tags || null,
      data.semester || null,
      data.what_you_learn || null
    ).run();

    // Save junction table entries for multiple categories, instructors, subjects
    const categoryIds = rawData.category_ids ? JSON.parse(String(rawData.category_ids)) : (rawData.category_id ? [rawData.category_id] : []);
    const instructorIds = rawData.instructor_ids ? JSON.parse(String(rawData.instructor_ids)) : (rawData.instructor_id ? [rawData.instructor_id] : []);
    const subjectIds = rawData.subject_ids ? JSON.parse(String(rawData.subject_ids)) : [];

    // Clear existing and save category associations
    if (categoryIds.length > 0) {
      await c.env.DB.prepare('DELETE FROM course_categories WHERE course_id = ?').bind(id).run();
      for (let i = 0; i < categoryIds.length; i++) {
        await c.env.DB.prepare('INSERT OR IGNORE INTO course_categories (course_id, category_id, sort_order) VALUES (?, ?, ?)').bind(id, String(categoryIds[i]), i).run();
      }
    }

    // Clear existing and save instructor associations
    if (instructorIds.length > 0) {
      await c.env.DB.prepare('DELETE FROM course_instructors WHERE course_id = ?').bind(id).run();
      for (let i = 0; i < instructorIds.length; i++) {
        await c.env.DB.prepare('INSERT OR IGNORE INTO course_instructors (course_id, instructor_id, sort_order) VALUES (?, ?, ?)').bind(id, String(instructorIds[i]), i).run();
      }
    }

    // Clear existing and save subject associations
    if (subjectIds.length > 0) {
      await c.env.DB.prepare('DELETE FROM course_subjects WHERE course_id = ?').bind(id).run();
      for (let i = 0; i < subjectIds.length; i++) {
        await c.env.DB.prepare('INSERT OR IGNORE INTO course_subjects (course_id, subject_id, sort_order) VALUES (?, ?, ?)').bind(id, String(subjectIds[i]), i).run();
      }
    }

    // Save learning points
    const learningPoints = rawData.learning_points ? (Array.isArray(rawData.learning_points) ? rawData.learning_points : JSON.parse(String(rawData.learning_points))) : [];
    if (learningPoints.length > 0) {
      await c.env.DB.prepare('DELETE FROM course_learning_points WHERE course_id = ?').bind(id).run();
      for (let i = 0; i < learningPoints.length; i++) {
        const pointText = typeof learningPoints[i] === 'string' ? learningPoints[i] : (learningPoints[i] as any).point_text || '';
        if (pointText) {
          await c.env.DB.prepare('INSERT INTO course_learning_points (course_id, point_text, sort_order) VALUES (?, ?, ?)').bind(id, pointText, i).run();
        }
      }
    }

    const created = await c.env.DB.prepare('SELECT * FROM courses WHERE id = ?').bind(id).first();

    // Auto-create default packages for the new course (single + friend pack)
    const coursePrice = (data.price as number) || 0;
    try {
      // Single pack (1 user)
      await c.env.DB.prepare(`
        INSERT INTO course_packages (course_id, package_type, price, duration_months, max_users, is_auto_assign, is_active, created_by)
        VALUES (?, 'single', ?, 6, 1, 1, 1, ?)
      `).bind(id, coursePrice, c.get('user')?.id || null).run();

      // Friend pack (2 users, 20% discount per user)
      const friendPackPrice = Math.round(coursePrice * 1.6); // 2 users at ~80% each
      await c.env.DB.prepare(`
        INSERT INTO course_packages (course_id, package_type, price, duration_months, max_users, is_auto_assign, is_active, created_by)
        VALUES (?, 'friend', ?, 6, 2, 1, 1, ?)
      `).bind(id, friendPackPrice, c.get('user')?.id || null).run();
    } catch (pkgErr) {
      // Don't fail course creation if package creation fails
      console.error('Auto-package creation failed:', pkgErr);
    }

    const user = c.get('user');
    await logAudit(c.env, user.id, 'CREATE_COURSE', 'courses', id, data);

    return c.json({ document: created });
  } catch (error) {
    const message = getErrorMessage(error);
    return c.json({ error: message }, 500);
  }
});

// PUT / — Update course
courseRoutes.put('/', async (c) => {
  try {
    const rawData = await c.req.json<Record<string, unknown>>();
    const { courseId, ...rawUpdates } = rawData;

    if (!courseId) {
      return c.json({ error: 'Course ID required' }, 400);
    }

    const allowedFields = ['title', 'slug', 'description', 'thumbnail_url', 'preview_video_url', 'category_id', 'instructor_id', 'technology_id', 'level', 'language', 'duration', 'total_videos', 'rating', 'total_reviews', 'total_students', 'price', 'is_featured', 'is_published', 'tags', 'semester', 'what_you_learn'];
    // Normalize camelCase keys from admin panel to snake_case for D1
    const updates = normalizeKeys(rawUpdates, allowedFields);
    const setClauses: string[] = [];
    const setValues: unknown[] = [];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        // Convert boolean to integer for SQLite
        if (key === 'is_featured' || key === 'is_published') {
          setClauses.push(`${key} = ?`);
          setValues.push(value ? 1 : 0);
        } else {
          setClauses.push(`${key} = ?`);
          setValues.push(value);
        }
      }
    }

    if (setClauses.length === 0) {
      return c.json({ error: 'No valid fields to update' }, 400);
    }

    setClauses.push("updated_at = datetime('now')");
    setValues.push(String(courseId));

    await c.env.DB.prepare(
      `UPDATE courses SET ${setClauses.join(', ')} WHERE id = ?`
    ).bind(...setValues).run();

    // Save junction table entries for multiple categories, instructors, subjects
    const categoryIds = rawData.category_ids ? JSON.parse(String(rawData.category_ids)) : (rawData.category_id ? [rawData.category_id] : []);
    const instructorIds = rawData.instructor_ids ? JSON.parse(String(rawData.instructor_ids)) : (rawData.instructor_id ? [rawData.instructor_id] : []);
    const subjectIds = rawData.subject_ids ? JSON.parse(String(rawData.subject_ids)) : [];

    // Clear existing and save category associations
    if (categoryIds.length > 0) {
      await c.env.DB.prepare('DELETE FROM course_categories WHERE course_id = ?').bind(String(courseId)).run();
      for (let i = 0; i < categoryIds.length; i++) {
        await c.env.DB.prepare('INSERT OR IGNORE INTO course_categories (course_id, category_id, sort_order) VALUES (?, ?, ?)').bind(String(courseId), String(categoryIds[i]), i).run();
      }
    }

    // Clear existing and save instructor associations
    if (instructorIds.length > 0) {
      await c.env.DB.prepare('DELETE FROM course_instructors WHERE course_id = ?').bind(String(courseId)).run();
      for (let i = 0; i < instructorIds.length; i++) {
        await c.env.DB.prepare('INSERT OR IGNORE INTO course_instructors (course_id, instructor_id, sort_order) VALUES (?, ?, ?)').bind(String(courseId), String(instructorIds[i]), i).run();
      }
    }

    // Clear existing and save subject associations
    if (subjectIds.length > 0) {
      await c.env.DB.prepare('DELETE FROM course_subjects WHERE course_id = ?').bind(String(courseId)).run();
      for (let i = 0; i < subjectIds.length; i++) {
        await c.env.DB.prepare('INSERT OR IGNORE INTO course_subjects (course_id, subject_id, sort_order) VALUES (?, ?, ?)').bind(String(courseId), String(subjectIds[i]), i).run();
      }
    }

    // Save learning points
    const learningPoints = rawData.learning_points ? (Array.isArray(rawData.learning_points) ? rawData.learning_points : JSON.parse(String(rawData.learning_points))) : [];
    if (learningPoints.length > 0) {
      await c.env.DB.prepare('DELETE FROM course_learning_points WHERE course_id = ?').bind(String(courseId)).run();
      for (let i = 0; i < learningPoints.length; i++) {
        const pointText = typeof learningPoints[i] === 'string' ? learningPoints[i] : (learningPoints[i] as any).point_text || '';
        if (pointText) {
          await c.env.DB.prepare('INSERT INTO course_learning_points (course_id, point_text, sort_order) VALUES (?, ?, ?)').bind(String(courseId), pointText, i).run();
        }
      }
    }

    const updated = await c.env.DB.prepare('SELECT * FROM courses WHERE id = ?').bind(String(courseId)).first();

    // Auto-create packages if course has none, or update auto-generated package prices when course price changes
    try {
      const existingPackages = await c.env.DB.prepare(
        'SELECT * FROM course_packages WHERE course_id = ?'
      ).bind(String(courseId)).all();

      const coursePrice = (updates.price as number) ?? ((updated as any)?.price || 0);

      if (existingPackages.results.length === 0) {
        // No packages exist — auto-create single + friend pack
        await c.env.DB.prepare(`
          INSERT INTO course_packages (course_id, package_type, price, duration_months, max_users, is_auto_assign, is_active, created_by)
          VALUES (?, 'single', ?, 6, 1, 1, 1, 'auto')
        `).bind(String(courseId), coursePrice).run();

        const friendPackPrice = Math.round(coursePrice * 1.6);
        await c.env.DB.prepare(`
          INSERT INTO course_packages (course_id, package_type, price, duration_months, max_users, is_auto_assign, is_active, created_by)
          VALUES (?, 'friend', ?, 6, 2, 1, 1, 'auto')
        `).bind(String(courseId), friendPackPrice).run();
      } else if (updates.price !== undefined) {
        // Price changed — update auto-assigned single pack price
        await c.env.DB.prepare(
          "UPDATE course_packages SET price = ?, updated_at = datetime('now') WHERE course_id = ? AND package_type = 'single' AND is_auto_assign = 1"
        ).bind(coursePrice, String(courseId)).run();

        // Update friend pack price proportionally
        const friendPackPrice = Math.round(coursePrice * 1.6);
        await c.env.DB.prepare(
          "UPDATE course_packages SET price = ?, updated_at = datetime('now') WHERE course_id = ? AND package_type = 'friend' AND is_auto_assign = 1"
        ).bind(friendPackPrice, String(courseId)).run();
      }
    } catch (pkgErr) {
      console.error('Auto-package sync failed:', pkgErr);
      // Don't fail course update
    }

    const user = c.get('user');
    await logAudit(c.env, user.id, 'UPDATE_COURSE', 'courses', String(courseId), updates);

    return c.json({ document: updated });
  } catch (error) {
    const message = getErrorMessage(error);
    return c.json({ error: message }, 500);
  }
});

// DELETE / — Delete course
courseRoutes.delete('/', async (c) => {
  try {
    const courseId = c.req.query('id');

    if (!courseId) {
      return c.json({ error: 'Course ID required' }, 400);
    }

    await c.env.DB.prepare('DELETE FROM courses WHERE id = ?').bind(courseId).run();

    const user = c.get('user');
    await logAudit(c.env, user.id, 'DELETE_COURSE', 'courses', courseId);

    return c.json({ success: true });
  } catch (error) {
    const message = getErrorMessage(error);
    return c.json({ error: message }, 500);
  }
});

export default courseRoutes;
