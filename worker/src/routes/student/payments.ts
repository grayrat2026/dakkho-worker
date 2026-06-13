/**
 * Student Payment Routes
 * Payment submit, create (PipraPay), verify, webhook
 */

import { Hono } from 'hono';
import type { Env } from '../../env';
import {
  getStudentAuth,
  getStudentUserDoc,
  autoActivatePackage,
  getErrorMessage,
  rateLimit,
  type StudentAuthVariables,
} from './helpers';

const routes = new Hono<{ Bindings: Env; Variables: StudentAuthVariables }>();

// POST /payments/submit — Submit manual payment
routes.post('/payments/submit', async (c) => {
  try {
    const auth = await getStudentAuth(c);
    if (!auth.authorized) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    if (!auth.emailVerified) {
      return c.json({ error: 'Email verification required', code: 'EMAIL_NOT_VERIFIED' }, 403);
    }

    const { package_id, trx_id, phone, proof_url, duoMemberEmail } = await c.req.json();
    if (!package_id || !trx_id) {
      return c.json({ error: 'package_id and trx_id required' }, 400);
    }

    const pkg = await c.env.DB.prepare(
      'SELECT * FROM course_packages WHERE id = ? AND is_active = 1'
    ).bind(package_id).first();

    if (!pkg) {
      return c.json({ error: 'Package not found' }, 404);
    }

    const p = pkg as any;

    const submitMetadata = JSON.stringify({ duoMemberEmail: duoMemberEmail || null });

    await c.env.DB.prepare(`
      INSERT INTO payments (user_id, package_id, course_id, amount, currency, gateway, trx_id_submitted, phone_submitted, proof_url, status, metadata)
      VALUES (?, ?, ?, ?, 'BDT', 'manual', ?, ?, ?, 'pending', ?)
    `).bind(auth.userId, package_id, p.course_id, p.price, trx_id, phone || null, proof_url || null, submitMetadata).run();

    return c.json({ success: true, message: 'Payment submitted for verification' });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// POST /payments/create — Create PipraPay payment session
routes.post('/payments/create', async (c) => {
  try {
    // Rate limit: 5 payment submissions per hour
    const limited = await rateLimit(c, 'payment');
    if (limited) return limited;

    const auth = await getStudentAuth(c);
    if (!auth.authorized) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    if (!auth.emailVerified) {
      return c.json({ error: 'Email verification required', code: 'EMAIL_NOT_VERIFIED' }, 403);
    }

    const { packageId, couponCode, duoMemberEmail } = await c.req.json();
    if (!packageId) {
      return c.json({ error: 'packageId is required' }, 400);
    }

    // Check if PipraPay is active
    const pipraPayConfig = await c.env.DB.prepare(
      "SELECT * FROM payment_config WHERE gateway = 'piprapay' AND is_active = 1"
    ).first();

    if (!pipraPayConfig) {
      return c.json({ error: 'PipraPay payment is not available right now. Please use manual payment.' }, 400);
    }

    // Get package details
    const pkg = await c.env.DB.prepare(
      'SELECT * FROM course_packages WHERE id = ? AND is_active = 1'
    ).bind(packageId).first();

    if (!pkg) {
      return c.json({ error: 'Package not found' }, 404);
    }

    const p = pkg as any;
    let finalAmount = p.price;

    // Validate coupon if provided
    if (couponCode) {
      const coupon = await c.env.DB.prepare(
        'SELECT * FROM coupons WHERE code = ? AND is_active = 1'
      ).bind(couponCode).first();

      if (coupon) {
        const cp = coupon as any;
        const now = new Date().toISOString();
        if (cp.valid_from <= now && cp.valid_until >= now) {
          if (!cp.usage_limit || cp.usage_count < cp.usage_limit) {
            if (cp.discount_type === 'percentage') {
              const discount = finalAmount * (cp.discount_value / 100);
              finalAmount = Math.max(0, finalAmount - (cp.max_discount ? Math.min(discount, cp.max_discount) : discount));
            } else if (cp.discount_type === 'flat') {
              finalAmount = Math.max(0, finalAmount - cp.discount_value);
            }
            // Round to nearest whole number (569.06 → 569, 678.697 → 679)
            finalAmount = Math.round(finalAmount);
            // Increment coupon usage
            await c.env.DB.prepare(
              'UPDATE coupons SET usage_count = usage_count + 1 WHERE code = ?'
            ).bind(couponCode).run();
          }
        }
      }
    }

    // Get user details for PipraPay
    const userDoc = await getStudentUserDoc(c.env, auth.userId!);
    const u = userDoc as any;
    const fullName = u?.full_name || auth.name || 'Student';
    const email = u?.email || auth.email || '';
    const phone = u?.phone || '';

    // Insert pending payment in D1
    await c.env.DB.prepare(`
      INSERT INTO payments (user_id, package_id, course_id, amount, currency, gateway, status, metadata)
      VALUES (?, ?, ?, ?, 'BDT', 'piprapay', 'pending', ?)
    `).bind(
      auth.userId,
      packageId,
      p.course_id,
      finalAmount,
      JSON.stringify({ couponCode: couponCode || null, originalPrice: p.price, discountedPrice: finalAmount, duoMemberEmail: duoMemberEmail || null })
    ).run();

    // Get the inserted payment ID
    const paymentRow = await c.env.DB.prepare(
      'SELECT id FROM payments WHERE user_id = ? AND gateway = ? AND status = ? ORDER BY created_at DESC LIMIT 1'
    ).bind(auth.userId, 'piprapay', 'pending').first();

    const paymentId = (paymentRow as any)?.id;

    // Call PipraPay API
    const { createPipraPayPayment } = await import('../../lib/payment');
    const returnUrl = `https://dakkho-student.pages.dev/payment-result?pp_id={pp_id}&payment_id=${paymentId}`;
    const webhookUrl = `https://dakkho-admin-api.dakkho-admin.workers.dev/api/payments/piprapay/webhook`;

    const result = await createPipraPayPayment(c.env, {
      full_name: fullName,
      email_address: email,
      mobile_number: phone || '0000000000',
      amount: finalAmount,
      currency: 'BDT',
      return_url: returnUrl,
      webhook_url: webhookUrl,
      metadata: {
        user_id: auth.userId,
        package_id: packageId,
        course_id: p.course_id,
        payment_id: paymentId,
        duo_member_email: duoMemberEmail || null,
      },
    });

    if ('error' in result) {
      // Update payment as failed
      await c.env.DB.prepare(
        "UPDATE payments SET status = 'failed', metadata = ? WHERE id = ?"
      ).bind(JSON.stringify({ error: result.error }), paymentId).run();

      return c.json({ error: result.error }, 400);
    }

    // Store pp_id in payment row
    await c.env.DB.prepare(
      'UPDATE payments SET gateway_payment_id = ?, gateway_trx_id = ? WHERE id = ?'
    ).bind(result.pp_id, result.pp_id, paymentId).run();

    return c.json({
      success: true,
      pp_id: result.pp_id,
      pp_url: result.pp_url,
      payment_id: paymentId,
    });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// POST /payments/verify — Verify PipraPay payment status
routes.post('/payments/verify', async (c) => {
  try {
    const auth = await getStudentAuth(c);
    if (!auth.authorized) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { pp_id } = await c.req.json();
    if (!pp_id) {
      return c.json({ error: 'pp_id is required' }, 400);
    }

    // Find the payment in D1
    const payment = await c.env.DB.prepare(
      'SELECT * FROM payments WHERE gateway_payment_id = ? OR gateway_trx_id = ? ORDER BY created_at DESC LIMIT 1'
    ).bind(pp_id, pp_id).first();

    if (!payment) {
      return c.json({ error: 'Payment not found' }, 404);
    }

    const p = payment as any;

    // If already verified, return status directly
    if (p.status === 'verified') {
      return c.json({
        status: 'completed',
        amount: p.amount,
        gateway: p.gateway,
        transaction_id: p.gateway_trx_id,
        enrolled_course_id: p.course_id,
      });
    }

    // Verify with PipraPay API
    const { verifyPipraPayPayment } = await import('../../lib/payment');
    const result = await verifyPipraPayPayment(c.env, pp_id);

    if ('error' in result) {
      return c.json({
        status: 'error',
        amount: p.amount,
        gateway: p.gateway,
        transaction_id: p.gateway_trx_id,
        message: result.error,
      });
    }

    // Map PipraPay status to our system
    const mappedStatus = result.status?.toLowerCase();
    if (mappedStatus === 'completed' && p.status !== 'verified') {
      // Auto-verify and activate package
      await c.env.DB.prepare(`
        UPDATE payments SET status = 'verified', gateway_trx_id = ?, verified_at = datetime('now'), updated_at = datetime('now') WHERE id = ?
      `).bind(pp_id, p.id).run();

      // Auto-activate package
      if (p.package_id && p.course_id) {
        await autoActivatePackage(c.env, p.user_id, p.package_id, p.course_id);
      }

      return c.json({
        status: 'completed',
        amount: p.amount,
        gateway: p.gateway,
        transaction_id: pp_id,
        enrolled_course_id: p.course_id,
      });
    } else if (mappedStatus === 'failed') {
      await c.env.DB.prepare(
        "UPDATE payments SET status = 'failed', updated_at = datetime('now') WHERE id = ?"
      ).bind(p.id).run();

      return c.json({
        status: 'failed',
        amount: p.amount,
        gateway: p.gateway,
        transaction_id: pp_id,
        message: 'Payment was not completed successfully.',
      });
    } else {
      // Still pending or other status
      return c.json({
        status: 'pending',
        amount: p.amount,
        gateway: p.gateway,
        transaction_id: pp_id,
        message: 'Payment is still being processed.',
      });
    }
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// POST /payments/piprapay/webhook — PipraPay webhook callback (NO auth)
routes.post('/payments/piprapay/webhook', async (c) => {
  try {
    // Get raw body for signature verification
    const rawBody = await c.req.text();
    const signatureHeader = c.req.header('hh_signature');

    // Verify webhook signature
    const { verifyPipraPayWebhookSignature } = await import('../../lib/payment');
    const sigResult = await verifyPipraPayWebhookSignature(c.env, rawBody, signatureHeader);
    if (!sigResult.valid) {
      console.warn('PipraPay webhook signature invalid:', sigResult.reason);
      return c.json({ error: 'Invalid signature' }, 403);
    }
    if (sigResult.reason) {
      console.warn('PipraPay webhook signature warning:', sigResult.reason);
    }

    const body = JSON.parse(rawBody);
    const { pp_id, status, amount, currency, payment_method, metadata } = body;

    if (!pp_id || !status) {
      return c.json({ error: 'Invalid webhook payload' }, 400);
    }

    // Find payment by pp_id (could be in gateway_payment_id or gateway_trx_id)
    const payment = await c.env.DB.prepare(
      'SELECT * FROM payments WHERE gateway_payment_id = ? OR gateway_trx_id = ? ORDER BY created_at DESC LIMIT 1'
    ).bind(pp_id, pp_id).first();

    if (!payment) {
      // Payment not found — could be from a different system or not yet inserted
      // Try to find by metadata.payment_id
      if (metadata?.payment_id) {
        const altPayment = await c.env.DB.prepare(
          'SELECT * FROM payments WHERE id = ?'
        ).bind(metadata.payment_id).first();

        if (altPayment) {
          const ap = altPayment as any;
          // Idempotency check: already processed?
          if (ap.status === 'verified' || ap.status === 'refunded') {
            return c.json({ success: true, message: 'Already processed' });
          }

          const mappedStatus = status?.toLowerCase();
          if (mappedStatus === 'completed') {
            await c.env.DB.prepare(`
              UPDATE payments SET status = 'verified', gateway_payment_id = ?, gateway_trx_id = ?, verified_at = datetime('now'), updated_at = datetime('now')
              WHERE id = ?
            `).bind(pp_id, pp_id, ap.id).run();

            if (ap.package_id && ap.course_id) {
              await autoActivatePackage(c.env, ap.user_id, ap.package_id, ap.course_id);
            }
          } else if (mappedStatus === 'failed') {
            await c.env.DB.prepare(
              "UPDATE payments SET status = 'failed', updated_at = datetime('now') WHERE id = ?"
            ).bind(ap.id).run();
          } else if (mappedStatus === 'refunded') {
            await c.env.DB.prepare(`
              UPDATE payments SET status = 'refunded', updated_at = datetime('now') WHERE id = ?
            `).bind(ap.id).run();

            // Deactivate user package
            if (ap.package_id) {
              await c.env.DB.prepare(`
                UPDATE user_packages SET status = 'cancelled' WHERE user_id = ? AND package_id = ? AND status = 'active'
              `).bind(ap.user_id, ap.package_id).run();
            }
          }

          return c.json({ success: true });
        }
      }

      return c.json({ error: 'Payment not found' }, 404);
    }

    const p = payment as any;

    // Idempotency check: already processed?
    if (p.status === 'verified' || p.status === 'refunded') {
      return c.json({ success: true, message: 'Already processed' });
    }

    const mappedStatus = status?.toLowerCase();

    if (mappedStatus === 'completed') {
      await c.env.DB.prepare(`
        UPDATE payments SET status = 'verified', gateway_payment_id = ?, gateway_trx_id = ?, verified_at = datetime('now'), updated_at = datetime('now')
        WHERE id = ?
      `).bind(pp_id, pp_id, p.id).run();

      // Auto-activate package
      if (p.package_id && p.course_id) {
        await autoActivatePackage(c.env, p.user_id, p.package_id, p.course_id);
      }
    } else if (mappedStatus === 'failed') {
      await c.env.DB.prepare(
        "UPDATE payments SET status = 'failed', updated_at = datetime('now') WHERE id = ?"
      ).bind(p.id).run();
    } else if (mappedStatus === 'refunded') {
      await c.env.DB.prepare(
        "UPDATE payments SET status = 'refunded', updated_at = datetime('now') WHERE id = ?"
      ).bind(p.id).run();

      // Deactivate user package
      if (p.package_id) {
        await c.env.DB.prepare(`
          UPDATE user_packages SET status = 'cancelled' WHERE user_id = ? AND package_id = ? AND status = 'active'
        `).bind(p.user_id, p.package_id).run();
      }
    }

    return c.json({ success: true });
  } catch (error) {
    // Always return 200 to PipraPay so they don't retry unnecessarily
    console.error('PipraPay webhook error:', error);
    return c.json({ success: true, error: 'Internal error' });
  }
});

export default routes;
