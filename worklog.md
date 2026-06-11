---
Task ID: 1
Agent: Main Agent
Task: Fix OTP verification bugs - "Invalid or expired code" error, server-side cooldown, and rate limiting

Work Log:
- Read and analyzed backend code (student-api.ts, student-auth.ts) and frontend code (EmailVerificationPage.tsx, OTPInput.tsx, api-client.ts, store.ts)
- Identified root cause of "Invalid or expired code" bug: resend-otp and forgot-password INSERT statements didn't explicitly set `used = 0`, and clicking "new code sent to your email" text could trigger resend which deletes the original OTP
- Fixed resend-otp endpoint to include `used = 0` in INSERT statement
- Fixed forgot-password endpoint to include `used = 0` in INSERT statement
- Added server-side 60-second cooldown enforcement in resend-otp endpoint (returns 429 with COOLDOWN_ACTIVE code)
- Added new GET /auth/otp-cooldown endpoint that returns remaining cooldown seconds from server (based on last OTP's created_at)
- Updated frontend api-client.ts to include otpCooldown API method
- Updated EmailVerificationPage.tsx to fetch cooldown from server on page load (survives page refresh)
- Updated OTPInput.tsx to handle cooldown === -1 loading state
- Made "New code sent to your email" text fully non-interactive (pointerEvents: 'none', userSelect: 'none', cursor: 'default')
- Added debug logging to verify-otp endpoint to help diagnose future OTP validation failures
- Cleaned up expired OTPs in D1 database (marked 4 expired OTPs as used)
- Deployed worker to Cloudflare (version 54ca8dbc)
- Deployed student app to Cloudflare Pages

Stage Summary:
- OTP "Invalid or expired code" bug fixed by ensuring `used = 0` is set in all INSERT statements
- Resend cooldown now enforced server-side and persists across page refreshes
- "New code sent to your email" text is now fully non-interactive
- Per-user daily rate limiting already existed (10 emails/day), now enforced with server-side cooldown too
- Debug logging added to help diagnose future issues
