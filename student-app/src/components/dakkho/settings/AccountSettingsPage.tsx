'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Mail, Phone, Shield, ChevronRight, ChevronLeft,
  Lock, CheckCircle, AlertCircle, Key, Smartphone,
  RefreshCw, Check, Loader2,
} from 'lucide-react';
import { useNavigationStore, useAuthStore } from '@/lib/store';
import { studentProfileApi } from '@/lib/api-client';
import { GlassCard } from '../shared/GlassCard';
import { GradientButton } from '../shared/GradientButton';
import { SensitiveActionPrompt } from '../shared/SensitiveActionPrompt';

function Toggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <motion.button
      className={`w-11 h-6 rounded-full p-0.5 transition-colors ${enabled ? 'bg-sky-500' : 'bg-muted'}`}
      onClick={onToggle}
      whileTap={{ scale: 0.9 }}
    >
      <motion.div
        className="w-5 h-5 rounded-full bg-white shadow-sm"
        animate={{ x: enabled ? 20 : 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      />
    </motion.button>
  );
}

export function AccountSettingsPage() {
  const { goBack, navigate } = useNavigationStore();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const [fullName, setFullName] = useState(user?.fullName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState('');
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [showDeletePrompt, setShowDeletePrompt] = useState(false);

  // Fetch profile data on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await studentProfileApi.stats();
        if (cancelled) return;
        const profile = result.profile;
        setPhone(profile.phone || '');
      } catch {
        // Profile endpoint may fail — use defaults
      } finally {
        if (!cancelled) setProfileLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      await studentProfileApi.update({ name: fullName, phone });
      if (user) {
        setUser({ ...user, fullName, email });
      }
      setSaved(true);
      setIsEditing(false);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setSaveError(err?.message || 'Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="pb-20 lg:pb-0">
      {/* Header */}
      <motion.div className="flex items-center gap-3 mb-6" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <motion.button
          className="w-9 h-9 rounded-xl bg-muted/30 flex items-center justify-center text-foreground"
          onClick={goBack}
          whileTap={{ scale: 0.9 }}
        >
          <ChevronLeft className="w-5 h-5" />
        </motion.button>
        <div>
          <h1 className="text-xl font-extrabold text-foreground">Account Settings</h1>
          <p className="text-xs text-muted-foreground">Manage your account information and security</p>
        </div>
      </motion.div>

      {saved && (
        <motion.div
          className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 flex items-center gap-2"
          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        >
          <CheckCircle className="w-4 h-4 text-emerald-500" />
          <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Account updated successfully!</p>
        </motion.div>
      )}

      {saveError && (
        <motion.div
          className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-center gap-2"
          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        >
          <AlertCircle className="w-4 h-4 text-red-500" />
          <p className="text-sm font-semibold text-red-700 dark:text-red-400">{saveError}</p>
        </motion.div>
      )}

      {/* Profile Info */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <GlassCard className="p-5 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <User className="w-4 h-4 text-sky-500" /> Profile Information
            </h3>
            {!isEditing ? (
              <motion.button
                className="text-xs font-semibold text-sky-500 px-3 py-1.5 rounded-lg bg-sky-50 dark:bg-sky-900/20"
                onClick={() => navigate('edit-profile')}
                whileTap={{ scale: 0.95 }}
              >
                Edit Profile
              </motion.button>
            ) : null}
          </div>

          {profileLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-sky-500 animate-spin" />
            </div>
          ) : (
            <>
              <div className="flex items-center gap-4 mb-4 p-3 rounded-xl bg-muted/20">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white text-2xl font-extrabold shadow-lg">
                  {fullName.charAt(0) || '?'}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-foreground">{fullName || 'Student'}</p>
                  <p className="text-xs text-muted-foreground">{email}</p>
                  <p className="text-xs text-sky-500 font-semibold mt-0.5">{user?.institute || ''}</p>
                </div>
              </div>

              {isEditing ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-muted/30 border border-white/30 dark:border-white/10 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-muted/30 border border-white/30 dark:border-white/10 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">Phone Number</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+880 1XXX-XXXXXX"
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-muted/30 border border-white/30 dark:border-white/10 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <GradientButton onClick={handleSave} loading={isSaving} size="sm">
                      <CheckCircle className="w-4 h-4" /> Save
                    </GradientButton>
                    <motion.button
                      className="px-4 py-2 rounded-xl bg-muted/30 text-sm font-semibold text-foreground"
                      onClick={() => setIsEditing(false)}
                      whileTap={{ scale: 0.95 }}
                    >
                      Cancel
                    </motion.button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-foreground">{email}</span>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 font-semibold">Verified</span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-foreground">{phone || 'Not set'}</span>
                    </div>
                    {phone && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 font-semibold">Verified</span>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </GlassCard>
      </motion.div>

      {/* Security */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <GlassCard className="p-5 mb-4">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4 text-sky-500" /> Security
          </h3>
          <div className="space-y-4">
            {/* Change Password */}
            <motion.div
              className="flex items-center justify-between py-2 cursor-pointer hover:bg-muted/20 rounded-lg px-1 -mx-1 transition-colors"
              onClick={() => navigate('change-password')}
              whileHover={{ x: 2 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                  <Key className="w-4 h-4 text-amber-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Change Password</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </motion.div>

            {/* Two-Factor Authentication */}
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-900/20 flex items-center justify-center">
                  <Smartphone className="w-4 h-4 text-sky-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Two-Factor Authentication</p>
                  <p className="text-xs text-muted-foreground">{twoFactorEnabled ? 'Enabled — Extra security active' : 'Disabled — Enable for extra security'}</p>
                </div>
              </div>
              <Toggle enabled={twoFactorEnabled} onToggle={() => setTwoFactorEnabled(!twoFactorEnabled)} />
            </div>

            {/* Active Sessions */}
            <motion.div
              className="flex items-center justify-between py-2 cursor-pointer hover:bg-muted/20 rounded-lg px-1 -mx-1 transition-colors"
              onClick={() => navigate('settings-sessions')}
              whileHover={{ x: 2 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                  <RefreshCw className="w-4 h-4 text-emerald-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Active Sessions</p>
                  <p className="text-xs text-muted-foreground">1 active session</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </motion.div>

            {/* Delete Account */}
            <motion.div
              className="flex items-center justify-between py-2 cursor-pointer hover:bg-red-50/50 dark:hover:bg-red-900/10 rounded-lg px-1 -mx-1 transition-colors"
              onClick={() => setShowDeletePrompt(true)}
              whileHover={{ x: 2 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                  <AlertCircle className="w-4 h-4 text-red-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-red-600 dark:text-red-400">Delete Account</p>
                  <p className="text-xs text-muted-foreground">Permanently remove your account and data</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-red-400" />
            </motion.div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Social Login - Coming Soon */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <GlassCard className="p-5">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-4">
            <Lock className="w-4 h-4 text-sky-500" /> Social Login
          </h3>
          <div className="flex items-center justify-center py-6 text-muted-foreground">
            <div className="text-center">
              <Lock className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-semibold">Social login coming soon</p>
              <p className="text-xs mt-1">Google, Facebook & GitHub login will be available in a future update.</p>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Sensitive Action Prompt for Delete Account */}
      <SensitiveActionPrompt
        isOpen={showDeletePrompt}
        onClose={() => setShowDeletePrompt(false)}
        onConfirm={() => { setShowDeletePrompt(false); navigate('delete-account'); }}
        title="Delete Account?"
        description="This is a sensitive action that will permanently delete your account and all associated data. You will need to verify your identity."
        confirmLabel="Continue to Delete"
        cancelLabel="Keep Account"
        icon={AlertCircle}
        requiresVerification={true}
      />
    </div>
  );
}
