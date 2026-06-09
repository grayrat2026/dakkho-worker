/**
 * DAKKHO Admin — Unified API Client
 *
 * Automatically routes requests to:
 *   1. Cloudflare Workers (when NEXT_PUBLIC_API_BASE_URL is set) — PREFERRED
 *   2. Local Next.js API routes (default, /api/admin/...)
 *
 * Usage:
 *   import { apiGet, apiPost, apiPut, apiDelete, apiUpload } from '@/lib/api-client';
 *
 *   // Replace inline fetch calls:
 *   - fetch('/api/admin/users?limit=20')           → apiGet('/users?limit=20')
 *   - fetch('/api/admin/users', { method:'PUT'… }) → apiPut('/users', body)
 *   - fetch(`/api/admin/users?id=x`, { method:'DELETE' }) → apiDelete('/users?id=x')
 *
 * All paths are relative to /api/admin — just pass the suffix.
 */

// ---------------------------------------------------------------------------
// Environment detection
// ---------------------------------------------------------------------------

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '';
const IS_REMOTE_API = API_BASE_URL.length > 0;

/**
 * Base path for static assets (images, etc.)
 * When deployed to GitHub Pages under /dakkho-admin, we need to prefix paths.
 * For Cloudflare Pages or local dev, no prefix is needed.
 */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '';

/**
 * Get the full URL for a static asset (e.g. logo image).
 * Works with both GitHub Pages (basePath) and Cloudflare Pages (no basePath).
 */
export function assetUrl(path: string): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  return `${BASE_PATH}${clean}`;
}

/**
 * Build the full URL for a given path.
 *
 * Local mode:      /api/admin/users?limit=20
 * Workers mode:    https://dakkho-admin-api.<account>.workers.dev/admin/users?limit=20
 */
function buildUrl(path: string): string {
  // Normalise: strip leading slash so we can safely join
  const clean = path.replace(/^\/+/, '');

  if (IS_REMOTE_API) {
    // Cloudflare Workers URL pattern:
    //   <BASE_URL>/admin/<path>
    // e.g. https://dakkho-admin-api.xxx.workers.dev/admin/users?limit=20
    const base = API_BASE_URL.replace(/\/+$/, '');
    return `${base}/admin/${clean}`;
  }

  // Local Next.js API routes
  return `/api/admin/${clean}`;
}

// ---------------------------------------------------------------------------
// Auth token helpers
// ---------------------------------------------------------------------------

const AUTH_TOKEN_KEY = 'dakkho_admin_token';

/** Retrieve a stored auth token (set after login). */
export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

/** Persist auth token after a successful login. */
export function setAuthToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

/** Clear the stored auth token (logout). */
export function clearAuthToken(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(AUTH_TOKEN_KEY);
}

// ---------------------------------------------------------------------------
// Error type
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  public status: number;
  public code: string;
  public details: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

// ---------------------------------------------------------------------------
// Snake_case → camelCase transformer (D1 ↔ Frontend compatibility)
// ---------------------------------------------------------------------------

/**
 * Convert a snake_case string to camelCase.
 * e.g. "full_name" → "fullName", "is_active" → "isActive"
 */
function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());
}

/**
 * Recursively transform an object's keys from snake_case to camelCase.
 * Handles nested objects and arrays. Skips transformation for
 * keys that are already camelCase or are special (like "id", "email").
 */
function transformResponse(data: unknown): unknown {
  if (Array.isArray(data)) {
    return data.map(transformResponse);
  }
  if (data && typeof data === 'object' && !(data instanceof Date)) {
    const obj = data as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(obj)) {
      const camelKey = snakeToCamel(key);
      result[camelKey] = transformResponse(obj[key]);
    }
    return result;
  }
  return data;
}

// ---------------------------------------------------------------------------
// Internal request helper
// ---------------------------------------------------------------------------

interface RequestOptions {
  method: string;
  headers?: Record<string, string>;
  body?: BodyInit | null;
  /** Override the default "fail on non-2xx" behaviour. */
  raw?: boolean;
}

async function request<T = unknown>(path: string, options: RequestOptions): Promise<T> {
  const url = buildUrl(path);

  const headers: Record<string, string> = {
    ...(options.headers || {}),
  };

  // Attach JSON content-type when a non-FormData body is provided
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  // For remote API (Cloudflare Workers), attach Bearer token
  if (IS_REMOTE_API) {
    const token = getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const res = await fetch(url, {
    method: options.method,
    headers,
    body: options.body ?? undefined,
  });

  // Return raw Response when caller explicitly wants it
  if (options.raw) {
    return res as unknown as T;
  }

  // Parse JSON — safely handle empty bodies
  let data: unknown;
  const text = await res.text();
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  // Transform snake_case → camelCase so frontend components can use
  // idiomatic camelCase property names. D1 returns snake_case columns
  // (e.g. is_active, created_at) which this transform converts
  // automatically (isActive, createdAt). Nested objects and arrays
  // are handled recursively.
  if (data && typeof data === 'object') {
    data = transformResponse(data);
  }

  // Throw on non-2xx
  if (!res.ok) {
    const errObj = data as Record<string, unknown>;
    throw new ApiError(
      res.status,
      String(errObj.code || res.status),
      String(errObj.error || errObj.message || res.statusText),
      errObj,
    );
  }

  return data as T;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Perform a GET request.
 *
 * @example
 *   const data = await apiGet('/users?limit=20');
 *   const config = await apiGet<ServerConfig>('/config');
 */
export async function apiGet<T = unknown>(path: string): Promise<T> {
  return request<T>(path, { method: 'GET' });
}

/**
 * Perform a POST request.
 *
 * @example
 *   await apiPost('/auth', { email, password });
 *   await apiPost('/notifications', { title, message, targetAll: true });
 */
export async function apiPost<T = unknown>(path: string, body: unknown): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/**
 * Perform a PUT request.
 *
 * @example
 *   await apiPut('/users', { userId: 'abc', isActive: true });
 *   await apiPut('/config', configObject);
 */
export async function apiPut<T = unknown>(path: string, body: unknown): Promise<T> {
  return request<T>(path, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

/**
 * Perform a DELETE request.
 *
 * @example
 *   await apiDelete('/users?id=abc123');
 *   await apiDelete('/categories?id=xyz');
 */
export async function apiDelete<T = unknown>(path: string): Promise<T> {
  return request<T>(path, { method: 'DELETE' });
}

/**
 * Upload files via multipart/form-data.
 *
 * @example
 *   const fd = new FormData();
 *   fd.append('file', fileInput.files[0]);
 *   fd.append('courseId', 'abc');
 *   const result = await apiUpload('/upload', fd);
 */
export async function apiUpload<T = unknown>(path: string, formData: FormData): Promise<T> {
  // Do NOT set Content-Type — the browser sets it with the correct boundary
  return request<T>(path, {
    method: 'POST',
    headers: {},          // intentionally no Content-Type
    body: formData,
  });
}

// ---------------------------------------------------------------------------
// Convenience: raw Response access (for streaming, progress, etc.)
// ---------------------------------------------------------------------------

/**
 * Get the raw fetch Response object for advanced use cases
 * (e.g. streaming, reading headers, manual error handling).
 *
 * @example
 *   const res = await apiRaw('/analytics');
 *   if (res.ok) { const data = await res.json(); }
 */
export async function apiRaw(path: string, init?: RequestInit): Promise<Response> {
  const url = buildUrl(path);

  const headers: Record<string, string> = {};

  if (IS_REMOTE_API) {
    const token = getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const initHeaders: Record<string, string> = {};
  if (init?.headers) {
    if (init.headers instanceof Headers) {
      init.headers.forEach((value, key) => { initHeaders[key] = value; });
    } else if (Array.isArray(init.headers)) {
      for (const [key, value] of init.headers) { initHeaders[key] = value; }
    } else {
      Object.assign(initHeaders, init.headers);
    }
  }

  return fetch(url, {
    ...init,
    headers: {
      ...headers,
      ...initHeaders,
    },
  });
}

// ---------------------------------------------------------------------------
// Path mapping reference
// ---------------------------------------------------------------------------

/**
 * Path mapping for Cloudflare Workers:
 *
 * Component call              →  apiClient path  →  Worker route
 * ────────────────────────────────────────────────────────────────────
 * POST /api/admin/auth        →  /auth           →  /admin/auth
 * GET  /api/admin/auth/check  →  /auth/check     →  /admin/auth/check
 * GET  /api/admin/system/status → /system/status →  /admin/system/status
 * GET  /api/admin/users       →  /users          →  /admin/users
 * GET  /api/admin/categories  →  /categories     →  /admin/categories
 * GET  /api/admin/instructors →  /instructors    →  /admin/instructors
 * GET  /api/admin/courses     →  /courses        →  /admin/courses
 * GET  /api/admin/videos      →  /videos         →  /admin/videos
 * GET  /api/admin/institutes  →  /institutes     →  /admin/institutes
 * GET  /api/admin/config      →  /config         →  /admin/config
 * GET  /api/admin/notifications → /notifications →  /admin/notifications
 * GET  /api/admin/analytics   →  /analytics      →  /admin/analytics
 * POST /api/admin/upload      →  /upload         →  /admin/upload
 * POST /api/admin/email/test  →  /email/test     →  /admin/email/test
 */
