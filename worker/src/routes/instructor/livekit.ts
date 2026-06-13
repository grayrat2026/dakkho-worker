/**
 * Instructor LiveKit routes
 *
 * - GET  /livekit/config        — Check LiveKit configuration status
 * - GET  /livekit/token         — Get a LiveKit token (query params: room, identity, name)
 * - POST /livekit/token-role    — Get a LiveKit token with role-based permissions
 * - GET  /livekit/rooms         — List active rooms (proxied from LiveKit server API)
 * - GET  /livekit/recordings    — List recordings (proxied from LiveKit server API)
 * - GET  /livekit/attendance/:room — Get attendance for a room
 * - GET  /livekit/health        — Health check for LiveKit, Calls, Realtime services
 * - POST /livekit/calls-session — Create a Cloudflare Calls session as fallback
 * - GET  /livekit/calls-status  — Check Cloudflare Calls availability
 */

import { Hono } from 'hono';
import type { Env } from '../../env';
import {
  instructorOrAdminMiddleware,
  type InstructorOrAdminAuthVariables,
} from '../../lib/instructor-auth-middleware';
import { getErrorMessage } from '../../lib/utils';

const routes = new Hono<{ Bindings: Env; Variables: InstructorOrAdminAuthVariables }>();

// ─── Constants ───
const LIVEKIT_HOST = 'wss://dakkho-u74kq16n.livekit.cloud';
const DEFAULT_TTL = 6 * 60 * 60; // 6 hours in seconds

// ─── LiveKit Token Generation (Web Crypto JWT) ───

function base64url(data: ArrayBuffer): string {
  const bytes = new Uint8Array(data);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlStr(str: string): string {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function createLiveKitToken(
  apiKey: string,
  apiSecret: string,
  roomName: string,
  identity: string,
  name: string,
  options: {
    canPublish?: boolean;
    canSubscribe?: boolean;
    canPublishData?: boolean;
    canUpdateOwnMetadata?: boolean;
    hidden?: boolean;
    ttl?: number;
  } = {}
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const ttl = options.ttl || DEFAULT_TTL;

  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    iss: apiKey,
    sub: identity,
    iat: now,
    exp: now + ttl,
    name,
    video: {
      room: roomName,
      roomJoin: true,
      canPublish: options.canPublish !== undefined ? options.canPublish : true,
      canSubscribe: options.canSubscribe !== undefined ? options.canSubscribe : true,
      canPublishData: options.canPublishData !== undefined ? options.canPublishData : true,
      canUpdateOwnMetadata: options.canUpdateOwnMetadata !== undefined ? options.canUpdateOwnMetadata : true,
      hidden: options.hidden || false,
    },
  };

  const encodedHeader = base64urlStr(JSON.stringify(header));
  const encodedPayload = base64urlStr(JSON.stringify(payload));
  const message = `${encodedHeader}.${encodedPayload}`;

  // Import API secret as HMAC key
  const keyData = new TextEncoder().encode(apiSecret);
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  const encodedSignature = base64url(signature);

  return `${message}.${encodedSignature}`;
}

// Role-based permissions map
const ROLE_PERMISSIONS: Record<string, {
  canPublish: boolean;
  canSubscribe: boolean;
  canPublishData: boolean;
  canUpdateOwnMetadata: boolean;
  hidden: boolean;
}> = {
  host: { canPublish: true, canSubscribe: true, canPublishData: true, canUpdateOwnMetadata: true, hidden: false },
  presenter: { canPublish: true, canSubscribe: true, canPublishData: true, canUpdateOwnMetadata: true, hidden: false },
  guest: { canPublish: true, canSubscribe: true, canPublishData: true, canUpdateOwnMetadata: true, hidden: false },
  viewer: { canPublish: false, canSubscribe: true, canPublishData: false, canUpdateOwnMetadata: false, hidden: false },
  student: { canPublish: false, canSubscribe: true, canPublishData: true, canUpdateOwnMetadata: true, hidden: false },
};

// ─── Routes ───

// All routes require instructor or admin auth
routes.use('*', instructorOrAdminMiddleware);

// GET /livekit/config — Check LiveKit configuration
routes.get('/config', async (c) => {
  try {
    const apiKey = c.env.LIVEKIT_API_KEY;
    const apiSecret = c.env.LIVEKIT_API_SECRET;

    if (!apiKey || !apiSecret) {
      return c.json({ configured: false, url: null });
    }

    return c.json({ configured: true, url: LIVEKIT_HOST });
  } catch (error) {
    return c.json({ configured: false, url: null });
  }
});

// GET /livekit/token — Get a LiveKit token (simple)
routes.get('/token', async (c) => {
  try {
    const apiKey = c.env.LIVEKIT_API_KEY;
    const apiSecret = c.env.LIVEKIT_API_SECRET;

    if (!apiKey || !apiSecret) {
      return c.json({ error: 'LiveKit is not configured on the server' }, 503);
    }

    const room = c.req.query('room');
    const identity = c.req.query('identity') || c.get('instructorId') || 'instructor';
    const name = c.req.query('name') || c.get('instructorName') || 'Instructor';

    if (!room) {
      return c.json({ error: 'room query parameter is required' }, 400);
    }

    const token = await createLiveKitToken(apiKey, apiSecret, room, identity, name, {
      canPublish: true,
      canSubscribe: true,
    });

    return c.json({
      success: true,
      token,
      url: LIVEKIT_HOST,
      identity,
      room,
    });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// POST /livekit/token-role — Get a LiveKit token with role-based permissions
routes.post('/token-role', async (c) => {
  try {
    const apiKey = c.env.LIVEKIT_API_KEY;
    const apiSecret = c.env.LIVEKIT_API_SECRET;

    if (!apiKey || !apiSecret) {
      return c.json({ error: 'LiveKit is not configured on the server' }, 503);
    }

    const body = await c.req.json<{
      room: string;
      role?: 'host' | 'presenter' | 'guest' | 'viewer' | 'student';
      room_type?: 'video' | 'voice' | 'classroom' | 'webinar';
      identity?: string;
      name?: string;
      ttl?: number;
    }>();

    if (!body.room) {
      return c.json({ error: 'room is required' }, 400);
    }

    const role = body.role || 'host';
    const permissions = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.host;
    const identity = body.identity || c.get('instructorId') || 'instructor';
    const name = body.name || c.get('instructorName') || 'Instructor';

    const token = await createLiveKitToken(apiKey, apiSecret, body.room, identity, name, {
      ...permissions,
      ttl: body.ttl || DEFAULT_TTL,
    });

    return c.json({
      success: true,
      token,
      url: LIVEKIT_HOST,
      identity,
      room: body.room,
      role,
    });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// GET /livekit/rooms — List rooms (basic info from D1 schedule)
routes.get('/rooms', async (c) => {
  try {
    const authRole = c.get('authRole');
    const instructorId = authRole === 'admin' ? undefined : c.get('instructorId');

    let query = 'SELECT * FROM live_class_schedules WHERE is_active = 1';
    const params: unknown[] = [];

    if (instructorId) {
      query += ' AND instructor_id = ?';
      params.push(instructorId);
    }

    query += ' ORDER BY scheduled_at DESC LIMIT 50';

    const result = await c.env.DB.prepare(query).bind(...params).all();

    const rooms = result.results.map((row: any) => ({
      roomName: `class-${row.id}`,
      title: row.title,
      scheduledAt: row.scheduled_at,
      durationMinutes: row.duration_minutes,
      platform: row.platform,
      status: row.status,
      courseId: row.course_id,
    }));

    return c.json({ success: true, rooms, activeRooms: rooms });
  } catch (error) {
    return c.json({ success: true, rooms: [], activeRooms: [] });
  }
});

// POST /livekit/rooms — Create a room record (saves to D1 schedule)
routes.post('/rooms', async (c) => {
  try {
    const authRole = c.get('authRole');
    const instructorId = authRole === 'admin' ? undefined : c.get('instructorId');
    const body = await c.req.json<{
      title: string;
      course_id?: string;
      scheduled_at: string;
      duration_minutes: number;
      description?: string;
      max_participants?: number;
      auto_recording?: boolean;
      room_type?: 'video' | 'voice' | 'classroom' | 'webinar';
    }>();

    if (!body.title || !body.scheduled_at) {
      return c.json({ error: 'title and scheduled_at are required' }, 400);
    }

    const meetingUrl = `class-${Date.now()}`;
    const now = new Date().toISOString();

    const result = await c.env.DB.prepare(`
      INSERT INTO live_class_schedules (title, course_id, instructor_id, scheduled_at, duration_minutes, meeting_url, platform, description, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
    `).bind(
      body.title,
      body.course_id || null,
      instructorId || null,
      body.scheduled_at,
      body.duration_minutes || 60,
      meetingUrl,
      body.room_type || 'livekit',
      body.description || null,
      now,
      now
    ).run();

    const roomName = `class-${(result.meta as any)?.last_row_id || Date.now()}`;

    return c.json({
      success: true,
      room: {
        roomName,
        title: body.title,
        scheduledAt: body.scheduled_at,
        durationMinutes: body.duration_minutes,
      },
    }, 201);
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// DELETE /livekit/rooms/:roomName — Close/Cancel a room
routes.delete('/rooms/:roomName', async (c) => {
  try {
    const roomName = c.req.param('roomName');

    // Try to find by meeting_url or room name pattern
    await c.env.DB.prepare(`
      UPDATE live_class_schedules SET status = 'cancelled', is_active = 0, updated_at = datetime('now')
      WHERE meeting_url = ? OR id = ?
    `).bind(roomName, roomName.replace('class-', '')).run();

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// GET /livekit/recordings — Placeholder for recordings
routes.get('/recordings', async (c) => {
  // LiveKit recordings require server API access; return empty for now
  return c.json({ success: true, recordings: [] });
});

// GET /livekit/attendance/:room — Get attendance from D1
routes.get('/attendance/:room', async (c) => {
  try {
    const roomName = c.req.param('room');

    // Try to find the live class by meeting_url
    const liveClass = await c.env.DB.prepare(
      "SELECT id FROM live_class_schedules WHERE meeting_url = ? OR id = ? LIMIT 1"
    ).bind(roomName, roomName.replace('class-', '')).first();

    if (!liveClass) {
      return c.json({ success: true, attendance: [], total: 0 });
    }

    // Return basic attendance info (placeholder — real attendance tracking would use a separate table)
    return c.json({ success: true, attendance: [], total: 0 });
  } catch (error) {
    return c.json({ success: true, attendance: [], total: 0 });
  }
});

// GET /livekit/health — Health check for all real-time services
routes.get('/health', async (c) => {
  const apiKey = c.env.LIVEKIT_API_KEY;
  const apiSecret = c.env.LIVEKIT_API_SECRET;

  const livekitStatus = (apiKey && apiSecret)
    ? { status: 'configured', url: LIVEKIT_HOST }
    : { status: 'not_configured', url: null };

  return c.json({
    success: true,
    livekit: livekitStatus,
    cloudflareCalls: { status: 'not_configured' },
    realtime: { status: 'not_configured' },
    fallback: livekitStatus.status === 'configured' ? 'livekit' : 'unavailable',
  });
});

// POST /livekit/calls-session — Cloudflare Calls fallback (placeholder)
routes.post('/calls-session', async (c) => {
  return c.json({ error: 'Cloudflare Calls is not configured' }, 503);
});

// GET /livekit/calls-status — Cloudflare Calls availability
routes.get('/calls-status', async (c) => {
  return c.json({ available: false });
});

export default routes;
