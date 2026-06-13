/**
 * Student Enrollment Routes
 * Enrollment check, free enrollment, enrollment listing
 */

import { Hono } from 'hono';
import type { Env } from '../../env';
import {
  getStudentAuth,
  getErrorMessage,
  type StudentAuthVariables,
} from './helpers';

const routes = new Hono<{ Bindings: Env; Variables: StudentAuthVariables }>();

// GET /enrollments/mine — List all enrollments for the current user
routes.get('/enrollments/mine', async (c) => {
  try {
    const auth = await getStudentAuth(c);
    if (!auth.authorized || !auth.userId) {
      return c.json({ error: 'Login required' }, 401);
    }

    const result = await c.env.DB.prepare(`
      SELECT e.*, c.title as course_title, c.thumbnail_url as course_thumbnail,
             c.description as course_description, c.price as course_price,
             c.level as course_level, c.technology_id as course_technology_id,
             c.is_published, c.duration as course_duration,
             c.total_videos as course_total_videos,
             c.rating as course_rating, c.is_featured as course_is_featured
      FROM enrollments e
      LEFT JOIN courses c ON e.course_id = c.id
      WHERE e.user_id = ?
      ORDER BY e.created_at DESC
    `).bind(auth.userId).all();

    // Filter out expired enrollments and unpublished courses
    const activeEnrollments = (result.results as any[]).filter((enr) => {
      if (enr.status === 'expired') return false;
      if (enr.expires_at && new Date(enr.expires_at) < new Date()) return false;
      return true;
    });

    return c.json({ enrollments: activeEnrollments });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// GET /enrollments/check — Check enrollment status for a course
routes.get('/enrollments/check', async (c) => {
  try {
    const courseId = c.req.query('course_id');
    if (!courseId) {
      return c.json({ error: 'course_id required' }, 400);
    }

    // Optional auth — works for both logged-in and anonymous users
    const auth = await getStudentAuth(c);

    let enrolled = false;
    let enrollment = null;
    let paymentStatus = 'none';

    if (auth.authorized && auth.userId) {
      // Check enrollment
      const enrollmentRecord = await c.env.DB.prepare(
        'SELECT * FROM enrollments WHERE user_id = ? AND course_id = ?'
      ).bind(auth.userId, courseId).first();
      
      if (enrollmentRecord) {
        enrolled = true;
        enrollment = enrollmentRecord;
        // Check if expired
        const enr = enrollmentRecord as any;
        if (enr.status === 'expired' || (enr.expires_at && new Date(enr.expires_at) < new Date())) {
          enrolled = false;
          paymentStatus = 'expired';
        }
      }

      // Check pending payment
      if (!enrolled) {
        const pendingPayment = await c.env.DB.prepare(
          "SELECT * FROM payments WHERE user_id = ? AND course_id = ? AND status = 'pending' ORDER BY created_at DESC LIMIT 1"
        ).bind(auth.userId, courseId).first();
        
        if (pendingPayment) {
          paymentStatus = 'pending';
        }
      }
    }

    return c.json({ enrolled, enrollment, paymentStatus });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// POST /enroll — Free course auto-enrollment
routes.post('/enroll', async (c) => {
  try {
    const auth = await getStudentAuth(c);
    if (!auth.authorized) {
      return c.json({ error: 'Login required' }, 401);
    }
    if (!auth.emailVerified) {
      return c.json({ error: 'Email verification required', code: 'EMAIL_NOT_VERIFIED' }, 403);
    }

    const { course_id, package_id } = await c.req.json();
    if (!course_id) {
      return c.json({ error: 'course_id required' }, 400);
    }

    // Check if already enrolled
    const existing = await c.env.DB.prepare(
      'SELECT id FROM enrollments WHERE user_id = ? AND course_id = ?'
    ).bind(auth.userId, course_id).first();
    
    if (existing) {
      return c.json({ error: 'Already enrolled in this course', enrolled: true }, 400);
    }

    // Verify course exists and is free (or has a free package)
    const course = await c.env.DB.prepare(
      'SELECT id, price FROM courses WHERE id = ? AND is_published = 1'
    ).bind(course_id).first();

    if (!course) {
      return c.json({ error: 'Course not found' }, 404);
    }

    // For free enrollment, verify the course/package is actually free
    let packageIdToUse = package_id || null;
    let durationMonths: number | null = 6;

    if (package_id) {
      const pkg = await c.env.DB.prepare(
        'SELECT * FROM course_packages WHERE id = ? AND course_id = ? AND is_active = 1'
      ).bind(package_id, course_id).first() as any;

      if (!pkg) {
        return c.json({ error: 'Package not found' }, 404);
      }
      if (pkg.price > 0) {
        return c.json({ error: 'This package requires payment. Use /payments/create instead.' }, 400);
      }
      packageIdToUse = pkg.id;
      durationMonths = pkg.duration_months; // NULL = lifetime
    } else {
      // Check if course price is 0
      const coursePrice = (course as any).price;
      if (coursePrice > 0) {
        // Check if there's a free package
        const freePkg = await c.env.DB.prepare(
          'SELECT * FROM course_packages WHERE course_id = ? AND price = 0 AND is_active = 1 LIMIT 1'
        ).bind(course_id).first() as any;
        
        if (freePkg) {
          packageIdToUse = freePkg.id;
          durationMonths = freePkg.duration_months;
        } else {
          return c.json({ error: 'This course requires payment. Use /payments/create instead.' }, 400);
        }
      }
    }

    // Calculate expires_at: duration_months NULL means lifetime (expires_at = NULL)
    let expiresAt: string | null = null;
    if (durationMonths !== null && durationMonths > 0) {
      const expDate = new Date();
      expDate.setMonth(expDate.getMonth() + durationMonths);
      expiresAt = expDate.toISOString();
    }
    // duration_months IS NULL → expires_at = NULL (lifetime)

    // Create enrollment
    const enrollmentId = crypto.randomUUID();
    await c.env.DB.prepare(
      'INSERT INTO enrollments (id, user_id, course_id, package_id, expires_at, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, datetime("now"), datetime("now"))'
    ).bind(enrollmentId, auth.userId, course_id, packageIdToUse, expiresAt, 'active').run();

    return c.json({
      success: true,
      enrollment: {
        id: enrollmentId,
        user_id: auth.userId,
        course_id,
        package_id: packageIdToUse,
        expires_at: expiresAt,
        status: 'active',
      },
    });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

export default routes;
