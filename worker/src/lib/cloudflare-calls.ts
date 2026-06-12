/**
 * Cloudflare Calls Integration — Emergency Fallback for LiveKit
 *
 * When LiveKit limits are reached (concurrent participants, rooms, etc.),
 * this module provides a fallback using Cloudflare Calls SFU (WebRTC).
 *
 * Cloudflare Calls API: https://rtc.live.cloudflare.com/v1
 * - Create sessions for group calls
 * - Generate client tokens for WebRTC connections
 * - No external SDK needed — uses standard WebRTC on client side
 *
 * Credentials stored in Workers KV:
 *   KV_CONFIG:CF_CALLS_APP_ID
 *   KV_CONFIG:CF_ACCOUNT_ID
 *   (CF_API_TOKEN is already available as env variable)
 */

import type { Env } from '../env';

// ─── KV Key Constants ───
const KV_CF_CALLS_APP_ID = 'CF_CALLS_APP_ID';
const KV_CF_ACCOUNT_ID = 'CF_ACCOUNT_ID';

// ─── Types ───

export interface CallsConfig {
  appId: string;
  accountId: string;
  apiToken: string;
}

export interface CallsSession {
  sessionId: string;
  url: string;
}

export interface CallsClientConfig {
  sessionId: string;
  url: string;
  iceServers: RTCIceServer[];
}

// ─── Credential Fetching ───

export async function getCallsConfig(kv: KVNamespace, env: Env): Promise<CallsConfig | null> {
  const [appId, accountId] = await Promise.all([
    kv.get(KV_CF_CALLS_APP_ID),
    kv.get(KV_CF_ACCOUNT_ID),
  ]);

  // CF API token from env (CloudflareApiToken binding or env variable)
  const apiToken = (env as any).CF_API_TOKEN || (env as any).CLOUDFLARE_API_TOKEN || '';
  if (!appId || !accountId || !apiToken) return null;

  return { appId, accountId, apiToken };
}

// ─── Session Management ───

/**
 * Create a Cloudflare Calls SFU session.
 * Returns session ID and connection URL for clients.
 */
export async function createCallsSession(config: CallsConfig): Promise<CallsSession | null> {
  try {
    const response = await fetch(
      `https://rtc.live.cloudflare.com/v1/apps/${config.appId}/sessions`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionDescription: `dakkho-fallback-${Date.now()}`,
          // 1 hour TTL
          ttl: 3600,
        }),
      }
    );

    if (!response.ok) {
      console.error('Calls session creation failed:', response.status, await response.text());
      return null;
    }

    const data = await response.json() as any;
    return {
      sessionId: data.sessionId,
      url: `wss://rtc.live.cloudflare.com/v1/apps/${config.appId}/sessions/${data.sessionId}`,
    };
  } catch (error) {
    console.error('Calls session error:', error);
    return null;
  }
}

/**
 * Generate ICE servers configuration for Cloudflare Calls.
 * Uses Cloudflare's TURN servers as fallback.
 */
export function getCallsIceServers(config: CallsConfig): RTCIceServer[] {
  return [
    {
      urls: 'stun:stun.cloudflare.com:3478',
    },
    {
      urls: 'turn:turn.cloudflare.com:3478',
      username: config.appId,
      credential: config.apiToken,
    },
    {
      urls: 'turns:turn.cloudflare.com:5349',
      username: config.appId,
      credential: config.apiToken,
    },
  ];
}

/**
 * Get a complete client configuration for Cloudflare Calls fallback.
 * Creates a session and returns all info the client needs to connect.
 */
export async function getCallsClientConfig(
  config: CallsConfig,
  roomName: string
): Promise<CallsClientConfig | null> {
  const session = await createCallsSession(config);
  if (!session) return null;

  return {
    sessionId: session.sessionId,
    url: session.url,
    iceServers: getCallsIceServers(config),
  };
}

/**
 * Check if Cloudflare Calls is configured and available.
 */
export async function isCallsAvailable(kv: KVNamespace, env: Env): Promise<boolean> {
  const config = await getCallsConfig(kv, env);
  return config !== null;
}

/**
 * Track a Calls session in KV for cleanup.
 */
export async function trackCallsSession(
  kv: KVNamespace,
  sessionId: string,
  roomName: string,
  createdBy: string
): Promise<void> {
  await kv.put(
    `CALLS_SESSION:${sessionId}`,
    JSON.stringify({
      sessionId,
      roomName,
      createdBy,
      createdAt: new Date().toISOString(),
    }),
    { expirationTtl: 7200 } // 2 hours
  );
}

/**
 * List active Calls sessions from KV.
 */
export async function listCallsSessions(kv: KVNamespace): Promise<any[]> {
  const list = await kv.list({ prefix: 'CALLS_SESSION:' });
  const sessions: any[] = [];

  for (const key of list.keys) {
    const data = await kv.get(key.name);
    if (data) {
      sessions.push(JSON.parse(data));
    }
  }

  return sessions;
}
