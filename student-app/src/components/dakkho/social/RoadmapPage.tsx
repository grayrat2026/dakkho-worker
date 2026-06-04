'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Map, ChevronLeft, Rocket, CheckCircle, Clock,
  Star, ThumbsUp, Sparkles, ArrowRight, Calendar,
  Target, Zap, Users, Filter,
} from 'lucide-react';
import { useNavigationStore } from '@/lib/store';
import { GlassCard } from '../shared/GlassCard';

export function RoadmapPage() {
  const { goBack } = useNavigationStore();

  const [activeFilter, setActiveFilter] = useState('all');
  const [votedFeatures, setVotedFeatures] = useState<string[]>(['r-5']);

  const releasedFeatures = [
    {
      id: 'r-1', title: 'Video Streaming Platform', desc: 'Core video playback with adaptive quality streaming',
      date: 'Jan 2025', version: 'v1.0', icon: Rocket, color: 'text-sky-500 bg-sky-50 dark:bg-sky-900/20',
    },
    {
      id: 'r-2', title: 'Course Enrollment System', desc: 'Browse, enroll, and track courses with progress tracking',
      date: 'Jan 2025', version: 'v1.0', icon: Target, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20',
    },
    {
      id: 'r-3', title: 'User Authentication', desc: 'Secure login, signup, OTP verification, and password recovery',
      date: 'Jan 2025', version: 'v1.0', icon: Users, color: 'text-violet-500 bg-violet-50 dark:violet-900/20',
    },
    {
      id: 'r-4', title: 'Content Protection', desc: 'Screenshot blocking, copy protection, and custom context menu',
      date: 'Feb 2025', version: 'v1.1', icon: CheckCircle, color: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20',
    },
  ];

  const upcomingFeatures = [
    {
      id: 'r-5', title: 'AI Study Assistant', desc: 'Get personalized study recommendations and automated quiz generation based on your learning patterns and progress',
      quarter: 'Q2 2025', votes: 342, status: 'In Development', icon: Sparkles, color: 'text-violet-500 bg-violet-50 dark:bg-violet-900/20',
    },
    {
      id: 'r-6', title: 'Live Class Sessions', desc: 'Real-time interactive classes with screen sharing, live chat, and student Q&A. Instructors can conduct live doubt-solving sessions',
      quarter: 'Q2 2025', votes: 289, status: 'In Development', icon: Zap, color: 'text-sky-500 bg-sky-50 dark:bg-sky-900/20',
    },
    {
      id: 'r-7', title: 'Mobile App (Android)', desc: 'Native Android app with offline download support, push notifications, and optimized mobile streaming experience',
      quarter: 'Q3 2025', votes: 256, status: 'Planned', icon: Star, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20',
    },
    {
      id: 'r-8', title: 'Collaborative Notes', desc: 'Real-time collaborative note-taking within courses. Share notes with study groups and annotate video timestamps',
      quarter: 'Q3 2025', votes: 198, status: 'Planned', icon: Users, color: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20',
    },
    {
      id: 'r-9', title: 'Parent Dashboard', desc: 'Allow parents/guardians to monitor student progress, attendance, and performance analytics',
      quarter: 'Q4 2025', votes: 145, status: 'Considering', icon: Target, color: 'text-rose-500 bg-rose-50 dark:bg-rose-900/20',
    },
    {
      id: 'r-10', title: 'Gamification 2.0', desc: 'Enhanced achievement system, daily challenges, XP multipliers, and inter-department competitions',
      quarter: 'Q4 2025', votes: 223, status: 'Planned', icon: Zap, color: 'text-teal-500 bg-teal-50 dark:bg-teal-900/20',
    },
  ];

  const toggleVote = (featureId: string) => {
    setVotedFeatures((prev) =>
      prev.includes(featureId) ? prev.filter((id) => id !== featureId) : [...prev, featureId]
    );
  };

  const statusColors: Record<string, string> = {
    'In Development': 'bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400',
    'Planned': 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',
    'Considering': 'bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400',
  };

  const filteredUpcoming = activeFilter === 'all' ? upcomingFeatures : upcomingFeatures.filter((f) => f.status.toLowerCase().replace(/\s/g, '-') === activeFilter);

  return (
    <div className="pb-20 lg:pb-0">
      {/* Header */}
      <motion.div className="flex items-center gap-3 mb-6" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <motion.button className="w-9 h-9 rounded-xl bg-muted/30 flex items-center justify-center text-foreground" onClick={goBack} whileTap={{ scale: 0.9 }}>
          <ChevronLeft className="w-5 h-5" />
        </motion.button>
        <div>
          <h1 className="text-xl font-extrabold text-foreground">Product Roadmap</h1>
          <p className="text-xs text-muted-foreground">What we are building next</p>
        </div>
      </motion.div>

      {/* Roadmap Overview */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <GlassCard className="p-5 mb-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center shadow-lg">
              <Map className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-foreground">DAKKHO 2025</h2>
              <p className="text-xs text-muted-foreground">Our journey to revolutionize technical education</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20">
              <p className="text-lg font-extrabold text-emerald-500">{releasedFeatures.length}</p>
              <p className="text-xs text-muted-foreground">Released</p>
            </div>
            <div className="text-center p-2 rounded-xl bg-sky-50 dark:bg-sky-900/20">
              <p className="text-lg font-extrabold text-sky-500">{upcomingFeatures.filter((f) => f.status === 'In Development').length}</p>
              <p className="text-xs text-muted-foreground">In Progress</p>
            </div>
            <div className="text-center p-2 rounded-xl bg-amber-50 dark:bg-amber-900/20">
              <p className="text-lg font-extrabold text-amber-500">{upcomingFeatures.filter((f) => f.status !== 'In Development').length}</p>
              <p className="text-xs text-muted-foreground">Planned</p>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Released Features */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <GlassCard className="p-5 mb-4">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-4">
            <CheckCircle className="w-4 h-4 text-emerald-500" /> Released Features
          </h3>
          <div className="space-y-3">
            {releasedFeatures.map((feature, i) => (
              <motion.div
                key={feature.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-muted/20"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + i * 0.04 }}
              >
                <div className={`w-9 h-9 rounded-lg ${feature.color} flex items-center justify-center flex-shrink-0`}>
                  <feature.icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground">{feature.title}</p>
                  <p className="text-xs text-muted-foreground">{feature.desc}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className="text-xs font-bold text-emerald-500">{feature.version}</span>
                  <p className="text-[10px] text-muted-foreground">{feature.date}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </GlassCard>
      </motion.div>

      {/* Upcoming Features */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Clock className="w-4 h-4 text-sky-500" /> Upcoming Features
          </h3>
        </div>

        {/* Filters */}
        <div className="flex gap-1.5 mb-3 overflow-x-auto">
          {[
            { id: 'all', label: 'All' },
            { id: 'in-development', label: 'In Development' },
            { id: 'planned', label: 'Planned' },
            { id: 'considering', label: 'Considering' },
          ].map((f) => (
            <motion.button
              key={f.id}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap ${
                activeFilter === f.id ? 'bg-sky-500 text-white' : 'bg-muted/30 text-muted-foreground'
              }`}
              onClick={() => setActiveFilter(f.id)}
              whileTap={{ scale: 0.95 }}
            >
              {f.label}
            </motion.button>
          ))}
        </div>
      </motion.div>

      <div className="space-y-3">
        {filteredUpcoming.map((feature, i) => {
          const isVoted = votedFeatures.includes(feature.id);
          return (
            <motion.div
              key={feature.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.04 }}
            >
              <GlassCard className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl ${feature.color} flex items-center justify-center flex-shrink-0`}>
                    <feature.icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-bold text-foreground">{feature.title}</h4>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${statusColors[feature.status]}`}>
                        {feature.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed mb-2">{feature.desc}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        <span>{feature.quarter}</span>
                      </div>
                      <motion.button
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold ${
                          isVoted ? 'bg-sky-50 dark:bg-sky-900/20 text-sky-500' : 'bg-muted/30 text-muted-foreground'
                        }`}
                        onClick={() => toggleVote(feature.id)}
                        whileTap={{ scale: 0.95 }}
                      >
                        <ThumbsUp className={`w-3 h-3 ${isVoted ? 'fill-sky-500' : ''}`} />
                        {feature.votes + (isVoted ? 1 : 0)}
                      </motion.button>
                    </div>
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
