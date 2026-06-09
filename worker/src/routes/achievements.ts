/**
 * Achievements routes — GET, POST, PUT, DELETE
 * Admin management for achievement definitions with unlock counts
 */

import { Hono } from 'hono';
import type { Env } from '../env';
import type { AuthVariables } from '../lib/auth';
import { adminAuthMiddleware } from '../lib/auth';
import { logAudit } from '../lib/audit';
import { getErrorMessage } from '../lib/utils';

const achievementRoutes = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

// Apply auth middleware
achievementRoutes.use('*', adminAuthMiddleware);

// GET / — List achievement definitions with unlock counts
achievementRoutes.get('/', async (c) => {
  try {
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '20');
    const category = c.req.query('category') || '';
    const offset = (page - 1) * limit;

    let where = 'WHERE 1=1';
    const params: unknown[] = [];

    if (category) {
      where += ' AND ad.category = ?';
      params.push(category);
    }

    const countResult = await c.env.DB.prepare(
      `SELECT COUNT(*) as total FROM achievement_definitions ad ${where}`
    ).bind(...params).first();
    const total = (countResult as any)?.total || 0;

    const result = await c.env.DB.prepare(
      `SELECT ad.*, 
        (SELECT COUNT(*) FROM student_achievements sa WHERE sa.achievement_id = ad.id) as unlock_count
       FROM achievement_definitions ad
       ${where}
       ORDER BY ad.category, ad.xp ASC LIMIT ? OFFSET ?`
    ).bind(...params, limit, offset).all();

    return c.json({ documents: result.results, total });
  } catch (error) {
    const message = getErrorMessage(error);
    return c.json({ error: message }, 500);
  }
});

// POST / — Create achievement
achievementRoutes.post('/', async (c) => {
  try {
    const data = await c.req.json<Record<string, unknown>>();
    const slug = (data.slug as string) || (data.name as string).toLowerCase().replace(/[^a-z0-9]+/g, '-');

    await c.env.DB.prepare(`
      INSERT INTO achievement_definitions (slug, name, name_bn, description, description_bn, category, icon, xp, condition_type, condition_value, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      slug,
      data.name || '',
      data.name_bn || null,
      data.description || '',
      data.description_bn || null,
      data.category || 'learning',
      data.icon || 'trophy',
      data.xp || 0,
      data.condition_type || '',
      data.condition_value || '',
      data.is_active !== undefined ? (data.is_active ? 1 : 0) : 1
    ).run();

    const created = await c.env.DB.prepare(
      'SELECT * FROM achievement_definitions WHERE rowid = last_insert_rowid()'
    ).first();

    const user = c.get('user');
    await logAudit(c.env, user.id, 'CREATE_ACHIEVEMENT', 'achievements', String((created as any)?.id), data);

    return c.json({ document: created });
  } catch (error) {
    const message = getErrorMessage(error);
    return c.json({ error: message }, 500);
  }
});

// PUT / — Update achievement
achievementRoutes.put('/', async (c) => {
  try {
    const data = await c.req.json<Record<string, unknown>>();
    const { achievementId, ...updates } = data;

    if (!achievementId) {
      return c.json({ error: 'Achievement ID required' }, 400);
    }

    const allowedFields = ['slug', 'name', 'name_bn', 'description', 'description_bn', 'category', 'icon', 'xp', 'condition_type', 'condition_value', 'is_active'];
    const setClauses: string[] = [];
    const setValues: unknown[] = [];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        if (key === 'is_active') {
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

    setValues.push(String(achievementId));

    await c.env.DB.prepare(
      `UPDATE achievement_definitions SET ${setClauses.join(', ')} WHERE id = ?`
    ).bind(...setValues).run();

    const updated = await c.env.DB.prepare('SELECT * FROM achievement_definitions WHERE id = ?').bind(String(achievementId)).first();

    const user = c.get('user');
    await logAudit(c.env, user.id, 'UPDATE_ACHIEVEMENT', 'achievements', String(achievementId), updates);

    return c.json({ document: updated });
  } catch (error) {
    const message = getErrorMessage(error);
    return c.json({ error: message }, 500);
  }
});

// DELETE / — Delete achievement
achievementRoutes.delete('/', async (c) => {
  try {
    const achievementId = c.req.query('id');

    if (!achievementId) {
      return c.json({ error: 'Achievement ID required' }, 400);
    }

    // Delete student achievements first (foreign key)
    await c.env.DB.prepare('DELETE FROM student_achievements WHERE achievement_id = ?').bind(achievementId).run();
    await c.env.DB.prepare('DELETE FROM achievement_definitions WHERE id = ?').bind(achievementId).run();

    const user = c.get('user');
    await logAudit(c.env, user.id, 'DELETE_ACHIEVEMENT', 'achievements', achievementId);

    return c.json({ success: true });
  } catch (error) {
    const message = getErrorMessage(error);
    return c.json({ error: message }, 500);
  }
});

export default achievementRoutes;
