'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, ArrowLeft, Check, Eye, EyeOff, ShieldCheck, MailCheck, KeyRound } from 'lucide-react';
import { useAuthStore, useNavigationStore } from '@/lib/store';
import { GlassCard } from '../shared/GlassCard';
import { GradientButton } from '../shared/GradientButton';
import { PasswordStrengthIndicator } from './PasswordStrengthIndicator';
import { OTPInput } from './OTPInput';
import { OTP_RESEND_COOLDOWN } from '@/lib/constants';
import Image from 'next/image';

type Step = 'email' | 'otp' | 'success';

// Floating blobs for background
function BackgroundBlobs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <motion.div
        className="absolute -top-20 -left-20 w-72 h-72 rounded-full bg-sky-200/20 dark:bg-sky-800/10 blur-3xl"
        animate={{
          y: [0, -30, 0],
          x: [0, 20, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute -bottom-32 -right-20 w-80 h-80 rounded-full bg-blue-200/20 dark:bg-blue-800/10 blur-3xl"
        animate={{
          y: [0, 25, 0],
          x: [0, -20, 0],
          scale: [1, 1.15, 1],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute top-1/3 right-1/4 w-48 h-48 rounded-full bg-teal-200/10 dark:bg-teal-800/5 blur-3xl"
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.2, 0.5, 0.2],
        }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      />
    </div>
  );
}

// Mail check animation component
function MailCheckAnimation() {
  return (
    <div className="relative w-20 h-20 mx-auto mb-4">
      {/* Envelope */}
      <motion.div
        className="absolute inset-0 rounded-2xl bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center"
        initial={{ scale: 0, rotate: -10 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
      >
        <Mail className="w-8 h-8 text-sky-500" />
      </motion.div>
      {/* Check badge */}
      <motion.div
        className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 15, delay: 0.4 }}
      >
        <Check className="w-4 h-4 text-white" strokeWidth={3} />
      </motion.div>
      {/* Pulse ring */}
      <motion.div
        className="absolute inset-0 rounded-2xl border-2 border-sky-400/50"
        animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
        transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
      />
    </div>
  );
}

export function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [otpError, setOtpError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const { forgotPassword, verifyOTP, isLoading } = useAuthStore();
  const navigate = useNavigationStore((s) => s.navigate);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleSendReset = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError('');

    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    try {
      await forgotPassword(email);
      setCooldown(OTP_RESEND_COOLDOWN);
      setStep('otp');
    } catch {
      setEmailError('Failed to send reset code. Please try again.');
    }
  }, [email, forgotPassword]);

  const handleOTPComplete = async (otp: string) => {
    const result = await verifyOTP(email, otp);
    if (result) {
      setStep('success');
    } else {
      setOtpError('Invalid OTP. Please try again.');
    }
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');

    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }
    setStep('success');
  };

  const getStepIcon = () => {
    if (step === 'email') return <Mail className="w-5 h-5" />;
    if (step === 'otp') return <KeyRound className="w-5 h-5" />;
    return <ShieldCheck className="w-5 h-5" />;
  };

  const getStepTitle = () => {
    if (step === 'email') return 'Reset Password';
    if (step === 'otp') return 'Enter New Password';
    return 'Password Reset';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-sky-950 p-4 relative overflow-hidden">
      <BackgroundBlobs />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md relative z-10"
      >
        <GlassCard className="p-6 sm:p-8">
          {/* Logo */}
          <div className="flex flex-col items-center mb-6">
            <motion.div
              className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center mb-2 shadow-lg shadow-sky-500/30"
              animate={{ rotate: [0, 3, -3, 0] }}
              transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Image src="/logo.png" alt="DAKKHO" width={28} height={28} className="rounded-xl" />
            </motion.div>
            <h1 className="text-xl font-extrabold gradient-text">{getStepTitle()}</h1>
          </div>

          {/* Step indicator */}
          {step !== 'success' && (
            <div className="flex items-center justify-center gap-4 mb-6">
              {(['email', 'otp'] as const).map((s, i) => (
                <div key={s} className="flex items-center gap-2">
                  <motion.div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors duration-300 ${
                      (s === 'email' && step === 'email') || (s === 'otp' && step === 'otp')
                        ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white'
                        : (s === 'email' && step === 'otp')
                        ? 'bg-emerald-500 text-white'
                        : 'bg-muted text-muted-foreground'
                    }`}
                    animate={{
                      scale: s === step ? 1.1 : 1,
                    }}
                  >
                    {s === 'email' && step === 'otp' ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      i + 1
                    )}
                  </motion.div>
                  <span className="text-xs font-semibold text-muted-foreground">
                    {s === 'email' ? 'Email' : 'New Password'}
                  </span>
                  {i === 0 && (
                    <div className="w-8 h-0.5 bg-muted">
                      <motion.div
                        className="h-full bg-gradient-to-r from-sky-500 to-blue-600"
                        animate={{ width: step === 'otp' ? '100%' : '0%' }}
                        transition={{ duration: 0.4 }}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <AnimatePresence mode="wait">
            {step === 'email' && (
              <motion.form
                key="email-step"
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                onSubmit={handleSendReset}
                className="space-y-5"
              >
                <div className="text-center">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-sky-50 dark:bg-sky-900/20 flex items-center justify-center mb-3">
                    <MailCheck className="w-7 h-7 text-sky-500" />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Enter your email and we&apos;ll send you a verification code to reset your password
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setEmailError(''); }}
                      placeholder="your@email.com"
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-muted/30 border-2 border-transparent focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 outline-none text-sm transition-all"
                      required
                    />
                  </div>
                  <AnimatePresence>
                    {emailError && (
                      <motion.p
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="text-xs text-red-500 mt-1"
                      >
                        {emailError}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
                <GradientButton type="submit" loading={isLoading} className="w-full" size="lg">
                  Send Reset Code
                </GradientButton>
              </motion.form>
            )}

            {step === 'otp' && (
              <motion.form
                key="otp-step"
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                onSubmit={handleResetPassword}
                className="space-y-4"
              >
                <div className="text-center mb-2">
                  <p className="text-sm text-muted-foreground">
                    Enter the code sent to <span className="font-semibold text-foreground">{email}</span>
                  </p>
                </div>

                <OTPInput
                  onComplete={handleOTPComplete}
                  onResend={() => { setCooldown(OTP_RESEND_COOLDOWN); setOtpError(''); }}
                  cooldown={cooldown}
                  error={otpError}
                />

                {/* Divider */}
                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-muted-foreground/20" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="px-3 bg-white/70 dark:bg-slate-900/70 text-muted-foreground font-medium">then set new password</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1.5">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => { setNewPassword(e.target.value); setPasswordError(''); }}
                      placeholder="Enter new password"
                      className="w-full pl-10 pr-10 py-3 rounded-xl bg-muted/30 border-2 border-transparent focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 outline-none text-sm transition-all"
                      required
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2">
                      {showPassword ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
                    </button>
                  </div>
                  <PasswordStrengthIndicator password={newPassword} />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => { setConfirmPassword(e.target.value); setPasswordError(''); }}
                      placeholder="Confirm new password"
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-muted/30 border-2 border-transparent focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 outline-none text-sm transition-all"
                      required
                    />
                  </div>
                  {/* Match indicator */}
                  <AnimatePresence>
                    {confirmPassword && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-1"
                      >
                        {newPassword === confirmPassword ? (
                          <p className="text-xs text-emerald-500 font-medium">Passwords match</p>
                        ) : (
                          <p className="text-xs text-red-500 font-medium">Passwords do not match</p>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <AnimatePresence>
                  {passwordError && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50"
                    >
                      <p className="text-xs text-red-600 dark:text-red-400 font-medium">{passwordError}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
                <GradientButton type="submit" className="w-full" size="lg">
                  Reset Password
                </GradientButton>
              </motion.form>
            )}

            {step === 'success' && (
              <motion.div
                key="success-step"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                className="text-center space-y-4"
              >
                <MailCheckAnimation />
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <h3 className="text-lg font-bold text-foreground">Password Reset!</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Your password has been successfully reset. You can now sign in with your new password.
                  </p>
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <GradientButton onClick={() => navigate('login')} className="w-full" size="lg">
                    Sign In Now
                  </GradientButton>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Back to login */}
          <AnimatePresence>
            {step !== 'success' && (
              <motion.div
                className="text-center mt-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ delay: 0.3 }}
              >
                <button
                  onClick={() => navigate('login')}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-muted/30 hover:bg-muted/50 text-sm font-semibold text-muted-foreground hover:text-foreground transition-all duration-200"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Sign In
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </GlassCard>
      </motion.div>
    </div>
  );
}
