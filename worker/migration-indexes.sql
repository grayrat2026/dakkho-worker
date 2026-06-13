-- Migration: Performance indexes for common queries
-- Date: 2025-03-04
-- Description: Add composite indexes to speed up frequently-used D1 queries

CREATE INDEX IF NOT EXISTS idx_enrollments_course_user ON enrollments(course_id, user_id);
CREATE INDEX IF NOT EXISTS idx_payments_course_status ON payments(course_id, status);
CREATE INDEX IF NOT EXISTS idx_payments_user_status ON payments(user_id, status);
CREATE INDEX IF NOT EXISTS idx_user_packages_user_active ON user_packages(user_id, status);
CREATE INDEX IF NOT EXISTS idx_videos_course_processing ON videos(course_id, processing_status);
CREATE INDEX IF NOT EXISTS idx_watch_history_user_course ON watch_history(user_id, course_id);
