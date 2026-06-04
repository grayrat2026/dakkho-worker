/**
 * Discounts Admin Routes — CRUD for auto-apply discounts
 */

import { Hono } from 'hono';
import type { Env } from '../env';
import type { AuthVariables } from '../lib/auth';
import { adminAuthMiddleware } from '../lib/auth';
import { logAudit } from '../lib/audit';
import { getErrorMessage } from '../lib/utils';

const discountRoutes = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

discountRoutes.use('*', adminAuthMiddleware);

// GET / — List discounts
discountRoutes.get('/', async (c) => {
  try {
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '20');
    const offset = (page - 1) * limit;
    const activeOnly = c.req.query('active') === 'true';

    let query = 'SELECT * FROM discounts';
    let countQuery = 'SELECT COUNT(*) as total FROM discounts';
    const params: any[] = [];

    if (activeOnly) {
      query += ' WHERE is_active = 1';
      countQuery += ' WHERE is_active = 1';
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';

    const countResult = await c.env.DB.prepare(countQuery).bind(...params).first();
    const total = (countResult as any)?.total || 0;

    const result = await c.env.DB.prepare(query).bind(...params, limit, offset).all();

    return c.json({ discounts: result.results, total });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// POST / — Create discount
discountRoutes.post('/', async (c) => {
  try {
    const data = await c.req.json();
    const { name, name_bn, description, discount_type, discount_value, applicable_type, applicable_ids, valid_from, valid_until, is_auto_apply } = data;

    if (!name || !discount_type || !discount_value || !applicable_type || !valid_from || !valid_until) {
      return c.json({ error: 'name, discount_type, discount_value, applicable_type, valid_from, valid_until required' }, 400);
    }

    const user = c.get('user');
    const result = await c.env.DB.prepare(`
      INSERT INTO discounts (name, name_bn, description, discount_type, discount_value, applicable_type, applicable_ids, valid_from, valid_until, is_auto_apply, is_active, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    `).bind(
      name, name_bn || null, description || null, discount_type, discount_value,
      applicable_type, applicable_ids ? JSON.stringify(applicable_ids) : null,
      valid_from, valid_until, is_auto_apply ? 1 : 0, user.id
    ).run();

    await logAudit(c.env, user.id, 'CREATE_DISCOUNT', 'discounts', String((result.meta as any)?.last_row_id), data);

    return c.json({ success: true, message: 'Discount created successfully' });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// PUT /:id — Update discount
discountRoutes.put('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const data = await c.req.json();
    const user = c.get('user');

    const updates: string[] = [];
    const params: any[] = [];

    const allowedFields = ['name', 'name_bn', 'description', 'discount_type', 'discount_value', 'applicable_type', 'valid_from', 'valid_until', 'is_auto_apply', 'is_active'];
    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        updates.push(`${field} = ?`);
        params.push(data[field]);
      }
    }

    if (data.applicable_ids !== undefined) {
      updates.push('applicable_ids = ?');
      params.push(JSON.stringify(data.applicable_ids));
    }

    if (updates.length === 0) {
      return c.json({ error: 'No fields to update' }, 400);
    }

    updates.push("updated_at = datetime('now')");
    params.push(id);

    await c.env.DB.prepare(
      `UPDATE discounts SET ${updates.join(', ')} WHERE id = ?`
    ).bind(...params).run();

    await logAudit(c.env, user.id, 'UPDATE_DISCOUNT', 'discounts', id, data);

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// DELETE /:id — Deactivate discount
discountRoutes.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const user = c.get('user');

    await c.env.DB.prepare(
      "UPDATE discounts SET is_active = 0, updated_at = datetime('now') WHERE id = ?"
    ).bind(id).run();

    await logAudit(c.env, user.id, 'DEACTIVATE_DISCOUNT', 'discounts', id);

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

export default discountRoutes;
