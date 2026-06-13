/**
 * Instructor routes — Main router composing all sub-route modules
 *
 * Migrated from monolithic instructor.ts to modular structure.
 * Each sub-module handles a distinct domain:
 *
 *   auth.ts       — Login, session check, logout, password management
 *   courses.ts    — Course CRUD, chapters, lessons, videos, resources, subjects
 *   dashboard.ts  — Dashboard stats & notifications
 *   analytics.ts  — Course analytics, progress, reviews
 *   upload.ts     — File uploads (thumbnails, videos, CC/subtitles)
 *   profile.ts    — Profile management & avatar upload
 *   live.ts       — Live class schedule & support tickets
 *   livekit.ts    — LiveKit token generation & room management
 */

import { Hono } from 'hono';
import type { Env } from '../../env';
import { type InstructorOrAdminAuthVariables } from '../../lib/instructor-auth-middleware';
import authRoutes from './auth';
import courseRoutes from './courses';
import dashboardRoutes from './dashboard';
import analyticsRoutes from './analytics';
import uploadRoutes from './upload';
import profileRoutes from './profile';
import liveRoutes from './live';
import livekitRoutes from './livekit';
import chunkedUploadRoutes from './upload-chunked';

const instructorApiRoutes = new Hono<{ Bindings: Env; Variables: InstructorOrAdminAuthVariables }>();

// Compose all sub-routes under /
instructorApiRoutes.route('/', authRoutes);
instructorApiRoutes.route('/', courseRoutes);
instructorApiRoutes.route('/', dashboardRoutes);
instructorApiRoutes.route('/', analyticsRoutes);
instructorApiRoutes.route('/', uploadRoutes);
instructorApiRoutes.route('/', profileRoutes);
instructorApiRoutes.route('/', liveRoutes);
instructorApiRoutes.route('/', livekitRoutes);
instructorApiRoutes.route('/upload', chunkedUploadRoutes);

export default instructorApiRoutes;
