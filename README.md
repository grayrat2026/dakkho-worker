<div align="center">

# ⚡ DAKKHO — Worker API

**Backend API for the DAKKHO Online Learning Platform**

[![Hono](https://img.shields.io/badge/Hono-4.7-E3602B?style=for-the-badge&logo=hono&logoColor=white)](https://hono.dev/)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)](https://workers.cloudflare.com/)
[![TypeScript 5](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![D1 Database](https://img.shields.io/badge/D1-Database-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)](https://developers.cloudflare.com/d1/)
[![R2 Storage](https://img.shields.io/badge/R2-Storage-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)](https://developers.cloudflare.com/r2/)

**🌐 Live:** [dakkho-admin-api.dakkho-admin.workers.dev](https://dakkho-admin-api.dakkho-admin.workers.dev)

</div>

---

## 📖 Overview

DAKKHO Worker API is the centralized backend powering all three frontend applications — Student, Instructor, and Admin. Built on [Hono](https://hono.dev/) and deployed to Cloudflare Workers, it leverages D1 (SQLite) for relational data, R2 for object storage, and KV for configuration broadcasting. The API handles authentication for three distinct user roles, tokenized HLS video streaming, PipraPay/SSLCommerz/bKash payment processing, email via Resend, and push notifications via OneSignal.

## 🔗 Related Repositories

| Repository | Description | Live URL |
|---|---|---|
| [dakkho-student-app](https://github.com/grayrat2026/dakkho-student-app) | Student-facing Next.js 16 SPA | [dakkho-student.pages.dev](https://dakkho-student.pages.dev) |
| [dakkho-instructor](https://github.com/grayrat2026/dakkho-instructor) | Instructor-facing Next.js 16 SPA | [dakkho-instructor.pages.dev](https://dakkho-instructor.pages.dev) |
| [dakkho-admin-web](https://github.com/grayrat2026/dakkho-admin-web) | Admin panel Next.js 16 SPA | [dakkho-admin.pages.dev](https://dakkho-admin.pages.dev) |

## 🏗 Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                   Cloudflare Workers Runtime                  │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐ │
│  │  /auth   │  │/instructor│  │  /api    │  │   /admin     │ │
│  │ Unified  │  │ Instructor│  │ Student  │  │   Admin      │ │
│  │  Auth    │  │  Routes   │  │  Routes  │  │   Routes     │ │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────┬───────┘ │
│       │             │             │               │         │
│  ┌────┴─────────────┴─────────────┴───────────────┴───────┐ │
│  │              Hono Middleware Layer                       │ │
│  │  • CORS (7 origins)  • Logger  • Auth (3 types)         │ │
│  └────┬────────────┬──────────────┬────────────────────────┘ │
│       │            │              │                          │
│  ┌────▼────┐  ┌────▼────┐  ┌────▼─────┐                    │
│  │   D1    │  │   R2    │  │   KV     │                    │
│  │ (SQLite)│  │ (5 Buckets)│ (Config) │                    │
│  └─────────┘  └─────────┘  └──────────┘                    │
│                                                              │
│  ┌──────────────────┐  ┌──────────────────────────────────┐ │
│  │ Cron (3 AM daily)│  │ External Services                │ │
│  │ R2 cleanup       │  │ Resend • OneSignal • PipraPay    │ │
│  └──────────────────┘  │ SSLCommerz • bKash               │ │
│                         └──────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

## 🧰 Tech Stack

| Technology | Version | Purpose |
|---|---|---|
| Hono | 4.7 | Fast web framework for Cloudflare Workers |
| Cloudflare Workers | — | Serverless edge runtime |
| TypeScript | 5.7+ | Type-safe development |
| D1 | — | SQLite-based relational database |
| R2 | — | S3-compatible object storage (5 buckets) |
| KV | — | Key-value store for config broadcasting |
| Wrangler | 3.99+ | CLI for development and deployment |
| Resend | — | Transactional email delivery |
| OneSignal | — | Push notification service |
| PipraPay | — | BD payment gateway (primary) |
| SSLCommerz | — | BD payment gateway (plug & play) |
| bKash | — | BD mobile banking (plug & play) |

## 🔐 Authentication System

The API implements **three independent authentication systems**, each with its own session table and middleware:

| Role | Session Table | Token Storage | Middleware |
|---|---|---|---|
| Admin | `admin_sessions` | Cookie | `adminAuthMiddleware` |
| Instructor | `instructor_sessions` | Bearer Token | `instructorAuthMiddleware` / `instructorOrAdminMiddleware` |
| Student | `student_sessions` | Bearer Token | `studentAuthMiddleware` |

### Unified Auth (`/auth`)
Role-agnostic login that auto-detects whether the user is a student, instructor, or admin based on credentials.

### Password Security
- **Admin**: PBKDF2-SHA256 with 100,000 iterations
- **Instructor**: bcrypt-based verification
- **Student**: OTP-based (email) + password authentication

## 📡 API Route Groups

### Admin Routes (`/admin/*`)
Protected by `adminAuthMiddleware`. Full CRUD operations for platform management.

| Route File | Mount Path | Description |
|---|---|---|
| `courses.ts` | `/admin/courses` | Course CRUD, pricing, publishing |
| `videos.ts` | `/admin/videos` | Video metadata management |
| `categories.ts` | `/admin/categories` | Course category management |
| `instructors.ts` | `/admin/instructors` | Instructor profile management |
| `users.ts` | `/admin/users` | Student user management |
| `institutes.ts` | `/admin/institutes` | Polytechnic institute directory |
| `institute-requests.ts` | `/admin/institute-requests` | Institute addition requests |
| `technologies.ts` | `/admin/technologies` | Technology/department management |
| `subjects.ts` | `/admin/subjects` | Subject management with technology filter |
| `chapters.ts` | `/admin/chapters` | Chapter CRUD |
| `lessons.ts` | `/admin/lessons` | Lesson CRUD |
| `learning-points.ts` | `/admin/learning-points` | Learning objectives |
| `packages.ts` | `/admin/packages` | Course package management |
| `enrollments.ts` | `/admin/enrollments` | Enrollment management |
| `payments.ts` | `/admin/payments` | Payment verification (PipraPay/SSLCommerz/bKash) |
| `coupons.ts` | `/admin/coupons` | Coupon code management |
| `discounts.ts` | `/admin/discounts` | Discount management |
| `events.ts` | `/admin/events` | Event management |
| `live-classes.ts` | `/admin/live-classes` | Live class scheduling |
| `notifications.ts` | `/admin/notifications` | Notification management + OneSignal push |
| `push.ts` | `/admin/push` | Push notification management |
| `analytics.ts` | `/admin/analytics` | Platform analytics and statistics |
| `config.ts` | `/admin/config` | App configuration (D1 + KV) |
| `upload.ts` | `/admin/upload` | R2 file upload |
| `email.ts` | `/admin/email` | Email sending via Resend |
| `about.ts` | `/admin/about` | About page management |
| `support.ts` | `/admin/support` | Support ticket management + Telegram |
| `achievements.ts` | `/admin/achievements` | Achievement definitions + unlock tracking |
| `certificates.ts` | `/student/certificates` | Certificate generation |
| `system.ts` | `/admin/system` | System health checks |
| `admin.ts` | `/admin/admin` | Audit logs, session management |
| `migration.ts` | `/admin/migration` | One-time D1 migration utilities |
| `migrate.ts` | `/admin/migrate` | D1 schema migration |

### Instructor Routes (`/instructor/*`)
Protected by `instructorOrAdminMiddleware`. Instructor can manage their own courses, videos, schedule, and profile.

| Endpoint | Method | Description |
|---|---|---|
| `/instructor/auth/login` | POST | Instructor login |
| `/instructor/auth/check` | GET | Verify session |
| `/instructor/auth/logout` | POST | End session |
| `/instructor/courses` | GET | List instructor's courses |
| `/instructor/courses/:id` | GET | Course detail |
| `/instructor/courses` | POST | Create course |
| `/instructor/courses/:id` | PUT | Update course |
| `/instructor/courses/:id` | DELETE | Delete course |
| `/instructor/courses/:id/videos` | GET | List course videos |
| `/instructor/courses/:id/videos` | POST | Add video |
| `/instructor/courses/:id/videos/:videoId` | PUT | Update video |
| `/instructor/courses/:id/videos/:videoId` | DELETE | Delete video |
| `/instructor/courses/:id/chapters` | GET/POST | Chapter management |
| `/instructor/courses/:id/lessons` | GET/POST | Lesson management |
| `/instructor/courses/:id/resources` | GET/POST | Resource management |
| `/instructor/courses/:id/thumbnail` | POST | Upload course thumbnail |
| `/instructor/dashboard` | GET | Dashboard stats |
| `/instructor/analytics` | GET | Course analytics |
| `/instructor/earnings` | GET | Revenue tracking |
| `/instructor/students` | GET | Student progress |
| `/instructor/reviews` | GET | Course reviews |
| `/instructor/schedule` | GET | Class schedule |
| `/instructor/profile` | GET/PUT | Profile management |
| `/instructor/notifications` | GET | Notification center |
| `/instructor/change-password` | POST | Password change |

### Student API Routes (`/api/*`)
Protected by `studentAuthMiddleware`. Students browse courses, enroll, stream videos, and manage profiles.

| Endpoint | Method | Description |
|---|---|---|
| `/api/courses` | GET | Published course catalog |
| `/api/courses/:id` | GET | Course detail with curriculum |
| `/api/courses/:id/videos` | GET | Course video list |
| `/api/instructors` | GET | Featured instructors |
| `/api/enrollments/mine` | GET | Student's enrollments |
| `/api/packages` | GET | Available packages |
| `/api/video/stream` | GET | Tokenized HLS stream URL |
| `/api/watch-history` | GET/POST | Watch progress tracking |
| `/api/about` | GET | About page content |
| `/api/support` | GET/POST | Support tickets |
| `/api/leaderboard` | GET | Leaderboard with filters |
| `/api/achievements` | GET | Student achievements |
| `/api/learning-stats` | GET | Learning statistics |
| `/api/student/profile` | GET/PUT | Profile management |
| `/api/student/settings` | GET/PUT | App settings |

### Public Routes
| Endpoint | Method | Description |
|---|---|---|
| `/auth/login` | POST | Unified role-agnostic login |
| `/auth/register` | POST | Student registration |
| `/auth/otp/send` | POST | Send OTP |
| `/auth/otp/verify` | POST | Verify OTP |
| `/upload/:bucketType/:key` | GET | Public R2 file serving |

## 🗄 Database Schema

975-line SQL schema defining **30+ tables**:

| Table | Purpose |
|---|---|
| `admin_sessions` | Admin JWT session tokens |
| `instructor_sessions` | Instructor JWT session tokens |
| `student_sessions` | Student JWT session tokens |
| `users` | Student accounts and profiles |
| `instructors` | Instructor profiles and specializations |
| `courses` | Course catalog with pricing and metadata |
| `course_instructors` | Many-to-many course-instructor mapping |
| `course_subjects` | Course-subject relationships |
| `subjects` | Academic subjects |
| `subject_technologies` | Subject-to-technology mapping |
| `chapters` | Course chapters |
| `lessons` | Lessons within chapters |
| `course_learning_points` | Learning objectives per course |
| `videos` | Video metadata and R2 references |
| `categories` | Course categories |
| `technologies` | Technology/department definitions |
| `institutes` | Polytechnic institute directory |
| `enrollments` | Student course enrollments |
| `packages` | Enrollment package definitions |
| `user_packages` | Student package subscriptions |
| `payments` | Payment transaction records |
| `coupons` | Promotional coupon codes |
| `discounts` | Active discount campaigns |
| `events` | Platform events |
| `live_classes` | Scheduled live class sessions |
| `notifications` | User notifications |
| `achievements` | Achievement definitions |
| `user_achievements` | Unlocked achievements per user |
| `watch_history` | Video viewing progress |
| `quiz_questions` | Quiz question bank |
| `quiz_attempts` | Student quiz attempts |
| `certificates` | Earned certificates |
| `discussions` | Discussion threads and replies |
| `support_tickets` | Student support requests |
| `support_messages` | Support ticket messages |
| `audit_logs` | Admin action audit trail |
| `app_config` | Application configuration |
| `terms_versions` | Terms of service versions |

## 🪣 R2 Storage Buckets

| Binding | Bucket Name | Purpose |
|---|---|---|
| `R2_VIDEOS` | `dakkho-videos` | Course video files |
| `R2_THUMBNAILS` | `dakkho-thumbnails` | Course and video thumbnails |
| `R2_AVATARS` | `dakkho-avatars` | User and instructor avatars |
| `R2_RESOURCES` | `dakkho-resources` | Downloadable course resources (PDFs, docs) |
| `R2_SUPPORT_ATTACHMENTS` | `dakkho-support-attachments` | Support ticket attachments |

## 💳 Payment Gateways

| Gateway | Status | Features |
|---|---|---|
| **PipraPay** | Active | Custom domain `pay.dakkho.pro.bd`, auto-verification |
| SSLCommerz | Plug & Play | Ready for activation |
| bKash | Plug & Play | Ready for activation |
| Manual | Active | Admin verifies payment screenshots |

## ⏰ Cron Triggers

| Schedule | Job |
|---|---|
| `0 3 * * *` | Daily cleanup of R2 attachments from resolved/closed support tickets older than 30 days |

## 🔑 Secrets (via `wrangler secret put`)

| Secret | Purpose |
|---|---|
| `RESEND_API_KEY` | Email service API key |
| `ADMIN_SECRET_KEY` | Admin JWT signing secret |
| `ONE_SIGNAL_APP_ID` | OneSignal push app ID |
| `ONE_SIGNAL_REST_API_KEY` | OneSignal REST API key |
| `VAPID_PRIVATE_KEY` | Web Push VAPID private key |
| `VAPID_PUBLIC_KEY` | Web Push VAPID public key |
| `VAPID_SUBJECT` | Web Push VAPID subject URL |
| `PIPRAPAY_API_KEY` | PipraPay payment gateway key |

## 📁 Project Structure

```
worker/
├── src/
│   ├── index.ts                 # Hono app entry — mounts all route groups
│   ├── env.ts                   # Cloudflare Worker bindings type definitions
│   ├── routes/                  # 38 route modules
│   │   ├── auth.ts              # Admin authentication
│   │   ├── unified-auth.ts      # Role-agnostic login
│   │   ├── instructor.ts        # All instructor endpoints (3200+ lines)
│   │   ├── student-api.ts       # All student endpoints (3500+ lines)
│   │   ├── courses.ts           # Admin course CRUD
│   │   ├── videos.ts            # Admin video CRUD
│   │   ├── categories.ts        # Admin category CRUD
│   │   ├── instructors.ts       # Admin instructor CRUD
│   │   ├── users.ts             # Admin user CRUD
│   │   ├── institutes.ts        # Admin institute CRUD
│   │   ├── technologies.ts      # Technology/department CRUD
│   │   ├── subjects.ts          # Subject CRUD
│   │   ├── chapters.ts          # Chapter CRUD
│   │   ├── lessons.ts           # Lesson CRUD
│   │   ├── packages.ts          # Package management
│   │   ├── enrollments.ts       # Enrollment management
│   │   ├── payments.ts          # Payment verification
│   │   ├── coupons.ts           # Coupon management
│   │   ├── discounts.ts         # Discount management
│   │   ├── events.ts            # Event management
│   │   ├── live-classes.ts      # Live class scheduling
│   │   ├── notifications.ts     # Notification + OneSignal
│   │   ├── push.ts              # Push notification management
│   │   ├── analytics.ts         # Platform analytics
│   │   ├── config.ts            # App configuration
│   │   ├── upload.ts            # R2 file upload
│   │   ├── email.ts             # Resend email
│   │   ├── about.ts             # About page management
│   │   ├── support.ts           # Support tickets + Telegram
│   │   ├── achievements.ts      # Achievement management
│   │   ├── certificates.ts      # Certificate generation
│   │   ├── discussions.ts       # Discussion threads
│   │   ├── quizzes.ts           # Quiz management
│   │   ├── watch-history.ts     # Watch history tracking
│   │   ├── video-streaming.ts   # Tokenized HLS streaming
│   │   ├── learning-points.ts   # Learning objectives
│   │   ├── institute-requests.ts# Institute requests
│   │   ├── admin.ts             # Audit logs, sessions
│   │   ├── system.ts            # System health
│   │   ├── migration.ts         # Migration utilities
│   │   ├── migrate.ts           # Schema migration
│   │   ├── student.ts           # Legacy student routes
│   │   └── terms.ts             # Terms of service
│   └── lib/                     # 17 library modules
│       ├── auth.ts              # Admin JWT auth
│       ├── auth-password.ts     # PBKDF2-SHA256 password hashing
│       ├── student-auth.ts      # Student session management
│       ├── student-auth-middleware.ts
│       ├── instructor-auth.ts   # Instructor session management
│       ├── instructor-auth-middleware.ts
│       ├── otp.ts               # OTP generation & verification
│       ├── totp.ts              # TOTP 2FA support
│       ├── r2.ts                # R2 public URL helpers
│       ├── rate-limit.ts        # Rate limiting middleware
│       ├── resend.ts            # Email sending via Resend
│       ├── onesignal.ts         # OneSignal push notifications
│       ├── web-push.ts          # Web Push (RFC 8291/8292)
│       ├── payment.ts           # Payment gateway integrations
│       ├── achievements.ts      # Achievement unlock logic
│       ├── streak.ts            # Learning streak tracking
│       ├── cron.ts              # Scheduled job handlers
│       ├── auto-notifications.ts# Auto-notification triggers
│       ├── audit.ts             # Audit log helper
│       ├── appwrite.ts          # Legacy Appwrite migration
│       ├── types.ts             # Shared type definitions
│       └── utils.ts             # General utilities
├── schema.sql                   # Full D1 database schema
├── migration-d1.sql             # Initial D1 migration
├── migration-incremental.sql    # Incremental schema updates
├── migration-curriculum.sql     # Curriculum structure migration
├── migration-subject-technologies.sql
├── migration-piprapay.sql       # PipraPay tables migration
├── seed-technologies.sql        # Technology seed data
├── seed-achievements.sql        # Achievement seed data
├── seed-instructors.sql         # Instructor seed data
├── seed-polytechnics.sql        # Polytechnic institute seed data
├── wrangler.toml                # Worker configuration
├── tsconfig.json                # TypeScript configuration
└── package.json                 # Dependencies
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Cloudflare account with Workers, D1, R2, and KV access
- Wrangler CLI (`npm install -g wrangler`)

### Installation

```bash
# Clone the repository
git clone https://github.com/grayrat2026/dakkho-worker.git
cd dakkho-worker/worker

# Install dependencies
npm install

# Login to Cloudflare
npx wrangler login
```

### Database Setup

```bash
# Create D1 database (if not already created)
npx wrangler d1 create dakkho-admin-db

# Run schema migration
npx wrangler d1 execute dakkho-admin-db --file=./schema.sql

# Seed initial data
npx wrangler d1 execute dakkho-admin-db --file=./seed-technologies.sql
npx wrangler d1 execute dakkho-admin-db --file=./seed-achievements.sql
```

### Set Secrets

```bash
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put ADMIN_SECRET_KEY
npx wrangler secret put ONE_SIGNAL_APP_ID
npx wrangler secret put ONE_SIGNAL_REST_API_KEY
npx wrangler secret put PIPRAPAY_API_KEY
```

### Development

```bash
# Start local development server
npm run dev

# Test with Wrangler tail (live logs)
npm run tail
```

### Deploy

```bash
# Deploy to Cloudflare Workers
npx wrangler deploy --config wrangler.toml
```

## 🌐 CORS Configuration

The API allows requests from the following origins:

- `https://dakkho-student.pages.dev`
- `https://dakkho-instructor.pages.dev`
- `https://dakkho-admin.pages.dev`
- `https://dakkhostudent.pages.dev`
- `https://localhost:3000` (development)
- `https://localhost:3001` (development)
- Additional custom domains as needed

## 📊 Source Stats

| Metric | Value |
|---|---|
| Route Files | 38 |
| Library Files | 17 |
| Total TypeScript Files | 67 |
| Database Tables | 30+ |
| R2 Buckets | 5 |
| API Endpoint Groups | 4 (auth, admin, instructor, student) |

## 📋 Recent Changes (June 2026)

### Instructor Profile & Stats
- `GET /instructors/:id` (public) now computes `totalCourses` and `totalStudents` from D1, returns `coverUrl` and `avatarUrl`
- `GET /instructors/:id/courses` now searches both `courses.instructor_id` AND `course_instructors` junction table

### Instructor Search & List
- `GET /instructor/instructors/search?q=` — Search active instructors by name/email (for course instructor assignment)
- `GET /instructor/instructors/list` — Default active instructor list (no search query needed)

### Course Instructor CRUD
- `GET /instructor/courses/:id/instructors` — List course owner + co-instructors with subject assignments
- `POST /instructor/courses/:id/instructors` — Add co-instructor with subject_ids
- `DELETE /instructor/courses/:id/instructors/:instructorId` — Remove co-instructor

### Video Search Fix
- `GET /instructor/videos/search` now properly uses auth middleware (`c.get('instructorId')` instead of broken `c.get('instructor')?.id`)

### Subject Multi-Technology Support
- `GET /instructor/subjects` now searches both `subjects.technology_id` AND `subject_technologies` junction table
- Returns `technology_ids` and `technology_names` from junction for each subject

## 📄 License

This project is proprietary and confidential. All rights reserved.

---

<p align="center">
  Built with ⚡ for the DAKKHO Platform
</p>
