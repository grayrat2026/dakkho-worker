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

const studentApiRoutes = new Hono<{ Bindings: Env; Variables: StudentAuthVariables }>();

// ─── Helper: Get student auth from header ───
async function getStudentAuth(c: any): Promise<{ authorized: boolean; userId?: string; email?: string; name?: string }> {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { authorized: false };
  }
  const token = authHeader.substring(7);
  const result = await validateStudentSession(c.env, token);
  return result;
}

// ─── Helper: Hash password using Web Crypto API (SHA-256) ───
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
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

// ─── Helper: Transform Worker ServerConfig → Student-friendly format ───
function transformConfigForStudent(config: ServerConfig) {
  return {
    featureToggles: config.featureToggles,
    homePageSections: config.homePageSections.sections,
    sidebarVisibility: config.sidebarVisibility,
    bottomNavTabs: config.bottomNavTabs.tabs
      .filter((t) => t.enabled)
      .sort((a, b) => a.order - b.order)
      .map((t) => t.id),
    topBarElements: config.topBarElements,
    cardStyle: config.cardStyle,
    contentProtection: config.contentProtection,
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

    const result = await c.env.DB.prepare(
      'SELECT * FROM course_packages WHERE course_id = ? AND is_active = 1 ORDER BY price ASC'
    ).bind(courseId).all();

    return c.json({ packages: result.results });
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

    return c.json({ courses: result.results, total });
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

    return c.json({ course });
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

// ─── Video Streaming ───

studentApiRoutes.get('/video/stream-url', async (c) => {
  try {
    const auth = await getStudentAuth(c);
    if (!auth.authorized) {
      return c.json({ error: 'Unauthorized — login required to stream videos' }, 401);
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
        'SELECT course_id, is_preview FROM videos WHERE storage_key = ? OR id = ? LIMIT 1'
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

    // Generate and send email verification OTP
    const verifyOtp = String(Math.floor(100000 + Math.random() * 900000));
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    await c.env.DB.prepare(
      'INSERT INTO password_reset_otps (email, otp, expires_at, used) VALUES (?, ?, ?, 0)'
    ).bind(email, verifyOtp, otpExpiresAt).run();

    // Send verification email
    try {
      const { sendEmail } = await import('../lib/resend');
      await sendEmail(c.env, email, 'DAKKHO - Email Verification Code', `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #0ea5e9;">Welcome to DAKKHO!</h2>
          <p>Your email verification code is:</p>
          <div style="font-size: 32px; font-weight: bold; color: #0ea5e9; text-align: center; padding: 20px; background: #f0f9ff; border-radius: 8px; letter-spacing: 4px;">${verifyOtp}</div>
          <p style="color: #666; font-size: 14px;">This code expires in 10 minutes.</p>
        </div>
      `);
    } catch (emailError: any) {
      console.error('Failed to send verification email:', emailError.message);
      // Don't fail signup if email fails, but log it
    }

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
        technology: technology || null,
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

    // Verify password
    const hashedInput = await hashPassword(password);
    if (hashedInput !== user.password_hash) {
      return c.json({ error: 'Invalid email or password' }, 401);
    }

    // Verify this is a student (not admin)
    if (user.role === 'admin') {
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
        technology: user.technology || null,
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

    return c.json({
      user: {
        id: auth.userId,
        name: u?.full_name || auth.name || '',
        email: auth.email || u?.email || '',
        instituteId: u?.institute_id || null,
        technology: u?.technology || null,
        emailVerified: !!u?.email_verified,
        avatarUrl: u?.avatar_url || '',
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

    // Validate OTP against stored codes
    const otpRecord = await c.env.DB.prepare(
      'SELECT * FROM password_reset_otps WHERE email = ? AND otp = ? AND expires_at > datetime("now") AND used = 0 ORDER BY created_at DESC LIMIT 1'
    ).bind(email, otp).first();

    if (!otpRecord) {
      return c.json({ success: false, message: 'Invalid or expired OTP' }, 400);
    }

    // Mark OTP as used
    await c.env.DB.prepare(
      'UPDATE password_reset_otps SET used = 1 WHERE id = ?'
    ).bind((otpRecord as any).id).run();

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
      // Delete any previous unused OTPs for this email
      await c.env.DB.prepare(
        'DELETE FROM password_reset_otps WHERE email = ? AND used = 0'
      ).bind(email).run();

      // Generate a 6-digit OTP
      const otp = generateOTP();

      // Store OTP in D1 with 5-minute expiration
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      await c.env.DB.prepare(
        'INSERT INTO password_reset_otps (email, otp, expires_at) VALUES (?, ?, ?)'
      ).bind(email, otp, expiresAt).run();

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

    // Look up the most recent unused OTP for this email
    const otpRecord = await c.env.DB.prepare(
      'SELECT id, otp, expires_at, used FROM password_reset_otps WHERE email = ? AND used = 0 ORDER BY created_at DESC LIMIT 1'
    ).bind(email).first<{ id: number; otp: string; expires_at: string; used: number }>();

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

// POST /auth/resend-otp — Resend OTP for password reset
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
      // Delete any previous unused OTPs for this email
      await c.env.DB.prepare(
        'DELETE FROM password_reset_otps WHERE email = ? AND used = 0'
      ).bind(email).run();

      // Generate a new 6-digit OTP
      const otp = generateOTP();

      // Store OTP in D1 with 5-minute expiration
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
      await c.env.DB.prepare(
        'INSERT INTO password_reset_otps (email, otp, expires_at) VALUES (?, ?, ?)'
      ).bind(email, otp, expiresAt).run();

      // Send OTP email via Resend
      try {
        await sendPasswordResetEmail(c.env, email, otp);
      } catch (emailError) {
        console.error('Failed to resend password reset email:', emailError);
      }
    }

    // Always return success for security
    return c.json({ success: true, message: 'If an account exists, a new reset code has been sent.' });
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

studentApiRoutes.post('/payments/submit', async (c) => {
  try {
    const auth = await getStudentAuth(c);
    if (!auth.authorized) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { package_id, trx_id, phone, proof_url } = await c.req.json();
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

    await c.env.DB.prepare(`
      INSERT INTO payments (user_id, package_id, course_id, amount, currency, gateway, trx_id_submitted, phone_submitted, proof_url, status)
      VALUES (?, ?, ?, ?, 'BDT', 'manual', ?, ?, ?, 'pending')
    `).bind(auth.userId, package_id, p.course_id, p.price, trx_id, phone || null, proof_url || null).run();

    return c.json({ success: true, message: 'Payment submitted for verification' });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

studentApiRoutes.get('/packages/mine', async (c) => {
  try {
    const auth = await getStudentAuth(c);
    if (!auth.authorized) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const result = await c.env.DB.prepare(
      "SELECT up.*, cp.package_type, cp.price, cp.duration_months FROM user_packages up JOIN course_packages cp ON up.package_id = cp.id WHERE up.user_id = ? AND up.status = 'active' ORDER BY up.activated_at DESC"
    ).bind(auth.userId).all();

    return c.json({ packages: result.results });
  } catch (error) {
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
      where += ' AND is_read = 0';
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
      actionUrl: row.action_url || '',
      read: !!row.is_read,
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
      'UPDATE notifications SET is_read = 1 WHERE id = ?'
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
      'UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0'
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

    const key = `avatars/${userId}/${Date.now()}-${file.name}`;
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

// ─── Notification Settings ───

studentAuthenticated.get('/settings', async (c) => {
  try {
    const userId = c.get('studentId');

    const prefs = await c.env.DB.prepare(
      'SELECT * FROM notification_preferences WHERE user_id = ?'
    ).bind(userId).first();

    if (!prefs) {
      return c.json({
        preferences: {
          pushEnabled: true,
          emailEnabled: true,
          smsEnabled: false,
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
        quietHoursStart: p.quiet_hours_start,
        quietHoursEnd: p.quiet_hours_end,
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
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

studentAuthenticated.put('/settings', async (c) => {
  try {
    const userId = c.get('studentId');
    const prefs = await c.req.json();

    await c.env.DB.prepare(`
      INSERT INTO notification_preferences (
        user_id, push_enabled, email_enabled, sms_enabled,
        quiet_hours_start, quiet_hours_end,
        course_updates_push, course_updates_email,
        grades_push, grades_email,
        schedule_push, schedule_email,
        payment_push, payment_email,
        promotions_push, promotions_email,
        social_push, social_email,
        system_push, system_email
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        push_enabled = excluded.push_enabled,
        email_enabled = excluded.email_enabled,
        sms_enabled = excluded.sms_enabled,
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
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// ─── User Preferences (Theme, Privacy, Appearance) ───

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
studentApiRoutes.route('/student', studentAuthenticated);

export default studentApiRoutes;
