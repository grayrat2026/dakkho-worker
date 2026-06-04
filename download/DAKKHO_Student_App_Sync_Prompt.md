# DAKKHO Student App — Full Sync & Fix Prompt

> **Purpose**: Use this prompt to sync your DAKKHO Student App with the Admin Panel backend (Cloudflare Workers + D1). Every API, credential, schema mismatch, and integration point is documented below.

---

## 1. ARCHITECTURE OVERVIEW

### Admin Panel (Already Deployed & Working)
- **Frontend**: Next.js 16 (static export) on Cloudflare Pages  
  URL: `https://dakkho-admin.pages.dev/`
- **Backend**: Cloudflare Workers + Hono router  
  URL: `https://dakkho-admin-api.dakkho-admin.workers.dev/`
- **Database**: Cloudflare D1 (SQLite) — 18 tables  
  DB ID: `2e3dabbe-1e5d-44c7-a7d1-eba001aa0a4a`
- **Storage**: Cloudflare R2 — 4 buckets (Videos, Thumbnails, Avatars, Resources)
- **Auth**: Appwrite (Admin) + D1 Sessions (Student)
- **Email**: Resend (`noreply@dakkho.pro.bd` verified)
- **Push**: OneSignal (REST API only on Admin, SDK on Student)

### Student App (Current State — Needs Sync)
- **Framework**: Next.js 16 with `output: "standalone"` (VPS deployment)
- **Current Auth**: Appwrite SDK client-side login (needs to be replaced with Worker API)
- **Current DB**: Local Prisma/SQLite + Appwrite (needs migration to Worker API)
- **Current Storage**: AWS S3 SDK for R2 (needs replacement with Worker API)
- **Current Realtime**: MQTT (HiveMQ) + Supabase (should be replaced with OneSignal + polling/Worker)
- **Current Config**: Local SQLite `AppConfig` table (should use Worker `/api/` endpoints)

---

## 2. ALL CREDENTIALS

### Cloudflare
```
API Token: <REDACTED>
D1 Database ID: 2e3dabbe-1e5d-44c7-a7d1-eba001aa0a4a
D1 Database Name: dakkho-admin-db
KV Namespace ID: f61a482ba88a45bebb35dfd600cd742d
R2 Access Key: <REDACTED>
R2 Secret Key: <REDACTED>
R2 Buckets: dakkho-videos, dakkho-thumbnails, dakkho-avatars, dakkho-resources
Account ID: (derive from R2 endpoint or API token)
```

### Appwrite
```
Endpoint: https://sgp.cloud.appwrite.io/v1
Project ID: dakkho
Database ID: dakkho_main
API Key: standard_c465097b57e28bd7eed617fae6e488b82587b8474d66def111cf4693351e3c89b558bf391bee4aa87dccb718d9d03a69a7257dbd59696c8f164aa5b4b44fc987b374bd8532429dccd318bbc1e15e683eaf429e57e04f2f5fbd8f1fc522e67494dcf855901261f4a4cd709c90a20fd407df4fc5826b807cf9d4b42e4478684c28
Collections: users, courses, videos, instructors, institutes, enrollments, notifications, discussions, user_settings, bookmarks, watch_progress, categories
```

### Resend (Email)
```
API Key: re_YBYgjXfu_JAQbAR51HADxWUUpPEBKgdG2
From Email: noreply@dakkho.pro.bd (verified)
Support Email: support@dakkho.pro.bd
```

### OneSignal (Push Notifications — Student App ONLY)
```
App ID: ba6c42b2-d564-4254-b422-a2bed67d8b0f
REST API Key: os_v2_app_xjwefmwvmrbfjnbcuk7nm7mlb7qhz7ujskjusb5miltyyxv4opdr4cs5rgwu335t23x2c2k4m2tra6lkzw3zs77ugqnq7q3ipdn2zzi
Safari Web ID: web.onesignal.auto.028d9952-ba2c-477b-babc-6aee5c5ba0de
Key ID: qhz7ujskjusb5miltyyxv4opd
```
**IMPORTANT**: OneSignal SDK goes ONLY on Student App. Admin Panel sends push via REST API only.

### Admin Login
```
Email: himadrient@proton.me
Password: <REDACTED>
```

---

## 3. WORKER API ENDPOINTS (Student App Must Call These)

Base URL: `https://dakkho-admin-api.dakkho-admin.workers.dev`

### 3.1 Public Student API (No Auth Required)

| Method | Endpoint | Description | Response Shape |
|--------|----------|-------------|----------------|
| GET | `/api/institutes` | List active institutes | `{ institutes: Institute[], total: number }` |
| GET | `/api/institutes/:id` | Get single institute | `{ institute: Institute }` |
| GET | `/api/technologies` | List active technologies | `{ technologies: Technology[] }` |
| GET | `/api/events` | List active events | `{ events: Event[] }` |
| GET | `/api/live-classes` | List upcoming live classes | `{ liveClasses: LiveClass[] }` |
| GET | `/api/coupons/validate?code=XXX` | Validate coupon code | `{ valid: boolean, coupon?: CouponInfo }` |
| GET | `/api/course-packages?courseId=XXX` | Get packages for course | `{ packages: Package[] }` |

**Query params for `/api/institutes`**: `page`, `limit`, `division`, `search`

### 3.2 Authenticated Student API (Bearer Token Required)

| Method | Endpoint | Description | Request Body |
|--------|----------|-------------|--------------|
| POST | `/api/institutes/requests` | Request new institute | `{ institute_name, institute_name_bn?, division?, district? }` |
| GET | `/api/institutes/requests/mine` | Get my institute requests | — |
| POST | `/api/push/register` | Register push token | `{ push_token, device_type?, device_info? }` |
| DELETE | `/api/push/unregister` | Unregister push token | `{ push_token }` |
| POST | `/api/payments/submit` | Submit manual payment | `{ package_id, trx_id, phone?, proof_url? }` |
| GET | `/api/packages/mine` | Get my active packages | — |

**Auth header**: `Authorization: Bearer <student_session_token>`

### 3.3 Student Auth (Worker-Managed, NOT Appwrite Sessions)

The Student App must create sessions through the Worker API. The current Appwrite `Account.createEmailPasswordSession()` approach must be replaced.

**Required new endpoints to add on Worker** (not yet implemented):
- `POST /api/auth/signup` — Create student account in Appwrite + D1 session
- `POST /api/auth/login` — Login via Appwrite + create D1 student session → return token
- `POST /api/auth/logout` — Deactivate D1 student session
- `GET /api/auth/me` — Get current student profile
- `POST /api/auth/forgot-password` — Initiate password reset
- `POST /api/auth/verify-otp` — Verify email OTP

---

## 4. D1 DATABASE SCHEMA (18 Tables)

### Tables Student App Needs to Know

#### `institutes`
```sql
id INTEGER PK, name TEXT, name_bn TEXT, division TEXT, district TEXT,
eiin_number TEXT, type TEXT DEFAULT 'polytechnic', is_requested INTEGER DEFAULT 0,
requested_by TEXT, approved_by TEXT, approved_at TEXT, is_active INTEGER DEFAULT 1,
created_at TEXT, updated_at TEXT
-- 63 seeded polytechnics across 8 divisions
```

#### `technologies`
```sql
id INTEGER PK, name TEXT, name_bn TEXT, short_code TEXT UNIQUE,
description TEXT, is_active INTEGER DEFAULT 1, created_at TEXT, updated_at TEXT
-- 7 seeded: CIVIL, CST, ELECTRICAL, EMED, ELEX, MECH, POWER
```

#### `course_packages`
```sql
id INTEGER PK, course_id TEXT NOT NULL, package_type TEXT NOT NULL,
price REAL NOT NULL, duration_months INTEGER DEFAULT 6,
max_users INTEGER DEFAULT 1, is_auto_assign INTEGER DEFAULT 1,
is_active INTEGER DEFAULT 1, created_by TEXT, created_at TEXT, updated_at TEXT
-- package_type: 'single' or 'friend' (2 users)
```

#### `user_packages`
```sql
id INTEGER PK, user_id TEXT NOT NULL, package_id INTEGER NOT NULL,
course_id TEXT NOT NULL, package_type TEXT NOT NULL,
activated_at TEXT NOT NULL, expires_at TEXT NOT NULL,
shared_with TEXT, status TEXT DEFAULT 'active', created_at TEXT
```

#### `payments`
```sql
id INTEGER PK, user_id TEXT NOT NULL, package_id INTEGER, course_id TEXT,
amount REAL NOT NULL, currency TEXT DEFAULT 'BDT', gateway TEXT NOT NULL,
gateway_trx_id TEXT, gateway_payment_id TEXT, status TEXT DEFAULT 'pending',
proof_url TEXT, trx_id_submitted TEXT, phone_submitted TEXT,
verified_by TEXT, verified_at TEXT, metadata TEXT DEFAULT '{}',
created_at TEXT, updated_at TEXT
```

#### `payment_config`
```sql
id INTEGER PK, gateway TEXT NOT NULL, is_active INTEGER DEFAULT 0,
config TEXT DEFAULT '{}', sandbox_mode INTEGER DEFAULT 1,
instructions TEXT, instructions_bn TEXT, created_at TEXT, updated_at TEXT
-- 3 seeded: manual (active), sslcommerz (inactive), bkash (inactive)
```

#### `events`
```sql
id INTEGER PK, title TEXT, title_bn TEXT, description TEXT, description_bn TEXT,
event_type TEXT NOT NULL, banner_url TEXT, start_date TEXT NOT NULL, end_date TEXT,
is_featured INTEGER DEFAULT 0, metadata TEXT DEFAULT '{}', is_active INTEGER DEFAULT 1,
created_by TEXT, created_at TEXT, updated_at TEXT
```

#### `live_class_schedules`
```sql
id INTEGER PK, course_id TEXT, title TEXT, title_bn TEXT, description TEXT,
instructor_id TEXT, technology_id INTEGER, scheduled_at TEXT NOT NULL,
duration_minutes INTEGER DEFAULT 60, meeting_url TEXT, platform TEXT DEFAULT 'jitsi',
status TEXT DEFAULT 'scheduled', recording_url TEXT, is_active INTEGER DEFAULT 1,
created_by TEXT, created_at TEXT, updated_at TEXT
```

#### `coupons`
```sql
id INTEGER PK, code TEXT UNIQUE, discount_type TEXT, discount_value REAL,
max_discount REAL, min_purchase REAL DEFAULT 0, usage_limit INTEGER,
usage_count INTEGER DEFAULT 0, per_user_limit INTEGER DEFAULT 1,
valid_from TEXT, valid_until TEXT, applicable_courses TEXT, applicable_technologies TEXT,
is_active INTEGER DEFAULT 1, created_by TEXT, created_at TEXT, updated_at TEXT
```

#### `discounts`
```sql
id INTEGER PK, name TEXT, name_bn TEXT, description TEXT,
discount_type TEXT, discount_value REAL, applicable_type TEXT NOT NULL,
applicable_ids TEXT, valid_from TEXT, valid_until TEXT,
is_auto_apply INTEGER DEFAULT 0, is_active INTEGER DEFAULT 1,
created_by TEXT, created_at TEXT, updated_at TEXT
```

#### `student_sessions`
```sql
id TEXT PK, user_id TEXT NOT NULL UNIQUE, email TEXT NOT NULL, name TEXT,
device_info TEXT, ip_address TEXT, created_at TEXT, expires_at TEXT NOT NULL,
is_active INTEGER DEFAULT 1
-- 1 device strictly per student (user_id UNIQUE)
```

#### `user_2fa`
```sql
id INTEGER PK, user_id TEXT NOT NULL UNIQUE, method TEXT DEFAULT 'email',
totp_secret TEXT, totp_verified INTEGER DEFAULT 0, backup_codes TEXT,
is_enabled INTEGER DEFAULT 0, created_at TEXT, updated_at TEXT
```

#### `user_push_tokens`
```sql
id INTEGER PK, user_id TEXT NOT NULL, push_token TEXT NOT NULL UNIQUE,
device_type TEXT, device_info TEXT, is_active INTEGER DEFAULT 1,
created_at TEXT, updated_at TEXT
```

#### `notification_logs`
```sql
id INTEGER PK, type TEXT, category TEXT, title TEXT, message TEXT,
target_type TEXT, target_id TEXT, sent_count INTEGER DEFAULT 0,
failed_count INTEGER DEFAULT 0, metadata TEXT DEFAULT '{}',
created_by TEXT, created_at TEXT
```

#### `institute_requests`
```sql
id INTEGER PK, user_id TEXT NOT NULL, user_email TEXT, user_name TEXT,
institute_name TEXT NOT NULL, institute_name_bn TEXT, division TEXT, district TEXT,
status TEXT DEFAULT 'pending', admin_note TEXT, reviewed_by TEXT, reviewed_at TEXT,
created_at TEXT, updated_at TEXT
```

#### Other tables (admin-only): `admin_sessions`, `app_config`, `audit_logs`

---

## 5. CRITICAL MISMATCHES TO FIX

### 5.1 AUTH SYSTEM — Must Replace

**Current Student App**:
- Uses Appwrite SDK `Account.createEmailPasswordSession()` client-side
- Session is Appwrite cookie-based, not compatible with Worker API
- Signup creates user in Appwrite, sends OTP via Resend from Next.js API route
- OTP stored in-memory (lost on restart)

**Required Changes**:
1. **Remove** all Appwrite SDK auth calls from Student App
2. **Replace** with Worker API calls:
   - Login: `POST /api/auth/login` → returns `{ token, user }` 
   - Signup: `POST /api/auth/signup` → creates Appwrite user + sends OTP via Worker
   - Verify OTP: `POST /api/auth/verify-otp`
   - Logout: `POST /api/auth/logout` → deactivates D1 session
   - Forgot Password: `POST /api/auth/forgot-password`
3. **Store** the returned `token` in localStorage as `dakkho_student_token`
4. **Send** `Authorization: Bearer <token>` on all authenticated Worker API calls
5. **Session enforcement**: 1 device strictly — if user logs in elsewhere, old session is invalidated

**Worker endpoints to ADD** (not yet built):
```
POST /api/auth/signup   — Create Appwrite user + D1 session + OTP email
POST /api/auth/login    — Validate Appwrite creds + create D1 session → return token
POST /api/auth/logout   — Deactivate D1 session
GET  /api/auth/me       — Return current user profile
POST /api/auth/forgot-password — Appwrite recovery + Resend email
POST /api/auth/verify-otp      — Verify OTP, mark email verified
```

### 5.2 TECHNOLOGIES LIST — Outdated

**Current Student App** (`src/lib/constants.ts`):
```typescript
export const TECHNOLOGIES = [
  'Computer Science & Technology (CSE)',
  'Electronics & Telecommunication Engineering (ETE)',
  // ... 20 items - WRONG names, WRONG count
];
```

**Admin D1 has** (7 technologies):
```
Civil Technology (CIVIL) — সিভিল টেকনোলজি
Computer Science and Technology (CST) — কম্পিউটার সায়েন্স এন্ড টেকনোলজি
Electrical Technology (ELECTRICAL) — ইলেকট্রিক্যাল টেকনোলজি
Electromedical Technology (EMED) — ইলেক্ট্রোমেডিক্যাল টেকনোলজি
Electronics Technology (ELEX) — ইলেকট্রনিক্স টেকনোলজি
Mechanical Technology (MECH) — মেকানিক্যাল টেকনোলজি
Power Technology (POWER) — পাওয়ার টেকনোলজি
```

**Fix**: 
1. Remove hardcoded `TECHNOLOGIES` from `constants.ts`
2. Fetch from `GET /api/technologies` at app startup
3. Cache in Zustand store
4. Update Department pages to use D1 technology names + short_codes
5. Map sidebar departments to technology short_codes

### 5.3 INSTITUTES LIST — Hardcoded Mock

**Current Student App**:
- Uses `POLYTECHNIC_INSTITUTES` from `mock-data.ts` (hardcoded 63 names, no IDs/divisions/Bengali names)
- Signup form uses this mock list for institute dropdown

**Fix**:
1. Replace `POLYTECHNIC_INSTITUTES` mock with API call: `GET /api/institutes`
2. Each institute now has: `id, name, name_bn, division, district, eiin_number, type`
3. Signup form dropdown should show `name` + `name_bn` + division badge
4. Send `institute_id` (not institute name string) when signing up
5. Support "Request Institute" button that calls `POST /api/institutes/requests`

### 5.4 SUBSCRIPTION/PRICING PAGE — Completely Wrong

**Current Student App** (`SubscriptionPage.tsx`):
- Shows 3 subscription plans: Free / Pro / Premium (monthly pricing)
- This is WRONG — DAKKHO uses **Course Packages** (not subscription plans)

**Required Changes**:
1. **Delete** `SubscriptionPage.tsx` current content
2. **Replace** with Course Package selection:
   - Show packages for a specific course (fetched from `GET /api/course-packages?courseId=XXX`)
   - Package types: `single` (1 user) or `friend` (2 users, shared)
   - Duration: 6 months (semester-based, auto-assigned)
   - Price set by admin per course
3. **Payment flow**:
   - Select package → Submit manual payment (`POST /api/payments/submit`)
   - Show payment instructions from `payment_config` (fetched from Worker)
   - Student enters Transaction ID + phone number
   - Wait for admin verification
   - Check payment status via `GET /api/packages/mine`

### 5.5 LIVE SESSIONS PAGE — Using Mock Data

**Current Student App**:
- `LiveSessionsPage.tsx` uses hardcoded `MOCK_SESSIONS`
- No real data from Worker

**Fix**:
1. Replace mock data with `GET /api/live-classes`
2. Each live class has: `id, title, title_bn, scheduled_at, duration_minutes, meeting_url, platform, status, technology_id`
3. Show "Join" button when `status === 'live'`
4. Show "Set Reminder" for `status === 'scheduled'`
5. Show "Watch Replay" when `recording_url` exists

### 5.6 NOTIFICATIONS PAGE — Not Using Worker

**Current Student App**:
- Uses `MOCK_NOTIFICATIONS` from `mock-data.ts`
- Zustand store manages local notification state

**Fix**:
1. OneSignal SDK integration for push notifications:
   ```javascript
   // In layout.tsx or app startup
   OneSignal.init({ appId: 'ba6c42b2-d564-4254-b422-a2bed67d8b0f' });
   ```
2. Register push token after login: `POST /api/push/register`
3. Unregister on logout: `DELETE /api/push/unregister`
4. For in-app notification display, consider polling or SSE from Worker (or use OneSignal's in-app messages)

### 5.7 VIDEO STREAMING — R2 Access Pattern Wrong

**Current Student App**:
- Uses AWS S3 SDK (`@aws-sdk/client-s3`) to generate presigned R2 URLs from Next.js API routes
- `src/lib/r2.ts` requires `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_R2_ACCESS_KEY_ID`, `CLOUDFLARE_R2_SECRET_ACCESS_KEY`
- `GET /api/video/stream-url?key=XXX` generates presigned URL

**Fix**:
1. **Remove** `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner` dependencies
2. **Remove** `src/lib/r2.ts` entirely
3. **Replace** `GET /api/video/stream-url` with a call to Worker:
   - Worker already has native R2 bindings (no S3 SDK needed)
   - Add a new Worker endpoint: `GET /api/video/stream-url?key=XXX&bucket=XXX`
   - Worker generates presigned URL using native R2 binding
4. **Simpler alternative**: Use Worker's `R2_VIDEOS.get()` to create a direct download URL

### 5.8 MQTT + Supabase — Should Be Removed

**Current Student App**:
- `src/lib/mqtt.ts` — HiveMQ Cloud MQTT for real-time messaging
- `src/lib/supabase.ts` — Supabase client for realtime subscriptions
- These are unnecessary; OneSignal handles push notifications

**Fix**:
1. **Remove** `src/lib/mqtt.ts` and `mqtt` dependency
2. **Remove** `src/lib/supabase.ts` and `@supabase/supabase-js` dependency
3. Replace real-time features with:
   - Push notifications via OneSignal
   - Polling for data refresh (e.g., check payment status every 30s)
   - Optional: Add SSE endpoint on Worker for live updates

### 5.9 CONFIG API — Use Worker Instead of Local SQLite

**Current Student App**:
- `GET /api/config` reads from local Prisma/SQLite (`ContentProtection`, `AppConfig` tables)
- `GET /api/config/ui` reads UI config from local DB

**Fix**:
1. Replace with Worker endpoints:
   - `GET /api/config` → returns `app_config` from D1
   - Add Worker endpoints for feature flags, UI config, content protection settings
2. Cache config in Zustand store on app startup
3. Remove local Prisma/SQLite dependency for config

### 5.10 PRISMA + LOCAL SQLITE — Remove Entirely

**Current Student App**:
- `prisma/schema.prisma` with SQLite (User, Course, Video, etc.)
- `src/lib/db.ts` — PrismaClient
- `db/custom.db` — Local SQLite file

**This must be completely removed**. All data comes from:
- **Appwrite** (courses, videos, instructors, enrollments, bookmarks, watch progress)
- **D1 via Worker** (institutes, technologies, packages, payments, events, live classes, sessions)
- **R2 via Worker** (video streaming, file storage)

### 5.11 DEPLOYMENT TARGET

**Current**: VPS with standalone Node.js (Caddy reverse proxy)
**Target**: Cloudflare Pages with custom domain `dakkho.pro.bd`

**Changes needed**:
1. Change `next.config.ts`: `output: "export"` (static, like Admin Panel)
2. Remove all Next.js API routes (`src/app/api/**`) — all backend goes through Worker
3. Remove `prisma/`, `src/lib/db.ts`, `src/lib/r2.ts`, `src/lib/mqtt.ts`, `src/lib/supabase.ts`
4. Deploy to Cloudflare Pages: `wrangler pages deploy out --project-name=dakkho-student`
5. Add custom domain: `dakkho.pro.bd`
6. Update Worker CORS to include `https://dakkho.pro.bd`

---

## 6. FILE-BY-FILE CHANGES REQUIRED

### Files to DELETE
```
prisma/schema.prisma
prisma/seed-config.ts
src/lib/db.ts
src/lib/r2.ts
src/lib/mqtt.ts
src/lib/supabase.ts
src/lib/otp-store.ts
src/app/api/auth/signup/route.ts
src/app/api/auth/verify-otp/route.ts
src/app/api/auth/forgot-password/route.ts
src/app/api/config/route.ts
src/app/api/config/ui/route.ts
src/app/api/config/content-protection/route.ts
src/app/api/email/send-otp/route.ts
src/app/api/user/delete-account/route.ts
src/app/api/user/settings/route.ts
src/app/api/video/stream-url/route.ts
src/app/api/video/thumbnail/route.ts
src/app/api/route.ts
db/custom.db
```

### Files to CREATE
```
src/lib/api-client.ts     — Worker API client (like Admin's api-client.ts)
src/lib/auth.ts           — Auth functions using Worker API
src/lib/onesignal.ts      — OneSignal SDK initialization
```

### Files to MODIFY (Major)
```
next.config.ts            — Change to output: "export", add env vars
.env                      — Replace with Worker API URL + OneSignal App ID
src/lib/constants.ts      — Remove TECHNOLOGIES, fetch from API
src/lib/store.ts          — Replace auth store with Worker-based auth
src/lib/mock-data.ts      — Remove or replace with API calls
src/lib/appwrite.ts       — Keep but refactor: remove Auth methods, keep DB reads
src/lib/appwrite-server.ts — Keep for SSR data fetching (if needed)
src/lib/resend.ts         — Remove (email handled by Worker now)
src/components/dakkho/DakkhoApp.tsx — Update auth flow
src/components/dakkho/auth/LoginPage.tsx — Use Worker API login
src/components/dakkho/auth/SignupPage.tsx — Use Worker API signup + D1 institutes/technologies
src/components/dakkho/live/LiveSessionsPage.tsx — Fetch from Worker API
src/components/dakkho/profile/SubscriptionPage.tsx — Replace with Course Packages
src/components/dakkho/notifications/NotificationsPage.tsx — Integrate OneSignal
src/components/dakkho/home/HomePage.tsx — Fetch real data
src/components/dakkho/video/VideoPlayerPage.tsx — Use Worker stream URL
src/components/dakkho/shared/Sidebar.tsx — Dynamic departments from API
```

---

## 7. NEW API CLIENT (Replace All Fetch Calls)

Create `src/lib/api-client.ts`:

```typescript
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
  const data = await res.json();

  if (!res.ok) {
    throw { status: res.status, ...data };
  }

  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, body: unknown) => request<T>(path, { 
    method: 'POST', body: JSON.stringify(body) 
  }),
  put: <T>(path: string, body: unknown) => request<T>(path, { 
    method: 'PUT', body: JSON.stringify(body) 
  }),
  delete: <T>(path: string, body?: unknown) => request<T>(path, { 
    method: 'DELETE', body: body ? JSON.stringify(body) : undefined 
  }),
};
```

---

## 8. ONESIGNAL INTEGRATION

```html
<!-- Add to src/app/layout.tsx <head> -->
<script src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js" defer></script>
<script>
  window.OneSignalDeferred = window.OneSignalDeferred || [];
  window.OneSignalDeferred.push(function(OneSignal) {
    OneSignal.init({
      appId: "ba6c42b2-d564-4254-b422-a2bed67d8b0f",
      safari_web_id: "web.onesignal.auto.028d9952-ba2c-477b-babc-6aee5c5ba0de",
      notifyButton: { enable: true },
    });
  });
</script>
```

After login, register the push token:
```typescript
const onesignalUserId = await OneSignal.User.PushSubscription.id;
if (onesignalUserId) {
  await api.post('/api/push/register', {
    push_token: onesignalUserId,
    device_type: 'web',
    device_info: navigator.userAgent,
  });
}
```

---

## 9. ENVIRONMENT VARIABLES

### `.env` (Student App)
```env
NEXT_PUBLIC_API_BASE_URL=https://dakkho-admin-api.dakkho-admin.workers.dev
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://sgp.cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=dakkho
NEXT_PUBLIC_APPWRITE_DATABASE_ID=dakkho_main
NEXT_PUBLIC_ONESIGNAL_APP_ID=ba6c42b2-d564-4254-b422-a2bed67d8b0f
NEXT_PUBLIC_ONESIGNAL_SAFARI_WEB_ID=web.onesignal.auto.028d9952-ba2c-477b-babc-6aee5c5ba0de
```

### Remove from `.env` (No Longer Needed)
```env
# DELETE THESE:
DATABASE_URL=file:...                        # Prisma/SQLite removed
CLOUDFLARE_ACCOUNT_ID=...                    # R2 via Worker now
CLOUDFLARE_R2_ACCESS_KEY_ID=...             # R2 via Worker now
CLOUDFLARE_R2_SECRET_ACCESS_KEY=...         # R2 via Worker now
NEXT_PUBLIC_MQTT_BROKER_URL=...             # MQTT removed
NEXT_PUBLIC_MQTT_USERNAME=...               # MQTT removed
NEXT_PUBLIC_MQTT_PASSWORD=...               # MQTT removed
NEXT_PUBLIC_SUPABASE_URL=...                # Supabase removed
NEXT_PUBLIC_SUPABASE_ANON_KEY=...           # Supabase removed
APPWRITE_API_KEY=...                         # Server-side Appwrite → Worker handles
RESEND_API_KEY=...                           # Email → Worker handles
```

---

## 10. WORKER ENDPOINTS TO ADD

The following endpoints don't exist yet on the Worker and MUST be added before the Student App can function:

### 10.1 Student Auth Endpoints

```typescript
// POST /api/auth/signup
// Body: { fullName, email, password, instituteId, technology }
// 1. Create user in Appwrite via server SDK
// 2. Create D1 student session
// 3. Send OTP email via Resend
// 4. Return: { success, token, userId }

// POST /api/auth/login
// Body: { email, password }
// 1. Verify credentials against Appwrite
// 2. Check if existing session exists (1 device rule)
// 3. Create D1 student session
// 4. Return: { success, token, user }

// POST /api/auth/logout
// Header: Authorization: Bearer <token>
// 1. Deactivate D1 student session
// 2. Unregister push token

// GET /api/auth/me
// Header: Authorization: Bearer <token>
// 1. Validate session
// 2. Return user profile from Appwrite + D1

// POST /api/auth/forgot-password
// Body: { email }
// 1. Create Appwrite recovery
// 2. Send reset email via Resend

// POST /api/auth/verify-otp
// Body: { email, otp }
// 1. Verify OTP from D1/Redis
// 2. Mark email verified in Appwrite
```

### 10.2 Video Streaming Endpoint

```typescript
// GET /api/video/stream-url?key=XXX&bucket=XXX
// Header: Authorization: Bearer <token>
// 1. Validate student session
// 2. Check if user has active package for this course
// 3. Generate presigned URL using R2 binding
// 4. Return: { url }
```

### 10.3 Config Endpoints

```typescript
// GET /api/config
// Return app_config from D1 (features, streaming settings, etc.)

// GET /api/config/payment
// Return active payment config (instructions for manual payment)
```

### 10.4 Course Data Endpoints

```typescript
// GET /api/courses — List courses (from Appwrite or D1)
// GET /api/courses/:id — Get course details
// GET /api/courses/:id/videos — Get videos for a course
// GET /api/instructors — List instructors
// GET /api/instructors/:id — Get instructor details
```

---

## 11. IMPLEMENTATION PRIORITY ORDER

1. **Add Student Auth endpoints to Worker** (`/api/auth/*`) — CRITICAL
2. **Create API client** in Student App (`src/lib/api-client.ts`)
3. **Replace Auth system** — LoginPage, SignupPage, store
4. **Replace mock data** — institutes, technologies from Worker API
5. **Add OneSignal SDK** — push notifications
6. **Fix SubscriptionPage** → Course Packages
7. **Fix LiveSessionsPage** → Worker API data
8. **Fix VideoPlayerPage** → Worker stream URL
9. **Remove dead code** — Prisma, R2, MQTT, Supabase, local API routes
10. **Deploy to Cloudflare Pages** — `dakkho.pro.bd`
11. **Update Worker CORS** — add student domain

---

## 12. KEY DESIGN DECISIONS (Reference)

| Decision | Choice | Reason |
|----------|--------|--------|
| Auth System | D1 Sessions via Worker | 1 device strictly, session management |
| Push Notifications | OneSignal SDK | Admin sends via REST API, Student receives |
| Payment | Manual verify (default) | SSLCommerz + bKash plug-and-play ready |
| Course Packages | Single + Friend (2) | 6 months/semester auto-assign |
| 2FA | Email OTP + TOTP | User choice |
| Data Source | Appwrite + D1 via Worker | Appwrite for content, D1 for platform data |
| Video Storage | R2 (via Worker) | Native binding, no S3 SDK |
| Student App Host | Cloudflare Pages | Custom domain dakkho.pro.bd |
| Email | Resend (via Worker) | noreply@dakkho.pro.bd verified |
| Realtime | OneSignal + Polling | Replace MQTT/Supabase |

---

*Generated: 2026-06-04 | DAKKHO Platform Sync Document*
