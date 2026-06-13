/**
 * Analytics routes — GET /, GET /charts
 * D1-only: All stat aggregation via SQL COUNT queries
 * KV-cached: 5-minute TTL on dashboard endpoints
 */

import { Hono } from 'hono';
import type { Env } from '../env';
import type { AuthVariables } from '../lib/auth';
import { adminAuthMiddleware } from '../lib/auth';
import { getErrorMessage } from '../lib/utils';

const analyticsRoutes = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

// Apply auth middleware
analyticsRoutes.use('*', adminAuthMiddleware);

// GET / — Get analytics stats (KV-cached for 5 min)
analyticsRoutes.get('/', async (c) => {
  try {
    // Check KV cache first
    const cacheKey = 'analytics:dashboard:all';
    const cached = await c.env.KV_CONFIG.get(cacheKey);
    if (cached) {
      return c.json(JSON.parse(cached));
    }

    const [
      usersCount,
      coursesCount,
      videosCount,
      enrollmentsCount,
      activeSessions,
      newSignupsToday,
    ] = await Promise.all([
      c.env.DB.prepare('SELECT COUNT(*) as total FROM users').first().catch(() => ({ total: 0 })),
      c.env.DB.prepare('SELECT COUNT(*) as total FROM courses').first().catch(() => ({ total: 0 })),
      c.env.DB.prepare('SELECT COUNT(*) as total FROM videos').first().catch(() => ({ total: 0 })),
      c.env.DB.prepare('SELECT COUNT(*) as total FROM enrollments').first().catch(() => ({ total: 0 })),
      c.env.DB.prepare("SELECT COUNT(*) as count FROM admin_sessions WHERE is_active = 1 AND expires_at > datetime('now')").first<{ count: number }>().catch(() => ({ count: 0 })),
      c.env.DB.prepare("SELECT COUNT(*) as count FROM users WHERE date(created_at) = date('now')").first<{ count: number }>().catch(() => ({ count: 0 })),
    ]);

    const stats = {
      totalUsers: (usersCount as any)?.total || 0,
      totalCourses: (coursesCount as any)?.total || 0,
      totalVideos: (videosCount as any)?.total || 0,
      totalEnrollments: (enrollmentsCount as any)?.total || 0,
      activeSessions: (activeSessions as any)?.count || 0,
      newSignupsToday: (newSignupsToday as any)?.count || 0,
    };

    // Get recent enrollments
    const recentEnrollments = await c.env.DB.prepare(
      'SELECT e.*, u.full_name as user_name, c.title as course_title FROM enrollments e LEFT JOIN users u ON e.user_id = u.id LEFT JOIN courses c ON e.course_id = c.id ORDER BY e.created_at DESC LIMIT 10'
    ).all().catch(() => ({ results: [] }));

    // Get popular courses
    const popularCourses = await c.env.DB.prepare(
      'SELECT * FROM courses ORDER BY total_students DESC LIMIT 5'
    ).all().catch(() => ({ results: [] }));

    // Get recent audit logs
    let recentLogs: unknown[] = [];
    try {
      const logsResult = await c.env.DB.prepare(
        'SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 10'
      ).all();
      recentLogs = logsResult.results || [];
    } catch {
      // Ignore D1 errors
    }

    const result = {
      stats,
      recentEnrollments: recentEnrollments.results,
      popularCourses: popularCourses.results,
      recentLogs,
    };

    // Cache result for 5 minutes
    await c.env.KV_CONFIG.put(cacheKey, JSON.stringify(result), { expirationTtl: 300 });

    return c.json(result);
  } catch (error) {
    const message = getErrorMessage(error);
    return c.json({ error: message }, 500);
  }
});

// GET /charts — Get chart data (KV-cached for 5 min)
analyticsRoutes.get('/charts', async (c) => {
  try {
    // Check KV cache first
    const cacheKey = 'analytics:charts:all';
    const cached = await c.env.KV_CONFIG.get(cacheKey);
    if (cached) {
      return c.json(JSON.parse(cached));
    }

    const now = new Date();

    // Month names for the last 6 months
    const monthNames: string[] = [];
    const monthStarts: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthNames.push(d.toLocaleString('en', { month: 'short' }));
      monthStarts.push(d.toISOString().split('T')[0]);
    }

    // Enrollment trend by month
    const enrollmentTrend = [];
    for (let i = 0; i < 6; i++) {
      const nextMonth = i < 5 ? monthStarts[i + 1] : now.toISOString().split('T')[0];
      const result = await c.env.DB.prepare(
        'SELECT COUNT(*) as count FROM enrollments WHERE created_at >= ? AND created_at < ?'
      ).bind(monthStarts[i], nextMonth).first<{ count: number }>().catch(() => ({ count: 0 }));
      enrollmentTrend.push({
        month: monthNames[i],
        enrollments: (result as any)?.count || 0,
      });
    }

    // Course distribution by level
    const levelResult = await c.env.DB.prepare(
      "SELECT level, COUNT(*) as count FROM courses GROUP BY level"
    ).all().catch(() => ({ results: [] }));

    const levelMap: Record<string, number> = { beginner: 0, intermediate: 0, advanced: 0, expert: 0 };
    for (const row of levelResult.results as any[]) {
      const level = (row.level || 'beginner').toLowerCase();
      if (levelMap[level] !== undefined) {
        levelMap[level] = row.count;
      } else {
        levelMap['beginner'] += row.count;
      }
    }

    const courseDistribution = Object.entries(levelMap).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
    }));

    // User growth (cumulative monthly counts)
    const userGrowth = [];
    let cumulative = 0;
    for (let i = 0; i < 6; i++) {
      const nextMonth = i < 5 ? monthStarts[i + 1] : now.toISOString().split('T')[0];
      const result = await c.env.DB.prepare(
        'SELECT COUNT(*) as count FROM users WHERE created_at >= ? AND created_at < ?'
      ).bind(monthStarts[i], nextMonth).first<{ count: number }>().catch(() => ({ count: 0 }));
      cumulative += (result as any)?.count || 0;
      userGrowth.push({ month: monthNames[i], users: cumulative });
    }

    // Add total users before the 6-month window to cumulative baseline
    const totalBeforeWindow = await c.env.DB.prepare(
      `SELECT COUNT(*) as count FROM users WHERE created_at < ?`
    ).bind(monthStarts[0]).first<{ count: number }>().catch(() => ({ count: 0 }));
    const baseline = (totalBeforeWindow as any)?.count || 0;

    // Recalculate with baseline
    const userGrowthWithBaseline = [];
    let cum = baseline;
    for (let i = 0; i < 6; i++) {
      const nextMonth = i < 5 ? monthStarts[i + 1] : now.toISOString().split('T')[0];
      const result = await c.env.DB.prepare(
        'SELECT COUNT(*) as count FROM users WHERE created_at >= ? AND created_at < ?'
      ).bind(monthStarts[i], nextMonth).first<{ count: number }>().catch(() => ({ count: 0 }));
      cum += (result as any)?.count || 0;
      userGrowthWithBaseline.push({ month: monthNames[i], users: cum });
    }

    const result = {
      enrollmentTrend,
      courseDistribution,
      userGrowth: userGrowthWithBaseline,
    };

    // Cache result for 5 minutes
    await c.env.KV_CONFIG.put(cacheKey, JSON.stringify(result), { expirationTtl: 300 });

    return c.json(result);
  } catch (error) {
    const message = getErrorMessage(error);
    return c.json({ error: message }, 500);
  }
});

export default analyticsRoutes;
