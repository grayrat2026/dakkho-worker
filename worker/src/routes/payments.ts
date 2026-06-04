/**
 * Payment Admin Routes
 * - Manual payment verification
 * - Payment config management
 * - SSLCommerz & bKash plug & play setup
 */

import { Hono } from 'hono';
import type { Env } from '../env';
import type { AuthVariables } from '../lib/auth';
import { adminAuthMiddleware } from '../lib/auth';
import { createSSLCommerzSession, createBkashPayment } from '../lib/payment';
import { logAudit } from '../lib/audit';
import { getErrorMessage } from '../lib/utils';

const paymentRoutes = new Hono<{ Bindings: Env; Variables: AuthVariables }>();

paymentRoutes.use('*', adminAuthMiddleware);

// GET / — List payments
paymentRoutes.get('/', async (c) => {
  try {
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '20');
    const offset = (page - 1) * limit;
    const status = c.req.query('status');
    const gateway = c.req.query('gateway');

    let query = 'SELECT * FROM payments';
    let countQuery = 'SELECT COUNT(*) as total FROM payments';
    const params: any[] = [];
    const conditions: string[] = [];

    if (status) {
      conditions.push('status = ?');
      params.push(status);
    }
    if (gateway) {
      conditions.push('gateway = ?');
      params.push(gateway);
    }

    if (conditions.length > 0) {
      const whereClause = ' WHERE ' + conditions.join(' AND ');
      query += whereClause;
      countQuery += whereClause;
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';

    const countResult = await c.env.DB.prepare(countQuery).bind(...params).first();
    const total = (countResult as any)?.total || 0;

    const result = await c.env.DB.prepare(query).bind(...params, limit, offset).all();

    return c.json({ payments: result.results, total });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// PUT /:id/verify — Verify manual payment
paymentRoutes.put('/:id/verify', async (c) => {
  try {
    const id = c.req.param('id');
    const user = c.get('user');

    // Get payment
    const payment = await c.env.DB.prepare('SELECT * FROM payments WHERE id = ?').bind(id).first();
    if (!payment) {
      return c.json({ error: 'Payment not found' }, 404);
    }

    const p = payment as any;

    if (p.status !== 'pending') {
      return c.json({ error: 'Payment is not in pending status' }, 400);
    }

    // Update payment status
    await c.env.DB.prepare(`
      UPDATE payments SET status = 'verified', verified_by = ?, verified_at = datetime('now'), updated_at = datetime('now') WHERE id = ?
    `).bind(user.id, id).run();

    // If payment has a package, create user_package
    if (p.package_id) {
      const pkg = await c.env.DB.prepare('SELECT * FROM course_packages WHERE id = ?').bind(p.package_id).first();
      if (pkg) {
        const pkgData = pkg as any;
        const expiresAt = new Date(Date.now() + pkgData.duration_months * 30 * 24 * 60 * 60 * 1000).toISOString();

        await c.env.DB.prepare(`
          INSERT INTO user_packages (user_id, package_id, course_id, package_type, activated_at, expires_at, status)
          VALUES (?, ?, ?, ?, datetime('now'), ?, 'active')
        `).bind(p.user_id, p.package_id, pkgData.course_id, pkgData.package_type, expiresAt).run();
      }
    }

    await logAudit(c.env, user.id, 'VERIFY_PAYMENT', 'payments', id);

    return c.json({ success: true, message: 'Payment verified and package activated' });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// PUT /:id/reject — Reject manual payment
paymentRoutes.put('/:id/reject', async (c) => {
  try {
    const id = c.req.param('id');
    const { reason } = await c.req.json();
    const user = c.get('user');

    const payment = await c.env.DB.prepare('SELECT * FROM payments WHERE id = ?').bind(id).first();
    if (!payment) {
      return c.json({ error: 'Payment not found' }, 404);
    }

    await c.env.DB.prepare(`
      UPDATE payments SET status = 'failed', metadata = ?, verified_by = ?, verified_at = datetime('now'), updated_at = datetime('now') WHERE id = ?
    `).bind(JSON.stringify({ rejection_reason: reason || 'Rejected by admin' }), user.id, id).run();

    await logAudit(c.env, user.id, 'REJECT_PAYMENT', 'payments', id, { reason });

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// PUT /:id/refund — Refund payment
paymentRoutes.put('/:id/refund', async (c) => {
  try {
    const id = c.req.param('id');
    const { reason } = await c.req.json();
    const user = c.get('user');

    await c.env.DB.prepare(`
      UPDATE payments SET status = 'refunded', metadata = ?, updated_at = datetime('now') WHERE id = ?
    `).bind(JSON.stringify({ refund_reason: reason || 'Refunded' }), id).run();

    // Deactivate user package
    const payment = await c.env.DB.prepare('SELECT user_id, package_id FROM payments WHERE id = ?').bind(id).first();
    if (payment) {
      const p = payment as any;
      if (p.package_id) {
        await c.env.DB.prepare(`
          UPDATE user_packages SET status = 'cancelled' WHERE user_id = ? AND package_id = ? AND status = 'active'
        `).bind(p.user_id, p.package_id).run();
      }
    }

    await logAudit(c.env, user.id, 'REFUND_PAYMENT', 'payments', id, { reason });

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// ─── Payment Config ───

// GET /config — Get payment gateway config
paymentRoutes.get('/config', async (c) => {
  try {
    const result = await c.env.DB.prepare('SELECT * FROM payment_config').all();
    return c.json({ configs: result.results });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// PUT /config/:gateway — Update gateway config
paymentRoutes.put('/config/:gateway', async (c) => {
  try {
    const gateway = c.req.param('gateway');
    const data = await c.req.json();
    const user = c.get('user');

    if (!['manual', 'sslcommerz', 'bkash'].includes(gateway)) {
      return c.json({ error: 'Invalid gateway. Use: manual, sslcommerz, bkash' }, 400);
    }

    // If activating a gateway, deactivate others
    if (data.is_active === 1) {
      await c.env.DB.prepare("UPDATE payment_config SET is_active = 0").run();
    }

    const updates: string[] = [];
    const params: any[] = [];

    if (data.is_active !== undefined) {
      updates.push('is_active = ?');
      params.push(data.is_active);
    }
    if (data.config !== undefined) {
      updates.push('config = ?');
      params.push(JSON.stringify(data.config));
    }
    if (data.sandbox_mode !== undefined) {
      updates.push('sandbox_mode = ?');
      params.push(data.sandbox_mode);
    }
    if (data.instructions !== undefined) {
      updates.push('instructions = ?');
      params.push(data.instructions);
    }
    if (data.instructions_bn !== undefined) {
      updates.push('instructions_bn = ?');
      params.push(data.instructions_bn);
    }

    if (updates.length > 0) {
      updates.push("updated_at = datetime('now')");
      params.push(gateway);

      await c.env.DB.prepare(
        `UPDATE payment_config SET ${updates.join(', ')} WHERE gateway = ?`
      ).bind(...params).run();
    }

    await logAudit(c.env, user.id, 'UPDATE_PAYMENT_CONFIG', 'payment_config', undefined, { gateway, ...data });

    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// GET /config/:gateway/setup-guide — Get setup guide for gateway
paymentRoutes.get('/config/:gateway/setup-guide', async (c) => {
  const gateway = c.req.param('gateway');

  const guides: Record<string, any> = {
    manual: {
      title: 'Manual Payment Setup Guide',
      titleBn: 'ম্যানুয়াল পেমেন্ট সেটআপ গাইড',
      steps: [
        'Set your bKash/Nagad number in the Instructions field',
        'Students will see these instructions when paying',
        'Students submit Transaction ID after payment',
        'Admin verifies payment manually from the Payments section',
        'Once verified, course access is automatically granted',
      ],
      fields: [
        { key: 'instructions', label: 'Payment Instructions (English)', type: 'textarea' },
        { key: 'instructions_bn', label: 'Payment Instructions (Bengali)', type: 'textarea' },
      ],
    },
    sslcommerz: {
      title: 'SSLCommerz Setup Guide',
      titleBn: 'SSLCommerz সেটআপ গাইড',
      steps: [
        'Register at https://developer.sslcommerz.com',
        'Get your Store ID and Store Password',
        'Enter credentials below and save',
        'Switch to Live mode when ready (set sandbox_mode = 0)',
        'Set callback URLs in SSLCommerz dashboard: https://dakkho-admin-api.dakkho-admin.workers.dev/api/payments/sslcommerz/callback',
      ],
      fields: [
        { key: 'store_id', label: 'Store ID', type: 'text' },
        { key: 'store_password', label: 'Store Password', type: 'password' },
        { key: 'sandbox_mode', label: 'Sandbox Mode', type: 'toggle' },
      ],
    },
    bkash: {
      title: 'bKash Payment Setup Guide',
      titleBn: 'bKash পেমেন্ট সেটআপ গাইড',
      steps: [
        'Register at https://merchant.bkash.com',
        'Get Username, Password, App Key, App Secret',
        'Enter credentials below and save',
        'Switch to Live mode when ready',
        'Set callback URL in bKash dashboard: https://dakkho-admin-api.dakkho-admin.workers.dev/api/payments/bkash/callback',
      ],
      fields: [
        { key: 'username', label: 'Username', type: 'text' },
        { key: 'password', label: 'Password', type: 'password' },
        { key: 'app_key', label: 'App Key', type: 'text' },
        { key: 'app_secret', label: 'App Secret', type: 'password' },
        { key: 'sandbox_mode', label: 'Sandbox Mode', type: 'toggle' },
      ],
    },
  };

  const guide = guides[gateway];
  if (!guide) {
    return c.json({ error: 'Invalid gateway' }, 400);
  }

  return c.json(guide);
});

export default paymentRoutes;
