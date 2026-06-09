'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare, ChevronLeft, Send, Star, Lightbulb,
  Bug, CheckCircle, ThumbsUp, ThumbsDown, Sparkles,
  AlertCircle, AlertTriangle, Loader2, Filter, TrendingUp,
} from 'lucide-react';
import { useNavigationStore } from '@/lib/store';
import { GlassCard } from '../shared/GlassCard';
import { GradientButton } from '../shared/GradientButton';

export function FeedbackPage() {
  const { goBack } = useNavigationStore();

  const [activeTab, setActiveTab] = useState<'feedback' | 'features' | 'bugs'>('feedback');
  const [feedbackType, setFeedbackType] = useState('suggestion');
  const [feedbackText, setFeedbackText] = useState('');
  const [rating, setRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [votedFeatures, setVotedFeatures] = useState<string[]>(['feat-1']);

  const featureRequests = [
    { id: 'feat-1', title: 'Offline video download for mobile', desc: 'Allow downloading course videos for offline viewing on mobile devices', votes: 234, status: 'planned', category: 'Mobile' },
    { id: 'feat-2', title: 'Dark mode scheduling', desc: 'Auto-switch between light and dark mode based on time of day', votes: 156, status: 'under-review', category: 'UI' },
    { id: 'feat-3', title: 'AI-powered study planner', desc: 'Generate personalized study schedules based on exam dates and progress', votes: 189, status: 'planned', category: 'AI' },
    { id: 'feat-4', title: 'Peer code review', desc: 'Allow students to share and review each other\'s programming code', votes: 98, status: 'under-review', category: 'Social' },
    { id: 'feat-5', title: 'Voice notes in discussions', desc: 'Record and share voice messages in course Q&A sections', votes: 67, status: 'considering', category: 'Social' },
  ];

  const bugReports = [
    { id: 'bug-1', title: 'Video progress not saving on Safari', status: 'investigating', priority: 'high', reports: 12 },
    { id: 'bug-2', title: 'Quiz timer continues after submission', status: 'fixing', priority: 'medium', reports: 8 },
    { id: 'bug-3', title: 'Certificate download fails on mobile', status: 'resolved', priority: 'high', reports: 15 },
    { id: 'bug-4', title: 'Search results not updating after filter change', status: 'investigating', priority: 'low', reports: 4 },
  ];

  const statusColors: Record<string, string> = {
    planned: 'bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400',
    'under-review': 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',
    considering: 'bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400',
    investigating: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',
    fixing: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400',
    resolved: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400',
  };

  const priorityColors: Record<string, string> = {
    high: 'bg-red-50 dark:bg-red-900/20 text-red-500',
    medium: 'bg-amber-50 dark:bg-amber-900/20 text-amber-500',
    low: 'bg-sky-50 dark:bg-sky-900/20 text-sky-500',
  };

  const toggleVote = (featureId: string) => {
    setVotedFeatures((prev) =>
      prev.includes(featureId) ? prev.filter((id) => id !== featureId) : [...prev, featureId]
    );
  };

  const handleSubmit = async () => {
    if (!feedbackText.trim()) return;
    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 1500));
    setIsSubmitting(false);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="pb-20 lg:pb-0">
        <motion.div className="flex items-center gap-3 mb-6" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <motion.button className="w-9 h-9 rounded-xl bg-muted/30 flex items-center justify-center text-foreground" onClick={goBack} whileTap={{ scale: 0.9 }}>
            <ChevronLeft className="w-5 h-5" />
          </motion.button>
          <h1 className="text-xl font-extrabold text-foreground">Feedback</h1>
        </motion.div>
        <GlassCard className="p-8 text-center">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 15 }}>
            <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-500" />
            </div>
          </motion.div>
          <h2 className="text-lg font-extrabold text-foreground mb-2">Thank You!</h2>
          <p className="text-sm text-muted-foreground mb-4">Your feedback helps us improve DAKKHO for everyone.</p>
          <GradientButton onClick={() => { setSubmitted(false); setFeedbackText(''); setRating(0); }} size="sm">
            Submit More Feedback
          </GradientButton>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="pb-20 lg:pb-0">
      {/* Header */}
      <motion.div className="flex items-center gap-3 mb-6" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <motion.button className="w-9 h-9 rounded-xl bg-muted/30 flex items-center justify-center text-foreground" onClick={goBack} whileTap={{ scale: 0.9 }}>
          <ChevronLeft className="w-5 h-5" />
        </motion.button>
        <div>
          <h1 className="text-xl font-extrabold text-foreground">Feedback</h1>
          <p className="text-xs text-muted-foreground">Help shape DAKKHO\'s future</p>
        </div>
      </motion.div>

      {/* Tabs */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="mb-4">
        <div className="flex gap-1 bg-muted/30 rounded-lg p-0.5">
          {[
            { id: 'feedback' as const, label: 'Feedback', icon: MessageSquare },
            { id: 'features' as const, label: 'Features', icon: Lightbulb },
            { id: 'bugs' as const, label: 'Bugs', icon: Bug },
          ].map((tab) => (
            <motion.button
              key={tab.id}
              className={`flex-1 px-3 py-2 rounded-md text-xs font-semibold flex items-center justify-center gap-1 ${
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

      {activeTab === 'feedback' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <GlassCard className="p-5 mb-4">
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">Share Your Thoughts</h3>

            <div className="space-y-4">
              {/* Type */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-2">Type</label>
                <div className="flex gap-2">
                  {[
                    { id: 'suggestion', label: 'Suggestion', icon: Lightbulb },
                    { id: 'praise', label: 'Praise', icon: Sparkles },
                    { id: 'complaint', label: 'Complaint', icon: AlertTriangle },
                  ].map((type) => (
                    <motion.button
                      key={type.id}
                      className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 ${
                        feedbackType === type.id ? 'bg-sky-500 text-white' : 'bg-muted/30 text-muted-foreground'
                      }`}
                      onClick={() => setFeedbackType(type.id)}
                      whileTap={{ scale: 0.95 }}
                    >
                      <type.icon className="w-3 h-3" /> {type.label}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Rating */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-2">Overall Rating</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <motion.button
                      key={star}
                      onClick={() => setRating(star)}
                      whileTap={{ scale: 0.9 }}
                      whileHover={{ scale: 1.1 }}
                    >
                      <Star className={`w-7 h-7 ${star <= rating ? 'text-amber-500 fill-amber-500' : 'text-muted-foreground/30'}`} />
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Text */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Your Feedback</label>
                <textarea
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl bg-muted/30 border border-white/30 dark:border-white/10 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/50 resize-none"
                  placeholder="Tell us what you think about DAKKHO..."
                />
              </div>

              <GradientButton onClick={handleSubmit} loading={isSubmitting} className="w-full" size="sm">
                <Send className="w-4 h-4" /> Submit Feedback
              </GradientButton>
            </div>
          </GlassCard>
        </motion.div>
      )}

      {activeTab === 'features' && (
        <div className="space-y-3">
          {featureRequests.map((feature, i) => {
            const isVoted = votedFeatures.includes(feature.id);
            return (
              <motion.div
                key={feature.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <GlassCard className="p-4">
                  <div className="flex items-start gap-3">
                    <motion.button
                      className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl ${
                        isVoted ? 'bg-sky-50 dark:bg-sky-900/20' : 'bg-muted/20'
                      }`}
                      onClick={() => toggleVote(feature.id)}
                      whileTap={{ scale: 0.9 }}
                    >
                      <ThumbsUp className={`w-4 h-4 ${isVoted ? 'text-sky-500' : 'text-muted-foreground'}`} />
                      <span className={`text-xs font-bold ${isVoted ? 'text-sky-500' : 'text-muted-foreground'}`}>
                        {feature.votes + (isVoted ? 1 : 0)}
                      </span>
                    </motion.button>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-sm font-bold text-foreground">{feature.title}</h4>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${statusColors[feature.status]}`}>
                          {feature.status.replace('-', ' ')}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mb-1">{feature.desc}</p>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted/20 text-muted-foreground font-semibold">{feature.category}</span>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            );
          })}
        </div>
      )}

      {activeTab === 'bugs' && (
        <div className="space-y-3">
          {bugReports.map((bug, i) => (
            <motion.div
              key={bug.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <GlassCard className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm font-bold text-foreground">{bug.title}</h4>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${priorityColors[bug.priority]}`}>
                    {bug.priority}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className={`px-2 py-0.5 rounded-full font-bold ${statusColors[bug.status]}`}>{bug.status}</span>
                  <span className="flex items-center gap-1"><Bug className="w-3 h-3" />{bug.reports} reports</span>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
