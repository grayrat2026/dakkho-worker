/**
 * Shared helpers for instructor sub-route modules.
 *
 * Centralises formatting functions, ownership checks, and the
 * getInstructorId helper so every sub-file can import from here
 * instead of duplicating logic.
 */

import type { Env } from '../../env';
import {
  type InstructorOrAdminAuthVariables,
} from '../../lib/instructor-auth-middleware';

// Re-export the auth-variables type under a convenient alias
export type InstructorBindings = { Bindings: Env; Variables: InstructorOrAdminAuthVariables };

// ─── Helper: Format instructor row for backward compatibility ───

export function formatInstructorRow(row: Record<string, unknown>): Record<string, unknown> {
  return {
    ...row,
    $id: row.id,
    avatarUrl: row.avatar_url || row.avatarUrl,
  };
}

// ─── Helper: Format course row for backward compatibility ───

export function formatCourseRow(row: Record<string, unknown>): Record<string, unknown> {
  return {
    ...row,
    $id: row.id,
    $createdAt: row.created_at,
    isPublished: row.is_published,
    price: row.price ?? row.price_bdt ?? 0,
    instructorId: row.instructor_id,
  };
}

// ─── Helper: Format video row for backward compatibility ───

export function formatVideoRow(row: Record<string, unknown>): Record<string, unknown> {
  return {
    ...row,
    courseId: row.course_id,
    videoUrl: row.video_url,
  };
}

// ─── Helper: Format enrollment row for backward compatibility ───

export function formatEnrollmentRow(row: Record<string, unknown>): Record<string, unknown> {
  return {
    ...row,
    courseId: row.course_id,
    userId: row.user_id,
  };
}

// ─── Helper: Slugify text for URL-safe slugs ───

export function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// ─── Helper: Verify instructor owns a course ───

export async function verifyCourseOwnership(env: any, courseId: string, instructorId: string): Promise<boolean> {
  const course = await env.DB.prepare('SELECT instructor_id FROM courses WHERE id = ?').bind(courseId).first<{ instructor_id: string }>();
  if (!course) return false;
  if (course.instructor_id === instructorId) return true;
  // Also check course_instructors junction table
  const junction = await env.DB.prepare('SELECT id FROM course_instructors WHERE course_id = ? AND instructor_id = ?').bind(courseId, instructorId).first();
  return !!junction;
}

// ─── Helper: Get instructor ID from auth context ───

export function getInstructorId(c: any): { instructorId: string; error: ReturnType<typeof c.json> | null } {
  const authRole = c.get('authRole');
  if (authRole === 'admin') {
    const id = c.req.query('instructorId') || '';
    if (!id) {
      return { instructorId: '', error: c.json({ error: 'instructorId query param required for admin access' }, 400) };
    }
    return { instructorId: id, error: null };
  }
  return { instructorId: c.get('instructorId'), error: null };
}
