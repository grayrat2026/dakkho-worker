/**
 * DAKKHO — Server-Side Appwrite Client
 *
 * This module creates an Appwrite client configured with an API key
 * for server-side operations. It MUST only be used in API routes or
 * server-side code — never on the client.
 *
 * The server client bypasses the browser-only restriction of the
 * client-side appwrite.ts module and uses the project's API key
 * to authenticate with Appwrite's Admin API.
 *
 * Required environment variables:
 *   APPWRITE_ENDPOINT
 *   APPWRITE_PROJECT_ID
 *   APPWRITE_API_KEY
 */

import { Client, Account, Databases } from 'appwrite';

// ─── Environment ──────────────────────────────────────────────────────

const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT ?? 'https://sgp.cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID ?? 'dakkho';
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY ?? '';

if (!APPWRITE_API_KEY) {
  console.warn(
    '[DAKKHO Appwrite Server] APPWRITE_API_KEY is not set. ' +
      'Server-side Appwrite operations will fail.',
  );
}

// ─── Server Client Singleton ──────────────────────────────────────────

let _serverClient: Client | null = null;

/**
 * Get or create the server-side Appwrite Client singleton.
 * Configured with the API key for admin-level operations.
 */
export function getServerClient(): Client {
  if (!_serverClient) {
    _serverClient = new Client()
      .setEndpoint(APPWRITE_ENDPOINT)
      .setProject(APPWRITE_PROJECT_ID)
      .setKey(APPWRITE_API_KEY);
  }

  return _serverClient;
}

/**
 * Get the server-side Account service for admin user management.
 * Note: With API key auth, Account operations are limited.
 * For admin user management, use getServerUsers().
 */
export function getServerAccount(): Account {
  return new Account(getServerClient());
}

/**
 * Get the server-side Users service for admin user management.
 * This is the primary service for server-side user operations
 * like creating users, updating email verification, etc.
 * Note: In Appwrite SDK v14+, the Users class was removed.
 * We use Account with API key auth for server-side operations instead.
 */
export function getServerUsers(): Account {
  return new Account(getServerClient());
}

/**
 * Get the server-side Databases service.
 */
export function getServerDatabases(): Databases {
  return new Databases(getServerClient());
}
