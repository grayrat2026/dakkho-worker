# DAKKHO Admin API

**Backend API** for the DAKKHO Online Learning Platform, built on Cloudflare Workers.

**Live:** [dakkho-admin-api.dakkho-admin.workers.dev](https://dakkho-admin-api.dakkho-admin.workers.dev)

## Tech Stack

- Hono (web framework)
- Cloudflare Workers + D1 (SQLite) + R2 + KV
- PipraPay payment integration
- HMAC-SHA256 HLS video token authentication

## Recent Changes (June 2026)

### Auth & Profile
- Login API now returns `avatarUrl` from users table — fixes profile picture not showing in student app
- Student session validation with 30-day expiry
- Email verification flow with OTP

### Payment
- PipraPay checkout integration with auto-activation on webhook
- Manual payment submission with admin verification
- Coupon validation with percentage/flat discount support
- Auto-activate package on verified payment

### Video Streaming
- HLS token authentication with HMAC-SHA256 (30min expiry)
- R2 chunked upload support for instructors

## API Routes

| Path | Description | Auth |
|---|---|---|
| `POST /api/auth/login` | Student login | No |
| `POST /api/auth/signup` | Student signup | No |
| `GET /api/auth/me` | Current user | Yes |
| `GET /api/packages/mine` | User's packages | Yes |
| `GET /api/course-packages` | Packages for course | No |
| `POST /api/payments/create` | Create PipraPay order | Yes |
| `POST /api/payments/verify` | Verify payment | Yes |
| `POST /api/payments/piprapay/webhook` | Webhook (no auth) | No |
| `GET /api/courses` | List courses | No |
| `GET /api/courses/:id` | Course detail | No |
| `GET /api/courses/:id/curriculum` | Course curriculum | No |
| `GET /api/video/stream-url` | HLS stream URL | Yes |
| `GET /api/coupons/validate` | Validate coupon | No |

## Development

```bash
npm install
npm run dev
```

## Deploy

```bash
CLOUDFLARE_API_TOKEN=<token> npx wrangler@3.99.0 deploy --config wrangler.toml
```

See [DEPLOY.md](./DEPLOY.md) for full setup instructions.

## Related Repositories

| Repository | Description | Live URL |
|---|---|---|
| [dakkho-student-app](https://github.com/grayrat2026/dakkho-student-app) | Student SPA | [dakkho-student.pages.dev](https://dakkho-student.pages.dev) |
| [dakkho-instructor](https://github.com/grayrat2026/dakkho-instructor) | Instructor SPA | [dakkho-instructor.pages.dev](https://dakkho-instructor.pages.dev) |
| [dakkho-admin-web](https://github.com/grayrat2026/dakkho-admin-web) | Admin panel SPA | [dakkho-admin.pages.dev](https://dakkho-admin.pages.dev) |
