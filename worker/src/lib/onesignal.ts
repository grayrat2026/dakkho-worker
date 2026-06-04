/**
 * OneSignal Push Notification integration for DAKKHO
 * Handles push notification sending and token management
 */

import type { Env } from '../env';
import { generateId } from './utils';

interface PushNotificationPayload {
  title: string;
  titleBn?: string;
  message: string;
  messageBn?: string;
  url?: string;
  data?: Record<string, unknown>;
  targetPlayerIds?: string[];
  targetSegment?: string;
}

interface PushNotificationResult {
  success: boolean;
  recipients: number;
  errors: string[];
}

/**
 * Send a push notification via OneSignal
 */
export async function sendPushNotification(
  env: Env,
  payload: PushNotificationPayload
): Promise<PushNotificationResult> {
  try {
    const appId = env.ONE_SIGNAL_APP_ID;
    const restApiKey = env.ONE_SIGNAL_REST_API_KEY;

    if (!appId || !restApiKey) {
      console.warn('OneSignal not configured — skipping push notification');
      return { success: false, recipients: 0, errors: ['OneSignal not configured'] };
    }

    const body: Record<string, unknown> = {
      app_id: appId,
      headings: { en: payload.title, bn: payload.titleBn || payload.title },
      contents: { en: payload.message, bn: payload.messageBn || payload.message },
      data: payload.data || {},
    };

    if (payload.url) {
      body.url = payload.url;
    }

    if (payload.targetPlayerIds && payload.targetPlayerIds.length > 0) {
      body.include_player_ids = payload.targetPlayerIds;
    } else if (payload.targetSegment) {
      body.included_segments = [payload.targetSegment];
    } else {
      body.included_segments = ['All'];
    }

    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${restApiKey}`,
      },
      body: JSON.stringify(body),
    });

    const result = await response.json() as any;

    if (response.ok) {
      return {
        success: true,
        recipients: result.recipients || 0,
        errors: result.errors || [],
      };
    } else {
      return {
        success: false,
        recipients: 0,
        errors: [result.errors?.[0] || 'Unknown OneSignal error'],
      };
    }
  } catch (error) {
    console.error('OneSignal push error:', error);
    return {
      success: false,
      recipients: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    };
  }
}

/**
 * Get push tokens for a specific user
 */
export async function getUserPushTokens(
  env: Env,
  userId: string
): Promise<string[]> {
  try {
    const result = await env.DB.prepare(
      'SELECT push_token FROM user_push_tokens WHERE user_id = ? AND is_active = 1'
    ).bind(userId).all();

    return result.results.map((row: any) => row.push_token);
  } catch (error) {
    console.error('Failed to get user push tokens:', error);
    return [];
  }
}

/**
 * Get push tokens for multiple users (batch)
 */
export async function getBatchUserPushTokens(
  env: Env,
  userIds: string[]
): Promise<string[]> {
  if (userIds.length === 0) return [];

  try {
    const placeholders = userIds.map(() => '?').join(',');
    const result = await env.DB.prepare(
      `SELECT DISTINCT push_token FROM user_push_tokens WHERE user_id IN (${placeholders}) AND is_active = 1`
    ).bind(...userIds).all();

    return result.results.map((row: any) => row.push_token);
  } catch (error) {
    console.error('Failed to get batch user push tokens:', error);
    return [];
  }
}

/**
 * Register a push token for a user
 */
export async function registerPushToken(
  env: Env,
  userId: string,
  pushToken: string,
  deviceType?: string,
  deviceInfo?: string
): Promise<void> {
  try {
    // Upsert: deactivate existing tokens for this user+token combo, then insert
    await env.DB.prepare(
      'UPDATE user_push_tokens SET is_active = 1, updated_at = datetime(\'now\') WHERE user_id = ? AND push_token = ?'
    ).bind(userId, pushToken).run();

    // Try insert (will be ignored if already exists due to update above being sufficient)
    await env.DB.prepare(`
      INSERT INTO user_push_tokens (id, user_id, push_token, device_type, device_info, is_active, created_at)
      SELECT ?, ?, ?, ?, ?, 1, datetime('now')
      WHERE NOT EXISTS (SELECT 1 FROM user_push_tokens WHERE user_id = ? AND push_token = ?)
    `).bind(generateId(), userId, pushToken, deviceType || null, deviceInfo || null, userId, pushToken).run();
  } catch (error) {
    console.error('Failed to register push token:', error);
    throw error;
  }
}

/**
 * Unregister a push token (deactivate it)
 */
export async function unregisterPushToken(
  env: Env,
  pushToken: string
): Promise<void> {
  try {
    await env.DB.prepare(
      "UPDATE user_push_tokens SET is_active = 0, updated_at = datetime('now') WHERE push_token = ?"
    ).bind(pushToken).run();
  } catch (error) {
    console.error('Failed to unregister push token:', error);
    throw error;
  }
}
