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
  transformConfigForStudent,
  DEFAULT_CONFIG,
  getErrorMessage,
  type StudentAuthVariables,
} from './helpers';

const routes = new Hono<{ Bindings: Env; Variables: StudentAuthVariables }>();

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
        return { ...course, duration: avg, total_videos: vc, total_video_duration: td };
      } catch {
        return course;
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

    return c.json({ instructors: result.results, total });
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

    return c.json({ instructor });
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

    const result = await c.env.DB.prepare(
      'SELECT * FROM courses WHERE instructor_id = ? AND is_published = 1 ORDER BY created_at DESC LIMIT ? OFFSET ?'
    ).bind(instructorId, limit, offset).all();

    const countResult = await c.env.DB.prepare(
      'SELECT COUNT(*) as total FROM courses WHERE instructor_id = ? AND is_published = 1'
    ).bind(instructorId).first();
    const total = (countResult as any)?.total || 0;

    return c.json({ courses: result.results, total });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

export default routes;
