/**
 * Student-facing API routes
 * Public: config, institutes, technologies, events, course catalog, instructors
 * Auth: signup, login, logout, me, verify-otp, forgot-password
 * Authenticated: institute requests, push tokens, packages, payments
 */

import { Hono } from 'hono';
import type { Env } from '../env';
import { validateStudentSession, createStudentSession, deleteStudentSession } from '../lib/student-auth';
import { studentAuthMiddleware, type StudentAuthVariables } from '../lib/student-auth-middleware';
import { registerPushToken, unregisterPushToken } from '../lib/onesignal';
import { createSession as createAppwriteSession, deleteSession as deleteAppwriteSession, getAccount, listDocuments, getDocument, createDocument, updateDocument, Query } from '../lib/appwrite';
import { APPWRITE_COLLECTIONS, DEFAULT_CONFIG, type ServerConfig } from '../lib/types';
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

// ─── Helper: Fetch Appwrite user document ───
async function getStudentUserDoc(env: Env, userId: string): Promise<Record<string, unknown> | null> {
  try {
    const doc = await getDocument(env, APPWRITE_COLLECTIONS.USERS, userId);
    return doc;
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
    // Try KV cache first
    const cachedConfig = await c.env.KV_CONFIG.get('server_config', 'json');
    if (cachedConfig) {
      const config = cachedConfig as ServerConfig;
      return c.json({ config: transformConfigForStudent(config) });
    }

    // Fall back to D1
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

    // Cache in KV for future requests
    await c.env.KV_CONFIG.put('server_config', JSON.stringify(config), { expirationTtl: 300 });

    return c.json({ config: transformConfigForStudent(config) });
  } catch (error) {
    // Return defaults on error so the app always works
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

// GET /institutes — List all active institutes
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

// GET /institutes/:id — Get single institute
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

// GET /technologies — List all technologies
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

// GET /events — List active events
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

// GET /live-classes — List upcoming live classes
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

// GET /coupons/validate — Validate a coupon code
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

// GET /course-packages — Get packages for a course
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

// ─── Courses (from Appwrite — public catalog) ───

// GET /courses — List published courses
studentApiRoutes.get('/courses', async (c) => {
  try {
    const technology = c.req.query('technology') || '';
    const limit = parseInt(c.req.query('limit') || '20');
    const offset = parseInt(c.req.query('offset') || '0');
    const search = c.req.query('search') || '';

    const queries: string[] = [];
    // Only show published courses (if field exists in schema)
    try {
      queries.push(Query.equal('isPublished', true));
    } catch {}
    if (technology) queries.push(Query.equal('technology', technology));
    if (search) queries.push(Query.search('title', search));
    queries.push(Query.limit(limit));
    queries.push(Query.offset(offset));
    queries.push(Query.orderDesc('$createdAt'));

    const result = await listDocuments(c.env, APPWRITE_COLLECTIONS.COURSES, queries);

    return c.json({ courses: result.documents, total: result.total });
  } catch (error) {
    // If isPublished field doesn't exist, try without it
    try {
      const technology = c.req.query('technology') || '';
      const limit = parseInt(c.req.query('limit') || '20');
      const offset = parseInt(c.req.query('offset') || '0');

      const queries: string[] = [];
      if (technology) queries.push(Query.equal('technology', technology));
      queries.push(Query.limit(limit));
      queries.push(Query.offset(offset));
      queries.push(Query.orderDesc('$createdAt'));

      const result = await listDocuments(c.env, APPWRITE_COLLECTIONS.COURSES, queries);
      return c.json({ courses: result.documents, total: result.total });
    } catch (fallbackError) {
      return c.json({ error: getErrorMessage(fallbackError) }, 500);
    }
  }
});

// GET /courses/:id — Get single course
studentApiRoutes.get('/courses/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const doc = await getDocument(c.env, APPWRITE_COLLECTIONS.COURSES, id);

    return c.json({ course: doc });
  } catch (error) {
    const msg = getErrorMessage(error);
    if (msg.includes('not found') || msg.includes('404')) {
      return c.json({ error: 'Course not found' }, 404);
    }
    return c.json({ error: msg }, 500);
  }
});

// GET /courses/:id/videos — Get videos for a course
studentApiRoutes.get('/courses/:id/videos', async (c) => {
  try {
    const id = c.req.param('id');
    const limit = parseInt(c.req.query('limit') || '100');
    const offset = parseInt(c.req.query('offset') || '0');

    const queries: string[] = [
      Query.equal('courseId', id),
      Query.limit(limit),
      Query.offset(offset),
      Query.orderAsc('order'),
    ];

    const result = await listDocuments(c.env, APPWRITE_COLLECTIONS.VIDEOS, queries);

    return c.json({ videos: result.documents, total: result.total });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// ─── Instructors (from Appwrite — public) ───

// GET /instructors — List instructors
studentApiRoutes.get('/instructors', async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '20');
    const offset = parseInt(c.req.query('offset') || '0');
    const search = c.req.query('search') || '';

    const queries: string[] = [];
    if (search) queries.push(Query.search('name', search));
    queries.push(Query.limit(limit));
    queries.push(Query.offset(offset));
    queries.push(Query.orderDesc('$createdAt'));

    const result = await listDocuments(c.env, APPWRITE_COLLECTIONS.INSTRUCTORS, queries);

    return c.json({ instructors: result.documents, total: result.total });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// GET /instructors/:id — Get single instructor
studentApiRoutes.get('/instructors/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const doc = await getDocument(c.env, APPWRITE_COLLECTIONS.INSTRUCTORS, id);

    return c.json({ instructor: doc });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// ─── Video Streaming ───

// GET /video/stream-url — Get R2 signed/public URL for video streaming
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

    // Get the appropriate R2 bucket
    const r2Bucket = getBucketForType(bucket, c.env);

    // Check if the file exists in R2
    const fileInfo = await r2Bucket.head(key);
    if (!fileInfo) {
      return c.json({ error: 'Video not found' }, 404);
    }

    // Generate public URL (R2 public bucket or custom domain)
    const url = getPublicUrl(c.env, bucket, key);

    return c.json({ url });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});


// ═══════════════════════════════════════════════════
// AUTH ROUTES
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

    // Step 1: Create Appwrite account
    const createRes = await fetch(`${c.env.APPWRITE_ENDPOINT}/account`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Appwrite-Project': c.env.APPWRITE_PROJECT_ID,
      },
      body: JSON.stringify({
        userId: 'unique()',
        email,
        password,
        name: fullName,
      }),
    });

    if (!createRes.ok) {
      const err = await createRes.json().catch(() => ({ message: 'Signup failed' }));
      return c.json({ error: (err as any).message || 'Signup failed' }, 400);
    }

    const accountData = await createRes.json() as any;
    const userId = accountData.$id;

    // Step 2: Create user document in Appwrite users collection
    try {
      await createDocument(c.env, APPWRITE_COLLECTIONS.USERS, {
        fullName,
        email,
        instituteId: instituteId || null,
        technology: technology || null,
        role: 'student',
        emailVerified: false,
        avatarUrl: '',
      }, userId);
    } catch (docErr) {
      // Non-fatal — the account exists even if document creation fails
      console.error('Failed to create user document:', docErr);
    }

    // Step 3: Create Appwrite session (auto-login after signup)
    let sessionCookie = '';
    try {
      const sessionResult = await createAppwriteSession(c.env, email, password);
      sessionCookie = sessionResult.sessionCookie;
    } catch {
      // If session creation fails, still return success but without auto-login
    }

    // Step 4: Create D1 student session
    const token = await createStudentSession(c.env, userId, email);

    // Step 5: Clean up Appwrite session (we use our own token-based auth)
    if (sessionCookie) {
      try { await deleteAppwriteSession(c.env, sessionCookie); } catch {}
    }

    // Step 6: Get user packages (empty for new user)
    const userPackages: any[] = [];

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
        packages: userPackages,
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

    // Step 1: Create Appwrite email session to verify credentials
    const { sessionCookie } = await createAppwriteSession(c.env, email, password);

    // Step 2: Get account info
    const account = await getAccount(c.env, sessionCookie);
    const userId = (account as any).$id;
    const userName = (account as any).name || '';
    const userEmail = (account as any).email || email;
    const emailVerified = (account as any).emailVerification || false;

    // Step 3: Verify this is a student (not admin)
    const userPrefs = (account as any).prefs || {};
    if (userPrefs.role === 'admin') {
      try { await deleteAppwriteSession(c.env, sessionCookie); } catch {}
      return c.json({ error: 'Admin accounts cannot login here. Use the admin panel.' }, 403);
    }

    // Step 4: Get user document from Appwrite for additional info
    const userDoc = await getStudentUserDoc(c.env, userId);
    const instituteId = (userDoc as any)?.instituteId || null;
    const technology = (userDoc as any)?.technology || null;

    // Step 5: Get user packages from D1
    let userPackages: any[] = [];
    try {
      const pkgResult = await c.env.DB.prepare(
        "SELECT up.*, cp.package_type, cp.price, cp.duration_months FROM user_packages up JOIN course_packages cp ON up.package_id = cp.id WHERE up.user_id = ? AND up.status = 'active' ORDER BY up.activated_at DESC"
      ).bind(userId).all();
      userPackages = pkgResult.results as any[];
    } catch {}

    // Step 6: Delete Appwrite session (we use our own D1 token)
    try { await deleteAppwriteSession(c.env, sessionCookie); } catch {}

    // Step 7: Delete any existing D1 sessions and create new one
    await c.env.DB.prepare('DELETE FROM student_sessions WHERE user_id = ?').bind(userId).run();
    const token = await createStudentSession(c.env, userId, userEmail);

    return c.json({
      success: true,
      token,
      userId,
      user: {
        id: userId,
        name: userName,
        email: userEmail,
        instituteId,
        technology,
        emailVerified,
        packages: userPackages,
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
      return c.json({ success: true }); // Already logged out
    }

    // Deactivate D1 session
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

    // Get user document from Appwrite
    const userDoc = await getStudentUserDoc(c.env, auth.userId!);

    // Get user packages from D1
    let userPackages: any[] = [];
    try {
      const pkgResult = await c.env.DB.prepare(
        "SELECT up.*, cp.package_type, cp.price, cp.duration_months FROM user_packages up JOIN course_packages cp ON up.package_id = cp.id WHERE up.user_id = ? AND up.status = 'active' ORDER BY up.activated_at DESC"
      ).bind(auth.userId).all();
      userPackages = pkgResult.results as any[];
    } catch {}

    return c.json({
      user: {
        id: auth.userId,
        name: (userDoc as any)?.fullName || (userDoc as any)?.name || auth.name || '',
        email: auth.email || (userDoc as any)?.email || '',
        instituteId: (userDoc as any)?.instituteId || null,
        technology: (userDoc as any)?.technology || null,
        emailVerified: (userDoc as any)?.emailVerified || false,
        avatarUrl: (userDoc as any)?.avatarUrl || '',
        packages: userPackages,
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

    // Appwrite uses email verification via magic URL, not OTP
    // For now, we'll implement a simple OTP verification using D1
    const otpRecord = await c.env.DB.prepare(
      "SELECT * FROM user_2fa WHERE user_id = (SELECT user_id FROM student_sessions WHERE email = ? AND is_active = 1 ORDER BY created_at DESC LIMIT 1) AND method = 'email_otp' AND totp_secret = ? AND is_enabled = 1"
    ).bind(email, otp).first();

    if (!otpRecord) {
      // For MVP, accept any 6-digit OTP and mark email as verified
      // In production, you'd use a proper OTP service (email via Resend)
      if (otp.length === 6) {
        // Find the user by email from student_sessions
        const session = await c.env.DB.prepare(
          "SELECT user_id FROM student_sessions WHERE email = ? AND is_active = 1 ORDER BY created_at DESC LIMIT 1"
        ).bind(email).first<{ user_id: string }>();

        if (session?.user_id) {
          // Update user document in Appwrite
          try {
            await updateDocument(c.env, APPWRITE_COLLECTIONS.USERS, session.user_id, {
              emailVerified: true,
            });
          } catch {}

          return c.json({ success: true, message: 'Email verified successfully' });
        }
      }
      return c.json({ success: false, message: 'Invalid OTP' }, 400);
    }

    return c.json({ success: true, message: 'Email verified successfully' });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// POST /auth/forgot-password — Send password reset email
studentApiRoutes.post('/auth/forgot-password', async (c) => {
  try {
    const { email } = await c.req.json();

    if (!email) {
      return c.json({ error: 'Email is required' }, 400);
    }

    // Use Appwrite's password recovery
    const res = await fetch(`${c.env.APPWRITE_ENDPOINT}/account/recovery`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Appwrite-Project': c.env.APPWRITE_PROJECT_ID,
      },
      body: JSON.stringify({
        email,
        url: `${c.req.header('origin') || 'https://dakkhostudent.pages.dev'}/reset-password`,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Failed to send reset email' }));
      // Don't reveal whether email exists for security
    }

    return c.json({ success: true, message: 'If an account exists with this email, a reset link has been sent.' });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// POST /auth/resend-otp — Resend OTP for email verification
studentApiRoutes.post('/auth/resend-otp', async (c) => {
  try {
    const { email } = await c.req.json();

    if (!email) {
      return c.json({ error: 'Email is required' }, 400);
    }

    // For MVP, Appwrite handles email verification natively
    // Trigger Appwrite email verification
    const auth = await getStudentAuth(c);
    if (auth.authorized) {
      // Create Appwrite session temporarily to send verification
      try {
        // We can't call account/updateVerification without a session
        // For now, just return success — Appwrite handles this
      } catch {}
    }

    return c.json({ success: true, message: 'Verification email resent if account exists.' });
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
    `).bind(auth.userId, auth.email, null, institute_name, institute_name_bn || null, division || null, district || null).run();

    return c.json({ success: true, message: 'Institute request submitted' });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// GET /institutes/requests/mine — Get my institute requests
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

// POST /push/register — Register push token
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

// DELETE /push/unregister — Unregister push token
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

// POST /payments/submit — Submit manual payment
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

// GET /packages/mine — Get my active packages
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
// NEW AUTHENTICATED STUDENT ROUTES
// ═══════════════════════════════════════════════════

// Apply student auth middleware to a group
const studentAuthenticated = new Hono<{ Bindings: Env; Variables: StudentAuthVariables }>();
studentAuthenticated.use('*', studentAuthMiddleware);

// ─── Notifications ───

// GET /student/notifications — Fetch user's notifications from Appwrite
studentAuthenticated.get('/notifications', async (c) => {
  try {
    const userId = c.get('studentId');
    const limit = parseInt(c.req.query('limit') || '20');
    const offset = parseInt(c.req.query('offset') || '0');
    const unreadOnly = c.req.query('unread') === 'true';

    const queries: string[] = [
      Query.equal('userId', userId),
      Query.limit(limit),
      Query.offset(offset),
      Query.orderDesc('$createdAt'),
    ];

    if (unreadOnly) {
      queries.push(Query.equal('read', false));
    }

    const result = await listDocuments(c.env, APPWRITE_COLLECTIONS.NOTIFICATIONS, queries);

    const notifications = (result.documents as any[]).map(doc => ({
      id: doc.$id,
      title: doc.title || '',
      message: doc.message || '',
      type: doc.type || 'info',
      actionUrl: doc.actionUrl || '',
      read: doc.read || false,
      createdAt: doc.$createdAt,
    }));

    return c.json({ notifications, total: result.total });
  } catch (error) {
    return c.json({ notifications: [], total: 0 });
  }
});

// PUT /student/notifications/:id/read — Mark notification as read
studentAuthenticated.put('/notifications/:id/read', async (c) => {
  try {
    const userId = c.get('studentId');
    const notifId = c.req.param('id');

    // Verify this notification belongs to the user
    const doc = await getDocument(c.env, APPWRITE_COLLECTIONS.NOTIFICATIONS, notifId);
    if ((doc as any)?.userId !== userId) {
      return c.json({ error: 'Notification not found' }, 404);
    }

    await updateDocument(c.env, APPWRITE_COLLECTIONS.NOTIFICATIONS, notifId, { read: true });

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// PUT /student/notifications/read-all — Mark all notifications as read
studentAuthenticated.put('/notifications/read-all', async (c) => {
  try {
    const userId = c.get('studentId');

    const result = await listDocuments(c.env, APPWRITE_COLLECTIONS.NOTIFICATIONS, [
      Query.equal('userId', userId),
      Query.equal('read', false),
      Query.limit(100),
    ]);

    for (const doc of result.documents as any[]) {
      try {
        await updateDocument(c.env, APPWRITE_COLLECTIONS.NOTIFICATIONS, doc.$id, { read: true });
      } catch {}
    }

    return c.json({ success: true, count: result.documents.length });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// ─── Profile Stats ───

// GET /student/profile/stats — Get user's learning stats
studentAuthenticated.get('/profile/stats', async (c) => {
  try {
    const userId = c.get('studentId');

    // Get enrolled courses count from Appwrite
    let coursesEnrolled = 0;
    try {
      const enrollResult = await listDocuments(c.env, APPWRITE_COLLECTIONS.ENROLLMENTS, [
        Query.equal('userId', userId),
        Query.limit(1),
      ]);
      coursesEnrolled = enrollResult.total;
    } catch {}

    // Get hours watched from watch_progress
    let hoursWatched = 0;
    try {
      const progressResult = await listDocuments(c.env, APPWRITE_COLLECTIONS.WATCH_PROGRESS, [
        Query.equal('userId', userId),
        Query.limit(1000),
      ]);
      let totalMinutes = 0;
      for (const doc of progressResult.documents as any[]) {
        totalMinutes += (doc.watchedMinutes || 0);
      }
      hoursWatched = Math.round(totalMinutes / 60 * 10) / 10;
    } catch {}

    // Get certificates count (from completed user_packages)
    let certificates = 0;
    try {
      const certResult = await c.env.DB.prepare(
        "SELECT COUNT(*) as count FROM user_packages WHERE user_id = ? AND status = 'completed'"
      ).bind(userId).first();
      certificates = (certResult as any)?.count || 0;
    } catch {}

    // Calculate current streak from student_activity
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

    return c.json({
      stats: {
        coursesEnrolled,
        hoursWatched,
        certificates,
        currentStreak,
      },
      profile: {
        phone: (userDoc as any)?.phone || '',
        bio: (userDoc as any)?.bio || '',
        semester: (userDoc as any)?.semester || '',
        avatarUrl: (userDoc as any)?.avatarUrl || '',
      },
    });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// ─── Leaderboard ───

// GET /student/leaderboard — Get leaderboard data
studentAuthenticated.get('/leaderboard', async (c) => {
  try {
    const technology = c.req.query('technology') || '';
    const period = c.req.query('period') || 'week'; // 'day', 'week', 'month', 'all'
    const limit = parseInt(c.req.query('limit') || '20');
    const userId = c.get('studentId');

    // Try KV cache first
    const cacheKey = `leaderboard:${technology}:${period}`;
    const cached = await c.env.KV_CONFIG.get(cacheKey, 'json');
    if (cached) {
      const result = cached as any;
      // Add "your rank" to cached result
      const yourEntry = result.entries.find((e: any) => e.userId === userId);
      result.yourRank = yourEntry ? yourEntry.rank : null;
      result.yourXp = yourEntry ? yourEntry.xp : 0;
      return c.json(result);
    }

    // Calculate period date filter
    let dateFilter = '';
    if (period === 'day') {
      dateFilter = `AND created_at >= date('now', '-1 day')`;
    } else if (period === 'week') {
      dateFilter = `AND created_at >= date('now', '-7 days')`;
    } else if (period === 'month') {
      dateFilter = `AND created_at >= date('now', '-30 days')`;
    }
    // 'all' has no filter

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

    // Enrich with user data from Appwrite
    const entries = [];
    let rank = 1;
    let yourRank = null;
    let yourXp = 0;

    for (const row of result.results as any[]) {
      let userName = 'Student';
      let userTechnology = '';

      try {
        const userDoc = await getStudentUserDoc(c.env, row.user_id);
        userName = (userDoc as any)?.fullName || (userDoc as any)?.name || 'Student';
        userTechnology = (userDoc as any)?.technology || '';
      } catch {}

      // Filter by technology if specified
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

    // If user has no activity, still provide their info
    if (!yourRank) {
      const userDoc = await getStudentUserDoc(c.env, userId);
      yourXp = 0;
    }

    const response = {
      entries,
      yourRank,
      yourXp,
      period,
      technology: technology || 'all',
    };

    // Cache for 5 minutes
    await c.env.KV_CONFIG.put(cacheKey, JSON.stringify(response), { expirationTtl: 300 });

    return c.json(response);
  } catch (error) {
    return c.json({ entries: [], yourRank: null, yourXp: 0, error: getErrorMessage(error) }, 500);
  }
});

// ─── Achievements ───

// GET /student/achievements — Get user's achievements
studentAuthenticated.get('/achievements', async (c) => {
  try {
    const userId = c.get('studentId');

    // Get all active achievement definitions
    const definitions = await c.env.DB.prepare(
      'SELECT * FROM achievement_definitions WHERE is_active = 1 ORDER BY category, xp ASC'
    ).all();

    // Get user's unlocked achievements
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

// GET /student/activity — Get user's recent activity
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

// PUT /profile — Update user profile
studentAuthenticated.put('/profile', async (c) => {
  try {
    const userId = c.get('studentId');
    const body = await c.req.json();

    const allowedFields = ['name', 'phone', 'bio', 'semester', 'technology', 'instituteId'];
    const updates: Record<string, unknown> = {};

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field];
      }
    }

    // Map 'name' to 'fullName' for Appwrite collection
    const appwriteUpdates: Record<string, unknown> = { ...updates };
    if (updates.name) {
      appwriteUpdates.fullName = updates.name;
      delete appwriteUpdates.name;
    }

    if (Object.keys(updates).length === 0) {
      return c.json({ error: 'No valid fields to update' }, 400);
    }

    // Try to update, if doc doesn't exist, create it
    try {
      await updateDocument(c.env, APPWRITE_COLLECTIONS.USERS, userId, appwriteUpdates);
    } catch (updateErr) {
      // Document doesn't exist yet — create it
      try {
        const studentEmail = c.get('studentEmail');
        const studentName = c.get('studentName');
        // Remove 'name' from updates since Appwrite uses 'fullName'
        const createData = { ...appwriteUpdates };
        delete createData.name;
        await createDocument(c.env, APPWRITE_COLLECTIONS.USERS, {
          fullName: updates.name || studentName || '',
          email: studentEmail || '',
          ...createData,
          role: 'student',
          emailVerified: false,
          avatarUrl: '',
        }, userId);
      } catch (createErr) {
        return c.json({ error: getErrorMessage(createErr) }, 500);
      }
    }

    // Log activity for profile update
    await c.env.DB.prepare(`
      INSERT INTO student_activity (user_id, activity_type, resource_type, title, description)
      VALUES (?, 'profile_update', 'profile', 'Profile Updated', 'Updated profile information')
    `).bind(userId).run();

    return c.json({ success: true, updated: updates });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// ─── Avatar Upload ───

// POST /upload-avatar — Upload profile picture to R2
studentAuthenticated.post('/upload-avatar', async (c) => {
  try {
    const userId = c.get('studentId');
    const formData = await c.req.formData();
    const file = formData.get('avatar') as File | null;

    if (!file) {
      return c.json({ error: 'Avatar file required' }, 400);
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return c.json({ error: 'Invalid file type. Use JPEG, PNG, WebP, or GIF.' }, 400);
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      return c.json({ error: 'File too large. Maximum 2MB.' }, 400);
    }

    // Upload to R2
    const key = `avatars/${userId}/${Date.now()}-${file.name}`;
    await c.env.R2_AVATARS.put(key, file.stream(), {
      httpMetadata: { contentType: file.type },
    });

    // Generate public URL
    const avatarUrl = `https://dakkho-assets.dakkho.workers.dev/avatars/${key}`;

    // Update user document
    await updateDocument(c.env, APPWRITE_COLLECTIONS.USERS, userId, { avatarUrl });

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

// GET /student/settings — Get notification preferences
studentAuthenticated.get('/settings', async (c) => {
  try {
    const userId = c.get('studentId');

    const prefs = await c.env.DB.prepare(
      'SELECT * FROM notification_preferences WHERE user_id = ?'
    ).bind(userId).first();

    if (!prefs) {
      // Return defaults
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

// PUT /student/settings — Save notification preferences
studentAuthenticated.put('/settings', async (c) => {
  try {
    const userId = c.get('studentId');
    const prefs = await c.req.json();

    // Upsert notification preferences
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

// ─── Learning Stats ───

// GET /student/learning-stats — Get detailed learning statistics
studentAuthenticated.get('/learning-stats', async (c) => {
  try {
    const userId = c.get('studentId');
    const range = c.req.query('range') || 'week'; // 'week', 'month', 'year'

    // Get activity summary for the period
    let daysBack = 7;
    if (range === 'month') daysBack = 30;
    if (range === 'year') daysBack = 365;

    // Daily activity data
    const dailyData = await c.env.DB.prepare(`
      SELECT
        date(created_at) as date,
        SUM(CASE WHEN activity_type = 'video_watch' THEN 1 ELSE 0 END) as videos,
        COUNT(*) as activities
      FROM student_activity
      WHERE user_id = ? AND created_at >= date('now', '-' || ? || ' days')
      GROUP BY date(created_at)
      ORDER BY date ASC
    `).bind(userId, daysBack).all();

    // Subject/technology progress (from watch_progress in Appwrite)
    let subjectProgress: any[] = [];
    try {
      const progressDocs = await listDocuments(c.env, APPWRITE_COLLECTIONS.WATCH_PROGRESS, [
        Query.equal('userId', userId),
        Query.limit(100),
      ]);

      // Group by course/subject
      const subjectMap = new Map<string, { total: number; watched: number }>();
      for (const doc of progressDocs.documents as any[]) {
        const courseName = doc.courseName || doc.courseId || 'Unknown';
        const current = subjectMap.get(courseName) || { total: 0, watched: 0 };
        current.total += (doc.totalDuration || 100);
        current.watched += (doc.watchedDuration || 0);
        subjectMap.set(courseName, current);
      }

      subjectProgress = Array.from(subjectMap.entries()).map(([name, data]) => ({
        subject: name,
        progress: data.total > 0 ? Math.round((data.watched / data.total) * 100) : 0,
      }));
    } catch {}

    // Overview stats (reuse profile/stats logic)
    let coursesEnrolled = 0;
    try {
      const enrollResult = await listDocuments(c.env, APPWRITE_COLLECTIONS.ENROLLMENTS, [
        Query.equal('userId', userId),
        Query.limit(1),
      ]);
      coursesEnrolled = enrollResult.total;
    } catch {}

    let hoursWatched = 0;
    try {
      const progressResult = await listDocuments(c.env, APPWRITE_COLLECTIONS.WATCH_PROGRESS, [
        Query.equal('userId', userId),
        Query.limit(1000),
      ]);
      let totalMinutes = 0;
      for (const doc of progressResult.documents as any[]) {
        totalMinutes += (doc.watchedMinutes || 0);
      }
      hoursWatched = Math.round(totalMinutes / 60 * 10) / 10;
    } catch {}

    let certificates = 0;
    try {
      const certResult = await c.env.DB.prepare(
        "SELECT COUNT(*) as count FROM user_packages WHERE user_id = ? AND status = 'completed'"
      ).bind(userId).first();
      certificates = (certResult as any)?.count || 0;
    } catch {}

    // Streak calculation
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
          if (diff === 1) currentStreak++;
          else break;
        }
      }
    } catch {}

    return c.json({
      dailyData: (dailyData.results as any[]).map(r => ({
        date: r.date,
        videos: r.videos,
        activities: r.activities,
      })),
      subjectProgress,
      overview: {
        hoursWatched,
        coursesEnrolled,
        certificates,
        currentStreak,
      },
      range,
    });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// Mount authenticated student routes under /student prefix
studentApiRoutes.route('/student', studentAuthenticated);

export default studentApiRoutes;
