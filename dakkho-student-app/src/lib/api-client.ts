// DAKKHO API Client — All calls go through Worker API
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ||
  'https://dakkho-admin-api.dakkho-admin.workers.dev';

const AUTH_TOKEN_KEY = 'dakkho_student_token';
const PENDING_TOKEN_KEY = 'dakkho_pending_verification_token';

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  // Check the main token first, then fall back to pending verification token
  // (used during signup flow before OTP verification is complete)
  return localStorage.getItem(AUTH_TOKEN_KEY) || localStorage.getItem(PENDING_TOKEN_KEY);
}

export function getPendingVerificationToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(PENDING_TOKEN_KEY);
}

export function setPendingVerificationToken(token: string): void {
  localStorage.setItem(PENDING_TOKEN_KEY, token);
}

export function clearPendingVerificationToken(): void {
  localStorage.removeItem(PENDING_TOKEN_KEY);
}

export function setAuthToken(token: string): void {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function clearAuthToken(): void {
  localStorage.removeItem(AUTH_TOKEN_KEY);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, { ...options, headers });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw { status: res.status, message: data.error || data.message || 'Request failed', ...data };
  }

  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, body: unknown) => request<T>(path, {
    method: 'POST', body: JSON.stringify(body),
  }),
  put: <T>(path: string, body: unknown) => request<T>(path, {
    method: 'PUT', body: JSON.stringify(body),
  }),
  delete: <T>(path: string, body?: unknown) => request<T>(path, {
    method: 'DELETE', body: body ? JSON.stringify(body) : undefined,
  }),
};

// ============ TYPE-SAFE API FUNCTIONS ============

export interface Institute {
  id: number;
  name: string;
  name_bn: string;
  division: string;
  district: string;
  eiin_number: string;
  type: string;
  is_active: number;
}

export interface Technology {
  id: number;
  name: string;
  name_bn: string;
  short_code: string;
  description: string;
  is_active: number;
}

export interface LiveClass {
  id: number;
  course_id: string;
  title: string;
  title_bn: string;
  description: string;
  instructor_id: string;
  technology_id: number;
  scheduled_at: string;
  duration_minutes: number;
  meeting_url: string;
  platform: string;
  status: string;
  recording_url: string;
}

export interface Event {
  id: number;
  title: string;
  title_bn: string;
  description: string;
  event_type: string;
  banner_url: string;
  start_date: string;
  end_date: string;
  is_featured: number;
}

export interface CoursePackage {
  id: number;
  course_id: string;
  package_type: string;
  price: number;
  duration_months: number;
  max_users: number;
  is_auto_assign: number;
  is_active: number;
}

export interface UserPackage {
  id: number;
  user_id: string;
  package_id: number;
  course_id: string;
  package_type: string;
  activated_at: string;
  expires_at: string;
  status: string;
  price: number;
  duration_months: number;
}

export interface PaymentConfig {
  id: number;
  gateway: string;
  is_active: number;
  instructions: string;
  instructions_bn: string;
  sandbox_mode: number;
}

export interface AuthResponse {
  success: boolean;
  token: string;
  userId?: string;
  user?: {
    id: string;
    name: string;
    email: string;
    instituteId: number | null;
    technology: string | null;
    emailVerified: boolean;
    packages: UserPackage[];
  };
  message?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  instituteId: number | null;
  technology: string | null;
  emailVerified: boolean;
  packages: UserPackage[];
}

// Auth
export const authApi = {
  signup: (data: { fullName: string; email: string; password: string; instituteId?: number; technology?: string }) =>
    api.post<AuthResponse>('/api/auth/signup', data),
  login: (data: { email: string; password: string }) =>
    api.post<AuthResponse>('/api/auth/login', data),
  logout: () =>
    api.post<{ success: boolean }>('/api/auth/logout', {}),
  me: () =>
    api.get<{ user: UserProfile }>('/api/auth/me'),
  verifyOTP: (data: { email: string; otp: string }) =>
    api.post<{ success: boolean; message: string }>('/api/auth/verify-otp', data),
  forgotPassword: (data: { email: string }) =>
    api.post<{ success: boolean; message: string }>('/api/auth/forgot-password', data),
  resetPassword: (data: { email: string; otp: string; newPassword: string }) =>
    api.post<{ success: boolean; message: string }>('/api/auth/reset-password', data),
  resendOTP: (data: { email: string }) =>
    api.post<{ success: boolean; message: string }>('/api/auth/resend-otp', data),
  updateProfile: (data: { fullName?: string; instituteId?: number; technology?: string; bio?: string; phone?: string; semester?: string; avatarUrl?: string }) =>
    api.put<{ success: boolean; user: UserProfile }>('/api/auth/profile', data),
};

// Institutes
export const instituteApi = {
  list: (params?: { division?: string; search?: string; page?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.division) query.set('division', params.division);
    if (params?.search) query.set('search', params.search);
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    const qs = query.toString();
    return api.get<{ institutes: Institute[]; total: number }>(`/api/institutes${qs ? `?${qs}` : ''}`);
  },
  get: (id: number) =>
    api.get<{ institute: Institute }>(`/api/institutes/${id}`),
  requestNew: (data: { institute_name: string; institute_name_bn?: string; division?: string; district?: string }) =>
    api.post<{ success: boolean; message: string }>('/api/institutes/requests', data),
  myRequests: () =>
    api.get<{ requests: any[] }>('/api/institutes/requests/mine'),
};

// Technologies
export const technologyApi = {
  list: () =>
    api.get<{ technologies: Technology[] }>('/api/technologies'),
};

// Events
export const eventApi = {
  list: () =>
    api.get<{ events: Event[] }>('/api/events'),
};

// Live Classes
export const liveClassApi = {
  list: () =>
    api.get<{ liveClasses: LiveClass[] }>('/api/live-classes'),
};

// Course Packages
export const packageApi = {
  list: (courseId: string) =>
    api.get<{ packages: CoursePackage[] }>(`/api/course-packages?courseId=${courseId}`),
  mine: () =>
    api.get<{ packages: UserPackage[] }>('/api/packages/mine'),
};

// Payments
export const paymentApi = {
  submit: (data: { package_id: number; trx_id: string; phone?: string; proof_url?: string }) =>
    api.post<{ success: boolean; message: string }>('/api/payments/submit', data),
  config: () =>
    api.get<{ paymentConfig: PaymentConfig[] }>('/api/config/payment'),
};

// Coupons
export const couponApi = {
  validate: (code: string) =>
    api.get<{ valid: boolean; coupon?: any; error?: string }>(`/api/coupons/validate?code=${code}`),
};

// Config
export const configApi = {
  get: () =>
    api.get<{ config: Record<string, any> }>('/api/config'),
};

// Push Notifications
export const pushApi = {
  register: (data: { push_token: string; device_type?: string; device_info?: string }) =>
    api.post<{ success: boolean }>('/api/push/register', data),
  unregister: (data: { push_token: string }) =>
    api.delete<{ success: boolean }>('/api/push/unregister', data),
};

// ============ COURSE / INSTRUCTOR / CATEGORY TYPES ============

export interface Course {
  id: string;
  title: string;
  slug: string;
  description: string;
  thumbnailUrl: string;
  categoryId: string;
  instructorId: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  language: string;
  duration: number;
  totalVideos: number;
  rating: number;
  totalReviews: number;
  totalStudents: number;
  isFeatured: boolean;
  tags: string[];
  price: number;
}

export interface Instructor {
  id: string;
  name: string;
  bio: string;
  avatarUrl: string;
  coverUrl: string;
  specialization: string;
  rating: number;
  totalStudents: number;
  totalCourses: number;
  socialLinks?: { platform: string; url: string }[];
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  color: string;
  courseCount: number;
}

export interface Video {
  id: string;
  title: string;
  slug: string;
  courseId: string;
  duration: number;
  order: number;
  isPreview: boolean;
  description: string;
}

// ============ D1 → TypeScript DATA MAPPERS ============
// D1 returns snake_case fields; our TypeScript types use camelCase.
// These mappers bridge the gap so the UI always gets the right shape.

/** Parse a string into a string array — handles comma-separated, JSON array, or single value */
function parseTags(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {}
    return value.split(',').map((s: string) => s.trim()).filter(Boolean);
  }
  return [];
}

/** Map a raw D1 course row → our Course interface */
function mapCourse(raw: Record<string, unknown>): Course {
  return {
    id: String(raw.id ?? ''),
    title: String(raw.title ?? ''),
    slug: String(raw.slug ?? ''),
    description: String(raw.description ?? ''),
    thumbnailUrl: String(raw.thumbnail_url ?? raw.thumbnailUrl ?? ''),
    categoryId: String(raw.category_id ?? raw.categoryId ?? ''),
    instructorId: String(raw.instructor_id ?? raw.instructorId ?? ''),
    level: (String(raw.level ?? 'beginner')) as Course['level'],
    language: String(raw.language ?? ''),
    duration: Number(raw.total_duration_minutes ?? raw.duration ?? 0),
    totalVideos: Number(raw.total_videos ?? raw.totalVideos ?? 0),
    rating: Number(raw.rating_avg ?? raw.rating ?? 0),
    totalReviews: Number(raw.rating_count ?? raw.totalReviews ?? 0),
    totalStudents: Number(raw.enrollment_count ?? raw.totalStudents ?? 0),
    isFeatured: Boolean(raw.is_featured ?? raw.isFeatured ?? false),
    tags: parseTags(raw.tags),
    price: Number(raw.price_bdt ?? raw.price ?? 0),
  };
}

/** Map a raw D1 instructor row → our Instructor interface */
function mapInstructor(raw: Record<string, unknown>): Instructor {
  return {
    id: String(raw.id ?? ''),
    name: String(raw.name ?? ''),
    bio: String(raw.bio ?? ''),
    avatarUrl: String(raw.avatar_url ?? raw.avatarUrl ?? ''),
    coverUrl: String(raw.banner_url ?? raw.coverUrl ?? ''),
    specialization: String(raw.specialization ?? ''),
    rating: Number(raw.rating_avg ?? raw.rating ?? 0),
    totalStudents: Number(raw.total_students ?? raw.totalStudents ?? 0),
    totalCourses: Number(raw.total_courses ?? raw.totalCourses ?? 0),
    socialLinks: raw.social_links
      ? (Array.isArray(raw.social_links) ? raw.social_links : parseTags(raw.social_links))
      : undefined,
  };
}

/** Map a raw D1 video row → our Video interface */
function mapVideo(raw: Record<string, unknown>): Video {
  return {
    id: String(raw.id ?? ''),
    title: String(raw.title ?? ''),
    slug: String(raw.slug ?? ''),
    courseId: String(raw.course_id ?? raw.courseId ?? ''),
    duration: Number(raw.duration_seconds ?? raw.duration ?? 0),
    order: Number(raw.sort_order ?? raw.order ?? 0),
    isPreview: Boolean(raw.is_preview ?? raw.isPreview ?? false),
    description: String(raw.description ?? ''),
  };
}

// ============ COURSE API ============
export const courseApi = {
  list: async (params?: { technology?: string; limit?: number; offset?: number; search?: string; level?: string }): Promise<{ courses: Course[]; total: number }> => {
    const query = new URLSearchParams();
    if (params?.technology) query.set('technology', params.technology);
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.offset) query.set('offset', String(params.offset));
    if (params?.search) query.set('search', params.search);
    if (params?.level) query.set('level', params.level);
    const qs = query.toString();
    const res = await api.get<{ courses: Record<string, unknown>[]; total: number }>(`/api/courses${qs ? `?${qs}` : ''}`);
    return { courses: res.courses.map(mapCourse), total: res.total };
  },
  get: async (id: string): Promise<{ course: Course; instructors: Instructor[] }> => {
    const res = await api.get<{ course: Record<string, unknown>; instructors?: Record<string, unknown>[] }>(`/api/courses/${id}`);
    const instructors = (res.instructors || []).map(mapInstructor);
    return { course: mapCourse(res.course), instructors };
  },
  videos: async (id: string): Promise<{ videos: Video[]; total: number }> => {
    const res = await api.get<{ videos: Record<string, unknown>[]; total: number }>(`/api/courses/${id}/videos`);
    return { videos: res.videos.map(mapVideo), total: res.total };
  },
};

// ============ INSTRUCTOR API ============
export const instructorApi = {
  list: async (params?: { search?: string; limit?: number; offset?: number }): Promise<{ instructors: Instructor[]; total: number }> => {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.offset) query.set('offset', String(params.offset));
    const qs = query.toString();
    const res = await api.get<{ instructors: Record<string, unknown>[]; total: number }>(`/api/instructors${qs ? `?${qs}` : ''}`);
    return { instructors: res.instructors.map(mapInstructor), total: res.total };
  },
  get: async (id: string): Promise<{ instructor: Instructor }> => {
    const res = await api.get<{ instructor: Record<string, unknown> }>(`/api/instructors/${id}`);
    return { instructor: mapInstructor(res.instructor) };
  },
  courses: async (id: string): Promise<{ courses: Course[] }> => {
    const res = await api.get<{ courses: Record<string, unknown>[] }>(`/api/instructors/${id}/courses`);
    return { courses: res.courses.map(mapCourse) };
  },
};

// ============ CATEGORY API ============
export const categoryApi = {
  list: async (): Promise<{ categories: Category[] }> => {
    // Categories may come from technologies in D1 or a dedicated categories table
    try {
      const res = await api.get<{ categories: Record<string, unknown>[] }>('/api/categories');
      return {
        categories: res.categories.map((c) => ({
          id: String(c.id ?? ''),
          name: String(c.name ?? ''),
          slug: String(c.slug ?? c.short_code ?? ''),
          icon: String(c.icon ?? ''),
          color: String(c.color ?? ''),
          courseCount: Number(c.course_count ?? c.courseCount ?? 0),
        })),
      };
    } catch {
      // Fallback: use technologies as categories
      const res = await technologyApi.list();
      return {
        categories: res.technologies.map((t) => ({
          id: String(t.id),
          name: t.name_bn || t.name,
          slug: t.short_code,
          icon: '',
          color: '',
          courseCount: 0,
        })),
      };
    }
  },
};

// ============ VIDEO STREAMING API ============
export const videoApi = {
  streamUrl: (key: string, bucket?: string) =>
    api.get<{ url: string }>(`/api/video/stream-url?key=${key}&bucket=${bucket || 'videos'}`),
};

// ============ SUPPORT / HELP DESK API ============

export interface SupportTicket {
  id: number;
  ticket_id: string;
  user_id: string | null;
  name: string | null;
  email: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  description: string | null;
  resolved_content: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupportMessage {
  id: number;
  ticket_id: string;
  sender_type: string;
  sender_name: string | null;
  message: string;
  attachments: string;
  source: string;
  created_at: string;
}

export const supportApi = {
  createTicket: async (data: {
    subject: string;
    category: string;
    priority: string;
    description: string;
    email: string;
    name?: string;
  }, files?: File[]): Promise<{ success: boolean; ticketId: string; message: string }> => {
    if (files && files.length > 0) {
      const formData = new FormData();
      formData.append('subject', data.subject);
      formData.append('category', data.category);
      formData.append('priority', data.priority);
      formData.append('description', data.description);
      formData.append('email', data.email);
      if (data.name) formData.append('name', data.name);
      files.forEach(f => formData.append('files', f));

      const url = `${API_BASE}/api/support/tickets`;
      const headers: Record<string, string> = {};
      const token = getAuthToken();
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(url, { method: 'POST', headers, body: formData });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw { status: res.status, message: errData.error || 'Failed to create ticket', ...errData };
      }
      return res.json();
    }
    return api.post('/api/support/tickets', data);
  },

  listTickets: (params: { email?: string; userId?: string }) => {
    const query = new URLSearchParams();
    if (params.email) query.set('email', params.email);
    if (params.userId) query.set('userId', params.userId);
    return api.get<{ tickets: SupportTicket[] }>(`/api/support/tickets?${query.toString()}`);
  },

  getTicket: (ticketId: string) =>
    api.get<{ ticket: SupportTicket; messages: SupportMessage[] }>(`/api/support/tickets/${ticketId}`),

  addMessage: async (ticketId: string, data: {
    message: string;
    name?: string;
    senderType?: string;
  }, files?: File[]): Promise<{ success: boolean }> => {
    if (files && files.length > 0) {
      const formData = new FormData();
      formData.append('message', data.message);
      if (data.name) formData.append('name', data.name);
      if (data.senderType) formData.append('senderType', data.senderType);
      files.forEach(f => formData.append('files', f));

      const url = `${API_BASE}/api/support/tickets/${ticketId}/messages`;
      const headers: Record<string, string> = {};
      const token = getAuthToken();
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(url, { method: 'POST', headers, body: formData });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw { status: res.status, message: errData.error || 'Failed to send message', ...errData };
      }
      return res.json();
    }
    return api.post(`/api/support/tickets/${ticketId}/messages`, data);
  },

  getAttachmentUrl: (key: string) =>
    `${API_BASE}/api/support/attachment-url?key=${encodeURIComponent(key)}`,
};

// ============ NOTIFICATION API ============
export interface ServerNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  category: string;
  actionUrl: string;
  read: boolean;
  createdAt: string;
}

export interface NotificationPreferences {
  pushEnabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  courseUpdates: { push: boolean; email: boolean };
  grades: { push: boolean; email: boolean };
  schedule: { push: boolean; email: boolean };
  payment: { push: boolean; email: boolean };
  promotions: { push: boolean; email: boolean };
  social: { push: boolean; email: boolean };
  system: { push: boolean; email: boolean };
}

export const notificationApi = {
  list: (params?: { limit?: number; offset?: number; unread?: boolean }) => {
    const query = new URLSearchParams();
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.offset) query.set('offset', String(params.offset));
    if (params?.unread) query.set('unread', 'true');
    const qs = query.toString();
    return api.get<{ notifications: ServerNotification[]; total: number }>(`/api/notifications${qs ? `?${qs}` : ''}`);
  },
  markRead: (id: string) =>
    api.put<{ success: boolean }>(`/api/notifications/${id}/read`, {}),
  markAllRead: () =>
    api.put<{ success: boolean }>('/api/notifications/read-all', {}),
  getSettings: () =>
    api.get<{ preferences: NotificationPreferences }>('/api/settings'),
  updateSettings: (prefs: NotificationPreferences) =>
    api.put<{ success: boolean }>('/api/settings', prefs),
};

// ============ WEB PUSH API ============
export const webPushApi = {
  getVapidKey: () =>
    api.get<{ publicKey: string }>('/api/push/vapid-key'),
  subscribe: (subscription: PushSubscriptionJSON) =>
    api.post<{ success: boolean }>('/api/push/subscribe', { subscription }),
};

// ============ WATCH HISTORY API ============
export interface WatchHistoryItem {
  id: string;
  videoId: string;
  videoTitle: string;
  courseId: string;
  courseName: string;
  watchedAt: string;
  progress: number;
  lastPosition: number;
  duration: number;
  videoThumbnail: string;
  courseThumbnail: string;
}

export const watchHistoryApi = {
  list: (params?: { limit?: number; offset?: number }) => {
    const query = new URLSearchParams();
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.offset) query.set('offset', String(params.offset));
    const qs = query.toString();
    return api.get<{ history: WatchHistoryItem[]; total: number; limit: number; offset: number }>(`/api/watch-history${qs ? `?${qs}` : ''}`);
  },
  upsert: (data: { videoId: string; videoTitle?: string; courseId?: string; progress?: number; lastPosition?: number; duration?: number }) =>
    api.post<{ success: boolean; id: string; action: string }>('/api/watch-history', data),
  clear: () =>
    api.delete<{ success: boolean; deleted: number }>('/api/watch-history'),
  remove: (id: string) =>
    api.delete<{ success: boolean }>(`/api/watch-history/${id}`),
};
