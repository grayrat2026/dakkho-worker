/**
 * Instructor analytics & review routes
 *
 * - GET /courses/:id/analytics — Course analytics (instructorOrAdmin)
 * - GET /courses/:id/progress  — Aggregate student progress (instructorOrAdmin)
 * - GET /reviews               — List reviews with stats (instructorOrAdmin)
 * - PUT /reviews/:id/reply     — Reply to a review (instructorOrAdmin)
 */

import { Hono } from 'hono';
import type { Env } from '../../env';
import {
  instructorOrAdminMiddleware,
  type InstructorOrAdminAuthVariables,
} from '../../lib/instructor-auth-middleware';
import { getErrorMessage } from '../../lib/utils';
import { getInstructorId, verifyCourseOwnership } from './helpers';

const routes = new Hono<{ Bindings: Env; Variables: InstructorOrAdminAuthVariables }>();

// GET /courses/:id/analytics — Course analytics
routes.get('/courses/:id/analytics', instructorOrAdminMiddleware, async (c) => {
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

// GET /courses/:id/progress — Aggregate student progress
routes.get('/courses/:id/progress', instructorOrAdminMiddleware, async (c) => {
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

// GET /reviews — Get reviews from D1 instructor_reviews
routes.get('/reviews', instructorOrAdminMiddleware, async (c) => {
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

// PUT /reviews/:id/reply — Reply to a review (verify the review's instructor_id matches)
routes.put('/reviews/:id/reply', instructorOrAdminMiddleware, async (c) => {
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

export default routes;
