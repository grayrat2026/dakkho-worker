/**
 * Instructor profile routes
 *
 * - GET  /profile         — Get instructor profile (instructorOrAdmin)
 * - PUT  /profile         — Update instructor profile (instructorOrAdmin)
 * - POST /profile/avatar  — Upload instructor avatar to R2 (instructorOrAdmin)
 */

import { Hono } from 'hono';
import type { Env } from '../../env';
import {
  instructorOrAdminMiddleware,
  type InstructorOrAdminAuthVariables,
} from '../../lib/instructor-auth-middleware';
import { getErrorMessage } from '../../lib/utils';
import { getPublicUrl } from '../../lib/r2';
import { formatInstructorRow } from './helpers';

const routes = new Hono<{ Bindings: Env; Variables: InstructorOrAdminAuthVariables }>();

// GET /profile — Get instructor profile from D1 instructors table
routes.get('/profile', instructorOrAdminMiddleware, async (c) => {
  try {
    const authRole = c.get('authRole');
    let instructorId: string;

    if (authRole === 'admin') {
      // Admin may query by query param
      instructorId = c.req.query('instructorId') || '';
      if (!instructorId) {
        return c.json({ error: 'instructorId query param required for admin access' }, 400);
      }
    } else {
      instructorId = c.get('instructorId');
    }

    const row = await c.env.DB.prepare(
      'SELECT * FROM instructors WHERE id = ?'
    ).bind(instructorId).first();

    if (!row) {
      return c.json({ error: 'Instructor profile not found' }, 404);
    }

    const profile = formatInstructorRow(row as Record<string, unknown>);

    return c.json({ success: true, profile });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// PUT /profile — Update instructor profile (name, bio, avatar, etc.)
routes.put('/profile', instructorOrAdminMiddleware, async (c) => {
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

    const body = await c.req.json();

    // Map camelCase field names to snake_case D1 columns
    const fieldMapping: Record<string, string> = {
      name: 'name',
      bio: 'bio',
      avatar: 'avatar_url',
      avatarUrl: 'avatar_url',
      specialization: 'specialization',
      phone: 'phone',
      department: 'department',
    };

    const setClauses: string[] = [];
    const params: unknown[] = [];

    for (const [bodyField, dbColumn] of Object.entries(fieldMapping)) {
      if (body[bodyField] !== undefined) {
        setClauses.push(`${dbColumn} = ?`);
        params.push(body[bodyField]);
      }
    }

    if (setClauses.length === 0) {
      return c.json({ error: 'No valid fields to update' }, 400);
    }

    // Always update updated_at
    setClauses.push('updated_at = ?');
    params.push(new Date().toISOString());

    params.push(instructorId);

    await c.env.DB.prepare(
      `UPDATE instructors SET ${setClauses.join(', ')} WHERE id = ?`
    ).bind(...params).run();

    // If name was updated, also update the D1 session
    if ((body.name !== undefined) && authRole === 'instructor') {
      try {
        await c.env.DB.prepare(
          'UPDATE instructor_sessions SET name = ? WHERE user_id = ? AND is_active = 1'
        ).bind(String(body.name), instructorId).run();
      } catch {}
    }

    // If avatar was updated, also update the D1 session
    if ((body.avatarUrl !== undefined || body.avatar !== undefined) && authRole === 'instructor') {
      try {
        const avatarVal = body.avatarUrl || body.avatar;
        await c.env.DB.prepare(
          'UPDATE instructor_sessions SET avatar_url = ? WHERE user_id = ? AND is_active = 1'
        ).bind(String(avatarVal), instructorId).run();
      } catch {}
    }

    // Fetch and return the updated profile
    const updatedRow = await c.env.DB.prepare(
      'SELECT * FROM instructors WHERE id = ?'
    ).bind(instructorId).first();

    const profile = formatInstructorRow(updatedRow as Record<string, unknown>);

    return c.json({ success: true, profile });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// POST /profile/avatar — Upload instructor avatar to R2
routes.post('/profile/avatar', instructorOrAdminMiddleware, async (c) => {
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

    const formData = await c.req.formData();
    const avatarEntry = formData.get('avatar');
    if (!avatarEntry || typeof avatarEntry === 'string') {
      return c.json({ error: 'No avatar file provided' }, 400);
    }
    const file = avatarEntry as unknown as Blob & { name?: string; type?: string };

    // Clean up old avatar from R2
    try {
      const existingRow = await c.env.DB.prepare(
        'SELECT avatar_url FROM instructors WHERE id = ?'
      ).bind(instructorId).first<{ avatar_url: string | null }>();

      const oldAvatarUrl = existingRow?.avatar_url;
      if (oldAvatarUrl) {
        const uploadMatch = oldAvatarUrl.match(/\/upload\/avatars\/(.+)$/);
        if (uploadMatch?.[1]) {
          await c.env.R2_AVATARS.delete(uploadMatch[1]);
        }
      }
    } catch {}

    // Upload to R2 avatars bucket
    const key = `instructor/${instructorId}/${Date.now()}-${file.name || 'avatar'}`;
    const arrayBuffer = await file.arrayBuffer();
    await c.env.R2_AVATARS.put(key, arrayBuffer, {
      httpMetadata: { contentType: file.type || 'image/png' },
    });

    const avatarUrl = await getPublicUrl(c.env, 'avatars', key);

    // Update D1 instructors table
    await c.env.DB.prepare(
      'UPDATE instructors SET avatar_url = ?, updated_at = ? WHERE id = ?'
    ).bind(avatarUrl, new Date().toISOString(), instructorId).run();

    // Update D1 session
    if (authRole === 'instructor') {
      try {
        await c.env.DB.prepare(
          'UPDATE instructor_sessions SET avatar_url = ? WHERE user_id = ? AND is_active = 1'
        ).bind(avatarUrl, instructorId).run();
      } catch {}
    }

    return c.json({ success: true, avatar_url: avatarUrl });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

export default routes;
