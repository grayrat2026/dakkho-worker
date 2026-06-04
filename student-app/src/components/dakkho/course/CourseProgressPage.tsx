'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3, TrendingUp, Clock, BookOpen, Award, Target,
  Calendar, Flame, Zap, CheckCircle, Circle, Play,
  ChevronLeft, PieChart, Activity,
} from 'lucide-react';
import { useNavigationStore } from '@/lib/store';
import { getCourse, getCourseVideos, formatDuration } from '@/lib/mock-data';
import { GlassCard } from '../shared/GlassCard';
import { AnimatedPage } from '../shared/AnimatedPage';
import { GradientButton } from '../shared/GradientButton';
import { ProgressBar } from '../shared/ProgressBar';
import { AnimatedCounter } from '../shared/AnimatedCounter';

const WEEKLY_DATA = [
  { day: 'Mon', hours: 1.5, videos: 3 },
  { day: 'Tue', hours: 2.0, videos: 4 },
  { day: 'Wed', hours: 0.5, videos: 1 },
  { day: 'Thu', hours: 1.8, videos: 3 },
  { day: 'Fri', hours: 2.5, videos: 5 },
  { day: 'Sat', hours: 3.0, videos: 6 },
  { day: 'Sun', hours: 1.2, videos: 2 },
];

const DAILY_STREAK = [
  { date: 'Mar 18', completed: true },
  { date: 'Mar 19', completed: true },
  { date: 'Mar 20', completed: true },
  { date: 'Mar 21', completed: false },
  { date: 'Mar 22', completed: true },
  { date: 'Mar 23', completed: true },
  { date: 'Mar 24', completed: true },
  { date: 'Mar 25', completed: true },
  { date: 'Mar 26', completed: false },
  { date: 'Mar 27', completed: true },
  { date: 'Mar 28', completed: true },
  { date: 'Mar 29', completed: true },
  { date: 'Mar 30', completed: true },
  { date: 'Mar 31', completed: true },
];

export function CourseProgressPage() {
  const { pageParams, navigate, goBack } = useNavigationStore();
  const courseId = pageParams.courseId as string;
  const course = getCourse(courseId);
  const videos = getCourseVideos(courseId);

  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'all'>('week');

  if (!course) {
    return (
      <AnimatedPage>
        <div className="text-center py-16">
          <p className="text-lg font-bold">Course not found</p>
          <GradientButton onClick={goBack} className="mt-4">Go Back</GradientButton>
        </div>
      </AnimatedPage>
    );
  }

  const completedCount = Math.floor(videos.length * 0.35);
  const inProgressCount = Math.floor(videos.length * 0.15);
  const notStartedCount = videos.length - completedCount - inProgressCount;
  const overallProgress = videos.length > 0 ? Math.round((completedCount / videos.length) * 100) : 0;
  const totalHoursWatched = Math.round(course.duration * (completedCount / videos.length) / 3600);
  const currentStreak = 5;

  const maxHours = Math.max(...WEEKLY_DATA.map((d) => d.hours));

  return (
    <AnimatedPage keyProp={`course-progress-${courseId}`}>
      <div className="pb-20 lg:pb-0">
        {/* Breadcrumb */}
        <motion.div
          className="flex items-center gap-2 text-sm text-muted-foreground mb-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <button onClick={() => navigate('home')} className="hover:text-sky-500 transition-colors">Home</button>
          <span>/</span>
          <button onClick={() => navigate('course-detail', { courseId })} className="hover:text-sky-500 transition-colors">{course.title}</button>
          <span>/</span>
          <span className="text-foreground font-semibold">Progress</span>
        </motion.div>

        {/* Header with overall progress */}
        <GlassCard className="p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-lg font-extrabold text-foreground flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-sky-500" />
                Learning Progress
              </h1>
              <p className="text-sm text-muted-foreground mt-1">{course.title}</p>
            </div>
            <div className="flex gap-1">
              {(['week', 'month', 'all'] as const).map((range) => (
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

          {/* Big progress circle visual */}
          <div className="flex items-center gap-6 mb-4">
            <div className="relative w-24 h-24 flex-shrink-0">
              <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" className="text-muted/30" strokeWidth="8" />
                <circle
                  cx="50" cy="50" r="42" fill="none" stroke="url(#progressGrad)" strokeWidth="8"
                  strokeDasharray={`${overallProgress * 2.64} ${264 - overallProgress * 2.64}`}
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient id="progressGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#0ea5e9" />
                    <stop offset="100%" stopColor="#2563eb" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl font-extrabold text-foreground">{overallProgress}%</span>
              </div>
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle className="w-4 h-4 text-emerald-500" /> Completed
                </span>
                <span className="font-bold text-foreground">{completedCount} videos</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Play className="w-4 h-4 text-sky-500" /> In Progress
                </span>
                <span className="font-bold text-foreground">{inProgressCount} videos</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Circle className="w-4 h-4 text-muted-foreground" /> Not Started
                </span>
                <span className="font-bold text-foreground">{notStartedCount} videos</span>
              </div>
            </div>
          </div>

          <ProgressBar value={overallProgress} size="lg" showLabel />
        </GlassCard>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { icon: Clock, label: 'Hours Watched', value: totalHoursWatched, color: 'text-sky-500 bg-sky-50 dark:bg-sky-900/20' },
            { icon: BookOpen, label: 'Videos Done', value: completedCount, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' },
            { icon: Flame, label: 'Day Streak', value: currentStreak, color: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20' },
            { icon: Target, label: 'Quizzes Passed', value: 3, color: 'text-purple-500 bg-purple-50 dark:bg-purple-900/20' },
          ].map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
              <GlassCard className="p-4 text-center">
                <div className={`w-9 h-9 rounded-xl ${stat.color} flex items-center justify-center mx-auto mb-2`}>
                  <stat.icon className="w-4 h-4" />
                </div>
                <AnimatedCounter target={stat.value} className="text-lg font-extrabold text-foreground" />
                <p className="text-[10px] text-muted-foreground mt-0.5">{stat.label}</p>
              </GlassCard>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Weekly Activity Chart */}
          <GlassCard className="p-6">
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-sky-500" />
              Weekly Activity
            </h3>
            <div className="flex items-end gap-2 h-40">
              {WEEKLY_DATA.map((day, i) => (
                <div key={day.day} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] font-bold text-foreground">{day.hours}h</span>
                  <motion.div
                    className="w-full rounded-t-lg bg-gradient-to-t from-sky-500 to-blue-600"
                    initial={{ height: 0 }}
                    animate={{ height: `${(day.hours / maxHours) * 100}%` }}
                    transition={{ delay: 0.5 + i * 0.08, duration: 0.5 }}
                    style={{ minHeight: '4px' }}
                  />
                  <span className="text-[10px] text-muted-foreground">{day.day}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/20 dark:border-white/5 text-xs text-muted-foreground">
              <span>Total: {WEEKLY_DATA.reduce((s, d) => s + d.hours, 0).toFixed(1)} hours</span>
              <span>{WEEKLY_DATA.reduce((s, d) => s + d.videos, 0)} videos watched</span>
            </div>
          </GlassCard>

          {/* Study Streak */}
          <GlassCard className="p-6">
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-500" />
              Study Streak
            </h3>
            <div className="flex items-center justify-center mb-4">
              <div className="text-center">
                <span className="text-4xl font-extrabold text-foreground">{currentStreak}</span>
                <p className="text-xs text-muted-foreground mt-1">Day Streak 🔥</p>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {DAILY_STREAK.map((day, i) => (
                <motion.div
                  key={day.date}
                  className={`aspect-square rounded-lg flex items-center justify-center ${
                    day.completed
                      ? 'bg-emerald-100 dark:bg-emerald-900/30'
                      : 'bg-muted/30'
                  }`}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3 + i * 0.03 }}
                  title={day.date}
                >
                  {day.completed ? (
                    <CheckCircle className="w-3 h-3 text-emerald-500" />
                  ) : (
                    <Circle className="w-3 h-3 text-muted-foreground/30" />
                  )}
                </motion.div>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground text-center mt-2">Last 14 days activity</p>
          </GlassCard>

          {/* Section Progress */}
          <GlassCard className="p-6">
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
              <PieChart className="w-4 h-4 text-purple-500" />
              Section Progress
            </h3>
            <div className="space-y-4">
              {[
                { name: 'Section 1: Fundamentals', progress: 100, videos: '8/8' },
                { name: 'Section 2: Core Concepts', progress: 75, videos: '6/8' },
                { name: 'Section 3: Advanced Topics', progress: 40, videos: '3/8' },
                { name: 'Section 4: Projects', progress: 10, videos: '1/8' },
              ].map((section, i) => (
                <div key={section.name}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium text-foreground line-clamp-1">{section.name}</span>
                    <span className="text-xs text-muted-foreground flex-shrink-0">{section.videos}</span>
                  </div>
                  <ProgressBar value={section.progress} size="sm" showLabel />
                </div>
              ))}
            </div>
          </GlassCard>

          {/* Milestones */}
          <GlassCard className="p-6">
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" />
              Milestones
            </h3>
            <div className="space-y-3">
              {[
                { label: 'First Video Watched', achieved: true, date: 'Jan 15, 2025' },
                { label: '10 Videos Completed', achieved: true, date: 'Feb 3, 2025' },
                { label: 'First Quiz Passed', achieved: true, date: 'Feb 10, 2025' },
                { label: '25% Course Complete', achieved: true, date: 'Feb 20, 2025' },
                { label: '50% Course Complete', achieved: false, date: '' },
                { label: 'All Quizzes Passed', achieved: false, date: '' },
                { label: 'Course Completed', achieved: false, date: '' },
              ].map((milestone, i) => (
                <motion.div
                  key={milestone.label}
                  className="flex items-center gap-3"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.05 }}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    milestone.achieved
                      ? 'bg-emerald-50 dark:bg-emerald-900/20'
                      : 'bg-muted/30'
                  }`}>
                    {milestone.achieved ? (
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Circle className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${milestone.achieved ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {milestone.label}
                    </p>
                    {milestone.achieved && milestone.date && (
                      <p className="text-[10px] text-muted-foreground">{milestone.date}</p>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </GlassCard>
        </div>

        {/* Continue Learning */}
        <GlassCard className="p-6 mt-6">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">Continue Learning</h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-foreground">Pick up where you left off</p>
              <p className="text-xs text-muted-foreground mt-1">You are 65% through this course</p>
            </div>
            <GradientButton
              size="sm"
              onClick={() => {
                const nextVideo = videos[Math.min(completedCount, videos.length - 1)];
                if (nextVideo) navigate('video-player', { videoId: nextVideo.id, courseId });
              }}
            >
              <Play className="w-4 h-4" />
              Continue
            </GradientButton>
          </div>
        </GlassCard>
      </div>
    </AnimatedPage>
  );
}
