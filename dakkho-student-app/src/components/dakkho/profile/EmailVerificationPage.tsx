'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Mail, CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuthStore, useNavigationStore } from '@/lib/store';
import { authApi } from '@/lib/api-client';
import { GlassCard } from '../shared/GlassCard';
import { GradientButton } from '../shared/GradientButton';
import { OTPInput } from '../auth/OTPInput';
import { OTP_RESEND_COOLDOWN } from '@/lib/constants';

// ── Cooldown persistence helpers (localStorage as backup) ──
const COOLDOWN_STORAGE_KEY = 'dakkho-otp-cooldown-end';

function saveCooldownEnd(timestamp: number) {
  try { localStorage.setItem(COOLDOWN_STORAGE_KEY, String(timestamp)); } catch {}
}

function loadCooldownEnd(): number | null {
  try {
    const stored = localStorage.getItem(COOLDOWN_STORAGE_KEY);
    if (stored) return Number(stored);
  } catch {}
  return null;
}

function clearCooldownEnd() {
  try { localStorage.removeItem(COOLDOWN_STORAGE_KEY); } catch {}
}

export function EmailVerificationPage() {
  const user = useAuthStore((s) => s.user);
  const verifyOTP = useAuthStore((s) => s.verifyOTP);
  const navigate = useNavigationStore((s) => s.navigate);
  const goBack = useNavigationStore((s) => s.goBack);

  const [otpError, setOtpError] = useState<string | undefined>();
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  // Start at -1 to indicate "loading from server"; will be set to actual value after mount
  const [cooldown, setCooldown] = useState(-1);
  const [resendSent, setResendSent] = useState(false);
  const cooldownHydrated = useRef(false);

  // ── Hydrate cooldown from SERVER after mount (survives page refresh) ──
  useEffect(() => {
    if (cooldownHydrated.current || !user?.email) return;
    cooldownHydrated.current = true;

    const fetchCooldown = async () => {
      try {
        const res = await authApi.otpCooldown(user.email);
        const serverCooldown = res.cooldownSeconds || 0;
        if (serverCooldown > 0) {
          const endTime = Date.now() + serverCooldown * 1000;
          saveCooldownEnd(endTime);
          setCooldown(serverCooldown);
        } else {
          // Also check localStorage as fallback
          const endTime = loadCooldownEnd();
          if (endTime) {
            const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
            if (remaining > 0) {
              setCooldown(remaining);
            } else {
              clearCooldownEnd();
              setCooldown(0);
            }
          } else {
            setCooldown(0);
          }
        }
      } catch {
        // Fallback to localStorage if server request fails
        const endTime = loadCooldownEnd();
        if (endTime) {
          const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
          if (remaining > 0) {
            setCooldown(remaining);
          } else {
            clearCooldownEnd();
            setCooldown(0);
          }
        } else {
          setCooldown(0);
        }
      }
    };

    fetchCooldown();
  }, [user?.email]);

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) {
      if (cooldown === 0) clearCooldownEnd();
      return;
    }
    const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleOTPComplete = useCallback(async (otp: string) => {
    if (!user?.email) return;

    setIsVerifying(true);
    setOtpError(undefined);

    try {
      const success = await verifyOTP(user.email, otp);
      if (success) {
        setIsVerified(true);
        clearCooldownEnd();
      } else {
        setOtpError('Invalid or expired code. Please try again.');
      }
    } catch {
      setOtpError('Verification failed. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  }, [user?.email, verifyOTP]);

  const isResending = useRef(false);

  const handleResend = useCallback(async () => {
    if (!user?.email || cooldown > 0 || isVerifying || isResending.current) return;

    isResending.current = true;
    try {
      await authApi.resendOTP({ email: user.email });
      const endTime = Date.now() + OTP_RESEND_COOLDOWN * 1000;
      saveCooldownEnd(endTime);
      setCooldown(OTP_RESEND_COOLDOWN);
      setResendSent(true);
      setOtpError(undefined);
      setTimeout(() => setResendSent(false), 3000);
    } catch (err: any) {
      // If server says cooldown is active, sync our local cooldown to the server value
      if (err?.code === 'COOLDOWN_ACTIVE' && err?.cooldownSeconds) {
        const remaining = err.cooldownSeconds;
        const endTime = Date.now() + remaining * 1000;
        saveCooldownEnd(endTime);
        setCooldown(remaining);
        setOtpError(undefined);
      } else if (err?.code === 'RATE_LIMITED') {
        setOtpError(err.message || 'Too many requests. Please try again tomorrow.');
      } else {
        setOtpError('Failed to resend code. Please try again.');
      }
    } finally {
      isResending.current = false;
    }
  }, [user?.email, cooldown, isVerifying]);

  if (!user) return null;

  // If already verified when page loads
  if (user.emailVerified && !isVerified) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <motion.div
            className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 0.6 }}
          >
            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
          </motion.div>
          <h2 className="text-xl font-extrabold text-foreground mb-2">Already Verified</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Your email {user.email} is already verified.
          </p>
          <GradientButton onClick={() => navigate('profile')}>
            Back to Profile
          </GradientButton>
        </motion.div>
      </div>
    );
  }

  // Success state
  if (isVerified) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <motion.div
            className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
          </motion.div>
          <motion.h2
            className="text-xl font-extrabold text-foreground mb-2"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            Email Verified!
          </motion.h2>
          <motion.p
            className="text-sm text-muted-foreground mb-6"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            Your email has been verified successfully. You now have full access to all features.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <GradientButton onClick={() => navigate('profile')}>
              Back to Profile
            </GradientButton>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Back button */}
        <motion.button
          className="flex items-center gap-2 text-sm text-muted-foreground mb-6 hover:text-foreground transition-colors"
          onClick={goBack}
          whileHover={{ x: -2 }}
          whileTap={{ scale: 0.95 }}
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </motion.button>

        <GlassCard className="p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <motion.div
              className="w-16 h-16 rounded-2xl bg-sky-50 dark:bg-sky-900/20 flex items-center justify-center mx-auto mb-4"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            >
              <Mail className="w-8 h-8 text-sky-500" />
            </motion.div>
            <h1 className="text-xl font-extrabold text-foreground">Verify Your Email</h1>
            <p className="text-sm text-muted-foreground mt-2">
              We sent a verification code to
            </p>
            <p className="text-sm font-bold text-foreground">{user.email}</p>
          </div>

          {/* OTP Input */}
          <div className="mb-6">
            <OTPInput
              onComplete={handleOTPComplete}
              onResend={handleResend}
              cooldown={cooldown}
              error={otpError}
              isVerifying={isVerifying}
            />
          </div>

          {/* Verifying indicator */}
          {isVerifying && (
            <motion.div
              className="flex items-center gap-2 justify-center text-sm text-sky-600 dark:text-sky-400 mb-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <motion.div
                className="w-4 h-4 border-2 border-sky-500 border-t-transparent rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              />
              Verifying...
            </motion.div>
          )}

          {/* Resend feedback — purely informational, NEVER interactive */}
          <AnimatePresence>
            {resendSent && (
              <motion.div
                role="status"
                aria-live="polite"
                className="flex items-center gap-2 justify-center text-sm text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/10 rounded-lg px-3 py-2 mb-3 select-none"
                style={{ pointerEvents: 'none', userSelect: 'none', cursor: 'default' }}
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>New code sent to your email</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Info box */}
          <div className="mt-6 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/50">
            <div className="flex gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="text-xs text-amber-700 dark:text-amber-400">
                <p className="font-semibold mb-1">Didn&apos;t receive the code?</p>
                <p className="text-amber-600 dark:text-amber-500">
                  Check your spam folder or wait for the cooldown and tap &quot;Resend Code&quot; to get a new one. The code expires in 10 minutes.
                </p>
              </div>
            </div>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
}
