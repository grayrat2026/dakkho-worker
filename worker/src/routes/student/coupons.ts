/**
 * Student Coupon Routes
 * Coupon validation endpoint
 */

import { Hono } from 'hono';
import type { Env } from '../../env';
import {
  getErrorMessage,
  rateLimit,
  type StudentAuthVariables,
} from './helpers';

const routes = new Hono<{ Bindings: Env; Variables: StudentAuthVariables }>();

// GET /coupons/validate — Validate a coupon code
routes.get('/coupons/validate', async (c) => {
  try {
    // Rate limit: 10 coupon validations per 15 min
    const limited = await rateLimit(c, 'coupon');
    if (limited) return limited;

    const code = c.req.query('code');
    if (!code) {
      return c.json({ error: 'Coupon code required' }, 400);
    }

    const coupon = await c.env.DB.prepare(
      'SELECT * FROM coupons WHERE code = ? AND is_active = 1'
    ).bind(code).first();

    if (!coupon) {
      return c.json({ valid: false, error: 'Invalid coupon code' }, 404);
    }

    const cp = coupon as any;
    const now = new Date().toISOString();

    if (cp.valid_from > now || cp.valid_until < now) {
      return c.json({ valid: false, error: 'Coupon has expired or is not yet active' });
    }

    if (cp.usage_limit && cp.usage_count >= cp.usage_limit) {
      return c.json({ valid: false, error: 'Coupon usage limit reached' });
    }

    return c.json({
      valid: true,
      coupon: {
        code: cp.code,
        discount_type: cp.discount_type,
        discount_value: cp.discount_value,
        max_discount: cp.max_discount,
        min_purchase: cp.min_purchase,
      },
    });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

export default routes;
