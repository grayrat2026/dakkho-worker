/**
 * Student Profile Routes
 * Profile update, password change, notification preferences, push tokens,
 * leaderboard, achievements, activity, preferences, avatar upload, learning stats,
 * institute requests, delete account
 */

import { Hono } from 'hono';
import type { Env } from '../../env';
import {
  getStudentAuth,
  getStudentUserDoc,
  getInstituteName,
  getTechnologyName,
  getPublicUrl,
  env_push_upsert,
  DEFAULT_PREFERENCES,
  getErrorMessage,
  verifyPassword,
  hashPassword,
  registerPushToken,
  unregisterPushToken,
  studentAuthMiddleware,
  type StudentAuthVariables,
} from './helpers';
import { generateTOTPSecret, generateBackupCodes, verifyTOTP, generateOTPAuthURL } from '../../lib/totp';

const routes = new Hono<{ Bindings: Env; Variables: StudentAuthVariables }>();

// ═══════════════════════════════════════════════════
// Routes using getStudentAuth (manual auth)
// ═══════════════════════════════════════════════════

// PUT /auth/profile — Update student profile
routes.put('/auth/profile', async (c) => {
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
    if (instituteId !== undefined) { updates.push('institute_id = ?'); const n = Number(instituteId); params.push(isNaN(n) ? instituteId : n); }
    if (technology !== undefined) { updates.push('technology = ?'); params.push(technology); }
    if (bio !== undefined) { updates.push('bio = ?'); params.push(bio); }
    if (phone !== undefined) { updates.push('phone = ?'); params.push(phone); }
    if (semester !== undefined) { updates.push('semester = ?'); const n = Number(semester); params.push(isNaN(n) ? semester : n); }
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

// POST /institutes/requests — Request new institute (student)
routes.post('/institutes/requests', async (c) => {
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

// GET /institutes/requests/mine
routes.get('/institutes/requests/mine', async (c) => {
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

// ─── Push Token Routes ───

routes.post('/push/register', async (c) => {
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

routes.delete('/push/unregister', async (c) => {
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
routes.get('/push/vapid-key', async (c) => {
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

// POST /push/subscribe — Subscribe to web push notifications
routes.post('/push/subscribe', async (c) => {
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
    const subscriptionJson = JSON.stringify(subscription);
    const deviceType = 'webpush';

    await env_push_upsert(c.env, auth.userId!, subscription.endpoint, subscriptionJson, deviceType);

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// ═══════════════════════════════════════════════════
// Notification Settings (auth required, NO email verification required)
// ═══════════════════════════════════════════════════

routes.get('/settings', async (c) => {
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

routes.put('/settings', async (c) => {
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
// Routes using studentAuthMiddleware
// ═══════════════════════════════════════════════════

// ─── Notifications (D1) ───

routes.get('/notifications', studentAuthMiddleware, async (c) => {
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

routes.put('/notifications/:id/read', studentAuthMiddleware, async (c) => {
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

routes.put('/notifications/read-all', studentAuthMiddleware, async (c) => {
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

routes.get('/profile/stats', studentAuthMiddleware, async (c) => {
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

routes.get('/leaderboard', studentAuthMiddleware, async (c) => {
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

routes.get('/achievements', studentAuthMiddleware, async (c) => {
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

routes.get('/activity', studentAuthMiddleware, async (c) => {
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

// ─── Profile Update (middleware-based) ───

routes.put('/profile', studentAuthMiddleware, async (c) => {
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

routes.post('/upload-avatar', studentAuthMiddleware, async (c) => {
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

routes.get('/preferences', studentAuthMiddleware, async (c) => {
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

routes.put('/preferences', studentAuthMiddleware, async (c) => {
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

// GET /student/learning-stats — Learning stats for the current student
routes.get('/student/learning-stats', studentAuthMiddleware, async (c) => {
  try {
    const userId = c.get('studentId');
    const range = c.req.query('range') || '30d';

    // Calculate date range
    const days = range === '7d' ? 7 : range === '90d' ? 90 : 30;

    // Get daily activity data
    const dailyData: Array<{ date: string; videos: number; activities: number }> = [];
    try {
      const rows = await c.env.DB.prepare(`
        SELECT DATE(created_at) as day,
               COUNT(CASE WHEN activity_type = 'video_watch' THEN 1 END) as videos,
               COUNT(*) as activities
        FROM student_activity
        WHERE user_id = ? AND created_at >= datetime('now', '-${days} days')
        GROUP BY DATE(created_at)
        ORDER BY day ASC
      `).bind(userId).all();
      for (const row of (rows.results || []) as any[]) {
        dailyData.push({ date: row.day, videos: row.videos || 0, activities: row.activities || 0 });
      }
    } catch {}

    // Get subject progress from enrollments
    const subjectProgress: Array<{ subject: string; progress: number }> = [];
    try {
      const rows = await c.env.DB.prepare(`
        SELECT t.name as technology, e.progress
        FROM enrollments e
        INNER JOIN courses c ON e.course_id = c.id
        LEFT JOIN technologies t ON c.technology_id = t.id
        WHERE e.user_id = ?
      `).bind(userId).all();
      for (const row of (rows.results || []) as any[]) {
        subjectProgress.push({ subject: row.technology || 'General', progress: row.progress || 0 });
      }
    } catch {}

    // Get overview stats
    let hoursWatched = 0;
    let coursesEnrolled = 0;
    let certificates = 0;
    let currentStreak = 0;

    try {
      const watchStats = await c.env.DB.prepare(
        "SELECT SUM(CASE WHEN metadata LIKE '%watchMinutes%' THEN CAST(json_extract(metadata, '$.watchMinutes') AS REAL) ELSE 0 END) as total_minutes FROM student_activity WHERE user_id = ? AND activity_type = 'video_watch'"
      ).bind(userId).first<{ total_minutes: number }>();
      hoursWatched = Math.round((watchStats?.total_minutes || 0) / 60 * 10) / 10;
    } catch {}

    try {
      const enrollCount = await c.env.DB.prepare(
        'SELECT COUNT(*) as total FROM enrollments WHERE user_id = ?'
      ).bind(userId).first<{ total: number }>();
      coursesEnrolled = enrollCount?.total || 0;
    } catch {}

    try {
      const certCount = await c.env.DB.prepare(
        "SELECT COUNT(*) as total FROM certificates WHERE user_id = ? AND status = 'issued'"
      ).bind(userId).first<{ total: number }>();
      certificates = certCount?.total || 0;
    } catch {}

    try {
      const streakRows = await c.env.DB.prepare(
        "SELECT DATE(created_at) as day FROM student_activity WHERE user_id = ? GROUP BY DATE(created_at) ORDER BY day DESC LIMIT 30"
      ).bind(userId).all();
      const activeDays = (streakRows.results || []).map((r: any) => r.day);
      const today = new Date().toISOString().split('T')[0];
      let streak = 0;
      let checkDate = new Date();
      // If no activity today, start checking from yesterday
      if (!activeDays.includes(today)) {
        checkDate.setDate(checkDate.getDate() - 1);
      }
      for (let i = 0; i < 60; i++) {
        const dateStr = checkDate.toISOString().split('T')[0];
        if (activeDays.includes(dateStr)) {
          streak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }
      currentStreak = streak;
    } catch {}

    return c.json({
      dailyData,
      subjectProgress,
      overview: { hoursWatched, coursesEnrolled, certificates, currentStreak },
      range,
    });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// ─── Student Notifications (alternative route with /student/ prefix) ───

// GET /student/notifications
routes.get('/student/notifications', studentAuthMiddleware, async (c) => {
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

// PUT /student/notifications/:id/read
routes.put('/student/notifications/:id/read', studentAuthMiddleware, async (c) => {
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

// PUT /student/notifications/read-all
routes.put('/student/notifications/read-all', studentAuthMiddleware, async (c) => {
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

// GET /student/profile/stats
routes.get('/student/profile/stats', studentAuthMiddleware, async (c) => {
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

    // Get user profile fields for pre-filling edit form
    let profile: { phone: string; bio: string; semester: string; avatarUrl: string; instituteId: number | null; technology: string } = { phone: '', bio: '', semester: '', avatarUrl: '', instituteId: null, technology: '' };
    try {
      const userRow = await c.env.DB.prepare(
        'SELECT phone, bio, semester, avatar_url, institute_id, technology FROM users WHERE id = ?'
      ).bind(userId).first<{ phone: string | null; bio: string | null; semester: number | null; avatar_url: string | null; institute_id: number | null; technology: string | null }>();
      if (userRow) {
        profile = {
          phone: userRow.phone || '',
          bio: userRow.bio || '',
          semester: userRow.semester != null ? String(userRow.semester) : '',
          avatarUrl: userRow.avatar_url || '',
          instituteId: userRow.institute_id ?? null,
          technology: userRow.technology || '',
        };
      }
    } catch {}

    return c.json({
      stats: {
        coursesEnrolled: enrolledCourses,
        hoursWatched: Math.round(totalWatchTime / 3600),
        certificates: completedCourses,
        currentStreak: streak,
      },
      profile,
    });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// PUT /student/profile — Update student profile
routes.put('/student/profile', studentAuthMiddleware, async (c) => {
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

    // Fields that must be INTEGER in D1 — convert strings to numbers
    const integerFields = new Set(['semester', 'instituteId']);

    const setClauses: string[] = [];
    const params: unknown[] = [];

    for (const [bodyField, dbColumn] of Object.entries(fieldMapping)) {
      if (body[bodyField] !== undefined && body[bodyField] !== '') {
        setClauses.push(`${dbColumn} = ?`);
        if (integerFields.has(bodyField)) {
          const num = Number(body[bodyField]);
          params.push(isNaN(num) ? body[bodyField] : num);
        } else {
          params.push(body[bodyField]);
        }
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
routes.post('/student/upload-avatar', studentAuthMiddleware, async (c) => {
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

// POST /student/change-password — Change student password (requires current password)
routes.post('/student/change-password', studentAuthMiddleware, async (c) => {
  try {
    const userId = c.get('studentId');
    const { currentPassword, newPassword } = await c.req.json();

    if (!currentPassword || !newPassword) {
      return c.json({ error: 'currentPassword and newPassword are required' }, 400);
    }

    if (newPassword.length < 8) {
      return c.json({ error: 'New password must be at least 8 characters' }, 400);
    }

    // Get current password hash
    const user = await c.env.DB.prepare(
      'SELECT password_hash FROM users WHERE id = ?'
    ).bind(userId).first<{ password_hash: string }>();

    if (!user?.password_hash) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Verify current password
    const validPassword = await verifyPassword(currentPassword, user.password_hash);
    if (!validPassword) {
      return c.json({ error: 'Current password is incorrect' }, 401);
    }

    // Hash and save new password
    const newHash = await hashPassword(newPassword);
    await c.env.DB.prepare(
      'UPDATE users SET password_hash = ?, updated_at = datetime(\'now\') WHERE id = ?'
    ).bind(newHash, userId).run();

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// POST /student/delete-account — Delete student account (requires password verification)
routes.post('/student/delete-account', studentAuthMiddleware, async (c) => {
  try {
    const userId = c.get('studentId');
    const { password, reason, feedback } = await c.req.json();

    if (!password) {
      return c.json({ error: 'Password is required to delete your account' }, 400);
    }

    // Verify password
    const user = await c.env.DB.prepare(
      'SELECT password_hash FROM users WHERE id = ?'
    ).bind(userId).first<{ password_hash: string }>();

    if (!user?.password_hash) {
      return c.json({ error: 'User not found' }, 404);
    }

    const validPassword = await verifyPassword(password, user.password_hash);
    if (!validPassword) {
      return c.json({ error: 'Password is incorrect' }, 401);
    }

    // Delete user and related data
    // Delete enrollments first
    await c.env.DB.prepare('DELETE FROM enrollments WHERE user_id = ?').bind(userId).run();
    // Delete watch history
    await c.env.DB.prepare('DELETE FROM watch_history WHERE user_id = ?').bind(userId).run();
    // Delete student sessions
    await c.env.DB.prepare('DELETE FROM student_sessions WHERE user_id = ?').bind(userId).run();
    // Delete notification tokens
    await c.env.DB.prepare('DELETE FROM notification_tokens WHERE user_id = ?').bind(userId).run();
    // Delete 2FA data
    await c.env.DB.prepare('DELETE FROM user_2fa WHERE user_id = ?').bind(userId).run();
    // Delete pending 2FA tokens
    await c.env.DB.prepare('DELETE FROM pending_2fa_tokens WHERE user_id = ?').bind(userId).run();
    // Delete user preferences
    await c.env.DB.prepare('DELETE FROM user_preferences WHERE user_id = ?').bind(userId).run();
    // Delete notification preferences
    await c.env.DB.prepare('DELETE FROM notification_preferences WHERE user_id = ?').bind(userId).run();
    // Finally delete the user
    await c.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(userId).run();

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// ═══════════════════════════════════════════════════
// Sessions Management
// ═══════════════════════════════════════════════════

// GET /student/sessions — List active sessions for current user
routes.get('/student/sessions', studentAuthMiddleware, async (c) => {
  try {
    const userId = c.get('studentId');
    const currentToken = c.req.header('Authorization')?.replace('Bearer ', '') || '';

    const result = await c.env.DB.prepare(
      `SELECT id, user_id, email, name, device_info, ip_address, created_at, expires_at, is_active
       FROM student_sessions WHERE user_id = ? AND is_active = 1 ORDER BY created_at DESC`
    ).bind(userId).all();

    const sessions = result.results.map((row: any) => {
      const isCurrent = row.id === currentToken;
      let device: 'mobile' | 'desktop' | 'tablet' = 'desktop';
      let browser = 'Unknown Browser';
      const deviceInfo = row.device_info || '';

      // Parse device info string (format: "Browser on Device")
      if (deviceInfo) {
        if (/mobile|android|iphone/i.test(deviceInfo)) device = 'mobile';
        else if (/tablet|ipad/i.test(deviceInfo)) device = 'tablet';
        else device = 'desktop';

        // Extract browser name
        if (/chrome/i.test(deviceInfo) && !/edge/i.test(deviceInfo)) browser = device.includes('Mobile') ? 'Chrome Mobile' : 'Chrome';
        else if (/firefox/i.test(deviceInfo)) browser = 'Firefox';
        else if (/safari/i.test(deviceInfo) && !/chrome/i.test(deviceInfo)) browser = device.includes('Mobile') ? 'Safari Mobile' : 'Safari';
        else if (/edge/i.test(deviceInfo)) browser = 'Edge';
        else browser = deviceInfo.split(' on ')[0] || 'Browser';
      }

      // Format time ago
      const createdAt = new Date(row.created_at);
      const now = new Date();
      const diffMs = now.getTime() - createdAt.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);
      let lastActive = 'Unknown';
      if (isCurrent) lastActive = 'Active now';
      else if (diffMins < 1) lastActive = 'Just now';
      else if (diffMins < 60) lastActive = `${diffMins} min ago`;
      else if (diffHours < 24) lastActive = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
      else lastActive = `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

      // Mask IP address
      const ip = row.ip_address || '';
      const maskedIp = ip.replace(/(\d+\.\d+)\.\d+\.\d+/, '$1.XX.XX');

      return {
        id: row.id,
        device,
        browser,
        location: '', // IP-based geolocation not available in Workers
        ip: maskedIp,
        lastActive,
        isCurrent,
        createdAt: row.created_at,
        expiresAt: row.expires_at,
      };
    });

    return c.json({ sessions });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// DELETE /student/sessions/:id — Revoke a specific session
routes.delete('/student/sessions/:id', studentAuthMiddleware, async (c) => {
  try {
    const userId = c.get('studentId');
    const currentToken = c.req.header('Authorization')?.replace('Bearer ', '') || '';
    const sessionId = c.req.param('id');

    // Don't allow revoking current session
    if (sessionId === currentToken) {
      return c.json({ error: 'Cannot revoke your current session. Use logout instead.' }, 400);
    }

    // Verify the session belongs to this user
    const session = await c.env.DB.prepare(
      'SELECT user_id FROM student_sessions WHERE id = ? AND is_active = 1'
    ).bind(sessionId).first<{ user_id: string }>();

    if (!session || session.user_id !== userId) {
      return c.json({ error: 'Session not found' }, 404);
    }

    await c.env.DB.prepare(
      'UPDATE student_sessions SET is_active = 0 WHERE id = ?'
    ).bind(sessionId).run();

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// POST /student/sessions/revoke-all — Revoke all other sessions
routes.post('/student/sessions/revoke-all', studentAuthMiddleware, async (c) => {
  try {
    const userId = c.get('studentId');
    const currentToken = c.req.header('Authorization')?.replace('Bearer ', '') || '';

    const result = await c.env.DB.prepare(
      'UPDATE student_sessions SET is_active = 0 WHERE user_id = ? AND id != ? AND is_active = 1'
    ).bind(userId, currentToken).run();

    return c.json({ success: true, revokedCount: result.meta?.changes || 0 });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// ═══════════════════════════════════════════════════
// Two-Factor Authentication (TOTP)
// ═══════════════════════════════════════════════════

// GET /student/2fa/status — Get 2FA status for current user
routes.get('/student/2fa/status', studentAuthMiddleware, async (c) => {
  try {
    const userId = c.get('studentId');

    const row = await c.env.DB.prepare(
      'SELECT is_enabled, method, totp_verified FROM user_2fa WHERE user_id = ?'
    ).bind(userId).first<{ is_enabled: number; method: string; totp_verified: number }>();

    return c.json({
      enabled: row?.is_enabled === 1,
      method: row?.method || 'totp',
      verified: row?.totp_verified === 1,
    });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// POST /student/2fa/setup — Start TOTP setup (generate secret, return QR URL + backup codes)
routes.post('/student/2fa/setup', studentAuthMiddleware, async (c) => {
  try {
    const userId = c.get('studentId');

    // Check if already enabled
    const existing = await c.env.DB.prepare(
      'SELECT is_enabled FROM user_2fa WHERE user_id = ?'
    ).bind(userId).first<{ is_enabled: number }>();

    if (existing?.is_enabled === 1) {
      return c.json({ error: '2FA is already enabled. Disable it first to set up again.' }, 400);
    }

    // Verify password before allowing 2FA setup
    const { password } = await c.req.json();
    if (!password) {
      return c.json({ error: 'Password is required to set up 2FA' }, 400);
    }

    const user = await c.env.DB.prepare(
      'SELECT password_hash, email FROM users WHERE id = ?'
    ).bind(userId).first<{ password_hash: string; email: string }>();

    if (!user?.password_hash) {
      return c.json({ error: 'User not found' }, 404);
    }

    const validPassword = await verifyPassword(password, user.password_hash);
    if (!validPassword) {
      return c.json({ error: 'Incorrect password' }, 401);
    }

    // Generate TOTP secret and backup codes
    const secret = generateTOTPSecret();
    const backupCodes = generateBackupCodes(8);
    const otpAuthUrl = generateOTPAuthURL(secret, user.email);

    // Store in user_2fa (upsert)
    await c.env.DB.prepare(`
      INSERT INTO user_2fa (user_id, method, totp_secret, totp_verified, backup_codes, is_enabled, created_at, updated_at)
      VALUES (?, 'totp', ?, 0, ?, 0, datetime('now'), datetime('now'))
      ON CONFLICT(user_id) DO UPDATE SET
        method = 'totp',
        totp_secret = ?,
        totp_verified = 0,
        backup_codes = ?,
        is_enabled = 0,
        updated_at = datetime('now')
    `).bind(userId, secret, JSON.stringify(backupCodes), secret, JSON.stringify(backupCodes)).run();

    return c.json({
      secret,
      otpAuthUrl,
      backupCodes,
    });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// POST /student/2fa/verify-setup — Verify TOTP code during setup
routes.post('/student/2fa/verify-setup', studentAuthMiddleware, async (c) => {
  try {
    const userId = c.get('studentId');
    const { code } = await c.req.json();

    if (!code) {
      return c.json({ error: 'TOTP code is required' }, 400);
    }

    const row = await c.env.DB.prepare(
      'SELECT totp_secret, totp_verified FROM user_2fa WHERE user_id = ?'
    ).bind(userId).first<{ totp_secret: string; totp_verified: number }>();

    if (!row?.totp_secret) {
      return c.json({ error: '2FA setup not initiated. Please start setup first.' }, 400);
    }

    if (row.totp_verified === 1) {
      return c.json({ error: '2FA already verified' }, 400);
    }

    const valid = await verifyTOTP(row.totp_secret, code);
    if (!valid) {
      // Check backup codes as fallback
      const backupRow = await c.env.DB.prepare(
        'SELECT backup_codes FROM user_2fa WHERE user_id = ?'
      ).bind(userId).first<{ backup_codes: string }>();

      if (backupRow?.backup_codes) {
        const codes: string[] = JSON.parse(backupRow.backup_codes);
        const codeIndex = codes.indexOf(code.toUpperCase());
        if (codeIndex !== -1) {
          // Remove used backup code
          codes.splice(codeIndex, 1);
          await c.env.DB.prepare(
            'UPDATE user_2fa SET backup_codes = ?, updated_at = datetime(\'now\') WHERE user_id = ?'
          ).bind(JSON.stringify(codes), userId).run();
        } else {
          return c.json({ error: 'Invalid verification code. Please try again.' }, 400);
        }
      } else {
        return c.json({ error: 'Invalid verification code. Please try again.' }, 400);
      }
    }

    // Mark as verified and enable
    await c.env.DB.prepare(
      `UPDATE user_2fa SET totp_verified = 1, is_enabled = 1, updated_at = datetime('now') WHERE user_id = ?`
    ).bind(userId).run();

    return c.json({ success: true, enabled: true });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// POST /student/2fa/disable — Disable 2FA (requires password)
routes.post('/student/2fa/disable', studentAuthMiddleware, async (c) => {
  try {
    const userId = c.get('studentId');
    const { password } = await c.req.json();

    if (!password) {
      return c.json({ error: 'Password is required to disable 2FA' }, 400);
    }

    const user = await c.env.DB.prepare(
      'SELECT password_hash FROM users WHERE id = ?'
    ).bind(userId).first<{ password_hash: string }>();

    if (!user?.password_hash) {
      return c.json({ error: 'User not found' }, 404);
    }

    const validPassword = await verifyPassword(password, user.password_hash);
    if (!validPassword) {
      return c.json({ error: 'Incorrect password' }, 401);
    }

    // Disable and clear TOTP data
    await c.env.DB.prepare(`
      UPDATE user_2fa SET
        is_enabled = 0,
        totp_verified = 0,
        totp_secret = NULL,
        backup_codes = NULL,
        updated_at = datetime('now')
      WHERE user_id = ?
    `).bind(userId).run();

    return c.json({ success: true, enabled: false });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

export default routes;
