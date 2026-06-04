'use client';

import { motion } from 'framer-motion';
import {
  User, BookOpen, Clock, Award, Settings, Bookmark, HelpCircle, LogOut,
  ChevronRight, Edit3, Flame, Shield, Bell, Lock, Trophy, Star,
} from 'lucide-react';
import { useAuthStore, useNavigationStore } from '@/lib/store';
import { GlassCard } from '../shared/GlassCard';
import { AnimatedCounter } from '../shared/AnimatedCounter';

const ACHIEVEMENTS = [
  { id: 'a1', title: 'First Course', description: 'Completed your first course', icon: Trophy, color: 'from-amber-400 to-yellow-500' },
  { id: 'a2', title: 'Quick Learner', description: 'Watched 10 hours in a week', icon: Flame, color: 'from-red-400 to-orange-500' },
  { id: 'a3', title: 'Top Student', description: 'Scored 95%+ on an exam', icon: Star, color: 'from-purple-400 to-indigo-500' },
];

const RECENT_ACTIVITY = [
  { id: 'ra1', action: 'Watched', detail: 'React Hooks Deep Dive', time: '2h ago', icon: BookOpen, color: 'text-sky-500 bg-sky-50 dark:bg-sky-900/20' },
  { id: 'ra2', action: 'Completed', detail: 'Digital Electronics Quiz', time: '5h ago', icon: Award, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' },
  { id: 'ra3', action: 'Enrolled in', detail: 'Machine Learning with Python', time: '1d ago', icon: BookOpen, color: 'text-purple-500 bg-purple-50 dark:bg-purple-900/20' },
  { id: 'ra4', action: 'Earned badge', detail: 'Quick Learner', time: '2d ago', icon: Trophy, color: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20' },
  { id: 'ra5', action: 'Bookmarked', detail: 'Flutter Mobile App Development', time: '3d ago', icon: Bookmark, color: 'text-rose-500 bg-rose-50 dark:bg-rose-900/20' },
];

const ACCOUNT_SETTINGS = [
  { icon: Lock, label: 'Change Password', page: 'change-password', color: 'text-sky-500' },
  { icon: Bell, label: 'Notification Preferences', page: 'settings-notifications', color: 'text-amber-500' },
  { icon: Shield, label: 'Content Protection', page: 'settings-content-protection', color: 'text-emerald-500' },
];

export function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigationStore((s) => s.navigate);

  if (!user) return null;

  const stats = [
    { icon: BookOpen, label: 'Courses Enrolled', value: 12, color: 'text-sky-500 bg-sky-50 dark:bg-sky-900/20' },
    { icon: Clock, label: 'Hours Watched', value: 48, color: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20' },
    { icon: Award, label: 'Certificates', value: 5, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' },
    { icon: Flame, label: 'Current Streak', value: 14, suffix: 'd', color: 'text-red-500 bg-red-50 dark:bg-red-900/20' },
  ];

  const menuItems = [
    { icon: BookOpen, label: 'My Courses', page: 'my-courses' as const, color: 'text-sky-500' },
    { icon: Bookmark, label: 'Bookmarks', page: 'bookmarks' as const, color: 'text-amber-500' },
    { icon: Settings, label: 'Settings', page: 'settings' as const, color: 'text-muted-foreground' },
    { icon: HelpCircle, label: 'Help & Support', page: 'help' as const, color: 'text-muted-foreground' },
  ];

  return (
    <div>
      {/* Profile header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <GlassCard className="p-6 mb-6">
          <div className="flex items-center gap-4">
            <motion.div
              className="w-16 h-16 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white text-2xl font-extrabold shadow-lg shadow-sky-500/20"
              whileHover={{ scale: 1.05 }}
            >
              {user.fullName.charAt(0)}
            </motion.div>
            <div className="flex-1">
              <h1 className="text-xl font-extrabold text-foreground">{user.fullName}</h1>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <div className="flex items-center gap-2 mt-1">
                {user.institute && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 font-semibold">
                    {user.institute}
                  </span>
                )}
                {user.technology && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 font-semibold">
                    CSE
                  </span>
                )}
              </div>
            </div>
            <motion.button
              className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-900/20 flex items-center justify-center"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('edit-profile')}
            >
              <Edit3 className="w-4 h-4 text-sky-500" />
            </motion.button>
          </div>
        </GlassCard>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
          >
            <GlassCard className="p-4 text-center">
              <div className={`w-10 h-10 rounded-xl ${stat.color} flex items-center justify-center mx-auto mb-2`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <AnimatedCounter target={stat.value} suffix={stat.suffix} className="text-xl font-extrabold text-foreground" />
              <p className="text-[10px] text-muted-foreground mt-0.5">{stat.label}</p>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {/* Achievement Showcase */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-extrabold text-foreground">Achievements</h2>
          <motion.button
            className="text-xs text-sky-500 font-semibold"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('achievements')}
          >
            View All
          </motion.button>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {ACHIEVEMENTS.map((achievement, i) => (
            <motion.div
              key={achievement.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 + i * 0.08 }}
            >
              <GlassCard className="p-4 text-center">
                <motion.div
                  className={`w-12 h-12 mx-auto rounded-xl bg-gradient-to-br ${achievement.color} flex items-center justify-center text-white shadow-lg mb-2`}
                  whileHover={{ scale: 1.1, rotate: 5 }}
                >
                  <achievement.icon className="w-6 h-6" />
                </motion.div>
                <p className="text-xs font-bold text-foreground line-clamp-1">{achievement.title}</p>
                <p className="text-[10px] text-muted-foreground line-clamp-1">{achievement.description}</p>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="mb-6">
        <h2 className="text-lg font-extrabold text-foreground mb-4">Recent Activity</h2>
        <GlassCard className="divide-y divide-white/20 dark:divide-white/5">
          {RECENT_ACTIVITY.map((activity, i) => (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + i * 0.05 }}
              className="flex items-center gap-3 p-4 first:rounded-t-2xl last:rounded-b-2xl"
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${activity.color}`}>
                <activity.icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground line-clamp-1">
                  <span className="text-muted-foreground font-normal">{activity.action}</span> {activity.detail}
                </p>
              </div>
              <span className="text-[10px] text-muted-foreground flex-shrink-0">{activity.time}</span>
            </motion.div>
          ))}
        </GlassCard>
      </div>

      {/* Account Settings links */}
      <div className="mb-6">
        <h2 className="text-lg font-extrabold text-foreground mb-4">Account</h2>
        <div className="space-y-2">
          {ACCOUNT_SETTINGS.map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + i * 0.05 }}
            >
              <GlassCard
                hover
                className="p-4 flex items-center gap-4 cursor-pointer"
                onClick={() => navigate(item.page as any)}
              >
                <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center">
                  <item.icon className={`w-5 h-5 ${item.color}`} />
                </div>
                <span className="flex-1 text-sm font-semibold text-foreground">{item.label}</span>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Quick Navigation Menu */}
      <div className="space-y-2 mb-6">
        {menuItems.map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 + i * 0.05 }}
          >
            <GlassCard
              hover
              className="p-4 flex items-center gap-4 cursor-pointer"
              onClick={() => navigate(item.page)}
            >
              <div className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center">
                <item.icon className={`w-5 h-5 ${item.color}`} />
              </div>
              <span className="flex-1 text-sm font-semibold text-foreground">{item.label}</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {/* Logout */}
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.8 }}
      >
        <GlassCard
          hover
          className="p-4 flex items-center gap-4 cursor-pointer"
          onClick={() => { logout(); navigate('login'); }}
        >
          <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
            <LogOut className="w-5 h-5 text-red-500" />
          </div>
          <span className="flex-1 text-sm font-semibold text-red-500">Logout</span>
          <ChevronRight className="w-4 h-4 text-red-300" />
        </GlassCard>
      </motion.div>
    </div>
  );
}
