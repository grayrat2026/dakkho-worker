'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Plus, ArrowUp, MessageSquare, Filter, X, Send, BookOpen } from 'lucide-react';
import { useState } from 'react';
import { GlassCard } from '../shared/GlassCard';
import { GradientButton } from '../shared/GradientButton';
import { useAuthStore } from '@/lib/store';

interface DiscussionThread {
  id: string;
  title: string;
  author: string;
  authorInitial: string;
  courseName: string;
  replies: number;
  upvotes: number;
  timeAgo: string;
  isAnswered: boolean;
  tags: string[];
}

const MOCK_THREADS: DiscussionThread[] = [
  {
    id: 'dt1',
    title: 'How to handle async/await errors properly in React?',
    author: 'Rahim Ahmed',
    authorInitial: 'R',
    courseName: 'React.js & Next.js',
    replies: 5,
    upvotes: 12,
    timeAgo: '2h ago',
    isAnswered: true,
    tags: ['React', 'Async'],
  },
  {
    id: 'dt2',
    title: 'Kirchhoff voltage law - confusion with sign conventions',
    author: 'Kamal Hossain',
    authorInitial: 'K',
    courseName: 'Electrical Circuit Analysis',
    replies: 3,
    upvotes: 8,
    timeAgo: '5h ago',
    isAnswered: false,
    tags: ['Circuits', 'KVL'],
  },
  {
    id: 'dt3',
    title: 'Best approach for Arduino sensor calibration?',
    author: 'Nusrat Jahan',
    authorInitial: 'N',
    courseName: 'Microcontroller Programming',
    replies: 7,
    upvotes: 15,
    timeAgo: '1d ago',
    isAnswered: true,
    tags: ['Arduino', 'Sensors'],
  },
  {
    id: 'dt4',
    title: 'Python list vs tuple performance differences?',
    author: 'Mizanur Rahman',
    authorInitial: 'M',
    courseName: 'Python Programming',
    replies: 4,
    upvotes: 6,
    timeAgo: '1d ago',
    isAnswered: true,
    tags: ['Python', 'Performance'],
  },
  {
    id: 'dt5',
    title: 'Flutter state management: Provider vs Riverpod?',
    author: 'Sharmin Sultana',
    authorInitial: 'S',
    courseName: 'Flutter Mobile App Development',
    replies: 2,
    upvotes: 9,
    timeAgo: '2d ago',
    isAnswered: false,
    tags: ['Flutter', 'State'],
  },
  {
    id: 'dt6',
    title: 'AutoCAD 3D modeling workflow for mechanical parts',
    author: 'Tanvir Islam',
    authorInitial: 'T',
    courseName: 'Engineering Drawing & AutoCAD',
    replies: 0,
    upvotes: 3,
    timeAgo: '3d ago',
    isAnswered: false,
    tags: ['AutoCAD', '3D'],
  },
  {
    id: 'dt7',
    title: 'Understanding flip-flop timing diagrams',
    author: 'Farhana Akter',
    authorInitial: 'F',
    courseName: 'Digital Electronics',
    replies: 6,
    upvotes: 11,
    timeAgo: '3d ago',
    isAnswered: true,
    tags: ['Digital', 'Flip-Flop'],
  },
  {
    id: 'dt8',
    title: 'How to deploy Next.js app to Vercel with environment variables?',
    author: 'Arif Mahmud',
    authorInitial: 'A',
    courseName: 'React.js & Next.js',
    replies: 1,
    upvotes: 4,
    timeAgo: '4d ago',
    isAnswered: false,
    tags: ['Next.js', 'Deployment'],
  },
];

type FilterType = 'all' | 'my-questions' | 'unanswered';

const COURSE_OPTIONS = [
  'React.js & Next.js',
  'Electrical Circuit Analysis',
  'Microcontroller Programming',
  'Python Programming',
  'Flutter Mobile App Development',
  'Engineering Drawing & AutoCAD',
  'Digital Electronics',
];

export function DiscussionPage() {
  const user = useAuthStore((s) => s.user);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [upvotedThreads, setUpvotedThreads] = useState<Set<string>>(new Set());
  const [showAskModal, setShowAskModal] = useState(false);

  // Ask Question form state
  const [questionTitle, setQuestionTitle] = useState('');
  const [questionBody, setQuestionBody] = useState('');
  const [questionCourse, setQuestionCourse] = useState('');
  const [questionTags, setQuestionTags] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleUpvote = (id: string) => {
    setUpvotedThreads((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleAskQuestion = async () => {
    if (!questionTitle.trim() || !questionBody.trim()) return;
    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 1200));
    setIsSubmitting(false);
    setSubmitted(true);
    setTimeout(() => {
      setShowAskModal(false);
      setSubmitted(false);
      setQuestionTitle('');
      setQuestionBody('');
      setQuestionCourse('');
      setQuestionTags('');
    }, 1500);
  };

  const filteredThreads = MOCK_THREADS.filter((thread) => {
    if (activeFilter === 'unanswered') return !thread.isAnswered;
    if (activeFilter === 'my-questions') return thread.author === 'Rahim Ahmed';
    return true;
  });

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'my-questions', label: 'My Questions' },
    { key: 'unanswered', label: 'Unanswered' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
            <MessageCircle className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold gradient-text">Discussion</h1>
            <p className="text-sm text-muted-foreground">{MOCK_THREADS.length} threads</p>
          </div>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex items-center gap-2 flex-wrap"
      >
        <Filter className="w-4 h-4 text-muted-foreground" />
        {filters.map((filter) => (
          <motion.button
            key={filter.key}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeFilter === filter.key
                ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400'
                : 'bg-muted/50 text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setActiveFilter(filter.key)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {filter.label}
          </motion.button>
        ))}
      </motion.div>

      {/* Thread List */}
      <div className="space-y-3">
        {filteredThreads.map((thread, i) => (
          <motion.div
            key={thread.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <GlassCard hover className="p-4">
              <div className="flex items-start gap-3">
                {/* Upvote column */}
                <div className="flex flex-col items-center gap-1 flex-shrink-0">
                  <motion.button
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                      upvotedThreads.has(thread.id)
                        ? 'bg-sky-500/10 text-sky-500'
                        : 'bg-muted/50 text-muted-foreground hover:text-sky-500'
                    }`}
                    onClick={() => handleUpvote(thread.id)}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <ArrowUp className={`w-4 h-4 ${upvotedThreads.has(thread.id) ? 'fill-current' : ''}`} />
                  </motion.button>
                  <span className="text-xs font-bold text-muted-foreground">
                    {thread.upvotes + (upvotedThreads.has(thread.id) ? 1 : 0)}
                  </span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2">
                    <h3 className="font-semibold text-sm text-foreground flex-1">{thread.title}</h3>
                    {thread.isAnswered && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                        Answered
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {thread.tags.map((tag) => (
                      <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-muted/50 text-muted-foreground">
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <div className="w-4 h-4 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-[8px] text-white font-bold">
                        {thread.authorInitial}
                      </div>
                      <span>{thread.author}</span>
                    </div>
                    <span className="text-muted-foreground/30">|</span>
                    <span>{thread.courseName}</span>
                    <span className="text-muted-foreground/30">|</span>
                    <span className="flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" />
                      {thread.replies}
                    </span>
                    <span>{thread.timeAgo}</span>
                  </div>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        ))}

        {filteredThreads.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-12"
          >
            <MessageCircle className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No threads found for this filter.</p>
          </motion.div>
        )}
      </div>

      {/* Floating Ask Question Button — positioned above bottom nav on mobile */}
      <motion.div
        className="fixed bottom-24 lg:bottom-6 right-4 lg:right-6 z-40"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, delay: 0.3 }}
      >
        <GradientButton
          size="lg"
          className="rounded-full shadow-2xl shadow-sky-500/30"
          onClick={() => setShowAskModal(true)}
        >
          <Plus className="w-5 h-5" />
          <span className="hidden sm:inline">Ask Question</span>
        </GradientButton>
      </motion.div>

      {/* Ask Question Modal */}
      <AnimatePresence>
        {showAskModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !isSubmitting && setShowAskModal(false)}
          >
            <motion.div
              className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              {!submitted ? (
                <>
                  {/* Modal Header */}
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center">
                        <MessageCircle className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h2 className="text-lg font-extrabold text-foreground">Ask a Question</h2>
                        <p className="text-xs text-muted-foreground">Get help from the community</p>
                      </div>
                    </div>
                    <motion.button
                      className="w-9 h-9 rounded-xl bg-muted/30 flex items-center justify-center text-foreground"
                      onClick={() => setShowAskModal(false)}
                      whileTap={{ scale: 0.9 }}
                      disabled={isSubmitting}
                    >
                      <X className="w-5 h-5" />
                    </motion.button>
                  </div>

                  {/* Form */}
                  <div className="space-y-4">
                    {/* Title */}
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                        Question Title <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={questionTitle}
                        onChange={(e) => setQuestionTitle(e.target.value)}
                        placeholder="e.g., How to handle async errors in React?"
                        className="w-full px-4 py-3 rounded-xl bg-muted/30 border border-white/30 dark:border-white/10 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                        maxLength={150}
                      />
                      <p className="text-[10px] text-muted-foreground mt-1">{questionTitle.length}/150 characters</p>
                    </div>

                    {/* Course */}
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                        Related Course
                      </label>
                      <div className="relative">
                        <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <select
                          value={questionCourse}
                          onChange={(e) => setQuestionCourse(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 rounded-xl bg-muted/30 border border-white/30 dark:border-white/10 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/50 appearance-none"
                        >
                          <option value="">Select a course (optional)</option>
                          {COURSE_OPTIONS.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Body */}
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                        Details <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={questionBody}
                        onChange={(e) => setQuestionBody(e.target.value)}
                        placeholder="Describe your question in detail. Include code snippets, error messages, or screenshots if relevant..."
                        rows={5}
                        className="w-full px-4 py-3 rounded-xl bg-muted/30 border border-white/30 dark:border-white/10 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/50 resize-none"
                        maxLength={2000}
                      />
                      <p className="text-[10px] text-muted-foreground mt-1">{questionBody.length}/2000 characters</p>
                    </div>

                    {/* Tags */}
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                        Tags
                      </label>
                      <input
                        type="text"
                        value={questionTags}
                        onChange={(e) => setQuestionTags(e.target.value)}
                        placeholder="e.g., React, Async, Hooks (comma separated)"
                        className="w-full px-4 py-3 rounded-xl bg-muted/30 border border-white/30 dark:border-white/10 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                      />
                    </div>
                  </div>

                  {/* Submit */}
                  <div className="flex gap-3 mt-5">
                    <motion.button
                      className="flex-1 px-4 py-3 rounded-xl bg-muted/30 text-sm font-semibold text-foreground"
                      onClick={() => setShowAskModal(false)}
                      whileTap={{ scale: 0.95 }}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </motion.button>
                    <GradientButton
                      onClick={handleAskQuestion}
                      loading={isSubmitting}
                      disabled={!questionTitle.trim() || !questionBody.trim()}
                      className="flex-1"
                    >
                      <Send className="w-4 h-4" /> Post Question
                    </GradientButton>
                  </div>
                </>
              ) : (
                /* Success State */
                <div className="text-center py-8">
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.2 }}>
                    <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mx-auto mb-4">
                      <MessageCircle className="w-8 h-8 text-emerald-500" />
                    </div>
                  </motion.div>
                  <h3 className="text-lg font-extrabold text-foreground mb-2">Question Posted!</h3>
                  <p className="text-sm text-muted-foreground">Your question has been submitted to the community. You will be notified when someone answers.</p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
