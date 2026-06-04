import { Hono } from 'hono';
import type { Env } from '../env';
import type { AuthVariables } from '../lib/auth';
import { adminAuthMiddleware } from '../lib/auth';
import { logAudit } from '../lib/audit';
import { sendPushNotification, getUserPushTokens } from '../lib/onesignal';
import { getErrorMessage } from '../lib/utils';

const instituteRequestRoutes = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

// Apply auth middleware to all routes
instituteRequestRoutes.use('*', adminAuthMiddleware);

// GET / — List institute requests (with status filter)
instituteRequestRoutes.get('/', async (c) => {
  try {
    const status = c.req.query('status') || 'all';
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '20');
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM institute_requests';
    let countQuery = 'SELECT COUNT(*) as total FROM institute_requests';
    const params: any[] = [];

    if (status !== 'all') {
      query += ' WHERE status = ?';
      countQuery += ' WHERE status = ?';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';

    const countResult = await c.env.DB.prepare(countQuery).bind(...params).first();
    const total = (countResult as any)?.total || 0;

    const result = await c.env.DB.prepare(query).bind(...params, limit, offset).all();

    return c.json({ requests: result.results, total });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// POST / — Create institute request (student-facing, but also used by admin)
instituteRequestRoutes.post('/', async (c) => {
  try {
    const data = await c.req.json();
    const { user_id, user_email, user_name, institute_name, institute_name_bn, division, district } = data;

    if (!user_id || !institute_name) {
      return c.json({ error: 'user_id and institute_name are required' }, 400);
    }

    // Check if institute already exists
    const existing = await c.env.DB.prepare(
      'SELECT id FROM institutes WHERE name = ? AND is_active = 1'
    ).bind(institute_name).first();

    if (existing) {
      return c.json({ error: 'This institute already exists in the system' }, 400);
    }

    // Check if there's already a pending request for this institute
    const pendingRequest = await c.env.DB.prepare(
      'SELECT id FROM institute_requests WHERE institute_name = ? AND status = ?'
    ).bind(institute_name, 'pending').first();

    if (pendingRequest) {
      return c.json({ error: 'A request for this institute is already pending' }, 400);
    }

    const result = await c.env.DB.prepare(`
      INSERT INTO institute_requests (user_id, user_email, user_name, institute_name, institute_name_bn, division, district, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
    `).bind(user_id, user_email || null, user_name || null, institute_name, institute_name_bn || null, division || null, district || null).run();

    const user = c.get('user');
    await logAudit(c.env, user.id, 'CREATE_INSTITUTE_REQUEST', 'institute_requests', String((result.meta as any)?.last_row_id), data);

    return c.json({ success: true, message: 'Institute request submitted successfully' });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// PUT /:id/approve — Approve institute request
instituteRequestRoutes.put('/:id/approve', async (c) => {
  try {
    const id = c.req.param('id');
    const admin = c.get('user');

    // Get the request
    const request = await c.env.DB.prepare(
      'SELECT * FROM institute_requests WHERE id = ? AND status = ?'
    ).bind(id, 'pending').first();

    if (!request) {
      return c.json({ error: 'Pending request not found' }, 404);
    }

    const req = request as any;

    // Insert into institutes table with is_requested = 1
    await c.env.DB.prepare(`
      INSERT INTO institutes (name, name_bn, division, district, type, is_requested, requested_by, approved_by, approved_at, is_active)
      VALUES (?, ?, ?, ?, 'polytechnic', 1, ?, ?, datetime('now'), 1)
    `).bind(req.institute_name, req.institute_name_bn, req.division, req.district, req.user_id, admin.id).run();

    // Update request status
    await c.env.DB.prepare(`
      UPDATE institute_requests SET status = 'approved', reviewed_by = ?, reviewed_at = datetime('now'), updated_at = datetime('now')
      WHERE id = ?
    `).bind(admin.id, id).run();

    await logAudit(c.env, admin.id, 'APPROVE_INSTITUTE_REQUEST', 'institute_requests', id);

    // Send push notification to the requester
    try {
      const tokens = await getUserPushTokens(c.env, req.user_id);
      if (tokens.length > 0) {
        await sendPushNotification(c.env, {
          title: 'Institute Request Approved!',
          titleBn: 'ইনস্টিটিউট অনুরোধ অনুমোদিত!',
          message: `Your request for "${req.institute_name}" has been approved.`,
          messageBn: `"${req.institute_name}" এর জন্য আপনার অনুরোধ অনুমোদিত হয়েছে।`,
          targetPlayerIds: tokens,
        });
      }
    } catch {
      // Best-effort push notification
    }

    return c.json({ success: true, message: 'Institute request approved and added to institutes' });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// PUT /:id/reject — Reject institute request
instituteRequestRoutes.put('/:id/reject', async (c) => {
  try {
    const id = c.req.param('id');
    const { admin_note } = await c.req.json();
    const admin = c.get('user');

    const request = await c.env.DB.prepare(
      'SELECT * FROM institute_requests WHERE id = ? AND status = ?'
    ).bind(id, 'pending').first();

    if (!request) {
      return c.json({ error: 'Pending request not found' }, 404);
    }

    const req = request as any;

    await c.env.DB.prepare(`
      UPDATE institute_requests SET status = 'rejected', admin_note = ?, reviewed_by = ?, reviewed_at = datetime('now'), updated_at = datetime('now')
      WHERE id = ?
    `).bind(admin_note || null, admin.id, id).run();

    await logAudit(c.env, admin.id, 'REJECT_INSTITUTE_REQUEST', 'institute_requests', id);

    // Send push notification
    try {
      const tokens = await getUserPushTokens(c.env, req.user_id);
      if (tokens.length > 0) {
        await sendPushNotification(c.env, {
          title: 'Institute Request Update',
          titleBn: 'ইনস্টিটিউট অনুরোধ আপডেট',
          message: `Your request for "${req.institute_name}" was not approved. ${admin_note || ''}`,
          messageBn: `"${req.institute_name}" এর অনুরোধ অনুমোদিত হয়নি। ${admin_note || ''}`,
          targetPlayerIds: tokens,
        });
      }
    } catch {
      // Best-effort
    }

    return c.json({ success: true, message: 'Institute request rejected' });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

export default instituteRequestRoutes;
