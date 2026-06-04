'use client';

import { motion } from 'framer-motion';
import { Download, Trash2, HardDrive, CheckCircle, Loader2, Wifi } from 'lucide-react';
import { useState } from 'react';
import { GlassCard } from '../shared/GlassCard';
import { GradientButton } from '../shared/GradientButton';
import { ProgressBar } from '../shared/ProgressBar';
import { COURSES, formatDuration } from '@/lib/mock-data';

interface DownloadItem {
  id: string;
  courseId: string;
  title: string;
  size: string;
  totalSize: string;
  progress: number;
  status: 'downloading' | 'completed' | 'paused';
  videoCount: number;
}

const MOCK_DOWNLOADS: DownloadItem[] = [
  { id: 'd1', courseId: 'c1', title: 'Complete Web Development with HTML, CSS & JavaScript', size: '1.2 GB', totalSize: '2.4 GB', progress: 50, status: 'downloading', videoCount: 48 },
  { id: 'd2', courseId: 'c3', title: 'Digital Electronics Fundamentals', size: '890 MB', totalSize: '890 MB', progress: 100, status: 'completed', videoCount: 24 },
  { id: 'd3', courseId: 'c13', title: 'Python Programming for Beginners', size: '450 MB', totalSize: '1.1 GB', progress: 41, status: 'downloading', videoCount: 24 },
  { id: 'd4', courseId: 'c5', title: 'Electrical Circuit Analysis', size: '1.8 GB', totalSize: '1.8 GB', progress: 100, status: 'completed', videoCount: 40 },
  { id: 'd5', courseId: 'c2', title: 'React.js & Next.js - Modern Frontend Development', size: '0 MB', totalSize: '1.5 GB', progress: 0, status: 'paused', videoCount: 36 },
];

export function DownloadsPage() {
  const [downloads, setDownloads] = useState<DownloadItem[]>(MOCK_DOWNLOADS);

  const completedCount = downloads.filter((d) => d.status === 'completed').length;
  const downloadingCount = downloads.filter((d) => d.status === 'downloading').length;

  const handleClearCompleted = () => {
    setDownloads((prev) => prev.filter((d) => d.status !== 'completed'));
  };

  const handleDownloadAll = () => {
    setDownloads((prev) =>
      prev.map((d) => (d.status === 'paused' ? { ...d, status: 'downloading' as const } : d))
    );
  };

  const getStatusIcon = (status: DownloadItem['status']) => {
    switch (status) {
      case 'downloading':
        return <Loader2 className="w-4 h-4 text-sky-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case 'paused':
        return <Wifi className="w-4 h-4 text-amber-500" />;
    }
  };

  const getStatusLabel = (status: DownloadItem['status']) => {
    switch (status) {
      case 'downloading':
        return 'Downloading';
      case 'completed':
        return 'Completed';
      case 'paused':
        return 'Paused';
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between flex-wrap gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
            <Download className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold gradient-text">Downloads</h1>
            <p className="text-sm text-muted-foreground">{completedCount} completed, {downloadingCount} downloading</p>
          </div>
        </div>
        <div className="flex gap-2">
          <GradientButton size="sm" onClick={handleDownloadAll}>
            <Download className="w-4 h-4" />
            Download All
          </GradientButton>
          {completedCount > 0 && (
            <motion.button
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-red-500 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
              onClick={handleClearCompleted}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Trash2 className="w-4 h-4" />
              Clear
            </motion.button>
          )}
        </div>
      </motion.div>

      {/* Storage Info */}
      <GlassCard className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <HardDrive className="w-5 h-5 text-sky-500" />
          <span className="text-sm font-semibold">Storage Used</span>
          <span className="text-xs text-muted-foreground ml-auto">4.34 GB / 8 GB</span>
        </div>
        <ProgressBar value={54} size="md" color="bg-gradient-to-r from-sky-500 to-blue-600" />
      </GlassCard>

      {/* Downloads List */}
      <div className="space-y-3">
        {downloads.map((item, i) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <GlassCard hover className="p-4">
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  item.status === 'completed'
                    ? 'bg-emerald-500/10'
                    : item.status === 'downloading'
                    ? 'bg-sky-500/10'
                    : 'bg-amber-500/10'
                }`}>
                  {getStatusIcon(item.status)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm text-foreground truncate">{item.title}</h3>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span>{item.videoCount} videos</span>
                    <span>{item.size} / {item.totalSize}</span>
                    <span className="flex items-center gap-1">
                      {getStatusIcon(item.status)}
                      {getStatusLabel(item.status)}
                    </span>
                  </div>
                  <div className="mt-2">
                    <ProgressBar
                      value={item.progress}
                      size="sm"
                      showLabel
                      color={
                        item.status === 'completed'
                          ? 'bg-gradient-to-r from-emerald-500 to-emerald-600'
                          : undefined
                      }
                    />
                  </div>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
