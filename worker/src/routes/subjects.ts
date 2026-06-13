/**
 * Subjects routes — GET, POST, PUT, DELETE
 * D1-only: CRUD for subjects with pagination, search, and technology filter
 */

import { Hono } from 'hono';
import type { Env } from '../env';
import type { AuthVariables } from '../lib/auth';
import { adminAuthMiddleware } from '../lib/auth';
import { logAudit } from '../lib/audit';
import { getErrorMessage, normalizeKeys } from '../lib/utils';

const subjectRoutes = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

// Apply auth middleware to all subject routes
subjectRoutes.use('*', adminAuthMiddleware);

// Helper: generate slug from name
function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// GET / — List subjects with pagination, search, technology filter
subjectRoutes.get('/', async (c) => {
  try {
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '20');
    const search = c.req.query('search') || '';
    const technologyId = c.req.query('technologyId') || '';
    const offset = (page - 1) * limit;

    let where = 'WHERE 1=1';
    const params: unknown[] = [];

    if (search) {
      where += ' AND name LIKE ?';
      params.push(`%${search}%`);
    }
    if (technologyId) {
      where += ' AND technology_id = ?';
      params.push(technologyId);
    }

    const countResult = await c.env.DB.prepare(
      `SELECT COUNT(*) as total FROM subjects ${where}`
    ).bind(...params).first();
    const total = (countResult as any)?.total || 0;

    const result = await c.env.DB.prepare(
      `SELECT * FROM subjects ${where} ORDER BY sort_order ASC, created_at DESC LIMIT ? OFFSET ?`
    ).bind(...params, limit, offset).all();

    // After fetching subjects, add technologies from junction table
    const subjects = result.results as Record<string, unknown>[];
    const subjectsWithTech = await Promise.all(subjects.map(async (subject) => {
      const subjectId = String(subject.id);
      try {
        const techResult = await c.env.DB.prepare(
          `SELECT st.technology_id, t.name as technology_name FROM subject_technologies st 
           JOIN technologies t ON st.technology_id = t.id 
           WHERE st.subject_id = ?`
        ).bind(subjectId).all();
        return {
          ...subject,
          technology_ids: techResult.results.map((r: any) => r.technology_id),
          technology_names: techResult.results.map((r: any) => r.technology_name),
        };
      } catch {
        // Junction table might not exist yet
        return subject;
      }
    }));

    return c.json({ documents: subjectsWithTech, total });
  } catch (error) {
    const message = getErrorMessage(error);
    return c.json({ error: message }, 500);
  }
});

// POST / — Create subject (auto-generate UUID and slug)
subjectRoutes.post('/', async (c) => {
  try {
    const rawData = await c.req.json<Record<string, unknown>>();
    const allowedFields = ['name', 'slug', 'description', 'icon', 'color', 'technology_id', 'sort_order', 'course_count', 'is_active'];
    const data = normalizeKeys(rawData, allowedFields);
    const id = crypto.randomUUID();
    const slug = (data.slug as string) || slugify(data.name as string);

    if (!data.name) {
      return c.json({ error: 'Name is required' }, 400);
    }

    // Check for duplicate slug
    const existing = await c.env.DB.prepare(
      'SELECT id FROM subjects WHERE slug = ?'
    ).bind(slug).first();
    if (existing) {
      return c.json({ error: 'Slug already exists' }, 400);
    }

    await c.env.DB.prepare(`
      INSERT INTO subjects (id, name, slug, description, icon, color, technology_id, sort_order, course_count, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      data.name,
      slug,
      data.description || null,
      data.icon || null,
      data.color || null,
      data.technology_id || null,
      data.sort_order || 0,
      data.course_count || 0,
      data.is_active !== undefined ? (data.is_active ? 1 : 0) : 1
    ).run();

    // Handle multiple technology_ids
    const technologyIds = (rawData as any).technology_ids as number[] || (data.technology_id ? [Number(data.technology_id)] : []);
    for (const techId of technologyIds) {
      try {
        await c.env.DB.prepare(
          'INSERT INTO subject_technologies (id, subject_id, technology_id) VALUES (?, ?, ?)'
        ).bind(crypto.randomUUID(), id, techId).run();
      } catch {}
    }

    const created = await c.env.DB.prepare('SELECT * FROM subjects WHERE id = ?').bind(id).first();

    const user = c.get('user');
    await logAudit(c.env, user.id, 'CREATE_SUBJECT', 'subjects', id, data);

    return c.json({ document: created });
  } catch (error) {
    const message = getErrorMessage(error);
    return c.json({ error: message }, 500);
  }
});

// PUT / — Update subject by subjectId
subjectRoutes.put('/', async (c) => {
  try {
    const rawData = await c.req.json<Record<string, unknown>>();
    const { subjectId, ...rawUpdates } = rawData;

    if (!subjectId) {
      return c.json({ error: 'Subject ID required' }, 400);
    }

    // Check if subject exists
    const existing = await c.env.DB.prepare(
      'SELECT id FROM subjects WHERE id = ?'
    ).bind(String(subjectId)).first();
    if (!existing) {
      return c.json({ error: 'Subject not found' }, 404);
    }

    const allowedFields = ['name', 'slug', 'description', 'icon', 'color', 'technology_id', 'sort_order', 'course_count', 'is_active'];
    // Normalize camelCase keys from admin panel to snake_case for D1
    const updates = normalizeKeys(rawUpdates, allowedFields);
    const setClauses: string[] = [];
    const setValues: unknown[] = [];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        // Convert boolean to integer for SQLite
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

    setClauses.push("updated_at = datetime('now')");
    setValues.push(String(subjectId));

    await c.env.DB.prepare(
      `UPDATE subjects SET ${setClauses.join(', ')} WHERE id = ?`
    ).bind(...setValues).run();

    // Update technology associations if provided
    if (rawUpdates.technology_ids !== undefined) {
      const techIds = rawUpdates.technology_ids as number[];
      // Delete existing associations
      await c.env.DB.prepare(
        'DELETE FROM subject_technologies WHERE subject_id = ?'
      ).bind(String(subjectId)).run();
      // Insert new associations
      for (const techId of techIds) {
        try {
          await c.env.DB.prepare(
            'INSERT INTO subject_technologies (id, subject_id, technology_id) VALUES (?, ?, ?)'
          ).bind(crypto.randomUUID(), String(subjectId), techId).run();
        } catch {}
      }
    }

    const updated = await c.env.DB.prepare('SELECT * FROM subjects WHERE id = ?').bind(String(subjectId)).first();

    const user = c.get('user');
    await logAudit(c.env, user.id, 'UPDATE_SUBJECT', 'subjects', String(subjectId), updates);

    return c.json({ document: updated });
  } catch (error) {
    const message = getErrorMessage(error);
    return c.json({ error: message }, 500);
  }
});

// DELETE / — Delete subject by id query param
subjectRoutes.delete('/', async (c) => {
  try {
    const id = c.req.query('id');

    if (!id) {
      return c.json({ error: 'Subject ID required' }, 400);
    }

    await c.env.DB.prepare('DELETE FROM subjects WHERE id = ?').bind(id).run();

    const user = c.get('user');
    await logAudit(c.env, user.id, 'DELETE_SUBJECT', 'subjects', id);

    return c.json({ success: true });
  } catch (error) {
    const message = getErrorMessage(error);
    return c.json({ error: message }, 500);
  }
});

// GET /:subjectId/technologies — Get technologies for a subject
subjectRoutes.get('/:subjectId/technologies', async (c) => {
  try {
    const subjectId = c.req.param('subjectId');
    const result = await c.env.DB.prepare(
      `SELECT st.id, st.technology_id, t.name as technology_name, t.short_code 
       FROM subject_technologies st 
       JOIN technologies t ON st.technology_id = t.id 
       WHERE st.subject_id = ?`
    ).bind(subjectId).all();
    return c.json({ technologies: result.results });
  } catch (error) {
    const message = getErrorMessage(error);
    return c.json({ error: message }, 500);
  }
});

// POST /:subjectId/technologies — Add technology to subject
subjectRoutes.post('/:subjectId/technologies', async (c) => {
  try {
    const subjectId = c.req.param('subjectId');
    const { technologyId } = await c.req.json<{ technologyId: number }>();
    if (!technologyId) return c.json({ error: 'technologyId required' }, 400);

    const id = crypto.randomUUID();
    await c.env.DB.prepare(
      'INSERT INTO subject_technologies (id, subject_id, technology_id) VALUES (?, ?, ?)'
    ).bind(id, subjectId, technologyId).run();

    return c.json({ success: true, id });
  } catch (error) {
    const message = getErrorMessage(error);
    return c.json({ error: message }, 500);
  }
});

// DELETE /:subjectId/technologies/:technologyId — Remove technology from subject
subjectRoutes.delete('/:subjectId/technologies/:technologyId', async (c) => {
  try {
    const subjectId = c.req.param('subjectId');
    const technologyId = c.req.param('technologyId');

    await c.env.DB.prepare(
      'DELETE FROM subject_technologies WHERE subject_id = ? AND technology_id = ?'
    ).bind(subjectId, Number(technologyId)).run();

    return c.json({ success: true });
  } catch (error) {
    const message = getErrorMessage(error);
    return c.json({ error: message }, 500);
  }
});

export default subjectRoutes;
