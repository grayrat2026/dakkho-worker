/**
 * Student Public Routes
 * Config, payment config, course catalog, course-packages, instructor list,
 * institute/technology lists, events, live-classes, users/lookup, packages/mine
 */

import { Hono } from 'hono';
import type { Env } from '../../env';
import type { ServerConfig } from '../../lib/types';
import {
  getStudentAuth,
  getInstituteName,
  getPublicUrl,
  transformConfigForStudent,
  DEFAULT_CONFIG,
  getErrorMessage,
  type StudentAuthVariables,
} from './helpers';

const routes = new Hono<{ Bindings: Env; Variables: StudentAuthVariables }>();

// ─── Helper: Transform R2 keys to public URLs ───
function toPublicUrl(env: Env, url: string | null | undefined, bucket: string = 'images'): string {
  if (!url) return '';
  // Already a full URL (http/https) — return as-is
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  // R2 key — convert to public URL
  return getPublicUrl(env, bucket, url);
}

// ─── Config ───

// GET /config — Get server config for student app (public)
routes.get('/config', async (c) => {
  try {
    const cachedConfig = await c.env.KV_CONFIG.get('server_config', 'json');
    if (cachedConfig) {
      const config = cachedConfig as ServerConfig;
      return c.json({ config: transformConfigForStudent(config) });
    }

    const { results } = await c.env.DB.prepare(
      'SELECT key, value FROM app_config'
    ).all<{ key: string; value: string }>();

    const configMap: Record<string, unknown> = {};
    for (const row of results) {
      try {
        configMap[row.key] = JSON.parse(row.value);
      } catch {
        configMap[row.key] = row.value;
      }
    }

    const config: ServerConfig = {
      featureToggles: { ...DEFAULT_CONFIG.featureToggles, ...(configMap.featureToggles as Partial<ServerConfig['featureToggles']>) },
      homePageSections: (configMap.homePageSections as ServerConfig['homePageSections']) || DEFAULT_CONFIG.homePageSections,
      sidebarVisibility: { ...DEFAULT_CONFIG.sidebarVisibility, ...(configMap.sidebarVisibility as Partial<ServerConfig['sidebarVisibility']>) },
      bottomNavTabs: (configMap.bottomNavTabs as ServerConfig['bottomNavTabs']) || DEFAULT_CONFIG.bottomNavTabs,
      topBarElements: { ...DEFAULT_CONFIG.topBarElements, ...(configMap.topBarElements as Partial<ServerConfig['topBarElements']>) },
      cardStyle: (configMap.cardStyle as ServerConfig['cardStyle']) || DEFAULT_CONFIG.cardStyle,
      contentProtection: { ...DEFAULT_CONFIG.contentProtection, ...(configMap.contentProtection as Partial<ServerConfig['contentProtection']>) },
    };

    await c.env.KV_CONFIG.put('server_config', JSON.stringify(config), { expirationTtl: 300 });

    return c.json({ config: transformConfigForStudent(config) });
  } catch (error) {
    return c.json({ config: transformConfigForStudent(DEFAULT_CONFIG) });
  }
});

// GET /config/payment — Get active payment gateway config (public)
routes.get('/config/payment', async (c) => {
  try {
    const result = await c.env.DB.prepare(
      'SELECT id, gateway, is_active, instructions, instructions_bn, sandbox_mode FROM payment_config WHERE is_active = 1'
    ).all();

    return c.json({ paymentConfig: result.results });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// ─── Institutes ───

routes.get('/institutes', async (c) => {
  try {
    const division = c.req.query('division');
    const search = c.req.query('search');
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '50');
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM institutes WHERE is_active = 1';
    let countQuery = 'SELECT COUNT(*) as total FROM institutes WHERE is_active = 1';
    const params: any[] = [];

    if (division) {
      query += ' AND division = ?';
      countQuery += ' AND division = ?';
      params.push(division);
    }

    if (search) {
      query += ' AND (name LIKE ? OR name_bn LIKE ?)';
      countQuery += ' AND (name LIKE ? OR name_bn LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY is_requested ASC, name ASC LIMIT ? OFFSET ?';

    const countResult = await c.env.DB.prepare(countQuery).bind(...params).first();
    const total = (countResult as any)?.total || 0;

    const result = await c.env.DB.prepare(query).bind(...params, limit, offset).all();

    return c.json({ institutes: result.results, total });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

routes.get('/institutes/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const result = await c.env.DB.prepare(
      'SELECT * FROM institutes WHERE id = ? AND is_active = 1'
    ).bind(id).first();

    if (!result) {
      return c.json({ error: 'Institute not found' }, 404);
    }

    return c.json({ institute: result });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// ─── Technologies ───

routes.get('/technologies', async (c) => {
  try {
    const result = await c.env.DB.prepare(
      'SELECT * FROM technologies WHERE is_active = 1 ORDER BY name ASC'
    ).all();

    return c.json({ technologies: result.results });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// ─── Events ───

routes.get('/events', async (c) => {
  try {
    const result = await c.env.DB.prepare(
      "SELECT * FROM events WHERE is_active = 1 AND end_date >= date('now') ORDER BY start_date ASC"
    ).all();

    return c.json({ events: result.results });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// ─── Live Classes ───

routes.get('/live-classes', async (c) => {
  try {
    const result = await c.env.DB.prepare(
      "SELECT * FROM live_class_schedules WHERE is_active = 1 AND status IN ('scheduled', 'live') ORDER BY scheduled_at ASC"
    ).all();

    return c.json({ liveClasses: result.results });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// ─── Course Packages ───

routes.get('/course-packages', async (c) => {
  try {
    const courseId = c.req.query('courseId');
    if (!courseId) {
      return c.json({ error: 'courseId required' }, 400);
    }

    // Get course price
    const course = await c.env.DB.prepare(
      'SELECT id, price FROM courses WHERE id = ? AND is_published = 1'
    ).bind(courseId).first<{ id: string; price: number }>();

    if (!course) {
      return c.json({ packages: [] });
    }

    let result = await c.env.DB.prepare(
      'SELECT * FROM course_packages WHERE course_id = ? AND is_active = 1 ORDER BY price ASC'
    ).bind(courseId).all();

    // Auto-generate Single & Duo packages if missing (always show both for paid courses)
    if (course.price > 0) {
      const existingTypes = new Set((result.results as any[]).map((p: any) => p.package_type));
      let needsRefetch = false;

      // Ensure Single package exists
      if (!existingTypes.has('single')) {
        await c.env.DB.prepare(`
          INSERT INTO course_packages (course_id, package_type, price, duration_months, max_users, is_auto_assign, is_active, display_name, description)
          VALUES (?, 'single', ?, 6, 1, 1, 1, 'Single', '1 জন ইউজারের জন্য')
        `).bind(courseId, course.price).run();
        needsRefetch = true;
      }

      // Ensure Duo package exists (original price + 15% extra)
      if (!existingTypes.has('dual')) {
        const duoPrice = Math.round(course.price * 1.15);
        await c.env.DB.prepare(`
          INSERT INTO course_packages (course_id, package_type, price, duration_months, max_users, is_auto_assign, is_active, display_name, description)
          VALUES (?, 'dual', ?, 6, 2, 1, 1, 'Duo', '2 জন ইউজারের জন্য — বন্ধুকে শেয়ার করুন!')
        `).bind(courseId, duoPrice).run();
        needsRefetch = true;
      }

      // Re-fetch after auto-generation
      if (needsRefetch) {
        result = await c.env.DB.prepare(
          'SELECT * FROM course_packages WHERE course_id = ? AND is_active = 1 AND package_type IN ("single", "dual") ORDER BY price ASC'
        ).bind(courseId).all();
      }
    }

    // Filter to only show Single and Duo packages (hide any other types)
    const filteredPackages = (result.results as any[]).filter((p: any) => p.package_type === 'single' || p.package_type === 'dual');

    return c.json({ packages: filteredPackages });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// GET /packages/mine — Get current user's purchased packages
routes.get('/packages/mine', async (c) => {
  try {
    const auth = await getStudentAuth(c);
    if (!auth.authorized) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const result = await c.env.DB.prepare(`
      SELECT up.*, cp.package_type, cp.price, cp.duration_months, cp.course_id, cp.max_users,
             c.title as course_title, c.thumbnail_url as course_thumbnail
      FROM user_packages up
      JOIN course_packages cp ON up.package_id = cp.id
      LEFT JOIN courses c ON cp.course_id = c.id
      WHERE up.user_id = ?
      ORDER BY up.activated_at DESC
    `).bind(auth.userId).all();

    return c.json({ packages: result.results });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// GET /users/lookup?email=... — Look up a user by email (for duo member)
routes.get('/users/lookup', async (c) => {
  try {
    const email = c.req.query('email');
    if (!email) {
      return c.json({ error: 'email query parameter required' }, 400);
    }

    const user = await c.env.DB.prepare(
      'SELECT id, full_name, email, institute_id, technology, avatar_url FROM users WHERE email = ? AND is_active = 1'
    ).bind(email).first();

    if (!user) {
      return c.json({ found: false, user: null });
    }

    const u = user as any;
    const instituteName = await getInstituteName(c.env, u.institute_id || null);

    return c.json({
      found: true,
      user: {
        id: u.id,
        name: u.full_name,
        email: u.email,
        technology: u.technology || null,
        instituteName: instituteName || null,
        avatarUrl: u.avatar_url || null,
      },
    });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// ─── Courses (from D1 — public catalog) ───

routes.get('/courses', async (c) => {
  try {
    const technology = c.req.query('technology') || '';
    const limit = parseInt(c.req.query('limit') || '20');
    const offset = parseInt(c.req.query('offset') || '0');
    const search = c.req.query('search') || '';
    const level = c.req.query('level') || '';

    let where = 'WHERE is_published = 1';
    const params: unknown[] = [];

    if (technology) {
      where += ' AND technology_id = ?';
      params.push(technology);
    }
    if (search) {
      where += ' AND title LIKE ?';
      params.push(`%${search}%`);
    }
    if (level) {
      where += ' AND level = ?';
      params.push(level);
    }

    const countResult = await c.env.DB.prepare(
      `SELECT COUNT(*) as total FROM courses ${where}`
    ).bind(...params).first();
    const total = (countResult as any)?.total || 0;

    const result = await c.env.DB.prepare(
      `SELECT * FROM courses ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
    ).bind(...params, limit, offset).all();

    // Enrich courses with auto-calculated duration from videos
    const enrichedCourses = await Promise.all(result.results.map(async (course: any) => {
      try {
        const vidStats = await c.env.DB.prepare(
          'SELECT COUNT(*) as count, COALESCE(SUM(duration), 0) as total_duration FROM videos WHERE course_id = ?'
        ).bind(course.id).first();
        const vc = (vidStats as any)?.count || 0;
        const td = (vidStats as any)?.total_duration || 0;
        const avg = vc > 0 ? Math.round(td / vc * 10) / 10 : 0;
        return {
          ...course,
          duration: avg,
          total_videos: vc,
          total_video_duration: td,
          thumbnail_url: toPublicUrl(c.env, course.thumbnail_url, 'images'),
        };
      } catch {
        return {
          ...course,
          thumbnail_url: toPublicUrl(c.env, course.thumbnail_url, 'images'),
        };
      }
    }));

    return c.json({ courses: enrichedCourses, total });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// ─── Instructors (from D1 — public) ───

routes.get('/instructors', async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '20');
    const offset = parseInt(c.req.query('offset') || '0');
    const search = c.req.query('search') || '';

    let where = 'WHERE is_active = 1';
    const params: unknown[] = [];

    if (search) {
      where += ' AND name LIKE ?';
      params.push(`%${search}%`);
    }

    const countResult = await c.env.DB.prepare(
      `SELECT COUNT(*) as total FROM instructors ${where}`
    ).bind(...params).first();
    const total = (countResult as any)?.total || 0;

    const result = await c.env.DB.prepare(
      `SELECT * FROM instructors ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
    ).bind(...params, limit, offset).all();

    // Transform avatar_url and cover_url to public URLs
    const enrichedInstructors = (result.results as any[]).map((inst: any) => ({
      ...inst,
      avatar_url: toPublicUrl(c.env, inst.avatar_url, 'images'),
      cover_url: toPublicUrl(c.env, inst.cover_url, 'images'),
    }));

    return c.json({ instructors: enrichedInstructors, total });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

routes.get('/instructors/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const instructor = await c.env.DB.prepare(
      'SELECT * FROM instructors WHERE id = ? AND is_active = 1'
    ).bind(id).first();

    if (!instructor) {
      return c.json({ error: 'Instructor not found' }, 404);
    }

    const inst = instructor as any;

    // Compute totalCourses from courses table (both as owner and via course_instructors junction)
    let totalCourses = 0;
    try {
      const courseCount = await c.env.DB.prepare(`
        SELECT COUNT(DISTINCT c.id) as total 
        FROM courses c 
        LEFT JOIN course_instructors ci ON c.id = ci.course_id AND ci.instructor_id = ?
        WHERE (c.instructor_id = ? OR ci.instructor_id = ?) AND c.is_published = 1
      `).bind(id, id, id).first<{ total: number }>();
      totalCourses = courseCount?.total || 0;
    } catch {}

    // Compute totalStudents from enrollments for this instructor's courses
    let totalStudents = 0;
    try {
      const studentCount = await c.env.DB.prepare(`
        SELECT COUNT(DISTINCT e.user_id) as total
        FROM enrollments e
        JOIN courses c ON e.course_id = c.id
        WHERE c.instructor_id = ?
      `).bind(id).first<{ total: number }>();
      totalStudents = studentCount?.total || 0;
    } catch {}

    // Compute rating from course_ratings or default to instructor's rating
    const rating = inst.rating || 0;

    // Get cover URL
    const coverUrl = toPublicUrl(c.env, inst.cover_url || inst.coverUrl, 'images');
    const avatarUrl = toPublicUrl(c.env, inst.avatar_url || inst.avatarUrl, 'images');

    return c.json({
      instructor: {
        ...inst,
        totalCourses,
        totalStudents,
        rating,
        coverUrl,
        avatarUrl,
      }
    });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// GET /instructors/:id/courses — List courses by instructor
routes.get('/instructors/:id/courses', async (c) => {
  try {
    const instructorId = c.req.param('id');
    const limit = parseInt(c.req.query('limit') || '20');
    const offset = parseInt(c.req.query('offset') || '0');

    // Verify instructor exists and is active
    const instructor = await c.env.DB.prepare(
      'SELECT id FROM instructors WHERE id = ? AND is_active = 1'
    ).bind(instructorId).first();

    if (!instructor) {
      return c.json({ error: 'Instructor not found' }, 404);
    }

    // Get courses where instructor is either owner or assigned via course_instructors
    const result = await c.env.DB.prepare(`
      SELECT DISTINCT c.* FROM courses c
      LEFT JOIN course_instructors ci ON c.id = ci.course_id AND ci.instructor_id = ?
      WHERE (c.instructor_id = ? OR ci.instructor_id = ?) AND c.is_published = 1
      ORDER BY c.created_at DESC LIMIT ? OFFSET ?
    `).bind(instructorId, instructorId, instructorId, limit, offset).all();

    const countResult = await c.env.DB.prepare(`
      SELECT COUNT(DISTINCT c.id) as total FROM courses c
      LEFT JOIN course_instructors ci ON c.id = ci.course_id AND ci.instructor_id = ?
      WHERE (c.instructor_id = ? OR ci.instructor_id = ?) AND c.is_published = 1
    `).bind(instructorId, instructorId, instructorId).first();
    const total = (countResult as any)?.total || 0;

    return c.json({ courses: result.results, total });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// ─── Exam Tips ───

// GET /exam-tips — Get exam tips from app_config (admin-editable)
routes.get('/exam-tips', async (c) => {
  try {
    // Try KV cache first
    const cached = await c.env.KV_CONFIG.get('exam_tips', 'json');
    if (cached) {
      return c.json({ tips: cached });
    }

    // Try D1 app_config table
    const row = await c.env.DB.prepare(
      "SELECT value FROM app_config WHERE key = 'exam_tips'"
    ).first<{ value: string }>();

    if (row?.value) {
      try {
        const tips = JSON.parse(row.value);
        // Cache in KV for 5 minutes
        await c.env.KV_CONFIG.put('exam_tips', row.value, { expirationTtl: 300 });
        return c.json({ tips });
      } catch {
        // Invalid JSON, fall through to defaults
      }
    }

    // Return default tips if none configured
    const defaultTips = {
      strategies: [
        { title: 'Active Recall Method', description: 'Instead of re-reading notes, close your book and try to recall the key concepts from memory. This strengthens neural connections and improves long-term retention.', tip: 'Try this: After each chapter, write down everything you remember without looking. Then check what you missed.' },
        { title: 'Spaced Repetition', description: 'Review material at increasing intervals (1 day, 3 days, 7 days, 14 days). This technique leverages the spacing effect for optimal memory retention.', tip: 'Use DAKKHO\'s built-in review reminders to schedule your spaced repetition sessions automatically.' },
        { title: 'Pomodoro Technique', description: 'Study in focused 25-minute blocks followed by 5-minute breaks. After 4 blocks, take a longer 15-30 minute break. This maintains concentration and prevents burnout.', tip: 'Set a timer on your phone. During the 25 minutes, eliminate all distractions — no phone, no social media.' },
        { title: 'Feynman Technique', description: 'Explain the concept in simple terms as if teaching someone else. If you can\'t explain it simply, you don\'t understand it well enough.', tip: 'Try recording yourself explaining a topic. Listen back and notice where you hesitate or get confused.' },
        { title: 'Practice Testing', description: 'Take practice exams under realistic conditions. This not only tests your knowledge but also reduces exam anxiety by making the actual exam feel familiar.', tip: 'Use DAKKHO\'s Practice Mode with timed sessions. Aim to complete practice tests faster than the actual time limit.' },
      ],
      timeManagement: [
        { title: 'Create a Study Schedule', desc: 'Plan your study sessions at least 2 weeks before the exam. Allocate more time to difficult subjects.', priority: 'High' },
        { title: 'Use the 80/20 Rule', desc: 'Focus 80% of your time on the 20% of topics most likely to appear on the exam. Analyze past papers to identify patterns.', priority: 'High' },
        { title: 'Set Daily Goals', desc: 'Break down your syllabus into daily chunks. Complete each day\'s target before moving on.', priority: 'Medium' },
        { title: 'Prioritize Weak Areas', desc: 'Start study sessions with your weakest topics when your mind is fresh.', priority: 'High' },
        { title: 'Review Before Sleep', desc: 'Study the most important material right before going to sleep. Your brain consolidates memories during sleep.', priority: 'Low' },
      ],
      commonMistakes: [
        { mistake: 'Cramming the night before', consequence: 'Information overload leads to confusion and anxiety.', fix: 'Start early and review regularly using spaced repetition.' },
        { mistake: 'Skipping practice problems', consequence: 'You may struggle to apply concepts under time pressure.', fix: 'Solve at least 10 practice problems for each topic.' },
        { mistake: 'Not reading questions carefully', consequence: 'Misunderstanding a question can cost you marks.', fix: 'Read each question twice. Underline key terms.' },
        { mistake: 'Not managing exam time', consequence: 'Spending too long on difficult questions means easier ones go unanswered.', fix: 'Allocate time per question. Skip difficult ones and return later.' },
      ],
      wellness: [
        { title: 'Sleep Well', desc: 'Aim for 7-8 hours of quality sleep. Avoid screens 30 minutes before bed.', time: 'Night' },
        { title: 'Stay Hydrated', desc: 'Drink at least 8 glasses of water daily. Dehydration impairs concentration by up to 30%.', time: 'All Day' },
        { title: 'Take Regular Breaks', desc: 'Follow the 50/10 rule: 50 minutes of study, 10 minutes of break.', time: 'Study Time' },
        { title: 'Practice Mindfulness', desc: '5 minutes of deep breathing or meditation before studying can significantly improve focus.', time: 'Before Study' },
      ],
    };
    return c.json({ tips: defaultTips });
  } catch (error) {
    return c.json({ tips: { strategies: [], timeManagement: [], commonMistakes: [], wellness: [] } });
  }
});

// ─── AI-Powered Search ───

interface SearchCourseResult {
  id: string;
  title: string;
  description: string | null;
  technology_id: string | null;
  instructor_id: string | null;
  level: string | null;
  thumbnail_url: string | null;
  tags: string | null;
}

interface SearchInstructorResult {
  id: string;
  name: string;
  bio: string | null;
  specialization: string | null;
  avatar_url: string | null;
}

interface SearchVideoResult {
  id: string;
  title: string;
  description: string | null;
  course_id: string | null;
  duration: number | null;
  sort_order: number | null;
  course_title: string | null;
}

/**
 * Core search logic shared by GET /search and POST /ai-search.
 * Searches courses, instructors, and videos with case-insensitive LIKE matching.
 * If Workers AI binding is available, uses it to re-rank results by relevance.
 */
async function performSearch(c: any, query: string) {
  const searchTerm = `%${query}%`;
  const limit = 10;

  // Run all three searches in parallel
  const [coursesResult, instructorsResult, videosResult] = await Promise.all([
    c.env.DB.prepare(
      `SELECT id, title, description, technology_id, instructor_id, level, thumbnail_url, tags
       FROM courses
       WHERE is_published = 1
         AND (title LIKE ? OR description LIKE ? OR tags LIKE ?)
       LIMIT ?`
    ).bind(searchTerm, searchTerm, searchTerm, limit).all() as { results: SearchCourseResult[] },

    c.env.DB.prepare(
      `SELECT id, name, bio, specialization, avatar_url
       FROM instructors
       WHERE is_active = 1
         AND (name LIKE ? OR specialization LIKE ? OR bio LIKE ?)
       LIMIT ?`
    ).bind(searchTerm, searchTerm, searchTerm, limit).all() as { results: SearchInstructorResult[] },

    c.env.DB.prepare(
      `SELECT v.id, v.title, v.description, v.course_id, v.duration, v.sort_order,
              c.title AS course_title
       FROM videos v
       LEFT JOIN courses c ON v.course_id = c.id
       WHERE c.is_published = 1
         AND (v.title LIKE ? OR v.description LIKE ?)
       LIMIT ?`
    ).bind(searchTerm, searchTerm, limit).all() as { results: SearchVideoResult[] },
  ]);

  let courses = coursesResult.results;
  let instructors = instructorsResult.results;
  let videos = videosResult.results;

  // If Workers AI binding is available, use it to re-rank results by relevance
  if (c.env.AI && (courses.length + instructors.length + videos.length) > 0) {
    try {
      const aiRanked = await aiReRank(c, query, courses, instructors, videos);
      courses = aiRanked.courses;
      instructors = aiRanked.instructors;
      videos = aiRanked.videos;
    } catch {
      // AI ranking failed — fall back to SQL order (already good enough)
    }
  }

  return {
    query,
    courses,
    instructors,
    videos,
    total: courses.length + instructors.length + videos.length,
    aiEnhanced: !!c.env.AI,
  };
}

/**
 * Use Workers AI to re-rank search results by semantic relevance.
 * Sends a prompt asking the model to score each result and returns sorted arrays.
 */
async function aiReRank(
  c: any,
  query: string,
  courses: SearchCourseResult[],
  instructors: SearchInstructorResult[],
  videos: SearchVideoResult[]
): Promise<{ courses: SearchCourseResult[]; instructors: SearchInstructorResult[]; videos: SearchVideoResult[] }> {
  const buildList = (items: { id: string; title?: string; name?: string; description?: string | null }[]) =>
    items.map((item, i) => `${i + 1}. [id:${item.id}] ${item.title || item.name} — ${(item.description || '').slice(0, 100)}`).join('\n');

  const prompt = `You are a search relevance ranker. Given the search query "${query}", assign a relevance score (0-100) to each result.

COURSES:
${buildList(courses.map(c => ({ id: c.id, title: c.title, description: c.description })))}

INSTRUCTORS:
${buildList(instructors.map(i => ({ id: i.id, name: i.name, description: i.specialization || i.bio })))}

VIDEOS:
${buildList(videos.map(v => ({ id: v.id, title: v.title, description: v.description })))}

Respond ONLY with a JSON object like:
{"courses":[{"id":"...","score":90}],"instructors":[{"id":"...","score":80}],"videos":[{"id":"...","score":70}]}`;

  const aiResponse = await c.env.AI.run('@cf/meta/llama-3-8b-instruct', {
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 512,
  });

  const text = (aiResponse as any)?.response || '';
  // Extract JSON from the response (may be wrapped in markdown code blocks)
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('AI did not return valid JSON');

  const scores = JSON.parse(jsonMatch[0]);

  const sortByScore = <T extends { id: string }>(items: T[], scoreList: { id: string; score: number }[]): T[] => {
    const scoreMap = new Map(scoreList.map(s => [s.id, s.score]));
    return [...items].sort((a, b) => (scoreMap.get(b.id) || 0) - (scoreMap.get(a.id) || 0));
  };

  return {
    courses: scores.courses ? sortByScore(courses, scores.courses) : courses,
    instructors: scores.instructors ? sortByScore(instructors, scores.instructors) : instructors,
    videos: scores.videos ? sortByScore(videos, scores.videos) : videos,
  };
}

// POST /ai-search — AI-enhanced search (body: { "query": "search term" })
routes.post('/ai-search', async (c) => {
  try {
    const body = await c.req.json<{ query?: string }>();
    const query = (body.query || '').trim();

    if (!query) {
      return c.json({ error: 'Search query is required. Send { "query": "search term" }' }, 400);
    }

    const results = await performSearch(c, query);
    return c.json(results);
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// GET /search?q=term — Convenience GET endpoint for search
routes.get('/search', async (c) => {
  try {
    const query = (c.req.query('q') || '').trim();

    if (!query) {
      return c.json({ error: 'Search query is required. Use ?q=search+term' }, 400);
    }

    const results = await performSearch(c, query);
    return c.json(results);
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

export default routes;
