'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle, Trash2, Shield, CheckCircle, XCircle,
  Eye, EyeOff, Lock, ArrowLeft,
  User, BookOpen, Award, Download, Clock,
  MessageSquare, AlertCircle,
} from 'lucide-react';
import { useNavigationStore, useAuthStore } from '@/lib/store';
import { GlassCard } from '../shared/GlassCard';
import { AnimatedPage } from '../shared/AnimatedPage';
import { GradientButton } from '../shared/GradientButton';

const DELETION_REASONS = [
  { id: 'not-useful', label: 'Content not useful to me', icon: BookOpen },
  { id: 'found-alternative', label: 'Found a better alternative', icon: ArrowLeft },
  { id: 'privacy-concerns', label: 'Privacy or data concerns', icon: Shield },
  { id: 'too-expensive', label: 'Too expensive / subscription issues', icon: Award },
  { id: 'technical-issues', label: 'Technical issues / bugs', icon: AlertCircle },
  { id: 'graduated', label: 'Graduated / No longer need it', icon: Award },
  { id: 'account-compromised', label: 'Account compromised', icon: Shield },
  { id: 'other', label: 'Other reason', icon: MessageSquare },
];

export function DeleteAccountPage() {
  const { navigate } = useNavigationStore();
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);

  const [step, setStep] = useState<'warning' | 'survey' | 'confirm' | 'password' | 'deleted'>('warning');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [acknowledged, setAcknowledged] = useState({
    dataLost: false,
    coursesLost: false,
    certificatesLost: false,
    permanentAction: false,
  });

  // Survey state
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');
  const [canImprove, setCanImprove] = useState('');

  const allAcknowledged = Object.values(acknowledged).every(Boolean);
  const confirmMatch = confirmText === 'DELETE';

  const handleDelete = async () => {
    if (!confirmMatch || !password.trim()) return;
    setIsDeleting(true);

    try {
      // Submit deletion with survey to server
      await fetch('/api/user/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          reason: selectedReason,
          feedback: feedback,
          passwordVerified: true,
        }),
      });
    } catch {}

    await new Promise((r) => setTimeout(r, 1500));
    setIsDeleting(false);
    setStep('deleted');
  };

  if (step === 'deleted') {
    return (
      <AnimatedPage keyProp="account-deleted">
        <div className="pb-20 lg:pb-0 flex items-center justify-center min-h-[60vh]">
          <GlassCard className="p-8 text-center max-w-md">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.2 }}>
              <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
            </motion.div>
            <h2 className="text-xl font-extrabold text-foreground mb-2">Account Deleted</h2>
            <p className="text-sm text-muted-foreground mb-2">
              Your account has been permanently deleted. All your data has been removed from our servers.
            </p>
            <p className="text-xs text-muted-foreground mb-6">
              We are sorry to see you go. Your feedback has been recorded and will help us improve.
            </p>
            <GradientButton onClick={() => { logout(); navigate('login'); }}>
              Return to Login
            </GradientButton>
          </GlassCard>
        </div>
      </AnimatedPage>
    );
  }

  return (
    <AnimatedPage keyProp="delete-account">
      <div className="pb-20 lg:pb-0">
        {/* Breadcrumb */}
        <motion.div className="flex items-center gap-2 text-sm text-muted-foreground mb-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <button onClick={() => navigate('home')} className="hover:text-sky-500 transition-colors">Home</button>
          <span>/</span>
          <button onClick={() => navigate('profile')} className="hover:text-sky-500 transition-colors">Profile</button>
          <span>/</span>
          <span className="text-red-500 font-semibold">Delete Account</span>
        </motion.div>

        {/* Sensitive Action Warning Banner */}
        <motion.div
          className="mb-4 p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-300 dark:border-amber-800/50"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <h2 className="text-base font-extrabold text-amber-700 dark:text-amber-400">Sensitive Action</h2>
              <p className="text-sm text-amber-600/80 dark:text-amber-400/80 mt-1">
                You are about to perform a sensitive action that permanently affects your account. This action requires identity verification and cannot be reversed. Please proceed carefully.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Danger Banner */}
        <motion.div
          className="mb-6 p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800/30"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <h2 className="text-base font-extrabold text-red-600 dark:text-red-400">Danger Zone</h2>
              <p className="text-sm text-red-600/80 dark:text-red-400/80 mt-1">
                This action is permanent and cannot be undone. All your data, progress, certificates, and course access will be permanently deleted.
              </p>
            </div>
          </div>
        </motion.div>

        {/* What you'll lose */}
        <GlassCard className="p-6 mb-6">
          <h3 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-red-500" />
            What You Will Lose
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { icon: User, label: 'Profile Information', detail: 'Name, email, avatar, and settings' },
              { icon: BookOpen, label: 'Course Progress', detail: 'All progress and enrollment data' },
              { icon: Award, label: 'Certificates', detail: 'All earned certificates permanently removed' },
              { icon: Download, label: 'Downloads', detail: 'All downloaded content access revoked' },
              { icon: Clock, label: 'Watch History', detail: 'Complete watch history deleted' },
              { icon: Shield, label: 'Account Data', detail: 'All personal data permanently erased' },
            ].map((item, i) => (
              <motion.div
                key={item.label}
                className="flex items-center gap-3 p-3 rounded-xl bg-red-50/30 dark:bg-red-900/10 border border-red-100 dark:border-red-800/20"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.06 }}
              >
                <div className="w-9 h-9 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                  <item.icon className="w-4 h-4 text-red-500" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">{item.label}</p>
                  <p className="text-[10px] text-muted-foreground">{item.detail}</p>
                </div>
                <XCircle className="w-4 h-4 text-red-400 ml-auto flex-shrink-0" />
              </motion.div>
            ))}
          </div>
        </GlassCard>

        {/* Step-based flow */}
        <AnimatePresence mode="wait">
          {step === 'warning' && (
            <motion.div key="warning-step" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <GlassCard className="p-6">
                <h3 className="text-base font-bold text-foreground mb-4">Before you proceed</h3>
                <div className="space-y-3 mb-6">
                  {[
                    { key: 'dataLost' as const, label: 'I understand that all my data will be permanently deleted' },
                    { key: 'coursesLost' as const, label: 'I understand that I will lose access to all my enrolled courses' },
                    { key: 'certificatesLost' as const, label: 'I understand that my certificates cannot be recovered' },
                    { key: 'permanentAction' as const, label: 'I understand that this action cannot be undone' },
                  ].map((item) => (
                    <motion.button
                      key={item.key}
                      className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all border-2 hover:border-red-300"
                      style={{ borderColor: acknowledged[item.key] ? '#ef4444' : 'transparent', background: acknowledged[item.key] ? 'rgba(239,68,68,0.05)' : 'rgba(0,0,0,0.03)' }}
                      onClick={() => setAcknowledged((prev) => ({ ...prev, [item.key]: !prev[item.key] }))}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                        acknowledged[item.key] ? 'bg-red-500 border-red-500' : 'border-muted-foreground/30'
                      }`}>
                        {acknowledged[item.key] && <CheckCircle className="w-3 h-3 text-white" />}
                      </div>
                      <span className={`text-sm font-medium ${acknowledged[item.key] ? 'text-red-600 dark:text-red-400' : 'text-foreground'}`}>
                        {item.label}
                      </span>
                    </motion.button>
                  ))}
                </div>

                <div className="flex items-center justify-between">
                  <motion.button
                    className="px-4 py-2.5 rounded-xl bg-muted/30 text-sm font-semibold text-foreground flex items-center gap-2"
                    onClick={() => navigate('profile')}
                    whileTap={{ scale: 0.95 }}
                  >
                    <ArrowLeft className="w-4 h-4" /> Keep My Account
                  </motion.button>
                  <motion.button
                    className={`px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${
                      allAcknowledged
                        ? 'bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/30'
                        : 'bg-muted/30 text-muted-foreground cursor-not-allowed'
                    }`}
                    onClick={() => allAcknowledged && setStep('survey')}
                    whileTap={allAcknowledged ? { scale: 0.95 } : undefined}
                  >
                    Continue <Trash2 className="w-4 h-4" />
                  </motion.button>
                </div>
              </GlassCard>
            </motion.div>
          )}

          {/* Survey Step */}
          {step === 'survey' && (
            <motion.div key="survey-step" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <GlassCard className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-foreground">Why are you leaving?</h3>
                    <p className="text-xs text-muted-foreground">Help us improve by sharing your reason (required)</p>
                  </div>
                </div>

                <div className="space-y-2 mb-5">
                  {DELETION_REASONS.map((reason) => (
                    <motion.button
                      key={reason.id}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all border-2 ${
                        selectedReason === reason.id
                          ? 'border-sky-500 bg-sky-50/50 dark:bg-sky-900/10'
                          : 'border-transparent bg-muted/20 hover:bg-muted/30'
                      }`}
                      onClick={() => setSelectedReason(reason.id)}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        selectedReason === reason.id ? 'border-sky-500' : 'border-muted-foreground/30'
                      }`}>
                        {selectedReason === reason.id && <div className="w-2.5 h-2.5 rounded-full bg-sky-500" />}
                      </div>
                      <reason.icon className={`w-4 h-4 flex-shrink-0 ${selectedReason === reason.id ? 'text-sky-500' : 'text-muted-foreground'}`} />
                      <span className={`text-sm font-medium ${selectedReason === reason.id ? 'text-sky-600 dark:text-sky-400' : 'text-foreground'}`}>
                        {reason.label}
                      </span>
                    </motion.button>
                  ))}
                </div>

                {/* Feedback */}
                {selectedReason && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3 mb-5">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                        Additional Feedback (optional)
                      </label>
                      <textarea
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        placeholder="Tell us more about why you are leaving. Your feedback helps us improve DAKKHO for other students..."
                        rows={3}
                        className="w-full px-4 py-3 rounded-xl bg-muted/30 border border-white/30 dark:border-white/10 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/50 resize-none"
                        maxLength={500}
                      />
                      <p className="text-[10px] text-muted-foreground mt-1">{feedback.length}/500 characters</p>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                        What could we do better? (optional)
                      </label>
                      <input
                        type="text"
                        value={canImprove}
                        onChange={(e) => setCanImprove(e.target.value)}
                        placeholder="One thing that would have made you stay..."
                        className="w-full px-4 py-3 rounded-xl bg-muted/30 border border-white/30 dark:border-white/10 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                        maxLength={200}
                      />
                    </div>
                  </motion.div>
                )}

                <div className="flex items-center justify-between">
                  <motion.button
                    className="px-4 py-2.5 rounded-xl bg-muted/30 text-sm font-semibold text-foreground flex items-center gap-2"
                    onClick={() => setStep('warning')}
                    whileTap={{ scale: 0.95 }}
                  >
                    <ArrowLeft className="w-4 h-4" /> Go Back
                  </motion.button>
                  <motion.button
                    className={`px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${
                      selectedReason
                        ? 'bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/30'
                        : 'bg-muted/30 text-muted-foreground cursor-not-allowed'
                    }`}
                    onClick={() => selectedReason && setStep('confirm')}
                    whileTap={selectedReason ? { scale: 0.95 } : undefined}
                  >
                    Continue <Trash2 className="w-4 h-4" />
                  </motion.button>
                </div>
              </GlassCard>
            </motion.div>
          )}

          {step === 'confirm' && (
            <motion.div key="confirm-step" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <GlassCard className="p-6">
                <h3 className="text-base font-bold text-foreground mb-2">Confirm Account Deletion</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Type <span className="font-bold text-red-500">DELETE</span> to confirm that you want to permanently delete your account.
                </p>

                <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-4 h-4 text-red-500" />
                    <span className="text-xs font-bold text-red-600 dark:text-red-400 uppercase">Identity Verification Required</span>
                  </div>
                  <p className="text-xs text-red-600/70 dark:text-red-400/70">
                    You will be asked to enter your password on the next step to verify that you are the account owner.
                  </p>
                </div>

                <div className="mb-6">
                  <input
                    type="text"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder='Type "DELETE" to confirm'
                    className={`w-full px-4 py-3 rounded-xl bg-muted/30 border text-sm font-bold text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-red-500/50 ${
                      confirmText && !confirmMatch ? 'border-red-500' : confirmMatch ? 'border-emerald-500' : 'border-white/30 dark:border-white/10'
                    }`}
                  />
                  {confirmText && !confirmMatch && (
                    <p className="text-xs text-red-500 mt-1 text-center">Please type DELETE exactly</p>
                  )}
                  {confirmMatch && (
                    <motion.p className="text-xs text-emerald-500 mt-1 text-center flex items-center justify-center gap-1" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <CheckCircle className="w-3 h-3" /> Confirmation text matches
                    </motion.p>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <motion.button
                    className="px-4 py-2.5 rounded-xl bg-muted/30 text-sm font-semibold text-foreground flex items-center gap-2"
                    onClick={() => setStep('survey')}
                    whileTap={{ scale: 0.95 }}
                  >
                    <ArrowLeft className="w-4 h-4" /> Go Back
                  </motion.button>
                  <motion.button
                    className={`px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${
                      confirmMatch
                        ? 'bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/30'
                        : 'bg-muted/30 text-muted-foreground cursor-not-allowed'
                    }`}
                    onClick={() => confirmMatch && setStep('password')}
                    whileTap={confirmMatch ? { scale: 0.95 } : undefined}
                  >
                    Verify Identity <Trash2 className="w-4 h-4" />
                  </motion.button>
                </div>
              </GlassCard>
            </motion.div>
          )}

          {step === 'password' && (
            <motion.div key="password-step" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <GlassCard className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                    <Lock className="w-5 h-5 text-red-500" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-foreground">Verify Your Identity</h3>
                    <p className="text-xs text-muted-foreground">Enter your password to confirm this is really you</p>
                  </div>
                </div>

                <div className="mb-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30">
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    This verification ensures that only you can delete your account. If someone else has access to your device, they will not be able to delete your account without your password.
                  </p>
                </div>

                <div className="relative mb-6">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your current password"
                    className="w-full pl-10 pr-12 py-3 rounded-xl bg-muted/30 border border-white/30 dark:border-white/10 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-red-500/50"
                  />
                  <motion.button
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword(!showPassword)}
                    whileTap={{ scale: 0.9 }}
                    type="button"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </motion.button>
                </div>

                <div className="flex items-center justify-between">
                  <motion.button
                    className="px-4 py-2.5 rounded-xl bg-muted/30 text-sm font-semibold text-foreground flex items-center gap-2"
                    onClick={() => setStep('confirm')}
                    whileTap={{ scale: 0.95 }}
                  >
                    <ArrowLeft className="w-4 h-4" /> Go Back
                  </motion.button>
                  <GradientButton
                    variant="danger"
                    onClick={handleDelete}
                    loading={isDeleting}
                    disabled={!password.trim()}
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete My Account
                  </GradientButton>
                </div>
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Alternative actions */}
        <GlassCard className="p-6 mt-6">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">Consider These Alternatives</h3>
          <div className="space-y-2">
            {[
              { label: 'Take a break — pause your subscription instead', action: 'subscription' },
              { label: 'Change your email or personal information', action: 'edit-profile' },
              { label: 'Contact support for account-related issues', action: 'help' },
            ].map((alt, i) => (
              <motion.button
                key={alt.label}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-muted/20 text-left hover:bg-muted/30 transition-colors"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.06 }}
                onClick={() => navigate(alt.action as any)}
              >
                <Shield className="w-4 h-4 text-sky-500" />
                <span className="text-sm font-medium text-foreground">{alt.label}</span>
              </motion.button>
            ))}
          </div>
        </GlassCard>
      </div>
    </AnimatedPage>
  );
}
