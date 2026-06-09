'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Eye, EyeOff, Lock, Globe, Shield, BarChart3, ChevronLeft,
  Search, UserCheck, Database, Cookie, CheckCircle, Users,
  Fingerprint, Settings, AlertTriangle,
} from 'lucide-react';
import { useNavigationStore, useAuthStore } from '@/lib/store';
import { GlassCard } from '../shared/GlassCard';
import { GradientButton } from '../shared/GradientButton';

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

function Selector({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-1 bg-muted/30 rounded-lg p-0.5">
      {options.map((opt) => (
        <motion.button
          key={opt}
          className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
            value === opt ? 'bg-white dark:bg-slate-700 shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => onChange(opt)}
          whileTap={{ scale: 0.95 }}
        >
          {opt}
        </motion.button>
      ))}
    </div>
  );
}

export function PrivacySettingsPage() {
  const { goBack, navigate } = useNavigationStore();
  const user = useAuthStore((s) => s.user);

  const [profileVisibility, setProfileVisibility] = useState('Friends');
  const [searchVisible, setSearchVisible] = useState(true);
  const [showEmail, setShowEmail] = useState(false);
  const [showPhone, setShowPhone] = useState(false);
  const [showProgress, setShowProgress] = useState(true);
  const [dataSharing, setDataSharing] = useState(false);
  const [analyticsOptOut, setAnalyticsOptOut] = useState(false);
  const [personalizedAds, setPersonalizedAds] = useState(true);
  const [cookieConsent, setCookieConsent] = useState('essential');
  const [activityStatus, setActivityStatus] = useState(true);
  const [readReceipts, setReadReceipts] = useState(true);
  const [saved, setSaved] = useState(false);

  // Load privacy settings from D1 on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { userPreferencesApi } = await import('@/lib/api-client');
        const result = await userPreferencesApi.get();
        const prefs = result.preferences as Record<string, unknown>;
        if (cancelled || !prefs) return;
        if (prefs.profileVisibility) setProfileVisibility(prefs.profileVisibility as string);
        if (prefs.searchVisible !== undefined) setSearchVisible(!!prefs.searchVisible);
        if (prefs.showEmail !== undefined) setShowEmail(!!prefs.showEmail);
        if (prefs.showPhone !== undefined) setShowPhone(!!prefs.showPhone);
        if (prefs.showProgress !== undefined) setShowProgress(!!prefs.showProgress);
        if (prefs.activityStatus !== undefined) setActivityStatus(!!prefs.activityStatus);
        if (prefs.readReceipts !== undefined) setReadReceipts(!!prefs.readReceipts);
        if (prefs.dataSharing !== undefined) setDataSharing(!!prefs.dataSharing);
        if (prefs.analyticsOptOut !== undefined) setAnalyticsOptOut(!!prefs.analyticsOptOut);
        if (prefs.personalizedRecommendations !== undefined) setPersonalizedAds(!!prefs.personalizedRecommendations);
        if (prefs.cookieConsent) setCookieConsent(prefs.cookieConsent as string);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  const handleSave = async () => {
    try {
      const { userPreferencesApi } = await import('@/lib/api-client');
      await userPreferencesApi.update({
        profileVisibility,
        searchVisible,
        showEmail,
        showPhone,
        showProgress,
        activityStatus,
        readReceipts,
        dataSharing,
        analyticsOptOut,
        personalizedRecommendations: personalizedAds,
        cookieConsent,
      });
    } catch {}
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="pb-20 lg:pb-0">
      {/* Header */}
      <motion.div className="flex items-center gap-3 mb-6" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <motion.button className="w-9 h-9 rounded-xl bg-muted/30 flex items-center justify-center text-foreground" onClick={goBack} whileTap={{ scale: 0.9 }}>
          <ChevronLeft className="w-5 h-5" />
        </motion.button>
        <div>
          <h1 className="text-xl font-extrabold text-foreground">Privacy Settings</h1>
          <p className="text-xs text-muted-foreground">Control who sees your information</p>
        </div>
      </motion.div>

      {saved && (
        <motion.div
          className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 flex items-center gap-2"
          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        >
          <CheckCircle className="w-4 h-4 text-emerald-500" />
          <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Privacy settings updated!</p>
        </motion.div>
      )}

      {/* Profile Visibility */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <GlassCard className="p-5 mb-4">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-4">
            <Eye className="w-4 h-4 text-sky-500" /> Profile Visibility
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-semibold text-foreground">Who can see your profile</p>
                <p className="text-xs text-muted-foreground">Control your profile visibility</p>
              </div>
              <Selector options={['Everyone', 'Friends', 'Private']} value={profileVisibility} onChange={setProfileVisibility} />
            </div>
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-900/20 flex items-center justify-center">
                  <Search className="w-4 h-4 text-sky-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Search Visibility</p>
                  <p className="text-xs text-muted-foreground">Allow others to find you by name/email</p>
                </div>
              </div>
              <Toggle enabled={searchVisible} onToggle={() => setSearchVisible(!searchVisible)} />
            </div>
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                  <Globe className="w-4 h-4 text-amber-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Show Email Address</p>
                  <p className="text-xs text-muted-foreground">Display email on your public profile</p>
                </div>
              </div>
              <Toggle enabled={showEmail} onToggle={() => setShowEmail(!showEmail)} />
            </div>
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                  <UserCheck className="w-4 h-4 text-emerald-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Show Learning Progress</p>
                  <p className="text-xs text-muted-foreground">Display course progress and achievements</p>
                </div>
              </div>
              <Toggle enabled={showProgress} onToggle={() => setShowProgress(!showProgress)} />
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Activity & Communication */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <GlassCard className="p-5 mb-4">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-sky-500" /> Activity & Communication
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-900/20 flex items-center justify-center">
                  <Fingerprint className="w-4 h-4 text-sky-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Online Activity Status</p>
                  <p className="text-xs text-muted-foreground">Show when you are online</p>
                </div>
              </div>
              <Toggle enabled={activityStatus} onToggle={() => setActivityStatus(!activityStatus)} />
            </div>
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                  <Eye className="w-4 h-4 text-emerald-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Read Receipts</p>
                  <p className="text-xs text-muted-foreground">Let others know you read their messages</p>
                </div>
              </div>
              <Toggle enabled={readReceipts} onToggle={() => setReadReceipts(!readReceipts)} />
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Data & Analytics */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <GlassCard className="p-5 mb-4">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-4">
            <Database className="w-4 h-4 text-sky-500" /> Data & Analytics
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-amber-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Usage Analytics</p>
                  <p className="text-xs text-muted-foreground">Help improve DAKKHO with anonymous data</p>
                </div>
              </div>
              <Toggle enabled={!analyticsOptOut} onToggle={() => setAnalyticsOptOut(!analyticsOptOut)} />
            </div>
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-900/20 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-sky-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Data Sharing</p>
                  <p className="text-xs text-muted-foreground">Share anonymized data with partners</p>
                </div>
              </div>
              <Toggle enabled={dataSharing} onToggle={() => setDataSharing(!dataSharing)} />
            </div>
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                  <Cookie className="w-4 h-4 text-emerald-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Cookie Preferences</p>
                  <p className="text-xs text-muted-foreground">Current: {cookieConsent === 'all' ? 'All cookies' : cookieConsent === 'essential' ? 'Essential only' : 'Analytics cookies'}</p>
                </div>
              </div>
              <Selector options={['essential', 'analytics', 'all']} value={cookieConsent} onChange={setCookieConsent} />
            </div>
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Personalized Recommendations</p>
                  <p className="text-xs text-muted-foreground">Use your activity for course suggestions</p>
                </div>
              </div>
              <Toggle enabled={personalizedAds} onToggle={() => setPersonalizedAds(!personalizedAds)} />
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Actions */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <GlassCard className="p-5">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-4">
            <Settings className="w-4 h-4 text-sky-500" /> Data Management
          </h3>
          <div className="space-y-3">
            <motion.button
              className="w-full text-left p-3 rounded-xl bg-muted/20 flex items-center gap-3 hover:bg-muted/30 transition-colors"
              whileTap={{ scale: 0.98 }}
              onClick={async () => {
                const data = JSON.stringify({ profile: user, exportDate: new Date().toISOString() }, null, 2);
                const blob = new Blob([data], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `dakkho-data-export-${new Date().toISOString().split('T')[0]}.json`;
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              <Database className="w-4 h-4 text-sky-500" />
              <div>
                <p className="text-sm font-semibold text-foreground">Download My Data</p>
                <p className="text-xs text-muted-foreground">Get a copy of all your data</p>
              </div>
            </motion.button>
            <motion.button
              className="w-full text-left p-3 rounded-xl bg-red-50 dark:bg-red-900/10 flex items-center gap-3 hover:bg-red-100/50 dark:hover:bg-red-900/20 transition-colors"
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('delete-account')}
            >
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <div>
                <p className="text-sm font-semibold text-red-600 dark:text-red-400">Delete My Data</p>
                <p className="text-xs text-muted-foreground">Permanently remove all your data</p>
              </div>
            </motion.button>
          </div>
          <div className="mt-4">
            <GradientButton onClick={handleSave} size="sm">
              <CheckCircle className="w-4 h-4" /> Save Privacy Settings
            </GradientButton>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
}
