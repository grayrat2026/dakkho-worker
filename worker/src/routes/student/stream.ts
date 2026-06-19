/**
 * DAKKHO — Stream Kill API (Concurrent Stream Limit)
 * src/routes/student/stream.ts
 *
 * Implements the original Android spec's "Layer 1: Concurrent Stream Kill":
 *   One account streams on exactly ONE device at a time per video.
 *   If a 2nd device starts the same video → 1st device's token is killed.
 *
 * This is COMPLEMENTARY to single-device login (PR #2 /api/device/*).
 * Single-device login prevents two devices being logged in at once.
 * Stream kill prevents one logged-in device from running two videos in parallel
 * (e.g. via PiP + main player, or a rooted device with multiple windows).
 *
 * Endpoints (all require student auth + X-Device-UUID header):
 *   POST   /api/stream/start           — Player taps Play. Kills any existing session for this video.
 *   POST   /api/stream/heartbeat       — Player sends every 30s while playing.
 *   POST   /api/stream/end             — Player stopped / video finished.
 *   POST   /api/stream/token-refresh   — Renew token 30s before expiry (5min TTL).
 *   GET    /api/stream/active          — Returns currently active stream (for UI).
 *
 * Token TTL: 5 minutes (down from existing 30 min in /api/video/stream/session)
 * Heartbeat interval: 30 seconds
 * Heartbeat timeout: 90 seconds (3 missed heartbeats) → status='timed_out'
 *
 * Note: This module assumes migration-android-anti-piracy.sql has been applied.
 * Note: The existing /api/video/stream/session/:videoId endpoint continues to work
 *       for the web app. Flutter uses these new endpoints instead.
 */

import { Hono } from 'hono';
import type { Env } from '../../env';
import { studentAuthMiddleware } from '../../lib/student-auth-middleware';
import { logError } from '../../lib/error-monitor';

const routes = new Hono<{ Bindings: Env }>();

// All stream endpoints require student auth
routes.use('*', studentAuthMiddleware);

// ────────────────────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────────────────────

const TOKEN_TTL_MS = 5 * 60 * 1000;           // 5 minutes
const TOKEN_TTL_SECONDS = 300;
const HEARTBEAT_INTERVAL_SECONDS = 30;
const HEARTBEAT_TIMEOUT_MS = 90 * 1000;       // 3 missed heartbeats
const TOKEN_REFRESH_THRESHOLD_MS = 30 * 1000; // refresh 30s before expiry

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────

/**
 * Generate HMAC-signed stream token bound to (videoId, sessionId, userId, deviceUuid).
 * Uses ADMIN_SECRET_KEY (same as existing /api/video/stream/session).
 * TODO (CS-1 fix from audit): introduce STREAM_HMAC_SECRET env var to decouple from admin secret.
 */
async function generateStreamToken(
  videoId: string,
  sessionId: string,
  userId: string,
  deviceUuid: string,
  expiry: number,
  secret: string
): Promise<string> {
  const payload = JSON.stringify({ v: videoId, s: sessionId, u: userId, d: deviceUuid, e: expiry });
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature)));
  return btoa(payload) + '.' + sigB64;
}

/**
 * Validate HMAC-signed stream token.
 */
async function validateStreamToken(
  token: string,
  videoId: string,
  secret: string
): Promise<{ valid: boolean; sessionId?: string; userId?: string; deviceUuid?: string; expiry?: number }> {
  try {
    const [payloadB64, sigB64] = token.split('.');
    if (!payloadB64 || !sigB64) return { valid: false };

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']
    );
    const sigBytes = new Uint8Array(Array.from(atob(sigB64), c => c.charCodeAt(0)));
    const valid = await crypto.subtle.verify('HMAC', key, sigBytes, encoder.encode(atob(payloadB64)));
    if (!valid) return { valid: false };

    const payload = JSON.parse(atob(payloadB64));
    if (payload.v !== videoId) return { valid: false };
    if (payload.e && Date.now() > payload.e) return { valid: false };

    return {
      valid: true,
      sessionId: payload.s,
      userId: payload.u,
      deviceUuid: payload.d,
      expiry: payload.e,
    };
  } catch {
    return { valid: false };
  }
}

/**
 * Get device_uuid from X-Device-UUID header.
 */
function getDeviceUuid(c: any): string | null {
  const uuid = c.req.header('X-Device-UUID');
  if (!uuid || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid)) {
    return null;
  }
  return uuid.toLowerCase();
}

/**
 * Kill all active streams for this student+video (concurrent stream kill).
 * Marks them status='killed', sets killed_by to the new session that displaced them.
 * Returns the killed sessions (for logging / push notification to old device).
 */
async function killConcurrentStreams(
  env: Env,
  studentId: string,
  videoId: string,
  excludingDeviceUuid: string,
  newSessionId: string
): Promise<Array<{ id: string; device_uuid: string | null }>> {
  // Find active streams for this student+video on OTHER devices
  const activeStreams = await env.DB.prepare(
    `SELECT id, device_uuid FROM stream_sessions
     WHERE student_id = ? AND video_id = ? AND status = 'active'
       AND (device_uuid IS NULL OR device_uuid != ?)`
  ).bind(studentId, videoId, excludingDeviceUuid).all<{ id: string; device_uuid: string | null }>();

  if (!activeStreams.results.length) return [];

  // Kill each one
  for (const stream of activeStreams.results) {
    await env.DB.prepare(
      `UPDATE stream_sessions
       SET status = 'killed', killed_at = datetime('now'),
           killed_by = ?, kill_reason = 'concurrent_session'
       WHERE id = ?`
    ).bind(newSessionId, stream.id).run();
  }

  return activeStreams.results;
}

/**
 * Check that the student is enrolled in the course for this video.
 * Preview videos bypass this check.
 */
async function checkEnrollment(env: Env, studentId: string, videoId: string): Promise<{
  allowed: boolean;
  reason?: string;
}> {
  const video = await env.DB.prepare(
    'SELECT course_id, is_preview FROM videos WHERE id = ?'
  ).bind(videoId).first<{ course_id: string; is_preview: number }>();

  if (!video) {
    return { allowed: false, reason: 'video_not_found' };
  }

  // Preview videos are open
  if (video.is_preview === 1) {
    return { allowed: true };
  }

  // Check enrollment
  const enrollment = await env.DB.prepare(
    `SELECT id FROM enrollments WHERE user_id = ? AND course_id = ? AND status = 'active'`
  ).bind(studentId, video.course_id).first();

  if (!enrollment) {
    return { allowed: false, reason: 'not_enrolled' };
  }

  return { allowed: true };
}

// ────────────────────────────────────────────────────────────
// POST /api/stream/start
// ────────────────────────────────────────────────────────────
// Called by Flutter's UnifiedVideoPlayer when user taps Play.
// 1. Validates enrollment.
// 2. Kills any existing active stream for this student+video on a different device.
// 3. Creates new stream_sessions row.
// 4. Returns fresh HMAC token (5-min TTL) + heartbeat interval.
routes.post('/start', async (c) => {
  const studentId = c.get('studentId') as string;
  const deviceUuid = getDeviceUuid(c);

  if (!deviceUuid) {
    return c.json({
      error: 'X-Device-UUID header required (UUID v4)',
      code: 'missing_device_uuid',
    }, 400);
  }

  const body = await c.req.json().catch(() => ({}));
  const videoId = body.videoId;

  if (!videoId) {
    return c.json({ error: 'videoId is required in body', code: 'missing_video_id' }, 400);
  }

  // 1. Enrollment check
  const enrollment = await checkEnrollment(c.env, studentId, String(videoId));
  if (!enrollment.allowed) {
    return c.json({
      error: enrollment.reason === 'not_enrolled'
        ? 'Not enrolled in this course'
        : 'Video not found',
      code: enrollment.reason,
    }, enrollment.reason === 'not_enrolled' ? 403 : 404);
  }

  // 2. Get video info for HLS readiness check
  const video = await c.env.DB.prepare(
    'SELECT hls_ready, available_qualities, processing_status FROM videos WHERE id = ?'
  ).bind(String(videoId)).first<{ hls_ready: number; available_qualities: string; processing_status: string }>();

  if (!video) {
    return c.json({ error: 'Video not found' }, 404);
  }

  if (!video.hls_ready) {
    return c.json({
      error: 'Video is still being processed',
      code: 'hls_not_ready',
      processingStatus: video.processing_status || 'pending',
    }, 425);  // 425 Too Early — appropriate for "try again later"
  }

  // 3. Create new stream session
  const sessionId = crypto.randomUUID();
  const now = Date.now();
  const expiresAt = new Date(now + TOKEN_TTL_MS).toISOString().replace('T', ' ').replace('Z', '');
  const startedAt = new Date(now).toISOString().replace('T', ' ').replace('Z', '');

  // Insert first, then kill concurrents (so we can pass our ID as killed_by)
  await c.env.DB.prepare(
    `INSERT INTO stream_sessions
     (id, student_id, video_id, device_uuid, stream_token,
      started_at, last_heartbeat_at, expires_at, status, ip_address, user_agent)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`
  ).bind(
    sessionId,
    studentId,
    String(videoId),
    deviceUuid,
    '',  // token set below in update
    startedAt,
    startedAt,
    expiresAt,
    c.req.header('CF-Connecting-IP') || '',
    c.req.header('User-Agent') || ''
  ).run();

  // 4. Kill concurrent streams on other devices
  const killedStreams = await killConcurrentStreams(
    c.env, studentId, String(videoId), deviceUuid, sessionId
  );

  // 5. Generate HMAC token bound to this session + device
  const token = await generateStreamToken(
    String(videoId), sessionId, studentId, deviceUuid,
    now + TOKEN_TTL_MS, c.env.ADMIN_SECRET_KEY
  );

  // Persist token in stream_sessions row
  await c.env.DB.prepare(
    `UPDATE stream_sessions SET stream_token = ? WHERE id = ?`
  ).bind(token, sessionId).run();

  // 6. Build the HLS playlist URL (existing /api/video/stream/playlist/:videoId accepts ?token=)
  const workerUrl = new URL(c.req.url).origin;
  const hlsUrl = `${workerUrl}/api/video/stream/playlist/${videoId}?token=${encodeURIComponent(token)}`;

  return c.json({
    success: true,
    streamId: sessionId,
    hlsUrl,
    token,
    tokenTtl: TOKEN_TTL_SECONDS,
    heartbeatInterval: HEARTBEAT_INTERVAL_SECONDS,
    expiresAt: new Date(now + TOKEN_TTL_MS).toISOString(),
    availableQualities: JSON.parse(video.available_qualities || '["360p"]'),
    concurrentStreamsKilled: killedStreams.length,
  });
});

// ────────────────────────────────────────────────────────────
// POST /api/stream/heartbeat
// ────────────────────────────────────────────────────────────
// Player sends this every 30s while playing.
// Updates last_heartbeat_at. If session is killed, returns {killed: true}.
routes.post('/heartbeat', async (c) => {
  const studentId = c.get('studentId') as string;
  const body = await c.req.json().catch(() => ({}));
  const streamId = body.streamId;

  if (!streamId) {
    return c.json({ error: 'streamId is required in body' }, 400);
  }

  const stream = await c.env.DB.prepare(
    `SELECT id, student_id, status, expires_at FROM stream_sessions WHERE id = ?`
  ).bind(streamId).first<{ id: string; student_id: string; status: string; expires_at: string }>();

  if (!stream) {
    return c.json({
      error: 'Stream session not found',
      code: 'stream_not_found',
      killed: true,
    }, 404);
  }

  if (stream.student_id !== studentId) {
    return c.json({ error: 'Unauthorized' }, 403);
  }

  // If killed by another device, tell the client
  if (stream.status === 'killed') {
    return c.json({
      acknowledged: false,
      killed: true,
      reason: 'concurrent_session',
      message: 'Stream moved to another device',
    });
  }

  if (stream.status === 'timed_out' || stream.status === 'ended' || stream.status === 'expired') {
    return c.json({
      acknowledged: false,
      killed: true,
      reason: stream.status,
      message: 'Stream has ended',
    });
  }

  // Update heartbeat
  await c.env.DB.prepare(
    `UPDATE stream_sessions SET last_heartbeat_at = datetime('now') WHERE id = ?`
  ).bind(streamId).run();

  return c.json({
    acknowledged: true,
    killed: false,
    nextHeartbeatIn: HEARTBEAT_INTERVAL_SECONDS,
  });
});

// ────────────────────────────────────────────────────────────
// POST /api/stream/end
// ────────────────────────────────────────────────────────────
// Called when user pauses indefinitely, exits the video, or video finishes.
// Marks session as 'ended'. Does NOT kill concurrent streams (they're already dead).
routes.post('/end', async (c) => {
  const studentId = c.get('studentId') as string;
  const body = await c.req.json().catch(() => ({}));
  const streamId = body.streamId;

  if (!streamId) {
    return c.json({ error: 'streamId is required in body' }, 400);
  }

  const stream = await c.env.DB.prepare(
    `SELECT id, student_id FROM stream_sessions WHERE id = ?`
  ).bind(streamId).first<{ id: string; student_id: string }>();

  if (!stream) {
    return c.json({ error: 'Stream session not found' }, 404);
  }

  if (stream.student_id !== studentId) {
    return c.json({ error: 'Unauthorized' }, 403);
  }

  await c.env.DB.prepare(
    `UPDATE stream_sessions
     SET status = 'ended', ended_at = datetime('now')
     WHERE id = ? AND status = 'active'`
  ).bind(streamId).run();

  return c.json({ success: true, ended: true });
});

// ────────────────────────────────────────────────────────────
// POST /api/stream/token-refresh
// ────────────────────────────────────────────────────────────
// Player calls this 30s before token expiry (or on 401 from segment fetch).
// Validates session is still active + heartbeat is recent, then issues new token.
routes.post('/token-refresh', async (c) => {
  const studentId = c.get('studentId') as string;
  const deviceUuid = getDeviceUuid(c);
  const body = await c.req.json().catch(() => ({}));
  const streamId = body.streamId;

  if (!streamId) {
    return c.json({ error: 'streamId is required in body' }, 400);
  }

  if (!deviceUuid) {
    return c.json({ error: 'X-Device-UUID header required' }, 400);
  }

  const stream = await c.env.DB.prepare(
    `SELECT id, student_id, video_id, device_uuid, status, last_heartbeat_at
     FROM stream_sessions WHERE id = ?`
  ).bind(streamId).first<{
    id: string; student_id: string; video_id: string; device_uuid: string;
    status: string; last_heartbeat_at: string;
  }>();

  if (!stream) {
    return c.json({ error: 'Stream session not found', code: 'stream_not_found' }, 404);
  }

  if (stream.student_id !== studentId) {
    return c.json({ error: 'Unauthorized' }, 403);
  }

  if (stream.status === 'killed') {
    return c.json({
      error: 'Stream has been killed by another device',
      code: 'stream_killed',
      killed: true,
      reason: 'concurrent_session',
    }, 409);
  }

  if (stream.status !== 'active') {
    return c.json({
      error: `Stream is not active (status: ${stream.status})`,
      code: 'stream_not_active',
    }, 409);
  }

  // Heartbeat liveness check (3 missed → refuse refresh, client must restart)
  const lastHeartbeat = new Date(stream.last_heartbeat_at + 'Z').getTime();
  if (Date.now() - lastHeartbeat > HEARTBEAT_TIMEOUT_MS) {
    await c.env.DB.prepare(
      `UPDATE stream_sessions SET status = 'timed_out', ended_at = datetime('now') WHERE id = ?`
    ).bind(streamId).run();

    return c.json({
      error: 'Heartbeat timeout — stream has been timed out',
      code: 'heartbeat_timeout',
    }, 410);
  }

  // Issue new token
  const newExpiry = Date.now() + TOKEN_TTL_MS;
  const newToken = await generateStreamToken(
    stream.video_id, stream.id, studentId, deviceUuid,
    newExpiry, c.env.ADMIN_SECRET_KEY
  );

  const newExpiresAt = new Date(newExpiry).toISOString().replace('T', ' ').replace('Z', '');
  await c.env.DB.prepare(
    `UPDATE stream_sessions SET stream_token = ?, expires_at = ? WHERE id = ?`
  ).bind(newToken, newExpiresAt, streamId).run();

  // Build new HLS URL
  const workerUrl = new URL(c.req.url).origin;
  const hlsUrl = `${workerUrl}/api/video/stream/playlist/${stream.video_id}?token=${encodeURIComponent(newToken)}`;

  return c.json({
    success: true,
    streamId: stream.id,
    hlsUrl,
    token: newToken,
    tokenTtl: TOKEN_TTL_SECONDS,
    expiresAt: new Date(newExpiry).toISOString(),
  });
});

// ────────────────────────────────────────────────────────────
// GET /api/stream/active
// ────────────────────────────────────────────────────────────
// Returns the currently active stream for this student (if any).
// Flutter's UI uses this on app resume to detect mid-playback state.
routes.get('/active', async (c) => {
  const studentId = c.get('studentId') as string;

  const active = await c.env.DB.prepare(
    `SELECT id, video_id, device_uuid, started_at, last_heartbeat_at, expires_at, status
     FROM stream_sessions
     WHERE student_id = ? AND status = 'active'
     ORDER BY started_at DESC LIMIT 1`
  ).bind(studentId).first();

  if (!active) {
    return c.json({ active: false });
  }

  return c.json({
    active: true,
    stream: active,
  });
});

export default routes;
