'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Trophy, Star, Flame, Users, BookOpen, Target,
  Lock, Zap, Crown, Medal, Award, Coffee, Brain,
  Heart, Rocket, Shield, Loader2,
  Video, ClipboardCheck, GraduationCap, Sparkles,
  Calendar, Clock, MessageCircle, ThumbsUp, UserPlus,
  Globe, Code, PenTool, Lightbulb, Eye, CheckCircle,
  Gift, Flag, Gem, Sword, FlameKindling, Sun, Moon
} from 'lucide-react';
import { GlassCard } from '../shared/GlassCard';
import { ProgressBar } from '../shared/ProgressBar';
import { achievementsApi } from '@/lib/api-client';

// Map icon string names from API to Lucide icon components
const iconMap: Record<string, React.ElementType> = {
  trophy: Trophy,
  star: Star,
  flame: Flame,
  users: Users,
  bookopen: BookOpen,
  'book-open': BookOpen,
  target: Target,
  zap: Zap,
  crown: Crown,
  medal: Medal,
  award: Award,
  coffee: Coffee,
  brain: Brain,
  heart: Heart,
  rocket: Rocket,
  shield: Shield,
  video: Video,
  clipboardcheck: ClipboardCheck,
  'clipboard-check': ClipboardCheck,
  graduationcap: GraduationCap,
  'graduation-cap': GraduationCap,
  sparkles: Sparkles,
  calendar: Calendar,
  clock: Clock,
  messagecircle: MessageCircle,
  'message-circle': MessageCircle,
  thumbsup: ThumbsUp,
  'thumbs-up': ThumbsUp,
  userplus: UserPlus,
  'user-plus': UserPlus,
  globe: Globe,
  code: Code,
  pentool: PenTool,
  'pen-tool': PenTool,
  lightbulb: Lightbulb,
  eye: Eye,
  checkcircle: CheckCircle,
  'check-circle': CheckCircle,
  gift: Gift,
  flag: Flag,
  gem: Gem,
  sword: Sword,
  flamekindling: FlameKindling,
  'flame-kindling': FlameKindling,
  sun: Sun,
  moon: Moon,
};

function getIcon(iconName: string): React.ElementType {
  return iconMap[iconName.toLowerCase()] || Trophy;
}

interface AchievementData {
  id: number;
  slug: string;
  name: string;
  nameBn: string | null;
  description: string;
  descriptionBn: string | null;
  category: string;
  icon: string;
  xp: number;
  unlocked: boolean;
  unlockedAt: string | null;
}

interface AchievementsResponse {
  achievements: AchievementData[];
  totalXp: number;
  unlockedCount: number;
  totalCount: number;
}

const CATEGORIES = [
  { key: 'learning', label: 'Learning', icon: BookOpen, color: 'from-sky-500 to-blue-600' },
  { key: 'streaks', label: 'Streaks', icon: Flame, color: 'from-orange-500 to-red-500' },
  { key: 'social', label: 'Social', icon: Users, color: 'from-emerald-500 to-teal-600' },
  { key: 'special', label: 'Special', icon: Trophy, color: 'from-amber-500 to-amber-600' },
];

export function AchievementsPage() {
  const [data, setData] = useState<AchievementsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAchievements = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await achievementsApi.list();
      setData(result);
    } catch (err: any) {
      setError(err?.message || 'Failed to load achievements');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAchievements();
  }, [fetchAchievements]);

  const achievements = data?.achievements || [];
  const totalXP = data?.totalXp ?? 0;
  const unlockedCount = data?.unlockedCount ?? 0;
  const totalCount = data?.totalCount ?? 0;

  // Group achievements by category
  const categoryKeys = [...new Set(achievements.map((a) => a.category))];
  const categoryMeta: Record<string, { label: string; icon: React.ElementType; color: string }> = {};
  for (const cat of CATEGORIES) {
    categoryMeta[cat.key] = cat;
  }
  // For any category not in our predefined list, create a fallback
  for (const key of categoryKeys) {
    if (!categoryMeta[key]) {
      categoryMeta[key] = { label: key.charAt(0).toUpperCase() + key.slice(1), icon: Star, color: 'from-slate-500 to-slate-600' };
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
          <Trophy className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold gradient-text">Achievements</h1>
          <p className="text-sm text-muted-foreground">{unlockedCount} of {totalCount} unlocked</p>
        </div>
      </motion.div>

      {/* Loading State */}
      {loading && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin mb-3" />
          <p className="text-sm text-muted-foreground">Loading achievements...</p>
        </motion.div>
      )}

      {/* Error State */}
      {error && !loading && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <GlassCard className="p-5 text-center">
            <p className="text-sm text-red-500 mb-2">{error}</p>
            <button
              className="text-xs font-bold text-amber-500 hover:underline"
              onClick={fetchAchievements}
            >
              Try again
            </button>
          </GlassCard>
        </motion.div>
      )}

      {!loading && !error && (
        <>
          {/* XP and Progress Overview */}
          <GlassCard className="p-5">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <motion.div
                  className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/30"
                  whileHover={{ scale: 1.05, rotate: 5 }}
                >
                  <Zap className="w-8 h-8 text-white" />
                </motion.div>
                <div>
                  <p className="text-3xl font-extrabold gradient-text">{totalXP.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">Total XP Earned</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-foreground">{unlockedCount}<span className="text-muted-foreground text-base">/{totalCount}</span></p>
                <p className="text-xs text-muted-foreground">Achievements Unlocked</p>
              </div>
            </div>
            <div className="mt-4">
              <ProgressBar value={unlockedCount} max={totalCount} size="md" color="bg-gradient-to-r from-amber-500 to-amber-600" showLabel />
            </div>
          </GlassCard>

          {/* Empty State */}
          {achievements.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <GlassCard className="p-8 text-center">
                <Trophy className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm font-semibold text-foreground mb-1">No achievements yet</p>
                <p className="text-xs text-muted-foreground">Start learning to unlock your first achievement!</p>
              </GlassCard>
            </motion.div>
          )}

          {/* Achievement Categories */}
          {categoryKeys.map((catKey, catIndex) => {
            const cat = categoryMeta[catKey];
            const categoryAchievements = achievements.filter((a) => a.category === catKey);
            const catUnlocked = categoryAchievements.filter((a) => a.unlocked).length;

            return (
              <div key={catKey} className="space-y-3">
                <motion.div
                  className="flex items-center gap-2"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: catIndex * 0.1 }}
                >
                  <div className={`w-6 h-6 rounded-lg bg-gradient-to-br ${cat.color} flex items-center justify-center`}>
                    <cat.icon className="w-3 h-3 text-white" />
                  </div>
                  <h2 className="text-sm font-bold uppercase tracking-wider">{cat.label}</h2>
                  <span className="text-xs text-muted-foreground">{catUnlocked}/{categoryAchievements.length}</span>
                </motion.div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {categoryAchievements.map((achievement, i) => {
                    const IconComponent = getIcon(achievement.icon);
                    return (
                      <motion.div
                        key={achievement.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: (catIndex * 4 + i) * 0.05 }}
                      >
                        <GlassCard
                          className={`p-4 ${!achievement.unlocked ? 'opacity-60' : ''}`}
                          hover={achievement.unlocked}
                        >
                          <div className="flex items-start gap-3">
                            <motion.div
                              className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                                achievement.unlocked
                                  ? `bg-gradient-to-br ${cat.color} shadow-lg`
                                  : 'bg-muted/50'
                              }`}
                              whileHover={achievement.unlocked ? { scale: 1.1, rotate: 5 } : undefined}
                            >
                              {achievement.unlocked ? (
                                <IconComponent className="w-5 h-5 text-white" />
                              ) : (
                                <Lock className="w-4 h-4 text-muted-foreground" />
                              )}
                            </motion.div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-sm">{achievement.name}</h3>
                                <span className="text-[10px] font-bold text-amber-500">+{achievement.xp} XP</span>
                              </div>
                              <p className="text-xs text-muted-foreground mt-0.5">{achievement.description}</p>
                              {achievement.unlocked && achievement.unlockedAt && (
                                <span className="text-[10px] font-bold text-emerald-500 mt-1 inline-block">
                                  Unlocked {new Date(achievement.unlockedAt).toLocaleDateString()}
                                </span>
                              )}
                              {achievement.unlocked && !achievement.unlockedAt && (
                                <span className="text-[10px] font-bold text-emerald-500 mt-1 inline-block">Unlocked</span>
                              )}
                            </div>
                          </div>
                        </GlassCard>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
