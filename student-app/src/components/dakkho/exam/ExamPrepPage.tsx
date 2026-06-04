'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  BookOpen, ChevronLeft, Calendar, Clock, Target, TrendingUp,
  Brain, Zap, Award, ChevronRight, Play, CheckCircle,
  BarChart3, Flame, ArrowRight, Sparkles,
} from 'lucide-react';
import { useNavigationStore } from '@/lib/store';
import { GlassCard } from '../shared/GlassCard';
import { GradientButton } from '../shared/GradientButton';

export function ExamPrepPage() {
  const { goBack, navigate } = useNavigationStore();

  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);

  const subjects = [
    { id: 'math', name: 'Mathematics', code: 'MATH-301', icon: '📐', progress: 72, chapters: 12, completed: 9, color: 'from-sky-400 to-blue-600' },
    { id: 'physics', name: 'Physics', code: 'PHYS-201', icon: '⚡', progress: 58, chapters: 10, completed: 6, color: 'from-violet-400 to-violet-600' },
    { id: 'electrical', name: 'Electrical Circuits', code: 'EEE-301', icon: '🔌', progress: 85, chapters: 8, completed: 7, color: 'from-amber-400 to-amber-600' },
    { id: 'programming', name: 'Programming', code: 'CSE-201', icon: '💻', progress: 45, chapters: 15, completed: 7, color: 'from-emerald-400 to-emerald-600' },
    { id: 'drawing', name: 'Engineering Drawing', code: 'CE-101', icon: '✏️', progress: 90, chapters: 6, completed: 5, color: 'from-rose-400 to-rose-600' },
    { id: 'thermo', name: 'Thermodynamics', code: 'ME-301', icon: '🌡️', progress: 33, chapters: 9, completed: 3, color: 'from-orange-400 to-orange-600' },
  ];

  const upcomingExams = [
    { subject: 'Mathematics', date: 'Mar 15, 2025', time: '10:00 AM', room: 'Room 301', daysLeft: 12, syllabus: 'Ch 1-8' },
    { subject: 'Physics', date: 'Mar 20, 2025', time: '2:00 PM', room: 'Room 205', daysLeft: 17, syllabus: 'Ch 1-6' },
    { subject: 'Electrical Circuits', date: 'Mar 25, 2025', time: '10:00 AM', room: 'Lab 102', daysLeft: 22, syllabus: 'Full syllabus' },
  ];

  const studyPlans = [
    { name: 'Quick Review', duration: '3 days', intensity: 'High', icon: Zap, color: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20' },
    { name: 'Balanced Plan', duration: '7 days', intensity: 'Medium', icon: Target, color: 'text-sky-500 bg-sky-50 dark:bg-sky-900/20' },
    { name: 'Deep Dive', duration: '14 days', intensity: 'Low', icon: Brain, color: 'text-violet-500 bg-violet-50 dark:bg-violet-900/20' },
  ];

  const overallProgress = {
    completed: 37,
    total: 60,
    avgScore: 78,
    streak: 5,
  };

  return (
    <div className="pb-20 lg:pb-0">
      {/* Header */}
      <motion.div className="flex items-center gap-3 mb-6" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <motion.button className="w-9 h-9 rounded-xl bg-muted/30 flex items-center justify-center text-foreground" onClick={goBack} whileTap={{ scale: 0.9 }}>
          <ChevronLeft className="w-5 h-5" />
        </motion.button>
        <div>
          <h1 className="text-xl font-extrabold text-foreground">Exam Preparation</h1>
          <p className="text-xs text-muted-foreground">Prepare smarter, score better</p>
        </div>
      </motion.div>

      {/* Progress Overview */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <GlassCard className="p-5 mb-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Completed', value: overallProgress.completed, total: overallProgress.total, icon: CheckCircle, color: 'text-emerald-500' },
              { label: 'Avg Score', value: `${overallProgress.avgScore}%`, total: null, icon: BarChart3, color: 'text-sky-500' },
              { label: 'Day Streak', value: overallProgress.streak, total: null, icon: Flame, color: 'text-amber-500' },
              { label: 'Subjects', value: subjects.length, total: null, icon: BookOpen, color: 'text-violet-500' },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                className="p-3 rounded-xl bg-muted/20 text-center"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 + i * 0.05 }}
              >
                <stat.icon className={`w-5 h-5 ${stat.color} mx-auto mb-1`} />
                <p className="text-lg font-extrabold text-foreground">{stat.value}{stat.total ? `/${stat.total}` : ''}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </GlassCard>
      </motion.div>

      {/* Upcoming Exams */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <GlassCard className="p-5 mb-4">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-4">
            <Calendar className="w-4 h-4 text-sky-500" /> Upcoming Exams
          </h3>
          <div className="space-y-3">
            {upcomingExams.map((exam, i) => (
              <motion.div
                key={exam.subject}
                className="p-3 rounded-xl bg-muted/20 flex items-center gap-3"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + i * 0.05 }}
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0`}>
                  {exam.daysLeft}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground">{exam.subject}</p>
                  <p className="text-xs text-muted-foreground">{exam.date} • {exam.time} • {exam.room}</p>
                  <p className="text-xs text-sky-500 font-semibold">Syllabus: {exam.syllabus}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-xs text-muted-foreground">days left</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                    exam.daysLeft <= 7 ? 'bg-red-50 dark:bg-red-900/20 text-red-500' : exam.daysLeft <= 14 ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-500' : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500'
                  }`}>
                    {exam.daysLeft <= 7 ? 'Urgent' : exam.daysLeft <= 14 ? 'Soon' : 'On Track'}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </GlassCard>
      </motion.div>

      {/* Subjects */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <GlassCard className="p-5 mb-4">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-4">
            <BookOpen className="w-4 h-4 text-sky-500" /> Your Subjects
          </h3>
          <div className="space-y-3">
            {subjects.map((subject, i) => (
              <motion.div
                key={subject.id}
                className={`p-3 rounded-xl cursor-pointer transition-all ${
                  selectedSubject === subject.id ? 'bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800' : 'bg-muted/20 hover:bg-muted/30'
                }`}
                onClick={() => setSelectedSubject(selectedSubject === subject.id ? null : subject.id)}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.04 }}
                whileTap={{ scale: 0.99 }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{subject.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-foreground">{subject.name}</p>
                      <span className="text-xs font-bold text-sky-500">{subject.progress}%</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{subject.code} • {subject.completed}/{subject.chapters} chapters</p>
                    <div className="mt-1.5 h-1.5 rounded-full bg-muted/30 overflow-hidden">
                      <motion.div
                        className={`h-full rounded-full bg-gradient-to-r ${subject.color}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${subject.progress}%` }}
                        transition={{ delay: 0.5 + i * 0.1, duration: 0.6 }}
                      />
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </motion.div>
            ))}
          </div>
        </GlassCard>
      </motion.div>

      {/* Study Plans */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <GlassCard className="p-5">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-sky-500" /> Study Plans
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {studyPlans.map((plan, i) => (
              <motion.div
                key={plan.name}
                className="p-4 rounded-xl bg-muted/20 cursor-pointer hover:bg-muted/30 transition-all"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.25 + i * 0.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <div className={`w-10 h-10 rounded-xl ${plan.color} flex items-center justify-center mb-2`}>
                  <plan.icon className="w-5 h-5" />
                </div>
                <p className="text-sm font-bold text-foreground">{plan.name}</p>
                <p className="text-xs text-muted-foreground">{plan.duration} • {plan.intensity} intensity</p>
                <div className="mt-2 flex items-center gap-1 text-xs text-sky-500 font-semibold">
                  Start Plan <ArrowRight className="w-3 h-3" />
                </div>
              </motion.div>
            ))}
          </div>
          <div className="mt-4">
            <GradientButton size="sm" className="w-full">
              <Play className="w-4 h-4" /> Start Practice Session
            </GradientButton>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
}
