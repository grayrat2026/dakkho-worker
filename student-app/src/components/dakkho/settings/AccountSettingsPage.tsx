'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Mail, Phone, Shield, Link, ChevronRight, ChevronLeft,
  Lock, CheckCircle, AlertCircle, Eye, EyeOff, Key, Smartphone,
  Globe, RefreshCw, Check,
} from 'lucide-react';
import { useNavigationStore, useAuthStore } from '@/lib/store';
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

  const [fullName, setFullName] = useState(user?.fullName || 'Rahim Ahmed');
  const [email, setEmail] = useState(user?.email || 'rahim@dakkho.com');
  const [phone, setPhone] = useState('+880 1712-345678');
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [linkedAccounts, setLinkedAccounts] = useState([
    { provider: 'Google', email: 'rahim@gmail.com', connected: true, icon: Globe, color: 'text-red-500 bg-red-50 dark:bg-red-900/20' },
    { provider: 'Facebook', email: '', connected: false, icon: Globe, color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20' },
    { provider: 'GitHub', email: 'rahim-dev@github.com', connected: true, icon: Globe, color: 'text-slate-600 bg-slate-50 dark:bg-slate-900/20' },
  ]);

  const [connectingProvider, setConnectingProvider] = useState<string | null>(null);
  const [showDeletePrompt, setShowDeletePrompt] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise((r) => setTimeout(r, 1200));
    if (user) {
      setUser({ ...user, fullName, email });
    }
    setIsSaving(false);
    setSaved(true);
    setIsEditing(false);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleToggleLinkedAccount = async (provider: string) => {
    setConnectingProvider(provider);
    await new Promise((r) => setTimeout(r, 1000));
    setLinkedAccounts((prev) =>
      prev.map((acc) =>
        acc.provider === provider
          ? {
              ...acc,
              connected: !acc.connected,
              email: acc.connected ? '' : `${user?.fullName?.toLowerCase().replace(/\s/g, '')}@${provider.toLowerCase()}.com`,
            }
          : acc
      )
    );
    setConnectingProvider(null);
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

          <div className="flex items-center gap-4 mb-4 p-3 rounded-xl bg-muted/20">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white text-2xl font-extrabold shadow-lg">
              {fullName.charAt(0)}
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-foreground">{fullName}</p>
              <p className="text-xs text-muted-foreground">{email}</p>
              <p className="text-xs text-sky-500 font-semibold mt-0.5">{user?.institute || 'Dhaka Polytechnic Institute'}</p>
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
                  <span className="text-sm text-foreground">{phone}</span>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 font-semibold">Verified</span>
              </div>
            </div>
          )}
        </GlassCard>
      </motion.div>

      {/* Two-Factor Authentication */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <GlassCard className="p-5 mb-4">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4 text-sky-500" /> Security
          </h3>
          <div className="space-y-4">
            {/* Change Password - NOW CLICKABLE */}
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
                  <p className="text-xs text-muted-foreground">Last changed 30 days ago</p>
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

            {/* Active Sessions - NOW CLICKABLE */}
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
                  <p className="text-xs text-muted-foreground">2 devices currently logged in</p>
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

      {/* Linked Accounts */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <GlassCard className="p-5">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-4">
            <Link className="w-4 h-4 text-sky-500" /> Linked Accounts
          </h3>
          <div className="space-y-3">
            {linkedAccounts.map((account, i) => (
              <motion.div
                key={account.provider}
                className="flex items-center justify-between py-2"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.05 }}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl ${account.color} flex items-center justify-center`}>
                    <account.icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{account.provider}</p>
                    <p className="text-xs text-muted-foreground">
                      {account.connected ? account.email : 'Not connected'}
                    </p>
                  </div>
                </div>
                <motion.button
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1 ${
                    connectingProvider === account.provider
                      ? 'bg-muted/30 text-muted-foreground'
                      : account.connected
                        ? 'bg-red-50 dark:bg-red-900/20 text-red-500'
                        : 'bg-sky-50 dark:bg-sky-900/20 text-sky-500'
                  }`}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleToggleLinkedAccount(account.provider)}
                  disabled={connectingProvider === account.provider}
                >
                  {connectingProvider === account.provider ? (
                    <motion.div className="w-3 h-3 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
                  ) : account.connected ? (
                    'Disconnect'
                  ) : (
                    <>
                      <Check className="w-3 h-3" /> Connect
                    </>
                  )}
                </motion.button>
              </motion.div>
            ))}
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
