/**
 * Video Streaming & Processing Routes
 * ─────────────────────────────────────
 * - Tokenized HLS streaming for students (HMAC-signed tokens)
 * - Processing status updates from VPS transcoder
 * - Segment proxy with auth validation
 */

import { Hono } from 'hono';
import type { Env } from '../env';
import type { AuthVariables } from '../lib/auth';
import { adminAuthMiddleware } from '../lib/auth';
import { studentAuthMiddleware } from '../lib/student-auth-middleware';
import type { StudentAuthVariables } from '../lib/student-auth-middleware';
import { getErrorMessage } from '../lib/utils';
import { rateLimit } from '../lib/rate-limit';

const videoStreamingRoutes = new Hono<{
  Bindings: Env;
  Variables: AuthVariables & StudentAuthVariables;
}>();

// ─── Token Generation Helpers (HMAC-signed) ───

async function generateStreamToken(
  videoId: string,
  sessionId: string,
  userId: string,
  ip: string,
  expiry: number,
  secret: string
): Promise<string> {
  const payload = JSON.stringify({ v: videoId, s: sessionId, u: userId, i: ip, e: expiry });
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature)));
  return btoa(payload) + '.' + sigB64;
}

async function validateStreamToken(
  token: string,
  videoId: string,
  secret: string
): Promise<{ valid: boolean; sessionId?: string; userId?: string; ip?: string; expiry?: number }> {
  try {
    const [payloadB64, sigB64] = token.split('.');
    if (!payloadB64 || !sigB64) return { valid: false };

    // Verify HMAC signature
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

    return { valid: true, sessionId: payload.s, userId: payload.u, ip: payload.i, expiry: payload.e };
  } catch {
    return { valid: false };
  }
}

// ─── Student Streaming Endpoints ───

// POST /session/:videoId — Create streaming session
videoStreamingRoutes.post('/session/:videoId', studentAuthMiddleware, async (c) => {
  try {
    // Rate limit session creation
    const limited = await rateLimit(c, 'stream');
    if (limited) return limited;

    const videoId = c.req.param('videoId');
    const userId = c.get('studentId') as string;
    const ip = c.req.header('CF-Connecting-IP') || 'unknown';

    // Check enrollment
    const video = await c.env.DB.prepare(
      'SELECT course_id, is_preview, processing_status, hls_ready, available_qualities FROM videos WHERE id = ?'
    ).bind(videoId).first<{ course_id: string; is_preview: number; processing_status: string; hls_ready: number; available_qualities: string }>();

    if (!video) {
      return c.json({ error: 'Video not found' }, 404);
    }

    // If not a preview video, check enrollment
    if (!video.is_preview) {
      const enrollment = await c.env.DB.prepare(
        'SELECT id FROM enrollments WHERE user_id = ? AND course_id = ?'
      ).bind(userId, video.course_id).first();

      if (!enrollment) {
        return c.json({ error: 'Not enrolled in this course' }, 403);
      }
    }

    // Create streaming session
    const sessionId = crypto.randomUUID();
    const expiry = Date.now() + (30 * 60 * 1000); // 30 minutes
    const token = await generateStreamToken(videoId, sessionId, userId, ip, expiry, c.env.ADMIN_SECRET_KEY);

    // Store session in KV (auto-expire in 35 minutes)
    await c.env.KV_CONFIG.put(`stream:${sessionId}`, JSON.stringify({
      videoId,
      userId,
      token,
      ip,
      expiry,
      createdAt: Date.now(),
    }), { expirationTtl: 2100 }); // 35 min

    return c.json({
      success: true,
      sessionId,
      token,
      expiresAt: expiry,
      hlsReady: video.hls_ready === 1,
      availableQualities: JSON.parse(video.available_qualities || '[]'),
      processingStatus: video.processing_status || 'pending',
    });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// GET /playlist/:videoId — Return dynamic m3u8 with tokenized segment URLs
videoStreamingRoutes.get('/playlist/:videoId', async (c) => {
  try {
    const videoId = c.req.param('videoId');
    const token = c.req.query('token') || '';

    // Validate token (HMAC signature + expiry + videoId)
    const validation = await validateStreamToken(token, videoId, c.env.ADMIN_SECRET_KEY);
    if (!validation.valid || !validation.sessionId) {
      return c.json({ error: 'Invalid or expired token' }, 403);
    }

    // Check session in KV
    const sessionData = await c.env.KV_CONFIG.get(`stream:${validation.sessionId}`);
    if (!sessionData) {
      return c.json({ error: 'Session expired' }, 401);
    }

    const parsed = JSON.parse(sessionData);
    if (parsed.token !== token || parsed.videoId !== videoId) {
      return c.json({ error: 'Invalid session' }, 403);
    }

    // Verify userId from token matches session
    if (validation.userId && parsed.userId !== validation.userId) {
      return c.json({ error: 'Invalid session' }, 403);
    }

    // Log IP mismatch for monitoring (not enforced — mobile users may switch networks)
    const requestIp = c.req.header('CF-Connecting-IP') || 'unknown';
    if (validation.ip && validation.ip !== 'unknown' && validation.ip !== requestIp) {
      console.warn(`[STREAM] IP mismatch for session ${validation.sessionId}: token IP=${validation.ip}, request IP=${requestIp}`);
    }

    // Get video info
    const video = await c.env.DB.prepare(
      'SELECT hls_ready, available_qualities FROM videos WHERE id = ?'
    ).bind(videoId).first<{ hls_ready: number; available_qualities: string }>();

    if (!video || !video.hls_ready) {
      return c.json({ error: 'HLS not ready yet' }, 404);
    }

    const qualities: string[] = JSON.parse(video.available_qualities || '["360p"]');

    // Generate tokenized segment URLs
    const segExpiry = Math.floor(Date.now() / 1000) + 600; // 10 minutes
    const segToken = await generateStreamToken(videoId, validation.sessionId, parsed.userId, requestIp, segExpiry * 1000, c.env.ADMIN_SECRET_KEY);

    const workerUrl = new URL(c.req.url).origin;

    // Build m3u8 playlist
    let m3u8 = '#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-TARGETDURATION:10\n';

    for (const quality of qualities) {
      const height = quality.replace('p', '');
      let bandwidth = '800000';
      let resolution = '640x360';
      if (quality === '720p') { bandwidth = '2800000'; resolution = '1280x720'; }
      if (quality === '1080p') { bandwidth = '5000000'; resolution = '1920x1080'; }

      m3u8 += `#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},RESOLUTION=${resolution}\n`;
      m3u8 += `${workerUrl}/api/video/stream/variant/${videoId}/${quality}/playlist.m3u8?session=${validation.sessionId}&token=${segToken}&exp=${segExpiry}\n`;
    }

    return new Response(m3u8, {
      headers: {
        'Content-Type': 'application/vnd.apple.mpegurl',
        'Cache-Control': 'no-store, no-cache',
        'Access-Control-Allow-Origin': c.req.header('origin') || '*',
      },
    });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// GET /variant/:videoId/:quality/playlist.m3u8 — Quality-specific playlist
videoStreamingRoutes.get('/variant/:videoId/:quality/playlist.m3u8', async (c) => {
  try {
    const videoId = c.req.param('videoId');
    const quality = c.req.param('quality');
    const token = c.req.query('token') || '';
    const exp = c.req.query('exp') || '';

    // Validate token (HMAC signature + expiry + videoId)
    const validation = await validateStreamToken(token, videoId, c.env.ADMIN_SECRET_KEY);
    if (!validation.valid) {
      return c.json({ error: 'Invalid or expired token' }, 403);
    }

    // Check expiry from query param
    if (exp && Math.floor(Date.now() / 1000) > parseInt(exp)) {
      return c.json({ error: 'Token expired' }, 403);
    }

    // Check session in KV
    const sessionData = await c.env.KV_CONFIG.get(`stream:${validation.sessionId}`);
    if (!sessionData) {
      return c.json({ error: 'Session expired' }, 401);
    }

    // Log IP mismatch for monitoring
    const requestIp = c.req.header('CF-Connecting-IP') || 'unknown';
    if (validation.ip && validation.ip !== 'unknown' && validation.ip !== requestIp) {
      console.warn(`[STREAM] IP mismatch for session ${validation.sessionId}: token IP=${validation.ip}, request IP=${requestIp}`);
    }

    // Fetch the actual playlist from R2
    const key = `${videoId}/hls/${quality}/playlist.m3u8`;
    const object = await c.env.R2_VIDEOS.get(key);

    if (!object) {
      return c.json({ error: 'Quality playlist not found' }, 404);
    }

    // Rewrite segment URLs to include auth tokens
    let playlist = await object.text();

    // Replace relative segment references with tokenized absolute URLs
    const workerUrl = new URL(c.req.url).origin;
    const segExpiry = Math.floor(Date.now() / 1000) + 600; // 10 minutes
    const parsedSession = JSON.parse(sessionData);
    const segToken = await generateStreamToken(videoId, validation.sessionId!, parsedSession.userId, requestIp, segExpiry * 1000, c.env.ADMIN_SECRET_KEY);

    playlist = playlist.replace(
      /seg_(\d+)\.ts/g,
      `${workerUrl}/api/video/stream/seg/${videoId}/${quality}/seg_$1.ts?session=${validation.sessionId}&token=${segToken}&exp=${segExpiry}`
    );

    return new Response(playlist, {
      headers: {
        'Content-Type': 'application/vnd.apple.mpegurl',
        'Cache-Control': 'no-store, no-cache',
        'Access-Control-Allow-Origin': c.req.header('origin') || '*',
      },
    });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// GET /seg/:videoId/:quality/:segFile — Serve individual .ts segment
videoStreamingRoutes.get('/seg/:videoId/:quality/:segFile', async (c) => {
  try {
    const videoId = c.req.param('videoId');
    const quality = c.req.param('quality');
    const segFile = c.req.param('segFile');
    const token = c.req.query('token') || '';
    const exp = c.req.query('exp') || '';

    // Validate token (HMAC signature + expiry + videoId)
    const validation = await validateStreamToken(token, videoId, c.env.ADMIN_SECRET_KEY);
    if (!validation.valid) {
      return c.json({ error: 'Invalid token' }, 403);
    }

    // Check expiry from query param
    if (exp && Math.floor(Date.now() / 1000) > parseInt(exp)) {
      return c.json({ error: 'Token expired' }, 403);
    }

    // Validate session from KV (fast lookup)
    const sessionData = await c.env.KV_CONFIG.get(`stream:${validation.sessionId}`);
    if (!sessionData) {
      return c.json({ error: 'Session expired' }, 401);
    }

    const parsed = JSON.parse(sessionData);
    if (parsed.videoId !== videoId) {
      return c.json({ error: 'Invalid session for this video' }, 403);
    }

    // Verify userId from token matches session
    if (validation.userId && parsed.userId !== validation.userId) {
      return c.json({ error: 'Invalid session' }, 403);
    }

    // Log IP mismatch for monitoring
    const requestIp = c.req.header('CF-Connecting-IP') || 'unknown';
    if (validation.ip && validation.ip !== 'unknown' && validation.ip !== requestIp) {
      console.warn(`[STREAM] IP mismatch for session ${validation.sessionId}: token IP=${validation.ip}, request IP=${requestIp}`);
    }

    // Fetch segment from R2
    const key = `${videoId}/hls/${quality}/${segFile}`;
    const object = await c.env.R2_VIDEOS.get(key);

    if (!object) {
      return c.json({ error: 'Segment not found' }, 404);
    }

    // Return with caching headers
    const headers = new Headers();
    headers.set('Content-Type', 'video/mp2t');
    headers.set('Cache-Control', 'private, max-age=600'); // 10 min browser cache
    headers.set('Access-Control-Allow-Origin', c.req.header('origin') || '*');

    if (object.httpMetadata?.contentType) {
      headers.set('Content-Type', object.httpMetadata.contentType);
    }

    return new Response(object.body, { headers });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// GET /info/:videoId — Get video streaming info (for player AND VPS transcoder)
videoStreamingRoutes.get('/info/:videoId', async (c) => {
  try {
    const videoId = c.req.param('videoId');

    // Allow both student auth and admin auth
    const authHeader = c.req.header('Authorization');
    let isAuthorized = false;

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      // Check admin session
      const adminSession = await c.env.DB.prepare(
        'SELECT id FROM admin_sessions WHERE id = ? AND is_active = 1'
      ).bind(token).first();
      if (adminSession) {
        isAuthorized = true;
      }
    }

    // If not admin, check student auth via KV
    if (!isAuthorized) {
      // Simple student auth check — in production, use proper middleware
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const video = await c.env.DB.prepare(
      `SELECT id, title, duration, video_url, thumbnail_url, course_id, is_preview,
              processing_status, hls_ready, available_qualities
       FROM videos WHERE id = ?`
    ).bind(videoId).first<{
      id: string; title: string; duration: number; video_url: string;
      thumbnail_url: string; course_id: string; is_preview: number;
      processing_status: string; hls_ready: number; available_qualities: string;
    }>();

    if (!video) {
      return c.json({ error: 'Video not found' }, 404);
    }

    return c.json({
      success: true,
      video: {
        id: video.id,
        title: video.title,
        duration: video.duration,
        thumbnailUrl: video.thumbnail_url,
        isPreview: video.is_preview === 1,
        hlsReady: video.hls_ready === 1,
        availableQualities: JSON.parse(video.available_qualities || '[]'),
        processingStatus: video.processing_status || 'pending',
        // Legacy fallback URL (for non-HLS mode)
        fallbackUrl: video.video_url,
      },
    });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// ─── Admin/VPS Processing Endpoints ───

// PUT /processing-status/:videoId — Update processing status (from VPS transcoder)
videoStreamingRoutes.put('/processing-status/:videoId', adminAuthMiddleware, async (c) => {
  try {
    const videoId = c.req.param('videoId');
    const body = await c.req.json<Record<string, unknown>>();

    const allowedFields = [
      'processing_status', 'hls_ready', 'available_qualities', 'raw_deleted',
      'file_size_original', 'file_size_360p', 'file_size_720p', 'file_size_1080p',
      'processing_started_at', 'processing_completed_at', 'processing_error',
    ];

    // Handle add_quality separately — appends to available_qualities
    if (body.add_quality) {
      const current = await c.env.DB.prepare(
        'SELECT available_qualities FROM videos WHERE id = ?'
      ).bind(videoId).first<{ available_qualities: string }>();

      const existing: string[] = JSON.parse(current?.available_qualities || '[]');
      if (!existing.includes(body.add_quality as string)) {
        existing.push(body.add_quality as string);
        body.available_qualities = JSON.stringify(existing);
      }
      delete body.add_quality;
    }

    const setClauses: string[] = [];
    const setValues: unknown[] = [];

    for (const [key, value] of Object.entries(body)) {
      if (allowedFields.includes(key)) {
        setClauses.push(`${key} = ?`);
        setValues.push(value);
      }
    }

    if (setClauses.length === 0) {
      return c.json({ error: 'No valid fields to update' }, 400);
    }

    setClauses.push("updated_at = datetime('now')");
    setValues.push(videoId);

    await c.env.DB.prepare(
      `UPDATE videos SET ${setClauses.join(', ')} WHERE id = ?`
    ).bind(...setValues).run();

    return c.json({ success: true, videoId, updated: setClauses.length });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// GET /pending-transcode — List videos needing transcoding (for VPS poller)
videoStreamingRoutes.get('/pending-transcode', adminAuthMiddleware, async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '5');

    const result = await c.env.DB.prepare(
      `SELECT id, title, video_url, duration, processing_status, created_at
       FROM videos 
       WHERE processing_status = 'pending' 
         AND video_url IS NOT NULL 
         AND video_url != ''
       ORDER BY created_at ASC 
       LIMIT ?`
    ).bind(limit).all();

    return c.json({
      success: true,
      videos: result.results,
      total: result.results.length,
    });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

export default videoStreamingRoutes;
