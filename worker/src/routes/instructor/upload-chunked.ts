/**
 * Instructor chunked upload routes
 *
 * Supports large file uploads (>100MB) by splitting them into chunks.
 * Each chunk is ≤50MB so it stays within Cloudflare Workers request size limits.
 *
 * Flow:
 *   1. POST /upload/initiate          — Start a chunked upload session
 *   2. PUT  /upload/chunk/:uploadId/:chunkIndex — Upload individual chunks
 *   3. POST /upload/complete/:uploadId — Finalize: compose chunks → final R2 object
 */

import { Hono } from 'hono';
import type { Env } from '../../env';
import {
  instructorOrAdminMiddleware,
  type InstructorOrAdminAuthVariables,
} from '../../lib/instructor-auth-middleware';
import { getErrorMessage } from '../../lib/utils';
import { getPublicUrl } from '../../lib/r2';

const CHUNK_SIZE = 50 * 1024 * 1024; // 50 MB per chunk

const chunkedUploadRoutes = new Hono<{ Bindings: Env; Variables: InstructorOrAdminAuthVariables }>();

// ─── POST /upload/initiate — Start a chunked upload session ───

chunkedUploadRoutes.post('/initiate', instructorOrAdminMiddleware, async (c) => {
  try {
    const { filename, contentType, totalSize, bucketType = 'videos', courseId } = await c.req.json<{
      filename: string;
      contentType: string;
      totalSize: number;
      bucketType?: 'videos' | 'thumbnails' | 'resources';
      courseId?: string;
    }>();

    if (!filename || !totalSize) {
      return c.json({ error: 'filename and totalSize are required' }, 400);
    }

    if (!['videos', 'thumbnails', 'resources'].includes(bucketType)) {
      return c.json({ error: 'bucketType must be one of: videos, thumbnails, resources' }, 400);
    }

    const instructorId = c.get('instructorId');
    const uploadId = crypto.randomUUID();
    const key = `${bucketType}/${instructorId || 'unknown'}/${courseId || 'uncoursed'}/${uploadId}-${filename}`;

    // Store upload session metadata in KV (1 hour TTL)
    await c.env.KV_CONFIG.put(
      `upload:${uploadId}`,
      JSON.stringify({
        filename,
        contentType,
        totalSize,
        bucketType,
        courseId: courseId || '',
        key,
        uploadedChunks: [] as number[],
        createdAt: Date.now(),
      }),
      { expirationTtl: 3600 },
    );

    return c.json({
      uploadId,
      key,
      chunkSize: CHUNK_SIZE,
      totalChunks: Math.ceil(totalSize / CHUNK_SIZE),
    });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// ─── PUT /upload/chunk/:uploadId/:chunkIndex — Upload a single chunk ───

chunkedUploadRoutes.put('/chunk/:uploadId/:chunkIndex', instructorOrAdminMiddleware, async (c) => {
  try {
    const { uploadId, chunkIndex } = c.req.param();
    const idx = parseInt(chunkIndex, 10);

    if (isNaN(idx) || idx < 0) {
      return c.json({ error: 'chunkIndex must be a non-negative integer' }, 400);
    }

    // Retrieve session metadata
    const sessionData = await c.env.KV_CONFIG.get(`upload:${uploadId}`);
    if (!sessionData) {
      return c.json({ error: 'Upload session not found or expired' }, 404);
    }

    const session = JSON.parse(sessionData) as {
      filename: string;
      contentType: string;
      totalSize: number;
      bucketType: string;
      courseId: string;
      key: string;
      uploadedChunks: number[];
      createdAt: number;
    };

    // Validate chunk index
    const totalChunks = Math.ceil(session.totalSize / CHUNK_SIZE);
    if (idx >= totalChunks) {
      return c.json({ error: `chunkIndex ${idx} out of range (0-${totalChunks - 1})` }, 400);
    }

    // Store chunk as a temporary R2 object
    const chunkKey = `temp-uploads/${uploadId}/chunk-${idx}`;
    const body = await c.req.raw.arrayBuffer();
    await c.env.R2_VIDEOS.put(chunkKey, body, {
      httpMetadata: { contentType: 'application/octet-stream' },
    });

    // Update session metadata — add this chunk index
    if (!session.uploadedChunks.includes(idx)) {
      session.uploadedChunks.push(idx);
      session.uploadedChunks.sort((a, b) => a - b);
    }
    await c.env.KV_CONFIG.put(`upload:${uploadId}`, JSON.stringify(session), {
      expirationTtl: 3600,
    });

    return c.json({
      received: idx,
      uploadedChunks: session.uploadedChunks.length,
      totalChunks,
    });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// ─── POST /upload/complete/:uploadId — Finalize: compose chunks into final object ───

chunkedUploadRoutes.post('/complete/:uploadId', instructorOrAdminMiddleware, async (c) => {
  try {
    const { uploadId } = c.req.param();

    // Retrieve session
    const sessionData = await c.env.KV_CONFIG.get(`upload:${uploadId}`);
    if (!sessionData) {
      return c.json({ error: 'Upload session not found or expired' }, 404);
    }

    const session = JSON.parse(sessionData) as {
      filename: string;
      contentType: string;
      totalSize: number;
      bucketType: string;
      courseId: string;
      key: string;
      uploadedChunks: number[];
      createdAt: number;
    };

    const totalChunks = Math.ceil(session.totalSize / CHUNK_SIZE);
    if (session.uploadedChunks.length !== totalChunks) {
      return c.json({
        error: 'Not all chunks uploaded yet',
        uploaded: session.uploadedChunks.length,
        total: totalChunks,
        missing: totalChunks - session.uploadedChunks.length,
      }, 400);
    }

    // Read all chunks from R2 and combine them
    const chunkBuffers: ArrayBuffer[] = [];
    for (const idx of session.uploadedChunks) {
      const chunkKey = `temp-uploads/${uploadId}/chunk-${idx}`;
      const obj = await c.env.R2_VIDEOS.get(chunkKey);
      if (!obj) {
        return c.json({ error: `Chunk ${idx} missing from R2` }, 500);
      }
      chunkBuffers.push(await obj.arrayBuffer());
    }

    // Combine into a single buffer
    const totalBytes = chunkBuffers.reduce((acc, buf) => acc + buf.byteLength, 0);
    const combined = new Uint8Array(totalBytes);
    let offset = 0;
    for (const buf of chunkBuffers) {
      combined.set(new Uint8Array(buf), offset);
      offset += buf.byteLength;
    }

    // Select the correct R2 bucket
    const r2Bucket =
      session.bucketType === 'videos'
        ? c.env.R2_VIDEOS
        : session.bucketType === 'thumbnails'
          ? c.env.R2_THUMBNAILS
          : c.env.R2_RESOURCES;

    // Store final combined object
    await r2Bucket.put(session.key, combined, {
      httpMetadata: { contentType: session.contentType },
      customMetadata: {
        uploadId,
        courseId: session.courseId || '',
        originalFilename: session.filename,
      },
    });

    // Clean up temporary chunks from R2
    for (const idx of session.uploadedChunks) {
      const chunkKey = `temp-uploads/${uploadId}/chunk-${idx}`;
      await c.env.R2_VIDEOS.delete(chunkKey);
    }

    // Clean up KV session
    await c.env.KV_CONFIG.delete(`upload:${uploadId}`);

    // Generate public URL
    const publicUrl = await getPublicUrl(c.env, session.bucketType, session.key);

    return c.json({
      success: true,
      key: session.key,
      url: publicUrl,
      size: totalBytes,
    });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

export default chunkedUploadRoutes;
