'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Lock, Eye, EyeOff, Shield, CheckCircle, AlertCircle,
  KeyRound, ChevronLeft, X, Info,
} from 'lucide-react';
import { useNavigationStore } from '@/lib/store';
import { GlassCard } from '../shared/GlassCard';
import { AnimatedPage } from '../shared/AnimatedPage';
import { GradientButton } from '../shared/GradientButton';

export function ChangePasswordPage() {
  const { navigate } = useNavigationStore();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isChanging, setIsChanging] = useState(false);
  const [isChanged, setIsChanged] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const getPasswordStrength = (password: string): { level: number; label: string; color: string } => {
    if (!password) return { level: 0, label: '', color: '' };
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 2) return { level: 1, label: 'Weak', color: 'bg-red-500' };
    if (score <= 3) return { level: 2, label: 'Fair', color: 'bg-amber-500' };
    if (score <= 4) return { level: 3, label: 'Good', color: 'bg-sky-500' };
    return { level: 4, label: 'Strong', color: 'bg-emerald-500' };
  };

  const strength = getPasswordStrength(newPassword);

  const requirements = [
    { label: 'At least 8 characters', met: newPassword.length >= 8 },
    { label: 'One uppercase letter', met: /[A-Z]/.test(newPassword) },
    { label: 'One number', met: /[0-9]/.test(newPassword) },
    { label: 'One special character', met: /[^A-Za-z0-9]/.test(newPassword) },
    { label: 'Passwords match', met: confirmPassword.length > 0 && newPassword === confirmPassword },
  ];

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!currentPassword.trim()) newErrors.currentPassword = 'Current password is required';
    if (!newPassword.trim()) newErrors.newPassword = 'New password is required';
    else if (newPassword.length < 8) newErrors.newPassword = 'Password must be at least 8 characters';
    if (!confirmPassword.trim()) newErrors.confirmPassword = 'Please confirm your new password';
    else if (newPassword !== confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    if (currentPassword === newPassword && newPassword) newErrors.newPassword = 'New password must be different from current';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = async () => {
    if (!validate()) return;
    setIsChanging(true);
    await new Promise((r) => setTimeout(r, 1500));
    setIsChanging(false);
    setIsChanged(true);
    setTimeout(() => {
      setIsChanged(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }, 3000);
  };

  if (isChanged) {
    return (
      <AnimatedPage keyProp="password-changed">
        <div className="pb-20 lg:pb-0">
          <GlassCard className="p-8 text-center">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.2 }}>
              <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
            </motion.div>
            <h2 className="text-xl font-extrabold text-foreground mb-2">Password Changed!</h2>
            <p className="text-sm text-muted-foreground mb-6">Your password has been updated successfully.</p>
            <GradientButton onClick={() => navigate('profile')}>Back to Profile</GradientButton>
          </GlassCard>
        </div>
      </AnimatedPage>
    );
  }

  return (
    <AnimatedPage keyProp="change-password">
      <div className="pb-20 lg:pb-0">
        {/* Breadcrumb */}
        <motion.div className="flex items-center gap-2 text-sm text-muted-foreground mb-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <button onClick={() => navigate('home')} className="hover:text-sky-500 transition-colors">Home</button>
          <span>/</span>
          <button onClick={() => navigate('profile')} className="hover:text-sky-500 transition-colors">Profile</button>
          <span>/</span>
          <span className="text-foreground font-semibold">Change Password</span>
        </motion.div>

        {/* Header */}
        <GlassCard className="p-6 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-sky-50 dark:bg-sky-900/20 flex items-center justify-center">
              <Shield className="w-6 h-6 text-sky-500" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold text-foreground">Change Password</h1>
              <p className="text-sm text-muted-foreground">Keep your account secure with a strong password</p>
            </div>
          </div>
        </GlassCard>

        {/* Form */}
        <GlassCard className="p-6">
          <div className="space-y-5">
            {/* Current Password */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                Current Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type={showCurrent ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => { setCurrentPassword(e.target.value); setErrors({ ...errors, currentPassword: '' }); }}
                  className={`w-full pl-10 pr-12 py-3 rounded-xl bg-muted/30 border text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/50 ${
                    errors.currentPassword ? 'border-red-500' : 'border-white/30 dark:border-white/10'
                  }`}
                  placeholder="Enter current password"
                />
                <motion.button
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowCurrent(!showCurrent)}
                  whileTap={{ scale: 0.9 }}
                  type="button"
                >
                  {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </motion.button>
              </div>
              {errors.currentPassword && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.currentPassword}</p>}
            </div>

            {/* New Password */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                New Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => { setNewPassword(e.target.value); setErrors({ ...errors, newPassword: '' }); }}
                  className={`w-full pl-10 pr-12 py-3 rounded-xl bg-muted/30 border text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/50 ${
                    errors.newPassword ? 'border-red-500' : 'border-white/30 dark:border-white/10'
                  }`}
                  placeholder="Enter new password"
                />
                <motion.button
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowNew(!showNew)}
                  whileTap={{ scale: 0.9 }}
                  type="button"
                >
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </motion.button>
              </div>
              {errors.newPassword && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.newPassword}</p>}

              {/* Password strength */}
              {newPassword && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className={`h-1.5 flex-1 rounded-full transition-all ${
                          level <= strength.level ? strength.color : 'bg-muted/30'
                        }`}
                      />
                    ))}
                  </div>
                  <p className={`text-xs font-semibold ${
                    strength.level <= 1 ? 'text-red-500' : strength.level <= 2 ? 'text-amber-500' : strength.level <= 3 ? 'text-sky-500' : 'text-emerald-500'
                  }`}>
                    {strength.label}
                  </p>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                Confirm New Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setErrors({ ...errors, confirmPassword: '' }); }}
                  className={`w-full pl-10 pr-12 py-3 rounded-xl bg-muted/30 border text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/50 ${
                    errors.confirmPassword ? 'border-red-500' : 'border-white/30 dark:border-white/10'
                  }`}
                  placeholder="Confirm new password"
                />
                <motion.button
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowConfirm(!showConfirm)}
                  whileTap={{ scale: 0.9 }}
                  type="button"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </motion.button>
              </div>
              {errors.confirmPassword && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.confirmPassword}</p>}
              {confirmPassword && newPassword === confirmPassword && (
                <motion.p className="text-xs text-emerald-500 mt-1 flex items-center gap-1" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <CheckCircle className="w-3 h-3" /> Passwords match
                </motion.p>
              )}
            </div>

            {/* Requirements */}
            <GlassCard className="p-4 bg-white/30 dark:bg-slate-800/30">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <Info className="w-3.5 h-3.5" /> Password Requirements
              </p>
              <div className="space-y-2">
                {requirements.map((req) => (
                  <div key={req.label} className="flex items-center gap-2">
                    {req.met ? (
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30" />
                    )}
                    <span className={`text-xs ${req.met ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-muted-foreground'}`}>
                      {req.label}
                    </span>
                  </div>
                ))}
              </div>
            </GlassCard>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/20 dark:border-white/5">
            <motion.button
              className="px-4 py-2.5 rounded-xl bg-muted/30 text-sm font-semibold text-foreground flex items-center gap-2"
              onClick={() => navigate('profile')}
              whileTap={{ scale: 0.95 }}
            >
              <X className="w-4 h-4" /> Cancel
            </motion.button>
            <GradientButton onClick={handleChange} loading={isChanging}>
              <Shield className="w-4 h-4" /> Change Password
            </GradientButton>
          </div>
        </GlassCard>
      </div>
    </AnimatedPage>
  );
}
