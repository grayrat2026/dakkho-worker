'use client';

import { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Play, Radio, Trophy, Flame, Clock, Star, Users } from 'lucide-react';
import { HeroSection } from './HeroSection';
import { EnrolledHero } from './EnrolledHero';
import { ContinueWatching } from './ContinueWatching';
import { TrendingCourses } from './TrendingCourses';
import { CategoryPills } from './CategoryPills';
import { FeaturedInstructors } from './FeaturedInstructors';
import { useCourses, useInstructors, useLiveClasses } from '@/lib/data-hooks';
import { formatDuration } from '@/lib/mock-data';
import type { Course, Instructor } from '@/lib/mock-data';
import type { LiveSession } from '../shared/apiMappers';
import { CourseCardGrid } from '../shared/CourseCardGrid';
import { GlassCard } from '../shared/GlassCard';
import { AnimatedCounter } from '../shared/AnimatedCounter';
import { LoadingSkeleton } from '../shared/LoadingSkeleton';
import { useNavigationStore, useServerConfigStore, useAuthStore } from '@/lib/store';
import { leaderboardApi } from '@/lib/api-client';

// ============ NEW RELEASES ============

function NewReleases() {
  const navigate = useNavigationStore((s) => s.navigate);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { data: allCourses, loading: coursesLoading } = useCourses({ limit: 20 });
  const { data: instructors, loading: instructorsLoading } = useInstructors({ limit: 20 });

  const loading = coursesLoading || instructorsLoading;

  const newReleases = allCourses.filter((c) => c.isFeatured).slice(0, 8);

  const findInstructor = (id: string) => instructors.find((i) => i.id === id);

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir === 'left' ? -280 : 280, behavior: 'smooth' });
  };

  const thumbnailColors = [
    'from-sky-400 to-blue-600',
    'from-emerald-400 to-teal-600',
    'from-purple-400 to-indigo-600',
    'from-amber-400 to-orange-600',
    'from-rose-400 to-pink-600',
  ];

  if (loading) {
    return (
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-extrabold text-foreground">New Releases</h2>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
          <LoadingSkeleton type="card" count={4} className="w-64 flex-shrink-0" />
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-extrabold text-foreground">New Releases</h2>
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
        className="flex gap-4 overflow-x-auto pb-2"
        style={{ scrollbarWidth: 'none' }}
      >
        {newReleases.map((course, i) => {
          const instructor = findInstructor(course.instructorId);
          const colorClass = thumbnailColors[i % thumbnailColors.length];
          return (
            <motion.div
              key={course.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex-shrink-0 w-64"
            >
              <GlassCard
                hover
                className="overflow-hidden cursor-pointer group"
                onClick={() => navigate('course-detail', { courseId: course.id })}
              >
                <div className={`relative aspect-video bg-gradient-to-br ${colorClass}`}>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Play className="w-10 h-10 text-white/30" />
                  </div>
                  <motion.div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                      <Play className="w-5 h-5 text-sky-600 ml-0.5" fill="currentColor" />
                    </div>
                  </motion.div>
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold text-white bg-emerald-500/80 backdrop-blur-sm">
                    NEW
                  </span>
                  <span className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded-md bg-black/50 text-white text-[10px] font-bold flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDuration(course.duration)}
                  </span>
                </div>
                <div className="p-3 space-y-1.5">
                  <h3 className="text-sm font-bold text-foreground line-clamp-1">{course.title}</h3>
                  <p className="text-xs text-muted-foreground">{instructor?.name}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                      {course.rating}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {course.totalStudents}
                    </span>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ============ LIVE NOW ============

const LIVE_THUMBNAIL_COLORS = [
  'from-red-500 to-rose-600',
  'from-sky-500 to-blue-600',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-purple-500 to-indigo-600',
];

function LiveNow() {
  const navigate = useNavigationStore((s) => s.navigate);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { data: liveSessions, loading } = useLiveClasses();

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir === 'left' ? -200 : 200, behavior: 'smooth' });
  };

  if (loading || liveSessions.length === 0) return null;

  return (
    <div className="mb-8">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <motion.div
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <Radio className="w-5 h-5 text-red-500" />
          </motion.div>
          <h2 className="text-lg font-extrabold text-foreground">Live Now</h2>
          <span className="text-[10px] font-bold text-red-500 bg-red-500/10 px-2 py-0.5 rounded-full">
            {liveSessions.length} LIVE
          </span>
        </div>
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

      {/* Horizontal Scrollable Vertical Cards */}
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto pb-2"
        style={{ scrollbarWidth: 'none' }}
      >
        {liveSessions.map((session, i) => {
          const colorClass = LIVE_THUMBNAIL_COLORS[i % LIVE_THUMBNAIL_COLORS.length];
          return (
            <motion.div
              key={session.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              className="flex-shrink-0 w-[140px] sm:w-[150px]"
            >
              <motion.div
                className="relative rounded-2xl overflow-hidden cursor-pointer group"
                onClick={() => navigate('explore')}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                {/* Full-bleed Thumbnail with Gradient */}
                <div className={`relative aspect-[3/4] bg-gradient-to-br ${colorClass}`}>
                  {/* Decorative pattern overlay */}
                  <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-4 right-4 w-20 h-20 rounded-full border-2 border-white/30" />
                    <div className="absolute bottom-16 left-4 w-12 h-12 rounded-full border border-white/20" />
                  </div>

                  {/* Subject badge at top */}
                  <div className="absolute top-2.5 left-2.5">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold text-white bg-black/40 backdrop-blur-sm">
                      {session.subject}
                    </span>
                  </div>

                  {/* LIVE indicator at top-right */}
                  <div className="absolute top-2.5 right-2.5 flex items-center gap-1">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                    </span>
                    <span className="text-[9px] font-bold text-white uppercase tracking-wider">LIVE</span>
                  </div>

                  {/* Play button on hover */}
                  <motion.div
                    className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors"
                  >
                    <motion.div
                      className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                    >
                      <Play className="w-4 h-4 text-sky-600 ml-0.5" fill="currentColor" />
                    </motion.div>
                  </motion.div>

                  {/* Bottom gradient overlay for text readability */}
                  <div className="absolute bottom-0 left-0 right-0 h-[55%] bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

                  {/* Bottom content - title + info */}
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    {/* Sequential number */}
                    <span className="text-3xl font-black text-white/20 leading-none absolute top-[-4px] left-3">
                      {String(i + 1).padStart(2, '0')}
                    </span>

                    <p className="text-[13px] font-bold text-white leading-tight line-clamp-2 mb-1.5">
                      {session.title}
                    </p>

                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 text-[10px] text-white/70">
                        <Users className="w-2.5 h-2.5" />
                        {session.viewers}
                      </span>
                      <span className="flex items-center gap-1 text-[10px] text-white/70">
                        <Clock className="w-2.5 h-2.5" />
                        {session.startedAt}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Instructor name below card */}
                <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm px-3 py-2 rounded-b-2xl border-t border-white/20 dark:border-white/5">
                  <p className="text-[11px] font-semibold text-foreground truncate">{session.instructor}</p>
                </div>
              </motion.div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ============ WEEKLY LEADERBOARD ============

interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  technology: string;
  xp: number;
  breakdown: { video: number; quiz: number; assignment: number; streak: number };
  activeDays: number;
}

const RANK_STYLES: Record<number, { bg: string; icon: string; border: string }> = {
  1: { bg: 'from-amber-400 to-yellow-500', icon: 'text-amber-500', border: 'border-amber-400/50' },
  2: { bg: 'from-slate-300 to-slate-400', icon: 'text-slate-400', border: 'border-slate-300/50' },
  3: { bg: 'from-orange-400 to-amber-600', icon: 'text-orange-400', border: 'border-orange-400/50' },
};

function WeeklyLeaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    leaderboardApi.get({ limit: 5, period: 'week' })
      .then((res) => {
        if (!cancelled && res.entries) {
          setEntries(res.entries);
        }
      })
      .catch(() => {
        // Silently fail — leaderboard is non-critical
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  // Hide section entirely when there's no data and not loading
  if (!loading && entries.length === 0) return null;

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="w-5 h-5 text-amber-500" />
        <h2 className="text-lg font-extrabold text-foreground">Weekly Leaderboard</h2>
      </div>

      {loading ? (
        <GlassCard className="p-4 space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-3 rounded-xl">
              <div className="w-8 h-8 rounded-lg bg-muted/50 animate-pulse" />
              <div className="w-9 h-9 rounded-full bg-muted/50 animate-pulse" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-24 rounded bg-muted/50 animate-pulse" />
                <div className="h-2 w-16 rounded bg-muted/50 animate-pulse" />
              </div>
              <div className="space-y-1.5 text-right">
                <div className="h-3 w-12 rounded bg-muted/50 animate-pulse ml-auto" />
                <div className="h-2 w-6 rounded bg-muted/50 animate-pulse ml-auto" />
              </div>
            </div>
          ))}
        </GlassCard>
      ) : (
        <GlassCard className="p-4 space-y-2">
          {entries.map((student, i) => {
            const style = RANK_STYLES[student.rank];
            return (
              <motion.div
                key={student.rank}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                className={`flex items-center gap-4 p-3 rounded-xl transition-colors hover:bg-white/40 dark:hover:bg-slate-800/40 ${
                  style ? style.border : ''
                }`}
              >
                {/* Rank */}
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-extrabold text-sm ${
                  style
                    ? `bg-gradient-to-br ${style.bg} text-white`
                    : 'bg-muted/50 text-muted-foreground'
                }`}>
                  {student.rank}
                </div>

                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
                  {getInitials(student.name)}
                </div>

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground line-clamp-1">{student.name}</p>
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Flame className="w-3 h-3 text-orange-400" />
                    {student.rank <= 3 ? 'Top Performer' : 'Rising Star'}
                  </p>
                </div>

                {/* XP */}
                <div className="text-right">
                  <AnimatedCounter target={student.xp} className="text-sm font-extrabold text-sky-500" />
                  <p className="text-[10px] text-muted-foreground">XP</p>
                </div>
              </motion.div>
            );
          })}
        </GlassCard>
      )}
    </div>
  );
}

// ============ HOME PAGE ============

// Check if user has enrolled courses
// In production, this would check actual enrollment data from the backend API
function useHasEnrolledCourses(): boolean {
  const user = useAuthStore((s) => s.user);
  // If user has enrolledCourseIds array with entries, they're enrolled
  if (user?.enrolledCourseIds && user.enrolledCourseIds.length > 0) {
    return true;
  }
  // Also check watch progress as a fallback
  if (typeof window !== 'undefined') {
    try {
      const hasProgress = localStorage.getItem('dakkho-watch-progress');
      if (hasProgress) {
        const parsed = JSON.parse(hasProgress);
        return Object.keys(parsed).length > 0;
      }
    } catch {}
  }
  return false;
}

export function HomePage() {
  const isHomeSectionVisible = useServerConfigStore((s) => s.isHomeSectionVisible);
  const hasEnrolled = useHasEnrolledCourses();
  const { data: allCourses, loading } = useCourses({ limit: 10 });
  const recommended = allCourses.slice(0, 8);

  return (
    <div>
      {isHomeSectionVisible('hero') && (hasEnrolled ? <EnrolledHero /> : <HeroSection />)}
      {isHomeSectionVisible('continue-watching') && <ContinueWatching />}
      {isHomeSectionVisible('categories') && <CategoryPills />}
      {isHomeSectionVisible('new-releases') && <NewReleases />}
      {isHomeSectionVisible('live') && <LiveNow />}
      {isHomeSectionVisible('trending') && <TrendingCourses />}
      {isHomeSectionVisible('instructors') && <FeaturedInstructors />}
      {isHomeSectionVisible('leaderboard') && <WeeklyLeaderboard />}

      {/* Recommended For You */}
      {isHomeSectionVisible('recommended') && (
        <div className="mb-8">
          <h2 className="text-lg font-extrabold text-foreground mb-4">Recommended For You</h2>
          {!loading && recommended.length > 0 ? (
            <CourseCardGrid courses={recommended} />
          ) : loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <LoadingSkeleton key={i} type="card" />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-sm">No recommendations available yet</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
