/**
 * Instructor routes — All instructor-facing endpoints
 *
 * Migrated from Appwrite to D1 database.
 * All data access now uses D1 SQL queries instead of Appwrite SDK.
 *
 * Auth:
 *   - instructorAuth ONLY: /auth/check, /auth/logout, /change-password
 *   - instructorOrAdmin: everything else
 */

import { Hono } from 'hono';
import type { Env } from '../env';
import {
  instructorAuthMiddleware,
  instructorOrAdminMiddleware,
  type InstructorOrAdminAuthVariables,
} from '../lib/instructor-auth-middleware';
import { validateInstructorSession, deleteInstructorSession, createInstructorSession } from '../lib/instructor-auth';
import { authenticateUser, hashPassword, verifyPassword } from '../lib/auth-password';
import { getErrorMessage, generateId, getSessionExpiry } from '../lib/utils';
import { getPublicUrl } from '../lib/r2';

const instructorRoutes = new Hono<{ Bindings: Env; Variables: InstructorOrAdminAuthVariables }>();

// ─── Helper: Format instructor row for backward compatibility ───

function formatInstructorRow(row: Record<string, unknown>): Record<string, unknown> {
  return {
    ...row,
    $id: row.id,
    avatarUrl: row.avatar_url || row.avatarUrl,
  };
}

// ─── Helper: Format course row for backward compatibility ───

function formatCourseRow(row: Record<string, unknown>): Record<string, unknown> {
  return {
    ...row,
    $id: row.id,
    $createdAt: row.created_at,
    isPublished: row.is_published,
    price: row.price ?? row.price_bdt ?? 0,
    instructorId: row.instructor_id,
  };
}

// ─── Helper: Format video row for backward compatibility ───

function formatVideoRow(row: Record<string, unknown>): Record<string, unknown> {
  return {
    ...row,
    courseId: row.course_id,
    videoUrl: row.video_url,
  };
}

// ─── Helper: Format enrollment row for backward compatibility ───

function formatEnrollmentRow(row: Record<string, unknown>): Record<string, unknown> {
  return {
    ...row,
    courseId: row.course_id,
    userId: row.user_id,
  };
}

// ─── Helper: Slugify text for URL-safe slugs ───

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// ─── Helper: Verify instructor owns a course ───

async function verifyCourseOwnership(env: any, courseId: string, instructorId: string): Promise<boolean> {
  const course = await env.DB.prepare('SELECT instructor_id FROM courses WHERE id = ?').bind(courseId).first<{ instructor_id: string }>();
  if (!course) return false;
  if (course.instructor_id === instructorId) return true;
  // Also check course_instructors junction table
  const junction = await env.DB.prepare('SELECT id FROM course_instructors WHERE course_id = ? AND instructor_id = ?').bind(courseId, instructorId).first();
  return !!junction;
}

// ═══════════════════════════════════════════════════
// AUTH ROUTES (login = public, check/logout = instructorAuth ONLY)
// ═══════════════════════════════════════════════════

// POST /auth/login — Instructor login (public, no auth middleware)
instructorRoutes.post('/auth/login', async (c) => {
  try {
    const { email, password } = await c.req.json<{ email: string; password: string }>();

    if (!email || !password) {
      return c.json({ error: 'Email and password are required' }, 400);
    }

    // Authenticate user via D1
    const authResult = await authenticateUser(c.env, email, password);

    if (!authResult.success) {
      return c.json({ error: 'Invalid email or password' }, 401);
    }

    const userId = authResult.userId!;
    const userEmail = authResult.userEmail!;
    const userName = authResult.userName!;
    const userRole = authResult.userRole || 'student';
    const avatarUrl = authResult.avatarUrl || '';

    // Only allow instructor role
    if (userRole !== 'instructor') {
      return c.json({ error: 'This login is for instructors only. Please use the student or admin portal.' }, 403);
    }

    // Create instructor session
    const token = await createInstructorSession(
      c.env,
      userId,
      userEmail,
      userName,
      c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown',
      c.req.header('user-agent') || 'unknown',
      avatarUrl
    );

    // Also fetch the full instructor profile
    let profile: Record<string, unknown> | null = null;
    try {
      const row = await c.env.DB.prepare(
        'SELECT * FROM instructors WHERE id = ?'
      ).bind(userId).first();
      if (row) {
        profile = formatInstructorRow(row as Record<string, unknown>);
      }
    } catch {}

    return c.json({
      success: true,
      token,
      user: {
        id: userId,
        email: userEmail,
        name: userName,
        role: 'instructor',
        avatarUrl,
        ...(profile || {}),
      },
    });
  } catch (error) {
    const message = getErrorMessage(error);
    console.error('Instructor login error:', error);
    return c.json({ error: message }, 401);
  }
});

// POST /auth/forgot-password — Instructor forgot password (public)
instructorRoutes.post('/auth/forgot-password', async (c) => {
  try {
    const { email } = await c.req.json<{ email: string }>();
    if (!email) return c.json({ error: 'Email is required' }, 400);

    // Check if instructor exists in D1
    const user = await c.env.DB.prepare(
      "SELECT id, email, name, role FROM users WHERE email = ? AND role = 'instructor'"
    ).bind(email).first();

    if (!user) {
      // Always return success to prevent email enumeration
      return c.json({ success: true, message: 'If an instructor account exists with this email, you will receive a password reset code.' });
    }

    // Generate 6-digit OTP
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    await c.env.DB.prepare(`
      INSERT INTO otp_codes (target, code, type, expires_at, verified, attempts)
      VALUES (?, ?, 'password_reset', ?, 0, 0)
    `).bind(email, otp, expiresAt).run();

    // Send OTP email via Resend
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${c.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: c.env.RESEND_FROM_EMAIL,
          to: [email],
          subject: 'DAKKHO Instructor - Password Reset Code',
          html: `<div style="font-family:sans-serif;text-align:center;max-width:500px;margin:0 auto;">
            <div style="background:linear-gradient(135deg,#0a0a0a,#333);padding:24px;border-radius:16px 16px 0 0;">
              <h1 style="color:white;margin:0;font-size:20px;">DAKKHO Instructor</h1>
            </div>
            <div style="padding:24px;background:white;border-radius:0 0 16px 16px;">
              <h2 style="color:#1e293b;">Password Reset</h2>
              <p style="color:#64748b;">Your reset code:</p>
              <div style="background:#f1f5f9;padding:16px;border-radius:12px;margin:16px 0;">
                <span style="font-size:28px;font-weight:bold;letter-spacing:8px;color:#0a0a0a;">${otp}</span>
              </div>
              <p style="color:#94a3b8;font-size:13px;">Expires in 10 minutes. Do not share this code.</p>
            </div>
          </div>`,
        }),
      });
    } catch (err) {
      console.error('Failed to send OTP email:', err);
    }

    return c.json({ success: true, message: 'If an instructor account exists with this email, you will receive a password reset code.' });
  } catch {
    return c.json({ success: true, message: 'If an instructor account exists with this email, you will receive a password reset code.' });
  }
});

// POST /auth/reset-password — Reset password with OTP (public)
instructorRoutes.post('/auth/reset-password', async (c) => {
  try {
    const { email, otp, password } = await c.req.json<{ email: string; otp: string; password: string }>();
    if (!email || !otp || !password) {
      return c.json({ error: 'email, otp, and password are required' }, 400);
    }
    if (password.length < 8) {
      return c.json({ error: 'Password must be at least 8 characters' }, 400);
    }

    // Verify OTP
    const otpRecord = await c.env.DB.prepare(
      "SELECT id, expires_at, verified FROM otp_codes WHERE target = ? AND code = ? AND type = 'password_reset' ORDER BY created_at DESC LIMIT 1"
    ).bind(email, otp).first<{ id: number; expires_at: string; verified: number }>();

    if (!otpRecord || otpRecord.verified || new Date(otpRecord.expires_at) < new Date()) {
      return c.json({ error: 'Invalid or expired OTP code' }, 400);
    }

    // Mark OTP as used
    await c.env.DB.prepare('UPDATE otp_codes SET verified = 1 WHERE id = ?').bind(otpRecord.id).run();

    // Find user
    const user = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first<{ id: string }>();
    if (!user) return c.json({ error: 'User not found' }, 404);

    // Update password
    const passwordHash = await hashPassword(password);
    await c.env.DB.prepare(
      'UPDATE users SET password_hash = ?, password_migrated = 1, updated_at = ? WHERE id = ?'
    ).bind(passwordHash, new Date().toISOString(), user.id).run();

    // Invalidate all sessions
    try { await c.env.DB.prepare('UPDATE instructor_sessions SET is_active = 0 WHERE user_id = ?').bind(user.id).run(); } catch {}

    return c.json({ success: true, message: 'Password has been reset successfully. Please login with your new password.' });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// GET /auth/check — Verify instructor session
instructorRoutes.get('/auth/check', instructorAuthMiddleware, async (c) => {
  try {
    const instructorId = c.get('instructorId');
    const instructorEmail = c.get('instructorEmail');
    const instructorName = c.get('instructorName');
    const instructorAvatarUrl = c.get('instructorAvatarUrl');

    return c.json({
      authenticated: true,
      user: {
        id: instructorId,
        email: instructorEmail,
        name: instructorName,
        avatarUrl: instructorAvatarUrl,
        role: 'instructor',
      },
    });
  } catch (error) {
    return c.json({ authenticated: false }, 401);
  }
});

// DELETE /auth/logout — Instructor logout
instructorRoutes.delete('/auth/logout', instructorAuthMiddleware, async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const token = authHeader?.substring(7) || '';

    await deleteInstructorSession(c.env, token);

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// POST /change-password — Change instructor password (instructorAuth ONLY)
instructorRoutes.post('/change-password', instructorAuthMiddleware, async (c) => {
  try {
    const instructorId = c.get('instructorId');
    const instructorEmail = c.get('instructorEmail');
    const { current_password, new_password } = await c.req.json<{ current_password: string; new_password: string }>();

    if (!current_password || !new_password) {
      return c.json({ error: 'Current and new password are required' }, 400);
    }

    if (new_password.length < 8) {
      return c.json({ error: 'New password must be at least 8 characters' }, 400);
    }

    // Verify current password using D1 lookup + verifyPassword
    const user = await c.env.DB.prepare(
      'SELECT id, email, password_hash, password_migrated FROM users WHERE id = ?'
    ).bind(instructorId).first<{ id: string; email: string; password_hash: string | null; password_migrated: number }>();

    if (!user) {
      return c.json({ error: 'User not found' }, 404);
    }

    if (user.password_hash && user.password_migrated === 1) {
      // Fully migrated — verify with D1 password hash
      const valid = await verifyPassword(current_password, user.password_hash);
      if (!valid) {
        return c.json({ error: 'Current password is incorrect' }, 400);
      }
    } else {
      // Not migrated yet — use authenticateUser which falls back to Appwrite
      const authResult = await authenticateUser(c.env, instructorEmail, current_password);
      if (!authResult.success) {
        return c.json({ error: 'Current password is incorrect' }, 400);
      }
    }

    // Hash the new password and update in D1
    const newPasswordHash = await hashPassword(new_password);
    await c.env.DB.prepare(
      'UPDATE users SET password_hash = ?, password_migrated = 1, updated_at = ? WHERE id = ?'
    ).bind(newPasswordHash, new Date().toISOString(), instructorId).run();

    return c.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// ═══════════════════════════════════════════════════
// DASHBOARD ROUTE (instructorOrAdmin)
// ═══════════════════════════════════════════════════

// GET /dashboard — Instructor dashboard stats
instructorRoutes.get('/dashboard', instructorOrAdminMiddleware, async (c) => {
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

    // Course count
    let courseCount = 0;
    try {
      const cc = await c.env.DB.prepare('SELECT COUNT(*) as total FROM courses WHERE instructor_id = ?').bind(instructorId).first<{ total: number }>();
      courseCount = cc?.total || 0;
    } catch {}

    // Total students (from enrollments across all instructor courses)
    let totalStudents = 0;
    try {
      const ts = await c.env.DB.prepare(
        'SELECT COUNT(DISTINCT user_id) as total FROM enrollments WHERE course_id IN (SELECT id FROM courses WHERE instructor_id = ?)'
      ).bind(instructorId).first<{ total: number }>();
      totalStudents = ts?.total || 0;
    } catch {}

    // Average rating
    let avgRating = 0;
    let totalReviews = 0;
    try {
      const rs = await c.env.DB.prepare(
        'SELECT AVG(rating) as avg, COUNT(*) as count FROM instructor_reviews WHERE instructor_id = ?'
      ).bind(instructorId).first<{ avg: number; count: number }>();
      avgRating = rs?.avg ? Math.round(rs.avg * 10) / 10 : 0;
      totalReviews = rs?.count || 0;
    } catch {}

    // Total revenue (from payments for instructor's courses)
    let totalRevenue = 0;
    try {
      const rev = await c.env.DB.prepare(
        "SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE course_id IN (SELECT id FROM courses WHERE instructor_id = ?) AND status = 'completed'"
      ).bind(instructorId).first<{ total: number }>();
      totalRevenue = rev?.total || 0;
    } catch {}

    // Upcoming classes count
    let upcomingClasses = 0;
    try {
      const uc = await c.env.DB.prepare(
        "SELECT COUNT(*) as total FROM live_class_schedules WHERE instructor_id = ? AND scheduled_at > datetime('now') AND is_active = 1"
      ).bind(instructorId).first<{ total: number }>();
      upcomingClasses = uc?.total || 0;
    } catch {}

    return c.json({
      success: true,
      dashboard: {
        courseCount,
        totalStudents,
        avgRating,
        totalReviews,
        totalRevenue,
        upcomingClasses,
      },
    });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// ═══════════════════════════════════════════════════
// PROFILE ROUTES (instructorOrAdmin)
// ═══════════════════════════════════════════════════

// GET /profile — Get instructor profile from D1 instructors table
instructorRoutes.get('/profile', instructorOrAdminMiddleware, async (c) => {
  try {
    const authRole = c.get('authRole');
    let instructorId: string;

    if (authRole === 'admin') {
      // Admin may query by query param
      instructorId = c.req.query('instructorId') || '';
      if (!instructorId) {
        return c.json({ error: 'instructorId query param required for admin access' }, 400);
      }
    } else {
      instructorId = c.get('instructorId');
    }

    const row = await c.env.DB.prepare(
      'SELECT * FROM instructors WHERE id = ?'
    ).bind(instructorId).first();

    if (!row) {
      return c.json({ error: 'Instructor profile not found' }, 404);
    }

    const profile = formatInstructorRow(row as Record<string, unknown>);

    return c.json({ success: true, profile });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// PUT /profile — Update instructor profile (name, bio, avatar, etc.)
instructorRoutes.put('/profile', instructorOrAdminMiddleware, async (c) => {
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

    const body = await c.req.json();

    // Map camelCase field names to snake_case D1 columns
    const fieldMapping: Record<string, string> = {
      name: 'name',
      bio: 'bio',
      avatar: 'avatar_url',
      avatarUrl: 'avatar_url',
      specialization: 'specialization',
      phone: 'phone',
      department: 'department',
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

    params.push(instructorId);

    await c.env.DB.prepare(
      `UPDATE instructors SET ${setClauses.join(', ')} WHERE id = ?`
    ).bind(...params).run();

    // If name was updated, also update the D1 session
    if ((body.name !== undefined) && authRole === 'instructor') {
      try {
        await c.env.DB.prepare(
          'UPDATE instructor_sessions SET name = ? WHERE user_id = ? AND is_active = 1'
        ).bind(String(body.name), instructorId).run();
      } catch {}
    }

    // If avatar was updated, also update the D1 session
    if ((body.avatarUrl !== undefined || body.avatar !== undefined) && authRole === 'instructor') {
      try {
        const avatarVal = body.avatarUrl || body.avatar;
        await c.env.DB.prepare(
          'UPDATE instructor_sessions SET avatar_url = ? WHERE user_id = ? AND is_active = 1'
        ).bind(String(avatarVal), instructorId).run();
      } catch {}
    }

    // Fetch and return the updated profile
    const updatedRow = await c.env.DB.prepare(
      'SELECT * FROM instructors WHERE id = ?'
    ).bind(instructorId).first();

    const profile = formatInstructorRow(updatedRow as Record<string, unknown>);

    return c.json({ success: true, profile });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// POST /profile/avatar — Upload instructor avatar to R2
instructorRoutes.post('/profile/avatar', instructorOrAdminMiddleware, async (c) => {
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

    const formData = await c.req.formData();
    const avatarEntry = formData.get('avatar');
    if (!avatarEntry || typeof avatarEntry === 'string') {
      return c.json({ error: 'No avatar file provided' }, 400);
    }
    const file = avatarEntry as unknown as Blob & { name?: string; type?: string };

    // Clean up old avatar from R2
    try {
      const existingRow = await c.env.DB.prepare(
        'SELECT avatar_url FROM instructors WHERE id = ?'
      ).bind(instructorId).first<{ avatar_url: string | null }>();

      const oldAvatarUrl = existingRow?.avatar_url;
      if (oldAvatarUrl) {
        const uploadMatch = oldAvatarUrl.match(/\/upload\/avatars\/(.+)$/);
        if (uploadMatch?.[1]) {
          await c.env.R2_AVATARS.delete(uploadMatch[1]);
        }
      }
    } catch {}

    // Upload to R2 avatars bucket
    const key = `instructor/${instructorId}/${Date.now()}-${file.name || 'avatar'}`;
    const arrayBuffer = await file.arrayBuffer();
    await c.env.R2_AVATARS.put(key, arrayBuffer, {
      httpMetadata: { contentType: file.type || 'image/png' },
    });

    const avatarUrl = await getPublicUrl(c.env, 'avatars', key);

    // Update D1 instructors table
    await c.env.DB.prepare(
      'UPDATE instructors SET avatar_url = ?, updated_at = ? WHERE id = ?'
    ).bind(avatarUrl, new Date().toISOString(), instructorId).run();

    // Update D1 session
    if (authRole === 'instructor') {
      try {
        await c.env.DB.prepare(
          'UPDATE instructor_sessions SET avatar_url = ? WHERE user_id = ? AND is_active = 1'
        ).bind(avatarUrl, instructorId).run();
      } catch {}
    }

    return c.json({ success: true, avatar_url: avatarUrl });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// ═══════════════════════════════════════════════════
// COURSES ROUTES (instructorOrAdmin)
// ═══════════════════════════════════════════════════

// GET /courses — List courses assigned to this instructor
instructorRoutes.get('/courses', instructorOrAdminMiddleware, async (c) => {
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
instructorRoutes.get('/courses/:id', instructorOrAdminMiddleware, async (c) => {
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

// GET /courses/:id/students — List enrolled students
instructorRoutes.get('/courses/:id/students', instructorOrAdminMiddleware, async (c) => {
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

// GET /courses/:id/videos — List videos for a course
instructorRoutes.get('/courses/:id/videos', instructorOrAdminMiddleware, async (c) => {
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

// PUT /courses/:id/videos/:videoId — Update video metadata (instructor can update title, sort_order, is_preview, is_published)
instructorRoutes.put('/courses/:id/videos/:videoId', instructorOrAdminMiddleware, async (c) => {
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

// GET /courses/:id/progress — Aggregate student progress
instructorRoutes.get('/courses/:id/progress', instructorOrAdminMiddleware, async (c) => {
  try {
    const courseId = c.req.param('id');
    const limit = parseInt(c.req.query('limit') || '50');
    const offset = parseInt(c.req.query('offset') || '0');

    // Get enrollments for this course
    const enrollResult = await c.env.DB.prepare(
      'SELECT * FROM enrollments WHERE course_id = ? LIMIT ? OFFSET ?'
    ).bind(courseId, limit, offset).all();

    const totalEnrollments = await c.env.DB.prepare(
      'SELECT COUNT(*) as total FROM enrollments WHERE course_id = ?'
    ).bind(courseId).first<{ total: number }>();

    // Get video count for this course
    let videoCount = 0;
    try {
      const videoCountResult = await c.env.DB.prepare(
        'SELECT COUNT(*) as total FROM videos WHERE course_id = ?'
      ).bind(courseId).first<{ total: number }>();
      videoCount = videoCountResult?.total || 0;
    } catch {}

    // Get watch progress for each student with user name
    const progressList = [];
    for (const enrollment of enrollResult.results as Array<Record<string, unknown>>) {
      const userId = enrollment.user_id as string | undefined;
      let completedVideos = 0;
      let totalWatchTime = 0;
      let studentName = 'Unknown';
      let studentEmail = '';

      if (userId) {
        try {
          // Get user profile for name
          const userRow = await c.env.DB.prepare(
            'SELECT full_name, email FROM users WHERE id = ?'
          ).bind(userId).first<{ full_name: string; email: string }>();
          if (userRow) {
            studentName = userRow.full_name || 'Unknown';
            studentEmail = userRow.email || '';
          }
        } catch {}

        try {
          // Get aggregated watch progress for this user + course
          const wpStats = await c.env.DB.prepare(
            'SELECT COUNT(*) as total, SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completed, COALESCE(SUM(watch_time), 0) as total_watch FROM watch_progress WHERE user_id = ? AND course_id = ?'
          ).bind(userId, courseId).first<{ total: number; completed: number; total_watch: number }>();

          completedVideos = wpStats?.completed || 0;
          totalWatchTime = wpStats?.total_watch || 0;
        } catch {}
      }

      const progressPercent = videoCount > 0 ? Math.round((completedVideos / videoCount) * 100) : 0;

      progressList.push({
        userId,
        enrollmentId: enrollment.id,
        studentName,
        studentEmail,
        completedVideos,
        totalVideos: videoCount,
        progressPercent,
        totalWatchTime,
      });
    }

    // Aggregate stats
    const avgProgress = progressList.length > 0
      ? Math.round(progressList.reduce((sum, p) => sum + p.progressPercent, 0) / progressList.length)
      : 0;

    return c.json({
      success: true,
      courseId,
      totalStudents: totalEnrollments?.total || 0,
      totalVideos: videoCount,
      averageProgress: avgProgress,
      progress: progressList,
    });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// GET /courses/:id/analytics — Course analytics
instructorRoutes.get('/courses/:id/analytics', instructorOrAdminMiddleware, async (c) => {
  try {
    const courseId = c.req.param('id');

    // Get enrollment count from D1
    let enrollmentCount = 0;
    try {
      const enrollResult = await c.env.DB.prepare(
        'SELECT COUNT(*) as total FROM enrollments WHERE course_id = ?'
      ).bind(courseId).first<{ total: number }>();
      enrollmentCount = enrollResult?.total || 0;
    } catch {}

    // Get video count from D1
    let videoCount = 0;
    try {
      const videoResult = await c.env.DB.prepare(
        'SELECT COUNT(*) as total FROM videos WHERE course_id = ?'
      ).bind(courseId).first<{ total: number }>();
      videoCount = videoResult?.total || 0;
    } catch {}

    // Get recent payments from D1
    let revenue = 0;
    let paymentCount = 0;
    try {
      const paymentStats = await c.env.DB.prepare(
        "SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total FROM payments WHERE course_id = ? AND status = 'completed'"
      ).bind(courseId).first<{ count: number; total: number }>();
      paymentCount = paymentStats?.count || 0;
      revenue = paymentStats?.total || 0;
    } catch {}

    // Get average rating from D1 instructor reviews
    let avgRating = 0;
    let reviewCount = 0;
    try {
      const ratingStats = await c.env.DB.prepare(
        'SELECT AVG(rating) as avg, COUNT(*) as count FROM instructor_reviews WHERE course_id = ?'
      ).bind(courseId).first<{ avg: number; count: number }>();
      avgRating = ratingStats?.avg ? Math.round(ratingStats.avg * 10) / 10 : 0;
      reviewCount = ratingStats?.count || 0;
    } catch {}

    // Get rating distribution for this course
    let ratingDistribution: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    try {
      const distStats = await c.env.DB.prepare(`
        SELECT
          SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) as five_star,
          SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) as four_star,
          SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) as three_star,
          SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) as two_star,
          SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as one_star
        FROM instructor_reviews WHERE course_id = ?
      `).bind(courseId).first();
      ratingDistribution = {
        5: (distStats?.five_star as number) || 0,
        4: (distStats?.four_star as number) || 0,
        3: (distStats?.three_star as number) || 0,
        2: (distStats?.two_star as number) || 0,
        1: (distStats?.one_star as number) || 0,
      };
    } catch {}

    return c.json({
      success: true,
      analytics: {
        courseId,
        enrollmentCount,
        videoCount,
        revenue,
        paymentCount,
        avgRating,
        reviewCount,
        ratingDistribution,
      },
    });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// ═══════════════════════════════════════════════════
// SCHEDULE ROUTES (instructorOrAdmin)
// ═══════════════════════════════════════════════════

// GET /schedule — Get upcoming schedule from D1 live_class_schedules
instructorRoutes.get('/schedule', instructorOrAdminMiddleware, async (c) => {
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

    const result = await c.env.DB.prepare(
      "SELECT * FROM live_class_schedules WHERE instructor_id = ? AND scheduled_at > datetime('now') AND is_active = 1 ORDER BY scheduled_at ASC LIMIT ?"
    ).bind(instructorId, limit).all();

    return c.json({ success: true, schedule: result.results });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// ═══════════════════════════════════════════════════
// REVIEWS ROUTES (instructorOrAdmin)
// ═══════════════════════════════════════════════════

// GET /reviews — Get reviews from D1 instructor_reviews
instructorRoutes.get('/reviews', instructorOrAdminMiddleware, async (c) => {
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

    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '10');
    const offset = (page - 1) * limit;

    const reviews = await c.env.DB.prepare(
      `SELECT ir.*, u.full_name as student_name, u.email as student_email, u.avatar_url as student_avatar
       FROM instructor_reviews ir
       LEFT JOIN users u ON ir.user_id = u.id
       WHERE ir.instructor_id = ? ORDER BY ir.created_at DESC LIMIT ? OFFSET ?`
    ).bind(instructorId, limit, offset).all();

    // Rating stats
    const stats = await c.env.DB.prepare(`
      SELECT 
        AVG(rating) as average_rating,
        COUNT(*) as total_reviews,
        SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) as five_star,
        SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) as four_star,
        SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) as three_star,
        SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) as two_star,
        SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) as one_star
      FROM instructor_reviews WHERE instructor_id = ?
    `).bind(instructorId).first();

    const totalReviews = (stats?.total_reviews as number) || 0;
    const distribution = {
      5: (stats?.five_star as number) || 0,
      4: (stats?.four_star as number) || 0,
      3: (stats?.three_star as number) || 0,
      2: (stats?.two_star as number) || 0,
      1: (stats?.one_star as number) || 0,
    };

    return c.json({
      success: true,
      reviews: reviews.results,
      stats: {
        average_rating: totalReviews > 0 ? Math.round((stats?.average_rating as number) * 10) / 10 : 0,
        total_reviews: totalReviews,
        rating_distribution: distribution,
      },
      page,
      limit,
    });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// ═══════════════════════════════════════════════════
// INSTRUCTOR CRUD ROUTES (instructorOrAdmin)
// ═══════════════════════════════════════════════════

// Helper: Get instructor ID from auth context (instructor or admin with query param)
function getInstructorId(c: any): { instructorId: string; error: ReturnType<typeof c.json> | null } {
  const authRole = c.get('authRole');
  if (authRole === 'admin') {
    const id = c.req.query('instructorId') || '';
    if (!id) {
      return { instructorId: '', error: c.json({ error: 'instructorId query param required for admin access' }, 400) };
    }
    return { instructorId: id, error: null };
  }
  return { instructorId: c.get('instructorId'), error: null };
}

// 1. POST /courses — Create a new course
instructorRoutes.post('/courses', instructorOrAdminMiddleware, async (c) => {
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

// 2. PUT /courses/:id — Update own course
instructorRoutes.put('/courses/:id', instructorOrAdminMiddleware, async (c) => {
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

// 3. DELETE /courses/:id — Delete own draft course
instructorRoutes.delete('/courses/:id', instructorOrAdminMiddleware, async (c) => {
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

// 4. GET /courses/:id/curriculum — Get full curriculum
instructorRoutes.get('/courses/:id/curriculum', instructorOrAdminMiddleware, async (c) => {
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

// 5. POST /courses/:id/chapters — Create chapter
instructorRoutes.post('/courses/:id/chapters', instructorOrAdminMiddleware, async (c) => {
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

// 6. PUT /courses/:id/chapters/:chapterId — Update chapter
instructorRoutes.put('/courses/:id/chapters/:chapterId', instructorOrAdminMiddleware, async (c) => {
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

// 7. DELETE /courses/:id/chapters/:chapterId — Delete chapter
instructorRoutes.delete('/courses/:id/chapters/:chapterId', instructorOrAdminMiddleware, async (c) => {
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

// 8. POST /courses/:id/lessons — Create lesson
instructorRoutes.post('/courses/:id/lessons', instructorOrAdminMiddleware, async (c) => {
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

// 9. PUT /courses/:id/lessons/:lessonId — Update lesson
instructorRoutes.put('/courses/:id/lessons/:lessonId', instructorOrAdminMiddleware, async (c) => {
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

// 10. DELETE /courses/:id/lessons/:lessonId — Delete lesson
instructorRoutes.delete('/courses/:id/lessons/:lessonId', instructorOrAdminMiddleware, async (c) => {
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

// 11. GET /courses/:id/resources — List resources
instructorRoutes.get('/courses/:id/resources', instructorOrAdminMiddleware, async (c) => {
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

// 12. POST /courses/:id/resources — Upload resource
instructorRoutes.post('/courses/:id/resources', instructorOrAdminMiddleware, async (c) => {
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

// 13. DELETE /courses/:id/resources/:resourceId — Delete resource
instructorRoutes.delete('/courses/:id/resources/:resourceId', instructorOrAdminMiddleware, async (c) => {
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
// NOTIFICATIONS ROUTES (instructorOrAdmin)
// ═══════════════════════════════════════════════════

// GET /notifications — Get notifications for instructor from D1
instructorRoutes.get('/notifications', instructorOrAdminMiddleware, async (c) => {
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
    const unreadOnly = c.req.query('unread') === 'true';

    let query = 'SELECT * FROM notifications WHERE user_id = ?';
    const params: unknown[] = [instructorId];

    if (unreadOnly) {
      query += ' AND read = 0';
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const result = await c.env.DB.prepare(query).bind(...params).all();

    // Get total count
    let countQuery = 'SELECT COUNT(*) as total FROM notifications WHERE user_id = ?';
    const countParams: unknown[] = [instructorId];
    if (unreadOnly) {
      countQuery += ' AND read = 0';
    }
    const countResult = await c.env.DB.prepare(countQuery).bind(...countParams).first<{ total: number }>();
    const total = countResult?.total || 0;

    return c.json({ success: true, notifications: result.results, total });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// PUT /notifications/:id/read — Mark notification as read in D1
instructorRoutes.put('/notifications/:id/read', instructorOrAdminMiddleware, async (c) => {
  try {
    const notificationId = c.req.param('id');

    await c.env.DB.prepare(
      'UPDATE notifications SET read = 1 WHERE id = ?'
    ).bind(notificationId).run();

    return c.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// PUT /notifications/read-all — Mark all notifications as read
instructorRoutes.put('/notifications/read-all', instructorOrAdminMiddleware, async (c) => {
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

    await c.env.DB.prepare(
      'UPDATE notifications SET read = 1 WHERE user_id = ? AND read = 0'
    ).bind(instructorId).run();

    return c.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// ═══════════════════════════════════════════════════
// SUPPORT TICKET ROUTES (instructorOrAdmin)
// ═══════════════════════════════════════════════════

// POST /support/tickets — Create support ticket
instructorRoutes.post('/support/tickets', instructorOrAdminMiddleware, async (c) => {
  try {
    const authRole = c.get('authRole');
    let instructorId: string;
    let instructorEmail: string;
    let instructorName: string;

    if (authRole === 'admin') {
      instructorId = c.req.query('instructorId') || '';
      instructorEmail = c.req.query('instructorEmail') || '';
      instructorName = c.req.query('instructorName') || '';
    } else {
      instructorId = c.get('instructorId');
      instructorEmail = c.get('instructorEmail');
      instructorName = c.get('instructorName');
    }

    const body = await c.req.json();
    const { category, subject, description, priority } = body;

    if (!category || !subject || !description) {
      return c.json({ error: 'category, subject, and description are required' }, 400);
    }

    const ticketId = `TK-${String(Math.floor(100000 + Math.random() * 900000))}`;
    const now = new Date().toISOString();

    await c.env.DB.prepare(`
      INSERT INTO support_tickets (ticket_id, user_id, name, email, category, subject, description, priority, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?)
    `).bind(
      ticketId,
      instructorId,
      instructorName,
      instructorEmail,
      category,
      subject,
      description,
      priority || 'medium',
      now,
      now
    ).run();

    return c.json({
      success: true,
      ticket: {
        ticketId,
        status: 'open',
        createdAt: now,
      },
    }, 201);
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// GET /support/tickets — List instructor's tickets
instructorRoutes.get('/support/tickets', instructorOrAdminMiddleware, async (c) => {
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
    const status = c.req.query('status');

    let query = 'SELECT * FROM support_tickets WHERE user_id = ?';
    const params: unknown[] = [instructorId];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const result = await c.env.DB.prepare(query).bind(...params).all();

    return c.json({ success: true, tickets: result.results });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// ═══════════════════════════════════════════════════
// CHAPTERS CRUD (within courses instructor owns)
// ═══════════════════════════════════════════════════

// GET /courses/:courseId/chapters — List chapters for a course
instructorRoutes.get('/courses/:courseId/chapters', instructorOrAdminMiddleware, async (c) => {
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
instructorRoutes.post('/courses/:courseId/chapters', instructorOrAdminMiddleware, async (c) => {
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
instructorRoutes.put('/chapters/:id', instructorOrAdminMiddleware, async (c) => {
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
instructorRoutes.delete('/chapters/:id', instructorOrAdminMiddleware, async (c) => {
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
// LESSONS CRUD (within chapters/courses instructor owns)
// ═══════════════════════════════════════════════════

// GET /courses/:courseId/lessons — List lessons for a course
instructorRoutes.get('/courses/:courseId/lessons', instructorOrAdminMiddleware, async (c) => {
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
instructorRoutes.post('/courses/:courseId/lessons', instructorOrAdminMiddleware, async (c) => {
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
instructorRoutes.put('/lessons/:id', instructorOrAdminMiddleware, async (c) => {
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
instructorRoutes.delete('/lessons/:id', instructorOrAdminMiddleware, async (c) => {
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
// VIDEO UPLOAD (Create/Delete videos for courses instructor owns)
// ═══════════════════════════════════════════════════

// POST /courses/:courseId/videos — Create video (verify ownership)
instructorRoutes.post('/courses/:courseId/videos', instructorOrAdminMiddleware, async (c) => {
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
instructorRoutes.delete('/videos/:id', instructorOrAdminMiddleware, async (c) => {
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

// GET /videos/search — Search instructor's uploaded videos by title
instructorRoutes.get('/videos/search', instructorOrAdminMiddleware, async (c) => {
  try {
    const instructorId = c.get('instructor')?.id || c.get('user')?.id;
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
// RESOURCES CRUD (course_resources for courses instructor owns)
// ═══════════════════════════════════════════════════

// GET /courses/:courseId/resources — List resources for a course
instructorRoutes.get('/courses/:courseId/resources', instructorOrAdminMiddleware, async (c) => {
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
instructorRoutes.post('/courses/:courseId/resources', instructorOrAdminMiddleware, async (c) => {
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
instructorRoutes.put('/resources/:id', instructorOrAdminMiddleware, async (c) => {
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
instructorRoutes.delete('/resources/:id', instructorOrAdminMiddleware, async (c) => {
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
// LIVE CLASS CREATE (for instructor's own courses)
// ═══════════════════════════════════════════════════

// POST /schedule — Create live class (verify course ownership if course_id provided)
instructorRoutes.post('/schedule', instructorOrAdminMiddleware, async (c) => {
  try {
    const authRole = c.get('authRole');
    const instructorId = authRole === 'admin' ? c.req.query('instructorId')! : c.get('instructorId');

    if (!instructorId) {
      return c.json({ error: 'instructorId is required' }, 400);
    }

    const body = await c.req.json();
    const { title, course_id, scheduled_at, duration_minutes, meeting_url, platform, description } = body;

    if (!title || !scheduled_at || !duration_minutes || !meeting_url) {
      return c.json({ error: 'title, scheduled_at, duration_minutes, and meeting_url are required' }, 400);
    }

    // Verify course ownership if course_id provided
    if (course_id) {
      const owns = await verifyCourseOwnership(c.env, course_id, instructorId);
      if (!owns) {
        return c.json({ error: 'You do not own this course' }, 403);
      }
    }

    const now = new Date().toISOString();

    const result = await c.env.DB.prepare(`
      INSERT INTO live_class_schedules (title, course_id, instructor_id, scheduled_at, duration_minutes, meeting_url, platform, description, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `).bind(
      title, course_id || null, instructorId, scheduled_at,
      duration_minutes, meeting_url, platform || null,
      description || null, now, now
    ).run();

    const insertedId = result.meta?.last_row_id;

    const row = await c.env.DB.prepare(
      'SELECT * FROM live_class_schedules WHERE rowid = ?'
    ).bind(insertedId).first();

    return c.json({ success: true, schedule: row }, 201);
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// ═══════════════════════════════════════════════════
// REVIEW REPLY
// ═══════════════════════════════════════════════════

// PUT /reviews/:id/reply — Reply to a review (verify the review's instructor_id matches)
instructorRoutes.put('/reviews/:id/reply', instructorOrAdminMiddleware, async (c) => {
  try {
    const authRole = c.get('authRole');
    const instructorId = authRole === 'admin' ? c.req.query('instructorId')! : c.get('instructorId');
    const reviewId = c.req.param('id');

    if (!instructorId) {
      return c.json({ error: 'instructorId is required' }, 400);
    }

    // Get the review and verify instructor_id matches
    const existing = await c.env.DB.prepare(
      'SELECT instructor_id FROM instructor_reviews WHERE id = ?'
    ).bind(reviewId).first<{ instructor_id: string }>();

    if (!existing) {
      return c.json({ error: 'Review not found' }, 404);
    }

    if (existing.instructor_id !== instructorId) {
      return c.json({ error: 'You can only reply to reviews for yourself' }, 403);
    }

    const body = await c.req.json();
    const { reply_text } = body;

    if (!reply_text) {
      return c.json({ error: 'reply_text is required' }, 400);
    }

    const now = new Date().toISOString();

    await c.env.DB.prepare(
      'UPDATE instructor_reviews SET reply_text = ?, replied_at = ?, updated_at = ? WHERE id = ?'
    ).bind(reply_text, now, now, reviewId).run();

    const row = await c.env.DB.prepare('SELECT * FROM instructor_reviews WHERE id = ?').bind(reviewId).first();

    return c.json({ success: true, review: row });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// ═══════════════════════════════════════════════════
// SUPPORT TICKET CREATE + MESSAGE
// ═══════════════════════════════════════════════════

// POST /support/tickets — Create support ticket
instructorRoutes.post('/support/tickets', instructorOrAdminMiddleware, async (c) => {
  try {
    const authRole = c.get('authRole');
    const instructorId = authRole === 'admin' ? c.req.query('instructorId')! : c.get('instructorId');

    if (!instructorId) {
      return c.json({ error: 'instructorId is required' }, 400);
    }

    const body = await c.req.json();
    const { category, subject, description, priority } = body;

    if (!category || !subject || !description) {
      return c.json({ error: 'category, subject, and description are required' }, 400);
    }

    const now = new Date().toISOString();

    const result = await c.env.DB.prepare(`
      INSERT INTO support_tickets (user_id, category, subject, description, priority, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'open', ?, ?)
    `).bind(
      instructorId, category, subject, description,
      priority || 'medium', now, now
    ).run();

    const insertedId = result.meta?.last_row_id;

    const row = await c.env.DB.prepare(
      'SELECT * FROM support_tickets WHERE rowid = ?'
    ).bind(insertedId).first();

    return c.json({ success: true, ticket: row }, 201);
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// POST /support/tickets/:id/messages — Send message on support ticket
instructorRoutes.post('/support/tickets/:id/messages', instructorOrAdminMiddleware, async (c) => {
  try {
    const authRole = c.get('authRole');
    const instructorId = authRole === 'admin' ? c.req.query('instructorId')! : c.get('instructorId');
    const ticketId = c.req.param('id');

    if (!instructorId) {
      return c.json({ error: 'instructorId is required' }, 400);
    }

    // Verify the ticket belongs to this instructor
    const ticket = await c.env.DB.prepare(
      'SELECT user_id, status FROM support_tickets WHERE id = ?'
    ).bind(ticketId).first<{ user_id: string; status: string }>();

    if (!ticket) {
      return c.json({ error: 'Ticket not found' }, 404);
    }

    if (ticket.user_id !== instructorId) {
      return c.json({ error: 'You can only message on your own tickets' }, 403);
    }

    const body = await c.req.json();
    const { message } = body;

    if (!message) {
      return c.json({ error: 'message is required' }, 400);
    }

    const now = new Date().toISOString();

    const result = await c.env.DB.prepare(`
      INSERT INTO support_messages (ticket_id, user_id, message, is_admin, created_at)
      VALUES (?, ?, ?, 0, ?)
    `).bind(ticketId, instructorId, message, now).run();

    // Update ticket status to 'waiting' if it was 'replied' or 'resolved'
    if (ticket.status !== 'open') {
      await c.env.DB.prepare(
        "UPDATE support_tickets SET status = 'waiting', updated_at = ? WHERE id = ?"
      ).bind(now, ticketId).run();
    } else {
      await c.env.DB.prepare(
        'UPDATE support_tickets SET updated_at = ? WHERE id = ?'
      ).bind(now, ticketId).run();
    }

    const insertedId = result.meta?.last_row_id;

    const row = await c.env.DB.prepare(
      'SELECT * FROM support_messages WHERE rowid = ?'
    ).bind(insertedId).first();

    return c.json({ success: true, message: row }, 201);
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// ═══════════════════════════════════════════════════
// COURSE THUMBNAIL UPLOAD (FormData to R2)
// ═══════════════════════════════════════════════════

// POST /courses/:id/thumbnail — Upload course thumbnail
instructorRoutes.post('/courses/:id/thumbnail', instructorOrAdminMiddleware, async (c) => {
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

// ═══════════════════════════════════════════════════
// VIDEO UPLOAD WITH FORMDATA (video file + thumbnail + CC)
// ═══════════════════════════════════════════════════

// POST /courses/:courseId/videos/upload — Upload video with FormData (video file, thumbnail, CC)
instructorRoutes.post('/courses/:courseId/videos/upload', instructorOrAdminMiddleware, async (c) => {
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

// ═══════════════════════════════════════════════════
// TECHNOLOGIES & SUBJECTS (read-only for instructor)
// ═══════════════════════════════════════════════════

// GET /technologies — List all technologies (for course creation dropdowns)
instructorRoutes.get('/technologies', instructorOrAdminMiddleware, async (c) => {
  try {
    const result = await c.env.DB.prepare(
      'SELECT * FROM technologies ORDER BY name ASC'
    ).all();
    return c.json({ success: true, technologies: result.results });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// GET /subjects — List subjects (optionally filter by technology_id)
instructorRoutes.get('/subjects', instructorOrAdminMiddleware, async (c) => {
  try {
    const technologyId = c.req.query('technology_id');
    let query = 'SELECT * FROM subjects';
    const params: unknown[] = [];

    if (technologyId) {
      query += ' WHERE technology_id = ?';
      params.push(parseInt(technologyId));
    }

    query += ' ORDER BY sort_order ASC, name ASC';

    const result = await c.env.DB.prepare(query).bind(...params).all();
    return c.json({ success: true, subjects: result.results });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// GET /courses/:id/subjects — Get subjects assigned to a course
instructorRoutes.get('/courses/:id/subjects', instructorOrAdminMiddleware, async (c) => {
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
instructorRoutes.post('/courses/:id/subjects', instructorOrAdminMiddleware, async (c) => {
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
instructorRoutes.delete('/courses/:id/subjects/:subjectId', instructorOrAdminMiddleware, async (c) => {
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

export default instructorRoutes;
