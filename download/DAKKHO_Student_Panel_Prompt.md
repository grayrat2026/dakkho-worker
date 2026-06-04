# DAKKHO Student Panel — Build Prompt

Build a DAKKHO Student Panel — a Next.js 16 App Router SPA with static export (output: "export"), deployed on Cloudflare Pages.

## TECH STACK
Next.js 16 + React 19 + TypeScript + Zustand + shadcn/ui + Tailwind CSS 4 + Framer Motion. Dark glassmorphism theme (bg: #0F0F1A, glass-card: bg-white/5 backdrop-blur-xl border-white/10).

## BACKEND
Cloudflare Workers API at `https://dakkho-admin-api.dakkho-admin.workers.dev/`. You need to ADD `/student/*` route group to the existing Worker.

## APPWRITE
Project "dakkho", Database "dakkho_main", Endpoint `https://sgp.cloud.appwrite.io/v1`. 12 collections: users, courses, videos, instructors, institutes, categories, enrollments, notifications, discussions, user_settings, bookmarks, watch_progress.

## AUTH MODEL
Students login via Appwrite email session. Worker creates session, returns session cookie. Student API requests use `Cookie: a_session_dakkho={token}` header. NOT Bearer token like Admin.

### Login Flow:
1. Frontend POST /student/auth/login { email, password }
2. Worker creates Appwrite session → POST /account/sessions/email
3. Worker validates user (check prefs.role !== 'admin' to ensure student)
4. Worker returns session token to frontend
5. Frontend stores token in localStorage as `dakkho_student_token`
6. Every API request: `Cookie: a_session_dakkho={token}` OR `Authorization: Bearer {token}` header

### Student Auth Middleware (new):
```typescript
async function studentAuthMiddleware(c, next) {
  const token = c.req.header('Authorization')?.replace('Bearer ', '') 
    || getCookieFromHeader(c, 'a_session_dakkho');
  if (!token) return c.json({ error: 'Auth required' }, 401);
  
  // Validate with Appwrite
  const user = await getAccount(c.env, token);
  if (user.prefs?.role === 'admin') return c.json({ error: 'Admin cannot use student panel' }, 403);
  
  c.set('studentUser', { id: user.$id, email: user.email, name: user.name, role: 'student' });
  await next();
}
```

## API CLIENT
Same pattern as Admin — `apiGet/apiPost/apiPut/apiDelete/apiUpload` functions. URL pattern: `{BASE_URL}/student/{path}`. Auth via cookie or Authorization header.

## ENV VARIABLES
- `NEXT_PUBLIC_API_BASE_URL=https://dakkho-admin-api.dakkho-admin.workers.dev`
- No basePath needed (Cloudflare Pages custom domain)

## PAGES (single-page, Zustand currentPage routing):

### 1. Login
- Email/password form with Appwrite auth
- Dark glassmorphism design, DAKKHO logo
- Error handling for invalid credentials

### 2. Home
- Featured courses carousel/grid
- Continue watching section (from watch_progress)
- Category quick links
- Announcements banner (from notifications type=announcement)

### 3. Course Catalog
- Search by title/description
- Filter by: category, level (beginner/intermediate/advanced/expert), language (bangla/english/hindi), price
- Course cards with thumbnail, title, instructor, rating, student count
- Pagination

### 4. Course Detail
- Hero section with thumbnail, title, instructor info
- Curriculum tab: video list with duration, preview badge, completion status
- Overview tab: description, what you'll learn, requirements
- Instructor tab: bio, other courses
- Enroll button (creates enrollment document)
- If enrolled: show progress bar and continue button

### 5. Video Player
- Video playback area (HTML5 video or embedded player)
- Progress tracking: POST /student/watch-progress on pause/interval
- Next/previous video navigation
- Course sidebar (collapsible)
- Mark as completed when progress >= 95%

### 6. My Courses
- Enrolled courses grid with progress bars
- Filter: in progress, completed, not started
- Sort: recently accessed, progress, enrollment date

### 7. Bookmarks
- Saved courses list
- Add/remove bookmark toggle on course cards
- Sorted by bookmark date

### 8. Discussions
- Course-specific Q&A forum
- List discussions with tags, reply count, answered status
- Create new discussion
- Reply to discussion

### 9. Notifications
- Notification list (unread first, then by date)
- Mark as read on click
- Types: info, success, warning, error, announcement, course-update
- Action URLs for deep linking

### 10. Profile
- View/edit: fullName, avatarUrl, institute, technology
- Email (read-only)
- Change avatar (upload to R2 avatars bucket)

### 11. Settings
- Streaming quality (360p/480p/720p/1080p)
- Download quality
- Auto-download toggle
- WiFi-only toggle
- Data saver mode
- Push notifications toggle
- Email notifications toggle
- Theme mode (dark/light/system)
- App language (bn/en)

## COMPONENTS (same glass-card style as Admin):
- StudentSidebar: navigation with collapse toggle
- Header: user avatar, notifications bell, search
- CourseCard: thumbnail, title, instructor, rating, progress
- VideoCard: thumbnail, duration, title, completion badge
- CategoryChip: icon + name, clickable filter
- ProgressRing: circular progress indicator
- SearchBar: with debounced API calls

## STUDENT API ENDPOINTS (add to Worker):

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /student/auth/login | No | Login, returns token+user |
| POST | /student/auth/check | Bearer | Verify session, return user |
| DELETE | /student/auth/logout | Bearer | Delete session |
| GET | /student/profile | Bearer | Get own profile |
| PUT | /student/profile | Bearer | Update profile |
| GET | /student/courses | Bearer | List enrolled courses with progress |
| GET | /student/courses/all | Bearer | Course catalog (published only) |
| GET | /student/courses/:id | Bearer | Course detail + curriculum |
| POST | /student/enroll | Bearer | Enroll in course |
| GET | /student/videos | Bearer | Videos for enrolled course |
| GET | /student/watch-progress | Bearer | Get watch progress |
| POST | /student/watch-progress | Bearer | Update watch progress |
| GET | /student/bookmarks | Bearer | List bookmarks |
| POST | /student/bookmarks | Bearer | Add bookmark |
| DELETE | /student/bookmarks | Bearer | Remove bookmark |
| GET | /student/notifications | Bearer | List notifications |
| PUT | /student/notifications/read | Bearer | Mark as read |
| GET | /student/discussions | Bearer | List discussions |
| POST | /student/discussions | Bearer | Create discussion |
| GET | /student/settings | Bearer | Get settings |
| PUT | /student/settings | Bearer | Update settings |
| GET | /student/categories | Bearer | List categories (public) |
| GET | /student/instructors | Bearer | List instructors (public) |
| GET | /student/config | Bearer | Get ServerConfig |

## DEPLOY
Cloudflare Pages, project name "dakkho-student". Same CI/CD as Admin (GitHub Actions). Build: `next build` (output: "export"), then `wrangler pages deploy out/`.

## CORS
Add `https://dakkho-student.pages.dev` to Worker CORS origins.

## D1 Schema Addition (optional)
Create `student_sessions` table if you want session tracking:
```sql
CREATE TABLE IF NOT EXISTS student_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  appwrite_session_id TEXT NOT NULL,
  email TEXT NOT NULL,
  name TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL,
  is_active INTEGER DEFAULT 1
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_student_sessions_user_id ON student_sessions(user_id);
```
