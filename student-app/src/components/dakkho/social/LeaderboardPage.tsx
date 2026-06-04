'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Trophy, ChevronLeft, Crown, Medal, Star, TrendingUp,
  Users, Filter, Zap, Target, BookOpen, ArrowUp, Flame,
  Calendar, Award, Loader2,
} from 'lucide-react';
import { useNavigationStore } from '@/lib/store';
import { GlassCard } from '../shared/GlassCard';
import { leaderboardApi, technologyApi } from '@/lib/api-client';

interface LeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  technology: string;
  xp: number;
  breakdown: { video: number; quiz: number; assignment: number; streak: number };
  activeDays: number;
}

interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  yourRank: number | null;
  yourXp: number;
  period: string;
}

const timePeriods = [
  { id: 'daily', label: 'Today', period: 'day' },
  { id: 'weekly', label: 'This Week', period: 'week' },
  { id: 'monthly', label: 'This Month', period: 'month' },
];

export function LeaderboardPage() {
  const { goBack } = useNavigationStore();

  const [timePeriod, setTimePeriod] = useState('weekly');
  const [department, setDepartment] = useState('All');
  const [departments, setDepartments] = useState<string[]>(['All']);
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const periodParam = timePeriods.find((tp) => tp.id === timePeriod)?.period || 'week';
      const params: { technology?: string; period: string; limit: number } = {
        period: periodParam,
        limit: 20,
      };
      if (department !== 'All') {
        params.technology = department;
      }
      const result = await leaderboardApi.get(params);
      setData(result);
    } catch (err: any) {
      setError(err?.message || 'Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  }, [timePeriod, department]);

  const fetchDepartments = useCallback(async () => {
    try {
      const result = await technologyApi.list();
      const techNames = result.technologies.map((t) => t.name);
      setDepartments(['All', ...techNames]);
    } catch {
      // Keep default "All" if fetch fails
    }
  }, []);

  useEffect(() => {
    fetchDepartments();
  }, [fetchDepartments]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const getBadgeColor = (rank: number) => {
    switch (rank) {
      case 1: return 'from-amber-400 to-yellow-600';
      case 2: return 'from-slate-300 to-slate-500';
      case 3: return 'from-orange-400 to-orange-600';
      default: return 'from-sky-400 to-blue-600';
    }
  };

  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 1: return 'bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border-amber-200 dark:border-amber-800';
      case 2: return 'bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-900/20 dark:to-gray-900/20 border-slate-200 dark:border-slate-700';
      case 3: return 'bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border-orange-200 dark:border-orange-800';
      default: return 'bg-muted/20 border-transparent';
    }
  };

  const entries = data?.entries || [];
  const yourRank = data?.yourRank ?? null;
  const yourXp = data?.yourXp ?? 0;

  // XP Breakdown from top-ranked user's breakdown (or use your own if available)
  // We'll show the user's own breakdown by finding "you" in entries or using a fallback
  const yourEntry = entries.find((e) => e.rank === yourRank);
  const breakdownData = yourEntry?.breakdown
    ? [
        { category: 'Video Watch', xp: yourEntry.breakdown.video, icon: BookOpen, color: 'text-sky-500' },
        { category: 'Quiz Completed', xp: yourEntry.breakdown.quiz, icon: Target, color: 'text-emerald-500' },
        { category: 'Streak Bonus', xp: yourEntry.breakdown.streak, icon: Flame, color: 'text-amber-500' },
        { category: 'Assignments', xp: yourEntry.breakdown.assignment, icon: Award, color: 'text-violet-500' },
      ]
    : null;

  return (
    <div className="pb-20 lg:pb-0">
      {/* Header */}
      <motion.div className="flex items-center gap-3 mb-6" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <motion.button className="w-9 h-9 rounded-xl bg-muted/30 flex items-center justify-center text-foreground" onClick={goBack} whileTap={{ scale: 0.9 }}>
          <ChevronLeft className="w-5 h-5" />
        </motion.button>
        <div>
          <h1 className="text-xl font-extrabold text-foreground">Leaderboard</h1>
          <p className="text-xs text-muted-foreground">Compete and climb the ranks</p>
        </div>
      </motion.div>

      {/* Loading State */}
      {loading && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-sky-500 animate-spin mb-3" />
          <p className="text-sm text-muted-foreground">Loading leaderboard...</p>
        </motion.div>
      )}

      {/* Error State */}
      {error && !loading && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <GlassCard className="p-5 text-center">
            <p className="text-sm text-red-500 mb-2">{error}</p>
            <button
              className="text-xs font-bold text-sky-500 hover:underline"
              onClick={fetchLeaderboard}
            >
              Try again
            </button>
          </GlassCard>
        </motion.div>
      )}

      {!loading && !error && (
        <>
          {/* Top 3 Podium */}
          {entries.length >= 3 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <GlassCard className="p-5 mb-4">
                <div className="flex items-end justify-center gap-3 mb-4">
                  {/* 2nd Place */}
                  <motion.div className="text-center" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-300 to-slate-500 flex items-center justify-center text-white font-bold text-lg mx-auto mb-1 shadow-md">
                      {entries[1].name.charAt(0).toUpperCase()}
                    </div>
                    <Medal className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                    <p className="text-xs font-bold text-foreground">{entries[1].name.split(' ')[0]}</p>
                    <p className="text-[10px] text-muted-foreground">{(entries[1].xp / 1000).toFixed(1)}K XP</p>
                    <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-t-lg mt-2 flex items-center justify-center">
                      <span className="text-lg font-extrabold text-slate-500">2</span>
                    </div>
                  </motion.div>

                  {/* 1st Place */}
                  <motion.div className="text-center" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                    <Crown className="w-6 h-6 text-amber-500 mx-auto mb-1" />
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center text-white font-bold text-xl mx-auto mb-1 shadow-lg">
                      {entries[0].name.charAt(0).toUpperCase()}
                    </div>
                    <p className="text-xs font-bold text-foreground">{entries[0].name.split(' ')[0]}</p>
                    <p className="text-[10px] text-amber-500 font-semibold">{(entries[0].xp / 1000).toFixed(1)}K XP</p>
                    <div className="w-16 h-24 bg-amber-100 dark:bg-amber-900/20 rounded-t-lg mt-2 flex items-center justify-center">
                      <span className="text-2xl font-extrabold text-amber-500">1</span>
                    </div>
                  </motion.div>

                  {/* 3rd Place */}
                  <motion.div className="text-center" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold text-lg mx-auto mb-1 shadow-md">
                      {entries[2].name.charAt(0).toUpperCase()}
                    </div>
                    <Medal className="w-5 h-5 text-orange-400 mx-auto mb-1" />
                    <p className="text-xs font-bold text-foreground">{entries[2].name.split(' ')[0]}</p>
                    <p className="text-[10px] text-muted-foreground">{(entries[2].xp / 1000).toFixed(1)}K XP</p>
                    <div className="w-16 h-12 bg-orange-100 dark:bg-orange-900/20 rounded-t-lg mt-2 flex items-center justify-center">
                      <span className="text-lg font-extrabold text-orange-500">3</span>
                    </div>
                  </motion.div>
                </div>
              </GlassCard>
            </motion.div>
          )}

          {/* Filters */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <GlassCard className="p-4 mb-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2 overflow-x-auto">
                  {timePeriods.map((tp) => (
                    <motion.button
                      key={tp.id}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap ${
                        timePeriod === tp.id ? 'bg-sky-500 text-white' : 'bg-muted/30 text-muted-foreground'
                      }`}
                      onClick={() => setTimePeriod(tp.id)}
                      whileTap={{ scale: 0.95 }}
                    >
                      {tp.label}
                    </motion.button>
                  ))}
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto">
                  <Filter className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                  {departments.map((dept) => (
                    <motion.button
                      key={dept}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap ${
                        department === dept ? 'bg-sky-50 dark:bg-sky-900/20 text-sky-500' : 'bg-muted/20 text-muted-foreground'
                      }`}
                      onClick={() => setDepartment(dept)}
                      whileTap={{ scale: 0.95 }}
                    >
                      {dept}
                    </motion.button>
                  ))}
                </div>
              </div>
            </GlassCard>
          </motion.div>

          {/* Leaderboard List */}
          {entries.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <GlassCard className="p-8 text-center">
                <Trophy className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm font-semibold text-foreground mb-1">No one here yet</p>
                <p className="text-xs text-muted-foreground">Be the first! Start learning to appear on the leaderboard.</p>
              </GlassCard>
            </motion.div>
          ) : (
            <div className="space-y-2">
              {entries.map((user, i) => (
                <motion.div
                  key={user.rank}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 + i * 0.03 }}
                >
                  <GlassCard className={`p-3 border ${getRankStyle(user.rank)}`}>
                    <div className="flex items-center gap-3">
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        user.rank <= 3 ? `bg-gradient-to-br ${getBadgeColor(user.rank)} text-white` : 'bg-muted/30 text-muted-foreground'
                      }`}>
                        {user.rank}
                      </span>
                      <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${getBadgeColor(user.rank)} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-foreground">{user.name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{user.technology}</span>
                          <span>•</span>
                          <span className="flex items-center gap-0.5"><Flame className="w-3 h-3 text-amber-500" />{user.activeDays}</span>
                          <span>•</span>
                          <span>{(user.breakdown.video + user.breakdown.quiz + user.breakdown.assignment + user.breakdown.streak)} XP earned</span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-sky-500">{user.xp >= 1000 ? `${(user.xp / 1000).toFixed(1)}K` : user.xp}</p>
                        <p className="text-[10px] text-muted-foreground">XP</p>
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              ))}
            </div>
          )}

          {/* Your Rank */}
          {yourRank !== null && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
              <GlassCard className="p-3 mt-3 border-2 border-sky-200 dark:border-sky-800">
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full bg-sky-500 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                    {yourRank}
                  </span>
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    Y
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground">You</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Your current rank</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-sky-500">{yourXp.toLocaleString()}</p>
                    <p className="text-[10px] text-muted-foreground">XP</p>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          )}

          {/* XP Breakdown */}
          {breakdownData && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}>
              <GlassCard className="p-5 mt-4">
                <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-3">
                  <Zap className="w-4 h-4 text-sky-500" /> Your XP Breakdown
                </h3>
                <div className="space-y-2">
                  {breakdownData.map((item, i) => (
                    <motion.div
                      key={item.category}
                      className="flex items-center justify-between py-2"
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.6 + i * 0.05 }}
                    >
                      <div className="flex items-center gap-2">
                        <item.icon className={`w-4 h-4 ${item.color}`} />
                        <span className="text-xs font-semibold text-foreground">{item.category}</span>
                      </div>
                      <span className="text-xs font-bold text-foreground">+{item.xp} XP</span>
                    </motion.div>
                  ))}
                </div>
              </GlassCard>
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}
