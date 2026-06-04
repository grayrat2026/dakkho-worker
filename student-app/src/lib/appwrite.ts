/**
 * DAKKHO Student Streaming Web App — Appwrite Service Integration Module
 *
 * Centralizes Appwrite SDK interactions for database and storage.
 * Designed for **client-side only** usage; every call guards against
 * server-side execution so the module can safely be imported in
 * Next.js client components without SSR issues.
 *
 * NOTE: Auth is now handled via Worker API (api-client.ts authApi).
 * This module only handles database reads and storage.
 *
 * Appwrite SDK version: 25.x (object-parameter style API)
 */

import {
  Client,
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
  process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID ?? 'dakkho_main';

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
// DATABASE SERVICE (client-side reads only)
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
   * Create a new document.
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
   * Partially update an existing document.
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
   * Upload a file to a storage bucket.
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
   * Synchronous — returns a URL string without a network request.
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
        output: options?.output as import('appwrite').ImageFormat | undefined,
        gravity: options?.gravity as import('appwrite').ImageGravity | undefined,
      });
    } catch {
      return '';
    }
  },

  /**
   * Return a URL for viewing a file inline.
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
