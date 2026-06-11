// ============================================================
// DAKKHO Admin — D1-Native Types (No Appwrite)
// All types use D1-compatible fields (id, created_at, updated_at)
// ============================================================

// ---- User Types ----
export interface User {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  bio?: string;
  instituteId?: number;
  instituteName?: string;
  technology?: string;
  technologyName?: string;
  semester?: number;
  avatarUrl?: string;
  role: 'student' | 'instructor' | 'admin';
  emailVerified: boolean;
  isActive: boolean;
  enrolledCourseIds?: string;
  createdAt: string;
  updatedAt: string;
}

// ---- Course Types ----
export interface Course {
  id: string;
  title: string;
  slug: string;
  description?: string;
  thumbnailUrl?: string;
  previewVideoUrl?: string;
  categoryId?: string;
  instructorId?: string;
  technologyId?: number;
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  language: 'bangla' | 'english' | 'hindi';
  duration: number;
  totalVideos: number;
  rating: number;
  totalReviews: number;
  totalStudents: number;
  price: number;
  isFeatured: boolean;
  isPublished: boolean;
  tags?: string;
  createdAt: string;
  updatedAt: string;
}

// ---- Video Types ----
export interface Video {
  id: string;
  title: string;
  slug: string;
  description?: string;
  courseId: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  duration: number;
  order: number;
  isPreview: boolean;
  isPublished: boolean;
  // Processing fields (from video protection pipeline)
  processingStatus?: string;
  hlsReady?: boolean;
  availableQualities?: string; // JSON string of quality array e.g. '["360p","720p"]'
  rawDeleted?: boolean;
  fileSizeOriginal?: number;
  fileSize360p?: number;
  fileSize720p?: number;
  fileSize1080p?: number;
  processingStartedAt?: string;
  processingCompletedAt?: string;
  processingError?: string;
  createdAt: string;
  updatedAt: string;
}

// ---- Instructor Types ----
export interface Instructor {
  id: string;
  name: string;
  email?: string;
  bio?: string;
  avatarUrl?: string;
  coverUrl?: string;
  specialization?: string;
  rating: number;
  totalStudents: number;
  totalCourses: number;
  socialLinks?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ---- Institute Types (D1) ----
export interface Institute {
  id: number;
  name: string;
  nameBn?: string;
  division?: string;
  district?: string;
  eiinNumber?: string;
  type: string;
  isRequested: number;
  requestedBy?: string;
  approvedBy?: string;
  approvedAt?: string;
  isActive: number;
  createdAt: string;
  updatedAt: string;
}

// ---- Technology Types (D1) ----
export interface Technology {
  id: number;
  name: string;
  nameBn?: string;
  shortCode?: string;
  description?: string;
  isActive: number;
  createdAt: string;
  updatedAt: string;
}

// ---- Institute Request Types (D1) ----
export interface InstituteRequest {
  id: number;
  userId: string;
  userEmail?: string;
  userName?: string;
  instituteName: string;
  instituteNameBn?: string;
  division?: string;
  district?: string;
  status: 'pending' | 'approved' | 'rejected';
  adminNote?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ---- Enrollment Types ----
export interface Enrollment {
  id: string;
  userId: string;
  courseId: string;
  progress: number;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

// ---- Subject Types ----
export interface Subject {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  color?: string;
  technologyId?: number;
  sortOrder: number;
  courseCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ---- Category Types ----
export interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  color?: string;
  parentId?: string;
  order?: number;
  courseCount?: number;
  createdAt: string;
  updatedAt: string;
}

// ---- Notification Types ----
export interface Notification {
  id: string;
  userId?: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'announcement' | 'course-update';
  isRead: boolean;
  actionUrl?: string;
  createdAt: string;
  updatedAt: string;
}

// ---- Discussion Types ----
export interface Discussion {
  id: string;
  title: string;
  body: string;
  courseId?: string;
  authorId: string;
  tags?: string;
  isAnswered: boolean;
  repliesCount: number;
  createdAt: string;
  updatedAt: string;
}

// ---- Bookmark Types ----
export interface Bookmark {
  id: string;
  userId: string;
  courseId: string;
  createdAt: string;
}

// ---- Watch Progress Types ----
export interface WatchProgress {
  id: string;
  userId: string;
  videoId: string;
  courseId: string;
  progress: number;
  lastPosition: number;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

// ---- User Settings Types ----
export interface UserSettings {
  id: string;
  userId: string;
  streamingQuality: 'low' | 'medium' | 'high' | 'original';
  downloadQuality: 'low' | 'medium' | 'high' | 'original';
  autoDownload: boolean;
  wifiOnly: boolean;
  dataSaverMode: boolean;
  pushNotifications: boolean;
  emailNotifications: boolean;
  themeMode: 'light' | 'dark' | 'system';
  appLanguage: string;
  profileVisibility: 'everyone' | 'friends' | 'private';
  createdAt: string;
  updatedAt: string;
}

// ---- Coupon Types (D1) ----
export interface Coupon {
  id: number;
  code: string;
  discountType: 'percentage' | 'flat';
  discountValue: number;
  maxDiscount?: number;
  minPurchase: number;
  usageLimit?: number;
  usageCount: number;
  perUserLimit: number;
  validFrom: string;
  validUntil: string;
  applicableCourses?: string;
  applicableTechnologies?: string;
  isActive: number;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

// ---- Discount Types (D1) ----
export interface Discount {
  id: number;
  name: string;
  nameBn?: string;
  description?: string;
  discountType: 'percentage' | 'flat';
  discountValue: number;
  applicableType: string;
  applicableIds?: string;
  validFrom: string;
  validUntil: string;
  isAutoApply: number;
  isActive: number;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

// ---- Event Types (D1) ----
export interface Event {
  id: number;
  title: string;
  titleBn?: string;
  description?: string;
  descriptionBn?: string;
  eventType: 'event' | 'special_day' | 'holiday' | 'exam' | 'workshop';
  bannerUrl?: string;
  startDate: string;
  endDate?: string;
  isFeatured: number;
  metadata?: string;
  isActive: number;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

// ---- Live Class Types (D1) ----
export interface LiveClass {
  id: number;
  courseId?: string;
  title: string;
  titleBn?: string;
  description?: string;
  instructorId?: string;
  technologyId?: number;
  scheduledAt: string;
  durationMinutes: number;
  meetingUrl?: string;
  platform: 'jitsi' | 'zoom' | 'meet' | 'other';
  status: 'scheduled' | 'live' | 'completed' | 'cancelled';
  recordingUrl?: string;
  isActive: number;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

// ---- Payment Types (D1) ----
export interface Payment {
  id: number;
  userId: string;
  packageId?: number;
  courseId?: string;
  amount: number;
  currency: string;
  gateway: string;
  gatewayTrxId?: string;
  gatewayPaymentId?: string;
  status: 'pending' | 'verified' | 'rejected' | 'refunded';
  proofUrl?: string;
  trxIdSubmitted?: string;
  phoneSubmitted?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  metadata?: string;
  createdAt: string;
  updatedAt: string;
}

// ---- Payment Config Types (D1) ----
export interface PaymentConfig {
  id: number;
  gateway: string;
  isActive: number;
  config: string;
  sandboxMode: number;
  instructions?: string;
  instructionsBn?: string;
  createdAt: string;
  updatedAt: string;
}

// ---- Course Package Types (D1) ----
export interface CoursePackage {
  id: number;
  courseId: string;
  packageType: 'basic' | 'standard' | 'premium';
  price: number;
  durationMonths: number;
  maxUsers: number;
  isAutoAssign: number;
  isActive: number;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

// ---- User Package Types (D1) ----
export interface UserPackage {
  id: number;
  userId: string;
  packageId: number;
  courseId: string;
  packageType: string;
  activatedAt: string;
  expiresAt: string;
  sharedWith?: string;
  status: 'active' | 'expired' | 'cancelled';
  createdAt: string;
}

// ---- Achievement Definition Types (D1) ----
export interface AchievementDefinition {
  id: number;
  slug: string;
  name: string;
  nameBn?: string;
  description: string;
  descriptionBn?: string;
  category: 'learning' | 'streaks' | 'social' | 'special';
  icon: string;
  xp: number;
  conditionType: string;
  conditionValue: string;
  isActive: number;
  createdAt: string;
}

// ---- Student Achievement Types (D1) ----
export interface StudentAchievement {
  id: number;
  userId: string;
  achievementId: number;
  unlockedAt: string;
}

// ---- Student Activity Types (D1) ----
export interface StudentActivity {
  id: number;
  userId: string;
  activityType: 'video_watch' | 'quiz_complete' | 'assignment_submit' | 'streak_bonus' | 'enrollment' | 'certificate';
  resourceType: string;
  resourceId?: string;
  title: string;
  description?: string;
  metadata?: string;
  createdAt: string;
}

// ---- Audit Log Types (D1) ----
export interface AuditLog {
  id: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  userId?: string;
  userEmail?: string;
  details?: string;
  ipAddress?: string;
  createdAt: string;
}

// ---- Notification Log Types (D1) ----
export interface NotificationLog {
  id: number;
  type: string;
  category: string;
  title?: string;
  message?: string;
  targetType?: string;
  targetId?: string;
  sentCount: number;
  failedCount: number;
  metadata?: string;
  createdBy?: string;
  createdAt: string;
}

// ---- Push Token Types (D1) ----
export interface PushToken {
  id: number;
  userId: string;
  pushToken: string;
  deviceType?: string;
  deviceInfo?: string;
  isActive: number;
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// Server Config Types
// ============================================================
export interface FeatureToggles {
  downloads: boolean;
  bookmarks: boolean;
  certificates: boolean;
  liveSessions: boolean;
  achievements: boolean;
  assignments: boolean;
  discussions: boolean;
  community: boolean;
  leaderboard: boolean;
  studyGroups: boolean;
  peerConnections: boolean;
  feedback: boolean;
  pricing: boolean;
  referral: boolean;
}

export interface HomePageSections {
  sections: string[];
}

export interface SidebarVisibility {
  menu: boolean;
  departments: boolean;
  semesters: boolean;
  exams: boolean;
  community: boolean;
  general: boolean;
}

export interface BottomNavTabs {
  tabs: { id: string; label: string; enabled: boolean; order: number }[];
}

export interface TopBarElements {
  search: boolean;
  notifications: boolean;
  avatar: boolean;
  hamburger: boolean;
}

export interface ContentProtection {
  enabled: boolean;
  noCopy: boolean;
  noRightClick: boolean;
  noScreenshot: boolean;
  noPrint: boolean;
  customContextMenu: boolean;
  watermark: boolean;
  dragProtection: boolean;
}

export interface ServerConfig {
  featureToggles: FeatureToggles;
  homePageSections: HomePageSections;
  sidebarVisibility: SidebarVisibility;
  bottomNavTabs: BottomNavTabs;
  topBarElements: TopBarElements;
  cardStyle: 'glass' | 'flat' | 'rounded';
  contentProtection: ContentProtection;
}

export const DEFAULT_CONFIG: ServerConfig = {
  featureToggles: {
    downloads: true,
    bookmarks: true,
    certificates: true,
    liveSessions: true,
    achievements: true,
    assignments: true,
    discussions: true,
    community: true,
    leaderboard: true,
    studyGroups: true,
    peerConnections: true,
    feedback: true,
    pricing: true,
    referral: true,
  },
  homePageSections: {
    sections: ['hero', 'continue-watching', 'categories', 'new-releases', 'live', 'trending', 'instructors', 'leaderboard', 'recommended'],
  },
  sidebarVisibility: {
    menu: true,
    departments: true,
    semesters: true,
    exams: true,
    community: true,
    general: true,
  },
  bottomNavTabs: {
    tabs: [
      { id: 'home', label: 'Home', enabled: true, order: 0 },
      { id: 'explore', label: 'Explore', enabled: true, order: 1 },
      { id: 'my-courses', label: 'My Courses', enabled: true, order: 2 },
      { id: 'watch-history', label: 'Watch History', enabled: true, order: 3 },
      { id: 'profile', label: 'Profile', enabled: true, order: 4 },
    ],
  },
  topBarElements: {
    search: true,
    notifications: true,
    avatar: true,
    hamburger: true,
  },
  cardStyle: 'glass',
  contentProtection: {
    enabled: true,
    noCopy: true,
    noRightClick: true,
    noScreenshot: true,
    noPrint: true,
    customContextMenu: true,
    watermark: false,
    dragProtection: true,
  },
};

// ============================================================
// Admin Auth Types
// ============================================================
export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

// ============================================================
// Dashboard Types
// ============================================================
export interface DashboardStats {
  totalUsers: number;
  totalCourses: number;
  totalVideos: number;
  totalEnrollments: number;
  activeSessions: number;
  newSignupsToday: number;
  totalRevenue: number;
  pendingPayments: number;
  activePackages: number;
  totalAchievements: number;
  trends?: Partial<Record<keyof DashboardStats, number>>;
}

// ============================================================
// Service Status Types
// ============================================================
export interface ServiceStatus {
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  latency?: number;
  message?: string;
}
