/**
 * Packages routes — GET, POST, PUT, DELETE
 * Admin management for course packages
 */

import { Hono } from 'hono';
import type { Env } from '../env';
import type { AuthVariables } from '../lib/auth';
import { adminAuthMiddleware } from '../lib/auth';
import { logAudit } from '../lib/audit';
import { getErrorMessage } from '../lib/utils';

const packageRoutes = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

// Apply auth middleware
packageRoutes.use('*', adminAuthMiddleware);

// GET / — List course packages
packageRoutes.get('/', async (c) => {
  try {
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '20');
    const courseId = c.req.query('courseId') || '';
    const offset = (page - 1) * limit;

    let where = 'WHERE 1=1';
    const params: unknown[] = [];

    if (courseId) {
      where += ' AND course_id = ?';
      params.push(courseId);
    }

    const countResult = await c.env.DB.prepare(
      `SELECT COUNT(*) as total FROM course_packages ${where}`
    ).bind(...params).first();
    const total = (countResult as any)?.total || 0;

    const result = await c.env.DB.prepare(
      `SELECT * FROM course_packages ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`
    ).bind(...params, limit, offset).all();

    return c.json({ documents: result.results, total });
  } catch (error) {
    const message = getErrorMessage(error);
    return c.json({ error: message }, 500);
  }
});

// POST / — Create package
packageRoutes.post('/', async (c) => {
  try {
    const data = await c.req.json<Record<string, unknown>>();

    await c.env.DB.prepare(`
      INSERT INTO course_packages (course_id, package_type, price, duration_months, max_users, is_auto_assign, is_active, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      data.course_id || '',
      data.package_type || 'individual',
      data.price || 0,
      data.duration_months || 6,
      data.max_users || 1,
      data.is_auto_assign !== undefined ? (data.is_auto_assign ? 1 : 0) : 1,
      data.is_active !== undefined ? (data.is_active ? 1 : 0) : 1,
      data.created_by || null
    ).run();

    const created = await c.env.DB.prepare(
      'SELECT * FROM course_packages WHERE rowid = last_insert_rowid()'
    ).first();

    const user = c.get('user');
    await logAudit(c.env, user.id, 'CREATE_PACKAGE', 'packages', String((created as any)?.id), data);

    return c.json({ document: created });
  } catch (error) {
    const message = getErrorMessage(error);
    return c.json({ error: message }, 500);
  }
});

// PUT / — Update package
packageRoutes.put('/', async (c) => {
  try {
    const data = await c.req.json<Record<string, unknown>>();
    const { packageId, ...updates } = data;

    if (!packageId) {
      return c.json({ error: 'Package ID required' }, 400);
    }

    const allowedFields = ['course_id', 'package_type', 'price', 'duration_months', 'max_users', 'is_auto_assign', 'is_active'];
    const setClauses: string[] = [];
    const setValues: unknown[] = [];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        if (key === 'is_auto_assign' || key === 'is_active') {
          setClauses.push(`${key} = ?`);
          setValues.push(value ? 1 : 0);
        } else {
          setClauses.push(`${key} = ?`);
          setValues.push(value);
        }
      }
    }

    if (setClauses.length === 0) {
      return c.json({ error: 'No valid fields to update' }, 400);
    }

    setClauses.push("updated_at = datetime('now')");
    setValues.push(String(packageId));

    await c.env.DB.prepare(
      `UPDATE course_packages SET ${setClauses.join(', ')} WHERE id = ?`
    ).bind(...setValues).run();

    const updated = await c.env.DB.prepare('SELECT * FROM course_packages WHERE id = ?').bind(String(packageId)).first();

    const user = c.get('user');
    await logAudit(c.env, user.id, 'UPDATE_PACKAGE', 'packages', String(packageId), updates);

    return c.json({ document: updated });
  } catch (error) {
    const message = getErrorMessage(error);
    return c.json({ error: message }, 500);
  }
});

// DELETE / — Delete package
packageRoutes.delete('/', async (c) => {
  try {
    const packageId = c.req.query('id');

    if (!packageId) {
      return c.json({ error: 'Package ID required' }, 400);
    }

    await c.env.DB.prepare('DELETE FROM course_packages WHERE id = ?').bind(packageId).run();

    const user = c.get('user');
    await logAudit(c.env, user.id, 'DELETE_PACKAGE', 'packages', packageId);

    return c.json({ success: true });
  } catch (error) {
    const message = getErrorMessage(error);
    return c.json({ error: message }, 500);
  }
});

export default packageRoutes;
