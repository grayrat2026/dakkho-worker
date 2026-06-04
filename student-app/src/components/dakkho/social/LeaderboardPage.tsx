'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Trophy, ChevronLeft, Crown, Medal, Star, TrendingUp,
  Users, Filter, Zap, Target, BookOpen, ArrowUp, Flame,
  Calendar, Award,
} from 'lucide-react';
import { useNavigationStore } from '@/lib/store';
import { GlassCard } from '../shared/GlassCard';

export function LeaderboardPage() {
  const { goBack } = useNavigationStore();

  const [timePeriod, setTimePeriod] = useState('weekly');
  const [department, setDepartment] = useState('All');

  const leaderboardData = [
    { rank: 1, name: 'Ayesha Khan', dept: 'CSE', xp: 12450, streak: 32, courses: 18, avatar: 'A', badge: 'gold' },
    { rank: 2, name: 'Rafiq Islam', dept: 'EEE', xp: 11200, streak: 28, courses: 15, avatar: 'R', badge: 'gold' },
    { rank: 3, name: 'Nusrat Jahan', dept: 'CSE', xp: 10890, streak: 25, courses: 14, avatar: 'N', badge: 'gold' },
    { rank: 4, name: 'Tanvir Ahmed', dept: 'ME', xp: 9750, streak: 21, courses: 12, avatar: 'T', badge: 'silver' },
    { rank: 5, name: 'Sadia Rahman', dept: 'CE', xp: 9200, streak: 19, courses: 11, avatar: 'S', badge: 'silver' },
    { rank: 6, name: 'Imran Hossain', dept: 'CSE', xp: 8900, streak: 18, courses: 13, avatar: 'I', badge: 'silver' },
    { rank: 7, name: 'Farzana Akter', dept: 'ETE', xp: 8500, streak: 17, courses: 10, avatar: 'F', badge: 'bronze' },
    { rank: 8, name: 'Mahmud Hasan', dept: 'EEE', xp: 8100, streak: 15, courses: 9, avatar: 'M', badge: 'bronze' },
    { rank: 9, name: 'Rahim Ahmed', dept: 'CSE', xp: 7800, streak: 14, courses: 10, avatar: 'R', badge: 'bronze' },
    { rank: 10, name: 'Kamal Uddin', dept: 'ME', xp: 7400, streak: 12, courses: 8, avatar: 'K', badge: 'bronze' },
  ];

  const yourRank = { rank: 42, name: 'You', dept: 'CSE', xp: 4250, streak: 5, courses: 6 };

  const departments = ['All', 'CSE', 'EEE', 'ME', 'CE', 'ETE', 'Architecture', 'Chemical'];
  const timePeriods = [
    { id: 'daily', label: 'Today' },
    { id: 'weekly', label: 'This Week' },
    { id: 'monthly', label: 'This Month' },
  ];

  const xpBreakdown = [
    { category: 'Video Watch', xp: 1850, icon: BookOpen, color: 'text-sky-500' },
    { category: 'Quiz Completed', xp: 1200, icon: Target, color: 'text-emerald-500' },
    { category: 'Streak Bonus', xp: 750, icon: Flame, color: 'text-amber-500' },
    { category: 'Assignments', xp: 450, icon: Award, color: 'text-violet-500' },
  ];

  const getBadgeColor = (badge: string) => {
    switch (badge) {
      case 'gold': return 'from-amber-400 to-yellow-600';
      case 'silver': return 'from-slate-300 to-slate-500';
      case 'bronze': return 'from-orange-400 to-orange-600';
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

      {/* Top 3 Podium */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <GlassCard className="p-5 mb-4">
          <div className="flex items-end justify-center gap-3 mb-4">
            {/* 2nd Place */}
            <motion.div className="text-center" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-slate-300 to-slate-500 flex items-center justify-center text-white font-bold text-lg mx-auto mb-1 shadow-md">
                {leaderboardData[1].avatar}
              </div>
              <Medal className="w-5 h-5 text-slate-400 mx-auto mb-1" />
              <p className="text-xs font-bold text-foreground">{leaderboardData[1].name.split(' ')[0]}</p>
              <p className="text-[10px] text-muted-foreground">{(leaderboardData[1].xp / 1000).toFixed(1)}K XP</p>
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-t-lg mt-2 flex items-center justify-center">
                <span className="text-lg font-extrabold text-slate-500">2</span>
              </div>
            </motion.div>

            {/* 1st Place */}
            <motion.div className="text-center" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Crown className="w-6 h-6 text-amber-500 mx-auto mb-1" />
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center text-white font-bold text-xl mx-auto mb-1 shadow-lg">
                {leaderboardData[0].avatar}
              </div>
              <p className="text-xs font-bold text-foreground">{leaderboardData[0].name.split(' ')[0]}</p>
              <p className="text-[10px] text-amber-500 font-semibold">{(leaderboardData[0].xp / 1000).toFixed(1)}K XP</p>
              <div className="w-16 h-24 bg-amber-100 dark:bg-amber-900/20 rounded-t-lg mt-2 flex items-center justify-center">
                <span className="text-2xl font-extrabold text-amber-500">1</span>
              </div>
            </motion.div>

            {/* 3rd Place */}
            <motion.div className="text-center" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold text-lg mx-auto mb-1 shadow-md">
                {leaderboardData[2].avatar}
              </div>
              <Medal className="w-5 h-5 text-orange-400 mx-auto mb-1" />
              <p className="text-xs font-bold text-foreground">{leaderboardData[2].name.split(' ')[0]}</p>
              <p className="text-[10px] text-muted-foreground">{(leaderboardData[2].xp / 1000).toFixed(1)}K XP</p>
              <div className="w-16 h-12 bg-orange-100 dark:bg-orange-900/20 rounded-t-lg mt-2 flex items-center justify-center">
                <span className="text-lg font-extrabold text-orange-500">3</span>
              </div>
            </motion.div>
          </div>
        </GlassCard>
      </motion.div>

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
      <div className="space-y-2">
        {leaderboardData.map((user, i) => (
          <motion.div
            key={user.rank}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 + i * 0.03 }}
          >
            <GlassCard className={`p-3 border ${getRankStyle(user.rank)}`}>
              <div className="flex items-center gap-3">
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  user.rank <= 3 ? `bg-gradient-to-br ${getBadgeColor(user.badge)} text-white` : 'bg-muted/30 text-muted-foreground'
                }`}>
                  {user.rank}
                </span>
                <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${getBadgeColor(user.badge)} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
                  {user.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground">{user.name}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{user.dept}</span>
                    <span>•</span>
                    <span className="flex items-center gap-0.5"><Flame className="w-3 h-3 text-amber-500" />{user.streak}</span>
                    <span>•</span>
                    <span>{user.courses} courses</span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-sky-500">{(user.xp / 1000).toFixed(1)}K</p>
                  <p className="text-[10px] text-muted-foreground">XP</p>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {/* Your Rank */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
        <GlassCard className="p-3 mt-3 border-2 border-sky-200 dark:border-sky-800">
          <div className="flex items-center gap-3">
            <span className="w-7 h-7 rounded-full bg-sky-500 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
              {yourRank.rank}
            </span>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              Y
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground">{yourRank.name}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{yourRank.dept}</span>
                <span>•</span>
                <span className="flex items-center gap-0.5"><Flame className="w-3 h-3 text-amber-500" />{yourRank.streak}</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-sky-500">{yourRank.xp.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground">XP</p>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* XP Breakdown */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}>
        <GlassCard className="p-5 mt-4">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-3">
            <Zap className="w-4 h-4 text-sky-500" /> Your XP Breakdown
          </h3>
          <div className="space-y-2">
            {xpBreakdown.map((item, i) => (
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
    </div>
  );
}
