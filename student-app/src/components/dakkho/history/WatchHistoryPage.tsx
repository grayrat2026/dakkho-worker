'use client';

import { motion } from 'framer-motion';
import { Clock, Trash2, Play, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { GlassCard } from '../shared/GlassCard';
import { GradientButton } from '../shared/GradientButton';
import { ProgressBar } from '../shared/ProgressBar';
import { COURSES, VIDEOS, formatDuration, formatTimeAgo } from '@/lib/mock-data';
import { useNavigationStore } from '@/lib/store';

interface HistoryItem {
  id: string;
  videoId: string;
  videoTitle: string;
  courseId: string;
  courseName: string;
  watchedAt: string;
  progress: number;
  duration: number;
}

const MOCK_HISTORY: HistoryItem[] = [
  { id: 'h1', videoId: 'v-c1-1', videoTitle: 'Introduction & Overview — Complete Web Development', courseId: 'c1', courseName: 'Complete Web Development with HTML, CSS & JavaScript', watchedAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(), progress: 85, duration: 1200 },
  { id: 'h2', videoId: 'v-c2-3', videoTitle: 'Basic Concepts — React.js & Next.js', courseId: 'c2', courseName: 'React.js & Next.js - Modern Frontend Development', watchedAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(), progress: 45, duration: 900 },
  { id: 'h3', videoId: 'v-c3-5', videoTitle: 'Core Principles — Digital Electronics', courseId: 'c3', courseName: 'Digital Electronics Fundamentals', watchedAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), progress: 100, duration: 1500 },
  { id: 'h4', videoId: 'v-c13-2', videoTitle: 'Getting Started — Python Programming', courseId: 'c13', courseName: 'Python Programming for Beginners', watchedAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), progress: 30, duration: 800 },
  { id: 'h5', videoId: 'v-c5-8', videoTitle: 'Hands-on Practice — Electrical Circuit', courseId: 'c5', courseName: 'Electrical Circuit Analysis', watchedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), progress: 60, duration: 1100 },
  { id: 'h6', videoId: 'v-c19-4', videoTitle: 'Understanding the Fundamentals — Flutter Mobile', courseId: 'c19', courseName: 'Flutter Mobile App Development', watchedAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), progress: 15, duration: 1400 },
  { id: 'h7', videoId: 'v-c15-10', videoTitle: 'Real-world Applications — Machine Learning', courseId: 'c15', courseName: 'Machine Learning with Python', watchedAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(), progress: 70, duration: 1000 },
  { id: 'h8', videoId: 'v-c4-6', videoTitle: 'Deep Dive into Theory — Arduino Programming', courseId: 'c4', courseName: 'Microcontroller Programming with Arduino', watchedAt: new Date(Date.now() - 1000 * 60 * 60 * 96).toISOString(), progress: 50, duration: 950 },
];

export function WatchHistoryPage() {
  const [history, setHistory] = useState<HistoryItem[]>(MOCK_HISTORY);
  const [showConfirm, setShowConfirm] = useState(false);
  const navigate = useNavigationStore((s) => s.navigate);

  const handleClearHistory = () => {
    setHistory([]);
    setShowConfirm(false);
  };

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
            <Clock className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold gradient-text">Watch History</h1>
            <p className="text-sm text-muted-foreground">{history.length} videos watched</p>
          </div>
        </div>
        {history.length > 0 && (
          <motion.button
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-red-500 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
            onClick={() => setShowConfirm(true)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Trash2 className="w-4 h-4" />
            Clear History
          </motion.button>
        )}
      </motion.div>

      {/* Clear confirmation */}
      {showConfirm && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={() => setShowConfirm(false)}
        >
          <GlassCard className="p-6 max-w-sm w-full" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-2">Clear Watch History?</h3>
            <p className="text-sm text-muted-foreground mb-4">This action cannot be undone. All your watch history will be permanently deleted.</p>
            <div className="flex gap-3">
              <GradientButton variant="danger" size="sm" onClick={handleClearHistory}>Clear All</GradientButton>
              <GradientButton variant="primary" size="sm" onClick={() => setShowConfirm(false)}>Cancel</GradientButton>
            </div>
          </GlassCard>
        </motion.div>
      )}

      {/* History List */}
      {history.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-16"
        >
          <Clock className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-semibold text-muted-foreground">No Watch History</h3>
          <p className="text-sm text-muted-foreground/60 mt-1">Start watching videos to see your history here.</p>
        </motion.div>
      ) : (
        <div className="space-y-3">
          {history.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <GlassCard hover className="p-4">
                <div className="flex items-start gap-4">
                  {/* Play icon */}
                  <motion.div
                    className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500/10 to-blue-600/10 flex items-center justify-center flex-shrink-0"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => navigate('video-player', { videoId: item.videoId, courseId: item.courseId })}
                  >
                    <Play className="w-5 h-5 text-sky-500" />
                  </motion.div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm text-foreground truncate">{item.videoTitle}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.courseName}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
                    </div>

                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDuration(item.duration)}
                      </span>
                      <span>{formatTimeAgo(item.watchedAt)}</span>
                      {item.progress === 100 && (
                        <span className="text-emerald-500 font-semibold">Completed</span>
                      )}
                    </div>

                    <div className="mt-2">
                      <ProgressBar value={item.progress} size="sm" showLabel />
                    </div>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
