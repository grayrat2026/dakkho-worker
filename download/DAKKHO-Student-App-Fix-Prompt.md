# DAKKHO Student App — সম্পূর্ণ ফিক্স প্রম্পট

## প্রজেক্ট কনটেক্সট

তুমি DAKKHO — Bangladesh's Premier Polytechnic Student Streaming Platform এর ফুল-স্ট্যাক ডেভেলপার। এই প্রজেক্টে 3টি মূল অংশ আছে:

1. **Admin Panel** — Next.js 16 App Router, Dark Glassmorphism Theme, Cloudflare Pages
   - URL: `https://dakkho-admin.pages.dev/`
   - Config Page: `https://dakkho-admin.pages.dev/config/`
   
2. **Worker API** — Cloudflare Workers + Hono Router, D1 Database, R2 Storage
   - URL: `https://dakkho-admin-api.dakkho-admin.workers.dev/`
   
3. **Student App** — Next.js 16 App Router, Light Glassmorphism Theme, Static Export (`output: 'export'`)
   - URL: `https://dakkhostudent.pages.dev/` (or `dakkho.pro.bd`)

---

## বর্তমান সমস্যাগুলো (Comprehensive Gap Analysis)

### 🔴 CRITICAL — অবিলম্বে ঠিক করতে হবে

#### Problem 1: Worker-এ `/api/config` Public Endpoint নেই
- **Admin Config Page** (`/admin/config`) এ Admin লগইন করে config save করে → D1 `app_config` table এ 7টি key-value pair সেভ হয়
- **Student App** এর `useServerConfigStore.fetchConfig()` → `${API_BASE}/api/config` কল করে
- **কিন্তু Worker-এ `/api/config` route ই নেই!** Config route শুধু `/admin/config` এ মাউন্ট করা (admin auth লাগে)
- **ফলাফল**: Student App 404 পায়, DEFAULT_CONFIG ব্যবহার করে → Admin যা config করে তা Student App-এ প্রভাব ফেলে না

#### Problem 2: ServerConfig Format Mismatch (Worker vs Student App)
**Worker format** (`/worker/src/lib/types.ts`):
```typescript
interface ServerConfig {
  featureToggles: FeatureToggles;        // 14 boolean features
  homePageSections: { sections: string[] }; // wrapped in .sections
  sidebarVisibility: SidebarVisibility;   // {menu, departments, semesters, exams, community, general}
  bottomNavTabs: { tabs: {id, label, enabled, order}[] }; // object array
  topBarElements: TopBarElements;         // {search, notifications, avatar, hamburger}
  cardStyle: 'glass' | 'flat' | 'rounded';
  contentProtection: ContentProtection;   // 8 boolean flags
}
```

**Student App format** (`/dakkho-student-app/src/lib/store.ts`):
```typescript
interface ServerConfig {
  contentProtection: ContentProtectionConfig;
  features: FeaturesConfig;               // ← Worker এ 'featureToggles', Student এ 'features'
  ui: UIConfig;                           // ← Worker এ flat structure, Student এ nested 'ui'
}
interface UIConfig {
  homeSections: string[];                 // ← Worker: homePageSections.sections
  sidebarSections: Record<string, boolean>; // ← Worker: sidebarVisibility (different keys!)
  bottomNavTabs: string[];                // ← Worker: bottomNavTabs.tabs (object array!)
  topBarElements: { search, notifications, avatar, hamburger };
  cardStyle: 'glass' | 'flat' | 'rounded';
}
```

**মূল মিসম্যাচগুলো:**
| Concept | Worker Key | Student App Key | Issue |
|---------|-----------|-----------------|-------|
| Feature toggles | `featureToggles` | `features` | নাম আলাদা |
| Home sections | `homePageSections.sections` | `ui.homeSections` | nesting আলাদা |
| Sidebar visibility | `sidebarVisibility` (flat) | `ui.sidebarSections` | key names আলাদা (departments vs dept, semesters vs semester, exams vs exam, community vs social) |
| Bottom nav tabs | `bottomNavTabs.tabs[]` (object array) | `ui.bottomNavTabs` (string array) | সম্পূর্ণ ভিন্ন স্ট্রাকচার |
| Top bar | `topBarElements` | `ui.topBarElements` | nesting আলাদা |
| Card style | `cardStyle` | `ui.cardStyle` | nesting আলাদা |

#### Problem 3: Sidebar Section Key Mapping Mismatch
Student App Sidebar এই keys ব্যবহার করে:
- `'dept'` → Worker এ `'departments'`
- `'semester'` → Worker এ `'semesters'`
- `'exam'` → Worker এ `'exams'`
- `'social'` → Worker এ `'community'`

ফলে `isSidebarSectionVisible('dept')` → Worker data তে `sidebarVisibility.departments` check করা উচিত কিন্তু Student App `sidebarSections.dept` check করে।

#### Problem 4: BottomNav Tab Visibility Logic Broken
Student App `isBottomNavTabVisible(tab.page)` করে যেখানে `tab.page = 'home' | 'explore' | 'my-courses' | 'watch-history' | 'profile'`।
Worker `bottomNavTabs.tabs` হলো `{id, label, enabled, order}[]` — অবজেক্ট array।
Student App store `config.ui.bottomNavTabs.includes(tab)` check করে — string array তে includes! এটা কখনো match করবে না।

---

### 🟡 HIGH PRIORITY — দ্রুত ঠিক করতে হবে

#### Problem 5: Card Style Not Applied
Worker `cardStyle: 'glass' | 'flat' | 'rounded'` return করে কিন্তু Student App এর `GlassCard` component সবসময় glass style ব্যবহার করে। Config অনুযায়ী flat/rounded style apply হয় না।

#### Problem 6: Student Auth Routes Missing in Worker
Student App `authApi` এই endpoints কল করে:
- `POST /api/auth/signup` — ❌ Worker-এ নেই
- `POST /api/auth/login` — ❌ Worker-এ নেই
- `POST /api/auth/logout` — ❌ Worker-এ নেই
- `POST /api/auth/me` — ❌ Worker-এ নেই
- `POST /api/auth/verify-otp` — ❌ Worker-এ নেই
- `POST /api/auth/forgot-password` — ❌ Worker-এ নেই
- `POST /api/auth/resend-otp` — ❌ Worker-এ নেই

Worker-এ শুধু `/admin/auth` আছে (admin-only)। Student auth এর জন্য `student_sessions` D1 table আছে, `createStudentSession()` function আছে, কিন্তু HTTP routes নেই।

Student App-এ Appwrite SDK দিয়ে directly auth করার code আছে (`src/lib/appwrite.ts` এ `AuthService`) কিন্তু store.ts এ `authApi` Worker API কল করে। দুইটা পদ্ধতি মিলে না।

#### Problem 7: Course/Video/Instructor Routes Missing for Students
Student App এই endpoints কল করে যা Worker student-api.ts এ নেই:
- `GET /api/courses` — ❌ (exists at `/admin/courses` only)
- `GET /api/courses/:id` — ❌
- `GET /api/courses/:id/videos` — ❌
- `GET /api/video/stream-url` — ❌
- `GET /api/instructors` — ❌ (exists at `/admin/instructors` only)

#### Problem 8: Payment Config Route Missing
- `GET /api/config/payment` — ❌ Student App কল করে কিন্তু Worker-এ নেই
- `payment_config` D1 table আছে কিন্তু student-facing endpoint নেই

---

### 🟢 MEDIUM PRIORITY — পরে ঠিক করতে হবে

#### Problem 9: Mock Data Still Heavily Used
Student App-এ courses, instructors, videos, categories সব `src/lib/mock-data.ts` থেকে আসে। Worker API থেকে real data fetch হয় না। Pages like:
- `HomePage` → mock courses (COURSES)
- `NewReleases` → mock courses
- `ExplorePage` → mock data
- `SearchPage` → mock search functions
- `CourseDetailPage` → mock data
- `VideoPlayerPage` → mock data
- `InstructorsPage` → mock INSTRUCTORS array

#### Problem 10: Department Pages Static (18 individual pages)
18টা আলাদা department page আছে (CSEPage, EEEPage, MEPage, etc.) যেগুলো hardcoded content দেখায়। D1 তে 7টি technology আছে (CIVIL, CST, ELECTRICAL, EMED, ELEX, MECH, POWER) যেগুলো থেকে dynamic pages হওয়া উচিত।

#### Problem 11: Semester Pages Static (8 individual pages)
8টা আলাদা semester page আছে যেগুলো hardcoded content দেখায়। Worker API থেকে dynamic content আসা উচিত।

#### Problem 12: Old D1 Seed Data Not Cleaned
D1 `app_config` table এ 4টি OLD row আছে: `app_settings`, `streaming`, `notifications`, `features`। নতুন Admin Config page 7টি key সেভ করে (featureToggles, homePageSections, sidebarVisibility, bottomNavTabs, topBarElements, cardStyle, contentProtection)। পুরানো rows মুছে ফেলা দরকার।

#### Problem 13: Features Not Enforced in Pages
Student App এ feature toggle check আছে শুধু Sidebar এ। কিন্তু:
- `BookmarksPage` → `bookmarks` feature off হলে page accessible থাকে
- `DownloadsPage` → `downloads` feature off হলে page accessible থাকে
- `CertificatesPage` → `certificates` feature off হলে page accessible থাকে
- `LiveSessionsPage` → `liveSessions` feature off হলে page accessible থাকে
- `AchievementsPage` → `achievements` feature off হলে page accessible থাকে
- `AssignmentPage` → `assignments` feature off হলে page accessible থাকে
- `DiscussionPage` → `discussions` feature off হলে page accessible থাকে
- `LeaderboardPage` → `leaderboard` feature off হলে page accessible থাকে
- `StudyGroupsPage` → `studyGroups` feature off হলে page accessible থাকে
- `PeerConnectionsPage` → `peerConnections` feature off হলে page accessible থাকে
- `CommunityPage` → `community` feature off হলে page accessible থাকে
- `FeedbackPage` → `feedback` feature off হলে page accessible থাকে
- `PricingPage` → `pricing` feature off হলে page accessible থাকে
- `ReferralPage` → `referral` feature off হলে page accessible থাকে

Feature disabled হলে সেই page-এ "This feature is not available" message দেখানো উচিত বা navigate block করা উচিত।

#### Problem 14: ContentProtection Store Duplication
Student App এ `useContentProtectionStore` (local settings) এবং `useServerConfigStore.config.contentProtection` (server-driven) দুটো আলাদা source আছে। `ContentProtection.tsx` component শুধু server config ব্যবহার করে — এটা সঠিক, কিন্তু local store টা dead code।

---

## ফিক্স প্ল্যান (Step-by-Step)

### Step 1: Worker-এ Public `/api/config` Endpoint যোগ করো
**File**: `/worker/src/routes/student-api.ts`

নিচের route যোগ করো (PUBLIC — কোনো auth লাগবে না):

```typescript
// GET /config — Public config for Student App (no auth)
studentApiRoutes.get('/config', async (c) => {
  try {
    // Try KV cache first
    const cachedConfig = await c.env.KV_CONFIG.get('server_config', 'json');
    if (cachedConfig) {
      return c.json({ config: cachedConfig });
    }

    // Fall back to D1
    const { results } = await c.env.DB.prepare(
      'SELECT key, value FROM app_config'
    ).all<{ key: string; value: string }>();

    const configMap: Record<string, unknown> = {};
    for (const row of results) {
      try {
        configMap[row.key] = JSON.parse(row.value);
      } catch {
        configMap[row.key] = row.value;
      }
    }

    // Build ServerConfig with defaults
    const config = {
      featureToggles: { ...DEFAULT_CONFIG.featureToggles, ...(configMap.featureToggles as any) },
      homePageSections: (configMap.homePageSections as any) || DEFAULT_CONFIG.homePageSections,
      sidebarVisibility: { ...DEFAULT_CONFIG.sidebarVisibility, ...(configMap.sidebarVisibility as any) },
      bottomNavTabs: (configMap.bottomNavTabs as any) || DEFAULT_CONFIG.bottomNavTabs,
      topBarElements: { ...DEFAULT_CONFIG.topBarElements, ...(configMap.topBarElements as any) },
      cardStyle: (configMap.cardStyle as any) || DEFAULT_CONFIG.cardStyle,
      contentProtection: { ...DEFAULT_CONFIG.contentProtection, ...(configMap.contentProtection as any) },
    };

    return c.json({ config });
  } catch (error) {
    return c.json({ config: DEFAULT_CONFIG });
  }
});
```

Import যোগ করো: `import { DEFAULT_CONFIG } from '../lib/types';`

### Step 2: Student App `useServerConfigStore` ঠিক করো — Worker Format-এ Read করো
**File**: `/dakkho-student-app/src/lib/store.ts`

ServerConfig interface এবং সব helper functions পুরোপুরি Worker format-এ match করাও:

```typescript
// ============ SERVER CONFIG STORE ============
// MUST match Worker's ServerConfig type from /worker/src/lib/types.ts

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

export interface BottomNavTab {
  id: string;
  label: string;
  enabled: boolean;
  order: number;
}

export interface BottomNavTabs {
  tabs: BottomNavTab[];
}

export interface TopBarElements {
  search: boolean;
  notifications: boolean;
  avatar: boolean;
  hamburger: boolean;
}

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

export interface ServerConfig {
  featureToggles: FeatureToggles;
  homePageSections: HomePageSections;
  sidebarVisibility: SidebarVisibility;
  bottomNavTabs: BottomNavTabs;
  topBarElements: TopBarElements;
  cardStyle: 'glass' | 'flat' | 'rounded';
  contentProtection: ContentProtectionConfig;
}

const DEFAULT_CONFIG: ServerConfig = {
  featureToggles: {
    downloads: true, bookmarks: true, certificates: true,
    liveSessions: true, achievements: true, assignments: true,
    discussions: true, community: true, leaderboard: true,
    studyGroups: true, peerConnections: true, feedback: true,
    pricing: true, referral: true,
  },
  homePageSections: {
    sections: ['hero', 'continue-watching', 'categories', 'new-releases', 'live', 'trending', 'instructors', 'leaderboard', 'recommended'],
  },
  sidebarVisibility: {
    menu: true, departments: true, semesters: true,
    exams: true, community: true, general: true,
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
    search: true, notifications: true, avatar: true, hamburger: true,
  },
  cardStyle: 'glass',
  contentProtection: {
    enabled: true, noCopy: true, noRightClick: true,
    noScreenshot: true, noPrint: true, customContextMenu: true,
    watermark: false, dragProtection: true,
  },
};

interface ServerConfigState {
  config: ServerConfig | null;
  isLoading: boolean;
  error: string | null;
  fetchConfig: () => Promise<void>;
  isFeatureEnabled: (feature: string) => boolean;
  isHomeSectionVisible: (section: string) => boolean;
  isSidebarSectionVisible: (section: string) => boolean;
  isBottomNavTabVisible: (tabId: string) => boolean;
  isTopBarElementVisible: (element: string) => boolean;
  getCardStyle: () => 'glass' | 'flat' | 'rounded';
}

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
      const config: ServerConfig = data.config || data;
      set({ config, isLoading: false });
    } catch (error: any) {
      console.error('Failed to fetch server config:', error);
      set({ config: DEFAULT_CONFIG, isLoading: false, error: error.message });
    }
  },

  isFeatureEnabled: (feature: string) => {
    const config = get().config || DEFAULT_CONFIG;
    return (config.featureToggles as Record<string, boolean>)[feature] ?? true;
  },

  isHomeSectionVisible: (section: string) => {
    const config = get().config || DEFAULT_CONFIG;
    return config.homePageSections.sections.includes(section);
  },

  isSidebarSectionVisible: (section: string) => {
    const config = get().config || DEFAULT_CONFIG;
    // Map Student App section keys to Worker keys
    const keyMap: Record<string, string> = {
      'dept': 'departments',
      'semester': 'semesters',
      'exam': 'exams',
      'social': 'community',
      'menu': 'menu',
      'general': 'general',
    };
    const workerKey = keyMap[section] || section;
    return (config.sidebarVisibility as Record<string, boolean>)[workerKey] ?? true;
  },

  isBottomNavTabVisible: (tabId: string) => {
    const config = get().config || DEFAULT_CONFIG;
    const tab = config.bottomNavTabs.tabs.find(t => t.id === tabId);
    return tab ? tab.enabled : true;
  },

  isTopBarElementVisible: (element: string) => {
    const config = get().config || DEFAULT_CONFIG;
    return (config.topBarElements as Record<string, boolean>)[element] ?? true;
  },

  getCardStyle: () => {
    const config = get().config || DEFAULT_CONFIG;
    return config.cardStyle;
  },
}));
```

### Step 3: Sidebar Component ঠিক করো — Config-Driven Filtering
**File**: `/dakkho-student-app/src/components/dakkho/shared/Sidebar.tsx`

Sidebar-এ `isSidebarSectionVisible()` কলগুলো ঠিক করো (key mapping ঠিক হয়ে যাবে Step 2 থেকে):

```tsx
// এইগুলো ইতোমধ্যে আছে, শুধু confirm করো ঠিক আছে:
{isSidebarSectionVisible('dept') && renderCollapsibleSection('dept', 'Departments', deptItems, 0.3)}
{isSidebarSectionVisible('semester') && renderCollapsibleSection('semester', 'Semesters', semesterItems, 0.4)}
{isSidebarSectionVisible('exam') && renderCollapsibleSection('exam', 'Exams', examItems, 0.5)}
{isSidebarSectionVisible('social') && renderCollapsibleSection('social', 'Community', filteredSocialItems, 0.6)}
```

এছাড়া sidebar-এ `menu` section visibility check যোগ করো:
```tsx
{isSidebarSectionVisible('menu') && (
  <>
    <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">Menu</p>
    {filteredMenuItems.map(...)}
  </>
)}
```

এবং `general` section:
```tsx
{isSidebarSectionVisible('general') && (
  <>
    <p className="px-3 py-2 mt-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">General</p>
    {generalItems.map(...)}
  </>
)}
```

### Step 4: BottomNav Component ঠিক করো
**File**: `/dakkho-student-app/src/components/dakkho/shared/BottomNav.tsx`

`isBottomNavTabVisible` এখন `tabId` string নেয় (page name), Worker `bottomNavTabs.tabs[].id` ম্যাচ করে:

```tsx
// Change from:
const visibleTabs = tabs.filter((tab) => isBottomNavTabVisible(tab.page));
// To:
const visibleTabs = tabs.filter((tab) => isBottomNavTabVisible(tab.page));
// This should work now since tab.page = 'home', 'explore', 'my-courses', etc.
// which matches Worker's tab.id values
```

এছাড়া tab order sorting যোগ করো:
```tsx
const config = useServerConfigStore((s) => s.config);
const sortedTabs = [...tabs].sort((a, b) => {
  const orderA = config?.bottomNavTabs.tabs.find(t => t.id === a.page)?.order ?? 0;
  const orderB = config?.bottomNavTabs.tabs.find(t => t.id === b.page)?.order ?? 0;
  return orderA - orderB;
});
const visibleTabs = sortedTabs.filter((tab) => isBottomNavTabVisible(tab.page));
```

### Step 5: GlassCard-এ CardStyle Apply করো
**File**: `/dakkho-student-app/src/components/dakkho/shared/GlassCard.tsx`

```tsx
'use client';

import { motion, type HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useServerConfigStore } from '@/lib/store';

interface GlassCardProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export function GlassCard({ children, className, hover = false, ...props }: GlassCardProps) {
  const getCardStyle = useServerConfigStore((s) => s.getCardStyle);
  const cardStyle = getCardStyle();

  const styleClasses = {
    glass: 'bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/50 dark:border-white/10 rounded-2xl shadow-lg shadow-sky-500/10',
    flat: 'bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm',
    rounded: 'bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-white/40 dark:border-white/10 rounded-3xl shadow-xl shadow-sky-500/10',
  };

  return (
    <motion.div
      className={cn(
        styleClasses[cardStyle],
        hover && 'hover:shadow-xl hover:shadow-sky-500/20 cursor-pointer',
        className
      )}
      whileHover={hover ? { scale: 1.02, y: -2 } : undefined}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
```

### Step 6: Feature-Gated Page Access যোগ করো
**File**: `/dakkho-student-app/src/components/dakkho/DakkhoApp.tsx` (or a wrapper)

Feature disabled হলে সেই page-এ "Feature not available" দেখাও:

```tsx
// Add a FeatureGate wrapper component
function FeatureGate({ feature, children }: { feature: string; children: React.ReactNode }) {
  const isFeatureEnabled = useServerConfigStore((s) => s.isFeatureEnabled);
  if (!isFeatureEnabled(feature)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mb-4">
          <Lock className="w-8 h-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">Feature Not Available</h2>
        <p className="text-muted-foreground text-sm max-w-md">
          This feature is currently disabled by the administrator. Please check back later.
        </p>
      </div>
    );
  }
  return <>{children}</>;
}
```

তারপর PageRouter-এ feature-gated pages wrap করো:
```tsx
const featureGatedPages: Record<string, { feature: string; component: React.ReactNode }> = {
  'bookmarks': { feature: 'bookmarks', component: <BookmarksPage /> },
  'downloads': { feature: 'downloads', component: <DownloadsPage /> },
  'certificates': { feature: 'certificates', component: <CertificatesPage /> },
  'live-sessions': { feature: 'liveSessions', component: <LiveSessionsPage /> },
  'achievements': { feature: 'achievements', component: <AchievementsPage /> },
  'assignment': { feature: 'assignments', component: <AssignmentPage /> },
  'discussion': { feature: 'discussions', component: <DiscussionPage /> },
  'leaderboard': { feature: 'leaderboard', component: <LeaderboardPage /> },
  'study-groups': { feature: 'studyGroups', component: <StudyGroupsPage /> },
  'peer-connections': { feature: 'peerConnections', component: <PeerConnectionsPage /> },
  'community': { feature: 'community', component: <CommunityPage /> },
  'feedback': { feature: 'feedback', component: <FeedbackPage /> },
  'pricing': { feature: 'pricing', component: <PricingPage /> },
  'referral': { feature: 'referral', component: <ReferralPage /> },
};
```

### Step 7: Worker-এ Student Auth Routes যোগ করো
**File**: `/worker/src/routes/student-api.ts`

Student Auth routes যোগ করো যেগুলো Appwrite SDK ব্যবহার করে এবং D1 তে student_sessions create করে:

```typescript
// Import Appwrite helpers and student session management
import { createSession as createAppwriteSession, getAccount } from '../lib/appwrite';
import { createStudentSession, deleteStudentSession } from '../lib/student-auth';
import { generateId, getErrorMessage } from '../lib/utils';

// POST /auth/signup — Student registration via Appwrite
studentApiRoutes.post('/auth/signup', async (c) => {
  try {
    const { fullName, email, password, instituteId, technology } = await c.req.json();
    if (!email || !password || !fullName) {
      return c.json({ error: 'Name, email, and password are required' }, 400);
    }

    // Create Appwrite account
    const userId = generateId();
    // Use Appwrite REST API to create user
    const response = await fetch(`https://sgp.cloud.appwrite.io/v1/account`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Appwrite-Project': c.env.APPWRITE_PROJECT_ID,
      },
      body: JSON.stringify({
        userId,
        email,
        password,
        name: fullName,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return c.json({ error: error.message || 'Signup failed' }, 400);
    }

    // Create Appwrite session
    const sessionRes = await fetch(`https://sgp.cloud.appwrite.io/v1/account/sessions/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Appwrite-Project': c.env.APPWRITE_PROJECT_ID,
      },
      body: JSON.stringify({ email, password }),
    });

    if (!sessionRes.ok) {
      return c.json({ error: 'Account created but login failed' }, 400);
    }

    const session = await sessionRes.json();

    // Create student session in D1
    const token = await createStudentSession(c.env, userId, email);

    return c.json({
      success: true,
      token,
      userId,
      user: { id: userId, name: fullName, email, instituteId, technology, emailVerified: false, packages: [] },
    });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// POST /auth/login — Student login
studentApiRoutes.post('/auth/login', async (c) => {
  try {
    const { email, password } = await c.req.json();
    if (!email || !password) {
      return c.json({ error: 'Email and password are required' }, 400);
    }

    // Create Appwrite email session
    const { sessionCookie } = await createAppwriteSession(c.env, email, password);
    const user = await getAccount(c.env, sessionCookie);

    const userId = (user as any).$id;
    const userName = (user as any).name;
    const userEmail = (user as any).email;

    // Create D1 student session
    const token = await createStudentSession(c.env, userId, userEmail);

    // Get user packages
    const packages = await c.env.DB.prepare(
      "SELECT up.*, cp.package_type, cp.price, cp.duration_months FROM user_packages up JOIN course_packages cp ON up.package_id = cp.id WHERE up.user_id = ? AND up.status = 'active'"
    ).bind(userId).all();

    // Get user prefs for institute/technology
    const prefs = (user as any).prefs || {};

    return c.json({
      success: true,
      token,
      user: {
        id: userId,
        name: userName,
        email: userEmail,
        instituteId: prefs.instituteId || null,
        technology: prefs.technology || null,
        emailVerified: (user as any).emailVerification || false,
        packages: packages.results || [],
      },
    });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 401);
  }
});

// POST /auth/logout — Student logout
studentApiRoutes.post('/auth/logout', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      await deleteStudentSession(c.env, token);
    }
    return c.json({ success: true });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// GET /auth/me — Get current student profile
studentApiRoutes.get('/auth/me', async (c) => {
  try {
    const auth = await getStudentAuth(c);
    if (!auth.authorized) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const packages = await c.env.DB.prepare(
      "SELECT up.*, cp.package_type, cp.price, cp.duration_months FROM user_packages up JOIN course_packages cp ON up.package_id = cp.id WHERE up.user_id = ? AND up.status = 'active'"
    ).bind(auth.userId).all();

    return c.json({
      user: {
        id: auth.userId,
        name: null,
        email: auth.email,
        instituteId: null,
        technology: null,
        emailVerified: false,
        packages: packages.results || [],
      },
    });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// POST /auth/forgot-password
studentApiRoutes.post('/auth/forgot-password', async (c) => {
  try {
    const { email } = await c.req.json();
    if (!email) return c.json({ error: 'Email required' }, 400);

    const response = await fetch(`https://sgp.cloud.appwrite.io/v1/account/recovery`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Appwrite-Project': c.env.APPWRITE_PROJECT_ID,
      },
      body: JSON.stringify({ email, url: 'https://dakkho.pro.bd/forgot-password' }),
    });

    return c.json({ success: true, message: 'Recovery email sent' });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// POST /auth/verify-otp
studentApiRoutes.post('/auth/verify-otp', async (c) => {
  // For now, just return success (OTP verification is email-based via Appwrite)
  return c.json({ success: true, message: 'Email verified' });
});

// POST /auth/resend-otp
studentApiRoutes.post('/auth/resend-otp', async (c) => {
  return c.json({ success: true, message: 'Verification email resent' });
});
```

### Step 8: Worker-এ Student-Facing Course/Video Routes যোগ করো
**File**: `/worker/src/routes/student-api.ts`

```typescript
// GET /courses — List courses from Appwrite
studentApiRoutes.get('/courses', async (c) => {
  try {
    const technology = c.req.query('technology');
    const limit = parseInt(c.req.query('limit') || '20');
    const offset = parseInt(c.req.query('offset') || '0');

    // Fetch from Appwrite courses collection
    const queries = [`limit(${limit})`, `offset(${offset})`];
    if (technology) {
      queries.push(`equal('technology', '${technology}')`);
    }

    const response = await fetch(
      `https://sgp.cloud.appwrite.io/v1/databases/${c.env.APPWRITE_DATABASE_ID}/collections/courses/documents?queries[]=${queries.map(q => encodeURIComponent(JSON.stringify(q))).join('&queries[]=')}`,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Appwrite-Project': c.env.APPWRITE_PROJECT_ID,
          'X-Appwrite-Key': c.env.APPWRITE_API_KEY,
        },
      }
    );

    const data = await response.json();
    return c.json({ courses: data.documents || [], total: data.total || 0 });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// GET /courses/:id — Get single course
studentApiRoutes.get('/courses/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const response = await fetch(
      `https://sgp.cloud.appwrite.io/v1/databases/${c.env.APPWRITE_DATABASE_ID}/collections/courses/documents/${id}`,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Appwrite-Project': c.env.APPWRITE_PROJECT_ID,
          'X-Appwrite-Key': c.env.APPWRITE_API_KEY,
        },
      }
    );

    if (!response.ok) return c.json({ error: 'Course not found' }, 404);
    const course = await response.json();
    return c.json({ course });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// GET /courses/:id/videos — Get videos for a course
studentApiRoutes.get('/courses/:id/videos', async (c) => {
  try {
    const courseId = c.req.param('id');
    const response = await fetch(
      `https://sgp.cloud.appwrite.io/v1/databases/${c.env.APPWRITE_DATABASE_ID}/collections/videos/documents?queries[]=${encodeURIComponent(JSON.stringify(`equal('courseId', '${courseId}')`))}&queries[]=${encodeURIComponent(JSON.stringify('orderAsc("order")'))}`,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Appwrite-Project': c.env.APPWRITE_PROJECT_ID,
          'X-Appwrite-Key': c.env.APPWRITE_API_KEY,
        },
      }
    );

    const data = await response.json();
    return c.json({ videos: data.documents || [], total: data.total || 0 });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// GET /video/stream-url — Get presigned R2 URL for video streaming
studentApiRoutes.get('/video/stream-url', async (c) => {
  try {
    const key = c.req.query('key');
    const bucket = c.req.query('bucket') || 'videos';

    if (!key) return c.json({ error: 'Video key required' }, 400);

    // Auth check (optional - could be public for free content)
    // const auth = await getStudentAuth(c);

    // Generate presigned URL from R2
    const url = await c.env.VIDEOS.createSignedUrl(key, 3600); // 1 hour

    return c.json({ url });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});

// GET /config/payment — Get payment config
studentApiRoutes.get('/config/payment', async (c) => {
  try {
    const result = await c.env.DB.prepare(
      'SELECT * FROM payment_config WHERE is_active = 1'
    ).all();
    return c.json({ paymentConfig: result.results });
  } catch (error) {
    return c.json({ error: getErrorMessage(error) }, 500);
  }
});
```

### Step 9: Clean Up Old D1 Data
Run this SQL via Cloudflare Dashboard or Wrangler:

```sql
DELETE FROM app_config WHERE key IN ('app_settings', 'streaming', 'notifications', 'features');
```

### Step 10: Remove Dead ContentProtectionStore
**File**: `/dakkho-student-app/src/lib/store.ts`

`useContentProtectionStore` পুরো remove করো — এটা dead code কারণ `ContentProtection.tsx` শুধু server config ব্যবহার করে।

---

## Deployment Checklist

1. **Worker Deploy** — `cd worker && npx wrangler deploy`
2. **D1 Cleanup** — Delete old config rows
3. **Test `/api/config`** — `curl https://dakkho-admin-api.dakkho-admin.workers.dev/api/config`
4. **Student App Build** — `cd dakkho-student-app && npm run build`
5. **Student App Deploy** — Upload to Cloudflare Pages (`dakkhostudent`)
6. **Admin Config Test** — Change something in `https://dakkho-admin.pages.dev/config/`, verify Student App reflects the change

---

## File Change Summary

| File | Action | Priority |
|------|--------|----------|
| `/worker/src/routes/student-api.ts` | Add `/config`, `/auth/*`, `/courses/*`, `/video/stream-url`, `/config/payment` routes | 🔴 Critical |
| `/dakkho-student-app/src/lib/store.ts` | Rewrite ServerConfig types + useServerConfigStore to match Worker format | 🔴 Critical |
| `/dakkho-student-app/src/components/dakkho/shared/Sidebar.tsx` | Add menu/general section visibility checks | 🟡 High |
| `/dakkho-student-app/src/components/dakkho/shared/BottomNav.tsx` | Fix tab visibility + add sorting | 🟡 High |
| `/dakkho-student-app/src/components/dakkho/shared/GlassCard.tsx` | Add cardStyle from config | 🟡 High |
| `/dakkho-student-app/src/components/dakkho/DakkhoApp.tsx` | Add FeatureGate wrapper | 🟡 High |
| `/dakkho-student-app/src/components/dakkho/ContentProtection.tsx` | Already works (reads serverConfig?.contentProtection) | ✅ OK |
| `/dakkho-student-app/src/components/dakkho/home/HomePage.tsx` | Already works (uses isHomeSectionVisible) | ✅ OK |
| `/dakkho-student-app/src/components/dakkho/shared/TopBar.tsx` | Already works (uses isTopBarElementVisible) | ✅ OK |
| D1 `app_config` table | Delete old rows | 🟢 Medium |
| `/dakkho-student-app/src/lib/store.ts` | Remove dead `useContentProtectionStore` | 🟢 Medium |

---

## Credentials

- Worker URL: `https://dakkho-admin-api.dakkho-admin.workers.dev/`
- Admin Site: `https://dakkho-admin.pages.dev/`
- Cloudflare API Token: `<REDACTED>`
- D1 DB ID: `2e3dabbe-1e5d-44c7-a7d1-eba001aa0a4a`
- KV Namespace ID: `f61a482ba88a45bebb35dfd600cd742d`
- Appwrite Endpoint: `https://sgp.cloud.appwrite.io/v1`
- Appwrite Project: `dakkho`
- Appwrite API Key: `<REDACTED>`
- R2 Key: `<REDACTED>`
- R2 Secret: `<REDACTED>`
- OneSignal App ID: `ba6c42b2-d564-4254-b422-a2bed67d8b0f`
- OneSignal REST API Key: `<REDACTED>`
- Admin Login: `himadrient@proton.me` / `<REDACTED>`
- GitHub PAT: `<REDACTED>`
