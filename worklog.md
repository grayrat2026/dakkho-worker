---
Task ID: 1
Agent: main
Task: Fix Forget Password OTP, Header Disappearing, and Admin App errors

Work Log:
- Explored entire project structure (student-app, student-app-work, admin, worker)
- Identified root cause of OTP not sending: backend `/auth/forgot-password` was a TODO stub
- Added `password_reset_otps` table to schema.sql
- Implemented full OTP flow in worker: generate OTP → store in D1 → send via Resend email
- Added new `/auth/reset-password` endpoint that verifies OTP and updates password
- Updated `/auth/resend-otp` to actually generate and send new OTP
- Updated frontend: Added `resetPassword` to api-client, store, and ForgotPasswordPage
- Fixed forgot-password page accessible for authenticated users (removed from authPageKeys redirect)
- Added forgot-password to PageRouter for authenticated shell rendering
- Fixed header/hamburger disappearing: Moved ErrorBoundary INSIDE AppShell so page errors don't unmount shell
- Fixed Admin App: Added error.tsx, _redirects for Cloudflare Pages SPA routing, not-found.tsx
- Synced all changes to student-app-work directory

Stage Summary:
- Backend OTP flow fully implemented with Resend email sending
- Frontend forgot-password flow now uses resetPassword API (verify OTP + set new password in one step)
- Header/hamburger no longer disappears when page components throw errors
- Admin App has proper error boundaries and Cloudflare Pages routing configuration
