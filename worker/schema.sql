-- DAKKHO Admin API - D1 Database Schema (Complete)
-- Last updated: 2025-03-04
-- Migrated: All Appwrite collections replaced with D1 tables

-- ============================================================
-- CORE TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS admin_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  email TEXT NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'admin',
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL,
  is_active INTEGER DEFAULT 1
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sessions_user_id ON admin_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON admin_sessions(expires_at);

CREATE TABLE IF NOT EXISTS app_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '{}',
  description TEXT,
  updated_by TEXT,
  updated_at TEXT DEFAULT (datetime('now')),
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_config_key ON app_config(key);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  user_id TEXT,
  user_email TEXT,
  details TEXT DEFAULT '{}',
  ip_address TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);

-- ============================================================
-- USERS TABLE (replaces Appwrite users collection)
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  phone TEXT,
  bio TEXT,
  institute_id INTEGER,
  technology TEXT,
  semester INTEGER DEFAULT 1,
  avatar_url TEXT,
  role TEXT DEFAULT 'student',
  email_verified INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  enrolled_course_ids TEXT DEFAULT '[]',
  password_hash TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);

-- ============================================================
-- COURSES TABLE (replaces Appwrite courses collection)
-- ============================================================

CREATE TABLE IF NOT EXISTS courses (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  thumbnail_url TEXT,
  preview_video_url TEXT,
  category_id TEXT,
  instructor_id TEXT,
  technology_id INTEGER,
  level TEXT DEFAULT 'beginner',
  language TEXT DEFAULT 'bangla',
  duration INTEGER DEFAULT 0,
  total_videos INTEGER DEFAULT 0,
  rating REAL DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  total_students INTEGER DEFAULT 0,
  price REAL DEFAULT 0,
  is_featured INTEGER DEFAULT 0,
  is_published INTEGER DEFAULT 0,
  tags TEXT,
  semester TEXT,
  what_you_learn TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_courses_slug ON courses(slug);
CREATE INDEX IF NOT EXISTS idx_courses_instructor ON courses(instructor_id);
CREATE INDEX IF NOT EXISTS idx_courses_published ON courses(is_published);
CREATE INDEX IF NOT EXISTS idx_courses_technology ON courses(technology_id);

-- ============================================================
-- VIDEOS TABLE (replaces Appwrite videos collection)
-- ============================================================

CREATE TABLE IF NOT EXISTS videos (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  course_id TEXT NOT NULL,
  video_url TEXT,
  thumbnail_url TEXT,
  duration INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  lesson_id TEXT,
  lesson_type TEXT,
  chapter_id TEXT,
  subject_id TEXT,
  is_preview INTEGER DEFAULT 0,
  is_published INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_videos_course ON videos(course_id);
CREATE INDEX IF NOT EXISTS idx_videos_order ON videos(course_id, sort_order);

-- ============================================================
-- INSTRUCTORS TABLE (replaces Appwrite instructors collection)
-- ============================================================

CREATE TABLE IF NOT EXISTS instructors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  bio TEXT,
  avatar_url TEXT,
  cover_url TEXT,
  specialization TEXT,
  rating REAL DEFAULT 0,
  total_students INTEGER DEFAULT 0,
  total_courses INTEGER DEFAULT 0,
  social_links TEXT DEFAULT '{}',
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_instructors_active ON instructors(is_active);

-- ============================================================
-- CATEGORIES TABLE (replaces Appwrite categories collection)
-- ============================================================

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  icon TEXT,
  color TEXT,
  parent_id TEXT,
  sort_order INTEGER DEFAULT 0,
  course_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);

-- ============================================================
-- ENROLLMENTS TABLE (replaces Appwrite enrollments collection)
-- ============================================================

CREATE TABLE IF NOT EXISTS enrollments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  course_id TEXT NOT NULL,
  progress REAL DEFAULT 0,
  completed INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, course_id)
);
CREATE INDEX IF NOT EXISTS idx_enrollments_user ON enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course ON enrollments(course_id);

-- ============================================================
-- NOTIFICATIONS TABLE (replaces Appwrite notifications collection)
-- ============================================================

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  category TEXT DEFAULT '',
  read INTEGER DEFAULT 0,
  action_url TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, read);

-- ============================================================
-- INSTITUTES TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS institutes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  name_bn TEXT,
  division TEXT,
  district TEXT,
  eiin_number TEXT,
  type TEXT DEFAULT 'polytechnic',
  is_requested INTEGER DEFAULT 0,
  requested_by TEXT,
  approved_by TEXT,
  approved_at TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_institutes_type ON institutes(type);
CREATE INDEX IF NOT EXISTS idx_institutes_division ON institutes(division);
CREATE INDEX IF NOT EXISTS idx_institutes_is_requested ON institutes(is_requested);
CREATE INDEX IF NOT EXISTS idx_institutes_name ON institutes(name);

-- ============================================================
-- TECHNOLOGIES TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS technologies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  name_bn TEXT,
  short_code TEXT,
  description TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_technologies_short_code ON technologies(short_code);

-- ============================================================
-- SUBJECTS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS subjects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  color TEXT,
  technology_id INTEGER,
  sort_order INTEGER DEFAULT 0,
  course_count INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_subjects_slug ON subjects(slug);
CREATE INDEX IF NOT EXISTS idx_subjects_technology ON subjects(technology_id);
CREATE INDEX IF NOT EXISTS idx_subjects_active ON subjects(is_active);

-- ============================================================
-- COURSE JUNCTION TABLES (many-to-many)
-- ============================================================

CREATE TABLE IF NOT EXISTS course_subjects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(course_id, subject_id)
);
CREATE INDEX IF NOT EXISTS idx_course_subjects_course ON course_subjects(course_id);
CREATE INDEX IF NOT EXISTS idx_course_subjects_subject ON course_subjects(subject_id);

CREATE TABLE IF NOT EXISTS course_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id TEXT NOT NULL,
  category_id TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(course_id, category_id)
);
CREATE INDEX IF NOT EXISTS idx_course_categories_course ON course_categories(course_id);
CREATE INDEX IF NOT EXISTS idx_course_categories_category ON course_categories(category_id);

CREATE TABLE IF NOT EXISTS course_instructors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id TEXT NOT NULL,
  instructor_id TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(course_id, instructor_id)
);
CREATE INDEX IF NOT EXISTS idx_course_instructors_course ON course_instructors(course_id);
CREATE INDEX IF NOT EXISTS idx_course_instructors_instructor ON course_instructors(instructor_id);

-- ============================================================
-- CHAPTERS TABLE (curriculum structure: Subject → Chapter)
-- ============================================================

CREATE TABLE IF NOT EXISTS chapters (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL,
  subject_id TEXT,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_chapters_course ON chapters(course_id);
CREATE INDEX IF NOT EXISTS idx_chapters_subject ON chapters(subject_id);
CREATE INDEX IF NOT EXISTS idx_chapters_order ON chapters(course_id, subject_id, sort_order);

-- ============================================================
-- LESSONS TABLE (curriculum structure: Chapter → Lesson)
-- ============================================================

CREATE TABLE IF NOT EXISTS lessons (
  id TEXT PRIMARY KEY,
  chapter_id TEXT NOT NULL,
  course_id TEXT NOT NULL,
  subject_id TEXT,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  lesson_type TEXT DEFAULT 'video',
  sort_order INTEGER DEFAULT 0,
  is_preview INTEGER DEFAULT 0,
  duration INTEGER DEFAULT 0,
  video_url TEXT,
  thumbnail_url TEXT,
  document_url TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_lessons_chapter ON lessons(chapter_id);
CREATE INDEX IF NOT EXISTS idx_lessons_course ON lessons(course_id);
CREATE INDEX IF NOT EXISTS idx_lessons_subject ON lessons(subject_id);
CREATE INDEX IF NOT EXISTS idx_lessons_order ON lessons(chapter_id, sort_order);

-- ============================================================
-- COURSE_LEARNING_POINTS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS course_learning_points (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id TEXT NOT NULL,
  point_text TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_learning_points_course ON course_learning_points(course_id);

-- ============================================================
-- INSTITUTE_REQUESTS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS institute_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  user_email TEXT,
  user_name TEXT,
  institute_name TEXT NOT NULL,
  institute_name_bn TEXT,
  division TEXT,
  district TEXT,
  status TEXT DEFAULT 'pending',
  admin_note TEXT,
  reviewed_by TEXT,
  reviewed_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_institute_requests_status ON institute_requests(status);
CREATE INDEX IF NOT EXISTS idx_institute_requests_user ON institute_requests(user_id);

-- ============================================================
-- COURSE_PACKAGES TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS course_packages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id TEXT NOT NULL,
  package_type TEXT NOT NULL,
  display_name TEXT,
  description TEXT,
  price REAL NOT NULL,
  duration_months INTEGER DEFAULT 6,
  max_users INTEGER DEFAULT 1,
  is_auto_assign INTEGER DEFAULT 1,
  is_active INTEGER DEFAULT 1,
  created_by TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_course_packages_course ON course_packages(course_id);
CREATE INDEX IF NOT EXISTS idx_course_packages_type ON course_packages(package_type);
CREATE INDEX IF NOT EXISTS idx_course_packages_active ON course_packages(is_active);

-- ============================================================
-- USER_PACKAGES TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS user_packages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  package_id INTEGER NOT NULL,
  course_id TEXT NOT NULL,
  package_type TEXT NOT NULL,
  activated_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  shared_with TEXT,
  status TEXT DEFAULT 'active',
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_user_packages_user ON user_packages(user_id);
CREATE INDEX IF NOT EXISTS idx_user_packages_status ON user_packages(status);
CREATE INDEX IF NOT EXISTS idx_user_packages_expires ON user_packages(expires_at);

-- ============================================================
-- COUPONS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS coupons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  discount_type TEXT NOT NULL,
  discount_value REAL NOT NULL,
  max_discount REAL,
  min_purchase REAL DEFAULT 0,
  usage_limit INTEGER,
  usage_count INTEGER DEFAULT 0,
  per_user_limit INTEGER DEFAULT 1,
  valid_from TEXT NOT NULL,
  valid_until TEXT NOT NULL,
  applicable_courses TEXT,
  applicable_technologies TEXT,
  is_active INTEGER DEFAULT 1,
  created_by TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_active ON coupons(is_active);
CREATE INDEX IF NOT EXISTS idx_coupons_valid ON coupons(valid_from, valid_until);

-- ============================================================
-- DISCOUNTS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS discounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  name_bn TEXT,
  description TEXT,
  discount_type TEXT NOT NULL,
  discount_value REAL NOT NULL,
  applicable_type TEXT NOT NULL,
  applicable_ids TEXT,
  valid_from TEXT NOT NULL,
  valid_until TEXT NOT NULL,
  is_auto_apply INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_by TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_discounts_active ON discounts(is_active);
CREATE INDEX IF NOT EXISTS idx_discounts_valid ON discounts(valid_from, valid_until);

-- ============================================================
-- EVENTS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  title_bn TEXT,
  description TEXT,
  description_bn TEXT,
  event_type TEXT NOT NULL,
  banner_url TEXT,
  start_date TEXT NOT NULL,
  end_date TEXT,
  is_featured INTEGER DEFAULT 0,
  metadata TEXT DEFAULT '{}',
  is_active INTEGER DEFAULT 1,
  created_by TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_active ON events(is_active);
CREATE INDEX IF NOT EXISTS idx_events_featured ON events(is_featured);
CREATE INDEX IF NOT EXISTS idx_events_dates ON events(start_date, end_date);

-- ============================================================
-- LIVE_CLASS_SCHEDULES TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS live_class_schedules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id TEXT,
  title TEXT NOT NULL,
  title_bn TEXT,
  description TEXT,
  instructor_id TEXT,
  technology_id INTEGER,
  scheduled_at TEXT NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  meeting_url TEXT,
  platform TEXT DEFAULT 'jitsi',
  status TEXT DEFAULT 'scheduled',
  recording_url TEXT,
  is_active INTEGER DEFAULT 1,
  created_by TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_live_classes_status ON live_class_schedules(status);
CREATE INDEX IF NOT EXISTS idx_live_classes_scheduled ON live_class_schedules(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_live_classes_course ON live_class_schedules(course_id);

-- ============================================================
-- NOTIFICATION_LOGS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS notification_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  category TEXT NOT NULL,
  title TEXT,
  message TEXT,
  target_type TEXT,
  target_id TEXT,
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  metadata TEXT DEFAULT '{}',
  created_by TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_notif_logs_type ON notification_logs(type);
CREATE INDEX IF NOT EXISTS idx_notif_logs_category ON notification_logs(category);
CREATE INDEX IF NOT EXISTS idx_notif_logs_created ON notification_logs(created_at DESC);

-- ============================================================
-- USER_PUSH_TOKENS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS user_push_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  push_token TEXT NOT NULL,
  device_type TEXT,
  device_info TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON user_push_tokens(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_push_tokens_token ON user_push_tokens(push_token);

-- ============================================================
-- STUDENT_SESSIONS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS student_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  name TEXT,
  device_info TEXT,
  ip_address TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL,
  is_active INTEGER DEFAULT 1
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_student_sessions_user ON student_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_student_sessions_expires ON student_sessions(expires_at);

-- ============================================================
-- USER_2FA TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS user_2fa (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL UNIQUE,
  method TEXT DEFAULT 'email',
  totp_secret TEXT,
  totp_verified INTEGER DEFAULT 0,
  backup_codes TEXT,
  is_enabled INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_user_2fa_user ON user_2fa(user_id);

-- ============================================================
-- PAYMENT_CONFIG TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS payment_config (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  gateway TEXT NOT NULL,
  is_active INTEGER DEFAULT 0,
  config TEXT DEFAULT '{}',
  sandbox_mode INTEGER DEFAULT 1,
  instructions TEXT,
  instructions_bn TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- ============================================================
-- PAYMENTS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  package_id INTEGER,
  course_id TEXT,
  amount REAL NOT NULL,
  currency TEXT DEFAULT 'BDT',
  gateway TEXT NOT NULL,
  gateway_trx_id TEXT,
  gateway_payment_id TEXT,
  status TEXT DEFAULT 'pending',
  proof_url TEXT,
  trx_id_submitted TEXT,
  phone_submitted TEXT,
  verified_by TEXT,
  verified_at TEXT,
  metadata TEXT DEFAULT '{}',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_gateway ON payments(gateway);
CREATE INDEX IF NOT EXISTS idx_payments_created ON payments(created_at DESC);

-- ============================================================
-- STUDENT FEATURE TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS notification_preferences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL UNIQUE,
  push_enabled INTEGER DEFAULT 1,
  email_enabled INTEGER DEFAULT 1,
  sms_enabled INTEGER DEFAULT 0,
  quiet_hours_enabled INTEGER DEFAULT 0,
  quiet_hours_start TEXT DEFAULT '22:00',
  quiet_hours_end TEXT DEFAULT '08:00',
  course_updates_push INTEGER DEFAULT 1,
  course_updates_email INTEGER DEFAULT 1,
  grades_push INTEGER DEFAULT 1,
  grades_email INTEGER DEFAULT 1,
  schedule_push INTEGER DEFAULT 1,
  schedule_email INTEGER DEFAULT 1,
  payment_push INTEGER DEFAULT 1,
  payment_email INTEGER DEFAULT 1,
  promotions_push INTEGER DEFAULT 0,
  promotions_email INTEGER DEFAULT 0,
  social_push INTEGER DEFAULT 1,
  social_email INTEGER DEFAULT 0,
  system_push INTEGER DEFAULT 1,
  system_email INTEGER DEFAULT 1,
  updated_at TEXT DEFAULT (datetime('now')),
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_notif_prefs_user ON notification_preferences(user_id);

CREATE TABLE IF NOT EXISTS student_activity (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  activity_type TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  metadata TEXT DEFAULT '{}',
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_student_activity_user ON student_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_student_activity_type ON student_activity(activity_type);
CREATE INDEX IF NOT EXISTS idx_student_activity_created ON student_activity(created_at DESC);

CREATE TABLE IF NOT EXISTS achievement_definitions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  name_bn TEXT,
  description TEXT NOT NULL,
  description_bn TEXT,
  category TEXT NOT NULL,
  icon TEXT DEFAULT 'trophy',
  xp INTEGER DEFAULT 0,
  condition_type TEXT NOT NULL,
  condition_value TEXT NOT NULL,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_achievements_slug ON achievement_definitions(slug);
CREATE INDEX IF NOT EXISTS idx_achievements_category ON achievement_definitions(category);
CREATE INDEX IF NOT EXISTS idx_achievements_active ON achievement_definitions(is_active);

CREATE TABLE IF NOT EXISTS student_achievements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  achievement_id INTEGER NOT NULL,
  unlocked_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (achievement_id) REFERENCES achievement_definitions(id),
  UNIQUE(user_id, achievement_id)
);
CREATE INDEX IF NOT EXISTS idx_student_achievements_user ON student_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_student_achievements_achievement ON student_achievements(achievement_id);

CREATE TABLE IF NOT EXISTS notification_sounds (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  is_default INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

-- ============================================================
-- USER PREFERENCES TABLE (theme, privacy, appearance, etc.)
-- ============================================================

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id TEXT NOT NULL PRIMARY KEY,
  -- Theme preferences
  theme_mode TEXT DEFAULT 'system',
  accent_color TEXT DEFAULT '#0ea5e9',
  font_size INTEGER DEFAULT 16,
  border_radius INTEGER DEFAULT 16,
  compact_mode INTEGER DEFAULT 0,
  -- Privacy preferences
  profile_visibility TEXT DEFAULT 'Friends',
  search_visible INTEGER DEFAULT 1,
  show_email INTEGER DEFAULT 0,
  show_phone INTEGER DEFAULT 0,
  show_progress INTEGER DEFAULT 1,
  activity_status INTEGER DEFAULT 1,
  read_receipts INTEGER DEFAULT 1,
  data_sharing INTEGER DEFAULT 0,
  analytics_opt_out INTEGER DEFAULT 0,
  personalized_recommendations INTEGER DEFAULT 1,
  cookie_consent TEXT DEFAULT 'essential',
  -- Content protection
  content_protection_enabled INTEGER DEFAULT 1,
  no_copy INTEGER DEFAULT 1,
  no_right_click INTEGER DEFAULT 1,
  no_screenshot INTEGER DEFAULT 0,
  -- Download preferences
  download_quality TEXT DEFAULT '720p',
  wifi_only INTEGER DEFAULT 0,
  -- Misc
  language TEXT DEFAULT 'bn',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_prefs_user ON user_preferences(user_id);

-- ============================================================
-- PASSWORD_RESET_OTPS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS password_reset_otps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  otp TEXT NOT NULL,
  purpose TEXT DEFAULT 'password_reset',
  expires_at TEXT NOT NULL,
  used INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_password_reset_otps_email ON password_reset_otps(email);
CREATE INDEX IF NOT EXISTS idx_password_reset_otps_expires ON password_reset_otps(expires_at);
CREATE INDEX IF NOT EXISTS idx_password_reset_otps_purpose ON password_reset_otps(purpose);

-- ============================================================
-- SEED DATA
-- ============================================================

-- Seed default config
INSERT OR IGNORE INTO app_config (key, value, description) VALUES
  ('app_settings', '{"appName":"DAKKHO","maintenanceMode":false,"maxUploadSize":500,"defaultLanguage":"bn"}', 'General app settings'),
  ('streaming', '{"defaultQuality":"720p","maxConcurrentStreams":3,"enableDVR":true,"enableChat":true}', 'Streaming config'),
  ('notifications', '{"pushEnabled":true,"emailEnabled":true,"smsEnabled":false}', 'Notification settings'),
  ('features', '{"enableCourses":true,"enableLiveClasses":true,"enableQuizzes":true,"enableCertificates":true,"enableLeaderboard":true}', 'Feature flags');

-- Seed payment config (manual as default)
INSERT OR IGNORE INTO payment_config (gateway, is_active, config, sandbox_mode, instructions, instructions_bn) VALUES
  ('manual', 1, '{}', 0, 'Send payment via bKash/Nagad to 01XXXXXXXXX and submit your Transaction ID below.', 'bKash/Nagad এ 01XXXXXXXXX নম্বরে পেমেন্ট পাঠিয়ে আপনার Transaction ID নিচে জমা দিন।'),
  ('sslcommerz', 0, '{}', 1, NULL, NULL),
  ('bkash', 0, '{}', 1, NULL, NULL),
  ('piprapay', 0, '{}', 0, 'Pay securely via bKash, Nagad, or Rocket through our payment gateway.', 'bKash, Nagad, বা Rocket এর মাধ্যমে নিরাপদে পেমেন্ট করুন।');

-- Seed technologies
INSERT OR IGNORE INTO technologies (name, name_bn, short_code, description, is_active) VALUES
  ('Civil Technology', 'সিভিল টেকনোলজি', 'CT', 'Civil Engineering Technology', 1),
  ('Computer Science & Technology', 'কম্পিউটার সায়েন্স অ্যান্ড টেকনোলজি', 'CST', 'Computer Science and Technology', 1),
  ('Electrical Technology', 'ইলেকট্রিক্যাল টেকনোলজি', 'ET', 'Electrical Engineering Technology', 1),
  ('Electro Medical Technology', 'ইলেক্ট্রো মেডিক্যাল টেকনোলজি', 'EMT', 'Electro Medical Technology', 1),
  ('Electronics Technology', 'ইলেকট্রনিক্স টেকনোলজি', 'EnT', 'Electronics Engineering Technology', 1),
  ('Mechanical Technology', 'মেকানিক্যাল টেকনোলজি', 'MT', 'Mechanical Engineering Technology', 1),
  ('Power Technology', 'পাওয়ার টেকনোলজি', 'PT', 'Power Engineering Technology', 1);

-- Seed achievement definitions
INSERT OR IGNORE INTO achievement_definitions (slug, name, name_bn, description, description_bn, category, icon, xp, condition_type, condition_value) VALUES
  ('first-course', 'First Course', 'প্রথম কোর্স', 'Enroll in your first course', 'প্রথম কোর্সে ভর্তি হন', 'learning', 'book-open', 50, 'enrollment_count', '1'),
  ('quick-learner', 'Quick Learner', 'দ্রুত শিক্ষার্থী', 'Complete 3 courses', '৩টি কোর্স সম্পন্ন করুন', 'learning', 'zap', 150, 'completion_count', '3'),
  ('top-student', 'Top Student', 'শীর্ষ শিক্ষার্থী', 'Appear in top 10 leaderboard', 'লিডারবোর্ডে শীর্ষ ১০-এ উপস্থিত হন', 'learning', 'crown', 300, 'leaderboard_rank', '10'),
  ('week-streak', 'Week Warrior', 'সপ্তাহ যোদ্ধা', '7-day learning streak', '৭ দিনের লার্নিং স্ট্রিক', 'streaks', 'flame', 100, 'streak_days', '7'),
  ('month-streak', 'Monthly Master', 'মাসিক মাস্টার', '30-day learning streak', '৩০ দিনের লার্নিং স্ট্রিক', 'streaks', 'flame', 500, 'streak_days', '30'),
  ('social-butterfly', 'Social Butterfly', 'সামাজিক প্রজাপতি', 'Join 3 study groups', '৩টি স্টাডি গ্রুপে যোগ দিন', 'social', 'users', 75, 'group_count', '3'),
  ('helper', 'Helpful Hand', 'সাহায্যকারী', 'Answer 10 questions', '১০টি প্রশ্নের উত্তর দিন', 'social', 'heart', 200, 'answer_count', '10'),
  ('early-bird', 'Early Bird', 'প্রাথমিক পাখি', 'Join DAKKHO in first month', 'প্রথম মাসে DAKKHO-তে যোগ দিন', 'special', 'sunrise', 25, 'early_joiner', '1'),
  ('certified', 'Certified Learner', 'প্রত্যয়িত শিক্ষার্থী', 'Earn your first certificate', 'প্রথম সার্টিফিকেট অর্জন করুন', 'learning', 'award', 100, 'certificate_count', '1');

-- ============================================================
-- ABOUT PAGE TABLES (Admin-managed content)
-- ============================================================

CREATE TABLE IF NOT EXISTS about_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  label TEXT NOT NULL,
  value TEXT NOT NULL,
  icon TEXT DEFAULT 'book-open',
  sort_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_about_stats_active ON about_stats(is_active);
CREATE INDEX IF NOT EXISTS idx_about_stats_order ON about_stats(sort_order);

CREATE TABLE IF NOT EXISTS about_team (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  avatar_url TEXT,
  icon TEXT DEFAULT 'users',
  sort_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_about_team_active ON about_team(is_active);
CREATE INDEX IF NOT EXISTS idx_about_team_order ON about_team(sort_order);

CREATE TABLE IF NOT EXISTS about_faq (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_about_faq_active ON about_faq(is_active);
CREATE INDEX IF NOT EXISTS idx_about_faq_order ON about_faq(sort_order);

-- Seed default admin users
-- Hash computed with SHA-256
INSERT OR IGNORE INTO users (id, email, full_name, role, password_hash, is_active, email_verified) VALUES
  ('admin-001', 'admin@dakkho.pro.bd', 'DAKKHO Admin', 'admin', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 1, 1),
  ('admin-002', 'himadrient@proton.me', 'DAKKHO Super Admin', 'super_admin', '1e93e5062e163f49c088f163cf93b702948533c8f905c8dcf24bf9156c0dfe03', 1, 1);

-- ============================================================
-- ABOUT PAGE SEED DATA
-- ============================================================

-- Seed about content (text, mission, contact)
INSERT OR IGNORE INTO app_config (key, value, description) VALUES
  ('about_content', '{"aboutText":"DAKKHO is Bangladesh''s premier online learning platform built exclusively for polytechnic students. We provide high-quality video courses aligned with the BTEB curriculum, covering all major technologies from Web Development and Electronics to Civil Engineering and Architecture. Our platform connects students with expert instructors from across the country, making quality technical education accessible regardless of location or financial background.","missionText":"To democratize technical education in Bangladesh by providing world-class learning experiences to every polytechnic student. We believe that geographical boundaries or financial constraints should never be barriers to quality education. Through technology, community, and dedicated instructors, we are building the future skilled workforce of Bangladesh.","contactEmail":"support@dakkho.com.bd","contactPhone1":"+8809638113227","contactPhone2":"+8801632373707","contactAddress":"Radhaballav Road near DPHE, Rangpur","missionValues":["Accessible Education","Quality Content","Student First","Innovation"]}', 'About page content (text, mission, contact)');

-- Seed about stats
INSERT OR IGNORE INTO about_stats (label, value, icon, sort_order, is_active) VALUES
  ('Courses', '50+', 'book-open', 1, 1),
  ('Students', '10K+', 'graduation-cap', 2, 1),
  ('Instructors', '50+', 'users', 3, 1),
  ('Institutes', '58', 'building-2', 4, 1);

-- Seed about team
INSERT OR IGNORE INTO about_team (name, role, icon, sort_order, is_active) VALUES
  ('Engr. Aminul Islam', 'Founder & CEO', 'graduation-cap', 1, 1),
  ('Dr. Nadia Rahman', 'Chief Academic Officer', 'book-open', 2, 1),
  ('Fahim Shahriar', 'Lead Developer', 'globe', 3, 1),
  ('Sumaiya Khan', 'Head of Content', 'sparkles', 4, 1);

-- Seed about FAQ
INSERT OR IGNORE INTO about_faq (question, answer, sort_order, is_active) VALUES
  ('What is DAKKHO?', 'DAKKHO is a comprehensive online learning platform designed specifically for polytechnic students in Bangladesh. We offer video courses, live sessions, assignments, and certifications aligned with the BTEB curriculum.', 1, 1),
  ('Is DAKKHO free to use?', 'Many courses on DAKKHO are completely free. Premium courses are available at affordable prices with financial aid options for deserving students. We believe quality education should be accessible to everyone.', 2, 1),
  ('How do I earn certificates?', 'Complete a course and pass all assignments with the required grade to earn a certificate. Certificates are digital and can be downloaded or shared directly from your profile.', 3, 1),
  ('Can I access courses offline?', 'Yes! You can download courses for offline viewing through our Downloads feature. Downloaded content is available without an internet connection for up to 30 days.', 4, 1),
  ('Who are the instructors?', 'Our instructors are experienced educators and industry professionals from polytechnic institutes across Bangladesh. They are vetted and trained to deliver high-quality, engaging content.', 5, 1),
  ('How do I get help if I am stuck?', 'Use the Discussion section to ask questions, join live Q&A sessions with instructors, or reach out to our support team via email or phone. We are here to help you succeed.', 6, 1);

-- ============================================================
-- SUPPORT TICKETS TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS support_tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id TEXT UNIQUE NOT NULL,
  user_id TEXT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  category TEXT NOT NULL,
  sub_category TEXT,
  priority TEXT DEFAULT 'medium',
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  attachments TEXT,
  detected_issue TEXT,
  status TEXT DEFAULT 'open',
  assigned_to TEXT,
  resolved_content TEXT,
  resolved_at TEXT,
  resolved_by TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_support_tickets_ticket_id ON support_tickets(ticket_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created ON support_tickets(created_at DESC);

CREATE TABLE IF NOT EXISTS support_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id TEXT NOT NULL,
  sender_type TEXT NOT NULL,
  sender_id TEXT,
  sender_name TEXT,
  message TEXT NOT NULL,
  attachments TEXT,
  source TEXT DEFAULT 'app',
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_support_messages_ticket_id ON support_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_support_messages_created ON support_messages(created_at ASC);

-- Seed support config
INSERT OR IGNORE INTO app_config (key, value, description) VALUES
  ('telegram_bot_token', 'SET_VIA_CLOUDFLARE_SECRET_OR_D1', 'Telegram bot token for support notifications'),
  ('telegram_chat_ids', '[]', 'Telegram chat IDs for support notifications (set via Admin Panel)'),
  ('support_email', 'support@dakkho.pro.bd', 'Support email address');

-- ============================================================
-- PERFORMANCE INDEXES FOR COMMON QUERIES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_enrollments_course_user ON enrollments(course_id, user_id);
CREATE INDEX IF NOT EXISTS idx_payments_course_status ON payments(course_id, status);
CREATE INDEX IF NOT EXISTS idx_payments_user_status ON payments(user_id, status);
CREATE INDEX IF NOT EXISTS idx_user_packages_user_active ON user_packages(user_id, status);
CREATE INDEX IF NOT EXISTS idx_videos_course_processing ON videos(course_id, processing_status);
CREATE INDEX IF NOT EXISTS idx_watch_history_user_course ON watch_history(user_id, course_id);
