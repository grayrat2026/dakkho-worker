/**
 * Instructor course routes
 *
 * Course CRUD, video management, student lists,
 * chapters, lessons, resources, subjects, and technologies.
 */

import { Hono } from 'hono';
import type { Env } from '../../env';
import {
  instructorOrAdminMiddleware,
  type InstructorOrAdminAuthVariables,
} from '../../lib/instructor-auth-middleware';
import { getErrorMessage, generateId } from '../../lib/utils';
import { getPublicUrl } from '../../lib/r2';
import {
  formatCourseRow,
  formatVideoRow,
  formatEnrollmentRow,
  formatInstructorRow,
  slugify,
  verifyCourseOwnership,
  getInstructorId,
} from './helpers';

const routes = new Hono<{ Bindings: Env; Variables: InstructorOrAdminAuthVariables }>();

// ═══════════════════════════════════════════════════
// COURSE LISTING & DETAIL
// ═══════════════════════════════════════════════════

// GET /courses — List courses assigned to this instructor
routes.get('/courses', instructorOrAdminMiddleware, async (c) => {
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

    // Query D1 courses where instructor_id matches
    const result = await c.env.DB.prepare(
      'SELECT * FROM courses WHERE instructor_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
    ).bind(instructorId, limit, offset).all();

    // Also check course_instructors D1 table for courses assigned to this instructor
    let coursesFromSubjects: string[] = [];
    try {
      const subjectResult = await c.env.DB.prepare(
        'SELECT DISTINCT course_id FROM course_instructors WHERE instructor_id = ?'
      ).bind(instructorId).all<{ course_id: string }>();
      coursesFromSubjects = subjectResult.results.map(r => r.course_id);
    } catch {}

    // Merge with course_subjects results — add courses not already in the main result
    const existingCourseIds = new Set(result.results.map((r: any) => r.id));
    const additionalCourses: any[] = [];
    for (const cid of coursesFromSubjects) {
      if (!existingCourseIds.has(cid)) {
        try {
          const course = await c.env.DB.prepare(
            'SELECT * FROM courses WHERE id = ?'
          ).bind(cid).first();
          if (course) {
            additionalCourses.push(course);
          }
        } catch {}
      }
    }

    // Get total count
    const countResult = await c.env.DB.prepare(
      'SELECT COUNT(*) as total FROM courses WHERE instructor_id = ?'
    ).bind(instructorId).first<{ total: number }>();
    const total = (countResult?.total || 0) + additionalCourses.length;

    // Format all course rows
    const allCourses = [
      ...result.results.map((r: any) => formatCourseRow(r)),
      ...additionalCourses.map((r: any) => formatCourseRow(r)),
    ];

    return c.json({ courses: allCourses, total });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// GET /courses/:id — Get course detail with student count
routes.get('/courses/:id', instructorOrAdminMiddleware, async (c) => {
  try {
    const courseId = c.req.param('id');

    const row = await c.env.DB.prepare(
      'SELECT * FROM courses WHERE id = ?'
    ).bind(courseId).first();

    if (!row) {
      return c.json({ error: 'Course not found' }, 404);
    }

    // Get student count from enrollments
    let studentCount = 0;
    try {
      const enrollResult = await c.env.DB.prepare(
        'SELECT COUNT(*) as total FROM enrollments WHERE course_id = ?'
      ).bind(courseId).first<{ total: number }>();
      studentCount = enrollResult?.total || 0;
    } catch {}

    const course = formatCourseRow(row as Record<string, unknown>);

    return c.json({
      success: true,
      course,
      studentCount,
    });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// ═══════════════════════════════════════════════════
// COURSE STUDENTS
// ═══════════════════════════════════════════════════

// GET /courses/:id/students — List enrolled students
routes.get('/courses/:id/students', instructorOrAdminMiddleware, async (c) => {
  try {
    const courseId = c.req.param('id');
    const limit = parseInt(c.req.query('limit') || '20');
    const offset = parseInt(c.req.query('offset') || '0');

    // Get enrollments for this course
    const enrollResult = await c.env.DB.prepare(
      'SELECT * FROM enrollments WHERE course_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
    ).bind(courseId, limit, offset).all();

    // Get total count
    const countResult = await c.env.DB.prepare(
      'SELECT COUNT(*) as total FROM enrollments WHERE course_id = ?'
    ).bind(courseId).first<{ total: number }>();
    const total = countResult?.total || 0;

    // Enrich with student user data from D1
    const enrichedStudents = [];
    for (const enrollment of enrollResult.results as Array<Record<string, unknown>>) {
      const userId = enrollment.user_id as string | undefined;
      let studentProfile: Record<string, unknown> | null = null;
      if (userId) {
        try {
          const userRow = await c.env.DB.prepare(
            'SELECT id, name, email, avatar_url FROM users WHERE id = ?'
          ).bind(userId).first();
          if (userRow) {
            studentProfile = userRow as Record<string, unknown>;
          }
        } catch {}
      }
      const formattedEnrollment = formatEnrollmentRow(enrollment);
      enrichedStudents.push({
        ...formattedEnrollment,
        student: studentProfile ? {
          id: studentProfile.id || userId,
          name: studentProfile.name || '',
          email: studentProfile.email || '',
          avatarUrl: studentProfile.avatar_url || '',
        } : { id: userId, name: 'Unknown', email: '', avatarUrl: '' },
      });
    }

    return c.json({ students: enrichedStudents, total });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// ═══════════════════════════════════════════════════
// COURSE VIDEOS (listing & update)
// ═══════════════════════════════════════════════════

// GET /courses/:id/videos — List videos for a course
routes.get('/courses/:id/videos', instructorOrAdminMiddleware, async (c) => {
  try {
    const courseId = c.req.param('id');
    const limit = parseInt(c.req.query('limit') || '100');
    const offset = parseInt(c.req.query('offset') || '0');

    const result = await c.env.DB.prepare(
      'SELECT * FROM videos WHERE course_id = ? ORDER BY sort_order ASC LIMIT ? OFFSET ?'
    ).bind(courseId, limit, offset).all();

    // Get total count
    const countResult = await c.env.DB.prepare(
      'SELECT COUNT(*) as total FROM videos WHERE course_id = ?'
    ).bind(courseId).first<{ total: number }>();
    const total = countResult?.total || 0;

    const videos = result.results.map((r: any) => formatVideoRow(r));

    return c.json({ videos, total });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// PUT /courses/:id/videos/:videoId — Update video metadata
routes.put('/courses/:id/videos/:videoId', instructorOrAdminMiddleware, async (c) => {
  try {
    const courseId = c.req.param('id');
    const videoId = c.req.param('videoId');
    const body = await c.req.json();

    // Verify video belongs to this course
    const existing = await c.env.DB.prepare(
      'SELECT id FROM videos WHERE id = ? AND course_id = ?'
    ).bind(videoId, courseId).first();

    if (!existing) {
      return c.json({ error: 'Video not found in this course' }, 404);
    }

    const fieldMapping: Record<string, string> = {
      title: 'title',
      sort_order: 'sort_order',
      sortOrder: 'sort_order',
      is_preview: 'is_preview',
      isPreview: 'is_preview',
      is_published: 'is_published',
      isPublished: 'is_published',
      duration: 'duration',
      thumbnail_url: 'thumbnail_url',
      thumbnailUrl: 'thumbnail_url',
    };

    const setClauses: string[] = [];
    const params: unknown[] = [];

    for (const [bodyField, dbColumn] of Object.entries(fieldMapping)) {
      if (body[bodyField] !== undefined) {
        setClauses.push(`${dbColumn} = ?`);
        params.push(body[bodyField]);
      }
    }

    if (setClauses.length === 0) {
      return c.json({ error: 'No valid fields to update' }, 400);
    }

    setClauses.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(videoId);

    await c.env.DB.prepare(
      `UPDATE videos SET ${setClauses.join(', ')} WHERE id = ?`
    ).bind(...params).run();

    // Return updated video
    const updatedRow = await c.env.DB.prepare(
      'SELECT * FROM videos WHERE id = ?'
    ).bind(videoId).first();

    const video = formatVideoRow(updatedRow as Record<string, unknown>);

    return c.json({ success: true, video });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// ═══════════════════════════════════════════════════
// COURSE CRUD (create, update, delete)
// ═══════════════════════════════════════════════════

// POST /courses — Create a new course
routes.post('/courses', instructorOrAdminMiddleware, async (c) => {
  try {
    const { instructorId, error: idError } = getInstructorId(c);
    if (idError) return idError;

    const body = await c.req.json();
    const { title, description, level, language, price, technology_id, category_id, tags, semester, what_you_learn, subject_ids } = body;

    if (!title) {
      return c.json({ error: 'title is required' }, 400);
    }

    const courseId = generateId();
    const slug = slugify(title);
    const now = new Date().toISOString();

    // Create course
    await c.env.DB.prepare(`
      INSERT INTO courses (id, title, slug, description, instructor_id, technology_id, category_id, level, language, price, tags, semester, what_you_learn, is_published, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
    `).bind(
      courseId,
      title,
      slug,
      description || null,
      instructorId,
      technology_id || null,
      category_id || null,
      level || 'beginner',
      language || 'bangla',
      price || 0,
      tags || null,
      semester || null,
      what_you_learn || null,
      now,
      now
    ).run();

    // Create course_instructors junction entry
    try {
      await c.env.DB.prepare(`
        INSERT INTO course_instructors (course_id, instructor_id, sort_order, created_at)
        VALUES (?, ?, 0, ?)
      `).bind(courseId, instructorId, now).run();
    } catch {}

    // Link subjects if provided (subject_ids array)
    if (Array.isArray(subject_ids) && subject_ids.length > 0) {
      try {
        for (let i = 0; i < subject_ids.length; i++) {
          const subjectId = subject_ids[i];
          await c.env.DB.prepare(`
            INSERT OR IGNORE INTO course_subjects (course_id, subject_id, sort_order, created_at)
            VALUES (?, ?, ?, ?)
          `).bind(courseId, subjectId, i, now).run();
        }
      } catch {}
    }

    // Auto-create default course packages (single + friend)
    const packageName = title || 'Course';
    try {
      await c.env.DB.prepare(`
        INSERT INTO course_packages (course_id, package_type, display_name, description, price, duration_months, max_users, is_auto_assign, is_active, created_by, created_at, updated_at)
        VALUES (?, 'single', ?, 'Single user access', ?, 6, 1, 1, 1, ?, ?, ?)
      `).bind(courseId, `${packageName} - Single`, price || 0, instructorId, now, now).run();
    } catch {}
    try {
      await c.env.DB.prepare(`
        INSERT INTO course_packages (course_id, package_type, display_name, description, price, duration_months, max_users, is_auto_assign, is_active, created_by, created_at, updated_at)
        VALUES (?, 'friend', ?, 'Friend pack - 2 users', ?, 6, 2, 1, 1, ?, ?, ?)
      `).bind(courseId, `${packageName} - Friend Pack`, (price || 0) * 1.5, instructorId, now, now).run();
    } catch {}

    // Fetch and return the created course
    const row = await c.env.DB.prepare('SELECT * FROM courses WHERE id = ?').bind(courseId).first();
    const course = formatCourseRow(row as Record<string, unknown>);

    return c.json({ success: true, course }, 201);
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// PUT /courses/:id — Update own course
routes.put('/courses/:id', instructorOrAdminMiddleware, async (c) => {
  try {
    const courseId = c.req.param('id');
    const { instructorId, error: idError } = getInstructorId(c);
    if (idError) return idError;

    // Verify ownership
    const isOwner = await verifyCourseOwnership(c.env, courseId, instructorId);
    if (!isOwner) {
      return c.json({ error: 'You do not own this course or it does not exist' }, 403);
    }

    const body = await c.req.json();

    // If is_published changed to 1, validate that course has at least 1 video
    if (body.is_published === 1 || body.isPublished === 1) {
      try {
        const videoCount = await c.env.DB.prepare(
          'SELECT COUNT(*) as total FROM videos WHERE course_id = ?'
        ).bind(courseId).first<{ total: number }>();
        if (!videoCount || videoCount.total === 0) {
          return c.json({ error: 'Cannot publish course without at least 1 video' }, 400);
        }
      } catch {}
    }

    const fieldMapping: Record<string, string> = {
      title: 'title',
      description: 'description',
      level: 'level',
      language: 'language',
      price: 'price',
      technology_id: 'technology_id',
      technologyId: 'technology_id',
      category_id: 'category_id',
      categoryId: 'category_id',
      tags: 'tags',
      semester: 'semester',
      what_you_learn: 'what_you_learn',
      whatYouLearn: 'what_you_learn',
      is_published: 'is_published',
      isPublished: 'is_published',
      thumbnail_url: 'thumbnail_url',
      thumbnailUrl: 'thumbnail_url',
    };

    const setClauses: string[] = [];
    const params: unknown[] = [];

    for (const [bodyField, dbColumn] of Object.entries(fieldMapping)) {
      if (body[bodyField] !== undefined) {
        setClauses.push(`${dbColumn} = ?`);
        params.push(body[bodyField]);
      }
    }

    if (setClauses.length === 0) {
      return c.json({ error: 'No valid fields to update' }, 400);
    }

    // Always update updated_at
    setClauses.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(courseId);

    await c.env.DB.prepare(
      `UPDATE courses SET ${setClauses.join(', ')} WHERE id = ?`
    ).bind(...params).run();

    // Return updated course
    const updatedRow = await c.env.DB.prepare('SELECT * FROM courses WHERE id = ?').bind(courseId).first();
    const course = formatCourseRow(updatedRow as Record<string, unknown>);

    return c.json({ success: true, course });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// DELETE /courses/:id — Delete own draft course
routes.delete('/courses/:id', instructorOrAdminMiddleware, async (c) => {
  try {
    const courseId = c.req.param('id');
    const { instructorId, error: idError } = getInstructorId(c);
    if (idError) return idError;

    // Verify ownership
    const isOwner = await verifyCourseOwnership(c.env, courseId, instructorId);
    if (!isOwner) {
      return c.json({ error: 'You do not own this course or it does not exist' }, 403);
    }

    // Check if course is draft
    const course = await c.env.DB.prepare(
      'SELECT is_published FROM courses WHERE id = ?'
    ).bind(courseId).first<{ is_published: number }>();
    if (!course) {
      return c.json({ error: 'Course not found' }, 404);
    }
    if (course.is_published === 1) {
      return c.json({ error: 'Cannot delete a published course' }, 400);
    }

    // Check if course has enrollments
    try {
      const enrollCount = await c.env.DB.prepare(
        'SELECT COUNT(*) as total FROM enrollments WHERE course_id = ?'
      ).bind(courseId).first<{ total: number }>();
      if (enrollCount && enrollCount.total > 0) {
        return c.json({ error: 'Cannot delete course with existing enrollments' }, 400);
      }
    } catch {}

    // Delete related records
    const relatedTables = [
      'DELETE FROM videos WHERE course_id = ?',
      'DELETE FROM lessons WHERE course_id = ?',
      'DELETE FROM chapters WHERE course_id = ?',
      'DELETE FROM course_resources WHERE course_id = ?',
      'DELETE FROM course_instructors WHERE course_id = ?',
      'DELETE FROM course_categories WHERE course_id = ?',
      'DELETE FROM course_subjects WHERE course_id = ?',
      'DELETE FROM course_learning_points WHERE course_id = ?',
      'DELETE FROM course_packages WHERE course_id = ?',
    ];

    for (const sql of relatedTables) {
      try {
        await c.env.DB.prepare(sql).bind(courseId).run();
      } catch {}
    }

    // Delete the course itself
    await c.env.DB.prepare('DELETE FROM courses WHERE id = ?').bind(courseId).run();

    return c.json({ success: true, message: 'Course deleted successfully' });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// ═══════════════════════════════════════════════════
// COURSE CURRICULUM
// ═══════════════════════════════════════════════════

// GET /courses/:id/curriculum — Get full curriculum
routes.get('/courses/:id/curriculum', instructorOrAdminMiddleware, async (c) => {
  try {
    const courseId = c.req.param('id');
    const { instructorId, error: idError } = getInstructorId(c);
    if (idError) return idError;

    // Verify ownership
    const isOwner = await verifyCourseOwnership(c.env, courseId, instructorId);
    if (!isOwner) {
      return c.json({ error: 'You do not own this course or it does not exist' }, 403);
    }

    // Get course
    const courseRow = await c.env.DB.prepare('SELECT * FROM courses WHERE id = ?').bind(courseId).first();
    if (!courseRow) {
      return c.json({ error: 'Course not found' }, 404);
    }
    const course = formatCourseRow(courseRow as Record<string, unknown>);

    // Get chapters
    let chapters: any[] = [];
    try {
      const chapterResult = await c.env.DB.prepare(
        'SELECT * FROM chapters WHERE course_id = ? ORDER BY sort_order ASC'
      ).bind(courseId).all();
      chapters = chapterResult.results as any[];
    } catch {}

    // For each chapter, get its lessons
    const chaptersWithLessons = [];
    for (const chapter of chapters) {
      let lessons: any[] = [];
      try {
        const lessonResult = await c.env.DB.prepare(
          'SELECT * FROM lessons WHERE chapter_id = ? ORDER BY sort_order ASC'
        ).bind(chapter.id).all();
        lessons = lessonResult.results as any[];
      } catch {}
      chaptersWithLessons.push({
        ...chapter,
        $id: chapter.id,
        lessons,
      });
    }

    // Get course resources
    let resources: any[] = [];
    try {
      const resourceResult = await c.env.DB.prepare(
        'SELECT * FROM course_resources WHERE course_id = ? ORDER BY sort_order ASC'
      ).bind(courseId).all();
      resources = resourceResult.results as any[];
    } catch {}

    return c.json({
      success: true,
      course,
      chapters: chaptersWithLessons,
      resources,
    });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// ═══════════════════════════════════════════════════
// CHAPTERS (within courses/:id)
// ═══════════════════════════════════════════════════

// POST /courses/:id/chapters — Create chapter
routes.post('/courses/:id/chapters', instructorOrAdminMiddleware, async (c) => {
  try {
    const courseId = c.req.param('id');
    const { instructorId, error: idError } = getInstructorId(c);
    if (idError) return idError;

    // Verify ownership
    const isOwner = await verifyCourseOwnership(c.env, courseId, instructorId);
    if (!isOwner) {
      return c.json({ error: 'You do not own this course or it does not exist' }, 403);
    }

    const body = await c.req.json();
    const { title, subject_id, description, sort_order } = body;

    if (!title) {
      return c.json({ error: 'title is required' }, 400);
    }

    const chapterId = generateId();
    const slug = slugify(title);
    const now = new Date().toISOString();

    // Get max sort_order if not provided
    let sortOrder = sort_order;
    if (sortOrder === undefined || sortOrder === null) {
      try {
        const maxSort = await c.env.DB.prepare(
          'SELECT MAX(sort_order) as max_order FROM chapters WHERE course_id = ?'
        ).bind(courseId).first<{ max_order: number | null }>();
        sortOrder = (maxSort?.max_order ?? -1) + 1;
      } catch {
        sortOrder = 0;
      }
    }

    await c.env.DB.prepare(`
      INSERT INTO chapters (id, course_id, subject_id, title, slug, description, sort_order, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      chapterId,
      courseId,
      subject_id || null,
      title,
      slug,
      description || null,
      sortOrder,
      now,
      now
    ).run();

    const row = await c.env.DB.prepare('SELECT * FROM chapters WHERE id = ?').bind(chapterId).first();
    const chapter = { ...(row as Record<string, unknown>), $id: (row as any).id };

    return c.json({ success: true, chapter }, 201);
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// PUT /courses/:id/chapters/:chapterId — Update chapter
routes.put('/courses/:id/chapters/:chapterId', instructorOrAdminMiddleware, async (c) => {
  try {
    const courseId = c.req.param('id');
    const chapterId = c.req.param('chapterId');
    const { instructorId, error: idError } = getInstructorId(c);
    if (idError) return idError;

    // Verify ownership
    const isOwner = await verifyCourseOwnership(c.env, courseId, instructorId);
    if (!isOwner) {
      return c.json({ error: 'You do not own this course or it does not exist' }, 403);
    }

    // Verify chapter belongs to course
    const existingChapter = await c.env.DB.prepare(
      'SELECT id FROM chapters WHERE id = ? AND course_id = ?'
    ).bind(chapterId, courseId).first();
    if (!existingChapter) {
      return c.json({ error: 'Chapter not found in this course' }, 404);
    }

    const body = await c.req.json();
    const fieldMapping: Record<string, string> = {
      title: 'title',
      subject_id: 'subject_id',
      subjectId: 'subject_id',
      description: 'description',
      sort_order: 'sort_order',
      sortOrder: 'sort_order',
    };

    const setClauses: string[] = [];
    const params: unknown[] = [];

    for (const [bodyField, dbColumn] of Object.entries(fieldMapping)) {
      if (body[bodyField] !== undefined) {
        setClauses.push(`${dbColumn} = ?`);
        params.push(body[bodyField]);
      }
    }

    if (setClauses.length === 0) {
      return c.json({ error: 'No valid fields to update' }, 400);
    }

    setClauses.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(chapterId);

    await c.env.DB.prepare(
      `UPDATE chapters SET ${setClauses.join(', ')} WHERE id = ?`
    ).bind(...params).run();

    const updatedRow = await c.env.DB.prepare('SELECT * FROM chapters WHERE id = ?').bind(chapterId).first();
    const chapter = { ...(updatedRow as Record<string, unknown>), $id: (updatedRow as any).id };

    return c.json({ success: true, chapter });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// DELETE /courses/:id/chapters/:chapterId — Delete chapter
routes.delete('/courses/:id/chapters/:chapterId', instructorOrAdminMiddleware, async (c) => {
  try {
    const courseId = c.req.param('id');
    const chapterId = c.req.param('chapterId');
    const { instructorId, error: idError } = getInstructorId(c);
    if (idError) return idError;

    // Verify ownership
    const isOwner = await verifyCourseOwnership(c.env, courseId, instructorId);
    if (!isOwner) {
      return c.json({ error: 'You do not own this course or it does not exist' }, 403);
    }

    // Verify chapter belongs to course
    const existingChapter = await c.env.DB.prepare(
      'SELECT id FROM chapters WHERE id = ? AND course_id = ?'
    ).bind(chapterId, courseId).first();
    if (!existingChapter) {
      return c.json({ error: 'Chapter not found in this course' }, 404);
    }

    // Delete all lessons in this chapter
    try {
      await c.env.DB.prepare('DELETE FROM lessons WHERE chapter_id = ?').bind(chapterId).run();
    } catch {}

    // Delete the chapter
    await c.env.DB.prepare('DELETE FROM chapters WHERE id = ?').bind(chapterId).run();

    return c.json({ success: true, message: 'Chapter deleted successfully' });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// ═══════════════════════════════════════════════════
// LESSONS (within courses/:id)
// ═══════════════════════════════════════════════════

// POST /courses/:id/lessons — Create lesson
routes.post('/courses/:id/lessons', instructorOrAdminMiddleware, async (c) => {
  try {
    const courseId = c.req.param('id');
    const { instructorId, error: idError } = getInstructorId(c);
    if (idError) return idError;

    // Verify ownership
    const isOwner = await verifyCourseOwnership(c.env, courseId, instructorId);
    if (!isOwner) {
      return c.json({ error: 'You do not own this course or it does not exist' }, 403);
    }

    const body = await c.req.json();
    const { title, chapter_id, subject_id, description, lesson_type, sort_order, is_preview, duration, video_url, thumbnail_url, document_url } = body;

    if (!title || !chapter_id) {
      return c.json({ error: 'title and chapter_id are required' }, 400);
    }

    // Verify chapter belongs to this course
    const chapterCheck = await c.env.DB.prepare(
      'SELECT id, subject_id FROM chapters WHERE id = ? AND course_id = ?'
    ).bind(chapter_id, courseId).first<{ id: string; subject_id: string | null }>();
    if (!chapterCheck) {
      return c.json({ error: 'Chapter not found in this course' }, 404);
    }

    // Auto-inherit subject_id from chapter if not provided
    const finalSubjectId = subject_id || chapterCheck.subject_id || null;

    const lessonId = generateId();
    const slug = slugify(title);
    const now = new Date().toISOString();

    // Get max sort_order if not provided
    let sortOrder = sort_order;
    if (sortOrder === undefined || sortOrder === null) {
      try {
        const maxSort = await c.env.DB.prepare(
          'SELECT MAX(sort_order) as max_order FROM lessons WHERE chapter_id = ?'
        ).bind(chapter_id).first<{ max_order: number | null }>();
        sortOrder = (maxSort?.max_order ?? -1) + 1;
      } catch {
        sortOrder = 0;
      }
    }

    await c.env.DB.prepare(`
      INSERT INTO lessons (id, chapter_id, course_id, subject_id, title, slug, description, lesson_type, sort_order, is_preview, duration, video_url, thumbnail_url, document_url, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      lessonId,
      chapter_id,
      courseId,
      finalSubjectId,
      title,
      slug,
      description || null,
      lesson_type || 'video',
      sortOrder,
      is_preview || 0,
      duration || 0,
      video_url || null,
      thumbnail_url || null,
      document_url || null,
      now,
      now
    ).run();

    const row = await c.env.DB.prepare('SELECT * FROM lessons WHERE id = ?').bind(lessonId).first();
    const lesson = { ...(row as Record<string, unknown>), $id: (row as any).id };

    return c.json({ success: true, lesson }, 201);
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// PUT /courses/:id/lessons/:lessonId — Update lesson
routes.put('/courses/:id/lessons/:lessonId', instructorOrAdminMiddleware, async (c) => {
  try {
    const courseId = c.req.param('id');
    const lessonId = c.req.param('lessonId');
    const { instructorId, error: idError } = getInstructorId(c);
    if (idError) return idError;

    // Verify ownership
    const isOwner = await verifyCourseOwnership(c.env, courseId, instructorId);
    if (!isOwner) {
      return c.json({ error: 'You do not own this course or it does not exist' }, 403);
    }

    // Verify lesson belongs to course
    const existingLesson = await c.env.DB.prepare(
      'SELECT id FROM lessons WHERE id = ? AND course_id = ?'
    ).bind(lessonId, courseId).first();
    if (!existingLesson) {
      return c.json({ error: 'Lesson not found in this course' }, 404);
    }

    const body = await c.req.json();
    const fieldMapping: Record<string, string> = {
      title: 'title',
      chapter_id: 'chapter_id',
      chapterId: 'chapter_id',
      subject_id: 'subject_id',
      subjectId: 'subject_id',
      description: 'description',
      lesson_type: 'lesson_type',
      lessonType: 'lesson_type',
      sort_order: 'sort_order',
      sortOrder: 'sort_order',
      is_preview: 'is_preview',
      isPreview: 'is_preview',
      duration: 'duration',
      video_url: 'video_url',
      videoUrl: 'video_url',
      thumbnail_url: 'thumbnail_url',
      thumbnailUrl: 'thumbnail_url',
      document_url: 'document_url',
      documentUrl: 'document_url',
    };

    const setClauses: string[] = [];
    const params: unknown[] = [];

    for (const [bodyField, dbColumn] of Object.entries(fieldMapping)) {
      if (body[bodyField] !== undefined) {
        setClauses.push(`${dbColumn} = ?`);
        params.push(body[bodyField]);
      }
    }

    if (setClauses.length === 0) {
      return c.json({ error: 'No valid fields to update' }, 400);
    }

    setClauses.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(lessonId);

    await c.env.DB.prepare(
      `UPDATE lessons SET ${setClauses.join(', ')} WHERE id = ?`
    ).bind(...params).run();

    const updatedRow = await c.env.DB.prepare('SELECT * FROM lessons WHERE id = ?').bind(lessonId).first();
    const lesson = { ...(updatedRow as Record<string, unknown>), $id: (updatedRow as any).id };

    return c.json({ success: true, lesson });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// DELETE /courses/:id/lessons/:lessonId — Delete lesson
routes.delete('/courses/:id/lessons/:lessonId', instructorOrAdminMiddleware, async (c) => {
  try {
    const courseId = c.req.param('id');
    const lessonId = c.req.param('lessonId');
    const { instructorId, error: idError } = getInstructorId(c);
    if (idError) return idError;

    // Verify ownership
    const isOwner = await verifyCourseOwnership(c.env, courseId, instructorId);
    if (!isOwner) {
      return c.json({ error: 'You do not own this course or it does not exist' }, 403);
    }

    // Verify lesson belongs to course
    const existingLesson = await c.env.DB.prepare(
      'SELECT id FROM lessons WHERE id = ? AND course_id = ?'
    ).bind(lessonId, courseId).first();
    if (!existingLesson) {
      return c.json({ error: 'Lesson not found in this course' }, 404);
    }

    await c.env.DB.prepare('DELETE FROM lessons WHERE id = ?').bind(lessonId).run();

    return c.json({ success: true, message: 'Lesson deleted successfully' });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// ═══════════════════════════════════════════════════
// COURSE RESOURCES (within courses/:id)
// ═══════════════════════════════════════════════════

// GET /courses/:id/resources — List resources
routes.get('/courses/:id/resources', instructorOrAdminMiddleware, async (c) => {
  try {
    const courseId = c.req.param('id');
    const { instructorId, error: idError } = getInstructorId(c);
    if (idError) return idError;

    // Verify ownership
    const isOwner = await verifyCourseOwnership(c.env, courseId, instructorId);
    if (!isOwner) {
      return c.json({ error: 'You do not own this course or it does not exist' }, 403);
    }

    let resources: any[] = [];
    try {
      const result = await c.env.DB.prepare(
        'SELECT * FROM course_resources WHERE course_id = ? ORDER BY sort_order ASC'
      ).bind(courseId).all();
      resources = result.results as any[];
    } catch {}

    return c.json({ success: true, resources });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// POST /courses/:id/resources — Upload resource (FormData)
routes.post('/courses/:id/resources', instructorOrAdminMiddleware, async (c) => {
  try {
    const courseId = c.req.param('id');
    const { instructorId, error: idError } = getInstructorId(c);
    if (idError) return idError;

    // Verify ownership
    const isOwner = await verifyCourseOwnership(c.env, courseId, instructorId);
    if (!isOwner) {
      return c.json({ error: 'You do not own this course or it does not exist' }, 403);
    }

    const formData = await c.req.formData();
    const title = formData.get('title') as string;
    const description = formData.get('description') as string | null;
    const file_type = (formData.get('file_type') as string) || 'pdf';
    const chapter_id = (formData.get('chapter_id') as string) || null;
    const lesson_id = (formData.get('lesson_id') as string) || null;

    if (!title) {
      return c.json({ error: 'title is required' }, 400);
    }

    // Get file from form data
    const fileEntry = formData.get('file');
    if (!fileEntry || typeof fileEntry === 'string') {
      return c.json({ error: 'No file provided' }, 400);
    }
    const file = fileEntry as unknown as Blob & { name?: string; type?: string };

    // Upload to R2_RESOURCES bucket
    const key = `course-resources/${courseId}/${Date.now()}-${file.name || 'resource'}`;
    const arrayBuffer = await file.arrayBuffer();
    await c.env.R2_RESOURCES.put(key, arrayBuffer, {
      httpMetadata: { contentType: file.type || 'application/octet-stream' },
    });

    const fileUrl = await getPublicUrl(c.env, 'resources', key);

    // Save record to course_resources table
    const resourceId = generateId();
    const now = new Date().toISOString();

    await c.env.DB.prepare(`
      INSERT INTO course_resources (id, course_id, chapter_id, lesson_id, title, description, file_url, file_type, file_size, sort_order, uploaded_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)
    `).bind(
      resourceId,
      courseId,
      chapter_id,
      lesson_id,
      title,
      description || null,
      fileUrl,
      file_type,
      file.size || 0,
      instructorId,
      now,
      now
    ).run();

    const row = await c.env.DB.prepare('SELECT * FROM course_resources WHERE id = ?').bind(resourceId).first();
    const resource = { ...(row as Record<string, unknown>), $id: (row as any).id };

    return c.json({ success: true, resource }, 201);
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// DELETE /courses/:id/resources/:resourceId — Delete resource
routes.delete('/courses/:id/resources/:resourceId', instructorOrAdminMiddleware, async (c) => {
  try {
    const courseId = c.req.param('id');
    const resourceId = c.req.param('resourceId');
    const { instructorId, error: idError } = getInstructorId(c);
    if (idError) return idError;

    // Verify ownership
    const isOwner = await verifyCourseOwnership(c.env, courseId, instructorId);
    if (!isOwner) {
      return c.json({ error: 'You do not own this course or it does not exist' }, 403);
    }

    // Verify resource belongs to course
    const existingResource = await c.env.DB.prepare(
      'SELECT id, file_url FROM course_resources WHERE id = ? AND course_id = ?'
    ).bind(resourceId, courseId).first<{ id: string; file_url: string }>();
    if (!existingResource) {
      return c.json({ error: 'Resource not found in this course' }, 404);
    }

    // Delete from R2_RESOURCES
    try {
      const fileUrl = existingResource.file_url;
      if (fileUrl) {
        // Extract the key from the full URL
        const urlParts = fileUrl.match(/\.r2\.dev\/(.+)$/);
        if (urlParts?.[1]) {
          await c.env.R2_RESOURCES.delete(urlParts[1]);
        }
      }
    } catch {}

    // Delete from course_resources table
    await c.env.DB.prepare('DELETE FROM course_resources WHERE id = ?').bind(resourceId).run();

    return c.json({ success: true, message: 'Resource deleted successfully' });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// ═══════════════════════════════════════════════════
// CHAPTERS CRUD (alternate routes via courses/:courseId/chapters)
// ═══════════════════════════════════════════════════

// GET /courses/:courseId/chapters — List chapters for a course
routes.get('/courses/:courseId/chapters', instructorOrAdminMiddleware, async (c) => {
  try {
    const courseId = c.req.param('courseId');

    const result = await c.env.DB.prepare(
      'SELECT * FROM chapters WHERE course_id = ? ORDER BY sort_order ASC'
    ).bind(courseId).all();

    return c.json({ success: true, chapters: result.results });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// POST /courses/:courseId/chapters — Create chapter (verify ownership)
routes.post('/courses/:courseId/chapters', instructorOrAdminMiddleware, async (c) => {
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

    const body = await c.req.json();
    const { title, slug, description, subject_id, sort_order } = body;

    if (!title) {
      return c.json({ error: 'title is required' }, 400);
    }

    const chapterId = generateId();
    const chapterSlug = slug || slugify(title);
    const now = new Date().toISOString();

    await c.env.DB.prepare(`
      INSERT INTO chapters (id, course_id, subject_id, title, slug, description, sort_order, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `).bind(
      chapterId, courseId, subject_id || null, title, chapterSlug,
      description || null, sort_order || 0, now, now
    ).run();

    const row = await c.env.DB.prepare('SELECT * FROM chapters WHERE id = ?').bind(chapterId).first();

    return c.json({ success: true, chapter: row }, 201);
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// PUT /chapters/:id — Update chapter (verify the chapter's course_id belongs to instructor)
routes.put('/chapters/:id', instructorOrAdminMiddleware, async (c) => {
  try {
    const authRole = c.get('authRole');
    const instructorId = authRole === 'admin' ? c.req.query('instructorId')! : c.get('instructorId');
    const chapterId = c.req.param('id');

    if (!instructorId) {
      return c.json({ error: 'instructorId is required' }, 400);
    }

    // Get chapter to find its course_id
    const existing = await c.env.DB.prepare(
      'SELECT course_id FROM chapters WHERE id = ?'
    ).bind(chapterId).first<{ course_id: string }>();

    if (!existing) {
      return c.json({ error: 'Chapter not found' }, 404);
    }

    // Verify ownership of the course
    const owns = await verifyCourseOwnership(c.env, existing.course_id, instructorId);
    if (!owns) {
      return c.json({ error: 'You do not own this course' }, 403);
    }

    const body = await c.req.json();

    const fieldMapping: Record<string, string> = {
      title: 'title',
      slug: 'slug',
      description: 'description',
      subject_id: 'subject_id',
      subjectId: 'subject_id',
      sort_order: 'sort_order',
      sortOrder: 'sort_order',
      is_active: 'is_active',
      isActive: 'is_active',
    };

    const setClauses: string[] = [];
    const params: unknown[] = [];

    for (const [bodyField, dbColumn] of Object.entries(fieldMapping)) {
      if (body[bodyField] !== undefined) {
        setClauses.push(`${dbColumn} = ?`);
        params.push(body[bodyField]);
      }
    }

    if (setClauses.length === 0) {
      return c.json({ error: 'No valid fields to update' }, 400);
    }

    setClauses.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(chapterId);

    await c.env.DB.prepare(
      `UPDATE chapters SET ${setClauses.join(', ')} WHERE id = ?`
    ).bind(...params).run();

    const row = await c.env.DB.prepare('SELECT * FROM chapters WHERE id = ?').bind(chapterId).first();

    return c.json({ success: true, chapter: row });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// DELETE /chapters/:id — Delete chapter (verify ownership)
routes.delete('/chapters/:id', instructorOrAdminMiddleware, async (c) => {
  try {
    const authRole = c.get('authRole');
    const instructorId = authRole === 'admin' ? c.req.query('instructorId')! : c.get('instructorId');
    const chapterId = c.req.param('id');

    if (!instructorId) {
      return c.json({ error: 'instructorId is required' }, 400);
    }

    // Get chapter to find its course_id
    const existing = await c.env.DB.prepare(
      'SELECT course_id FROM chapters WHERE id = ?'
    ).bind(chapterId).first<{ course_id: string }>();

    if (!existing) {
      return c.json({ error: 'Chapter not found' }, 404);
    }

    // Verify ownership of the course
    const owns = await verifyCourseOwnership(c.env, existing.course_id, instructorId);
    if (!owns) {
      return c.json({ error: 'You do not own this course' }, 403);
    }

    await c.env.DB.prepare('DELETE FROM chapters WHERE id = ?').bind(chapterId).run();

    return c.json({ success: true, message: 'Chapter deleted' });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// ═══════════════════════════════════════════════════
// LESSONS CRUD (alternate routes via courses/:courseId/lessons)
// ═══════════════════════════════════════════════════

// GET /courses/:courseId/lessons — List lessons for a course
routes.get('/courses/:courseId/lessons', instructorOrAdminMiddleware, async (c) => {
  try {
    const courseId = c.req.param('courseId');

    const result = await c.env.DB.prepare(
      'SELECT * FROM lessons WHERE course_id = ? ORDER BY sort_order ASC'
    ).bind(courseId).all();

    return c.json({ success: true, lessons: result.results });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// POST /courses/:courseId/lessons — Create lesson (verify course ownership)
routes.post('/courses/:courseId/lessons', instructorOrAdminMiddleware, async (c) => {
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

    const body = await c.req.json();
    const { title, chapter_id, slug, description, lesson_type, sort_order, is_preview, video_url, thumbnail_url, document_url } = body;

    if (!title) {
      return c.json({ error: 'title is required' }, 400);
    }

    const lessonId = generateId();
    const lessonSlug = slug || slugify(title);
    const now = new Date().toISOString();

    await c.env.DB.prepare(`
      INSERT INTO lessons (id, chapter_id, course_id, subject_id, title, slug, description, lesson_type, sort_order, is_preview, is_active, duration, video_url, thumbnail_url, document_url, created_at, updated_at)
      VALUES (?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, 1, 0, ?, ?, ?, ?, ?)
    `).bind(
      lessonId, chapter_id || null, courseId, title, lessonSlug,
      description || null, lesson_type || 'video', sort_order || 0,
      is_preview ? 1 : 0, video_url || null, thumbnail_url || null,
      document_url || null, now, now
    ).run();

    const row = await c.env.DB.prepare('SELECT * FROM lessons WHERE id = ?').bind(lessonId).first();

    return c.json({ success: true, lesson: row }, 201);
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// PUT /lessons/:id — Update lesson (verify the lesson's course_id belongs to instructor)
routes.put('/lessons/:id', instructorOrAdminMiddleware, async (c) => {
  try {
    const authRole = c.get('authRole');
    const instructorId = authRole === 'admin' ? c.req.query('instructorId')! : c.get('instructorId');
    const lessonId = c.req.param('id');

    if (!instructorId) {
      return c.json({ error: 'instructorId is required' }, 400);
    }

    // Get lesson to find its course_id
    const existing = await c.env.DB.prepare(
      'SELECT course_id FROM lessons WHERE id = ?'
    ).bind(lessonId).first<{ course_id: string }>();

    if (!existing) {
      return c.json({ error: 'Lesson not found' }, 404);
    }

    // Verify ownership of the course
    const owns = await verifyCourseOwnership(c.env, existing.course_id, instructorId);
    if (!owns) {
      return c.json({ error: 'You do not own this course' }, 403);
    }

    const body = await c.req.json();

    const fieldMapping: Record<string, string> = {
      title: 'title',
      slug: 'slug',
      description: 'description',
      chapter_id: 'chapter_id',
      chapterId: 'chapter_id',
      lesson_type: 'lesson_type',
      lessonType: 'lesson_type',
      sort_order: 'sort_order',
      sortOrder: 'sort_order',
      is_preview: 'is_preview',
      isPreview: 'is_preview',
      is_active: 'is_active',
      isActive: 'is_active',
      duration: 'duration',
      video_url: 'video_url',
      videoUrl: 'video_url',
      thumbnail_url: 'thumbnail_url',
      thumbnailUrl: 'thumbnail_url',
      document_url: 'document_url',
      documentUrl: 'document_url',
    };

    const setClauses: string[] = [];
    const params: unknown[] = [];

    for (const [bodyField, dbColumn] of Object.entries(fieldMapping)) {
      if (body[bodyField] !== undefined) {
        setClauses.push(`${dbColumn} = ?`);
        params.push(body[bodyField]);
      }
    }

    if (setClauses.length === 0) {
      return c.json({ error: 'No valid fields to update' }, 400);
    }

    setClauses.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(lessonId);

    await c.env.DB.prepare(
      `UPDATE lessons SET ${setClauses.join(', ')} WHERE id = ?`
    ).bind(...params).run();

    const row = await c.env.DB.prepare('SELECT * FROM lessons WHERE id = ?').bind(lessonId).first();

    return c.json({ success: true, lesson: row });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// DELETE /lessons/:id — Delete lesson (verify ownership)
routes.delete('/lessons/:id', instructorOrAdminMiddleware, async (c) => {
  try {
    const authRole = c.get('authRole');
    const instructorId = authRole === 'admin' ? c.req.query('instructorId')! : c.get('instructorId');
    const lessonId = c.req.param('id');

    if (!instructorId) {
      return c.json({ error: 'instructorId is required' }, 400);
    }

    // Get lesson to find its course_id
    const existing = await c.env.DB.prepare(
      'SELECT course_id FROM lessons WHERE id = ?'
    ).bind(lessonId).first<{ course_id: string }>();

    if (!existing) {
      return c.json({ error: 'Lesson not found' }, 404);
    }

    // Verify ownership of the course
    const owns = await verifyCourseOwnership(c.env, existing.course_id, instructorId);
    if (!owns) {
      return c.json({ error: 'You do not own this course' }, 403);
    }

    await c.env.DB.prepare('DELETE FROM lessons WHERE id = ?').bind(lessonId).run();

    return c.json({ success: true, message: 'Lesson deleted' });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// ═══════════════════════════════════════════════════
// VIDEO CREATE & DELETE (alternate routes)
// ═══════════════════════════════════════════════════

// POST /courses/:courseId/videos — Create video (verify ownership)
routes.post('/courses/:courseId/videos', instructorOrAdminMiddleware, async (c) => {
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

    const body = await c.req.json();
    const { title, video_url, slug, duration, sort_order, is_preview, is_published, thumbnail_url, lesson_id, lesson_type } = body;

    if (!title || !video_url) {
      return c.json({ error: 'title and video_url are required' }, 400);
    }

    const videoId = generateId();
    const videoSlug = slug || slugify(title);
    const now = new Date().toISOString();

    await c.env.DB.prepare(`
      INSERT INTO videos (id, course_id, title, slug, video_url, thumbnail_url, duration, sort_order, is_preview, is_published, lesson_id, lesson_type, chapter_id, subject_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?)
    `).bind(
      videoId, courseId, title, videoSlug, video_url,
      thumbnail_url || null, duration || 0, sort_order || 0,
      is_preview ? 1 : 0, is_published ? 1 : 0,
      lesson_id || null, lesson_type || null, now, now
    ).run();

    const row = await c.env.DB.prepare('SELECT * FROM videos WHERE id = ?').bind(videoId).first();
    const video = formatVideoRow(row as Record<string, unknown>);

    return c.json({ success: true, video }, 201);
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// DELETE /videos/:id — Delete video (verify the video's course_id belongs to instructor)
routes.delete('/videos/:id', instructorOrAdminMiddleware, async (c) => {
  try {
    const authRole = c.get('authRole');
    const instructorId = authRole === 'admin' ? c.req.query('instructorId')! : c.get('instructorId');
    const videoId = c.req.param('id');

    if (!instructorId) {
      return c.json({ error: 'instructorId is required' }, 400);
    }

    // Get video to find its course_id
    const existing = await c.env.DB.prepare(
      'SELECT course_id FROM videos WHERE id = ?'
    ).bind(videoId).first<{ course_id: string }>();

    if (!existing) {
      return c.json({ error: 'Video not found' }, 404);
    }

    // Verify ownership of the course
    const owns = await verifyCourseOwnership(c.env, existing.course_id, instructorId);
    if (!owns) {
      return c.json({ error: 'You do not own this course' }, 403);
    }

    await c.env.DB.prepare('DELETE FROM videos WHERE id = ?').bind(videoId).run();

    return c.json({ success: true, message: 'Video deleted' });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// GET /instructors/search — Search all active instructors by name/email
routes.get('/instructors/search', instructorOrAdminMiddleware, async (c) => {
  try {
    const q = c.req.query('q') || '';
    const limit = parseInt(c.req.query('limit') || '20');
    const offset = parseInt(c.req.query('offset') || '0');

    let where = 'WHERE is_active = 1';
    const params: unknown[] = [];

    if (q) {
      where += ' AND (name LIKE ? OR email LIKE ?)';
      params.push(`%${q}%`, `%${q}%`);
    }

    const countResult = await c.env.DB.prepare(
      `SELECT COUNT(*) as total FROM instructors ${where}`
    ).bind(...params).first();
    const total = (countResult as any)?.total || 0;

    const result = await c.env.DB.prepare(
      `SELECT id, name, email, avatar_url, specialization, is_active FROM instructors ${where} ORDER BY name ASC LIMIT ? OFFSET ?`
    ).bind(...params, limit, offset).all();

    const instructors = result.results.map((r: any) => formatInstructorRow(r));

    return c.json({ instructors, total });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// GET /instructors/list — Default list of active instructors (for when no search query)
routes.get('/instructors/list', instructorOrAdminMiddleware, async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '20');
    const offset = parseInt(c.req.query('offset') || '0');

    const countResult = await c.env.DB.prepare(
      'SELECT COUNT(*) as total FROM instructors WHERE is_active = 1'
    ).first();
    const total = (countResult as any)?.total || 0;

    const result = await c.env.DB.prepare(
      'SELECT id, name, email, avatar_url, specialization, is_active FROM instructors WHERE is_active = 1 ORDER BY name ASC LIMIT ? OFFSET ?'
    ).bind(limit, offset).all();

    const instructors = result.results.map((r: any) => formatInstructorRow(r));

    return c.json({ instructors, total });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// GET /videos/search — Search instructor's uploaded videos by title
routes.get('/videos/search', instructorOrAdminMiddleware, async (c) => {
  try {
    const authRole = c.get('authRole');
    let instructorId: string;
    if (authRole === 'admin') {
      instructorId = c.req.query('instructorId') || '';
    } else {
      instructorId = c.get('instructorId');
    }
    if (!instructorId) {
      return c.json({ error: 'Instructor ID required' }, 401);
    }

    const q = c.req.query('q') || '';
    const courseId = c.req.query('courseId') || '';
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '20');
    const offset = (page - 1) * limit;

    // Build query to search videos in courses owned by this instructor
    let where = `WHERE v.course_id IN (SELECT id FROM courses WHERE instructor_id = ? UNION SELECT course_id FROM course_instructors WHERE instructor_id = ?)`;
    const params: unknown[] = [instructorId, instructorId];

    if (q) {
      where += ' AND v.title LIKE ?';
      params.push(`%${q}%`);
    }

    if (courseId) {
      where += ' AND v.course_id = ?';
      params.push(courseId);
    }

    const countResult = await c.env.DB.prepare(
      `SELECT COUNT(*) as total FROM videos v ${where}`
    ).bind(...params).first();
    const total = (countResult as any)?.total || 0;

    const result = await c.env.DB.prepare(
      `SELECT v.* FROM videos v ${where} ORDER BY v.created_at DESC LIMIT ? OFFSET ?`
    ).bind(...params, limit, offset).all();

    const videos = result.results.map((r: any) => formatVideoRow(r));

    return c.json({ videos, total });
  } catch (error) {
    const message = getErrorMessage(error);
    return c.json({ error: message }, 500);
  }
});

// ═══════════════════════════════════════════════════
// RESOURCES CRUD (alternate routes via courses/:courseId/resources)
// ═══════════════════════════════════════════════════

// GET /courses/:courseId/resources — List resources for a course
routes.get('/courses/:courseId/resources', instructorOrAdminMiddleware, async (c) => {
  try {
    const courseId = c.req.param('courseId');

    const result = await c.env.DB.prepare(
      'SELECT * FROM course_resources WHERE course_id = ? ORDER BY sort_order ASC'
    ).bind(courseId).all();

    return c.json({ success: true, resources: result.results });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// POST /courses/:courseId/resources — Create resource (verify ownership)
routes.post('/courses/:courseId/resources', instructorOrAdminMiddleware, async (c) => {
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

    const body = await c.req.json();
    const { title, description, file_url, file_type, file_size, chapter_id, lesson_id, is_downloadable, sort_order } = body;

    if (!title || !file_url) {
      return c.json({ error: 'title and file_url are required' }, 400);
    }

    const resourceId = generateId();
    const now = new Date().toISOString();

    await c.env.DB.prepare(`
      INSERT INTO course_resources (id, course_id, chapter_id, lesson_id, title, description, file_url, file_type, file_size, is_downloadable, sort_order, uploaded_by, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      resourceId, courseId, chapter_id || null, lesson_id || null,
      title, description || null, file_url, file_type || null,
      file_size || null, is_downloadable ? 1 : 0, sort_order || 0,
      instructorId, now, now
    ).run();

    const row = await c.env.DB.prepare('SELECT * FROM course_resources WHERE id = ?').bind(resourceId).first();

    return c.json({ success: true, resource: row }, 201);
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// PUT /resources/:id — Update resource (verify the resource's course_id belongs to instructor)
routes.put('/resources/:id', instructorOrAdminMiddleware, async (c) => {
  try {
    const authRole = c.get('authRole');
    const instructorId = authRole === 'admin' ? c.req.query('instructorId')! : c.get('instructorId');
    const resourceId = c.req.param('id');

    if (!instructorId) {
      return c.json({ error: 'instructorId is required' }, 400);
    }

    // Get resource to find its course_id
    const existing = await c.env.DB.prepare(
      'SELECT course_id FROM course_resources WHERE id = ?'
    ).bind(resourceId).first<{ course_id: string }>();

    if (!existing) {
      return c.json({ error: 'Resource not found' }, 404);
    }

    // Verify ownership of the course
    const owns = await verifyCourseOwnership(c.env, existing.course_id, instructorId);
    if (!owns) {
      return c.json({ error: 'You do not own this course' }, 403);
    }

    const body = await c.req.json();

    const fieldMapping: Record<string, string> = {
      title: 'title',
      description: 'description',
      file_url: 'file_url',
      fileUrl: 'file_url',
      file_type: 'file_type',
      fileType: 'file_type',
      file_size: 'file_size',
      fileSize: 'file_size',
      chapter_id: 'chapter_id',
      chapterId: 'chapter_id',
      lesson_id: 'lesson_id',
      lessonId: 'lesson_id',
      is_downloadable: 'is_downloadable',
      isDownloadable: 'is_downloadable',
      sort_order: 'sort_order',
      sortOrder: 'sort_order',
    };

    const setClauses: string[] = [];
    const params: unknown[] = [];

    for (const [bodyField, dbColumn] of Object.entries(fieldMapping)) {
      if (body[bodyField] !== undefined) {
        setClauses.push(`${dbColumn} = ?`);
        params.push(body[bodyField]);
      }
    }

    if (setClauses.length === 0) {
      return c.json({ error: 'No valid fields to update' }, 400);
    }

    setClauses.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(resourceId);

    await c.env.DB.prepare(
      `UPDATE course_resources SET ${setClauses.join(', ')} WHERE id = ?`
    ).bind(...params).run();

    const row = await c.env.DB.prepare('SELECT * FROM course_resources WHERE id = ?').bind(resourceId).first();

    return c.json({ success: true, resource: row });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// DELETE /resources/:id — Delete resource (verify ownership)
routes.delete('/resources/:id', instructorOrAdminMiddleware, async (c) => {
  try {
    const authRole = c.get('authRole');
    const instructorId = authRole === 'admin' ? c.req.query('instructorId')! : c.get('instructorId');
    const resourceId = c.req.param('id');

    if (!instructorId) {
      return c.json({ error: 'instructorId is required' }, 400);
    }

    // Get resource to find its course_id
    const existing = await c.env.DB.prepare(
      'SELECT course_id FROM course_resources WHERE id = ?'
    ).bind(resourceId).first<{ course_id: string }>();

    if (!existing) {
      return c.json({ error: 'Resource not found' }, 404);
    }

    // Verify ownership of the course
    const owns = await verifyCourseOwnership(c.env, existing.course_id, instructorId);
    if (!owns) {
      return c.json({ error: 'You do not own this course' }, 403);
    }

    await c.env.DB.prepare('DELETE FROM course_resources WHERE id = ?').bind(resourceId).run();

    return c.json({ success: true, message: 'Resource deleted' });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// ═══════════════════════════════════════════════════
// TECHNOLOGIES & SUBJECTS (read-only for instructor)
// ═══════════════════════════════════════════════════

// GET /technologies — List all technologies (for course creation dropdowns)
routes.get('/technologies', instructorOrAdminMiddleware, async (c) => {
  try {
    const result = await c.env.DB.prepare(
      'SELECT * FROM technologies ORDER BY name ASC'
    ).all();
    return c.json({ success: true, technologies: result.results });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// GET /subjects — List subjects (optionally filter by technology_id, supports junction table)
routes.get('/subjects', instructorOrAdminMiddleware, async (c) => {
  try {
    const technologyId = c.req.query('technology_id');
    const search = c.req.query('search') || '';

    let query = 'SELECT DISTINCT s.* FROM subjects s';
    const params: unknown[] = [];
    const conditions: string[] = [];

    if (technologyId) {
      // Also search in subject_technologies junction table
      query += ' LEFT JOIN subject_technologies st ON s.id = st.subject_id';
      conditions.push('(s.technology_id = ? OR st.technology_id = ?)');
      params.push(parseInt(technologyId), parseInt(technologyId));
    }

    if (search) {
      conditions.push('s.name LIKE ?');
      params.push(`%${search}%`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY s.sort_order ASC, s.name ASC';

    const result = await c.env.DB.prepare(query).bind(...params).all();

    // Enrich with technology_ids and technology_names from junction table
    const subjectsWithTech = await Promise.all((result.results as any[]).map(async (subject) => {
      try {
        const techResult = await c.env.DB.prepare(
          `SELECT st.technology_id, t.name as technology_name FROM subject_technologies st
           JOIN technologies t ON st.technology_id = t.id
           WHERE st.subject_id = ?`
        ).bind(String(subject.id)).all();
        return {
          ...subject,
          technology_ids: techResult.results.map((r: any) => r.technology_id),
          technology_names: techResult.results.map((r: any) => r.technology_name),
        };
      } catch {
        return subject;
      }
    }));

    return c.json({ success: true, subjects: subjectsWithTech });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// GET /courses/:id/subjects — Get subjects assigned to a course
routes.get('/courses/:id/subjects', instructorOrAdminMiddleware, async (c) => {
  try {
    const courseId = c.req.param('id');
    const { instructorId, error: idError } = getInstructorId(c);
    if (idError) return idError;

    const owns = await verifyCourseOwnership(c.env, courseId, instructorId);
    if (!owns) {
      return c.json({ error: 'You do not own this course' }, 403);
    }

    let subjects: any[] = [];
    try {
      const result = await c.env.DB.prepare(`
        SELECT cs.*, s.name as subject_name, s.slug as subject_slug, s.technology_id
        FROM course_subjects cs
        LEFT JOIN subjects s ON cs.subject_id = s.id
        WHERE cs.course_id = ?
        ORDER BY cs.sort_order ASC
      `).bind(courseId).all();
      subjects = result.results as any[];
    } catch {}

    return c.json({ success: true, subjects });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// POST /courses/:id/subjects — Add subject to course
routes.post('/courses/:id/subjects', instructorOrAdminMiddleware, async (c) => {
  try {
    const courseId = c.req.param('id');
    const { instructorId, error: idError } = getInstructorId(c);
    if (idError) return idError;

    const owns = await verifyCourseOwnership(c.env, courseId, instructorId);
    if (!owns) {
      return c.json({ error: 'You do not own this course' }, 403);
    }

    const body = await c.req.json();
    const { subject_id, sort_order } = body;

    if (!subject_id) {
      return c.json({ error: 'subject_id is required' }, 400);
    }

    const now = new Date().toISOString();

    try {
      await c.env.DB.prepare(`
        INSERT INTO course_subjects (course_id, subject_id, sort_order, created_at)
        VALUES (?, ?, ?, ?)
      `).bind(courseId, subject_id, sort_order || 0, now).run();
    } catch (err: any) {
      if (err?.message?.includes('UNIQUE') || err?.message?.includes('duplicate')) {
        return c.json({ error: 'Subject already added to this course' }, 400);
      }
    }

    return c.json({ success: true, message: 'Subject added to course' }, 201);
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// DELETE /courses/:id/subjects/:subjectId — Remove subject from course
routes.delete('/courses/:id/subjects/:subjectId', instructorOrAdminMiddleware, async (c) => {
  try {
    const courseId = c.req.param('id');
    const subjectId = c.req.param('subjectId');
    const { instructorId, error: idError } = getInstructorId(c);
    if (idError) return idError;

    const owns = await verifyCourseOwnership(c.env, courseId, instructorId);
    if (!owns) {
      return c.json({ error: 'You do not own this course' }, 403);
    }

    await c.env.DB.prepare(
      'DELETE FROM course_subjects WHERE course_id = ? AND subject_id = ?'
    ).bind(courseId, subjectId).run();

    return c.json({ success: true, message: 'Subject removed from course' });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// GET /courses/:id/instructors — Get instructors assigned to a course
routes.get('/courses/:id/instructors', instructorOrAdminMiddleware, async (c) => {
  try {
    const courseId = c.req.param('id');

    // Get course owner
    const course = await c.env.DB.prepare(
      'SELECT instructor_id FROM courses WHERE id = ?'
    ).bind(courseId).first<{ instructor_id: string }>();

    const instructors: any[] = [];

    // Add course owner
    if (course?.instructor_id) {
      try {
        const ownerRow = await c.env.DB.prepare(
          'SELECT id, name, email, avatar_url, specialization FROM instructors WHERE id = ?'
        ).bind(course.instructor_id).first();
        if (ownerRow) {
          instructors.push({
            ...formatInstructorRow(ownerRow as Record<string, unknown>),
            isOwner: true,
            subjects: [],
          });
        }
      } catch {}
    }

    // Get co-instructors from junction table
    try {
      const junctionResult = await c.env.DB.prepare(
        'SELECT instructor_id, subject_ids FROM course_instructors WHERE course_id = ?'
      ).bind(courseId).all();

      for (const row of junctionResult.results as any[]) {
        if (row.instructor_id === course?.instructor_id) continue; // Skip owner (already added)
        try {
          const instRow = await c.env.DB.prepare(
            'SELECT id, name, email, avatar_url, specialization FROM instructors WHERE id = ?'
          ).bind(row.instructor_id).first();
          if (instRow) {
            // Parse subject_ids and get subject names
            let subjects: any[] = [];
            try {
              const subjectIds = typeof row.subject_ids === 'string' ? JSON.parse(row.subject_ids) : (row.subject_ids || []);
              if (Array.isArray(subjectIds) && subjectIds.length > 0) {
                const subjectResults = await c.env.DB.prepare(
                  `SELECT id, name FROM subjects WHERE id IN (${subjectIds.map(() => '?').join(',')})`
                ).bind(...subjectIds).all();
                subjects = subjectResults.results.map((s: any) => ({
                  subjectId: s.id,
                  subjectName: s.name,
                }));
              }
            } catch {}
            
            instructors.push({
              ...formatInstructorRow(instRow as Record<string, unknown>),
              isOwner: false,
              subjects,
            });
          }
        } catch {}
      }
    } catch {}

    return c.json({ success: true, instructors });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// POST /courses/:id/instructors — Add instructor to course
routes.post('/courses/:id/instructors', instructorOrAdminMiddleware, async (c) => {
  try {
    const courseId = c.req.param('id');
    const { instructorId, error: idError } = getInstructorId(c);
    if (idError) return idError;

    const owns = await verifyCourseOwnership(c.env, courseId, instructorId);
    if (!owns) {
      return c.json({ error: 'You do not own this course' }, 403);
    }

    const body = await c.req.json();
    const { instructor_id, subject_ids } = body;

    if (!instructor_id) {
      return c.json({ error: 'instructor_id is required' }, 400);
    }

    const now = new Date().toISOString();

    try {
      await c.env.DB.prepare(`
        INSERT INTO course_instructors (course_id, instructor_id, subject_ids, sort_order, created_at)
        VALUES (?, ?, ?, 0, ?)
      `).bind(courseId, instructor_id, JSON.stringify(subject_ids || []), now).run();
    } catch (err: any) {
      if (err?.message?.includes('UNIQUE') || err?.message?.includes('duplicate')) {
        return c.json({ error: 'Instructor already added to this course' }, 400);
      }
    }

    return c.json({ success: true, message: 'Instructor added to course' }, 201);
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// DELETE /courses/:id/instructors/:instructorId — Remove instructor from course
routes.delete('/courses/:id/instructors/:instructorId', instructorOrAdminMiddleware, async (c) => {
  try {
    const courseId = c.req.param('id');
    const instructorIdParam = c.req.param('instructorId');
    const { instructorId, error: idError } = getInstructorId(c);
    if (idError) return idError;

    const owns = await verifyCourseOwnership(c.env, courseId, instructorId);
    if (!owns) {
      return c.json({ error: 'You do not own this course' }, 403);
    }

    await c.env.DB.prepare(
      'DELETE FROM course_instructors WHERE course_id = ? AND instructor_id = ?'
    ).bind(courseId, instructorIdParam).run();

    return c.json({ success: true, message: 'Instructor removed from course' });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

export default routes;
