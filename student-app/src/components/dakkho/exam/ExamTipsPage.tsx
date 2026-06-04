'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Lightbulb, ChevronLeft, Clock, Brain, BookOpen,
  Target, Zap, Award, AlertTriangle, CheckCircle,
  Coffee, Moon, Sunrise, Calendar, ArrowRight,
  Sparkles, Timer, BookMarked, PenTool,
} from 'lucide-react';
import { useNavigationStore } from '@/lib/store';
import { GlassCard } from '../shared/GlassCard';

export function ExamTipsPage() {
  const { goBack } = useNavigationStore();
  const [activeTab, setActiveTab] = useState('strategies');

  const tabs = [
    { id: 'strategies', label: 'Strategies', icon: Brain },
    { id: 'time', label: 'Time Mgmt', icon: Clock },
    { id: 'mistakes', label: 'Mistakes', icon: AlertTriangle },
    { id: 'wellness', label: 'Wellness', icon: Coffee },
  ];

  const strategies = [
    {
      title: 'Active Recall Method',
      description: 'Instead of re-reading notes, close your book and try to recall the key concepts from memory. This strengthens neural connections and improves long-term retention.',
      icon: Brain,
      color: 'text-violet-500 bg-violet-50 dark:bg-violet-900/20',
      tip: 'Try this: After each chapter, write down everything you remember without looking. Then check what you missed.',
    },
    {
      title: 'Spaced Repetition',
      description: 'Review material at increasing intervals (1 day, 3 days, 7 days, 14 days). This technique leverages the spacing effect for optimal memory retention.',
      icon: Calendar,
      color: 'text-sky-500 bg-sky-50 dark:bg-sky-900/20',
      tip: 'Use DAKKHO\'s built-in review reminders to schedule your spaced repetition sessions automatically.',
    },
    {
      title: 'Pomodoro Technique',
      description: 'Study in focused 25-minute blocks followed by 5-minute breaks. After 4 blocks, take a longer 15-30 minute break. This maintains concentration and prevents burnout.',
      icon: Timer,
      color: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20',
      tip: 'Set a timer on your phone. During the 25 minutes, eliminate all distractions — no phone, no social media.',
    },
    {
      title: 'Feynman Technique',
      description: 'Explain the concept in simple terms as if teaching someone else. If you can\'t explain it simply, you don\'t understand it well enough. Identify gaps and go back to study those areas.',
      icon: Lightbulb,
      color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20',
      tip: 'Try recording yourself explaining a topic. Listen back and notice where you hesitate or get confused.',
    },
    {
      title: 'Mind Mapping',
      description: 'Create visual diagrams that connect related concepts. Start with a central topic and branch out with key terms, formulas, and relationships. This helps see the big picture.',
      icon: Sparkles,
      color: 'text-rose-500 bg-rose-50 dark:bg-rose-900/20',
      tip: 'Use different colors for different branches. Keep it concise — keywords only, not full sentences.',
    },
    {
      title: 'Practice Testing',
      description: 'Take practice exams under realistic conditions. This not only tests your knowledge but also reduces exam anxiety by making the actual exam feel familiar.',
      icon: PenTool,
      color: 'text-teal-500 bg-teal-50 dark:bg-teal-900/20',
      tip: 'Use DAKKHO\'s Practice Mode with timed sessions. Aim to complete practice tests faster than the actual time limit.',
    },
  ];

  const timeManagementTips = [
    { title: 'Create a Study Schedule', desc: 'Plan your study sessions at least 2 weeks before the exam. Allocate more time to difficult subjects and less to ones you are confident about.', priority: 'High' },
    { title: 'Use the 80/20 Rule', desc: 'Focus 80% of your time on the 20% of topics that are most likely to appear on the exam. Analyze past papers to identify patterns.', priority: 'High' },
    { title: 'Set Daily Goals', desc: 'Break down your syllabus into daily chunks. Complete each day\'s target before moving on. Use a checklist to track progress.', priority: 'Medium' },
    { title: 'Prioritize Weak Areas', desc: 'Start study sessions with your weakest topics when your mind is fresh. Review stronger subjects later or during shorter sessions.', priority: 'High' },
    { title: 'Avoid Multitasking', desc: 'Focus on one subject at a time. Switching between subjects reduces efficiency. Complete a topic fully before moving to the next.', priority: 'Medium' },
    { title: 'Review Before Sleep', desc: 'Study the most important material right before going to sleep. Your brain consolidates memories during sleep, improving retention.', priority: 'Low' },
  ];

  const commonMistakes = [
    { mistake: 'Cramming the night before', consequence: 'Information overload leads to confusion and anxiety. You may forget previously well-learned material.', fix: 'Start early and review regularly using spaced repetition.' },
    { mistake: 'Skipping practice problems', consequence: 'Understanding theory is not enough. Without practice, you may struggle to apply concepts under time pressure.', fix: 'Solve at least 10 practice problems for each topic.' },
    { mistake: 'Not reading questions carefully', consequence: 'Misunderstanding a question can cost you marks even when you know the answer.', fix: 'Read each question twice. Underline key terms and identify what is being asked.' },
    { mistake: 'Ignoring the syllabus', consequence: 'Studying irrelevant topics wastes time and leaves gaps in essential areas.', fix: 'Download the official syllabus and check off topics as you study them.' },
    { mistake: 'Not managing exam time', consequence: 'Spending too long on difficult questions means easier questions go unanswered.', fix: 'Allocate time per question. Skip difficult ones and return to them later.' },
    { mistake: 'Neglecting physical health', consequence: 'Poor sleep, nutrition, and exercise reduce cognitive performance significantly.', fix: 'Get 7-8 hours of sleep, eat balanced meals, and take short walks between study sessions.' },
  ];

  const wellnessTips = [
    { title: 'Sleep Well', desc: 'Aim for 7-8 hours of quality sleep. Avoid screens 30 minutes before bed. A well-rested brain retains information better.', icon: Moon, time: 'Night' },
    { title: 'Morning Routine', desc: 'Start the day with light exercise and a nutritious breakfast. Your brain needs fuel to function optimally during study sessions.', icon: Sunrise, time: 'Morning' },
    { title: 'Stay Hydrated', desc: 'Drink at least 8 glasses of water daily. Dehydration can impair concentration and memory by up to 30%.', icon: Coffee, time: 'All Day' },
    { title: 'Take Regular Breaks', desc: 'Follow the 50/10 rule: 50 minutes of study, 10 minutes of break. Get up, stretch, or take a short walk during breaks.', icon: Zap, time: 'Study Time' },
    { title: 'Practice Mindfulness', desc: '5 minutes of deep breathing or meditation before studying can significantly improve focus and reduce anxiety.', icon: Brain, time: 'Before Study' },
    { title: 'Eat Brain Food', desc: 'Include nuts, fish, fruits, and vegetables in your diet. Avoid excessive sugar and caffeine which cause energy crashes.', icon: Coffee, time: 'Meals' },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'strategies':
        return (
          <div className="space-y-3">
            {strategies.map((strategy, i) => (
              <motion.div
                key={strategy.title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <GlassCard className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl ${strategy.color} flex items-center justify-center flex-shrink-0`}>
                      <strategy.icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-bold text-foreground mb-1">{strategy.title}</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed mb-2">{strategy.description}</p>
                      <div className="p-2 rounded-lg bg-sky-50 dark:bg-sky-900/20 flex items-start gap-2">
                        <Lightbulb className="w-3 h-3 text-sky-500 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-sky-700 dark:text-sky-300">{strategy.tip}</p>
                      </div>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        );

      case 'time':
        return (
          <div className="space-y-3">
            {timeManagementTips.map((tip, i) => (
              <motion.div
                key={tip.title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <GlassCard className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-sky-50 dark:bg-sky-900/20 flex items-center justify-center text-sm font-bold text-sky-500 flex-shrink-0">
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-sm font-bold text-foreground">{tip.title}</h4>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          tip.priority === 'High' ? 'bg-red-50 dark:bg-red-900/20 text-red-500' :
                          tip.priority === 'Medium' ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-500' :
                          'bg-sky-50 dark:bg-sky-900/20 text-sky-500'
                        }`}>{tip.priority}</span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{tip.desc}</p>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        );

      case 'mistakes':
        return (
          <div className="space-y-3">
            {commonMistakes.map((item, i) => (
              <motion.div
                key={item.mistake}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <GlassCard className="p-4">
                  <div className="flex items-start gap-3 mb-2">
                    <div className="w-8 h-8 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center flex-shrink-0">
                      <AlertTriangle className="w-4 h-4 text-red-500" />
                    </div>
                    <h4 className="text-sm font-bold text-foreground">{item.mistake}</h4>
                  </div>
                  <div className="ml-11 space-y-2">
                    <div className="p-2 rounded-lg bg-red-50/50 dark:bg-red-900/10">
                      <p className="text-xs text-red-600 dark:text-red-400"><span className="font-bold">Impact:</span> {item.consequence}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-emerald-50/50 dark:bg-emerald-900/10">
                      <p className="text-xs text-emerald-600 dark:text-emerald-400"><span className="font-bold">Fix:</span> {item.fix}</p>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        );

      case 'wellness':
        return (
          <div className="space-y-3">
            {wellnessTips.map((tip, i) => (
              <motion.div
                key={tip.title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <GlassCard className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center flex-shrink-0">
                      <tip.icon className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-sm font-bold text-foreground">{tip.title}</h4>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-900/20 text-sky-500 font-bold">{tip.time}</span>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{tip.desc}</p>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        );
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
          <h1 className="text-xl font-extrabold text-foreground">Exam Tips</h1>
          <p className="text-xs text-muted-foreground">Study smarter, not harder</p>
        </div>
      </motion.div>

      {/* Quick Tips Banner */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <GlassCard className="p-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center flex-shrink-0">
              <Lightbulb className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Pro Tip of the Day</p>
              <p className="text-xs text-muted-foreground">Teach a concept to a friend — if they understand it, you truly know it!</p>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Tab Selector */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="mb-4">
        <div className="flex gap-1 bg-muted/30 rounded-lg p-0.5 overflow-x-auto">
          {tabs.map((tab) => (
            <motion.button
              key={tab.id}
              className={`flex-1 px-3 py-2 rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap ${
                activeTab === tab.id ? 'bg-white dark:bg-slate-700 shadow-sm text-foreground' : 'text-muted-foreground'
              }`}
              onClick={() => setActiveTab(tab.id)}
              whileTap={{ scale: 0.95 }}
            >
              <tab.icon className="w-3 h-3" /> {tab.label}
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Content */}
      {renderContent()}
    </div>
  );
}
