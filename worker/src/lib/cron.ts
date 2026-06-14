// /worker/src/lib/cron.ts
/**
 * Scheduled (cron) task implementations for DAKKHO Worker.
 *
 * Each function is idempotent and safe to run concurrently.
 * Called hourly by the Cloudflare Workers Cron Triggers.
 */

interface CronTaskResult {
  task: string;
  deleted?: number;
  updated?: number;
  error?: string;
}

// ─── 1. Clean expired sessions ───

async function cleanExpiredSessions(db: D1Database): Promise<CronTaskResult> {
  try {
    // Clean student sessions
    const studentResult = await db.prepare(
      "DELETE FROM student_sessions WHERE expires_at < datetime('now')"
    ).run();

    // Clean admin sessions
    const adminResult = await db.prepare(
      "DELETE FROM admin_sessions WHERE expires_at < datetime('now')"
    ).run();

    const totalDeleted = (studentResult.meta.changes || 0) + (adminResult.meta.changes || 0);

    return {
      task: 'clean_expired_sessions',
      deleted: totalDeleted,
    };
  } catch (error: any) {
    return {
      task: 'clean_expired_sessions',
      error: error.message || 'Unknown error',
    };
  }
}

// ─── 2. Clean expired OTPs ───

async function cleanExpiredOTPs(db: D1Database): Promise<CronTaskResult> {
  try {
    const result = await db.prepare(
      "DELETE FROM otp_codes WHERE expires_at < datetime('now', '-1 hour')"
    ).run();

    return {
      task: 'clean_expired_otps',
      deleted: result.meta.changes || 0,
    };
  } catch (error: any) {
    return {
      task: 'clean_expired_otps',
      error: error.message || 'Unknown error',
    };
  }
}

// ─── 3. Reset stale streaks ───
// Users with no activity for 24+ hours should have their current_streak reset to 0.

async function resetStaleStreaks(db: D1Database): Promise<CronTaskResult> {
  try {
    // Find users whose last_activity_date is older than yesterday (i.e., missed at least 1 full day)
    // and whose current_streak is > 0 (not already reset)
    const result = await db.prepare(`
      UPDATE user_streaks
      SET current_streak = 0, updated_at = datetime('now')
      WHERE current_streak > 0
        AND last_activity_date IS NOT NULL
        AND last_activity_date != date('now', '+6 hours')
        AND last_activity_date != date('now', '+6 hours', '-1 day')
    `).run();

    return {
      task: 'reset_stale_streaks',
      updated: result.meta.changes || 0,
    };
  } catch (error: any) {
    return {
      task: 'reset_stale_streaks',
      error: error.message || 'Unknown error',
    };
  }
}

// ─── 4. Deactivate expired packages ───

async function deactivateExpiredPackages(db: D1Database): Promise<CronTaskResult> {
  try {
    const result = await db.prepare(`
      UPDATE user_packages
      SET status = 'expired', updated_at = datetime('now')
      WHERE status = 'active'
        AND expires_at IS NOT NULL
        AND expires_at < datetime('now')
    `).run();

    return {
      task: 'deactivate_expired_packages',
      updated: result.meta.changes || 0,
    };
  } catch (error: any) {
    return {
      task: 'deactivate_expired_packages',
      error: error.message || 'Unknown error',
    };
  }
}

// ─── 5. Clean old notification logs ───
// Delete notification_logs older than 90 days.

async function cleanOldNotificationLogs(db: D1Database): Promise<CronTaskResult> {
  try {
    const result = await db.prepare(
      "DELETE FROM notification_logs WHERE created_at < datetime('now', '-90 days')"
    ).run();

    return {
      task: 'clean_old_notification_logs',
      deleted: result.meta.changes || 0,
    };
  } catch (error: any) {
    return {
      task: 'clean_old_notification_logs',
      error: error.message || 'Unknown error',
    };
  }
}

// ─── 6. Clean expired 2FA pending tokens ───

async function cleanExpired2FATokens(db: D1Database): Promise<CronTaskResult> {
  try {
    const result = await db.prepare(
      "DELETE FROM pending_2fa_tokens WHERE expires_at < datetime('now')"
    ).run();

    return {
      task: 'clean_expired_2fa_tokens',
      deleted: result.meta.changes || 0,
    };
  } catch (error: any) {
    return {
      task: 'clean_expired_2fa_tokens',
      error: error.message || 'Unknown error',
    };
  }
}

// ─── Main runner: execute all cron tasks ───

export async function runCronTasks(db: D1Database): Promise<CronTaskResult[]> {
  const results = await Promise.allSettled([
    cleanExpiredSessions(db),
    cleanExpiredOTPs(db),
    resetStaleStreaks(db),
    deactivateExpiredPackages(db),
    cleanOldNotificationLogs(db),
    cleanExpired2FATokens(db),
  ]);

  return results.map((r, i) => {
    if (r.status === 'fulfilled') {
      return r.value;
    }
    return {
      task: `task_${i}`,
      error: r.reason?.message || 'Unknown error',
    };
  });
}
