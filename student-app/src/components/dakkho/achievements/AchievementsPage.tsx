'use client';

import { motion } from 'framer-motion';
import {
  Trophy, Star, Flame, Users, BookOpen, Target,
  Lock, Zap, Crown, Medal, Award, Coffee, Brain,
  Heart, Rocket, Shield
} from 'lucide-react';
import { GlassCard } from '../shared/GlassCard';
import { ProgressBar } from '../shared/ProgressBar';

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  category: 'learning' | 'streaks' | 'social' | 'special';
  unlocked: boolean;
  xp: number;
  progress?: number;
  progressMax?: number;
}

const MOCK_ACHIEVEMENTS: Achievement[] = [
  // Learning
  { id: 'a1', name: 'First Steps', description: 'Complete your first video lesson', icon: BookOpen, category: 'learning', unlocked: true, xp: 50 },
  { id: 'a2', name: 'Knowledge Seeker', description: 'Complete 10 video lessons', icon: Brain, category: 'learning', unlocked: true, xp: 150, progress: 10, progressMax: 10 },
  { id: 'a3', name: 'Course Completer', description: 'Complete your first full course', icon: Target, category: 'learning', unlocked: true, xp: 300 },
  { id: 'a4', name: 'Scholar', description: 'Complete 5 full courses', icon: Crown, category: 'learning', unlocked: false, xp: 500, progress: 3, progressMax: 5 },
  { id: 'a5', name: 'Polymath', description: 'Complete courses in 4 different categories', icon: Award, category: 'learning', unlocked: false, xp: 750, progress: 2, progressMax: 4 },

  // Streaks
  { id: 'a6', name: 'Getting Warmed Up', description: 'Maintain a 3-day learning streak', icon: Flame, category: 'streaks', unlocked: true, xp: 100 },
  { id: 'a7', name: 'On Fire', description: 'Maintain a 7-day learning streak', icon: Flame, category: 'streaks', unlocked: true, xp: 250 },
  { id: 'a8', name: 'Unstoppable', description: 'Maintain a 30-day learning streak', icon: Rocket, category: 'streaks', unlocked: false, xp: 1000, progress: 14, progressMax: 30 },
  { id: 'a9', name: 'Night Owl', description: 'Study after midnight 5 times', icon: Coffee, category: 'streaks', unlocked: false, xp: 200, progress: 2, progressMax: 5 },

  // Social
  { id: 'a10', name: 'Helpful Hand', description: 'Answer 5 questions in discussion', icon: Users, category: 'social', unlocked: false, xp: 200, progress: 2, progressMax: 5 },
  { id: 'a11', name: 'Community Star', description: 'Get 10 upvotes on your answers', icon: Star, category: 'social', unlocked: false, xp: 300, progress: 4, progressMax: 10 },
  { id: 'a12', name: 'Team Player', description: 'Join 3 live sessions', icon: Heart, category: 'social', unlocked: true, xp: 150 },

  // Special
  { id: 'a13', name: 'Early Adopter', description: 'Join DAKKHO during the first month', icon: Shield, category: 'special', unlocked: true, xp: 100 },
  { id: 'a14', name: 'Certified Pro', description: 'Earn 3 certificates', icon: Medal, category: 'special', unlocked: true, xp: 400 },
  { id: 'a15', name: 'Grand Master', description: 'Earn 10 certificates', icon: Trophy, category: 'special', unlocked: false, xp: 2000, progress: 3, progressMax: 10 },
  { id: 'a16', name: 'Lightning Learner', description: 'Complete a course in under a week', icon: Zap, category: 'special', unlocked: false, xp: 500 },
];

const CATEGORIES = [
  { key: 'learning' as const, label: 'Learning', icon: BookOpen, color: 'from-sky-500 to-blue-600' },
  { key: 'streaks' as const, label: 'Streaks', icon: Flame, color: 'from-orange-500 to-red-500' },
  { key: 'social' as const, label: 'Social', icon: Users, color: 'from-emerald-500 to-teal-600' },
  { key: 'special' as const, label: 'Special', icon: Trophy, color: 'from-amber-500 to-amber-600' },
];

export function AchievementsPage() {
  const totalXP = MOCK_ACHIEVEMENTS.filter((a) => a.unlocked).reduce((sum, a) => sum + a.xp, 0);
  const unlockedCount = MOCK_ACHIEVEMENTS.filter((a) => a.unlocked).length;
  const totalCount = MOCK_ACHIEVEMENTS.length;

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

      {/* Achievement Categories */}
      {CATEGORIES.map((cat, catIndex) => {
        const categoryAchievements = MOCK_ACHIEVEMENTS.filter((a) => a.category === cat.key);
        const catUnlocked = categoryAchievements.filter((a) => a.unlocked).length;

        return (
          <div key={cat.key} className="space-y-3">
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
              {categoryAchievements.map((achievement, i) => (
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
                          <achievement.icon className="w-5 h-5 text-white" />
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
                        {achievement.progress != null && achievement.progressMax != null && !achievement.unlocked && (
                          <div className="mt-2">
                            <ProgressBar
                              value={achievement.progress}
                              max={achievement.progressMax}
                              size="sm"
                              showLabel
                              color={`bg-gradient-to-r ${cat.color}`}
                            />
                          </div>
                        )}
                        {achievement.unlocked && (
                          <span className="text-[10px] font-bold text-emerald-500 mt-1 inline-block">Unlocked</span>
                        )}
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
