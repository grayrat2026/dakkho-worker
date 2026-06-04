'use client';

import { useRef } from 'react';
import { motion } from 'framer-motion';
import { Play, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { useNavigationStore, useWatchProgressStore } from '@/lib/store';
import { COURSES, VIDEOS, getInstructor, formatDuration } from '@/lib/mock-data';
import { ProgressBar } from '../shared/ProgressBar';
import { GlassCard } from '../shared/GlassCard';

export function ContinueWatching() {
  const navigate = useNavigationStore((s) => s.navigate);
  const progressStore = useWatchProgressStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Get videos with watch progress
  const continueWatching = Object.values(progressStore.progress)
    .filter((p) => p.progress > 0 && !p.completed)
    .sort((a, b) => b.lastWatched - a.lastWatched)
    .slice(0, 10)
    .map((p) => {
      const video = VIDEOS.find((v) => v.id === p.videoId);
      const course = video ? COURSES.find((c) => c.id === video.courseId) : undefined;
      const instructor = course ? getInstructor(course.instructorId) : undefined;
      return { ...p, video, course, instructor };
    })
    .filter((item) => item.video && item.course);

  if (continueWatching.length === 0) return null;

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const amount = dir === 'left' ? -300 : 300;
    scrollRef.current.scrollBy({ left: amount, behavior: 'smooth' });
  };

  const thumbnailColors = [
    'from-sky-400 to-blue-600',
    'from-emerald-400 to-teal-600',
    'from-purple-400 to-indigo-600',
    'from-amber-400 to-orange-600',
    'from-rose-400 to-pink-600',
  ];

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-extrabold text-foreground">Continue Watching</h2>
        <div className="flex gap-2">
          <motion.button
            className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center"
            onClick={() => scroll('left')}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <ChevronLeft className="w-4 h-4" />
          </motion.button>
          <motion.button
            className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center"
            onClick={() => scroll('right')}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <ChevronRight className="w-4 h-4" />
          </motion.button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {continueWatching.map((item, i) => {
          const colorClass = thumbnailColors[i % thumbnailColors.length];
          return (
            <motion.div
              key={item.videoId}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex-shrink-0 w-64"
            >
              <GlassCard
                hover
                className="overflow-hidden cursor-pointer group"
                onClick={() => navigate('video-player', { videoId: item.videoId, courseId: item.video!.courseId })}
              >
                <div className={`relative aspect-video bg-gradient-to-br ${colorClass}`}>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Play className="w-10 h-10 text-white/30" />
                  </div>
                  <motion.div
                    className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                      <Play className="w-5 h-5 text-sky-600 ml-0.5" fill="currentColor" />
                    </div>
                  </motion.div>
                  <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded-md bg-black/50 text-white text-[10px] font-bold flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDuration(Math.max(0, item.video!.duration - item.lastPosition))} left
                  </span>
                </div>
                <div className="p-3 space-y-1.5">
                  <h3 className="text-sm font-bold text-foreground line-clamp-1">{item.video!.title}</h3>
                  <p className="text-xs text-muted-foreground">{item.instructor?.name}</p>
                  <ProgressBar value={item.progress} size="sm" />
                </div>
              </GlassCard>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
