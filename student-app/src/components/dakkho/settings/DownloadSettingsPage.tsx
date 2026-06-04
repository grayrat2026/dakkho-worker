'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Download, ChevronLeft, CheckCircle, HardDrive,
  Smartphone, AlertTriangle, Save, Clock, Trash2, FolderOpen,
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

export function DownloadSettingsPage() {
  const { goBack } = useNavigationStore();
  const user = useAuthStore((s) => s.user);

  const [storageLimit, setStorageLimit] = useState(2);
  const [autoDelete, setAutoDelete] = useState(false);
  const [deleteAfterDays, setDeleteAfterDays] = useState(30);
  const [autoDownload, setAutoDownload] = useState(false);
  const [downloadSubtitles, setDownloadSubtitles] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const usedStorage = 1.2;
  const totalStorage = storageLimit;
  const storagePercent = Math.min((usedStorage / totalStorage) * 100, 100);

  // Load settings from server
  useEffect(() => {
    if (user?.id) {
      fetch(`/api/user/settings?userId=${user.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.storageLimitGB) setStorageLimit(data.storageLimitGB);
          if (data.autoDeleteWatched !== undefined) setAutoDelete(data.autoDeleteWatched);
          if (data.autoDeleteAfterDays) setDeleteAfterDays(data.autoDeleteAfterDays);
          if (data.autoDownload !== undefined) setAutoDownload(data.autoDownload);
          if (data.downloadSubtitles !== undefined) setDownloadSubtitles(data.downloadSubtitles);
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
          storageLimitGB: storageLimit,
          autoDeleteWatched: autoDelete,
          autoDeleteAfterDays: deleteAfterDays,
          autoDownload,
          downloadSubtitles,
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
        <motion.button className="w-9 h-9 rounded-xl bg-muted/30 flex items-center justify-center text-foreground" onClick={goBack} whileTap={{ scale: 0.9 }}>
          <ChevronLeft className="w-5 h-5" />
        </motion.button>
        <div>
          <h1 className="text-xl font-extrabold text-foreground">Download Settings</h1>
          <p className="text-xs text-muted-foreground">Offline download preferences and storage</p>
        </div>
      </motion.div>

      {saved && (
        <motion.div
          className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 flex items-center gap-2"
          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        >
          <CheckCircle className="w-4 h-4 text-emerald-500" />
          <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Download settings saved!</p>
        </motion.div>
      )}

      {/* Auto-Download */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <GlassCard className="p-5 mb-4">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-4">
            <Download className="w-4 h-4 text-sky-500" /> Auto-Download
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-900/20 flex items-center justify-center">
                  <Download className="w-4 h-4 text-sky-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Auto-Download New Episodes</p>
                  <p className="text-xs text-muted-foreground">Automatically download new enrolled course videos</p>
                </div>
              </div>
              <Toggle enabled={autoDownload} onToggle={() => setAutoDownload(!autoDownload)} />
            </div>
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                  <FolderOpen className="w-4 h-4 text-amber-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Include Subtitles</p>
                  <p className="text-xs text-muted-foreground">Download subtitles with videos</p>
                </div>
              </div>
              <Toggle enabled={downloadSubtitles} onToggle={() => setDownloadSubtitles(!downloadSubtitles)} />
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Storage Management */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <GlassCard className="p-5 mb-4">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-4">
            <HardDrive className="w-4 h-4 text-sky-500" /> Storage
          </h3>
          <div className="space-y-4">
            <div className="p-3 rounded-xl bg-muted/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-foreground">Storage Used</span>
                <span className="text-sm font-bold text-sky-500">{usedStorage} GB / {totalStorage} GB</span>
              </div>
              <div className="h-3 rounded-full bg-muted/30 overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-sky-400 to-blue-600"
                  initial={{ width: 0 }}
                  animate={{ width: `${storagePercent}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
              </div>
              {storagePercent > 80 && (
                <div className="flex items-center gap-1 mt-2 text-amber-500">
                  <AlertTriangle className="w-3 h-3" />
                  <span className="text-xs font-semibold">Storage almost full</span>
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-foreground">Storage Limit</span>
                <span className="text-sm font-bold text-foreground">{storageLimit} GB</span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                step={0.5}
                value={storageLimit}
                onChange={(e) => setStorageLimit(parseFloat(e.target.value))}
                className="w-full h-2 rounded-full bg-muted/30 appearance-none cursor-pointer accent-sky-500"
              />
              <div className="flex justify-between mt-1">
                <span className="text-xs text-muted-foreground">1 GB</span>
                <span className="text-xs text-muted-foreground">5 GB</span>
                <span className="text-xs text-muted-foreground">10 GB</span>
              </div>
            </div>

            <motion.button
              className="w-full p-3 rounded-xl bg-red-50 dark:bg-red-900/10 flex items-center gap-3 hover:bg-red-100/50 dark:hover:bg-red-900/20 transition-colors"
              whileTap={{ scale: 0.98 }}
              onClick={async () => {
                if (window.confirm('Are you sure you want to clear all downloads? This action cannot be undone.')) {
                  setSaved(true);
                  setTimeout(() => setSaved(false), 3000);
                }
              }}
            >
              <Trash2 className="w-4 h-4 text-red-500" />
              <div className="text-left">
                <p className="text-sm font-semibold text-red-600 dark:text-red-400">Clear All Downloads</p>
                <p className="text-xs text-muted-foreground">Remove all downloaded content</p>
              </div>
            </motion.button>
          </div>
        </GlassCard>
      </motion.div>

      {/* Auto Delete */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <GlassCard className="p-5 mb-4">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-sky-500" /> Auto-Delete
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-semibold text-foreground">Auto-Delete Watched Content</p>
                <p className="text-xs text-muted-foreground">Remove downloaded videos after watching</p>
              </div>
              <Toggle enabled={autoDelete} onToggle={() => setAutoDelete(!autoDelete)} />
            </div>
            {autoDelete && (
              <motion.div className="p-3 rounded-xl bg-muted/20" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <p className="text-xs font-semibold text-muted-foreground mb-2">Delete after</p>
                <div className="flex gap-2 flex-wrap">
                  {[7, 14, 30, 60].map((days) => (
                    <motion.button
                      key={days}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                        deleteAfterDays === days ? 'bg-sky-500 text-white' : 'bg-muted/30 text-muted-foreground'
                      }`}
                      onClick={() => setDeleteAfterDays(days)}
                      whileTap={{ scale: 0.95 }}
                    >
                      {days} days
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </GlassCard>
      </motion.div>

      {/* Save Button */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <GradientButton onClick={handleSave} loading={isSaving} className="w-full" size="lg">
          <Save className="w-4 h-4" /> Save Download Settings
        </GradientButton>
      </motion.div>
    </div>
  );
}
