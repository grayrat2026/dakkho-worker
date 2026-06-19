/**
 * DAKKHO — Device Binding API
 * src/routes/student/device.ts
 *
 * Single-device login enforcement + device lifecycle management.
 *
 * Endpoints (all require student auth + X-Device-UUID header):
 *   POST   /api/device/bind      — Called on every login (after /api/auth/login)
 *   POST   /api/device/verify    — Called on app cold start + every 5min heartbeat
 *   GET    /api/device/status    — Returns current device + binding info
 *   POST   /api/device/switch    — User-initiated "Switch Device" button (rebinds)
 *   POST   /api/device/ack-force-logout  — Flutter client acks force-logout signal
 *
 * Single-Device Login Flow:
 *   1. Flutter app calls /api/auth/login → gets JWT token + user object
 *   2. Flutter immediately calls /api/device/bind with X-Device-UUID header
 *   3. Server:
 *      a. If this device_uuid is already the active binding for this student → no-op, return OK
 *      b. If a DIFFERENT device is currently active:
 *         - Mark old device row is_active=0 (revoked_reason='forced_logout')
 *         - Mark old student_sessions.is_active=0 (kills the JWT)
 *         - INSERT force_logout_signals row for the old session_id
 *         - INSERT new student_devices row (is_active=1)
 *   4. Old device's next /api/device/verify (within 5min) returns {forceLogout: true}
 *   5. Old device's Flutter client wipes local data + redirects to login
 *   6. Old device calls /api/device/ack-force-logout → server deletes the signal
 *
 * Cooldown / abuse detection (per spec):
 *   - 7-day cooldown between self-service device switches
 *   - 5+ switches in 30 days → flag account as 'device_abuse'
 *   - 2-4 switches in 30 days → log + watch
 *
 * Note: This module assumes migration-android-anti-piracy.sql has been applied.
 */

import { Hono } from 'hono';
import type { Env } from '../../env';
import { studentAuthMiddleware } from '../../lib/student-auth-middleware';

const routes = new Hono<{ Bindings: Env }>();

// All device endpoints require student auth
routes.use('*', studentAuthMiddleware);

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────

const COOLDOWN_DAYS = 7;
const ABUSE_THRESHOLD_SWITCHES = 5;
const ABUSE_WINDOW_DAYS = 30;

interface DeviceBindingRow {
  id: string;
  student_id: string;
  device_uuid: string;
  device_name: string | null;
  bound_at: string;
  last_seen_at: string;
  is_active: number;
  revoked_at: string | null;
  revoke_reason: string | null;
}

interface ForceLogoutRow {
  id: string;
  session_id: string;
  device_uuid: string | null;
  reason: string;
}

/**
 * Get the device_uuid from the X-Device-UUID header.
 * Flutter sends this on every authenticated request.
 */
function getDeviceUuid(c: any): string | null {
  const uuid = c.req.header('X-Device-UUID');
  if (!uuid || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid)) {
    return null;
  }
  return uuid.toLowerCase();
}

/**
 * Check if student is allowed to switch devices (7-day cooldown + abuse check).
 * Returns { allowed, reason, cooldownEndsAt }.
 */
async function checkSwitchCooldown(env: Env, studentId: string): Promise<{
  allowed: boolean;
  reason: string;
  cooldownEndsAt: string | null;
  switchesInWindow: number;
}> {
  // Find most recent revoked device for this student (last switch)
  const lastSwitch = await env.DB.prepare(
    `SELECT revoked_at FROM student_devices
     WHERE student_id = ? AND revoked_at IS NOT NULL
     ORDER BY revoked_at DESC LIMIT 1`
  ).bind(studentId).first<{ revoked_at: string }>();

  // Count switches in last 30 days
  const cutoff = new Date(Date.now() - ABUSE_WINDOW_DAYS * 24 * 60 * 60 * 1000)
    .toISOString().replace('T', ' ').replace('Z', '');
  const switchCount = await env.DB.prepare(
    `SELECT COUNT(*) as cnt FROM student_devices
     WHERE student_id = ? AND revoked_at IS NOT NULL AND revoked_at > ?`
  ).bind(studentId, cutoff).first<{ cnt: number }>();

  const switchesInWindow = switchCount?.cnt || 0;

  // Abuse check: 5+ switches in 30 days → flag account
  if (switchesInWindow >= ABUSE_THRESHOLD_SWITCHES) {
    // Set account_flag on user (column must exist; safe to ignore if not)
    try {
      await env.DB.prepare(
        `UPDATE users SET account_flag = 'device_abuse' WHERE id = ?`
      ).bind(studentId).run();
    } catch {}
    return {
      allowed: false,
      reason: 'account_flagged_abuse',
      cooldownEndsAt: null,
      switchesInWindow,
    };
  }

  // Cooldown check: 7 days since last switch
  if (lastSwitch?.revoked_at) {
    const lastSwitchTime = new Date(lastSwitch.revoked_at + 'Z').getTime();
    const cooldownEnds = lastSwitchTime + COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
    if (Date.now() < cooldownEnds) {
      return {
        allowed: false,
        reason: 'cooldown_active',
        cooldownEndsAt: new Date(cooldownEnds).toISOString(),
        switchesInWindow,
      };
    }
  }

  return { allowed: true, reason: 'ok', cooldownEndsAt: null, switchesInWindow };
}

/**
 * Mark a session as force-logged-out (creates signal for Flutter client).
 */
async function signalForceLogout(
  env: Env,
  studentId: string,
  sessionId: string,
  deviceUuid: string | null,
  reason: string = 'logged_in_elsewhere'
): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO force_logout_signals (id, student_id, session_id, device_uuid, reason, created_at)
     VALUES (?, ?, ?, ?, ?, datetime('now'))`
  ).bind(
    crypto.randomUUID(),
    studentId,
    sessionId,
    deviceUuid,
    reason
  ).run();
}

// ────────────────────────────────────────────────────────────
// POST /api/device/bind
// ────────────────────────────────────────────────────────────
// Called by Flutter app immediately after successful /api/auth/login.
// Idempotent if same device is already active.
// Triggers force-logout of any other active device.
routes.post('/bind', async (c) => {
  const studentId = c.get('studentId') as string;
  const deviceUuid = getDeviceUuid(c);

  if (!deviceUuid) {
    return c.json({
      error: 'X-Device-UUID header is required (UUID v4 format)',
      code: 'missing_device_uuid',
    }, 400);
  }

  const body = await c.req.json().catch(() => ({}));
  const deviceName = body.deviceName || null;
  const deviceModel = body.deviceModel || null;
  const androidVersion = body.androidVersion || null;
  const appVersion = body.appVersion || null;
  const appFlavor = body.appFlavor || 'prod';
  const osLanguage = body.osLanguage || null;
  const ipAddress = c.req.header('CF-Connecting-IP') || '';

  // 1. Find existing active binding for this student
  const currentActive = await env.DB.prepare(
    `SELECT id, device_uuid, is_active FROM student_devices
     WHERE student_id = ? AND is_active = 1`
  ).bind(studentId).first<DeviceBindingRow & { id: string }>();

  // 2a. Same device already active → just refresh last_seen_at
  if (currentActive && currentActive.device_uuid === deviceUuid) {
    await env.DB.prepare(
      `UPDATE student_devices
       SET last_seen_at = datetime('now'),
           device_name = COALESCE(?, device_name),
           device_model = COALESCE(?, device_model),
           android_version = COALESCE(?, android_version),
           app_version = COALESCE(?, app_version),
           ip_address = ?
       WHERE id = ?`
    ).bind(deviceName, deviceModel, androidVersion, appVersion, ipAddress, currentActive.id).run();

    return c.json({
      status: 'ok',
      action: 'refreshed',
      deviceId: currentActive.id,
      isActive: true,
      message: 'Device already bound',
    });
  }

  // 2b. Different device is currently active → enforce single-device
  if (currentActive && currentActive.device_uuid !== deviceUuid) {
    // Cooldown + abuse check (only for self-service switches — login flow bypasses)
    // Note: We DO NOT enforce cooldown on /bind called right after login, because
    // that's the natural "I logged in on a new phone" flow. The /switch endpoint
    // is for the explicit "Switch Device" button in Settings, and that DOES enforce cooldown.
    // For /bind, we just kick the old device.

    // Revoke old device
    await env.DB.prepare(
      `UPDATE student_devices
       SET is_active = 0, revoked_at = datetime('now'), revoke_reason = 'forced_logout'
       WHERE id = ?`
    ).bind(currentActive.id).run();

    // Kill old session (JWT becomes invalid)
    const oldSession = await env.DB.prepare(
      `SELECT id FROM student_sessions
       WHERE user_id = ? AND is_active = 1`
    ).bind(studentId).first<{ id: string }>();

    if (oldSession) {
      await env.DB.prepare(
        `UPDATE student_sessions SET is_active = 0 WHERE id = ?`
      ).bind(oldSession.id).run();

      // Signal force-logout so old device's Flutter app wipes local data
      await signalForceLogout(
        c.env,
        studentId,
        oldSession.id,
        currentActive.device_uuid,
        'logged_in_elsewhere'
      );
    }
  }

  // 3. Insert new device binding (is_active=1)
  // Note: unique index `idx_student_devices_active_per_student` enforces only ONE active per student.
  // If a race condition inserts two simultaneously, the second will fail with UNIQUE violation.
  const newDeviceId = crypto.randomUUID();
  try {
    await env.DB.prepare(
      `INSERT INTO student_devices
       (id, student_id, device_uuid, device_name, device_model, android_version,
        app_version, app_flavor, os_language, bound_at, last_seen_at, is_active, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), 1, ?)`
    ).bind(
      newDeviceId, studentId, deviceUuid, deviceName, deviceModel, androidVersion,
      appVersion, appFlavor, osLanguage, ipAddress
    ).run();
  } catch (err) {
    // UNIQUE violation = race condition. Re-fetch and report.
    return c.json({
      status: 'error',
      code: 'device_binding_race',
      message: 'Another device is binding concurrently. Please retry.',
    }, 409);
  }

  return c.json({
    status: 'ok',
    action: currentActive ? 'switched' : 'bound',
    deviceId: newDeviceId,
    isActive: true,
    previousDeviceKilled: !!currentActive,
    message: currentActive
      ? 'Previous device has been logged out. Its data will be wiped on next sync.'
      : 'Device bound successfully',
  });
});

// ────────────────────────────────────────────────────────────
// POST /api/device/verify
// ────────────────────────────────────────────────────────────
// Called by Flutter app:
//   - On cold start (after /api/auth/me)
//   - Every 5 minutes as a heartbeat (in background)
//   - On app foreground (resume)
//
// Returns:
//   { isActive: true }   → continue normally
//   { forceLogout: true, reason: '...' }  → wipe local data + go to login
//   { isActive: false, code: 'device_revoked' }  → user revoked from settings
routes.post('/verify', async (c) => {
  const studentId = c.get('studentId') as string;
  const sessionId = c.get('sessionId') as string;  // Set by enhanced auth middleware (see below)
  const deviceUuid = getDeviceUuid(c);

  if (!deviceUuid) {
    return c.json({
      error: 'X-Device-UUID header is required',
      code: 'missing_device_uuid',
    }, 400);
  }

  // 1. Check for pending force-logout signal for this session
  const signal = await c.env.DB.prepare(
    `SELECT id, reason FROM force_logout_signals
     WHERE session_id = ? AND acked_at IS NULL
     LIMIT 1`
  ).bind(sessionId).first<ForceLogoutRow>();

  if (signal) {
    return c.json({
      isActive: false,
      forceLogout: true,
      reason: signal.reason,
      signalId: signal.id,
      message: 'আপনার account অন্য ডিভাইসে login করা হয়েছে। সব লোকাল ডেটা মুছে ফেলা হবে।',
    });
  }

  // 2. Check device is still the active one for this student
  const device = await c.env.DB.prepare(
    `SELECT id, is_active FROM student_devices
     WHERE student_id = ? AND device_uuid = ?`
  ).bind(studentId, deviceUuid).first<{ id: string; is_active: number }>();

  if (!device) {
    return c.json({
      isActive: false,
      forceLogout: true,
      reason: 'device_not_bound',
      message: 'This device is no longer bound to your account.',
    }, 401);
  }

  if (device.is_active !== 1) {
    return c.json({
      isActive: false,
      forceLogout: true,
      reason: 'device_revoked',
      message: 'This device has been revoked. Please log in again to rebind.',
    }, 401);
  }

  // 3. Refresh last_seen_at
  await c.env.DB.prepare(
    `UPDATE student_devices SET last_seen_at = datetime('now') WHERE id = ?`
  ).bind(device.id).run();

  return c.json({
    isActive: true,
    forceLogout: false,
    lastSeenAt: new Date().toISOString(),
  });
});

// ────────────────────────────────────────────────────────────
// GET /api/device/status
// ────────────────────────────────────────────────────────────
// Returns full device-binding status for the Settings page.
routes.get('/status', async (c) => {
  const studentId = c.get('studentId') as string;
  const deviceUuid = getDeviceUuid(c);

  // Current active device
  const current = await c.env.DB.prepare(
    `SELECT id, device_uuid, device_name, device_model, android_version,
            app_version, app_flavor, bound_at, last_seen_at, ip_address
     FROM student_devices WHERE student_id = ? AND is_active = 1`
  ).bind(studentId).first();

  // History (last 10)
  const history = await c.env.DB.prepare(
    `SELECT device_uuid, device_name, bound_at, revoked_at, revoke_reason
     FROM student_devices WHERE student_id = ?
     ORDER BY bound_at DESC LIMIT 10`
  ).bind(studentId).all();

  // Cooldown info (for "Switch Device" button)
  const cooldown = await checkSwitchCooldown(c.env, studentId);

  // Switches in last 30 days (for user-visible warning)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString().replace('T', ' ').replace('Z', '');
  const switchesResult = await c.env.DB.prepare(
    `SELECT COUNT(*) as cnt FROM student_devices
     WHERE student_id = ? AND revoked_at IS NOT NULL AND revoked_at > ?`
  ).bind(studentId, thirtyDaysAgo).first<{ cnt: number }>();

  return c.json({
    currentDevice: current,
    isCurrentDevice: current && current.device_uuid === deviceUuid,
    deviceHistory: history.results,
    cooldown: {
      active: !cooldown.allowed && cooldown.reason === 'cooldown_active',
      endsAt: cooldown.cooldownEndsAt,
      daysRemaining: cooldown.cooldownEndsAt
        ? Math.ceil((new Date(cooldown.cooldownEndsAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000))
        : 0,
    },
    abuseFlagged: cooldown.reason === 'account_flagged_abuse',
    switchesInLast30Days: switchesResult?.cnt || 0,
    isThisDevice: current?.device_uuid === deviceUuid,
  });
});

// ────────────────────────────────────────────────────────────
// POST /api/device/switch
// ────────────────────────────────────────────────────────────
// User-initiated "Switch Device" button in Settings.
// Unlike /bind, this enforces the 7-day cooldown + abuse check.
//
// Flow: Flutter app calls this on the NEW device after user logs in.
// (The OLD device's session gets killed via the force_logout signal.)
routes.post('/switch', async (c) => {
  const studentId = c.get('studentId') as string;
  const deviceUuid = getDeviceUuid(c);

  if (!deviceUuid) {
    return c.json({ error: 'X-Device-UUID header required', code: 'missing_device_uuid' }, 400);
  }

  // Enforce cooldown
  const cooldown = await checkSwitchCooldown(c.env, studentId);
  if (!cooldown.allowed) {
    return c.json({
      error: cooldown.reason === 'cooldown_active'
        ? `Switch করতে হলে আরও ${cooldown.cooldownEndsAt ? Math.ceil((new Date(cooldown.cooldownEndsAt).getTime() - Date.now()) / (24*60*60*1000)) : 0} দিন অপেক্ষা করুন`
        : 'Account flagged for device switching abuse. Contact support.',
      code: cooldown.reason,
      cooldownEndsAt: cooldown.cooldownEndsAt,
    }, 429);
  }

  // If same device is already active, no-op
  const current = await c.env.DB.prepare(
    `SELECT id FROM student_devices WHERE student_id = ? AND device_uuid = ? AND is_active = 1`
  ).bind(studentId, deviceUuid).first();

  if (current) {
    return c.json({
      status: 'ok',
      action: 'noop',
      message: 'This device is already the active one.',
    });
  }

  // Revoke current active device + kill session + signal force-logout
  const oldActive = await c.env.DB.prepare(
    `SELECT id, device_uuid FROM student_devices WHERE student_id = ? AND is_active = 1`
  ).bind(studentId).first<{ id: string; device_uuid: string }>();

  if (oldActive) {
    await c.env.DB.prepare(
      `UPDATE student_devices
       SET is_active = 0, revoked_at = datetime('now'), revoke_reason = 'self_service_switch'
       WHERE id = ?`
    ).bind(oldActive.id).run();

    const oldSession = await c.env.DB.prepare(
      `SELECT id FROM student_sessions WHERE user_id = ? AND is_active = 1`
    ).bind(studentId).first<{ id: string }>();

    if (oldSession) {
      await c.env.DB.prepare(
        `UPDATE student_sessions SET is_active = 0 WHERE id = ?`
      ).bind(oldSession.id).run();

      await signalForceLogout(
        c.env, studentId, oldSession.id,
        oldActive.device_uuid, 'self_service_switch'
      );
    }
  }

  // Bind new device
  const body = await c.req.json().catch(() => ({}));
  const newDeviceId = crypto.randomUUID();
  await c.env.DB.prepare(
    `INSERT INTO student_devices
     (id, student_id, device_uuid, device_name, device_model, android_version,
      app_version, app_flavor, os_language, bound_at, last_seen_at, is_active, ip_address)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), 1, ?)`
  ).bind(
    newDeviceId, studentId, deviceUuid,
    body.deviceName || null, body.deviceModel || null, body.androidVersion || null,
    body.appVersion || null, body.appFlavor || 'prod', body.osLanguage || null,
    c.req.header('CF-Connecting-IP') || ''
  ).run();

  return c.json({
    status: 'ok',
    action: 'switched',
    deviceId: newDeviceId,
    previousDeviceKilled: !!oldActive,
    switchesInLast30Days: cooldown.switchesInWindow + 1,
    cooldownEndsAt: new Date(Date.now() + COOLDOWN_DAYS * 24 * 60 * 60 * 1000).toISOString(),
    message: 'Device switched successfully. Previous device will be logged out.',
  });
});

// ────────────────────────────────────────────────────────────
// POST /api/device/ack-force-logout
// ────────────────────────────────────────────────────────────
// Flutter client calls this AFTER it has wiped local data, to ack the signal.
// Server then deletes the signal row (or marks acked_at).
// Idempotent — multiple acks are safe.
routes.post('/ack-force-logout', async (c) => {
  const studentId = c.get('studentId') as string;
  const sessionId = c.get('sessionId') as string;
  const body = await c.req.json().catch(() => ({}));
  const signalId = body.signalId;

  if (signalId) {
    await c.env.DB.prepare(
      `UPDATE force_logout_signals SET acked_at = datetime('now')
       WHERE id = ? AND student_id = ?`
    ).bind(signalId, studentId).run();
  } else {
    // Ack all pending signals for this session
    await c.env.DB.prepare(
      `UPDATE force_logout_signals SET acked_at = datetime('now')
       WHERE session_id = ? AND acked_at IS NULL`
    ).bind(sessionId).run();
  }

  return c.json({ status: 'ok', acked: true });
});

export default routes;
