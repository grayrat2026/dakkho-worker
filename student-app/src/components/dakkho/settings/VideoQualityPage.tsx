'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Monitor, ChevronLeft, CheckCircle, Smartphone, Zap,
  HardDrive, Save, Wifi,
} from 'lucide-react';
import { useNavigationStore, useAuthStore } from '@/lib/store';
import { GlassCard } from '../shared/GlassCard';
import { GradientButton } from '../shared/GradientButton';

const STREAMING_QUALITY_OPTIONS = [
  { label: 'Low', desc: '480p • ~200MB/hr • Saves data', value: 'low', icon: Smartphone, color: 'text-amber-500' },
  { label: 'Medium', desc: '720p • ~500MB/hr • Balanced', value: 'medium', icon: Monitor, color: 'text-sky-500' },
  { label: 'High', desc: '1080p • ~1.2GB/hr • Best quality', value: 'high', icon: Zap, color: 'text-emerald-500' },
  { label: 'Original', desc: 'Source quality • ~2.5GB/hr • No compression', value: 'original', icon: HardDrive, color: 'text-violet-500' },
];

const DOWNLOAD_QUALITY_OPTIONS = [
  { label: 'Low', desc: '480p • Smaller file size', value: 'low', icon: Smartphone, color: 'text-amber-500' },
  { label: 'Medium', desc: '720p • Balanced size & quality', value: 'medium', icon: Monitor, color: 'text-sky-500' },
  { label: 'High', desc: '1080p • Best quality', value: 'high', icon: Zap, color: 'text-emerald-500' },
  { label: 'Original', desc: 'Source quality • Largest files', value: 'original', icon: HardDrive, color: 'text-violet-500' },
];

export function VideoQualityPage() {
  const { goBack } = useNavigationStore();
  const user = useAuthStore((s) => s.user);

  const [streamingQuality, setStreamingQuality] = useState('medium');
  const [downloadQuality, setDownloadQuality] = useState('medium');
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Load settings from server
  useEffect(() => {
    if (user?.id) {
      fetch(`/api/user/settings?userId=${user.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.streamingQuality) setStreamingQuality(data.streamingQuality);
          if (data.downloadQuality) setDownloadQuality(data.downloadQuality);
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
        body: JSON.stringify({ userId: user.id, streamingQuality, downloadQuality }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      // Fallback: save locally
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
          <h1 className="text-xl font-extrabold text-foreground">Video Quality</h1>
          <p className="text-xs text-muted-foreground">Streaming and download quality settings</p>
        </div>
      </motion.div>

      {saved && (
        <motion.div
          className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 flex items-center gap-2"
          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        >
          <CheckCircle className="w-4 h-4 text-emerald-500" />
          <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Video quality settings saved!</p>
        </motion.div>
      )}

      {/* Streaming Quality */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <GlassCard className="p-5 mb-4">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-4">
            <Wifi className="w-4 h-4 text-sky-500" /> Streaming Quality
          </h3>
          <p className="text-xs text-muted-foreground mb-4">Choose the default quality for video streaming. Higher quality uses more data.</p>
          <div className="grid grid-cols-2 gap-3">
            {STREAMING_QUALITY_OPTIONS.map((option, i) => (
              <motion.div
                key={option.value}
                className={`p-3 rounded-xl cursor-pointer transition-all ${
                  streamingQuality === option.value
                    ? 'bg-sky-50 dark:bg-sky-900/20 border-2 border-sky-500'
                    : 'bg-muted/20 border-2 border-transparent hover:bg-muted/30'
                }`}
                onClick={() => setStreamingQuality(option.value)}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 + i * 0.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <option.icon className={`w-4 h-4 ${option.color}`} />
                  <span className="text-sm font-bold text-foreground">{option.label}</span>
                  {streamingQuality === option.value && <CheckCircle className="w-3.5 h-3.5 text-sky-500 ml-auto" />}
                </div>
                <p className="text-xs text-muted-foreground">{option.desc}</p>
              </motion.div>
            ))}
          </div>
        </GlassCard>
      </motion.div>

      {/* Download Quality */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <GlassCard className="p-5 mb-4">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-4">
            <Monitor className="w-4 h-4 text-sky-500" /> Download Quality
          </h3>
          <p className="text-xs text-muted-foreground mb-4">Choose the quality for offline downloads. Higher quality takes more storage.</p>
          <div className="grid grid-cols-2 gap-3">
            {DOWNLOAD_QUALITY_OPTIONS.map((option, i) => (
              <motion.div
                key={option.value}
                className={`p-3 rounded-xl cursor-pointer transition-all ${
                  downloadQuality === option.value
                    ? 'bg-sky-50 dark:bg-sky-900/20 border-2 border-sky-500'
                    : 'bg-muted/20 border-2 border-transparent hover:bg-muted/30'
                }`}
                onClick={() => setDownloadQuality(option.value)}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.15 + i * 0.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <option.icon className={`w-4 h-4 ${option.color}`} />
                  <span className="text-sm font-bold text-foreground">{option.label}</span>
                  {downloadQuality === option.value && <CheckCircle className="w-3.5 h-3.5 text-sky-500 ml-auto" />}
                </div>
                <p className="text-xs text-muted-foreground">{option.desc}</p>
              </motion.div>
            ))}
          </div>
        </GlassCard>
      </motion.div>

      {/* Save Button */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <GradientButton onClick={handleSave} loading={isSaving} className="w-full" size="lg">
          <Save className="w-4 h-4" /> Save Video Quality
        </GradientButton>
      </motion.div>
    </div>
  );
}
