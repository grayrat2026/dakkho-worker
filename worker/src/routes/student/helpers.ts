/**
 * Shared helper functions for student API sub-routes
 * Extracted from the original monolithic student-api.ts
 */

import type { Env } from '../../env';
import { validateStudentSession } from '../../lib/student-auth';
import { DEFAULT_CONFIG, type ServerConfig } from '../../lib/types';
import { getErrorMessage, generateId } from '../../lib/utils';
import { hashPassword } from '../../lib/auth-password';

// Re-export commonly used utilities so sub-routes can import from one place
export { getErrorMessage, generateId } from '../../lib/utils';
export { hashPassword, verifyPassword } from '../../lib/auth-password';
export { validateStudentSession, createStudentSession, deleteStudentSession } from '../../lib/student-auth';
export { studentAuthMiddleware, type StudentAuthVariables } from '../../lib/student-auth-middleware';
export { registerPushToken, unregisterPushToken } from '../../lib/onesignal';
export { getBucketForType, getPublicUrl } from '../../lib/r2';
export { rateLimit } from '../../lib/rate-limit';
export { DEFAULT_CONFIG } from '../../lib/types';
export type { ServerConfig } from '../../lib/types';

// ─── Helper: Get student auth from header ───
export async function getStudentAuth(c: any): Promise<{ authorized: boolean; userId?: string; email?: string; name?: string; emailVerified?: boolean }> {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { authorized: false };
  }
  const token = authHeader.substring(7);
  const result = await validateStudentSession(c.env, token);
  return result;
}

// ─── Helper: Get student user from D1 ───
export async function getStudentUserDoc(env: Env, userId: string): Promise<Record<string, unknown> | null> {
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
export async function getInstituteName(env: Env, instituteId: number | null): Promise<string | null> {
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
export async function getTechnologyName(env: Env, shortCode: string | null): Promise<string | null> {
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
export function transformConfigForStudent(config: ServerConfig) {
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

// ─── Helper: Generate a random 6-digit OTP ───
export function generateOTP(): string {
  const bytes = new Uint8Array(3);
  crypto.getRandomValues(bytes);
  const num = (bytes[0] << 16) | (bytes[1] << 8) | bytes[2];
  return (num % 1000000).toString().padStart(6, '0');
}

// ─── Helper: Send password reset OTP email via Resend ───
export async function sendPasswordResetEmail(
  env: Env,
  to: string,
  otp: string
): Promise<void> {
  const { sendEmail } = await import('../../lib/resend');
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

// ─── Helper: Check per-user daily email rate limit ───
const EMAIL_OTP_DAILY_LIMIT = 10; // Max 10 verification emails per user per day

export async function checkDailyEmailRateLimit(db: D1Database, email: string): Promise<{ allowed: boolean; count: number; limit: number }> {
  try {
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

// ─── Helper: Auto-activate package after payment verification ───
export async function autoActivatePackage(env: any, userId: string, packageId: number, courseId: string): Promise<void> {
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

// ─── Helper: Upsert push subscription ───
export async function env_push_upsert(
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

// ─── Default user preferences ───
export const DEFAULT_PREFERENCES = {
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
