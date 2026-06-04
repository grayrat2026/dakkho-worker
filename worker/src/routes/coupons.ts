/**
 * Coupons Admin Routes — CRUD for discount coupons
 */

import { Hono } from 'hono';
import type { Env } from '../env';
import type { AuthVariables } from '../lib/auth';
import { adminAuthMiddleware } from '../lib/auth';
import { logAudit } from '../lib/audit';
import { getErrorMessage } from '../lib/utils';

const couponRoutes = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

couponRoutes.use('*', adminAuthMiddleware);

// GET / — List all coupons
couponRoutes.get('/', async (c) => {
  try {
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '20');
    const offset = (page - 1) * limit;
    const activeOnly = c.req.query('active') === 'true';

    let query = 'SELECT * FROM coupons';
    let countQuery = 'SELECT COUNT(*) as total FROM coupons';
    const params: any[] = [];

    if (activeOnly) {
      query += ' WHERE is_active = 1';
      countQuery += ' WHERE is_active = 1';
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';

    const countResult = await c.env.DB.prepare(countQuery).bind(...params).first();
    const total = (countResult as any)?.total || 0;

    const result = await c.env.DB.prepare(query).bind(...params, limit, offset).all();

    return c.json({ coupons: result.results, total });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// POST / — Create coupon
couponRoutes.post('/', async (c) => {
  try {
    const data = await c.req.json();
    const { code, discount_type, discount_value, max_discount, min_purchase, usage_limit, per_user_limit, valid_from, valid_until, applicable_courses, applicable_technologies } = data;

    if (!code || !discount_type || !discount_value || !valid_from || !valid_until) {
      return c.json({ error: 'code, discount_type, discount_value, valid_from, valid_until required' }, 400);
    }

    // Check if code already exists
    const existing = await c.env.DB.prepare('SELECT id FROM coupons WHERE code = ?').bind(code).first();
    if (existing) {
      return c.json({ error: 'Coupon code already exists' }, 400);
    }

    const user = c.get('user');
    const result = await c.env.DB.prepare(`
      INSERT INTO coupons (code, discount_type, discount_value, max_discount, min_purchase, usage_limit, per_user_limit, valid_from, valid_until, applicable_courses, applicable_technologies, is_active, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    `).bind(
      code, discount_type, discount_value, max_discount || null, min_purchase || 0,
      usage_limit || null, per_user_limit || 1, valid_from, valid_until,
      applicable_courses ? JSON.stringify(applicable_courses) : null,
      applicable_technologies ? JSON.stringify(applicable_technologies) : null,
      user.id
    ).run();

    await logAudit(c.env, user.id, 'CREATE_COUPON', 'coupons', String((result.meta as any)?.last_row_id), data);

    return c.json({ success: true, message: 'Coupon created successfully' });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// PUT /:id — Update coupon
couponRoutes.put('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const data = await c.req.json();
    const user = c.get('user');

    const updates: string[] = [];
    const params: any[] = [];

    const allowedFields = ['discount_type', 'discount_value', 'max_discount', 'min_purchase', 'usage_limit', 'per_user_limit', 'valid_from', 'valid_until', 'is_active'];
    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        updates.push(`${field} = ?`);
        params.push(data[field]);
      }
    }

    if (data.applicable_courses !== undefined) {
      updates.push('applicable_courses = ?');
      params.push(JSON.stringify(data.applicable_courses));
    }

    if (data.applicable_technologies !== undefined) {
      updates.push('applicable_technologies = ?');
      params.push(JSON.stringify(data.applicable_technologies));
    }

    if (updates.length === 0) {
      return c.json({ error: 'No fields to update' }, 400);
    }

    updates.push("updated_at = datetime('now')");
    params.push(id);

    await c.env.DB.prepare(
      `UPDATE coupons SET ${updates.join(', ')} WHERE id = ?`
    ).bind(...params).run();

    await logAudit(c.env, user.id, 'UPDATE_COUPON', 'coupons', id, data);

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// DELETE /:id — Deactivate coupon (soft delete)
couponRoutes.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const user = c.get('user');

    await c.env.DB.prepare(
      "UPDATE coupons SET is_active = 0, updated_at = datetime('now') WHERE id = ?"
    ).bind(id).run();

    await logAudit(c.env, user.id, 'DEACTIVATE_COUPON', 'coupons', id);

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

export default couponRoutes;
