/**
 * Chapters routes — GET, POST, PUT, DELETE
 * D1-only: CRUD for chapters (Subject → Chapter curriculum structure)
 */

import { Hono } from 'hono';
import type { Env } from '../env';
import type { AuthVariables } from '../lib/auth';
import { adminAuthMiddleware } from '../lib/auth';
import { logAudit } from '../lib/audit';
import { getErrorMessage, normalizeKeys } from '../lib/utils';

const chapterRoutes = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

// Apply auth middleware to all chapter routes
chapterRoutes.use('*', adminAuthMiddleware);

// Helper: generate slug from title
function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

// GET / — List chapters, filter by courseId, subjectId
chapterRoutes.get('/', async (c) => {
  try {
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '20');
    const courseId = c.req.query('courseId') || '';
    const subjectId = c.req.query('subjectId') || '';
    const offset = (page - 1) * limit;

    let where = 'WHERE 1=1';
    const params: unknown[] = [];

    if (courseId) {
      where += ' AND course_id = ?';
      params.push(courseId);
    }
    if (subjectId) {
      where += ' AND subject_id = ?';
      params.push(subjectId);
    }

    const countResult = await c.env.DB.prepare(
      `SELECT COUNT(*) as total FROM chapters ${where}`
    ).bind(...params).first();
    const total = (countResult as any)?.total || 0;

    const result = await c.env.DB.prepare(
      `SELECT * FROM chapters ${where} ORDER BY course_id, subject_id, sort_order ASC LIMIT ? OFFSET ?`
    ).bind(...params, limit, offset).all();

    return c.json({ documents: result.results, total });
  } catch (error) {
    const message = getErrorMessage(error);
    return c.json({ error: message }, 500);
  }
});

// POST / — Create chapter
chapterRoutes.post('/', async (c) => {
  try {
    const rawData = await c.req.json<Record<string, unknown>>();
    const allowedFields = ['course_id', 'subject_id', 'title', 'slug', 'description', 'sort_order'];
    const data = normalizeKeys(rawData, allowedFields);
    const id = crypto.randomUUID();
    const slug = (data.slug as string) || slugify(data.title as string || '');

    if (!data.title) {
      return c.json({ error: 'Title is required' }, 400);
    }
    if (!data.course_id) {
      return c.json({ error: 'Course ID is required' }, 400);
    }
    if (!data.subject_id) {
      return c.json({ error: 'Subject ID is required' }, 400);
    }

    await c.env.DB.prepare(`
      INSERT INTO chapters (id, course_id, subject_id, title, slug, description, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      data.course_id,
      data.subject_id,
      data.title,
      slug,
      data.description || null,
      data.sort_order || 0
    ).run();

    const created = await c.env.DB.prepare('SELECT * FROM chapters WHERE id = ?').bind(id).first();

    const user = c.get('user');
    await logAudit(c.env, user.id, 'CREATE_CHAPTER', 'chapters', id, data);

    return c.json({ document: created });
  } catch (error) {
    const message = getErrorMessage(error);
    return c.json({ error: message }, 500);
  }
});

// PUT / — Update chapter (requires chapterId in body)
chapterRoutes.put('/', async (c) => {
  try {
    const rawData = await c.req.json<Record<string, unknown>>();
    const { chapterId, ...rawUpdates } = rawData;

    if (!chapterId) {
      return c.json({ error: 'Chapter ID required' }, 400);
    }

    // Check if chapter exists
    const existing = await c.env.DB.prepare(
      'SELECT id FROM chapters WHERE id = ?'
    ).bind(String(chapterId)).first();
    if (!existing) {
      return c.json({ error: 'Chapter not found' }, 404);
    }

    const allowedFields = ['course_id', 'subject_id', 'title', 'slug', 'description', 'sort_order'];
    // Normalize camelCase keys from admin panel to snake_case for D1
    const updates = normalizeKeys(rawUpdates, allowedFields);
    const setClauses: string[] = [];
    const setValues: unknown[] = [];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        setClauses.push(`${key} = ?`);
        setValues.push(value);
      }
    }

    if (setClauses.length === 0) {
      return c.json({ error: 'No valid fields to update' }, 400);
    }

    setClauses.push("updated_at = datetime('now')");
    setValues.push(String(chapterId));

    await c.env.DB.prepare(
      `UPDATE chapters SET ${setClauses.join(', ')} WHERE id = ?`
    ).bind(...setValues).run();

    const updated = await c.env.DB.prepare('SELECT * FROM chapters WHERE id = ?').bind(String(chapterId)).first();

    const user = c.get('user');
    await logAudit(c.env, user.id, 'UPDATE_CHAPTER', 'chapters', String(chapterId), updates);

    return c.json({ document: updated });
  } catch (error) {
    const message = getErrorMessage(error);
    return c.json({ error: message }, 500);
  }
});

// DELETE / — Delete chapter (requires id query param)
chapterRoutes.delete('/', async (c) => {
  try {
    const id = c.req.query('id');

    if (!id) {
      return c.json({ error: 'Chapter ID required' }, 400);
    }

    await c.env.DB.prepare('DELETE FROM chapters WHERE id = ?').bind(id).run();

    const user = c.get('user');
    await logAudit(c.env, user.id, 'DELETE_CHAPTER', 'chapters', id);

    return c.json({ success: true });
  } catch (error) {
    const message = getErrorMessage(error);
    return c.json({ error: message }, 500);
  }
});

export default chapterRoutes;
