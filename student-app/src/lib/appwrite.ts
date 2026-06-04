/**
 * DAKKHO Student Streaming Web App — Appwrite Service Integration Module
 *
 * Centralizes all Appwrite SDK interactions for authentication, database,
 * and storage. Designed for **client-side only** usage; every call guards
 * against server-side execution so the module can safely be imported in
 * Next.js client components without SSR issues.
 *
 * Appwrite SDK version: 25.x (object-parameter style API)
 */

import {
  Client,
  Account,
  Databases,
  Storage,
  ID,
  Query,
  AppwriteException,
} from 'appwrite';
import type { Models, UploadProgress } from 'appwrite';

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------

const APPWRITE_ENDPOINT =
  process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT ??
  'https://sgp.cloud.appwrite.io/v1';

const APPWRITE_PROJECT_ID =
  process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID ?? 'dakkho';

const APPWRITE_DATABASE_ID =
  process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ?? 'dakkho_db';

// ---------------------------------------------------------------------------
// Collection IDs
// ---------------------------------------------------------------------------

export const COLLECTION_IDS = {
  USERS: 'users',
  COURSES: 'courses',
  VIDEOS: 'videos',
  INSTRUCTORS: 'instructors',
  INSTITUTES: 'institutes',
  PROGRESS: 'watch_progress',
  BOOKMARKS: 'bookmarks',
  NOTIFICATIONS: 'notifications',
} as const;

export type CollectionId = (typeof COLLECTION_IDS)[keyof typeof COLLECTION_IDS];

// ---------------------------------------------------------------------------
// Bucket IDs (commonly used storage buckets)
// ---------------------------------------------------------------------------

export const BUCKET_IDS = {
  AVATARS: 'avatars',
  THUMBNAILS: 'thumbnails',
  VIDEOS: 'videos',
  MATERIALS: 'materials',
} as const;

export type BucketId = (typeof BUCKET_IDS)[keyof typeof BUCKET_IDS];

// ---------------------------------------------------------------------------
// Typed result wrapper — avoids throwing in UI code
// ---------------------------------------------------------------------------

export type Result<T> =
  | { success: true; data: T }
  | { success: false; error: AppwriteError };

export class AppwriteError extends Error {
  code: number;
  type: string;

  constructor(message: string, code = 0, type = '') {
    super(message);
    this.name = 'AppwriteError';
    this.code = code;
    this.type = type;
  }
}

/** Convert a raw AppwriteException into our own AppwriteError. */
function toAppwriteError(e: unknown): AppwriteError {
  if (e instanceof AppwriteException) {
    return new AppwriteError(e.message, e.code, e.type);
  }
  if (e instanceof Error) {
    return new AppwriteError(e.message);
  }
  return new AppwriteError('An unknown error occurred');
}

// ---------------------------------------------------------------------------
// Client singleton (lazy, client-only)
// ---------------------------------------------------------------------------

let _client: Client | null = null;
let _account: Account | null = null;
let _databases: Databases | null = null;
let _storage: Storage | null = null;

function isBrowser(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.document !== 'undefined'
  );
}

/** Get or create the Appwrite Client singleton. */
export function getClient(): Client {
  if (!isBrowser()) {
    throw new AppwriteError(
      'Appwrite client must only be used on the browser. ' +
        'Do not call this from server-side code.',
    );
  }

  if (!_client) {
    _client = new Client()
      .setEndpoint(APPWRITE_ENDPOINT)
      .setProject(APPWRITE_PROJECT_ID);
  }

  return _client;
}

/** Get or create the Account service singleton. */
export function getAccount(): Account {
  if (!_account) {
    _account = new Account(getClient());
  }
  return _account;
}

/** Get or create the Databases service singleton. */
export function getDatabases(): Databases {
  if (!_databases) {
    _databases = new Databases(getClient());
  }
  return _databases;
}

/** Get or create the Storage service singleton. */
export function getStorage(): Storage {
  if (!_storage) {
    _storage = new Storage(getClient());
  }
  return _storage;
}

// ---------------------------------------------------------------------------
// Re-export SDK utilities for consumer convenience
// ---------------------------------------------------------------------------

export { ID, Query, AppwriteException };
export type { Models, UploadProgress };

// ===========================================================================
// AUTH SERVICE
// ===========================================================================

export const AuthService = {
  /**
   * Create an email + password session (log the user in).
   */
  async login(
    email: string,
    password: string,
  ): Promise<Result<Models.Session>> {
    try {
      const session = await getAccount().createEmailPasswordSession({
        email,
        password,
      });
      return { success: true, data: session };
    } catch (e) {
      return { success: false, error: toAppwriteError(e) };
    }
  },

  /**
   * Register a new account. A random user ID is generated automatically.
   * Optionally pass a `name`.
   */
  async signup(
    email: string,
    password: string,
    name?: string,
  ): Promise<Result<Models.User<Models.Preferences>>> {
    try {
      const user = await getAccount().create({
        userId: ID.unique(),
        email,
        password,
        name,
      });
      return { success: true, data: user };
    } catch (e) {
      return { success: false, error: toAppwriteError(e) };
    }
  },

  /**
   * Delete the current session (log the user out).
   */
  async logout(): Promise<Result<void>> {
    try {
      await getAccount().deleteSession({ sessionId: 'current' });
      return { success: true, data: undefined };
    } catch (e) {
      return { success: false, error: toAppwriteError(e) };
    }
  },

  /**
   * Return the currently logged-in user, or an error if no session exists.
   */
  async getCurrentUser(): Promise<Result<Models.User<Models.Preferences>>> {
    try {
      const user = await getAccount().get();
      return { success: true, data: user };
    } catch (e) {
      return { success: false, error: toAppwriteError(e) };
    }
  },

  /**
   * Trigger a password-recovery email. The `redirectUrl` is the URL the
   * user is sent back to after clicking the link in the email.
   */
  async forgotPassword(
    email: string,
    redirectUrl: string,
  ): Promise<Result<Models.Token>> {
    try {
      const token = await getAccount().createRecovery({
        email,
        url: redirectUrl,
      });
      return { success: true, data: token };
    } catch (e) {
      return { success: false, error: toAppwriteError(e) };
    }
  },

  /**
   * Complete the password reset flow. The `userId` and `secret` come from
   * the recovery link query params; `newPassword` is the desired new password.
   */
  async resetPassword(
    userId: string,
    secret: string,
    newPassword: string,
  ): Promise<Result<Models.Token>> {
    try {
      const token = await getAccount().updateRecovery({
        userId,
        secret,
        password: newPassword,
      });
      return { success: true, data: token };
    } catch (e) {
      return { success: false, error: toAppwriteError(e) };
    }
  },

  /**
   * Verify the user's email address. The `userId` and `secret` are
   * delivered via the verification link query params.
   */
  async verifyEmail(
    userId: string,
    secret: string,
  ): Promise<Result<Models.Token>> {
    try {
      const token = await getAccount().updateVerification({
        userId,
        secret,
      });
      return { success: true, data: token };
    } catch (e) {
      return { success: false, error: toAppwriteError(e) };
    }
  },

  /**
   * Send an email verification message to the currently logged-in user.
   * The `redirectUrl` is where the user lands after clicking the link.
   */
  async sendVerificationEmail(
    redirectUrl: string,
  ): Promise<Result<Models.Token>> {
    try {
      const token = await getAccount().createVerification({
        url: redirectUrl,
      });
      return { success: true, data: token };
    } catch (e) {
      return { success: false, error: toAppwriteError(e) };
    }
  },

  /**
   * Update the currently logged-in user's display name.
   */
  async updateProfile(
    name: string,
  ): Promise<Result<Models.User<Models.Preferences>>> {
    try {
      const user = await getAccount().updateName({ name });
      return { success: true, data: user };
    } catch (e) {
      return { success: false, error: toAppwriteError(e) };
    }
  },

  /**
   * Update the current user's password. `oldPassword` is required for
   * accounts created with email; it is optional for OAuth / magic-URL users.
   */
  async updatePassword(
    newPassword: string,
    oldPassword?: string,
  ): Promise<Result<Models.User<Models.Preferences>>> {
    try {
      const user = await getAccount().updatePassword({
        password: newPassword,
        oldPassword,
      });
      return { success: true, data: user };
    } catch (e) {
      return { success: false, error: toAppwriteError(e) };
    }
  },

  /**
   * Update the current user's email. Requires the current password.
   */
  async updateEmail(
    email: string,
    password: string,
  ): Promise<Result<Models.User<Models.Preferences>>> {
    try {
      const user = await getAccount().updateEmail({ email, password });
      return { success: true, data: user };
    } catch (e) {
      return { success: false, error: toAppwriteError(e) };
    }
  },

  /**
   * List all active sessions for the current user.
   */
  async listSessions(): Promise<Result<Models.SessionList>> {
    try {
      const sessions = await getAccount().listSessions();
      return { success: true, data: sessions };
    } catch (e) {
      return { success: false, error: toAppwriteError(e) };
    }
  },

  /**
   * Log the user out on every device.
   */
  async deleteAllSessions(): Promise<Result<void>> {
    try {
      await getAccount().deleteSessions();
      return { success: true, data: undefined };
    } catch (e) {
      return { success: false, error: toAppwriteError(e) };
    }
  },

  /**
   * Get the current user's preferences object.
   */
  async getPreferences(): Promise<Result<Models.Preferences>> {
    try {
      const prefs = await getAccount().getPrefs();
      return { success: true, data: prefs };
    } catch (e) {
      return { success: false, error: toAppwriteError(e) };
    }
  },

  /**
   * Replace (or merge into) the current user's preferences.
   * The entire object is stored as-is, so include existing keys you want
   * to keep.
   */
  async updatePreferences(
    prefs: Record<string, unknown>,
  ): Promise<Result<Models.User<Models.Preferences>>> {
    try {
      const user = await getAccount().updatePrefs({ prefs });
      return { success: true, data: user };
    } catch (e) {
      return { success: false, error: toAppwriteError(e) };
    }
  },
};

// ===========================================================================
// DATABASE SERVICE
// ===========================================================================

/**
 * All database methods default to `APPWRITE_DATABASE_ID` as the database.
 * You may override this by passing an explicit `databaseId` parameter.
 */
export const DatabaseService = {
  /**
   * Fetch a single document by its ID.
   */
  async getDocument<T extends Models.Document = Models.DefaultDocument>(
    collectionId: CollectionId | string,
    documentId: string,
    databaseId: string = APPWRITE_DATABASE_ID,
  ): Promise<Result<T>> {
    try {
      const doc = await getDatabases().getDocument<T>({
        databaseId,
        collectionId,
        documentId,
      });
      return { success: true, data: doc };
    } catch (e) {
      return { success: false, error: toAppwriteError(e) };
    }
  },

  /**
   * List documents in a collection with optional query filters.
   *
   * Example:
   * ```ts
   * const res = await DatabaseService.listDocuments(
   *   COLLECTION_IDS.COURSES,
   *   [Query.equal('level', 'beginner'), Query.limit(25)],
   * );
   * ```
   */
  async listDocuments<T extends Models.Document = Models.DefaultDocument>(
    collectionId: CollectionId | string,
    queries: string[] = [],
    databaseId: string = APPWRITE_DATABASE_ID,
  ): Promise<Result<Models.DocumentList<T>>> {
    try {
      const result = await getDatabases().listDocuments<T>({
        databaseId,
        collectionId,
        queries,
      });
      return { success: true, data: result };
    } catch (e) {
      return { success: false, error: toAppwriteError(e) };
    }
  },

  /**
   * Create a new document. If `documentId` is omitted a unique ID is
   * generated automatically.
   */
  async createDocument<T extends Models.Document = Models.DefaultDocument>(
    collectionId: CollectionId | string,
    data: Record<string, unknown>,
    documentId?: string,
    databaseId: string = APPWRITE_DATABASE_ID,
  ): Promise<Result<T>> {
    try {
      const doc = await getDatabases().createDocument<T>({
        databaseId,
        collectionId,
        documentId: documentId ?? ID.unique(),
        data: data as Record<string, unknown> & Partial<Models.Document>,
      });
      return { success: true, data: doc };
    } catch (e) {
      return { success: false, error: toAppwriteError(e) };
    }
  },

  /**
   * Partially update an existing document. Only the supplied fields are
   * changed; omitted fields remain untouched.
   */
  async updateDocument<T extends Models.Document = Models.DefaultDocument>(
    collectionId: CollectionId | string,
    documentId: string,
    data: Record<string, unknown>,
    databaseId: string = APPWRITE_DATABASE_ID,
  ): Promise<Result<T>> {
    try {
      const doc = await getDatabases().updateDocument<T>({
        databaseId,
        collectionId,
        documentId,
        data: data as Record<string, unknown> & Partial<Models.Document>,
      });
      return { success: true, data: doc };
    } catch (e) {
      return { success: false, error: toAppwriteError(e) };
    }
  },

  /**
   * Delete a document by its ID.
   */
  async deleteDocument(
    collectionId: CollectionId | string,
    documentId: string,
    databaseId: string = APPWRITE_DATABASE_ID,
  ): Promise<Result<void>> {
    try {
      await getDatabases().deleteDocument({
        databaseId,
        collectionId,
        documentId,
      });
      return { success: true, data: undefined };
    } catch (e) {
      return { success: false, error: toAppwriteError(e) };
    }
  },
};

// ===========================================================================
// STORAGE SERVICE
// ===========================================================================

export const StorageService = {
  /**
   * Upload a file to a storage bucket. A unique file ID is generated
   * automatically unless `fileId` is provided.
   *
   * Optionally track upload progress with `onProgress`.
   */
  async uploadFile(
    bucketId: BucketId | string,
    file: File,
    fileId?: string,
    onProgress?: (progress: UploadProgress) => void,
  ): Promise<Result<Models.File>> {
    try {
      const result = await getStorage().createFile({
        bucketId,
        fileId: fileId ?? ID.unique(),
        file,
        onProgress,
      });
      return { success: true, data: result };
    } catch (e) {
      return { success: false, error: toAppwriteError(e) };
    }
  },

  /**
   * Get a file's metadata by its ID.
   */
  async getFile(
    bucketId: BucketId | string,
    fileId: string,
  ): Promise<Result<Models.File>> {
    try {
      const result = await getStorage().getFile({ bucketId, fileId });
      return { success: true, data: result };
    } catch (e) {
      return { success: false, error: toAppwriteError(e) };
    }
  },

  /**
   * List files in a bucket with optional query filters.
   */
  async listFiles(
    bucketId: BucketId | string,
    queries: string[] = [],
  ): Promise<Result<Models.FileList>> {
    try {
      const result = await getStorage().listFiles({ bucketId, queries });
      return { success: true, data: result };
    } catch (e) {
      return { success: false, error: toAppwriteError(e) };
    }
  },

  /**
   * Return a URL for a preview/thumbnail of an image file.
   * Pass optional transformations (width, height, quality, …).
   *
   * This is a **synchronous** method — it returns a URL string, not a
   * Promise. It does not make a network request itself.
   */
  getFilePreview(
    bucketId: BucketId | string,
    fileId: string,
    options?: {
      width?: number;
      height?: number;
      gravity?:
        | 'center'
        | 'top-left'
        | 'top'
        | 'top-right'
        | 'left'
        | 'right'
        | 'bottom-left'
        | 'bottom'
        | 'bottom-right';
      quality?: number;
      borderWidth?: number;
      borderColor?: string;
      borderRadius?: number;
      opacity?: number;
      rotation?: number;
      background?: string;
      output?: 'jpeg' | 'jpg' | 'png' | 'gif' | 'webp';
    },
  ): string {
    try {
      return getStorage().getFilePreview({
        bucketId,
        fileId,
        width: options?.width,
        height: options?.height,
        quality: options?.quality,
        borderWidth: options?.borderWidth,
        borderColor: options?.borderColor,
        borderRadius: options?.borderRadius,
        opacity: options?.opacity,
        rotation: options?.rotation,
        background: options?.background,
        output: options?.output as import('appwrite').ImageFormat | undefined,
        gravity: options?.gravity as import('appwrite').ImageGravity | undefined,
      });
    } catch {
      return '';
    }
  },

  /**
   * Return a URL for viewing a file inline (no Content-Disposition header).
   *
   * Synchronous — returns a URL string without a network request.
   */
  getFileView(
    bucketId: BucketId | string,
    fileId: string,
  ): string {
    try {
      return getStorage().getFileView({ bucketId, fileId });
    } catch {
      return '';
    }
  },

  /**
   * Return a URL that triggers a file download.
   *
   * Synchronous — returns a URL string without a network request.
   */
  getFileDownload(
    bucketId: BucketId | string,
    fileId: string,
  ): string {
    try {
      return getStorage().getFileDownload({ bucketId, fileId });
    } catch {
      return '';
    }
  },

  /**
   * Delete a file from a bucket.
   */
  async deleteFile(
    bucketId: BucketId | string,
    fileId: string,
  ): Promise<Result<void>> {
    try {
      await getStorage().deleteFile({ bucketId, fileId });
      return { success: true, data: undefined };
    } catch (e) {
      return { success: false, error: toAppwriteError(e) };
    }
  },
};
