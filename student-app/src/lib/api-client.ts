// DAKKHO API Client — All calls go through Worker API
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ||
  'https://dakkho-admin-api.dakkho-admin.workers.dev';

const AUTH_TOKEN_KEY = 'dakkho_student_token';

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(AUTH_TOKEN_KEY);
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

// ============ HELPER FUNCTIONS ============
const apiGet = <T>(path: string) => api.get<T>(path);
const apiPut = <T>(path: string, body: unknown) => api.put<T>(path, body);
const getToken = getAuthToken;

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
    avatarUrl?: string;
    themeMode?: 'light' | 'dark' | 'system';
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
  avatarUrl?: string;
  themeMode?: 'light' | 'dark' | 'system';
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

// Courses
export const courseApi = {
  list: (params?: { technology?: string; limit?: number; offset?: number }) => {
    const query = new URLSearchParams();
    if (params?.technology) query.set('technology', params.technology);
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.offset) query.set('offset', String(params.offset));
    const qs = query.toString();
    return api.get<{ courses: any[]; total: number }>(`/api/courses${qs ? `?${qs}` : ''}`);
  },
  get: (id: string) =>
    api.get<{ course: any }>(`/api/courses/${id}`),
  videos: (id: string) =>
    api.get<{ videos: any[]; total: number }>(`/api/courses/${id}/videos`),
};

// Instructors
export const instructorApi = {
  list: (params?: { search?: string; limit?: number; offset?: number }) => {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.offset) query.set('offset', String(params.offset));
    const qs = query.toString();
    return api.get<{ instructors: any[]; total: number }>(`/api/instructors${qs ? `?${qs}` : ''}`);
  },
  get: (id: string) =>
    api.get<{ instructor: any }>(`/api/instructors/${id}`),
};

// Video Streaming
export const videoApi = {
  streamUrl: (key: string, bucket?: string) =>
    api.get<{ url: string }>(`/api/video/stream-url?key=${key}&bucket=${bucket || 'videos'}`),
};

// ─── Student Profile & Stats ───
export const studentProfileApi = {
  stats: () => apiGet<{ stats: { coursesEnrolled: number; hoursWatched: number; certificates: number; currentStreak: number }; profile: { phone: string; bio: string; semester: string; avatarUrl: string } }>('/api/student/profile/stats'),
  update: (data: { name?: string; phone?: string; bio?: string; semester?: string; technology?: string; instituteId?: string }) => apiPut<{ success: boolean; updated: Record<string, unknown> }>('/api/student/profile', data),
  uploadAvatar: async (file: File): Promise<{ success: boolean; avatarUrl: string }> => {
    const formData = new FormData();
    formData.append('avatar', file);
    const response = await fetch(`${API_BASE}/api/student/upload-avatar`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${getToken()}` },
      body: formData,
    });
    if (!response.ok) throw new Error('Avatar upload failed');
    return response.json();
  },
};

// ─── Student Notifications ───
export const studentNotificationsApi = {
  list: (params?: { limit?: number; offset?: number; unread?: boolean }) => {
    const query = new URLSearchParams();
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.offset) query.set('offset', String(params.offset));
    if (params?.unread) query.set('unread', 'true');
    return apiGet<{ notifications: Array<{ id: string; title: string; message: string; type: string; actionUrl: string; read: boolean; createdAt: string }>; total: number }>(`/api/student/notifications?${query.toString()}`);
  },
  markRead: (id: string) => apiPut<{ success: boolean }>(`/api/student/notifications/${id}/read`, {}),
  markAllRead: () => apiPut<{ success: boolean; count: number }>('/api/student/notifications/read-all', {}),
};

// ─── Student Leaderboard ───
export const leaderboardApi = {
  get: (params?: { technology?: string; period?: string; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.technology) query.set('technology', params.technology);
    if (params?.period) query.set('period', params.period);
    if (params?.limit) query.set('limit', String(params.limit));
    return apiGet<{ entries: Array<{ rank: number; userId: string; name: string; technology: string; xp: number; breakdown: { video: number; quiz: number; assignment: number; streak: number }; activeDays: number }>; yourRank: number | null; yourXp: number; period: string }>(`/api/student/leaderboard?${query.toString()}`);
  },
};

// ─── Student Achievements ───
export const achievementsApi = {
  list: () => apiGet<{ achievements: Array<{ id: number; slug: string; name: string; nameBn: string | null; description: string; descriptionBn: string | null; category: string; icon: string; xp: number; unlocked: boolean; unlockedAt: string | null }>; totalXp: number; unlockedCount: number; totalCount: number }>('/api/student/achievements'),
};

// ─── Student Activity ───
export const activityApi = {
  list: (params?: { limit?: number; offset?: number; type?: string }) => {
    const query = new URLSearchParams();
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.offset) query.set('offset', String(params.offset));
    if (params?.type) query.set('type', params.type);
    return apiGet<{ activities: Array<{ id: number; type: string; resourceType: string; resourceId: string | null; title: string; description: string | null; metadata: Record<string, unknown>; createdAt: string }>; total: number }>(`/api/student/activity?${query.toString()}`);
  },
};

// ─── Student Settings ───
export const studentSettingsApi = {
  get: () => apiGet<{ preferences: Record<string, unknown> }>('/api/student/settings'),
  update: (preferences: Record<string, unknown>) => apiPut<{ success: boolean }>('/api/student/settings', preferences),
};

// ─── User Preferences (Theme, Privacy, Appearance) ───
export const userPreferencesApi = {
  get: () => apiGet<{ preferences: Record<string, unknown> }>('/api/student/preferences'),
  update: (preferences: Record<string, unknown>) => apiPut<{ success: boolean }>('/api/student/preferences', preferences),
};

// ─── Student Learning Stats ───
export const learningStatsApi = {
  get: (range?: string) => {
    const query = range ? `?range=${range}` : '';
    return apiGet<{ dailyData: Array<{ date: string; videos: number; activities: number }>; subjectProgress: Array<{ subject: string; progress: number }>; overview: { hoursWatched: number; coursesEnrolled: number; certificates: number; currentStreak: number }; range: string }>(`/api/student/learning-stats${query}`);
  },
};
