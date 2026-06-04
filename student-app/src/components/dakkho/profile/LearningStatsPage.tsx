'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3, TrendingUp, Clock, BookOpen, Award, Target,
  Calendar, Flame, Zap, Activity, PieChart, Trophy,
  Star, Users, ChevronDown,
} from 'lucide-react';
import { useNavigationStore } from '@/lib/store';
import { GlassCard } from '../shared/GlassCard';
import { AnimatedPage } from '../shared/AnimatedPage';
import { GradientButton } from '../shared/GradientButton';
import { ProgressBar } from '../shared/ProgressBar';
import { AnimatedCounter } from '../shared/AnimatedCounter';

const MONTHLY_DATA = [
  { month: 'Oct', hours: 12 },
  { month: 'Nov', hours: 18 },
  { month: 'Dec', hours: 15 },
  { month: 'Jan', hours: 24 },
  { month: 'Feb', hours: 28 },
  { month: 'Mar', hours: 22 },
];

const WEEKLY_DATA = [
  { day: 'Mon', hours: 1.5 },
  { day: 'Tue', hours: 2.0 },
  { day: 'Wed', hours: 0.5 },
  { day: 'Thu', hours: 1.8 },
  { day: 'Fri', hours: 2.5 },
  { day: 'Sat', hours: 3.0 },
  { day: 'Sun', hours: 1.2 },
];

const SUBJECT_PROGRESS = [
  { name: 'Web Development', progress: 78, color: 'bg-sky-500' },
  { name: 'Electronics', progress: 45, color: 'bg-purple-500' },
  { name: 'Python Programming', progress: 92, color: 'bg-emerald-500' },
  { name: 'Database Management', progress: 60, color: 'bg-amber-500' },
  { name: 'Networking', progress: 35, color: 'bg-red-500' },
];

const ACHIEVEMENTS_LIST = [
  { id: 'a1', title: 'First Course Completed', description: 'Completed your first full course', icon: Trophy, color: 'from-amber-400 to-yellow-500', earned: true, date: 'Jan 20, 2025' },
  { id: 'a2', title: '10 Hours Watched', description: 'Watched 10 hours of video content', icon: Clock, color: 'from-sky-400 to-blue-600', earned: true, date: 'Feb 5, 2025' },
  { id: 'a3', title: 'Quiz Master', description: 'Scored 90%+ on 5 quizzes', icon: Target, color: 'from-emerald-400 to-green-600', earned: true, date: 'Feb 15, 2025' },
  { id: 'a4', title: '7-Day Streak', description: 'Studied 7 days in a row', icon: Flame, color: 'from-red-400 to-orange-500', earned: true, date: 'Mar 1, 2025' },
  { id: 'a5', title: '50 Hours Watched', description: 'Watched 50 hours total', icon: Zap, color: 'from-purple-400 to-indigo-600', earned: false, date: '' },
  { id: 'a6', title: 'Course Collector', description: 'Enrolled in 10 courses', icon: BookOpen, color: 'from-rose-400 to-pink-600', earned: false, date: '' },
];

export function LearningStatsPage() {
  const { navigate } = useNavigationStore();
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month');

  const maxMonthlyHours = Math.max(...MONTHLY_DATA.map((d) => d.hours));
  const maxWeeklyHours = Math.max(...WEEKLY_DATA.map((d) => d.hours));
  const totalHoursThisMonth = WEEKLY_DATA.reduce((s, d) => s + d.hours, 0);

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

        {/* Overview Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { icon: Clock, label: 'Hours Watched', value: 48, color: 'text-sky-500 bg-sky-50 dark:bg-sky-900/20' },
            { icon: BookOpen, label: 'Courses Enrolled', value: 12, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' },
            { icon: Award, label: 'Certificates', value: 5, color: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20' },
            { icon: Flame, label: 'Day Streak', value: 14, color: 'text-red-500 bg-red-50 dark:bg-red-900/20' },
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
          {/* Monthly Activity Chart */}
          <GlassCard className="p-6">
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-sky-500" />
              Monthly Learning Hours
            </h3>
            <div className="flex items-end gap-3 h-44">
              {MONTHLY_DATA.map((item, i) => (
                <div key={item.month} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] font-bold text-foreground">{item.hours}h</span>
                  <motion.div
                    className="w-full rounded-t-lg bg-gradient-to-t from-sky-500 to-blue-600"
                    initial={{ height: 0 }}
                    animate={{ height: `${(item.hours / maxMonthlyHours) * 100}%` }}
                    transition={{ delay: 0.3 + i * 0.1, duration: 0.6 }}
                    style={{ minHeight: '4px' }}
                  />
                  <span className="text-[10px] text-muted-foreground">{item.month}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-white/20 dark:border-white/5 text-xs text-muted-foreground flex justify-between">
              <span>Total: {MONTHLY_DATA.reduce((s, d) => s + d.hours, 0)} hours</span>
              <span className="text-emerald-500 font-semibold">+15% vs last period</span>
            </div>
          </GlassCard>

          {/* Weekly Breakdown */}
          <GlassCard className="p-6">
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-500" />
              This Week
            </h3>
            <div className="flex items-end gap-2 h-44">
              {WEEKLY_DATA.map((day, i) => (
                <div key={day.day} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] font-bold text-foreground">{day.hours}h</span>
                  <motion.div
                    className={`w-full rounded-t-lg ${i === WEEKLY_DATA.length - 2 ? 'bg-gradient-to-t from-emerald-500 to-emerald-400' : 'bg-gradient-to-t from-sky-500 to-blue-600'}`}
                    initial={{ height: 0 }}
                    animate={{ height: `${(day.hours / maxWeeklyHours) * 100}%` }}
                    transition={{ delay: 0.3 + i * 0.08, duration: 0.5 }}
                    style={{ minHeight: '4px' }}
                  />
                  <span className="text-[10px] text-muted-foreground">{day.day}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-3 border-t border-white/20 dark:border-white/5 text-xs text-muted-foreground flex justify-between">
              <span>Total: {totalHoursThisMonth.toFixed(1)} hours this week</span>
              <span>Goal: 15h/week</span>
            </div>
          </GlassCard>

          {/* Subject Progress */}
          <GlassCard className="p-6">
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
              <PieChart className="w-4 h-4 text-purple-500" />
              Subject Progress
            </h3>
            <div className="space-y-4">
              {SUBJECT_PROGRESS.map((subject, i) => (
                <motion.div
                  key={subject.name}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.08 }}
                >
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium text-foreground">{subject.name}</span>
                    <span className="font-bold text-foreground">{subject.progress}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${subject.color}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${subject.progress}%` }}
                      transition={{ delay: 0.5 + i * 0.1, duration: 0.8 }}
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          </GlassCard>

          {/* Achievements */}
          <GlassCard className="p-6">
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              Achievements ({ACHIEVEMENTS_LIST.filter((a) => a.earned).length}/{ACHIEVEMENTS_LIST.length})
            </h3>
            <div className="space-y-3">
              {ACHIEVEMENTS_LIST.map((achievement, i) => (
                <motion.div
                  key={achievement.id}
                  className={`flex items-center gap-3 p-3 rounded-xl ${
                    achievement.earned ? 'bg-white/30 dark:bg-slate-800/30' : 'bg-muted/20 opacity-60'
                  }`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.06 }}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    achievement.earned
                      ? `bg-gradient-to-br ${achievement.color} text-white`
                      : 'bg-muted/30 text-muted-foreground'
                  }`}>
                    <achievement.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className={`text-sm font-bold ${achievement.earned ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {achievement.title}
                    </h4>
                    <p className="text-[10px] text-muted-foreground">{achievement.description}</p>
                    {achievement.earned && achievement.date && (
                      <p className="text-[10px] text-emerald-500 font-semibold mt-0.5">Earned: {achievement.date}</p>
                    )}
                  </div>
                  {achievement.earned && (
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400 flex-shrink-0" />
                  )}
                </motion.div>
              ))}
            </div>
          </GlassCard>
        </div>

        {/* Learning Goals */}
        <GlassCard className="p-6 mt-6">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
            <Target className="w-4 h-4 text-sky-500" />
            Learning Goals
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: 'Weekly Hours Goal', current: totalHoursThisMonth, target: 15, unit: 'h', progress: (totalHoursThisMonth / 15) * 100 },
              { label: 'Monthly Courses Goal', current: 3, target: 4, unit: 'courses', progress: 75 },
              { label: 'Quiz Score Goal', current: 82, target: 90, unit: '%', progress: (82 / 90) * 100 },
            ].map((goal, i) => (
              <motion.div
                key={goal.label}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + i * 0.08 }}
              >
                <GlassCard className="p-4 text-center">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">{goal.label}</p>
                  <div className="text-2xl font-extrabold text-foreground">
                    {typeof goal.current === 'number' && goal.unit === 'h' ? goal.current.toFixed(1) : goal.current}
                    <span className="text-sm font-normal text-muted-foreground">/{goal.target}{goal.unit}</span>
                  </div>
                  <ProgressBar value={Math.min(goal.progress, 100)} size="sm" className="mt-2" />
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </GlassCard>
      </div>
    </AnimatedPage>
  );
}
