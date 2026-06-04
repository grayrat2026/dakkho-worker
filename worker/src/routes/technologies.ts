/**
 * Technologies admin routes — CRUD via D1
 */

import { Hono } from 'hono';
import type { Env } from '../env';
import type { AuthVariables } from '../lib/auth';
import { adminAuthMiddleware } from '../lib/auth';
import { logAudit } from '../lib/audit';
import { getErrorMessage } from '../lib/utils';

const techRoutes = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

// Apply auth middleware
techRoutes.use('*', adminAuthMiddleware);

// GET / — List all technologies
techRoutes.get('/', async (c) => {
  try {
    const result = await c.env.DB.prepare(
      'SELECT * FROM technologies ORDER BY name ASC'
    ).all();
    return c.json({ technologies: result.results });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// POST / — Create technology
techRoutes.post('/', async (c) => {
  try {
    const data = await c.req.json();
    const { name, name_bn, short_code, description } = data;

    if (!name) {
      return c.json({ error: 'Name is required' }, 400);
    }

    // Check duplicate short_code
    if (short_code) {
      const existing = await c.env.DB.prepare(
        'SELECT id FROM technologies WHERE short_code = ?'
      ).bind(short_code).first();
      if (existing) {
        return c.json({ error: 'Short code already exists' }, 400);
      }
    }

    await c.env.DB.prepare(`
      INSERT INTO technologies (name, name_bn, short_code, description)
      VALUES (?, ?, ?, ?)
    `).bind(name, name_bn || null, short_code || null, description || null).run();

    const user = c.get('user');
    await logAudit(c.env, user.id, 'CREATE_TECHNOLOGY', 'technologies', null, data);

    return c.json({ success: true, message: 'Technology created' });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// PUT / — Update technology
techRoutes.put('/', async (c) => {
  try {
    const data = await c.req.json();
    const { technologyId, ...updates } = data;

    if (!technologyId) {
      return c.json({ error: 'technologyId is required' }, 400);
    }

    // Check if technology exists
    const existing = await c.env.DB.prepare(
      'SELECT id FROM technologies WHERE id = ?'
    ).bind(technologyId).first();
    if (!existing) {
      return c.json({ error: 'Technology not found' }, 404);
    }

    // Build dynamic update
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) { fields.push('name = ?'); values.push(updates.name); }
    if (updates.name_bn !== undefined) { fields.push('name_bn = ?'); values.push(updates.name_bn); }
    if (updates.short_code !== undefined) { fields.push('short_code = ?'); values.push(updates.short_code); }
    if (updates.description !== undefined) { fields.push('description = ?'); values.push(updates.description); }
    if (updates.is_active !== undefined) { fields.push('is_active = ?'); values.push(updates.is_active); }

    if (fields.length === 0) {
      return c.json({ error: 'No fields to update' }, 400);
    }

    fields.push("updated_at = datetime('now')");
    values.push(technologyId);

    await c.env.DB.prepare(
      `UPDATE technologies SET ${fields.join(', ')} WHERE id = ?`
    ).bind(...values).run();

    const user = c.get('user');
    await logAudit(c.env, user.id, 'UPDATE_TECHNOLOGY', 'technologies', String(technologyId), updates);

    return c.json({ success: true, message: 'Technology updated' });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// DELETE / — Delete technology
techRoutes.delete('/', async (c) => {
  try {
    const technologyId = c.req.query('id');
    if (!technologyId) {
      return c.json({ error: 'Technology ID required' }, 400);
    }

    await c.env.DB.prepare('DELETE FROM technologies WHERE id = ?').bind(technologyId).run();

    const user = c.get('user');
    await logAudit(c.env, user.id, 'DELETE_TECHNOLOGY', 'technologies', technologyId);

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

export default techRoutes;
