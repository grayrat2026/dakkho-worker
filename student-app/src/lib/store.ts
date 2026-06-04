import { create } from 'zustand';

// ============ PAGE TYPES ============
export type Page =
  // Auth
  | 'login' | 'signup' | 'forgot-password'
  // Main
  | 'home' | 'explore' | 'search' | 'notifications' | 'profile'
  // Course
  | 'course-detail' | 'video-player'
  | 'course-curriculum' | 'course-reviews' | 'course-qa' | 'course-announcements'
  | 'course-resources' | 'course-notes' | 'course-quizzes' | 'course-progress'
  // Instructor
  | 'instructors' | 'instructor-profile'
  | 'instructor-courses' | 'instructor-reviews' | 'instructor-schedule' | 'instructor-contact'
  // User pages
  | 'my-courses' | 'bookmarks' | 'settings' | 'help'
  | 'watch-history' | 'downloads' | 'certificates' | 'live-sessions'
  | 'achievements' | 'assignment' | 'discussion' | 'about'
  // Department pages
  | 'dept-cse' | 'dept-ete' | 'dept-eee' | 'dept-me' | 'dept-ce'
  | 'dept-architecture' | 'dept-textile' | 'dept-chemical' | 'dept-automobile' | 'dept-rac'
  | 'dept-glass-ceramic' | 'dept-printing' | 'dept-surveying' | 'dept-mechatronics' | 'dept-mining'
  | 'dept-metallurgical' | 'dept-power' | 'dept-instrumentation' | 'dept-food' | 'dept-leather'
  // Semester pages
  | 'semester-1' | 'semester-2' | 'semester-3' | 'semester-4'
  | 'semester-5' | 'semester-6' | 'semester-7' | 'semester-8'
  // Profile sub-pages
  | 'edit-profile' | 'change-password' | 'learning-stats' | 'subscription' | 'referral' | 'delete-account'
  // Settings sub-pages
  | 'settings-account' | 'settings-notifications' | 'settings-privacy'
  | 'settings-language' | 'settings-theme' | 'settings-downloads' | 'settings-content-protection' | 'settings-sessions'
  | 'settings-video-quality' | 'settings-download-settings' | 'settings-network-data'
  // Help sub-pages
  | 'faq' | 'contact-support' | 'report-issue' | 'terms-of-service' | 'privacy-policy' | 'refund-policy'
  // Exam pages
  | 'exam-prep' | 'exam-schedule' | 'exam-results' | 'exam-practice' | 'exam-tips'
  // Social/Community pages
  | 'leaderboard' | 'study-groups' | 'peer-connections' | 'community' | 'feedback' | 'roadmap'
  // Category
  | 'category'
  // Misc pages
  | 'pricing' | 'changelog' | 'maintenance' | 'terms' | 'privacy'
  // Error pages
  | 'error-404' | 'error-500';

// ============ URL MAPPING ============
// Maps page names to URL paths and vice versa
const pageToPath: Record<string, string> = {
  'home': '/',
  'login': '/login',
  'signup': '/signup',
  'forgot-password': '/forgot-password',
  'explore': '/explore',
  'search': '/search',
  'notifications': '/notifications',
  'profile': '/profile',
  'course-detail': '/course/detail',
  'video-player': '/video/play',
  'course-curriculum': '/course/curriculum',
  'course-reviews': '/course/reviews',
  'course-qa': '/course/qa',
  'course-announcements': '/course/announcements',
  'course-resources': '/course/resources',
  'course-notes': '/course/notes',
  'course-quizzes': '/course/quizzes',
  'course-progress': '/course/progress',
  'instructors': '/instructors',
  'instructor-profile': '/instructor/profile',
  'instructor-courses': '/instructor/courses',
  'instructor-reviews': '/instructor/reviews',
  'instructor-schedule': '/instructor/schedule',
  'instructor-contact': '/instructor/contact',
  'my-courses': '/my-courses',
  'bookmarks': '/bookmarks',
  'settings': '/settings',
  'help': '/help',
  'watch-history': '/watch-history',
  'downloads': '/downloads',
  'certificates': '/certificates',
  'live-sessions': '/live-sessions',
  'achievements': '/achievements',
  'assignment': '/assignment',
  'discussion': '/discussion',
  'about': '/about',
  'dept-cse': '/department/cse',
  'dept-ete': '/department/ete',
  'dept-eee': '/department/eee',
  'dept-me': '/department/me',
  'dept-ce': '/department/ce',
  'dept-architecture': '/department/architecture',
  'dept-textile': '/department/textile',
  'dept-chemical': '/department/chemical',
  'dept-automobile': '/department/automobile',
  'dept-rac': '/department/rac',
  'dept-glass-ceramic': '/department/glass-ceramic',
  'dept-printing': '/department/printing',
  'dept-surveying': '/department/surveying',
  'dept-mechatronics': '/department/mechatronics',
  'dept-mining': '/department/mining',
  'dept-metallurgical': '/department/metallurgical',
  'dept-power': '/department/power',
  'dept-instrumentation': '/department/instrumentation',
  'dept-food': '/department/food',
  'dept-leather': '/department/leather',
  'semester-1': '/semester/1',
  'semester-2': '/semester/2',
  'semester-3': '/semester/3',
  'semester-4': '/semester/4',
  'semester-5': '/semester/5',
  'semester-6': '/semester/6',
  'semester-7': '/semester/7',
  'semester-8': '/semester/8',
  'edit-profile': '/profile/edit',
  'change-password': '/profile/change-password',
  'learning-stats': '/profile/learning-stats',
  'subscription': '/profile/subscription',
  'referral': '/profile/referral',
  'delete-account': '/profile/delete-account',
  'settings-account': '/settings/account',
  'settings-notifications': '/settings/notifications',
  'settings-privacy': '/settings/privacy',
  'settings-language': '/settings/language',
  'settings-theme': '/settings/theme',
  'settings-downloads': '/settings/downloads',
  'settings-video-quality': '/settings/video-quality',
  'settings-download-settings': '/settings/download-settings',
  'settings-network-data': '/settings/network-data',
  'settings-content-protection': '/settings/content-protection',
  'settings-sessions': '/settings/sessions',
  'faq': '/help/faq',
  'contact-support': '/help/contact-support',
  'report-issue': '/help/report-issue',
  'terms-of-service': '/help/terms-of-service',
  'privacy-policy': '/help/privacy-policy',
  'refund-policy': '/help/refund-policy',
  'exam-prep': '/exam/prep',
  'exam-schedule': '/exam/schedule',
  'exam-results': '/exam/results',
  'exam-practice': '/exam/practice',
  'exam-tips': '/exam/tips',
  'leaderboard': '/community/leaderboard',
  'study-groups': '/community/study-groups',
  'peer-connections': '/community/peer-connections',
  'community': '/community',
  'feedback': '/community/feedback',
  'roadmap': '/community/roadmap',
  'category': '/category',
  'pricing': '/pricing',
  'changelog': '/changelog',
  'maintenance': '/maintenance',
  'terms': '/terms',
  'privacy': '/privacy',
  'error-404': '/error/404',
  'error-500': '/error/500',
};

// Reverse mapping: path → page name
const pathToPage: Record<string, string> = {};
for (const [page, path] of Object.entries(pageToPath)) {
  pathToPage[path] = page;
}

/** Convert a page name to a URL path, including dynamic params */
export function pageToUrl(page: string, params?: Record<string, unknown>): string {
  let path = pageToPath[page] || `/${page}`;

  // Append dynamic params as URL segments
  if (params) {
    const extraSegments: string[] = [];
    if (params.courseId) extraSegments.push(String(params.courseId));
    if (params.videoId) extraSegments.push(String(params.videoId));
    if (params.instructorId) extraSegments.push(String(params.instructorId));
    if (params.query) extraSegments.push(encodeURIComponent(String(params.query)));
    if (params.userId) extraSegments.push(String(params.userId));
    if (extraSegments.length > 0) {
      path += '/' + extraSegments.join('/');
    }
  }

  return path;
}

/** Convert a URL path back to a page name and params */
export function urlToPage(urlPath: string): { page: string; params: Record<string, string> } {
  // Normalize: remove trailing slash
  const normalized = urlPath.replace(/\/+$/, '') || '/';

  // Try exact match first
  const exactMatch = pathToPage[normalized];
  if (exactMatch) {
    return { page: exactMatch, params: {} };
  }

  // Try matching with dynamic segments
  // e.g., /course/detail/c1 → { page: 'course-detail', params: { courseId: 'c1' } }
  // e.g., /search/web%20dev → { page: 'search', params: { query: 'web dev' } }
  // e.g., /instructor/profile/ins1 → { page: 'instructor-profile', params: { instructorId: 'ins1' } }

  const segments = normalized.split('/').filter(Boolean);

  // Try progressively shorter paths
  for (let i = segments.length; i >= 1; i--) {
    const prefix = '/' + segments.slice(0, i).join('/');
    const match = pathToPage[prefix];
    if (match) {
      const extraSegments = segments.slice(i);
      const params: Record<string, string> = {};

      // Assign extra segments to known param keys based on page type
      if (match === 'course-detail' && extraSegments[0]) params.courseId = extraSegments[0];
      else if (match === 'video-player' && extraSegments[0]) params.videoId = extraSegments[0];
      else if (match === 'instructor-profile' && extraSegments[0]) params.instructorId = extraSegments[0];
      else if (match === 'search' && extraSegments[0]) params.query = decodeURIComponent(extraSegments[0]);
      else if (match === 'profile' && extraSegments[0]) params.userId = extraSegments[0];
      else {
        // Generic: store as param0, param1, etc.
        extraSegments.forEach((seg, idx) => {
          params[`param${idx}`] = seg;
        });
      }

      return { page: match, params };
    }
  }

  // No match found → 404
  return { page: 'error-404', params: {} };
}

// ============ NAVIGATION STORE ============
interface NavigationState {
  currentPage: Page;
  pageParams: Record<string, unknown>;
  navigate: (page: Page, params?: Record<string, unknown>) => void;
  goBack: () => void;
  history: Array<{ page: Page; params: Record<string, unknown> }>;
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  syncFromUrl: (urlPath: string) => void;
}

let isNavigatingProgrammatically = false;

export const useNavigationStore = create<NavigationState>((set, get) => ({
  currentPage: 'home',
  pageParams: {},
  history: [],
  sidebarOpen: false,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  navigate: (page, params = {}) => {
    const state = get();
    const url = pageToUrl(page, params);

    // Update browser URL
    if (typeof window !== 'undefined') {
      isNavigatingProgrammatically = true;
      window.history.pushState({ page, params }, '', url);
      // Reset the flag after a microtask
      queueMicrotask(() => { isNavigatingProgrammatically = false; });
    }

    set({
      currentPage: page,
      pageParams: params,
      history: [...state.history, { page: state.currentPage, params: state.pageParams }],
    });
  },
  goBack: () => {
    const state = get();
    if (typeof window !== 'undefined') {
      window.history.back();
    }
    if (state.history.length > 0) {
      const prev = state.history[state.history.length - 1];
      set({
        currentPage: prev.page,
        pageParams: prev.params,
        history: state.history.slice(0, -1),
      });
    }
  },
  syncFromUrl: (urlPath: string) => {
    const { page, params } = urlToPage(urlPath);
    if (page !== get().currentPage || JSON.stringify(params) !== JSON.stringify(get().pageParams)) {
      set({
        currentPage: page as Page,
        pageParams: params,
      });
    }
  },
}));

// ============ AUTH STORE ============
import { authApi, setAuthToken, clearAuthToken, getAuthToken } from './api-client';
import { technologyApi, instituteApi } from './api-client';

export interface User {
  id: string;
  fullName: string;
  email: string;
  institute?: string;
  instituteId?: number;
  technology?: string;
  avatarUrl?: string;
  role: string;
  isNewUser?: boolean;
  enrolledCourseIds?: string[];
  emailVerified?: boolean;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (data: { fullName: string; email: string; password: string; instituteId?: number; technology?: string }) => Promise<{ token: string; userId: string }>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  verifyOTP: (email: string, otp: string) => Promise<boolean>;
  resendOTP: (email: string) => Promise<void>;
  setUser: (user: User | null) => void;
  refreshUser: () => Promise<void>;
}

// ============ AUTH PERSISTENCE ============
const AUTH_STORAGE_KEY = 'dakkho-auth-session';

const loadAuthSession = (): { user: User | null; isAuthenticated: boolean } => {
  if (typeof window === 'undefined') return { user: null, isAuthenticated: false };
  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    const token = localStorage.getItem('dakkho_student_token');
    if (stored && token) {
      const parsed = JSON.parse(stored);
      if (parsed.expiresAt && Date.now() < parsed.expiresAt) {
        return { user: parsed.user, isAuthenticated: parsed.isAuthenticated };
      }
      localStorage.removeItem(AUTH_STORAGE_KEY);
      localStorage.removeItem('dakkho_student_token');
    }
  } catch {}
  return { user: null, isAuthenticated: false };
};

const saveAuthSession = (user: User | null, isAuthenticated: boolean) => {
  if (typeof window === 'undefined') return;
  try {
    if (isAuthenticated && user) {
      const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ user, isAuthenticated, expiresAt }));
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  } catch {}
};

const initialAuth = loadAuthSession();

export const useAuthStore = create<AuthState>((set, get) => ({
  user: initialAuth.user,
  isAuthenticated: initialAuth.isAuthenticated,
  isLoading: false,
  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const res = await authApi.login({ email, password });
      if (res.success && res.token) {
        setAuthToken(res.token);
        const user: User = {
          id: res.user?.id || '',
          fullName: res.user?.name || '',
          email: res.user?.email || email,
          instituteId: res.user?.instituteId || undefined,
          technology: res.user?.technology || undefined,
          emailVerified: res.user?.emailVerified || false,
          avatarUrl: '',
          role: 'student',
          isNewUser: false,
          enrolledCourseIds: [],
        };
        set({ user, isAuthenticated: true, isLoading: false });
        saveAuthSession(user, true);
      } else {
        throw new Error(res.message || 'Login failed');
      }
    } catch (err: any) {
      set({ isLoading: false });
      throw new Error(err.message || 'Invalid email or password');
    }
  },
  signup: async (data) => {
    set({ isLoading: true });
    try {
      const res = await authApi.signup({
        fullName: data.fullName,
        email: data.email,
        password: data.password,
        instituteId: data.instituteId,
        technology: data.technology,
      });
      if (res.success && res.token) {
        setAuthToken(res.token);
        const user: User = {
          id: res.userId || '',
          fullName: data.fullName,
          email: data.email,
          instituteId: data.instituteId,
          technology: data.technology,
          avatarUrl: '',
          role: 'student',
          isNewUser: true,
          emailVerified: false,
          enrolledCourseIds: [],
        };
        set({ user, isAuthenticated: true, isLoading: false });
        saveAuthSession(user, true);
        return { token: res.token, userId: res.userId || '' };
      } else {
        throw new Error(res.message || 'Signup failed');
      }
    } catch (err: any) {
      set({ isLoading: false });
      throw new Error(err.message || 'Signup failed. Please try again.');
    }
  },
  logout: async () => {
    try {
      await authApi.logout();
    } catch {}
    clearAuthToken();
    set({ user: null, isAuthenticated: false });
    saveAuthSession(null, false);
  },
  forgotPassword: async (email) => {
    set({ isLoading: true });
    try {
      await authApi.forgotPassword({ email });
    } catch (err: any) {
      throw new Error(err.message || 'Failed to send reset email');
    } finally {
      set({ isLoading: false });
    }
  },
  verifyOTP: async (email, otp) => {
    try {
      const res = await authApi.verifyOTP({ email, otp });
      if (res.success) {
        const user = get().user;
        if (user) {
          const updatedUser = { ...user, emailVerified: true };
          set({ user: updatedUser });
          saveAuthSession(updatedUser, true);
        }
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },
  resendOTP: async (email) => {
    try {
      await authApi.resendOTP({ email });
    } catch {}
  },
  setUser: (user) => {
    set({ user, isAuthenticated: !!user });
    saveAuthSession(user, !!user);
  },
  refreshUser: async () => {
    try {
      const token = getAuthToken();
      if (!token) return;
      const res = await authApi.me();
      if (res.user) {
        const user: User = {
          id: res.user.id,
          fullName: res.user.name,
          email: res.user.email,
          instituteId: res.user.instituteId || undefined,
          technology: res.user.technology || undefined,
          emailVerified: res.user.emailVerified,
          avatarUrl: '',
          role: 'student',
        };
        set({ user });
        saveAuthSession(user, true);
      }
    } catch {}
  },
}));

// ============ THEME STORE ============
interface ThemeState {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: 'light',
  toggleTheme: () => {
    const next = get().theme === 'light' ? 'dark' : 'light';
    set({ theme: next });
    if (next === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  },
}));

// ============ WATCH PROGRESS STORE ============
export interface WatchProgress {
  videoId: string;
  courseId: string;
  lastPosition: number;
  progress: number;
  completed: boolean;
  lastWatched: number;
}

interface WatchProgressState {
  progress: Record<string, WatchProgress>;
  updateProgress: (videoId: string, data: Partial<WatchProgress>) => void;
  getProgress: (videoId: string) => WatchProgress | undefined;
}

const loadProgress = (): Record<string, WatchProgress> => {
  if (typeof window === 'undefined') return {};
  try {
    const stored = localStorage.getItem('dakkho-watch-progress');
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
};

const saveProgress = (progress: Record<string, WatchProgress>) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('dakkho-watch-progress', JSON.stringify(progress));
  } catch {}
};

export const useWatchProgressStore = create<WatchProgressState>((set, get) => ({
  progress: loadProgress(),
  updateProgress: (videoId, data) => {
    const current = get().progress;
    const updated = {
      ...current,
      [videoId]: { ...current[videoId], videoId, ...data, lastWatched: Date.now() } as WatchProgress,
    };
    set({ progress: updated });
    saveProgress(updated);
  },
  getProgress: (videoId) => get().progress[videoId],
}));

// ============ BOOKMARK STORE ============
interface BookmarkState {
  bookmarks: string[];
  toggleBookmark: (courseId: string) => void;
  isBookmarked: (courseId: string) => boolean;
}

const loadBookmarks = (): string[] => {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem('dakkho-bookmarks');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveBookmarks = (bookmarks: string[]) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('dakkho-bookmarks', JSON.stringify(bookmarks));
  } catch {}
};

export const useBookmarkStore = create<BookmarkState>((set, get) => ({
  bookmarks: loadBookmarks(),
  toggleBookmark: (courseId) => {
    const current = get().bookmarks;
    const updated = current.includes(courseId)
      ? current.filter((id) => id !== courseId)
      : [...current, courseId];
    set({ bookmarks: updated });
    saveBookmarks(updated);
  },
  isBookmarked: (courseId) => get().bookmarks.includes(courseId),
}));

// ============ NOTIFICATION STORE ============
export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'announcement';
  isRead: boolean;
  createdAt: string;
  actionUrl?: string;
}

interface NotificationState {
  notifications: AppNotification[];
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  unreadCount: () => number;
  addNotification: (notification: AppNotification) => void;
  removeNotification: (id: string) => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  markAsRead: (id) => {
    set((s) => ({
      notifications: s.notifications.map((n) =>
        n.id === id ? { ...n, isRead: true } : n
      ),
    }));
  },
  markAllAsRead: () => {
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, isRead: true })),
    }));
  },
  unreadCount: () => get().notifications.filter((n) => !n.isRead).length,
  addNotification: (notification) => {
    set((s) => ({
      notifications: [notification, ...s.notifications],
    }));
  },
  removeNotification: (id) => {
    set((s) => ({
      notifications: s.notifications.filter((n) => n.id !== id),
    }));
  },
}));

// ============ SEARCH STORE ============
interface SearchState {
  query: string;
  recentSearches: string[];
  setQuery: (q: string) => void;
  addRecentSearch: (q: string) => void;
  clearRecentSearches: () => void;
}

const loadRecent = (): string[] => {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem('dakkho-recent-searches');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveRecent = (searches: string[]) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('dakkho-recent-searches', JSON.stringify(searches));
  } catch {}
};

export const useSearchStore = create<SearchState>((set, get) => ({
  query: '',
  recentSearches: loadRecent(),
  setQuery: (q) => set({ query: q }),
  addRecentSearch: (q) => {
    if (!q.trim()) return;
    const current = get().recentSearches.filter((s) => s !== q);
    const updated = [q, ...current].slice(0, 10);
    set({ recentSearches: updated });
    saveRecent(updated);
  },
  clearRecentSearches: () => {
    set({ recentSearches: [] });
    saveRecent([]);
  },
}));

// ============ CONTENT PROTECTION STORE ============
interface ContentProtectionState {
  enabled: boolean;
  noCopy: boolean;
  noRightClick: boolean;
  noScreenshot: boolean;
  noPrint: boolean;
  customContextMenu: boolean;
  watermark: boolean;
  dragProtection: boolean;
  setEnabled: (v: boolean) => void;
  setNoCopy: (v: boolean) => void;
  setNoRightClick: (v: boolean) => void;
  setNoScreenshot: (v: boolean) => void;
  setNoPrint: (v: boolean) => void;
  setCustomContextMenu: (v: boolean) => void;
  setWatermark: (v: boolean) => void;
  setDragProtection: (v: boolean) => void;
}

export const useContentProtectionStore = create<ContentProtectionState>((set) => ({
  enabled: true,
  noCopy: false,
  noRightClick: false,
  noScreenshot: false,
  noPrint: true,
  customContextMenu: true,
  watermark: false,
  dragProtection: true,
  setEnabled: (v) => set({ enabled: v }),
  setNoCopy: (v) => set({ noCopy: v }),
  setNoRightClick: (v) => set({ noRightClick: v }),
  setNoScreenshot: (v) => set({ noScreenshot: v }),
  setNoPrint: (v) => set({ noPrint: v }),
  setCustomContextMenu: (v) => set({ customContextMenu: v }),
  setWatermark: (v) => set({ watermark: v }),
  setDragProtection: (v) => set({ dragProtection: v }),
}));

// ============ SERVER CONFIG STORE ============
export interface ContentProtectionConfig {
  enabled: boolean;
  noCopy: boolean;
  noRightClick: boolean;
  noScreenshot: boolean;
  noPrint: boolean;
  customContextMenu: boolean;
  watermark: boolean;
  dragProtection: boolean;
}

export interface FeaturesConfig {
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

export interface UIConfig {
  homeSections: string[];
  sidebarSections: Record<string, boolean>;
  bottomNavTabs: string[];
  topBarElements: {
    search: boolean;
    notifications: boolean;
    avatar: boolean;
    hamburger: boolean;
  };
  cardStyle: 'glass' | 'flat' | 'rounded';
}

export interface ServerConfig {
  contentProtection: ContentProtectionConfig;
  features: FeaturesConfig;
  ui: UIConfig;
}

interface ServerConfigState {
  config: ServerConfig | null;
  isLoading: boolean;
  error: string | null;
  fetchConfig: () => Promise<void>;
  isFeatureEnabled: (feature: string) => boolean;
  isHomeSectionVisible: (section: string) => boolean;
  isSidebarSectionVisible: (section: string) => boolean;
  isBottomNavTabVisible: (tab: string) => boolean;
  isTopBarElementVisible: (element: string) => boolean;
}

const DEFAULT_CONFIG: ServerConfig = {
  contentProtection: {
    enabled: true, noCopy: true, noRightClick: true,
    noScreenshot: true, noPrint: true, customContextMenu: true,
    watermark: false, dragProtection: true,
  },
  features: {
    downloads: true, bookmarks: true, certificates: true,
    liveSessions: true, achievements: true, assignments: true,
    discussions: true, community: true, leaderboard: true,
    studyGroups: true, peerConnections: true, feedback: true,
    pricing: true, referral: true,
  },
  ui: {
    homeSections: ['hero', 'continue-watching', 'categories', 'new-releases', 'live', 'trending', 'instructors', 'leaderboard', 'recommended'],
    sidebarSections: { menu: true, departments: true, semesters: true, exams: true, community: true, general: true },
    bottomNavTabs: ['home', 'explore', 'my-courses', 'watch-history', 'profile'],
    topBarElements: { search: true, notifications: true, avatar: true, hamburger: true },
    cardStyle: 'glass',
  },
};

export const useServerConfigStore = create<ServerConfigState>((set, get) => ({
  config: null,
  isLoading: false,
  error: null,

  fetchConfig: async () => {
    set({ isLoading: true, error: null });
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://dakkho-admin-api.dakkho-admin.workers.dev';
      const res = await fetch(`${API_BASE}/api/config`);
      if (!res.ok) throw new Error('Failed to fetch config');
      const data = await res.json();
      set({ config: data.config || data, isLoading: false });
    } catch (error: any) {
      console.error('Failed to fetch server config:', error);
      set({ config: DEFAULT_CONFIG, isLoading: false, error: error.message });
    }
  },

  isFeatureEnabled: (feature: string) => {
    const config = get().config || DEFAULT_CONFIG;
    return (config.features as Record<string, boolean>)[feature] ?? true;
  },

  isHomeSectionVisible: (section: string) => {
    const config = get().config || DEFAULT_CONFIG;
    return config.ui.homeSections.includes(section);
  },

  isSidebarSectionVisible: (section: string) => {
    const config = get().config || DEFAULT_CONFIG;
    return config.ui.sidebarSections[section] ?? true;
  },

  isBottomNavTabVisible: (tab: string) => {
    const config = get().config || DEFAULT_CONFIG;
    return config.ui.bottomNavTabs.includes(tab);
  },

  isTopBarElementVisible: (element: string) => {
    const config = get().config || DEFAULT_CONFIG;
    return (config.ui.topBarElements as Record<string, boolean>)[element] ?? true;
  },
}));
