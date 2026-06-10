-- ============================================================
-- Migration: Curriculum Structure (Subject → Chapter → Lesson → Video)
-- ============================================================
-- Adds chapters, lessons, course_learning_points tables,
-- and new columns to videos and courses tables.
-- ============================================================

-- -----------------------------------------------------------
-- 1. chapters table
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS chapters (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL,
  subject_id TEXT,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_chapters_course_id ON chapters(course_id);
CREATE INDEX IF NOT EXISTS idx_chapters_subject_id ON chapters(subject_id);

-- -----------------------------------------------------------
-- 2. lessons table
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS lessons (
  id TEXT PRIMARY KEY,
  chapter_id TEXT NOT NULL,
  course_id TEXT NOT NULL,
  subject_id TEXT,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  lesson_type TEXT DEFAULT 'lecture',
  sort_order INTEGER DEFAULT 0,
  is_preview INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  duration INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_lessons_chapter_id ON lessons(chapter_id);
CREATE INDEX IF NOT EXISTS idx_lessons_course_id ON lessons(course_id);
CREATE INDEX IF NOT EXISTS idx_lessons_subject_id ON lessons(subject_id);

-- -----------------------------------------------------------
-- 3. course_learning_points table (for "What You'll Learn")
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS course_learning_points (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id TEXT NOT NULL,
  point_text TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_course_learning_points_course_id ON course_learning_points(course_id);

-- -----------------------------------------------------------
-- 4. ALTER videos — add lesson_id, lesson_type (subject_id and chapter_id already exist)
-- -----------------------------------------------------------
ALTER TABLE videos ADD COLUMN lesson_id TEXT;
ALTER TABLE videos ADD COLUMN lesson_type TEXT DEFAULT 'lecture';

-- Indexes for the new video columns
CREATE INDEX IF NOT EXISTS idx_videos_lesson_id ON videos(lesson_id);

-- -----------------------------------------------------------
-- 5. ALTER courses — add semester, what_you_learn
-- -----------------------------------------------------------
ALTER TABLE courses ADD COLUMN semester INTEGER DEFAULT NULL;
ALTER TABLE courses ADD COLUMN what_you_learn TEXT DEFAULT '[]';
