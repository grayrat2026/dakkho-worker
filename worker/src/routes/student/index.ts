/**
 * Student API Routes — Main Compositor
 * Mounts all student sub-route modules under a single Hono instance.
 * Imported by src/index.ts as `studentApiRoutes`.
 */

import { Hono } from 'hono';
import type { Env } from '../../env';
import type { StudentAuthVariables } from './helpers';

import authRoutes from './auth';
import publicRoutes from './public';
import courseRoutes from './courses';
import enrollmentRoutes from './enrollments';
import paymentRoutes from './payments';
import videoRoutes from './video';
import profileRoutes from './profile';
import couponRoutes from './coupons';

const studentApiRoutes = new Hono<{ Bindings: Env; Variables: StudentAuthVariables }>();

// Mount all sub-route modules.
// Each module defines its own path prefixes (e.g. /auth/signup, /courses/:id).
// Using route('/') merges their paths into this router.
studentApiRoutes.route('/', authRoutes);
studentApiRoutes.route('/', publicRoutes);
studentApiRoutes.route('/', courseRoutes);
studentApiRoutes.route('/', enrollmentRoutes);
studentApiRoutes.route('/', paymentRoutes);
studentApiRoutes.route('/', videoRoutes);
studentApiRoutes.route('/', profileRoutes);
studentApiRoutes.route('/', couponRoutes);

export default studentApiRoutes;
