'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  User, BookOpen, Clock, Award, Settings, Bookmark, HelpCircle, LogOut,
  ChevronRight, Edit3, Flame, Shield, Bell, Lock, Trophy, Star,
  Loader2,
} from 'lucide-react';
import { useAuthStore, useNavigationStore } from '@/lib/store';
import { studentProfileApi, activityApi, achievementsApi, instituteApi } from '@/lib/api-client';
import { TECHNOLOGY_SHORT_NAMES } from '@/lib/constants';
import { GlassCard } from '../shared/GlassCard';
import { AnimatedCounter } from '../shared/AnimatedCounter';

// Icon map for dynamic icon resolution from API string names
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  trophy: Trophy,
  flame: Flame,
  star: Star,
  award: Award,
  book: BookOpen,
  'book-open': BookOpen,
  bookmark: Bookmark,
};
const DEFAULT_ACHIEVEMENT_ICON = Trophy;

// Color map for achievement categories
const ACHIEVEMENT_COLORS: Record<string, string> = {
  learning: 'from-amber-400 to-yellow-500',
  streak: 'from-red-400 to-orange-500',
  quiz: 'from-purple-400 to-violet-500',
  engagement: 'from-emerald-400 to-green-500',
  milestone: 'from-sky-400 to-blue-500',
};
const DEFAULT_ACHIEVEMENT_COLOR = 'from-amber-400 to-yellow-500';

// Activity type color/icon mapping
const ACTIVITY_TYPE_MAP: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string }> = {
  video: { icon: BookOpen, color: 'text-sky-500 bg-sky-50 dark:bg-sky-900/20' },
  quiz: { icon: Award, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' },
  enrollment: { icon: BookOpen, color: 'text-purple-500 bg-purple-50 dark:bg-purple-900/20' },
  achievement: { icon: Trophy, color: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20' },
  bookmark: { icon: Bookmark, color: 'text-rose-500 bg-rose-50 dark:bg-rose-900/20' },
  assignment: { icon: Star, color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' },
};
const DEFAULT_ACTIVITY_STYLE = { icon: BookOpen, color: 'text-muted-foreground bg-muted/50' };

const ACCOUNT_SETTINGS = [
  { icon: Lock, label: 'Change Password', page: 'change-password', color: 'text-sky-500' },
  { icon: Bell, label: 'Notification Preferences', page: 'settings-notifications', color: 'text-amber-500' },
  { icon: Shield, label: 'Content Protection', page: 'settings-content-protection', color: 'text-emerald-500' },
];

function formatRelativeTime(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  const diffMonths = Math.floor(diffDays / 30);
  return `${diffMonths}mo ago`;
}

export function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const refreshUser = useAuthStore((s) => s.refreshUser);
  const navigate = useNavigationStore((s) => s.navigate);

  // Resolved institute name from instituteId
  const [resolvedInstituteName, setResolvedInstituteName] = useState<string | null>(null);

  // Stats state
  const [statsData, setStatsData] = useState<{
    coursesEnrolled: number;
    hoursWatched: number;
    certificates: number;
    currentStreak: number;
  } | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Achievements state
  const [achievements, setAchievements] = useState<Array<{
    id: number;
    slug: string;
    name: string;
    description: string;
    category: string;
    icon: string;
    unlocked: boolean;
  }> | null>(null);
  const [achievementsLoading, setAchievementsLoading] = useState(true);

  // Activity state
  const [activities, setActivities] = useState<Array<{
    id: number;
    type: string;
    title: string;
    description: string | null;
    createdAt: string;
  }> | null>(null);
  const [activitiesLoading, setActivitiesLoading] = useState(true);

  // Refresh user data and fetch all data on mount
  useEffect(() => {
    refreshUser().catch(() => {/* ignore */});

    // Resolve institute name from instituteId
    async function fetchInstituteName() {
      if (user?.instituteId) {
        try {
          const res = await instituteApi.list({ limit: 100 });
          const found = res.institutes.find((inst) => inst.id === user.instituteId);
          if (found) setResolvedInstituteName(found.name);
        } catch (err) {
          console.error('Failed to resolve institute name:', err);
        }
      }
    }
    fetchInstituteName();

    async function fetchStats() {
      try {
        const res = await studentProfileApi.stats();
        setStatsData(res.stats);
      } catch (err) {
        console.error('Failed to fetch stats:', err);
        setStatsData({ coursesEnrolled: 0, hoursWatched: 0, certificates: 0, currentStreak: 0 });
      } finally {
        setStatsLoading(false);
      }
    }
    async function fetchAchievements() {
      try {
        const res = await achievementsApi.list();
        const unlocked = res.achievements.filter((a) => a.unlocked).slice(0, 3);
        setAchievements(unlocked);
      } catch (err) {
        console.error('Failed to fetch achievements:', err);
        setAchievements([]);
      } finally {
        setAchievementsLoading(false);
      }
    }
    async function fetchActivities() {
      try {
        const res = await activityApi.list({ limit: 5 });
        setActivities(res.activities);
      } catch (err) {
        console.error('Failed to fetch activities:', err);
        setActivities([]);
      } finally {
        setActivitiesLoading(false);
      }
    }
    fetchStats();
    fetchAchievements();
    fetchActivities();
  }, []);

  if (!user) return null;

  const stats = [
    { icon: BookOpen, label: 'Courses Enrolled', value: statsData?.coursesEnrolled ?? 0, color: 'text-sky-500 bg-sky-50 dark:bg-sky-900/20' },
    { icon: Clock, label: 'Hours Watched', value: statsData?.hoursWatched ?? 0, color: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20' },
    { icon: Award, label: 'Certificates', value: statsData?.certificates ?? 0, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' },
    { icon: Flame, label: 'Current Streak', value: statsData?.currentStreak ?? 0, suffix: 'd', color: 'text-red-500 bg-red-50 dark:bg-red-900/20' },
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
              {user.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.fullName} className="w-full h-full rounded-full object-cover" />
              ) : (
                user.fullName.charAt(0)
              )}
            </motion.div>
            <div className="flex-1">
              <h1 className="text-xl font-extrabold text-foreground">{user.fullName}</h1>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <div className="flex items-center gap-2 mt-1">
                {(user.institute || resolvedInstituteName) && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 font-semibold">
                    {resolvedInstituteName || user.institute}
                  </span>
                )}
                {user.technology && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 font-semibold">
                    {TECHNOLOGY_SHORT_NAMES[user.technology] || user.technology}
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
              {statsLoading ? (
                <div className="flex justify-center py-1">
                  <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
                </div>
              ) : (
                <AnimatedCounter target={stat.value} suffix={stat.suffix} className="text-xl font-extrabold text-foreground" />
              )}
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
        {achievementsLoading ? (
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <GlassCard key={i} className="p-4 text-center">
                <div className="w-12 h-12 mx-auto rounded-xl bg-muted/50 animate-pulse mb-2" />
                <div className="h-3 bg-muted/50 rounded animate-pulse mb-1" />
                <div className="h-2 bg-muted/50 rounded animate-pulse" />
              </GlassCard>
            ))}
          </div>
        ) : achievements && achievements.length > 0 ? (
          <div className="grid grid-cols-3 gap-3">
            {achievements.map((achievement, i) => {
              const IconComp = ICON_MAP[achievement.icon?.toLowerCase()] || DEFAULT_ACHIEVEMENT_ICON;
              const color = ACHIEVEMENT_COLORS[achievement.category] || DEFAULT_ACHIEVEMENT_COLOR;
              return (
                <motion.div
                  key={achievement.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3 + i * 0.08 }}
                >
                  <GlassCard className="p-4 text-center">
                    <motion.div
                      className={`w-12 h-12 mx-auto rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-white shadow-lg mb-2`}
                      whileHover={{ scale: 1.1, rotate: 5 }}
                    >
                      <IconComp className="w-6 h-6" />
                    </motion.div>
                    <p className="text-xs font-bold text-foreground line-clamp-1">{achievement.name}</p>
                    <p className="text-[10px] text-muted-foreground line-clamp-1">{achievement.description}</p>
                  </GlassCard>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <GlassCard className="p-6 text-center">
            <Trophy className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No achievements unlocked yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Keep learning to earn your first achievement!</p>
          </GlassCard>
        )}
      </div>

      {/* Recent Activity */}
      <div className="mb-6">
        <h2 className="text-lg font-extrabold text-foreground mb-4">Recent Activity</h2>
        {activitiesLoading ? (
          <GlassCard className="divide-y divide-white/20 dark:divide-white/5">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3 p-4">
                <div className="w-9 h-9 rounded-xl bg-muted/50 animate-pulse" />
                <div className="flex-1">
                  <div className="h-3 bg-muted/50 rounded animate-pulse w-3/4" />
                </div>
                <div className="h-3 bg-muted/50 rounded animate-pulse w-10" />
              </div>
            ))}
          </GlassCard>
        ) : activities && activities.length > 0 ? (
          <GlassCard className="divide-y divide-white/20 dark:divide-white/5">
            {activities.map((activity, i) => {
              const style = ACTIVITY_TYPE_MAP[activity.type] || DEFAULT_ACTIVITY_STYLE;
              const ActivityIcon = style.icon;
              return (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.05 }}
                  className="flex items-center gap-3 p-4 first:rounded-t-2xl last:rounded-b-2xl"
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${style.color}`}>
                    <ActivityIcon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground line-clamp-1">
                      {activity.title}
                    </p>
                    {activity.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1">{activity.description}</p>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground flex-shrink-0">{formatRelativeTime(activity.createdAt)}</span>
                </motion.div>
              );
            })}
          </GlassCard>
        ) : (
          <GlassCard className="p-6 text-center">
            <BookOpen className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No recent activity</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Start watching courses to see your activity here</p>
          </GlassCard>
        )}
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
