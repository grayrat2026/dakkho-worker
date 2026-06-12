/**
 * Student-facing API routes
 * D1-only: All Appwrite dependencies removed
 * Public: config, institutes, technologies, events, course catalog, instructors
 * Auth: signup, login, logout, me, verify-otp, forgot-password
 * Authenticated: institute requests, push tokens, packages, payments
 */

import { Hono } from 'hono';
import type { Env } from '../env';
import { validateStudentSession, createStudentSession, deleteStudentSession } from '../lib/student-auth';
import { studentAuthMiddleware, type StudentAuthVariables } from '../lib/student-auth-middleware';
import { registerPushToken, unregisterPushToken } from '../lib/onesignal';
import { DEFAULT_CONFIG, type ServerConfig } from '../lib/types';
import { getBucketForType, getPublicUrl } from '../lib/r2';
import { getErrorMessage, generateId, getSessionExpiry } from '../lib/utils';
import { hashPassword, verifyPassword } from '../lib/auth-password';
import { getLiveKitConfig, generateLiveKitToken } from '../lib/livekit';

const studentApiRoutes = new Hono<{ Bindings: Env; Variables: StudentAuthVariables }>();

// ─── Helper: Get student auth from header ───
async function getStudentAuth(c: any): Promise<{ authorized: boolean; userId?: string; email?: string; name?: string; emailVerified?: boolean }> {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { authorized: false };
  }
  const token = authHeader.substring(7);
  const result = await validateStudentSession(c.env, token);
  return result;
}

// ─── Helper: Get student user from D1 ───
async function getStudentUserDoc(env: Env, userId: string): Promise<Record<string, unknown> | null> {
  try {
    const user = await env.DB.prepare(
      'SELECT * FROM users WHERE id = ?'
    ).bind(userId).first();
    return user as Record<string, unknown> | null;
  } catch {
    return null;
  }
}

// ─── Helper: Look up institute name by ID ───
async function getInstituteName(env: Env, instituteId: number | null): Promise<string | null> {
  if (!instituteId) return null;
  try {
    const inst = await env.DB.prepare(
      'SELECT name FROM institutes WHERE id = ?'
    ).bind(instituteId).first<{ name: string }>();
    return inst?.name || null;
  } catch {
    return null;
  }
}

// ─── Helper: Look up technology name by short_code ───
async function getTechnologyName(env: Env, shortCode: string | null): Promise<string | null> {
  if (!shortCode) return null;
  try {
    const tech = await env.DB.prepare(
      'SELECT name FROM technologies WHERE short_code = ?'
    ).bind(shortCode).first<{ name: string }>();
    return tech?.name || null;
  } catch {
    return null;
  }
}

// ─── Helper: Transform Worker ServerConfig → Student-friendly format ───
function transformConfigForStudent(config: ServerConfig) {
  return {
    contentProtection: config.contentProtection,
    features: config.featureToggles,
    ui: {
      homeSections: config.homePageSections.sections,
      sidebarSections: config.sidebarVisibility,
      bottomNavTabs: config.bottomNavTabs.tabs
        .filter((t) => t.enabled)
        .sort((a, b) => a.order - b.order)
        .map((t) => t.id),
      topBarElements: config.topBarElements,
      cardStyle: config.cardStyle,
    },
  };
}

// ═══════════════════════════════════════════════════
// PUBLIC ROUTES (no auth required)
// ═══════════════════════════════════════════════════

// ─── Config ───

// GET /config — Get server config for student app (public)
studentApiRoutes.get('/config', async (c) => {
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
studentApiRoutes.get('/config/payment', async (c) => {
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

studentApiRoutes.get('/institutes', async (c) => {
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

studentApiRoutes.get('/institutes/:id', async (c) => {
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

studentApiRoutes.get('/technologies', async (c) => {
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

studentApiRoutes.get('/events', async (c) => {
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

studentApiRoutes.get('/live-classes', async (c) => {
  try {
    const result = await c.env.DB.prepare(
      "SELECT * FROM live_class_schedules WHERE is_active = 1 AND status IN ('scheduled', 'live') ORDER BY scheduled_at ASC"
    ).all();

    return c.json({ liveClasses: result.results });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// GET /live-classes/:id/livekit-token — Generate a LiveKit token for a student to join a class
studentApiRoutes.get('/live-classes/:id/livekit-token', studentAuthMiddleware, async (c) => {
  try {
    const studentId = c.get('studentId');
    const scheduleId = c.req.param('id');

    // Find the schedule
    const schedule = await c.env.DB.prepare(
      'SELECT * FROM live_class_schedules WHERE id = ? AND is_active = 1'
    ).bind(scheduleId).first();

    if (!schedule) {
      return c.json({ error: 'Live class not found' }, 404);
    }

    const s = schedule as any;
    if (s.platform !== 'livekit' && !s.meeting_url?.startsWith('livekit://')) {
      return c.json({ error: 'This class does not use LiveKit', externalUrl: s.meeting_url }, 400);
    }

    if (s.status === 'completed' || s.status === 'cancelled') {
      return c.json({ error: 'This class has ended' }, 400);
    }

    // Verify student is enrolled in the course
    if (s.course_id) {
      const enrollment = await c.env.DB.prepare(
        'SELECT id FROM enrollments WHERE student_id = ? AND course_id = ? AND status = ?'
      ).bind(studentId, s.course_id, 'active').first();

      if (!enrollment) {
        return c.json({ error: 'You must be enrolled in this course to join the live class' }, 403);
      }
    }

    const config = await getLiveKitConfig(c.env.KV_CONFIG);
    if (!config) {
      return c.json({ error: 'LiveKit is not configured' }, 503);
    }

    // Extract room name from meeting_url
    const roomName = s.meeting_url?.replace('livekit://', '') || `dakkho-class-${s.id}`;

    // Get student name for display
    const student = await c.env.DB.prepare(
      'SELECT name FROM students WHERE id = ?'
    ).bind(studentId).first();
    const studentName = (student as any)?.name || 'Student';

    const token = await generateLiveKitToken({
      apiKey: config.apiKey,
      apiSecret: config.apiSecret,
      identity: `student-${studentId}`,
      name: studentName,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
      canAdmin: false, // Students are not room admins
      ttl: 6 * 60 * 60,
    });

    return c.json({
      success: true,
      token,
      url: config.url,
      room: roomName,
    });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// ─── Live Class Calls Fallback ───

// GET /live-classes/:id/calls-session — Cloudflare Calls fallback for students
studentApiRoutes.get('/live-classes/:id/calls-session', studentAuthMiddleware, async (c) => {
  try {
    const studentId = c.get('studentId');
    const scheduleId = c.req.param('id');

    const schedule = await c.env.DB.prepare(
      'SELECT * FROM live_class_schedules WHERE id = ? AND is_active = 1'
    ).bind(scheduleId).first();

    if (!schedule) {
      return c.json({ error: 'Live class not found' }, 404);
    }

    const s = schedule as any;
    if (s.status === 'completed' || s.status === 'cancelled') {
      return c.json({ error: 'This class has ended' }, 400);
    }

    // Verify enrollment
    if (s.course_id) {
      const enrollment = await c.env.DB.prepare(
        'SELECT id FROM enrollments WHERE student_id = ? AND course_id = ? AND status = ?'
      ).bind(studentId, s.course_id, 'active').first();
      if (!enrollment) {
        return c.json({ error: 'You must be enrolled in this course' }, 403);
      }
    }

    const { getCallsConfig, getCallsClientConfig, trackCallsSession } = await import('../lib/cloudflare-calls');
    const config = await getCallsConfig(c.env.KV_CONFIG, c.env);
    if (!config) {
      return c.json({ error: 'Cloudflare Calls fallback is not configured' }, 503);
    }

    const roomName = s.meeting_url?.replace('livekit://', '') || `dakkho-class-${s.id}`;
    const clientConfig = await getCallsClientConfig(config, roomName);
    if (!clientConfig) {
      return c.json({ error: 'Failed to create fallback session' }, 500);
    }

    await trackCallsSession(c.env.KV_CONFIG, clientConfig.sessionId, roomName, `student-${studentId}`);

    return c.json({
      success: true,
      provider: 'cloudflare-calls',
      sessionId: clientConfig.sessionId,
      url: clientConfig.url,
      iceServers: clientConfig.iceServers,
      room: roomName,
    });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// GET /realtime/session — Dakkho Realtime session for students
studentApiRoutes.get('/realtime/session', studentAuthMiddleware, async (c) => {
  try {
    const studentId = c.get('studentId');
    const room = c.req.query('room');

    if (!room) {
      return c.json({ error: 'room query parameter is required' }, 400);
    }

    const { getRealtimeClientConfig, trackCallsSession } = await import('../lib/cloudflare-calls');
    const clientConfig = await getRealtimeClientConfig(c.env.KV_CONFIG, room);
    if (!clientConfig) {
      return c.json({ error: 'Dakkho Realtime is not configured' }, 503);
    }

    await trackCallsSession(c.env.KV_CONFIG, clientConfig.sessionId, room, `student-${studentId}`);

    return c.json({
      success: true,
      provider: 'dakkho-realtime',
      sessionId: clientConfig.sessionId,
      url: clientConfig.url,
      iceServers: clientConfig.iceServers,
      appId: clientConfig.appId,
      room,
    });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// GET /realtime/status — Check if Dakkho Realtime is available
studentApiRoutes.get('/realtime/status', async (c) => {
  try {
    const { getRealtimeConfig } = await import('../lib/cloudflare-calls');
    const config = await getRealtimeConfig(c.env.KV_CONFIG);
    return c.json({ available: config !== null, appId: config?.appId || null });
  } catch (error) {
    return c.json({ available: false });
  }
});

// ─── Coupons ───

studentApiRoutes.get('/coupons/validate', async (c) => {
  try {
    const code = c.req.query('code');
    if (!code) {
      return c.json({ error: 'Coupon code required' }, 400);
    }

    const coupon = await c.env.DB.prepare(
      'SELECT * FROM coupons WHERE code = ? AND is_active = 1'
    ).bind(code).first();

    if (!coupon) {
      return c.json({ valid: false, error: 'Invalid coupon code' }, 404);
    }

    const cp = coupon as any;
    const now = new Date().toISOString();

    if (cp.valid_from > now || cp.valid_until < now) {
      return c.json({ valid: false, error: 'Coupon has expired or is not yet active' });
    }

    if (cp.usage_limit && cp.usage_count >= cp.usage_limit) {
      return c.json({ valid: false, error: 'Coupon usage limit reached' });
    }

    return c.json({
      valid: true,
      coupon: {
        code: cp.code,
        discount_type: cp.discount_type,
        discount_value: cp.discount_value,
        max_discount: cp.max_discount,
        min_purchase: cp.min_purchase,
      },
    });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// ─── Course Packages ───

studentApiRoutes.get('/course-packages', async (c) => {
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
          'SELECT * FROM course_packages WHERE course_id = ? AND is_active = 1 AND package_type IN (\"single\", \"dual\") ORDER BY price ASC'
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
studentApiRoutes.get('/packages/mine', async (c) => {
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
studentApiRoutes.get('/users/lookup', async (c) => {
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

studentApiRoutes.get('/courses', async (c) => {
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

studentApiRoutes.get('/courses/:id', async (c) => {
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
studentApiRoutes.get('/courses/:id/curriculum', async (c) => {
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

studentApiRoutes.get('/courses/:id/videos', async (c) => {
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

// ─── Instructors (from D1 — public) ───

studentApiRoutes.get('/instructors', async (c) => {
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

studentApiRoutes.get('/instructors/:id', async (c) => {
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
studentApiRoutes.get('/instructors/:id/courses', async (c) => {
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

// ─── Video Streaming ───

studentApiRoutes.get('/video/stream-url', async (c) => {
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


// ═══════════════════════════════════════════════════
// AUTH ROUTES (D1-only — no Appwrite)
// ═══════════════════════════════════════════════════

// POST /auth/signup — Create student account
studentApiRoutes.post('/auth/signup', async (c) => {
  try {
    const { fullName, email, password, instituteId, technology } = await c.req.json();

    if (!fullName || !email || !password) {
      return c.json({ error: 'fullName, email, and password are required' }, 400);
    }

    if (password.length < 8) {
      return c.json({ error: 'Password must be at least 8 characters' }, 400);
    }

    // Check if user already exists
    const existing = await c.env.DB.prepare(
      'SELECT id FROM users WHERE email = ?'
    ).bind(email).first();

    if (existing) {
      return c.json({ error: 'An account with this email already exists' }, 400);
    }

    // Create user in D1
    const userId = crypto.randomUUID();
    const passwordHash = await hashPassword(password);

    await c.env.DB.prepare(`
      INSERT INTO users (id, email, full_name, institute_id, technology, role, email_verified, is_active, enrolled_course_ids, password_hash)
      VALUES (?, ?, ?, ?, ?, 'student', 0, 1, '[]', ?)
    `).bind(userId, email, fullName, instituteId || null, technology || null, passwordHash).run();

    // Create default user preferences
    await c.env.DB.prepare(`
      INSERT OR IGNORE INTO user_preferences (user_id, theme_mode, accent_color, font_size, border_radius, compact_mode)
      VALUES (?, 'system', '#0ea5e9', 16, 16, 0)
    `).bind(userId).run();

    // Create default notification preferences
    await c.env.DB.prepare(
      'INSERT OR IGNORE INTO notification_preferences (user_id) VALUES (?)'
    ).bind(userId).run();

    // ── Per-user daily rate limit for verification emails ──
    const rateLimit = await checkDailyEmailRateLimit(c.env.DB, email);
    if (!rateLimit.allowed) {
      return c.json({ error: `Too many verification emails. You can send up to ${rateLimit.limit} emails per day. Please try again tomorrow.`, code: 'RATE_LIMITED' }, 429);
    }

    // Generate and send email verification OTP (cryptographically secure)
    const verifyOtp = generateOTP();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    await c.env.DB.prepare(
      'INSERT INTO password_reset_otps (email, otp, purpose, expires_at, used, created_at) VALUES (?, ?, ?, ?, 0, ?)'
    ).bind(email, verifyOtp, 'email_verification', otpExpiresAt, new Date().toISOString()).run();

    // Send verification email
    try {
      const { sendEmail } = await import('../lib/resend');
      await sendEmail(c.env, email, 'DAKKHO — Verify Your Email Address', `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #0ea5e9; font-size: 28px; margin: 0;">DAKKHO</h1>
            <p style="color: #64748b; margin: 4px 0 0;">Bangladesh's Premier Polytechnic Platform</p>
          </div>
          <div style="background: #f8fafc; border-radius: 16px; padding: 32px; text-align: center;">
            <h2 style="color: #0f172a; font-size: 20px; margin: 0 0 8px;">Welcome to DAKKHO, ${fullName}!</h2>
            <p style="color: #334155; font-size: 16px; margin: 0 0 24px;">Please verify your email address to get started.</p>
            <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #0ea5e9; background: white; border: 2px dashed #e2e8f0; border-radius: 12px; padding: 16px; display: inline-block;">
              ${verifyOtp}
            </div>
            <p style="color: #64748b; font-size: 14px; margin: 16px 0 0;">This code expires in 10 minutes.</p>
            <p style="color: #94a3b8; font-size: 13px; margin: 8px 0 0;">If you did not create an account, please ignore this email.</p>
          </div>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          <p style="color: #94a3b8; font-size: 12px; text-align: center;">
            Sent from DAKKHO — Bangladesh's Premier Polytechnic Student Platform<br />
            noreply@dakkho.pro.bd
          </p>
        </div>
      `);
    } catch (emailError: any) {
      console.error('Failed to send verification email:', emailError.message);
      // Don't fail signup if email fails, but log it
    }

    // Look up institute name and technology name for the response
    const instituteName = await getInstituteName(c.env, instituteId || null);
    const technologyName = await getTechnologyName(c.env, technology || null);

    // Create D1 student session
    const token = await createStudentSession(c.env, userId, email);

    return c.json({
      success: true,
      token,
      userId,
      user: {
        id: userId,
        name: fullName,
        email,
        instituteId: instituteId || null,
        instituteName: instituteName || null,
        technology: technology || null,
        technologyName: technologyName || null,
        emailVerified: false,
        packages: [],
        themeMode: 'system',
      },
    });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// POST /auth/login — Login student
studentApiRoutes.post('/auth/login', async (c) => {
  try {
    const { email, password } = await c.req.json();

    if (!email || !password) {
      return c.json({ error: 'Email and password are required' }, 400);
    }

    // Look up user in D1
    const user = await c.env.DB.prepare(
      'SELECT id, email, full_name, role, password_hash, institute_id, technology, email_verified, is_active FROM users WHERE email = ? AND is_active = 1'
    ).bind(email).first<{ id: string; email: string; full_name: string; role: string; password_hash: string; institute_id: number | null; technology: string | null; email_verified: number; is_active: number }>();

    if (!user) {
      return c.json({ error: 'Invalid email or password' }, 401);
    }

    // Verify password using PBKDF2 (supports salt:hash format)
    const validPassword = await verifyPassword(password, user.password_hash);
    if (!validPassword) {
      return c.json({ error: 'Invalid email or password' }, 401);
    }

    // Verify this is a student (not admin/super_admin)
    if (user.role === 'admin' || user.role === 'super_admin') {
      return c.json({ error: 'Admin accounts cannot login here. Use the admin panel.' }, 403);
    }

    // Get user packages from D1
    let userPackages: any[] = [];
    try {
      const pkgResult = await c.env.DB.prepare(
        "SELECT up.*, cp.package_type, cp.price, cp.duration_months FROM user_packages up JOIN course_packages cp ON up.package_id = cp.id WHERE up.user_id = ? AND up.status = 'active' ORDER BY up.activated_at DESC"
      ).bind(user.id).all();
      userPackages = pkgResult.results as any[];
    } catch {}

    // Get user theme preference from D1
    let themeMode = 'system';
    try {
      const prefs = await c.env.DB.prepare(
        'SELECT theme_mode FROM user_preferences WHERE user_id = ?'
      ).bind(user.id).first();
      if (prefs && (prefs as any).theme_mode) {
        themeMode = (prefs as any).theme_mode;
      }
    } catch {}

    // Look up institute name and technology name
    const instituteName = await getInstituteName(c.env, user.institute_id || null);
    const technologyName = await getTechnologyName(c.env, user.technology || null);

    // Delete any existing D1 sessions and create new one
    await c.env.DB.prepare('DELETE FROM student_sessions WHERE user_id = ?').bind(user.id).run();
    const token = await createStudentSession(c.env, user.id, user.email);

    return c.json({
      success: true,
      token,
      userId: user.id,
      user: {
        id: user.id,
        name: user.full_name,
        email: user.email,
        instituteId: user.institute_id || null,
        instituteName: instituteName || null,
        technology: user.technology || null,
        technologyName: technologyName || null,
        emailVerified: !!user.email_verified,
        packages: userPackages,
        themeMode,
      },
    });
  } catch (error) {
    const msg = getErrorMessage(error);
    return c.json({ error: msg.includes('Invalid') ? msg : 'Invalid email or password' }, 401);
  }
});

// POST /auth/logout — Logout student
studentApiRoutes.post('/auth/logout', async (c) => {
  try {
    const auth = await getStudentAuth(c);
    if (!auth.authorized) {
      return c.json({ success: true });
    }

    const authHeader = c.req.header('Authorization');
    const token = authHeader?.substring(7) || '';
    await deleteStudentSession(c.env, token);

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// GET /auth/me — Get current student profile
studentApiRoutes.get('/auth/me', async (c) => {
  try {
    const auth = await getStudentAuth(c);
    if (!auth.authorized) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Get user from D1
    const userDoc = await getStudentUserDoc(c.env, auth.userId!);

    // Get user packages from D1
    let userPackages: any[] = [];
    try {
      const pkgResult = await c.env.DB.prepare(
        "SELECT up.*, cp.package_type, cp.price, cp.duration_months FROM user_packages up JOIN course_packages cp ON up.package_id = cp.id WHERE up.user_id = ? AND up.status = 'active' ORDER BY up.activated_at DESC"
      ).bind(auth.userId).all();
      userPackages = pkgResult.results as any[];
    } catch {}

    const u = userDoc as any;

    // Get user theme preference from D1
    let themeMode = 'system';
    try {
      const prefs = await c.env.DB.prepare(
        'SELECT theme_mode FROM user_preferences WHERE user_id = ?'
      ).bind(auth.userId!).first();
      if (prefs && (prefs as any).theme_mode) {
        themeMode = (prefs as any).theme_mode;
      }
    } catch {}

    // Look up institute name and technology name
    const instituteName = await getInstituteName(c.env, (u?.institute_id as number) || null);
    const technologyName = await getTechnologyName(c.env, (u?.technology as string) || null);

    return c.json({
      user: {
        id: auth.userId,
        name: u?.full_name || auth.name || '',
        email: auth.email || u?.email || '',
        phone: u?.phone || null,
        bio: u?.bio || null,
        semester: u?.semester || null,
        instituteId: u?.institute_id || null,
        instituteName: instituteName || null,
        technology: u?.technology || null,
        technologyName: technologyName || null,
        emailVerified: !!u?.email_verified,
        avatarUrl: u?.avatar_url || '',
        role: u?.role || 'student',
        isActive: u?.is_active !== undefined ? !!u?.is_active : true,
        packages: userPackages,
        themeMode,
      },
    });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// POST /auth/verify-otp — Verify email with OTP
studentApiRoutes.post('/auth/verify-otp', async (c) => {
  try {
    const { email, otp } = await c.req.json();

    if (!email || !otp) {
      return c.json({ error: 'email and otp are required' }, 400);
    }

    // Validate OTP against stored codes — only email_verification purpose
    // NOTE: We do NOT filter by `expires_at > datetime("now")` in SQL because
    // expires_at is stored in ISO 8601 format (e.g. 2026-06-11T12:10:00.000Z) while
    // SQLite's datetime("now") returns a different format (2026-06-11 12:00:00).
    // Lexicographic comparison between these formats is unreliable, so we validate
    // expiry in JavaScript instead — consistent with the reset-password endpoint.
    const otpRecord = await c.env.DB.prepare(
      'SELECT * FROM password_reset_otps WHERE email = ? AND otp = ? AND purpose = ? AND used = 0 ORDER BY created_at DESC LIMIT 1'
    ).bind(email, otp, 'email_verification').first<{ id: number; email: string; otp: string; purpose: string; expires_at: string; used: number; created_at: string }>();

    if (!otpRecord) {
      // Debug: check if the OTP exists but is already used or has different purpose
      const anyOtpRecord = await c.env.DB.prepare(
        'SELECT id, email, otp, purpose, used, expires_at FROM password_reset_otps WHERE email = ? AND otp = ? ORDER BY created_at DESC LIMIT 1'
      ).bind(email, otp).first<{ id: number; email: string; otp: string; purpose: string; used: number | null; expires_at: string }>();
      if (anyOtpRecord) {
        console.log(`OTP verify failed: email=${email}, otp=${otp}, found_purpose=${anyOtpRecord.purpose}, found_used=${anyOtpRecord.used}, expected_purpose=email_verification, expected_used=0`);
      } else {
        console.log(`OTP verify failed: no record found for email=${email}, otp=${otp}`);
      }
      return c.json({ success: false, message: 'Invalid or expired OTP' }, 400);
    }

    // Check expiry in JavaScript — works correctly with ISO 8601 dates
    if (new Date(otpRecord.expires_at) < new Date()) {
      // Mark expired OTP as used so it can't be retried
      await c.env.DB.prepare(
        'UPDATE password_reset_otps SET used = 1 WHERE id = ?'
      ).bind(otpRecord.id).run();
      return c.json({ success: false, message: 'OTP has expired. Please request a new one.' }, 400);
    }

    // Mark OTP as used
    await c.env.DB.prepare(
      'UPDATE password_reset_otps SET used = 1 WHERE id = ?'
    ).bind(otpRecord.id).run();

    // Mark email as verified
    const session = await c.env.DB.prepare(
      "SELECT user_id FROM student_sessions WHERE email = ? AND is_active = 1 ORDER BY created_at DESC LIMIT 1"
    ).bind(email).first<{ user_id: string }>();

    if (session?.user_id) {
      await c.env.DB.prepare(
        'UPDATE users SET email_verified = 1 WHERE id = ?'
      ).bind(session.user_id).run();
    } else {
      // Fallback: verify by email directly
      await c.env.DB.prepare(
        'UPDATE users SET email_verified = 1 WHERE email = ?'
      ).bind(email).run();
    }

    return c.json({ success: true, message: 'Email verified successfully' });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// GET /auth/otp-cooldown — Get remaining cooldown seconds for resending OTP (server-side)
studentApiRoutes.get('/auth/otp-cooldown', async (c) => {
  try {
    const email = c.req.query('email');
    if (!email) {
      return c.json({ error: 'email query parameter is required' }, 400);
    }

    // Find the most recent OTP sent to this email (any purpose)
    const lastOtp = await c.env.DB.prepare(
      'SELECT created_at FROM password_reset_otps WHERE email = ? ORDER BY created_at DESC LIMIT 1'
    ).bind(email).first<{ created_at: string | null }>();

    if (!lastOtp || !lastOtp.created_at) {
      return c.json({ cooldownSeconds: 0 });
    }

    // Calculate remaining cooldown (60 seconds since last OTP was sent)
    const RESEND_COOLDOWN_SECONDS = 60;
    const sentAt = new Date(lastOtp.created_at).getTime();
    const now = Date.now();
    const elapsed = Math.floor((now - sentAt) / 1000);
    const remaining = Math.max(0, RESEND_COOLDOWN_SECONDS - elapsed);

    return c.json({ cooldownSeconds: remaining });
  } catch (error) {
    // On error, return 0 cooldown so user isn't stuck
    return c.json({ cooldownSeconds: 0 });
  }
});

// ─── Helper: Generate a random 6-digit OTP ───
function generateOTP(): string {
  const bytes = new Uint8Array(3);
  crypto.getRandomValues(bytes);
  const num = (bytes[0] << 16) | (bytes[1] << 8) | bytes[2];
  return (num % 1000000).toString().padStart(6, '0');
}

// ─── Helper: Send password reset OTP email via Resend ───
async function sendPasswordResetEmail(
  env: Env,
  to: string,
  otp: string
): Promise<void> {
  const { sendEmail } = await import('../lib/resend');
  await sendEmail(
    env,
    to,
    'DAKKHO — Password Reset Code',
    `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h1 style="color: #0ea5e9; font-size: 28px; margin: 0;">DAKKHO</h1>
        <p style="color: #64748b; margin: 4px 0 0;">Password Reset</p>
      </div>
      <div style="background: #f8fafc; border-radius: 16px; padding: 32px; text-align: center;">
        <p style="color: #334155; font-size: 16px; margin: 0 0 16px;">Your password reset code is:</p>
        <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #0ea5e9; background: white; border: 2px dashed #e2e8f0; border-radius: 12px; padding: 16px; display: inline-block;">
          ${otp}
        </div>
        <p style="color: #64748b; font-size: 14px; margin: 16px 0 0;">This code expires in 5 minutes.</p>
        <p style="color: #94a3b8; font-size: 13px; margin: 8px 0 0;">If you did not request a password reset, please ignore this email.</p>
      </div>
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
      <p style="color: #94a3b8; font-size: 12px; text-align: center;">
        Sent from DAKKHO — Bangladesh's Premier Polytechnic Student Platform<br />
        Timestamp: ${new Date().toISOString()}
      </p>
    </div>
    `
  );
}

// PUT /auth/profile — Update student profile
studentApiRoutes.put('/auth/profile', async (c) => {
  try {
    const auth = await getStudentAuth(c);
    if (!auth.authorized) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const body = await c.req.json();
    const { fullName, instituteId, technology, bio, phone, semester, avatarUrl } = body;

    // Build update query dynamically - only update provided fields
    const updates: string[] = [];
    const params: unknown[] = [];

    if (fullName !== undefined) { updates.push('full_name = ?'); params.push(fullName); }
    if (instituteId !== undefined) { updates.push('institute_id = ?'); params.push(instituteId); }
    if (technology !== undefined) { updates.push('technology = ?'); params.push(technology); }
    if (bio !== undefined) { updates.push('bio = ?'); params.push(bio); }
    if (phone !== undefined) { updates.push('phone = ?'); params.push(phone); }
    if (semester !== undefined) { updates.push('semester = ?'); params.push(semester); }
    if (avatarUrl !== undefined) { updates.push('avatar_url = ?'); params.push(avatarUrl); }

    if (updates.length === 0) {
      return c.json({ error: 'No fields to update' }, 400);
    }

    updates.push("updated_at = datetime('now')");
    params.push(auth.userId);

    await c.env.DB.prepare(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`
    ).bind(...params).run();

    // Return updated user
    const updatedUser = await getStudentUserDoc(c.env, auth.userId!);
    const u = updatedUser as any;

    // Look up institute name and technology name
    const updatedInstituteName = await getInstituteName(c.env, (u?.institute_id as number) || null);
    const updatedTechnologyName = await getTechnologyName(c.env, (u?.technology as string) || null);

    return c.json({
      success: true,
      user: {
        id: auth.userId,
        name: u?.full_name || '',
        email: u?.email || auth.email || '',
        phone: u?.phone || null,
        bio: u?.bio || null,
        semester: u?.semester || null,
        instituteId: u?.institute_id || null,
        instituteName: updatedInstituteName || null,
        technology: u?.technology || null,
        technologyName: updatedTechnologyName || null,
        emailVerified: !!u?.email_verified,
        avatarUrl: u?.avatar_url || '',
      },
    });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// POST /auth/forgot-password — Request password reset OTP
studentApiRoutes.post('/auth/forgot-password', async (c) => {
  try {
    const { email } = await c.req.json();

    if (!email) {
      return c.json({ error: 'Email is required' }, 400);
    }

    // Check if user exists
    const user = await c.env.DB.prepare(
      'SELECT id FROM users WHERE email = ? AND is_active = 1'
    ).bind(email).first();

    if (user) {
      // ── Per-user daily rate limit ──
      const rateLimit = await checkDailyEmailRateLimit(c.env.DB, email);
      if (!rateLimit.allowed) {
        // Don't reveal rate limit to prevent email enumeration — still return success
        return c.json({ success: true, message: 'If an account exists with this email, a reset code has been sent.' });
      }

      // Delete any previous unused OTPs for this email with password_reset purpose
      await c.env.DB.prepare(
        'DELETE FROM password_reset_otps WHERE email = ? AND used = 0 AND purpose = ?'
      ).bind(email, 'password_reset').run();

      // Generate a 6-digit OTP
      const otp = generateOTP();

      // Store OTP in D1 with 5-minute expiration
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      await c.env.DB.prepare(
        'INSERT INTO password_reset_otps (email, otp, purpose, expires_at, used, created_at) VALUES (?, ?, ?, ?, 0, ?)'
      ).bind(email, otp, 'password_reset', expiresAt, new Date().toISOString()).run();

      // Send OTP email via Resend
      try {
        await sendPasswordResetEmail(c.env, email, otp);
      } catch (emailError) {
        console.error('Failed to send password reset email:', emailError);
        // Still return success for security — don't reveal email sending failure
      }
    }

    // Always return success for security (don't reveal if email exists)
    return c.json({ success: true, message: 'If an account exists with this email, a reset code has been sent.' });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// POST /auth/reset-password — Verify OTP and set new password
studentApiRoutes.post('/auth/reset-password', async (c) => {
  try {
    const { email, otp, newPassword } = await c.req.json();

    if (!email || !otp || !newPassword) {
      return c.json({ error: 'email, otp, and newPassword are required' }, 400);
    }

    if (newPassword.length < 8) {
      return c.json({ error: 'Password must be at least 8 characters' }, 400);
    }

    // Look up the most recent unused OTP for this email with password_reset purpose
    const otpRecord = await c.env.DB.prepare(
      'SELECT id, otp, expires_at, used FROM password_reset_otps WHERE email = ? AND purpose = ? AND used = 0 ORDER BY created_at DESC LIMIT 1'
    ).bind(email, 'password_reset').first<{ id: number; otp: string; expires_at: string; used: number }>();

    if (!otpRecord) {
      return c.json({ error: 'Invalid or expired reset code. Please request a new one.' }, 400);
    }

    // Check if OTP has expired
    if (new Date(otpRecord.expires_at) < new Date()) {
      // Mark expired OTP as used
      await c.env.DB.prepare(
        'UPDATE password_reset_otps SET used = 1 WHERE id = ?'
      ).bind(otpRecord.id).run();
      return c.json({ error: 'Reset code has expired. Please request a new one.' }, 400);
    }

    // Verify OTP
    if (otpRecord.otp !== otp) {
      return c.json({ error: 'Invalid reset code. Please try again.' }, 400);
    }

    // Mark OTP as used
    await c.env.DB.prepare(
      'UPDATE password_reset_otps SET used = 1 WHERE id = ?'
    ).bind(otpRecord.id).run();

    // Update the user's password
    const newPasswordHash = await hashPassword(newPassword);
    await c.env.DB.prepare(
      'UPDATE users SET password_hash = ?, updated_at = datetime(\'now\') WHERE email = ?'
    ).bind(newPasswordHash, email).run();

    // Invalidate all active student sessions for this user (force re-login)
    await c.env.DB.prepare(
      'UPDATE student_sessions SET is_active = 0 WHERE email = ?'
    ).bind(email).run();

    return c.json({ success: true, message: 'Password has been reset successfully.' });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// ─── Helper: Check per-user daily email rate limit ───
const EMAIL_OTP_DAILY_LIMIT = 10; // Max 10 verification emails per user per day

async function checkDailyEmailRateLimit(db: D1Database, email: string): Promise<{ allowed: boolean; count: number; limit: number }> {
  try {
    // Count OTPs created for this email in the last 24 hours (both purposes)
    // NOTE: created_at is stored in ISO 8601 format, so we validate in JavaScript
    // to avoid SQLite datetime format mismatch issues.
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const result = await db.prepare(
      'SELECT created_at FROM password_reset_otps WHERE email = ?'
    ).bind(email).all<{ created_at: string | null }>();

    // Filter in JavaScript to handle ISO 8601 dates correctly
    const recentCount = result.results.filter(row => {
      if (!row.created_at) return false;
      try {
        return new Date(row.created_at) >= new Date(twentyFourHoursAgo);
      } catch {
        return false;
      }
    }).length;

    return { allowed: recentCount < EMAIL_OTP_DAILY_LIMIT, count: recentCount, limit: EMAIL_OTP_DAILY_LIMIT };
  } catch {
    // If the check fails, allow the request (fail open)
    return { allowed: true, count: 0, limit: EMAIL_OTP_DAILY_LIMIT };
  }
}

// POST /auth/resend-otp — Resend OTP for email verification or password reset
studentApiRoutes.post('/auth/resend-otp', async (c) => {
  try {
    const { email } = await c.req.json();

    if (!email) {
      return c.json({ error: 'Email is required' }, 400);
    }

    // Check if user exists
    const user = await c.env.DB.prepare(
      'SELECT id FROM users WHERE email = ? AND is_active = 1'
    ).bind(email).first();

    if (user) {
      // Delete any previous unused OTPs for this email (both purposes — resend can be for email_verification or password_reset)
      const userForPurpose = await c.env.DB.prepare(
        'SELECT email_verified FROM users WHERE email = ?'
      ).bind(email).first<{ email_verified: number }>();
      const resendPurpose = (userForPurpose && !userForPurpose.email_verified) ? 'email_verification' : 'password_reset';

      // ── Server-side cooldown: prevent resend within 60 seconds ──
      const lastOtp = await c.env.DB.prepare(
        'SELECT created_at FROM password_reset_otps WHERE email = ? ORDER BY created_at DESC LIMIT 1'
      ).bind(email).first<{ created_at: string | null }>();
      if (lastOtp?.created_at) {
        const lastSentAt = new Date(lastOtp.created_at).getTime();
        const elapsedSec = Math.floor((Date.now() - lastSentAt) / 1000);
        if (elapsedSec < 60) {
          return c.json({
            error: `Please wait ${60 - elapsedSec} seconds before requesting a new code.`,
            code: 'COOLDOWN_ACTIVE',
            cooldownSeconds: 60 - elapsedSec,
          }, 429);
        }
      }

      // ── Per-user daily rate limit ──
      const rateLimit = await checkDailyEmailRateLimit(c.env.DB, email);
      if (!rateLimit.allowed) {
        return c.json({
          error: `Too many verification emails. You can send up to ${rateLimit.limit} emails per day. Please try again tomorrow.`,
          code: 'RATE_LIMITED',
        }, 429);
      }

      await c.env.DB.prepare(
        'DELETE FROM password_reset_otps WHERE email = ? AND used = 0 AND purpose = ?'
      ).bind(email, resendPurpose).run();

      // Generate a new 6-digit OTP
      const otp = generateOTP();

      // Store OTP with appropriate expiry: 10 min for email_verification, 5 min for password_reset
      const expiryMinutes = resendPurpose === 'email_verification' ? 10 : 5;
      const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000).toISOString();
      await c.env.DB.prepare(
        'INSERT INTO password_reset_otps (email, otp, purpose, expires_at, used, created_at) VALUES (?, ?, ?, ?, 0, ?)'
      ).bind(email, otp, resendPurpose, expiresAt, new Date().toISOString()).run();

      // Send OTP email via Resend
      try {
        if (resendPurpose === 'email_verification') {
          const { sendEmail } = await import('../lib/resend');
          await sendEmail(c.env, email, 'DAKKHO — Your Verification Code', `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
              <div style="text-align: center; margin-bottom: 24px;">
                <h1 style="color: #0ea5e9; font-size: 28px; margin: 0;">DAKKHO</h1>
                <p style="color: #64748b; margin: 4px 0 0;">Email Verification</p>
              </div>
              <div style="background: #f8fafc; border-radius: 16px; padding: 32px; text-align: center;">
                <p style="color: #334155; font-size: 16px; margin: 0 0 16px;">Your email verification code is:</p>
                <div style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #0ea5e9; background: white; border: 2px dashed #e2e8f0; border-radius: 12px; padding: 16px; display: inline-block;">
                  ${otp}
                </div>
                <p style="color: #64748b; font-size: 14px; margin: 16px 0 0;">This code expires in ${expiryMinutes} minutes.</p>
                <p style="color: #94a3b8; font-size: 13px; margin: 8px 0 0;">If you did not request this, please ignore this email.</p>
              </div>
              <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
              <p style="color: #94a3b8; font-size: 12px; text-align: center;">
                Sent from DAKKHO — Bangladesh's Premier Polytechnic Student Platform<br />
                noreply@dakkho.pro.bd
              </p>
            </div>
          `);
        } else {
          await sendPasswordResetEmail(c.env, email, otp);
        }
      } catch (emailError) {
        console.error('Failed to resend OTP email:', emailError);
      }
    }

    // Always return success for security
    return c.json({ success: true, message: 'If an account exists, a new code has been sent.' });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});


// ═══════════════════════════════════════════════════
// AUTHENTICATED ROUTES
// ═══════════════════════════════════════════════════

// POST /institutes/requests — Request new institute (student)
studentApiRoutes.post('/institutes/requests', async (c) => {
  try {
    const auth = await getStudentAuth(c);
    if (!auth.authorized) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    if (!auth.emailVerified) {
      return c.json({ error: 'Email verification required', code: 'EMAIL_NOT_VERIFIED' }, 403);
    }

    const data = await c.req.json();
    const { institute_name, institute_name_bn, division, district } = data;

    if (!institute_name) {
      return c.json({ error: 'Institute name required' }, 400);
    }

    const existing = await c.env.DB.prepare(
      'SELECT id FROM institutes WHERE name = ? AND is_active = 1'
    ).bind(institute_name).first();

    if (existing) {
      return c.json({ error: 'This institute already exists' }, 400);
    }

    const pending = await c.env.DB.prepare(
      "SELECT id FROM institute_requests WHERE institute_name = ? AND status = 'pending'"
    ).bind(institute_name).first();

    if (pending) {
      return c.json({ error: 'A request for this institute is already pending' }, 400);
    }

    await c.env.DB.prepare(`
      INSERT INTO institute_requests (user_id, user_email, user_name, institute_name, institute_name_bn, division, district, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
    `).bind(auth.userId, auth.email, auth.name || null, institute_name, institute_name_bn || null, division || null, district || null).run();

    return c.json({ success: true, message: 'Institute request submitted' });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

studentApiRoutes.get('/institutes/requests/mine', async (c) => {
  try {
    const auth = await getStudentAuth(c);
    if (!auth.authorized) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    if (!auth.emailVerified) {
      return c.json({ error: 'Email verification required', code: 'EMAIL_NOT_VERIFIED' }, 403);
    }

    const result = await c.env.DB.prepare(
      'SELECT * FROM institute_requests WHERE user_id = ? ORDER BY created_at DESC'
    ).bind(auth.userId).all();

    return c.json({ requests: result.results });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

studentApiRoutes.post('/push/register', async (c) => {
  try {
    const auth = await getStudentAuth(c);
    if (!auth.authorized) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    if (!auth.emailVerified) {
      return c.json({ error: 'Email verification required', code: 'EMAIL_NOT_VERIFIED' }, 403);
    }

    const { push_token, device_type, device_info } = await c.req.json();
    if (!push_token) {
      return c.json({ error: 'push_token required' }, 400);
    }

    await registerPushToken(c.env, auth.userId!, push_token, device_type, device_info);

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

studentApiRoutes.delete('/push/unregister', async (c) => {
  try {
    const auth = await getStudentAuth(c);
    if (!auth.authorized) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    if (!auth.emailVerified) {
      return c.json({ error: 'Email verification required', code: 'EMAIL_NOT_VERIFIED' }, 403);
    }

    const { push_token } = await c.req.json();
    if (!push_token) {
      return c.json({ error: 'push_token required' }, 400);
    }

    await unregisterPushToken(c.env, push_token);

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// GET /push/vapid-key — Get VAPID public key for web push subscription
studentApiRoutes.get('/push/vapid-key', async (c) => {
  try {
    const publicKey = c.env.VAPID_PUBLIC_KEY;
    if (!publicKey) {
      return c.json({ error: 'Web push not configured' }, 503);
    }
    return c.json({ publicKey });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// POST /push/subscribe — Subscribe to web push notifications (stores PushSubscription)
studentApiRoutes.post('/push/subscribe', async (c) => {
  try {
    const auth = await getStudentAuth(c);
    if (!auth.authorized) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    if (!auth.emailVerified) {
      return c.json({ error: 'Email verification required', code: 'EMAIL_NOT_VERIFIED' }, 403);
    }

    const { subscription } = await c.req.json();
    if (!subscription || !subscription.endpoint) {
      return c.json({ error: 'subscription object with endpoint required' }, 400);
    }

    // Store the full subscription JSON as push_token (endpoint + keys)
    // Also register as a simple push token for backward compat
    const subscriptionJson = JSON.stringify(subscription);
    const deviceType = 'webpush';

    await env_push_upsert(c.env, auth.userId!, subscription.endpoint, subscriptionJson, deviceType);

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// Helper: Upsert push subscription
async function env_push_upsert(
  env: any,
  userId: string,
  endpoint: string,
  subscriptionJson: string,
  deviceType: string
): Promise<void> {
  // Check if this endpoint already exists
  const existing = await env.DB.prepare(
    'SELECT id FROM user_push_tokens WHERE user_id = ? AND push_token = ?'
  ).bind(userId, endpoint).first();

  if (existing) {
    await env.DB.prepare(
      "UPDATE user_push_tokens SET device_info = ?, is_active = 1, updated_at = datetime('now') WHERE user_id = ? AND push_token = ?"
    ).bind(subscriptionJson, userId, endpoint).run();
  } else {
    await env.DB.prepare(`
      INSERT INTO user_push_tokens (id, user_id, push_token, device_type, device_info, is_active, created_at)
      VALUES (?, ?, ?, ?, ?, 1, datetime('now'))
    `).bind(generateId(), userId, endpoint, deviceType, subscriptionJson).run();
  }
}

studentApiRoutes.post('/payments/submit', async (c) => {
  try {
    const auth = await getStudentAuth(c);
    if (!auth.authorized) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    if (!auth.emailVerified) {
      return c.json({ error: 'Email verification required', code: 'EMAIL_NOT_VERIFIED' }, 403);
    }

    const { package_id, trx_id, phone, proof_url, duoMemberEmail } = await c.req.json();
    if (!package_id || !trx_id) {
      return c.json({ error: 'package_id and trx_id required' }, 400);
    }

    const pkg = await c.env.DB.prepare(
      'SELECT * FROM course_packages WHERE id = ? AND is_active = 1'
    ).bind(package_id).first();

    if (!pkg) {
      return c.json({ error: 'Package not found' }, 404);
    }

    const p = pkg as any;

    const submitMetadata = JSON.stringify({ duoMemberEmail: duoMemberEmail || null });

    await c.env.DB.prepare(`
      INSERT INTO payments (user_id, package_id, course_id, amount, currency, gateway, trx_id_submitted, phone_submitted, proof_url, status, metadata)
      VALUES (?, ?, ?, ?, 'BDT', 'manual', ?, ?, ?, 'pending', ?)
    `).bind(auth.userId, package_id, p.course_id, p.price, trx_id, phone || null, proof_url || null, submitMetadata).run();

    return c.json({ success: true, message: 'Payment submitted for verification' });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// ─── Helper: Auto-activate package after payment verification ───
async function autoActivatePackage(env: any, userId: string, packageId: number, courseId: string): Promise<void> {
  const pkg = await env.DB.prepare('SELECT * FROM course_packages WHERE id = ?').bind(packageId).first();
  if (pkg) {
    const pkgData = pkg as any;
    const expiresAt = new Date(Date.now() + pkgData.duration_months * 30 * 24 * 60 * 60 * 1000).toISOString();

    // 1. Create user_packages entry
    await env.DB.prepare(`
      INSERT INTO user_packages (user_id, package_id, course_id, package_type, activated_at, expires_at, status)
      VALUES (?, ?, ?, ?, datetime('now'), ?, 'active')
    `).bind(userId, packageId, courseId, pkgData.package_type, expiresAt).run();

    // 2. Create enrollment entry (so student can actually watch videos!)
    try {
      // Check if already enrolled
      const existingEnrollment = await env.DB.prepare(
        'SELECT id FROM enrollments WHERE user_id = ? AND course_id = ?'
      ).bind(userId, courseId).first();

      if (!existingEnrollment) {
        const enrollmentId = crypto.randomUUID();
        await env.DB.prepare(`
          INSERT INTO enrollments (id, user_id, course_id, package_id, expires_at, status, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, 'active', datetime('now'), datetime('now'))
        `).bind(enrollmentId, userId, courseId, packageId, expiresAt).run();
      } else {
        // Update existing enrollment to active
        await env.DB.prepare(`
          UPDATE enrollments SET status = 'active', expires_at = ?, updated_at = datetime('now')
          WHERE user_id = ? AND course_id = ?
        `).bind(expiresAt, userId, courseId).run();
      }
    } catch (enrollErr: any) {
      // If enrollments table doesn't have package_id/expires_at/status columns yet,
      // fall back to basic enrollment insert
      try {
        const existingEnrollment = await env.DB.prepare(
          'SELECT id FROM enrollments WHERE user_id = ? AND course_id = ?'
        ).bind(userId, courseId).first();

        if (!existingEnrollment) {
          const enrollmentId = crypto.randomUUID();
          await env.DB.prepare(`
            INSERT INTO enrollments (id, user_id, course_id, progress, completed, created_at, updated_at)
            VALUES (?, ?, ?, 0, 0, datetime('now'), datetime('now'))
          `).bind(enrollmentId, userId, courseId).run();
        }
      } catch (fallbackErr) {
        console.error('Failed to create enrollment:', fallbackErr);
      }
    }
  }
}

// POST /payments/create — Create PipraPay payment session
studentApiRoutes.post('/payments/create', async (c) => {
  try {
    const auth = await getStudentAuth(c);
    if (!auth.authorized) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    if (!auth.emailVerified) {
      return c.json({ error: 'Email verification required', code: 'EMAIL_NOT_VERIFIED' }, 403);
    }

    const { packageId, couponCode, duoMemberEmail } = await c.req.json();
    if (!packageId) {
      return c.json({ error: 'packageId is required' }, 400);
    }

    // Check if PipraPay is active
    const pipraPayConfig = await c.env.DB.prepare(
      "SELECT * FROM payment_config WHERE gateway = 'piprapay' AND is_active = 1"
    ).first();

    if (!pipraPayConfig) {
      return c.json({ error: 'PipraPay payment is not available right now. Please use manual payment.' }, 400);
    }

    // Get package details
    const pkg = await c.env.DB.prepare(
      'SELECT * FROM course_packages WHERE id = ? AND is_active = 1'
    ).bind(packageId).first();

    if (!pkg) {
      return c.json({ error: 'Package not found' }, 404);
    }

    const p = pkg as any;
    let finalAmount = p.price;

    // Validate coupon if provided
    if (couponCode) {
      const coupon = await c.env.DB.prepare(
        'SELECT * FROM coupons WHERE code = ? AND is_active = 1'
      ).bind(couponCode).first();

      if (coupon) {
        const cp = coupon as any;
        const now = new Date().toISOString();
        if (cp.valid_from <= now && cp.valid_until >= now) {
          if (!cp.usage_limit || cp.usage_count < cp.usage_limit) {
            if (cp.discount_type === 'percentage') {
              const discount = finalAmount * (cp.discount_value / 100);
              finalAmount = Math.max(0, finalAmount - (cp.max_discount ? Math.min(discount, cp.max_discount) : discount));
            } else if (cp.discount_type === 'flat') {
              finalAmount = Math.max(0, finalAmount - cp.discount_value);
            }
            // Increment coupon usage
            await c.env.DB.prepare(
              'UPDATE coupons SET usage_count = usage_count + 1 WHERE code = ?'
            ).bind(couponCode).run();
          }
        }
      }
    }

    // Get user details for PipraPay
    const userDoc = await getStudentUserDoc(c.env, auth.userId!);
    const u = userDoc as any;
    const fullName = u?.full_name || auth.name || 'Student';
    const email = u?.email || auth.email || '';
    const phone = u?.phone || '';

    // Insert pending payment in D1
    const paymentResult = await c.env.DB.prepare(`
      INSERT INTO payments (user_id, package_id, course_id, amount, currency, gateway, status, metadata)
      VALUES (?, ?, ?, ?, 'BDT', 'piprapay', 'pending', ?)
    `).bind(
      auth.userId,
      packageId,
      p.course_id,
      finalAmount,
      JSON.stringify({ couponCode: couponCode || null, originalPrice: p.price, discountedPrice: finalAmount, duoMemberEmail: duoMemberEmail || null })
    ).run();

    // Get the inserted payment ID
    const paymentRow = await c.env.DB.prepare(
      'SELECT id FROM payments WHERE user_id = ? AND gateway = ? AND status = ? ORDER BY created_at DESC LIMIT 1'
    ).bind(auth.userId, 'piprapay', 'pending').first();

    const paymentId = (paymentRow as any)?.id;

    // Call PipraPay API
    const { createPipraPayPayment } = await import('../lib/payment');
    const returnUrl = `https://dakkho-student.pages.dev/payment-result?pp_id={pp_id}&payment_id=${paymentId}`;
    const webhookUrl = `https://dakkho-admin-api.dakkho-admin.workers.dev/api/payments/piprapay/webhook`;

    const result = await createPipraPayPayment(c.env, {
      full_name: fullName,
      email_address: email,
      mobile_number: phone || '0000000000',
      amount: finalAmount,
      currency: 'BDT',
      return_url: returnUrl,
      webhook_url: webhookUrl,
      metadata: {
        user_id: auth.userId,
        package_id: packageId,
        course_id: p.course_id,
        payment_id: paymentId,
        duo_member_email: duoMemberEmail || null,
      },
    });

    if ('error' in result) {
      // Update payment as failed
      await c.env.DB.prepare(
        "UPDATE payments SET status = 'failed', metadata = ? WHERE id = ?"
      ).bind(JSON.stringify({ error: result.error }), paymentId).run();

      return c.json({ error: result.error }, 400);
    }

    // Store pp_id in payment row
    await c.env.DB.prepare(
      'UPDATE payments SET gateway_payment_id = ?, gateway_trx_id = ? WHERE id = ?'
    ).bind(result.pp_id, result.pp_id, paymentId).run();

    return c.json({
      success: true,
      pp_id: result.pp_id,
      pp_url: result.pp_url,
      payment_id: paymentId,
    });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// POST /payments/verify — Verify PipraPay payment status
studentApiRoutes.post('/payments/verify', async (c) => {
  try {
    const auth = await getStudentAuth(c);
    if (!auth.authorized) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { pp_id } = await c.req.json();
    if (!pp_id) {
      return c.json({ error: 'pp_id is required' }, 400);
    }

    // Find the payment in D1
    const payment = await c.env.DB.prepare(
      'SELECT * FROM payments WHERE gateway_payment_id = ? OR gateway_trx_id = ? ORDER BY created_at DESC LIMIT 1'
    ).bind(pp_id, pp_id).first();

    if (!payment) {
      return c.json({ error: 'Payment not found' }, 404);
    }

    const p = payment as any;

    // If already verified, return status directly
    if (p.status === 'verified') {
      return c.json({
        status: 'completed',
        amount: p.amount,
        gateway: p.gateway,
        transaction_id: p.gateway_trx_id,
        enrolled_course_id: p.course_id,
      });
    }

    // Verify with PipraPay API
    const { verifyPipraPayPayment } = await import('../lib/payment');
    const result = await verifyPipraPayPayment(c.env, pp_id);

    if ('error' in result) {
      return c.json({
        status: 'error',
        amount: p.amount,
        gateway: p.gateway,
        transaction_id: p.gateway_trx_id,
        message: result.error,
      });
    }

    // Map PipraPay status to our system
    const mappedStatus = result.status?.toLowerCase();
    if (mappedStatus === 'completed' && p.status !== 'verified') {
      // Auto-verify and activate package
      await c.env.DB.prepare(`
        UPDATE payments SET status = 'verified', gateway_trx_id = ?, verified_at = datetime('now'), updated_at = datetime('now') WHERE id = ?
      `).bind(pp_id, p.id).run();

      // Auto-activate package
      if (p.package_id && p.course_id) {
        await autoActivatePackage(c.env, p.user_id, p.package_id, p.course_id);
      }

      return c.json({
        status: 'completed',
        amount: p.amount,
        gateway: p.gateway,
        transaction_id: pp_id,
        enrolled_course_id: p.course_id,
      });
    } else if (mappedStatus === 'failed') {
      await c.env.DB.prepare(
        "UPDATE payments SET status = 'failed', updated_at = datetime('now') WHERE id = ?"
      ).bind(p.id).run();

      return c.json({
        status: 'failed',
        amount: p.amount,
        gateway: p.gateway,
        transaction_id: pp_id,
        message: 'Payment was not completed successfully.',
      });
    } else {
      // Still pending or other status
      return c.json({
        status: 'pending',
        amount: p.amount,
        gateway: p.gateway,
        transaction_id: pp_id,
        message: 'Payment is still being processed.',
      });
    }
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// POST /payments/piprapay/webhook — PipraPay webhook callback (NO auth)
studentApiRoutes.post('/payments/piprapay/webhook', async (c) => {
  try {
    // Get raw body for signature verification
    const rawBody = await c.req.text();
    const signatureHeader = c.req.header('hh_signature');

    // Verify webhook signature
    const { verifyPipraPayWebhookSignature } = await import('../lib/payment');
    const sigResult = await verifyPipraPayWebhookSignature(c.env, rawBody, signatureHeader);
    if (!sigResult.valid) {
      console.warn('PipraPay webhook signature invalid:', sigResult.reason);
      return c.json({ error: 'Invalid signature' }, 403);
    }
    if (sigResult.reason) {
      console.warn('PipraPay webhook signature warning:', sigResult.reason);
    }

    const body = JSON.parse(rawBody);
    const { pp_id, status, amount, currency, payment_method, metadata } = body;

    if (!pp_id || !status) {
      return c.json({ error: 'Invalid webhook payload' }, 400);
    }

    // Find payment by pp_id (could be in gateway_payment_id or gateway_trx_id)
    const payment = await c.env.DB.prepare(
      'SELECT * FROM payments WHERE gateway_payment_id = ? OR gateway_trx_id = ? ORDER BY created_at DESC LIMIT 1'
    ).bind(pp_id, pp_id).first();

    if (!payment) {
      // Payment not found — could be from a different system or not yet inserted
      // Try to find by metadata.payment_id
      if (metadata?.payment_id) {
        const altPayment = await c.env.DB.prepare(
          'SELECT * FROM payments WHERE id = ?'
        ).bind(metadata.payment_id).first();

        if (altPayment) {
          const ap = altPayment as any;
          // Idempotency check: already processed?
          if (ap.status === 'verified' || ap.status === 'refunded') {
            return c.json({ success: true, message: 'Already processed' });
          }

          const mappedStatus = status?.toLowerCase();
          if (mappedStatus === 'completed') {
            await c.env.DB.prepare(`
              UPDATE payments SET status = 'verified', gateway_payment_id = ?, gateway_trx_id = ?, verified_at = datetime('now'), updated_at = datetime('now')
              WHERE id = ?
            `).bind(pp_id, pp_id, ap.id).run();

            if (ap.package_id && ap.course_id) {
              await autoActivatePackage(c.env, ap.user_id, ap.package_id, ap.course_id);
            }
          } else if (mappedStatus === 'failed') {
            await c.env.DB.prepare(
              "UPDATE payments SET status = 'failed', updated_at = datetime('now') WHERE id = ?"
            ).bind(ap.id).run();
          } else if (mappedStatus === 'refunded') {
            await c.env.DB.prepare(`
              UPDATE payments SET status = 'refunded', updated_at = datetime('now') WHERE id = ?
            `).bind(ap.id).run();

            // Deactivate user package
            if (ap.package_id) {
              await c.env.DB.prepare(`
                UPDATE user_packages SET status = 'cancelled' WHERE user_id = ? AND package_id = ? AND status = 'active'
              `).bind(ap.user_id, ap.package_id).run();
            }
          }

          return c.json({ success: true });
        }
      }

      return c.json({ error: 'Payment not found' }, 404);
    }

    const p = payment as any;

    // Idempotency check: already processed?
    if (p.status === 'verified' || p.status === 'refunded') {
      return c.json({ success: true, message: 'Already processed' });
    }

    const mappedStatus = status?.toLowerCase();

    if (mappedStatus === 'completed') {
      await c.env.DB.prepare(`
        UPDATE payments SET status = 'verified', gateway_payment_id = ?, gateway_trx_id = ?, verified_at = datetime('now'), updated_at = datetime('now')
        WHERE id = ?
      `).bind(pp_id, pp_id, p.id).run();

      // Auto-activate package
      if (p.package_id && p.course_id) {
        await autoActivatePackage(c.env, p.user_id, p.package_id, p.course_id);
      }
    } else if (mappedStatus === 'failed') {
      await c.env.DB.prepare(
        "UPDATE payments SET status = 'failed', updated_at = datetime('now') WHERE id = ?"
      ).bind(p.id).run();
    } else if (mappedStatus === 'refunded') {
      await c.env.DB.prepare(
        "UPDATE payments SET status = 'refunded', updated_at = datetime('now') WHERE id = ?"
      ).bind(p.id).run();

      // Deactivate user package
      if (p.package_id) {
        await c.env.DB.prepare(`
          UPDATE user_packages SET status = 'cancelled' WHERE user_id = ? AND package_id = ? AND status = 'active'
        `).bind(p.user_id, p.package_id).run();
      }
    }

    return c.json({ success: true });
  } catch (error) {
    // Always return 200 to PipraPay so they don't retry unnecessarily
    console.error('PipraPay webhook error:', error);
    return c.json({ success: true, error: 'Internal error' });
  }
});

// NOTE: /packages/mine is already defined above (line 316 area) — duplicate removed

// ═══════════════════════════════════════════════════
// NOTIFICATION SETTINGS (auth required, NO email verification required)
// Students should be able to configure notification prefs even before verifying email
// ═══════════════════════════════════════════════════

studentApiRoutes.get('/settings', async (c) => {
  try {
    const auth = await getStudentAuth(c);
    if (!auth.authorized) {
      return c.json({ error: 'Unauthorized — login required' }, 401);
    }

    const userId = auth.userId!;

    // Ensure a notification_preferences row exists for this user
    let prefs = await c.env.DB.prepare(
      'SELECT * FROM notification_preferences WHERE user_id = ?'
    ).bind(userId).first();

    if (!prefs) {
      // Create default preferences row
      await c.env.DB.prepare(
        'INSERT OR IGNORE INTO notification_preferences (user_id) VALUES (?)'
      ).bind(userId).run();
      prefs = await c.env.DB.prepare(
        'SELECT * FROM notification_preferences WHERE user_id = ?'
      ).bind(userId).first();
    }

    if (!prefs) {
      return c.json({
        preferences: {
          pushEnabled: true,
          emailEnabled: true,
          smsEnabled: false,
          quietHoursEnabled: false,
          quietHoursStart: '22:00',
          quietHoursEnd: '08:00',
          courseUpdates: { push: true, email: true },
          grades: { push: true, email: true },
          schedule: { push: true, email: true },
          payment: { push: true, email: true },
          promotions: { push: false, email: false },
          social: { push: true, email: false },
          system: { push: true, email: true },
        },
      });
    }

    const p = prefs as any;
    return c.json({
      preferences: {
        pushEnabled: !!p.push_enabled,
        emailEnabled: !!p.email_enabled,
        smsEnabled: !!p.sms_enabled,
        quietHoursEnabled: !!p.quiet_hours_enabled,
        quietHoursStart: p.quiet_hours_start || '22:00',
        quietHoursEnd: p.quiet_hours_end || '08:00',
        courseUpdates: { push: !!p.course_updates_push, email: !!p.course_updates_email },
        grades: { push: !!p.grades_push, email: !!p.grades_email },
        schedule: { push: !!p.schedule_push, email: !!p.schedule_email },
        payment: { push: !!p.payment_push, email: !!p.payment_email },
        promotions: { push: !!p.promotions_push, email: !!p.promotions_email },
        social: { push: !!p.social_push, email: !!p.social_email },
        system: { push: !!p.system_push, email: !!p.system_email },
      },
    });
  } catch (error) {
    console.error('GET /settings error:', getErrorMessage(error));
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

studentApiRoutes.put('/settings', async (c) => {
  try {
    const auth = await getStudentAuth(c);
    if (!auth.authorized) {
      return c.json({ error: 'Unauthorized — login required' }, 401);
    }

    const userId = auth.userId!;
    const prefs = await c.req.json();

    await c.env.DB.prepare(`
      INSERT INTO notification_preferences (
        user_id, push_enabled, email_enabled, sms_enabled,
        quiet_hours_enabled, quiet_hours_start, quiet_hours_end,
        course_updates_push, course_updates_email,
        grades_push, grades_email,
        schedule_push, schedule_email,
        payment_push, payment_email,
        promotions_push, promotions_email,
        social_push, social_email,
        system_push, system_email
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        push_enabled = excluded.push_enabled,
        email_enabled = excluded.email_enabled,
        sms_enabled = excluded.sms_enabled,
        quiet_hours_enabled = excluded.quiet_hours_enabled,
        quiet_hours_start = excluded.quiet_hours_start,
        quiet_hours_end = excluded.quiet_hours_end,
        course_updates_push = excluded.course_updates_push,
        course_updates_email = excluded.course_updates_email,
        grades_push = excluded.grades_push,
        grades_email = excluded.grades_email,
        schedule_push = excluded.schedule_push,
        schedule_email = excluded.schedule_email,
        payment_push = excluded.payment_push,
        payment_email = excluded.payment_email,
        promotions_push = excluded.promotions_push,
        promotions_email = excluded.promotions_email,
        social_push = excluded.social_push,
        social_email = excluded.social_email,
        system_push = excluded.system_push,
        system_email = excluded.system_email,
        updated_at = datetime('now')
    `).bind(
      userId,
      prefs.pushEnabled ? 1 : 0,
      prefs.emailEnabled ? 1 : 0,
      prefs.smsEnabled ? 1 : 0,
      prefs.quietHoursEnabled ? 1 : 0,
      prefs.quietHoursStart || '22:00',
      prefs.quietHoursEnd || '08:00',
      prefs.courseUpdates?.push ? 1 : 0,
      prefs.courseUpdates?.email ? 1 : 0,
      prefs.grades?.push ? 1 : 0,
      prefs.grades?.email ? 1 : 0,
      prefs.schedule?.push ? 1 : 0,
      prefs.schedule?.email ? 1 : 0,
      prefs.payment?.push ? 1 : 0,
      prefs.payment?.email ? 1 : 0,
      prefs.promotions?.push ? 1 : 0,
      prefs.promotions?.email ? 1 : 0,
      prefs.social?.push ? 1 : 0,
      prefs.social?.email ? 1 : 0,
      prefs.system?.push ? 1 : 0,
      prefs.system?.email ? 1 : 0
    ).run();

    return c.json({ success: true });
  } catch (error) {
    console.error('PUT /settings error:', getErrorMessage(error));
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// ═══════════════════════════════════════════════════
// AUTHENTICATED STUDENT ROUTES (middleware-based)
// ═══════════════════════════════════════════════════

const studentAuthenticated = new Hono<{ Bindings: Env; Variables: StudentAuthVariables }>();
studentAuthenticated.use('*', studentAuthMiddleware);

// ─── Notifications (D1) ───

studentAuthenticated.get('/notifications', async (c) => {
  try {
    const userId = c.get('studentId');
    const limit = parseInt(c.req.query('limit') || '20');
    const offset = parseInt(c.req.query('offset') || '0');
    const unreadOnly = c.req.query('unread') === 'true';

    let where = 'WHERE user_id = ?';
    const params: unknown[] = [userId];

    if (unreadOnly) {
      where += ' AND read = 0';
    }

    const countResult = await c.env.DB.prepare(
      `SELECT COUNT(*) as total FROM notifications ${where}`
    ).bind(...params).first();
    const total = (countResult as any)?.total || 0;

    const result = await c.env.DB.prepare(
      `SELECT * FROM notifications ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
    ).bind(...params, limit, offset).all();

    const notifications = (result.results as any[]).map(row => ({
      id: row.id,
      title: row.title || '',
      message: row.message || '',
      type: row.type || 'info',
      category: row.category || '',
      actionUrl: row.action_url || '',
      read: !!row.read,
      createdAt: row.created_at,
    }));

    return c.json({ notifications, total });
  } catch (error) {
    return c.json({ notifications: [], total: 0 });
  }
});

studentAuthenticated.put('/notifications/:id/read', async (c) => {
  try {
    const userId = c.get('studentId');
    const notifId = c.req.param('id');

    // Verify this notification belongs to the user
    const notif = await c.env.DB.prepare(
      'SELECT * FROM notifications WHERE id = ? AND user_id = ?'
    ).bind(notifId, userId).first();

    if (!notif) {
      return c.json({ error: 'Notification not found' }, 404);
    }

    await c.env.DB.prepare(
      'UPDATE notifications SET read = 1 WHERE id = ?'
    ).bind(notifId).run();

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

studentAuthenticated.put('/notifications/read-all', async (c) => {
  try {
    const userId = c.get('studentId');

    const result = await c.env.DB.prepare(
      'UPDATE notifications SET read = 1 WHERE user_id = ? AND read = 0'
    ).bind(userId).run();

    return c.json({ success: true, count: result.meta?.changes || 0 });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// ─── Profile Stats ───

studentAuthenticated.get('/profile/stats', async (c) => {
  try {
    const userId = c.get('studentId');

    // Get enrolled courses count
    let coursesEnrolled = 0;
    try {
      const enrollResult = await c.env.DB.prepare(
        'SELECT COUNT(*) as total FROM enrollments WHERE user_id = ?'
      ).bind(userId).first();
      coursesEnrolled = (enrollResult as any)?.total || 0;
    } catch {}

    // Get certificates count
    let certificates = 0;
    try {
      const certResult = await c.env.DB.prepare(
        "SELECT COUNT(*) as count FROM user_packages WHERE user_id = ? AND status = 'completed'"
      ).bind(userId).first();
      certificates = (certResult as any)?.count || 0;
    } catch {}

    // Calculate current streak
    let currentStreak = 0;
    try {
      const activities = await c.env.DB.prepare(
        "SELECT DISTINCT date(created_at) as day FROM student_activity WHERE user_id = ? ORDER BY day DESC LIMIT 30"
      ).bind(userId).all();

      const days = (activities.results as any[]).map(r => r.day);
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

      if (days.length > 0 && (days[0] === today || days[0] === yesterday)) {
        currentStreak = 1;
        for (let i = 1; i < days.length; i++) {
          const prev = new Date(days[i - 1]);
          const curr = new Date(days[i]);
          const diff = (prev.getTime() - curr.getTime()) / 86400000;
          if (diff === 1) {
            currentStreak++;
          } else {
            break;
          }
        }
      }
    } catch {}

    // Get user document for phone, bio, semester, avatarUrl
    const userDoc = await getStudentUserDoc(c.env, userId);
    const u = userDoc as any;

    // Get hours watched from student_activity
    let hoursWatched = 0;
    try {
      const watchResult = await c.env.DB.prepare(
        "SELECT SUM(CASE WHEN metadata LIKE '%watchMinutes%' THEN CAST(json_extract(metadata, '$.watchMinutes') AS REAL) ELSE 0 END) as total_minutes FROM student_activity WHERE user_id = ? AND activity_type = 'video_watch'"
      ).bind(userId).first();
      hoursWatched = Math.round(((watchResult as any)?.total_minutes || 0) / 60 * 10) / 10;
    } catch {}

    return c.json({
      stats: {
        coursesEnrolled,
        hoursWatched,
        certificates,
        currentStreak,
      },
      profile: {
        phone: u?.phone || '',
        bio: u?.bio || '',
        semester: u?.semester || '',
        avatarUrl: u?.avatar_url || '',
      },
    });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// ─── Leaderboard ───

studentAuthenticated.get('/leaderboard', async (c) => {
  try {
    const technology = c.req.query('technology') || '';
    const period = c.req.query('period') || 'week';
    const limit = parseInt(c.req.query('limit') || '20');
    const userId = c.get('studentId');

    // Try KV cache first
    const cacheKey = `leaderboard:${technology}:${period}`;
    const cached = await c.env.KV_CONFIG.get(cacheKey, 'json');
    if (cached) {
      const result = cached as any;
      const yourEntry = result.entries.find((e: any) => e.userId === userId);
      result.yourRank = yourEntry ? yourEntry.rank : null;
      result.yourXp = yourEntry ? yourEntry.xp : 0;
      return c.json(result);
    }

    let dateFilter = '';
    if (period === 'day') {
      dateFilter = `AND created_at >= date('now', '-1 day')`;
    } else if (period === 'week') {
      dateFilter = `AND created_at >= date('now', '-7 days')`;
    } else if (period === 'month') {
      dateFilter = `AND created_at >= date('now', '-30 days')`;
    }

    const d1Query = `
      SELECT
        user_id,
        SUM(CASE WHEN activity_type = 'video_watch' THEN 10 ELSE 0 END) as video_xp,
        SUM(CASE WHEN activity_type = 'quiz_complete' THEN 15 ELSE 0 END) as quiz_xp,
        SUM(CASE WHEN activity_type = 'assignment_submit' THEN 20 ELSE 0 END) as assignment_xp,
        SUM(CASE WHEN activity_type = 'streak_bonus' THEN 5 ELSE 0 END) as streak_xp,
        COUNT(DISTINCT date(created_at)) as active_days,
        COUNT(*) as total_activities
      FROM student_activity
      WHERE 1=1 ${dateFilter}
      GROUP BY user_id
      ORDER BY total_activities DESC
      LIMIT ?
    `;

    const result = await c.env.DB.prepare(d1Query).bind(limit).all();

    const entries = [];
    let rank = 1;
    let yourRank = null;
    let yourXp = 0;

    for (const row of result.results as any[]) {
      let userName = 'Student';
      let userTechnology = '';

      try {
        const userDoc = await getStudentUserDoc(c.env, row.user_id);
        const u = userDoc as any;
        userName = u?.full_name || u?.name || 'Student';
        userTechnology = u?.technology || '';
      } catch {}

      if (technology && userTechnology !== technology) continue;

      const totalXp = (row.video_xp || 0) + (row.quiz_xp || 0) + (row.assignment_xp || 0) + (row.streak_xp || 0);

      if (row.user_id === userId) {
        yourRank = rank;
        yourXp = totalXp;
      }

      entries.push({
        rank,
        userId: row.user_id,
        name: userName,
        technology: userTechnology,
        xp: totalXp,
        breakdown: {
          video: row.video_xp || 0,
          quiz: row.quiz_xp || 0,
          assignment: row.assignment_xp || 0,
          streak: row.streak_xp || 0,
        },
        activeDays: row.active_days || 0,
        coursesCompleted: 0,
      });

      rank++;
    }

    if (!yourRank) {
      yourXp = 0;
    }

    const response = {
      entries,
      yourRank,
      yourXp,
      period,
      technology: technology || 'all',
    };

    await c.env.KV_CONFIG.put(cacheKey, JSON.stringify(response), { expirationTtl: 300 });

    return c.json(response);
  } catch (error) {
    return c.json({ entries: [], yourRank: null, yourXp: 0, error: getErrorMessage(error) }, 500);
  }
});

// ─── Achievements ───

studentAuthenticated.get('/achievements', async (c) => {
  try {
    const userId = c.get('studentId');

    const definitions = await c.env.DB.prepare(
      'SELECT * FROM achievement_definitions WHERE is_active = 1 ORDER BY category, xp ASC'
    ).all();

    const unlocked = await c.env.DB.prepare(
      'SELECT * FROM student_achievements WHERE user_id = ?'
    ).bind(userId).all();

    const unlockedMap = new Map<number, string>();
    for (const row of (unlocked.results as any[])) {
      unlockedMap.set(row.achievement_id, row.unlocked_at);
    }

    const achievements = (definitions.results as any[]).map(def => ({
      id: def.id,
      slug: def.slug,
      name: def.name,
      nameBn: def.name_bn,
      description: def.description,
      descriptionBn: def.description_bn,
      category: def.category,
      icon: def.icon,
      xp: def.xp,
      conditionType: def.condition_type,
      unlocked: unlockedMap.has(def.id),
      unlockedAt: unlockedMap.get(def.id) || null,
    }));

    const totalXp = achievements.filter(a => a.unlocked).reduce((sum, a) => sum + a.xp, 0);
    const unlockedCount = achievements.filter(a => a.unlocked).length;

    return c.json({
      achievements,
      totalXp,
      unlockedCount,
      totalCount: achievements.length,
    });
  } catch (error) {
    return c.json({ achievements: [], totalXp: 0, unlockedCount: 0, totalCount: 0 });
  }
});

// ─── Activity Log ───

studentAuthenticated.get('/activity', async (c) => {
  try {
    const userId = c.get('studentId');
    const limit = parseInt(c.req.query('limit') || '20');
    const offset = parseInt(c.req.query('offset') || '0');
    const activityType = c.req.query('type') || '';

    let query = 'SELECT * FROM student_activity WHERE user_id = ?';
    const params: any[] = [userId];

    if (activityType) {
      query += ' AND activity_type = ?';
      params.push(activityType);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const result = await c.env.DB.prepare(query).bind(...params).all();

    const activities = (result.results as any[]).map(row => ({
      id: row.id,
      type: row.activity_type,
      resourceType: row.resource_type,
      resourceId: row.resource_id,
      title: row.title,
      description: row.description,
      metadata: row.metadata ? JSON.parse(row.metadata) : {},
      createdAt: row.created_at,
    }));

    return c.json({ activities, total: result.results.length });
  } catch (error) {
    return c.json({ activities: [], total: 0 });
  }
});

// ─── Profile Update ───

studentAuthenticated.put('/profile', async (c) => {
  try {
    const userId = c.get('studentId');
    const body = await c.req.json();

    const allowedFields = ['full_name', 'phone', 'bio', 'semester', 'technology', 'institute_id'];
    const setClauses: string[] = [];
    const setValues: unknown[] = [];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        setClauses.push(`${field} = ?`);
        setValues.push(body[field]);
      }
    }

    // Also handle 'name' as 'full_name'
    if (body.name !== undefined && !body.full_name) {
      setClauses.push('full_name = ?');
      setValues.push(body.name);
    }

    // Also handle 'instituteId' as 'institute_id' (camelCase from client)
    if (body.instituteId !== undefined && !body.institute_id) {
      setClauses.push('institute_id = ?');
      setValues.push(body.instituteId);
    }

    if (setClauses.length === 0) {
      return c.json({ error: 'No valid fields to update' }, 400);
    }

    setClauses.push("updated_at = datetime('now')");
    setValues.push(userId);

    await c.env.DB.prepare(
      `UPDATE users SET ${setClauses.join(', ')} WHERE id = ?`
    ).bind(...setValues).run();

    // Log activity
    await c.env.DB.prepare(`
      INSERT INTO student_activity (user_id, activity_type, resource_type, title, description)
      VALUES (?, 'profile_update', 'profile', 'Profile Updated', 'Updated profile information')
    `).bind(userId).run();

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// ─── Avatar Upload ───

studentAuthenticated.post('/upload-avatar', async (c) => {
  try {
    const userId = c.get('studentId');
    const formData = await c.req.formData();
    const file = formData.get('avatar') as File | null;

    if (!file) {
      return c.json({ error: 'Avatar file required' }, 400);
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return c.json({ error: 'Invalid file type. Use JPEG, PNG, WebP, or GIF.' }, 400);
    }

    if (file.size > 2 * 1024 * 1024) {
      return c.json({ error: 'File too large. Maximum 2MB.' }, 400);
    }

    const key = `${userId}/${Date.now()}-${file.name}`;
    await c.env.R2_AVATARS.put(key, file.stream(), {
      httpMetadata: { contentType: file.type },
    });

    const baseUrl = new URL(c.req.url).origin;
    const avatarUrl = `${baseUrl}/upload/avatars/${key}`;

    // Update user in D1
    await c.env.DB.prepare(
      "UPDATE users SET avatar_url = ?, updated_at = datetime('now') WHERE id = ?"
    ).bind(avatarUrl, userId).run();

    // Log activity
    await c.env.DB.prepare(`
      INSERT INTO student_activity (user_id, activity_type, resource_type, title, description)
      VALUES (?, 'avatar_upload', 'profile', 'Avatar Updated', 'Updated profile picture')
    `).bind(userId).run();

    return c.json({ success: true, avatarUrl });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// ─── User Preferences (Theme, Privacy, Appearance) ───
// NOTE: Notification settings routes are defined above (outside studentAuthenticated)
// so they work even for unverified-email students

const DEFAULT_PREFERENCES = {
  themeMode: 'system',
  accentColor: '#0ea5e9',
  fontSize: 16,
  borderRadius: 16,
  compactMode: false,
  profileVisibility: 'Friends',
  searchVisible: true,
  showEmail: false,
  showPhone: false,
  showProgress: true,
  activityStatus: true,
  readReceipts: true,
  dataSharing: false,
  analyticsOptOut: false,
  personalizedRecommendations: true,
  cookieConsent: 'essential',
  contentProtectionEnabled: true,
  noCopy: true,
  noRightClick: true,
  noScreenshot: false,
  downloadQuality: '720p',
  wifiOnly: false,
  language: 'bn',
};

studentAuthenticated.get('/preferences', async (c) => {
  try {
    const userId = c.get('studentId');

    const row = await c.env.DB.prepare(
      'SELECT * FROM user_preferences WHERE user_id = ?'
    ).bind(userId).first();

    if (!row) {
      return c.json({ preferences: DEFAULT_PREFERENCES });
    }

    const r = row as any;
    return c.json({
      preferences: {
        themeMode: r.theme_mode || 'system',
        accentColor: r.accent_color || '#0ea5e9',
        fontSize: r.font_size || 16,
        borderRadius: r.border_radius || 16,
        compactMode: !!r.compact_mode,
        profileVisibility: r.profile_visibility || 'Friends',
        searchVisible: !!r.search_visible,
        showEmail: !!r.show_email,
        showPhone: !!r.show_phone,
        showProgress: !!r.show_progress,
        activityStatus: !!r.activity_status,
        readReceipts: !!r.read_receipts,
        dataSharing: !!r.data_sharing,
        analyticsOptOut: !!r.analytics_opt_out,
        personalizedRecommendations: !!r.personalized_recommendations,
        cookieConsent: r.cookie_consent || 'essential',
        contentProtectionEnabled: !!r.content_protection_enabled,
        noCopy: !!r.no_copy,
        noRightClick: !!r.no_right_click,
        noScreenshot: !!r.no_screenshot,
        downloadQuality: r.download_quality || '720p',
        wifiOnly: !!r.wifi_only,
        language: r.language || 'bn',
      },
    });
  } catch (error) {
    return c.json({ preferences: DEFAULT_PREFERENCES });
  }
});

studentAuthenticated.put('/preferences', async (c) => {
  try {
    const userId = c.get('studentId');
    const prefs = await c.req.json();

    await c.env.DB.prepare(`
      INSERT INTO user_preferences (
        user_id, theme_mode, accent_color, font_size, border_radius, compact_mode,
        profile_visibility, search_visible, show_email, show_phone, show_progress,
        activity_status, read_receipts, data_sharing, analytics_opt_out,
        personalized_recommendations, cookie_consent,
        content_protection_enabled, no_copy, no_right_click, no_screenshot,
        download_quality, wifi_only, language
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        theme_mode = excluded.theme_mode,
        accent_color = excluded.accent_color,
        font_size = excluded.font_size,
        border_radius = excluded.border_radius,
        compact_mode = excluded.compact_mode,
        profile_visibility = excluded.profile_visibility,
        search_visible = excluded.search_visible,
        show_email = excluded.show_email,
        show_phone = excluded.show_phone,
        show_progress = excluded.show_progress,
        activity_status = excluded.activity_status,
        read_receipts = excluded.read_receipts,
        data_sharing = excluded.data_sharing,
        analytics_opt_out = excluded.analytics_opt_out,
        personalized_recommendations = excluded.personalized_recommendations,
        cookie_consent = excluded.cookie_consent,
        content_protection_enabled = excluded.content_protection_enabled,
        no_copy = excluded.no_copy,
        no_right_click = excluded.no_right_click,
        no_screenshot = excluded.no_screenshot,
        download_quality = excluded.download_quality,
        wifi_only = excluded.wifi_only,
        language = excluded.language,
        updated_at = datetime('now')
    `).bind(
      userId,
      prefs.themeMode || 'system',
      prefs.accentColor || '#0ea5e9',
      prefs.fontSize || 16,
      prefs.borderRadius || 16,
      prefs.compactMode ? 1 : 0,
      prefs.profileVisibility || 'Friends',
      prefs.searchVisible ? 1 : 0,
      prefs.showEmail ? 1 : 0,
      prefs.showPhone ? 1 : 0,
      prefs.showProgress ? 1 : 0,
      prefs.activityStatus ? 1 : 0,
      prefs.readReceipts ? 1 : 0,
      prefs.dataSharing ? 1 : 0,
      prefs.analyticsOptOut ? 1 : 0,
      prefs.personalizedRecommendations ? 1 : 0,
      prefs.cookieConsent || 'essential',
      prefs.contentProtectionEnabled ? 1 : 0,
      prefs.noCopy ? 1 : 0,
      prefs.noRightClick ? 1 : 0,
      prefs.noScreenshot ? 1 : 0,
      prefs.downloadQuality || '720p',
      prefs.wifiOnly ? 1 : 0,
      prefs.language || 'bn'
    ).run();

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// Mount authenticated routes
studentApiRoutes.route('/', studentAuthenticated);

// ═══════════════════════════════════════════════════
// ENROLLMENT & PAYMENT ROUTES (Piprapay)
// ═══════════════════════════════════════════════════

// GET /enrollments/mine — List all enrollments for the current user
studentApiRoutes.get('/enrollments/mine', async (c) => {
  try {
    const auth = await getStudentAuth(c);
    if (!auth.authorized || !auth.userId) {
      return c.json({ error: 'Login required' }, 401);
    }

    const result = await c.env.DB.prepare(`
      SELECT e.*, c.title as course_title, c.thumbnail_url as course_thumbnail,
             c.description as course_description, c.price as course_price,
             c.level as course_level, c.technology_id as course_technology_id,
             c.is_published, c.duration as course_duration,
             c.total_videos as course_total_videos,
             c.rating as course_rating, c.is_featured as course_is_featured
      FROM enrollments e
      LEFT JOIN courses c ON e.course_id = c.id
      WHERE e.user_id = ?
      ORDER BY e.created_at DESC
    `).bind(auth.userId).all();

    // Filter out expired enrollments and unpublished courses
    const activeEnrollments = (result.results as any[]).filter((enr) => {
      if (enr.status === 'expired') return false;
      if (enr.expires_at && new Date(enr.expires_at) < new Date()) return false;
      return true;
    });

    return c.json({ enrollments: activeEnrollments });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// GET /enrollments/check — Check enrollment status for a course
studentApiRoutes.get('/enrollments/check', async (c) => {
  try {
    const courseId = c.req.query('course_id');
    if (!courseId) {
      return c.json({ error: 'course_id required' }, 400);
    }

    // Optional auth — works for both logged-in and anonymous users
    const auth = await getStudentAuth(c);

    let enrolled = false;
    let enrollment = null;
    let paymentStatus = 'none';

    if (auth.authorized && auth.userId) {
      // Check enrollment
      const enrollmentRecord = await c.env.DB.prepare(
        'SELECT * FROM enrollments WHERE user_id = ? AND course_id = ?'
      ).bind(auth.userId, courseId).first();
      
      if (enrollmentRecord) {
        enrolled = true;
        enrollment = enrollmentRecord;
        // Check if expired
        const enr = enrollmentRecord as any;
        if (enr.status === 'expired' || (enr.expires_at && new Date(enr.expires_at) < new Date())) {
          enrolled = false;
          paymentStatus = 'expired';
        }
      }

      // Check pending payment
      if (!enrolled) {
        const pendingPayment = await c.env.DB.prepare(
          "SELECT * FROM payments WHERE user_id = ? AND course_id = ? AND status = 'pending' ORDER BY created_at DESC LIMIT 1"
        ).bind(auth.userId, courseId).first();
        
        if (pendingPayment) {
          paymentStatus = 'pending';
        }
      }
    }

    return c.json({ enrolled, enrollment, paymentStatus });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// POST /enroll — Free course auto-enrollment
studentApiRoutes.post('/enroll', async (c) => {
  try {
    const auth = await getStudentAuth(c);
    if (!auth.authorized) {
      return c.json({ error: 'Login required' }, 401);
    }
    if (!auth.emailVerified) {
      return c.json({ error: 'Email verification required', code: 'EMAIL_NOT_VERIFIED' }, 403);
    }

    const { course_id, package_id } = await c.req.json();
    if (!course_id) {
      return c.json({ error: 'course_id required' }, 400);
    }

    // Check if already enrolled
    const existing = await c.env.DB.prepare(
      'SELECT id FROM enrollments WHERE user_id = ? AND course_id = ?'
    ).bind(auth.userId, course_id).first();
    
    if (existing) {
      return c.json({ error: 'Already enrolled in this course', enrolled: true }, 400);
    }

    // Verify course exists and is free (or has a free package)
    const course = await c.env.DB.prepare(
      'SELECT id, price FROM courses WHERE id = ? AND is_published = 1'
    ).bind(course_id).first();

    if (!course) {
      return c.json({ error: 'Course not found' }, 404);
    }

    // For free enrollment, verify the course/package is actually free
    let packageIdToUse = package_id || null;
    let durationMonths: number | null = 6;

    if (package_id) {
      const pkg = await c.env.DB.prepare(
        'SELECT * FROM course_packages WHERE id = ? AND course_id = ? AND is_active = 1'
      ).bind(package_id, course_id).first() as any;

      if (!pkg) {
        return c.json({ error: 'Package not found' }, 404);
      }
      if (pkg.price > 0) {
        return c.json({ error: 'This package requires payment. Use /payments/create instead.' }, 400);
      }
      packageIdToUse = pkg.id;
      durationMonths = pkg.duration_months; // NULL = lifetime
    } else {
      // Check if course price is 0
      const coursePrice = (course as any).price;
      if (coursePrice > 0) {
        // Check if there's a free package
        const freePkg = await c.env.DB.prepare(
          'SELECT * FROM course_packages WHERE course_id = ? AND price = 0 AND is_active = 1 LIMIT 1'
        ).bind(course_id).first() as any;
        
        if (freePkg) {
          packageIdToUse = freePkg.id;
          durationMonths = freePkg.duration_months;
        } else {
          return c.json({ error: 'This course requires payment. Use /payments/create instead.' }, 400);
        }
      }
    }

    // Calculate expires_at: duration_months NULL means lifetime (expires_at = NULL)
    let expiresAt: string | null = null;
    if (durationMonths !== null && durationMonths > 0) {
      const expDate = new Date();
      expDate.setMonth(expDate.getMonth() + durationMonths);
      expiresAt = expDate.toISOString();
    }
    // duration_months IS NULL → expires_at = NULL (lifetime)

    // Create enrollment
    const enrollmentId = crypto.randomUUID();
    await c.env.DB.prepare(
      'INSERT INTO enrollments (id, user_id, course_id, package_id, expires_at, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, datetime("now"), datetime("now"))'
    ).bind(enrollmentId, auth.userId, course_id, packageIdToUse, expiresAt, 'active').run();

    return c.json({
      success: true,
      enrollment: {
        id: enrollmentId,
        user_id: auth.userId,
        course_id,
        package_id: packageIdToUse,
        expires_at: expiresAt,
        status: 'active',
      },
    });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});


// ─── Student Notifications ───

// GET /student/notifications — Get notifications for current student
studentApiRoutes.get('/student/notifications', studentAuthMiddleware, async (c) => {
  try {
    const userId = c.get('studentId');
    const limit = parseInt(c.req.query('limit') || '20');
    const offset = parseInt(c.req.query('offset') || '0');
    const unreadOnly = c.req.query('unread') === 'true';

    let query = 'SELECT * FROM notifications WHERE user_id = ?';
    const params: unknown[] = [userId];

    if (unreadOnly) {
      query += ' AND read = 0';
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const result = await c.env.DB.prepare(query).bind(...params).all();

    // Get total count and unread count
    const countResult = await c.env.DB.prepare(
      'SELECT COUNT(*) as total FROM notifications WHERE user_id = ?'
    ).bind(userId).first<{ total: number }>();

    const unreadResult = await c.env.DB.prepare(
      'SELECT COUNT(*) as total FROM notifications WHERE user_id = ? AND read = 0'
    ).bind(userId).first<{ total: number }>();

    return c.json({
      notifications: result.results,
      total: countResult?.total || 0,
      unreadCount: unreadResult?.total || 0,
    });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// PUT /student/notifications/:id/read — Mark notification as read
studentApiRoutes.put('/student/notifications/:id/read', studentAuthMiddleware, async (c) => {
  try {
    const userId = c.get('studentId');
    const notificationId = c.req.param('id');

    await c.env.DB.prepare(
      'UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?'
    ).bind(notificationId, userId).run();

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// PUT /student/notifications/read-all — Mark all notifications as read
studentApiRoutes.put('/student/notifications/read-all', studentAuthMiddleware, async (c) => {
  try {
    const userId = c.get('studentId');

    await c.env.DB.prepare(
      'UPDATE notifications SET read = 1 WHERE user_id = ? AND read = 0'
    ).bind(userId).run();

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// GET /student/profile/stats — Get student learning stats
studentApiRoutes.get('/student/profile/stats', studentAuthMiddleware, async (c) => {
  try {
    const userId = c.get('studentId');

    // Get enrollment count
    let enrolledCourses = 0;
    try {
      const enrollResult = await c.env.DB.prepare(
        'SELECT COUNT(*) as total FROM enrollments WHERE user_id = ?'
      ).bind(userId).first<{ total: number }>();
      enrolledCourses = enrollResult?.total || 0;
    } catch {}

    // Get completed courses
    let completedCourses = 0;
    try {
      const completedResult = await c.env.DB.prepare(
        'SELECT COUNT(*) as total FROM enrollments WHERE user_id = ? AND completed = 1'
      ).bind(userId).first<{ total: number }>();
      completedCourses = completedResult?.total || 0;
    } catch {}

    // Get total watch time
    let totalWatchTime = 0;
    try {
      const watchResult = await c.env.DB.prepare(
        'SELECT COALESCE(SUM(watch_time), 0) as total FROM watch_progress WHERE user_id = ?'
      ).bind(userId).first<{ total: number }>();
      totalWatchTime = watchResult?.total || 0;
    } catch {}

    // Get videos watched
    let videosWatched = 0;
    try {
      const videoResult = await c.env.DB.prepare(
        "SELECT COUNT(DISTINCT resource_id) as total FROM student_activity WHERE user_id = ? AND activity_type = 'watch'"
      ).bind(userId).first<{ total: number }>();
      videosWatched = videoResult?.total || 0;
    } catch {}

    // Get active packages
    let activePackages = 0;
    try {
      const pkgResult = await c.env.DB.prepare(
        "SELECT COUNT(*) as total FROM user_packages WHERE user_id = ? AND status = 'active'"
      ).bind(userId).first<{ total: number }>();
      activePackages = pkgResult?.total || 0;
    } catch {}

    // Get streak (consecutive days of activity)
    let streak = 0;
    try {
      const streakResult = await c.env.DB.prepare(
        `SELECT DATE(created_at) as day FROM student_activity WHERE user_id = ? GROUP BY DATE(created_at) ORDER BY day DESC LIMIT 30`
      ).bind(userId).all<{ day: string }>();

      if (streakResult.results.length > 0) {
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        const firstDay = streakResult.results[0].day;

        if (firstDay === today || firstDay === yesterday) {
          streak = 1;
          for (let i = 1; i < streakResult.results.length; i++) {
            const prevDate = new Date(streakResult.results[i - 1].day);
            const currDate = new Date(streakResult.results[i].day);
            const diffDays = Math.round((prevDate.getTime() - currDate.getTime()) / 86400000);
            if (diffDays === 1) {
              streak++;
            } else {
              break;
            }
          }
        }
      }
    } catch {}

    return c.json({
      stats: {
        enrolledCourses,
        completedCourses,
        totalWatchTime,
        videosWatched,
        activePackages,
        streak,
      },
    });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// PUT /student/profile — Update student profile
studentApiRoutes.put('/student/profile', studentAuthMiddleware, async (c) => {
  try {
    const userId = c.get('studentId');
    const body = await c.req.json();

    const fieldMapping: Record<string, string> = {
      name: 'full_name',
      fullName: 'full_name',
      phone: 'phone',
      bio: 'bio',
      semester: 'semester',
      instituteId: 'institute_id',
      technology: 'technology',
      avatarUrl: 'avatar_url',
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
    params.push(userId);

    await c.env.DB.prepare(
      `UPDATE users SET ${setClauses.join(', ')} WHERE id = ?`
    ).bind(...params).run();

    // Return updated user
    const updatedUser = await c.env.DB.prepare(
      'SELECT * FROM users WHERE id = ?'
    ).bind(userId).first();

    const u = updatedUser as any;
    const instituteName = await getInstituteName(c.env, u?.institute_id || null);
    const technologyName = await getTechnologyName(c.env, u?.technology || null);

    return c.json({
      success: true,
      user: {
        id: userId,
        name: u?.full_name || '',
        email: u?.email || '',
        phone: u?.phone || null,
        bio: u?.bio || null,
        semester: u?.semester || null,
        instituteId: u?.institute_id || null,
        instituteName: instituteName || null,
        technology: u?.technology || null,
        technologyName: technologyName || null,
        avatarUrl: u?.avatar_url || '',
      },
    });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// POST /student/upload-avatar — Upload student avatar
studentApiRoutes.post('/student/upload-avatar', studentAuthMiddleware, async (c) => {
  try {
    const userId = c.get('studentId');

    const formData = await c.req.formData();
    const avatarEntry = formData.get('avatar');
    if (!avatarEntry || typeof avatarEntry === 'string') {
      return c.json({ error: 'No avatar file provided' }, 400);
    }
    const file = avatarEntry as unknown as Blob & { name?: string; type?: string };

    // Clean up old avatar
    try {
      const existingRow = await c.env.DB.prepare(
        'SELECT avatar_url FROM users WHERE id = ?'
      ).bind(userId).first<{ avatar_url: string | null }>();
      const oldAvatarUrl = existingRow?.avatar_url;
      if (oldAvatarUrl) {
        const uploadMatch = oldAvatarUrl.match(/\/upload\/avatars\/(.+)$/);
        if (uploadMatch?.[1]) {
          await c.env.R2_AVATARS.delete(uploadMatch[1]);
        }
      }
    } catch {}

    // Upload to R2
    const key = `student/${userId}/${Date.now()}-${file.name || 'avatar'}`;
    const arrayBuffer = await file.arrayBuffer();
    await c.env.R2_AVATARS.put(key, arrayBuffer, {
      httpMetadata: { contentType: file.type || 'image/png' },
    });

    const avatarUrl = await getPublicUrl(c.env, 'avatars', key);

    // Update user
    await c.env.DB.prepare(
      'UPDATE users SET avatar_url = ?, updated_at = ? WHERE id = ?'
    ).bind(avatarUrl, new Date().toISOString(), userId).run();

    return c.json({ success: true, avatarUrl });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

export default studentApiRoutes;
