'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Bell, Mail, MessageSquare, Smartphone, ChevronLeft, Volume2,
  VolumeX, BookOpen, CreditCard, Megaphone, Users, Award,
  Calendar, AlertTriangle, CheckCircle, Loader2, AlertCircle,
} from 'lucide-react';
import { useNavigationStore, useAuthStore } from '@/lib/store';
import { studentSettingsApi } from '@/lib/api-client';
import { GlassCard } from '../shared/GlassCard';
import { GradientButton } from '../shared/GradientButton';

function Toggle({ enabled, onToggle, color = 'sky' }: { enabled: boolean; onToggle: () => void; color?: string }) {
  const bgColor = color === 'emerald' ? 'bg-emerald-500' : 'bg-sky-500';
  return (
    <motion.button
      className={`w-11 h-6 rounded-full p-0.5 transition-colors ${enabled ? bgColor : 'bg-muted'}`}
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

interface NotifSetting {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  push: boolean;
  email: boolean;
  sms: boolean;
}

interface NotificationPreferences {
  pushEnabled: boolean;
  emailEnabled: boolean;
  smsEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  courseUpdates: { push: boolean; email: boolean };
  grades: { push: boolean; email: boolean };
  schedule: { push: boolean; email: boolean };
  payment: { push: boolean; email: boolean };
  promotions: { push: boolean; email: boolean };
  social: { push: boolean; email: boolean };
  system: { push: boolean; email: boolean };
}

const DEFAULT_SETTINGS: NotifSetting[] = [
  { id: 'course', label: 'Course Updates', description: 'New videos, assignments, and materials', icon: BookOpen, push: true, email: true, sms: false },
  { id: 'grades', label: 'Grades & Results', description: 'Exam results and grade postings', icon: Award, push: true, email: true, sms: true },
  { id: 'schedule', label: 'Schedule Changes', description: 'Class cancellations and room changes', icon: Calendar, push: true, email: false, sms: true },
  { id: 'payment', label: 'Payment & Billing', description: 'Subscription and payment receipts', icon: CreditCard, push: true, email: true, sms: false },
  { id: 'promo', label: 'Promotions & Offers', description: 'Special discounts and seasonal offers', icon: Megaphone, push: false, email: true, sms: false },
  { id: 'social', label: 'Social & Community', description: 'Comments, replies, and mentions', icon: Users, push: true, email: false, sms: false },
  { id: 'alerts', label: 'System Alerts', description: 'Maintenance and security notifications', icon: AlertTriangle, push: true, email: true, sms: true },
];

function mapPrefsToSettings(prefs: NotificationPreferences): NotifSetting[] {
  return [
    { ...DEFAULT_SETTINGS[0], push: prefs.courseUpdates?.push ?? DEFAULT_SETTINGS[0].push, email: prefs.courseUpdates?.email ?? DEFAULT_SETTINGS[0].email },
    { ...DEFAULT_SETTINGS[1], push: prefs.grades?.push ?? DEFAULT_SETTINGS[1].push, email: prefs.grades?.email ?? DEFAULT_SETTINGS[1].email },
    { ...DEFAULT_SETTINGS[2], push: prefs.schedule?.push ?? DEFAULT_SETTINGS[2].push, email: prefs.schedule?.email ?? DEFAULT_SETTINGS[2].email },
    { ...DEFAULT_SETTINGS[3], push: prefs.payment?.push ?? DEFAULT_SETTINGS[3].push, email: prefs.payment?.email ?? DEFAULT_SETTINGS[3].email },
    { ...DEFAULT_SETTINGS[4], push: prefs.promotions?.push ?? DEFAULT_SETTINGS[4].push, email: prefs.promotions?.email ?? DEFAULT_SETTINGS[4].email },
    { ...DEFAULT_SETTINGS[5], push: prefs.social?.push ?? DEFAULT_SETTINGS[5].push, email: prefs.social?.email ?? DEFAULT_SETTINGS[5].email },
    { ...DEFAULT_SETTINGS[6], push: prefs.system?.push ?? DEFAULT_SETTINGS[6].push, email: prefs.system?.email ?? DEFAULT_SETTINGS[6].email },
  ];
}

function mapSettingsToPrefs(
  settings: NotifSetting[],
  masterPush: boolean,
  masterEmail: boolean,
  masterSMS: boolean,
  quietStart: string,
  quietEnd: string,
): NotificationPreferences {
  return {
    pushEnabled: masterPush,
    emailEnabled: masterEmail,
    smsEnabled: masterSMS,
    quietHoursStart: quietStart,
    quietHoursEnd: quietEnd,
    courseUpdates: { push: settings[0].push, email: settings[0].email },
    grades: { push: settings[1].push, email: settings[1].email },
    schedule: { push: settings[2].push, email: settings[2].email },
    payment: { push: settings[3].push, email: settings[3].email },
    promotions: { push: settings[4].push, email: settings[4].email },
    social: { push: settings[5].push, email: settings[5].email },
    system: { push: settings[6].push, email: settings[6].email },
  };
}

export function NotificationSettingsPage() {
  const { goBack } = useNavigationStore();
  const user = useAuthStore((s) => s.user);

  const [masterPush, setMasterPush] = useState(true);
  const [masterEmail, setMasterEmail] = useState(true);
  const [masterSMS, setMasterSMS] = useState(false);
  const [quietHours, setQuietHours] = useState(false);
  const [quietStart, setQuietStart] = useState('22:00');
  const [quietEnd, setQuietEnd] = useState('08:00');
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [settings, setSettings] = useState<NotifSetting[]>(DEFAULT_SETTINGS);

  // Load settings from API on mount
  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const result = await studentSettingsApi.get();
      const prefs = result.preferences as unknown as NotificationPreferences;
      if (prefs) {
        setMasterPush(prefs.pushEnabled ?? true);
        setMasterEmail(prefs.emailEnabled ?? true);
        setMasterSMS(prefs.smsEnabled ?? false);
        if (prefs.quietHoursStart && prefs.quietHoursEnd) {
          setQuietStart(prefs.quietHoursStart);
          setQuietEnd(prefs.quietHoursEnd);
          setQuietHours(true);
        }
        setSettings(mapPrefsToSettings(prefs));
      }
    } catch {
      // Use defaults if API fails
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const toggleChannel = (id: string, channel: 'push' | 'email' | 'sms') => {
    setSettings((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [channel]: !s[channel] } : s))
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      const preferences = mapSettingsToPrefs(settings, masterPush, masterEmail, masterSMS, quietStart, quietEnd);
      await studentSettingsApi.update({ preferences });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setSaveError(err?.message || 'Failed to save preferences');
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
          <h1 className="text-xl font-extrabold text-foreground">Notification Preferences</h1>
          <p className="text-xs text-muted-foreground">Choose how and when you get notified</p>
        </div>
      </motion.div>

      {saved && (
        <motion.div
          className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 flex items-center gap-2"
          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        >
          <CheckCircle className="w-4 h-4 text-emerald-500" />
          <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Preferences saved!</p>
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

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-sky-500 animate-spin mb-3" />
          <p className="text-sm text-muted-foreground">Loading notification settings…</p>
        </div>
      ) : (
        <>
          {/* Master Toggles */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <GlassCard className="p-5 mb-4">
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-4">
                <Bell className="w-4 h-4 text-sky-500" /> Notification Channels
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-900/20 flex items-center justify-center">
                      <Smartphone className="w-4 h-4 text-sky-500" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Push Notifications</p>
                      <p className="text-xs text-muted-foreground">Real-time alerts on your device</p>
                    </div>
                  </div>
                  <Toggle enabled={masterPush} onToggle={() => setMasterPush(!masterPush)} />
                </div>
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                      <Mail className="w-4 h-4 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">Email Notifications</p>
                      <p className="text-xs text-muted-foreground">Receive updates via email</p>
                    </div>
                  </div>
                  <Toggle enabled={masterEmail} onToggle={() => setMasterEmail(!masterEmail)} color="emerald" />
                </div>
                <div className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                      <MessageSquare className="w-4 h-4 text-amber-500" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">SMS Notifications</p>
                      <p className="text-xs text-muted-foreground">Text message alerts for critical updates</p>
                    </div>
                  </div>
                  <Toggle enabled={masterSMS} onToggle={() => setMasterSMS(!masterSMS)} />
                </div>
              </div>
            </GlassCard>
          </motion.div>

          {/* Quiet Hours */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <GlassCard className="p-5 mb-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  {quietHours ? <VolumeX className="w-4 h-4 text-sky-500" /> : <Volume2 className="w-4 h-4 text-sky-500" />}
                  Quiet Hours
                </h3>
                <Toggle enabled={quietHours} onToggle={() => setQuietHours(!quietHours)} />
              </div>
              {quietHours && (
                <motion.div className="flex items-center gap-3 p-3 rounded-xl bg-muted/20" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                  <div className="flex-1">
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">From</label>
                    <input
                      type="time"
                      value={quietStart}
                      onChange={(e) => setQuietStart(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-muted/30 border border-white/30 dark:border-white/10 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                    />
                  </div>
                  <span className="text-muted-foreground mt-5">—</span>
                  <div className="flex-1">
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">To</label>
                    <input
                      type="time"
                      value={quietEnd}
                      onChange={(e) => setQuietEnd(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-muted/30 border border-white/30 dark:border-white/10 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                    />
                  </div>
                </motion.div>
              )}
            </GlassCard>
          </motion.div>

          {/* Per-Category Settings */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <GlassCard className="p-5">
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-4">
                <Bell className="w-4 h-4 text-sky-500" /> Notification Types
              </h3>
              <div className="space-y-1">
                {/* Column headers */}
                <div className="grid grid-cols-[1fr_50px_50px_50px] gap-2 items-center pb-2 border-b border-white/20 dark:border-white/5">
                  <span className="text-xs font-bold text-muted-foreground">Type</span>
                  <span className="text-xs font-bold text-muted-foreground text-center">Push</span>
                  <span className="text-xs font-bold text-muted-foreground text-center">Email</span>
                  <span className="text-xs font-bold text-muted-foreground text-center">SMS</span>
                </div>
                {settings.map((s, i) => (
                  <motion.div
                    key={s.id}
                    className="grid grid-cols-[1fr_50px_50px_50px] gap-2 items-center py-3 border-b border-white/10 dark:border-white/5 last:border-0"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + i * 0.03 }}
                  >
                    <div className="flex items-center gap-2">
                      <s.icon className="w-4 h-4 text-sky-500 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-foreground">{s.label}</p>
                        <p className="text-xs text-muted-foreground hidden sm:block">{s.description}</p>
                      </div>
                    </div>
                    <div className="flex justify-center">
                      <input
                        type="checkbox"
                        checked={s.push && masterPush}
                        onChange={() => toggleChannel(s.id, 'push')}
                        disabled={!masterPush}
                        className="w-4 h-4 rounded accent-sky-500"
                      />
                    </div>
                    <div className="flex justify-center">
                      <input
                        type="checkbox"
                        checked={s.email && masterEmail}
                        onChange={() => toggleChannel(s.id, 'email')}
                        disabled={!masterEmail}
                        className="w-4 h-4 rounded accent-emerald-500"
                      />
                    </div>
                    <div className="flex justify-center">
                      <input
                        type="checkbox"
                        checked={s.sms && masterSMS}
                        onChange={() => toggleChannel(s.id, 'sms')}
                        disabled={!masterSMS}
                        className="w-4 h-4 rounded accent-amber-500"
                      />
                    </div>
                  </motion.div>
                ))}
              </div>
              <div className="mt-4 pt-3 border-t border-white/20 dark:border-white/5">
                <GradientButton onClick={handleSave} loading={isSaving} size="sm">
                  <CheckCircle className="w-4 h-4" /> Save Preferences
                </GradientButton>
              </div>
            </GlassCard>
          </motion.div>
        </>
      )}
    </div>
  );
}
