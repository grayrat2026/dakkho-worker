'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3, TrendingUp, Clock, BookOpen, Award, Target,
  Flame, Activity, PieChart, Trophy, Star, Loader2,
} from 'lucide-react';
import { useNavigationStore } from '@/lib/store';
import { learningStatsApi } from '@/lib/api-client';
import { GlassCard } from '../shared/GlassCard';
import { AnimatedPage } from '../shared/AnimatedPage';
import { AnimatedCounter } from '../shared/AnimatedCounter';
import { ProgressBar } from '../shared/ProgressBar';

interface DailyDataPoint {
  date: string;
  videos: number;
  activities: number;
}

interface SubjectProgressItem {
  subject: string;
  progress: number;
}

interface OverviewStats {
  hoursWatched: number;
  coursesEnrolled: number;
  certificates: number;
  currentStreak: number;
}

interface LearningStatsData {
  dailyData: DailyDataPoint[];
  subjectProgress: SubjectProgressItem[];
  overview: OverviewStats;
  range: string;
}

const SUBJECT_COLORS = [
  'bg-sky-500', 'bg-purple-500', 'bg-emerald-500', 'bg-amber-500', 'bg-red-500',
  'bg-teal-500', 'bg-indigo-500', 'bg-pink-500', 'bg-orange-500', 'bg-cyan-500',
];

export function LearningStatsPage() {
  const { navigate } = useNavigationStore();
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month');
  const [data, setData] = useState<LearningStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (range: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await learningStatsApi.get(range);
      setData(result);
    } catch (err: any) {
      setError(err?.message || 'Failed to load learning stats');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(timeRange);
  }, [timeRange, fetchData]);

  const dailyData = data?.dailyData ?? [];
  const subjectProgress = data?.subjectProgress ?? [];
  const overview = data?.overview ?? { hoursWatched: 0, coursesEnrolled: 0, certificates: 0, currentStreak: 0 };

  const maxDailyValue = dailyData.length > 0
    ? Math.max(...dailyData.map((d) => d.videos + d.activities), 1)
    : 1;

  const totalHours = overview.hoursWatched;

  // Format date labels based on range
  const formatLabel = (dateStr: string, index: number) => {
    try {
      const d = new Date(dateStr);
      if (timeRange === 'week') {
        return d.toLocaleDateString('en-US', { weekday: 'short' });
      }
      if (timeRange === 'year') {
        return d.toLocaleDateString('en-US', { month: 'short' });
      }
      return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
    } catch {
      return `Day ${index + 1}`;
    }
  };

  return (
    <AnimatedPage keyProp="learning-stats">
      <div className="pb-20 lg:pb-0">
        {/* Breadcrumb */}
        <motion.div className="flex items-center gap-2 text-sm text-muted-foreground mb-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <button onClick={() => navigate('home')} className="hover:text-sky-500 transition-colors">Home</button>
          <span>/</span>
          <button onClick={() => navigate('profile')} className="hover:text-sky-500 transition-colors">Profile</button>
          <span>/</span>
          <span className="text-foreground font-semibold">Learning Stats</span>
        </motion.div>

        {/* Header */}
        <GlassCard className="p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-extrabold text-foreground flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-sky-500" />
                Learning Statistics
              </h1>
              <p className="text-sm text-muted-foreground mt-1">Track your learning progress and achievements</p>
            </div>
            <div className="flex gap-1">
              {(['week', 'month', 'year'] as const).map((range) => (
                <motion.button
                  key={range}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize ${
                    timeRange === range ? 'bg-sky-500 text-white' : 'bg-muted/30 text-muted-foreground'
                  }`}
                  onClick={() => setTimeRange(range)}
                  whileTap={{ scale: 0.95 }}
                >
                  {range}
                </motion.button>
              ))}
            </div>
          </div>
        </GlassCard>

        {/* Error State */}
        {error && (
          <GlassCard className="p-6 mb-6 text-center">
            <p className="text-sm text-red-500 font-semibold">{error}</p>
            <motion.button
              className="mt-3 text-xs font-semibold text-sky-500 px-4 py-2 rounded-lg bg-sky-50 dark:bg-sky-900/20"
              onClick={() => fetchData(timeRange)}
              whileTap={{ scale: 0.95 }}
            >
              Retry
            </motion.button>
          </GlassCard>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-sky-500 animate-spin mb-3" />
            <p className="text-sm text-muted-foreground">Loading your learning stats…</p>
          </div>
        )}

        {/* Loaded Content */}
        {!loading && !error && (
          <>
            {/* Overview Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {[
                { icon: Clock, label: 'Hours Watched', value: overview.hoursWatched, color: 'text-sky-500 bg-sky-50 dark:bg-sky-900/20' },
                { icon: BookOpen, label: 'Courses Enrolled', value: overview.coursesEnrolled, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' },
                { icon: Award, label: 'Certificates', value: overview.certificates, color: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20' },
                { icon: Flame, label: 'Day Streak', value: overview.currentStreak, color: 'text-red-500 bg-red-50 dark:bg-red-900/20' },
              ].map((stat, i) => (
                <motion.div key={stat.label} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                  <GlassCard className="p-4 text-center">
                    <div className={`w-10 h-10 rounded-xl ${stat.color} flex items-center justify-center mx-auto mb-2`}>
                      <stat.icon className="w-5 h-5" />
                    </div>
                    <AnimatedCounter target={stat.value} className="text-xl font-extrabold text-foreground" />
                    <p className="text-[10px] text-muted-foreground mt-0.5">{stat.label}</p>
                  </GlassCard>
                </motion.div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Daily Activity Chart */}
              <GlassCard className="p-6">
                <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-sky-500" />
                  {timeRange === 'week' ? 'Weekly' : timeRange === 'year' ? 'Yearly' : 'Monthly'} Activity
                </h3>
                {dailyData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-44 text-muted-foreground">
                    <Activity className="w-8 h-8 mb-2 opacity-40" />
                    <p className="text-sm">No activity data yet</p>
                    <p className="text-xs mt-1">Start watching videos to see your stats!</p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-end gap-2 h-44">
                      {dailyData.map((item, i) => {
                        const total = item.videos + item.activities;
                        return (
                          <div key={item.date} className="flex-1 flex flex-col items-center gap-1">
                            <span className="text-[10px] font-bold text-foreground">{total}h</span>
                            <motion.div
                              className="w-full rounded-t-lg bg-gradient-to-t from-sky-500 to-blue-600"
                              initial={{ height: 0 }}
                              animate={{ height: `${(total / maxDailyValue) * 100}%` }}
                              transition={{ delay: 0.3 + i * 0.08, duration: 0.5 }}
                              style={{ minHeight: '4px' }}
                            />
                            <span className="text-[10px] text-muted-foreground truncate w-full text-center">
                              {formatLabel(item.date, i)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-4 pt-3 border-t border-white/20 dark:border-white/5 text-xs text-muted-foreground flex justify-between">
                      <span>Total: {totalHours} hours</span>
                      <span className="text-sky-500 font-semibold capitalize">{timeRange} view</span>
                    </div>
                  </>
                )}
              </GlassCard>

              {/* Videos vs Activities Breakdown */}
              <GlassCard className="p-6">
                <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-500" />
                  Videos vs Activities
                </h3>
                {dailyData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-44 text-muted-foreground">
                    <BarChart3 className="w-8 h-8 mb-2 opacity-40" />
                    <p className="text-sm">No breakdown data yet</p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-end gap-2 h-44">
                      {dailyData.map((item, i) => (
                        <div key={item.date} className="flex-1 flex flex-col items-center gap-1">
                          <span className="text-[10px] font-bold text-foreground">{item.videos + item.activities}h</span>
                          <div className="w-full flex flex-col gap-0.5">
                            <motion.div
                              className="w-full rounded-t-lg bg-gradient-to-t from-sky-500 to-sky-400"
                              initial={{ height: 0 }}
                              animate={{ height: `${(item.videos / maxDailyValue) * 100}%` }}
                              transition={{ delay: 0.3 + i * 0.08, duration: 0.5 }}
                              style={{ minHeight: item.videos > 0 ? '2px' : '0px' }}
                            />
                            <motion.div
                              className="w-full rounded-b-lg bg-gradient-to-t from-emerald-500 to-emerald-400"
                              initial={{ height: 0 }}
                              animate={{ height: `${(item.activities / maxDailyValue) * 100}%` }}
                              transition={{ delay: 0.35 + i * 0.08, duration: 0.5 }}
                              style={{ minHeight: item.activities > 0 ? '2px' : '0px' }}
                            />
                          </div>
                          <span className="text-[10px] text-muted-foreground truncate w-full text-center">
                            {formatLabel(item.date, i)}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 pt-3 border-t border-white/20 dark:border-white/5 text-xs text-muted-foreground flex items-center gap-4">
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-sky-500 inline-block" /> Videos</span>
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" /> Activities</span>
                    </div>
                  </>
                )}
              </GlassCard>

              {/* Subject Progress */}
              <GlassCard className="p-6">
                <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-purple-500" />
                  Subject Progress
                </h3>
                {subjectProgress.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <BookOpen className="w-8 h-8 mb-2 opacity-40" />
                    <p className="text-sm">No subject progress yet</p>
                    <p className="text-xs mt-1">Enroll in courses to track your progress</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {subjectProgress.map((subject, i) => (
                      <motion.div
                        key={subject.subject}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 + i * 0.08 }}
                      >
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="font-medium text-foreground">{subject.subject}</span>
                          <span className="font-bold text-foreground">{subject.progress}%</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                          <motion.div
                            className={`h-full rounded-full ${SUBJECT_COLORS[i % SUBJECT_COLORS.length]}`}
                            initial={{ width: 0 }}
                            animate={{ width: `${subject.progress}%` }}
                            transition={{ delay: 0.5 + i * 0.1, duration: 0.8 }}
                          />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </GlassCard>

              {/* Achievements Summary */}
              <GlassCard className="p-6">
                <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-500" />
                  Quick Stats
                </h3>
                <div className="space-y-4">
                  <motion.div
                    className="flex items-center gap-3 p-3 rounded-xl bg-white/30 dark:bg-slate-800/30"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-sky-400 to-blue-600 text-white">
                      <Clock className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-foreground">Total Hours</h4>
                      <p className="text-[10px] text-muted-foreground">All-time learning hours</p>
                    </div>
                    <span className="text-lg font-extrabold text-foreground">{overview.hoursWatched}</span>
                  </motion.div>

                  <motion.div
                    className="flex items-center gap-3 p-3 rounded-xl bg-white/30 dark:bg-slate-800/30"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-emerald-400 to-green-600 text-white">
                      <Flame className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-foreground">Current Streak</h4>
                      <p className="text-[10px] text-muted-foreground">Consecutive active days</p>
                    </div>
                    <span className="text-lg font-extrabold text-foreground">{overview.currentStreak}</span>
                  </motion.div>

                  <motion.div
                    className="flex items-center gap-3 p-3 rounded-xl bg-white/30 dark:bg-slate-800/30"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-amber-400 to-yellow-500 text-white">
                      <Award className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-foreground">Certificates</h4>
                      <p className="text-[10px] text-muted-foreground">Completed certifications</p>
                    </div>
                    <span className="text-lg font-extrabold text-foreground">{overview.certificates}</span>
                  </motion.div>

                  <motion.div
                    className="flex items-center gap-3 p-3 rounded-xl bg-white/30 dark:bg-slate-800/30"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 }}
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-purple-400 to-indigo-600 text-white">
                      <Target className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-bold text-foreground">Subjects</h4>
                      <p className="text-[10px] text-muted-foreground">Active subjects</p>
                    </div>
                    <span className="text-lg font-extrabold text-foreground">{subjectProgress.length}</span>
                  </motion.div>
                </div>
              </GlassCard>
            </div>
          </>
        )}
      </div>
    </AnimatedPage>
  );
}
