/**
 * Error Monitoring Admin Endpoints
 */
import { Hono } from 'hono';
import type { Env } from '../env';
import { adminAuthMiddleware } from '../lib/auth';
import { getErrorLogs, getErrorSummary } from '../lib/error-monitor';

const errorMonitorRoutes = new Hono<{ Bindings: Env }>();

// All routes require admin auth
errorMonitorRoutes.use('*', adminAuthMiddleware);

// GET / — Recent errors for today (or specified date)
errorMonitorRoutes.get('/', async (c) => {
  const date = c.req.query('date');
  const limit = parseInt(c.req.query('limit') || '50');
  const result = await getErrorLogs(c.env.KV_CONFIG, { date, limit });
  return c.json(result);
});

// GET /summary — Error summary for last N days
errorMonitorRoutes.get('/summary', async (c) => {
  const days = parseInt(c.req.query('days') || '7');
  const summary = await getErrorSummary(c.env.KV_CONFIG, days);
  return c.json({ summary });
});

export default errorMonitorRoutes;
