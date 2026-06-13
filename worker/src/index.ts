/**
 * DAKKHO Admin API — Cloudflare Workers + Hono
 *
 * D1-only backend — All Appwrite dependencies removed
 * - Hono framework for routing & middleware
 * - Native R2Bucket bindings for file storage
 * - D1 for all data (users, courses, videos, etc.)
 * - Workers KV for config broadcast/cache
 * - Resend REST API with fetch() for email
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import type { Env } from './env';
import authRoutes from './routes/auth';
import systemRoutes from './routes/system';
import userRoutes from './routes/users';
import categoryRoutes from './routes/categories';
import instructorRoutes from './routes/instructors';
import instructorApiRoutes from './routes/instructor';
import courseRoutes from './routes/courses';
import videoRoutes from './routes/videos';
import instituteRoutes from './routes/institutes';
import configRoutes from './routes/config';
import notificationRoutes from './routes/notifications';
import analyticsRoutes from './routes/analytics';
import uploadRoutes from './routes/upload';
import emailRoutes from './routes/email';
import adminRoutes from './routes/admin';
import couponRoutes from './routes/coupons';
import discountRoutes from './routes/discounts';
import eventRoutes from './routes/events';
import liveClassRoutes from './routes/live-classes';
import paymentRoutes from './routes/payments';
import instituteRequestRoutes from './routes/institute-requests';
import studentApiRoutes from './routes/student';
import pushRoutes from './routes/push';
import techRoutes from './routes/technologies';
import subjectRoutes from './routes/subjects';
import chapterRoutes from './routes/chapters';
import lessonRoutes from './routes/lessons';
import learningPointRoutes from './routes/learning-points';
import packageRoutes from './routes/packages';
import enrollmentRoutes from './routes/enrollments';
import achievementRoutes from './routes/achievements';
import migrateRoutes from './routes/migrate';
import watchHistoryRoutes from './routes/watch-history';
import { aboutPublicRoutes, aboutAdminRoutes } from './routes/about';
import { supportPublicRoutes, supportAdminRoutes, telegramWebhookRoutes } from './routes/support';
import videoStreamingRoutes from './routes/video-streaming';
import unifiedAuthRoutes from './routes/unified-auth';
import errorMonitorRoutes from './routes/error-monitor';

// R2 file serving (no auth needed — public access for images/videos)
import { getFile, getBucketForType } from './lib/r2';

const app = new Hono<{ Bindings: Env }>();

// ─── Global Middleware ───

app.use('*', cors({
  origin: [
    'https://grayrat2026.github.io',
    'https://dakkho.pro.bd',
    'http://localhost:3000',
    // Cloudflare Pages domains
    'https://dakkho-admin.pages.dev',
    // Student app domains
    'https://dakkhostudent.pages.dev',
    'https://dakkho-student.pages.dev',
    // Instructor app
    'https://dakkho-instructor.pages.dev',
  ],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'apikey', 'mh-v-api-key', 'mh-piprapay-api-key'],
  exposeHeaders: ['Content-Length'],
  maxAge: 86400,
  credentials: true,
}));

app.use('*', logger());

// ─── Health Check ───

app.get('/', (c) => c.json({
  service: 'DAKKHO Admin API',
  version: '2.0.0',
  status: 'healthy',
  timestamp: new Date().toISOString(),
  runtime: 'Cloudflare Workers',
  framework: 'Hono',
  backend: 'D1',
}));

// ─── Mount Route Groups ───

// Unified auth (role-agnostic login/check/logout)
app.route('/auth', unifiedAuthRoutes);

app.route('/admin/auth', authRoutes);
app.route('/admin/system', systemRoutes);
app.route('/admin/users', userRoutes);
app.route('/admin/categories', categoryRoutes);
app.route('/admin/instructors', instructorRoutes);
app.route('/instructor', instructorApiRoutes);
app.route('/admin/courses', courseRoutes);
app.route('/admin/videos', videoRoutes);
app.route('/admin/institutes', instituteRoutes);
app.route('/admin/config', configRoutes);
app.route('/admin/notifications', notificationRoutes);
app.route('/admin/analytics', analyticsRoutes);
app.route('/admin/upload', uploadRoutes);
app.route('/admin/email', emailRoutes);
app.route('/admin/admin', adminRoutes);
app.route('/admin/coupons', couponRoutes);
app.route('/admin/discounts', discountRoutes);
app.route('/admin/events', eventRoutes);
app.route('/admin/live-classes', liveClassRoutes);
app.route('/admin/payments', paymentRoutes);
app.route('/admin/institute-requests', instituteRequestRoutes);
app.route('/admin/push', pushRoutes);
app.route('/admin/technologies', techRoutes);
app.route('/admin/subjects', subjectRoutes);
app.route('/admin/chapters', chapterRoutes);
app.route('/admin/lessons', lessonRoutes);
app.route('/admin/learning-points', learningPointRoutes);
app.route('/admin/packages', packageRoutes);
app.route('/admin/enrollments', enrollmentRoutes);
app.route('/admin/achievements', achievementRoutes);
app.route('/admin/migrate', migrateRoutes);

// Student-facing API (no admin auth)
// NOTE: /api/about, /api/support, /api/webhook/telegram must be mounted BEFORE /api
// to avoid studentApiRoutes' wildcard catching them
app.route('/api/about', aboutPublicRoutes);
app.route('/api/support', supportPublicRoutes);
app.route('/api/webhook/telegram', telegramWebhookRoutes);
app.route('/api/watch-history', watchHistoryRoutes);
app.route('/api/video/stream', videoStreamingRoutes);
app.route('/api', studentApiRoutes);

// Admin about page management
app.route('/admin/about', aboutAdminRoutes);
app.route('/admin/support', supportAdminRoutes);
app.route('/admin/errors', errorMonitorRoutes);

// ─── Public R2 File Serving ───
// Serves files from R2 buckets — no auth required.
// Pattern: /upload/:bucketType/:key{.+}
// e.g., /upload/thumbnails/1780907668784-1000093181.jpg

app.get('/upload/:bucketType/:key{.+}', async (c) => {
  const bucketType = c.req.param('bucketType');
  const key = c.req.param('key');

  try {
    const r2Bucket = getBucketForType(bucketType, c.env);
    const file = await getFile(r2Bucket, key);

    if (!file) {
      return c.json({ error: 'File not found' }, 404);
    }

    const headers = new Headers();
    // Set content type from R2 metadata
    if (file.httpMetadata?.contentType) {
      headers.set('Content-Type', file.httpMetadata.contentType);
    }
    // Cache for 7 days (images/videos rarely change)
    headers.set('Cache-Control', 'public, max-age=604800, immutable');
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('CDN-Cache-Control', 'public, max-age=2592000');  // 30 days at CDN edge

    return new Response(file.body, { headers });
  } catch (error) {
    return c.json({ error: 'Failed to serve file' }, 500);
  }
});

// ─── 404 Handler ───

app.notFound((c) => c.json({ error: 'Not found' }, 404));

// ─── Global Error Handler ───

app.onError(async (err, c) => {
  console.error('Unhandled error:', err);

  // Log to KV error monitoring
  try {
    const { logError } = await import('./lib/error-monitor');
    await logError(c.env.KV_CONFIG, {
      error: err,
      route: c.req.path,
      method: c.req.method,
      ip: c.req.header('CF-Connecting-IP'),
      userAgent: c.req.header('User-Agent'),
    });
  } catch {}

  return c.json({ error: err.message || 'Internal server error' }, 500);
});

// ─── Cron Handler: Clean up R2 attachments from resolved/closed tickets older than 30 days ───
export default {
  fetch: app.fetch,
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil((async () => {
      try {
        // Find tickets that are resolved/closed and older than 30 days
        const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().replace('T', ' ').replace('Z', '');
        const tickets = await env.DB.prepare(
          "SELECT ticket_id FROM support_tickets WHERE status IN ('resolved', 'closed') AND updated_at < ? AND updated_at > ''"
        ).bind(cutoff).all();

        if (!tickets.results.length) return;

        let deletedCount = 0;
        for (const ticket of tickets.results as { ticket_id: string }[]) {
          // Get all messages for this ticket that have attachments
          const messages = await env.DB.prepare(
            "SELECT attachments FROM support_messages WHERE ticket_id = ? AND attachments NOT IN ('[]', '', 'null')"
          ).bind(ticket.ticket_id).all();

          for (const msg of messages.results as { attachments: string }[]) {
            try {
              const keys: string[] = JSON.parse(msg.attachments || '[]');
              for (const key of keys) {
                if (key && key.startsWith('support/')) {
                  try {
                    await env.R2_SUPPORT_ATTACHMENTS.delete(key);
                    deletedCount++;
                  } catch {}
                }
              }
            } catch {}
          }

          // Clear attachments from messages (replace with empty array marker)
          await env.DB.prepare(
            "UPDATE support_messages SET attachments = '[]' WHERE ticket_id = ? AND attachments NOT IN ('[]', '', 'null')"
          ).bind(ticket.ticket_id).run();
        }

        console.log(`[Cron] Cleaned ${deletedCount} R2 attachments from ${tickets.results.length} old resolved/closed tickets`);
      } catch (error) {
        console.error('[Cron] Failed to clean up attachments:', error);
      }
    })());
  },
};
