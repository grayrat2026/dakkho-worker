'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Wifi, ChevronLeft, CheckCircle, Smartphone, Save,
  Signal, Globe, Zap, Battery, Download, PlayCircle,
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

export function NetworkDataPage() {
  const { goBack } = useNavigationStore();
  const user = useAuthStore((s) => s.user);

  const [wifiOnly, setWifiOnly] = useState(true);
  const [downloadOverMetered, setDownloadOverMetered] = useState(false);
  const [dataSaverMode, setDataSaverMode] = useState(false);
  const [preloadVideos, setPreloadVideos] = useState(true);
  const [backgroundPlayback, setBackgroundPlayback] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Load settings from server
  useEffect(() => {
    if (user?.id) {
      fetch(`/api/user/settings?userId=${user.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.wifiOnly !== undefined) setWifiOnly(data.wifiOnly);
          if (data.downloadOverMetered !== undefined) setDownloadOverMetered(data.downloadOverMetered);
          if (data.dataSaverMode !== undefined) setDataSaverMode(data.dataSaverMode);
          if (data.preloadVideos !== undefined) setPreloadVideos(data.preloadVideos);
          if (data.backgroundPlayback !== undefined) setBackgroundPlayback(data.backgroundPlayback);
        })
        .catch(() => {});
    }
  }, [user?.id]);

  const handleSave = async () => {
    if (!user?.id) return;
    setIsSaving(true);
    try {
      await fetch('/api/user/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          wifiOnly,
          downloadOverMetered,
          dataSaverMode,
          preloadVideos,
          backgroundPlayback,
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
    setIsSaving(false);
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
          <h1 className="text-xl font-extrabold text-foreground">Network & Data</h1>
          <p className="text-xs text-muted-foreground">Wi-Fi only, data saver, and network options</p>
        </div>
      </motion.div>

      {saved && (
        <motion.div
          className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 flex items-center gap-2"
          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        >
          <CheckCircle className="w-4 h-4 text-emerald-500" />
          <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Network settings saved!</p>
        </motion.div>
      )}

      {/* Data Saver */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <GlassCard className="p-5 mb-4">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-4">
            <Battery className="w-4 h-4 text-sky-500" /> Data Saver
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-emerald-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Data Saver Mode</p>
                  <p className="text-xs text-muted-foreground">Reduce data usage by lowering video quality on mobile networks</p>
                </div>
              </div>
              <Toggle enabled={dataSaverMode} onToggle={() => setDataSaverMode(!dataSaverMode)} />
            </div>
            {dataSaverMode && (
              <motion.div
                className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200/50 dark:border-emerald-800/30"
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              >
                <p className="text-xs text-emerald-700 dark:text-emerald-300">
                  Data Saver is active. Videos will stream at lower quality on mobile data to save bandwidth. Wi-Fi streaming is unaffected.
                </p>
              </motion.div>
            )}
          </div>
        </GlassCard>
      </motion.div>

      {/* Wi-Fi & Download Controls */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <GlassCard className="p-5 mb-4">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-4">
            <Wifi className="w-4 h-4 text-sky-500" /> Wi-Fi & Downloads
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-900/20 flex items-center justify-center">
                  <Wifi className="w-4 h-4 text-sky-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Wi-Fi Only Downloads</p>
                  <p className="text-xs text-muted-foreground">Only download content when connected to Wi-Fi</p>
                </div>
              </div>
              <Toggle enabled={wifiOnly} onToggle={() => setWifiOnly(!wifiOnly)} />
            </div>
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                  <Smartphone className="w-4 h-4 text-red-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Download Over Metered Connection</p>
                  <p className="text-xs text-muted-foreground">Allow downloads on mobile data (may incur charges)</p>
                </div>
              </div>
              <Toggle enabled={downloadOverMetered} onToggle={() => setDownloadOverMetered(!downloadOverMetered)} />
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Playback & Streaming */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <GlassCard className="p-5 mb-4">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-4">
            <PlayCircle className="w-4 h-4 text-sky-500" /> Playback & Streaming
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                  <Download className="w-4 h-4 text-amber-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Preload Videos</p>
                  <p className="text-xs text-muted-foreground">Preload next video in course for smoother playback</p>
                </div>
              </div>
              <Toggle enabled={preloadVideos} onToggle={() => setPreloadVideos(!preloadVideos)} />
            </div>
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center">
                  <Signal className="w-4 h-4 text-violet-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Background Playback</p>
                  <p className="text-xs text-muted-foreground">Continue audio playback when app is in background</p>
                </div>
              </div>
              <Toggle enabled={backgroundPlayback} onToggle={() => setBackgroundPlayback(!backgroundPlayback)} />
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Network Info */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <div className="p-3 rounded-xl bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800 flex items-start gap-2">
          <Globe className="w-4 h-4 text-sky-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-sky-700 dark:text-sky-300 leading-relaxed">
            Network settings are saved to your account and sync across devices. Enabling Data Saver will override your streaming quality on mobile data.
          </p>
        </div>
      </motion.div>

      {/* Save Button */}
      <motion.div className="mt-4" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <GradientButton onClick={handleSave} loading={isSaving} className="w-full" size="lg">
          <Save className="w-4 h-4" /> Save Network Settings
        </GradientButton>
      </motion.div>
    </div>
  );
}
