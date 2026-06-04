'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare, ChevronLeft, Send, Search, ThumbsUp,
  User, Filter, Clock, CheckCircle2, HelpCircle, MessageCircle,
} from 'lucide-react';
import { useNavigationStore } from '@/lib/store';
import { getCourse, getInstructor } from '@/lib/mock-data';
import { GlassCard } from '../shared/GlassCard';
import { AnimatedPage } from '../shared/AnimatedPage';
import { GradientButton } from '../shared/GradientButton';

interface QAItem {
  id: string;
  question: string;
  askedBy: string;
  askedAt: string;
  answers: { text: string; answeredBy: string; answeredAt: string; isInstructor: boolean }[];
  upvotes: number;
  isAnswered: boolean;
}

const MOCK_QA: QAItem[] = [
  {
    id: 'q1',
    question: 'How do I set up the development environment for this course? I am having trouble with the installation steps on Windows.',
    askedBy: 'Arif Rahman',
    askedAt: '2 days ago',
    answers: [
      { text: 'You can follow the setup guide in Section 1, Lecture 2. For Windows, make sure to download the correct version and set your PATH variables properly. If you still face issues, share the error message here.', answeredBy: 'Engr. Karim Uddin', answeredAt: '1 day ago', isInstructor: true },
      { text: 'I had the same issue. Try running the installer as Administrator and make sure no other version is already installed.', answeredBy: 'Sadia Khatun', answeredAt: '1 day ago', isInstructor: false },
    ],
    upvotes: 15,
    isAnswered: true,
  },
  {
    id: 'q2',
    question: 'Is this course sufficient for BTEB exam preparation, or should I study additional materials?',
    askedBy: 'Tanvir Hasan',
    askedAt: '5 days ago',
    answers: [
      { text: 'This course covers the complete BTEB syllabus for this subject. However, I recommend practicing previous year questions as well for better preparation.', answeredBy: 'Engr. Karim Uddin', answeredAt: '4 days ago', isInstructor: true },
    ],
    upvotes: 23,
    isAnswered: true,
  },
  {
    id: 'q3',
    question: 'Can you explain the difference between pass-by-value and pass-by-reference with a practical example?',
    askedBy: 'Nusrat Jahan',
    askedAt: '1 week ago',
    answers: [
      { text: 'In pass-by-value, a copy of the variable is passed to the function, so changes inside the function do not affect the original variable. In pass-by-reference, the actual memory address is passed, so changes affect the original. I will add a detailed example in the next lecture update.', answeredBy: 'Engr. Karim Uddin', answeredAt: '6 days ago', isInstructor: true },
    ],
    upvotes: 31,
    isAnswered: true,
  },
  {
    id: 'q4',
    question: 'When will the advanced topics section be available? The course shows it as coming soon.',
    askedBy: 'Imran Hossain',
    askedAt: '2 weeks ago',
    answers: [],
    upvotes: 8,
    isAnswered: false,
  },
  {
    id: 'q5',
    question: 'What are the prerequisites for this course? Can a complete beginner start directly?',
    askedBy: 'Farzana Akter',
    askedAt: '2 weeks ago',
    answers: [
      { text: 'No prerequisites needed! This course starts from absolute basics and gradually builds up. Just bring your curiosity and willingness to learn.', answeredBy: 'Engr. Karim Uddin', answeredAt: '2 weeks ago', isInstructor: true },
    ],
    upvotes: 19,
    isAnswered: true,
  },
];

export function CourseQAPage() {
  const { pageParams, navigate, goBack } = useNavigationStore();
  const courseId = pageParams.courseId as string;
  const course = getCourse(courseId);
  const instructor = course ? getInstructor(course.instructorId) : undefined;

  const [searchQuery, setSearchQuery] = useState('');
  const [filterAnswered, setFilterAnswered] = useState<'all' | 'answered' | 'unanswered'>('all');
  const [questionText, setQuestionText] = useState('');
  const [showAskForm, setShowAskForm] = useState(false);
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set(['q1']));

  if (!course) {
    return (
      <AnimatedPage>
        <div className="text-center py-16">
          <p className="text-lg font-bold">Course not found</p>
          <GradientButton onClick={goBack} className="mt-4">Go Back</GradientButton>
        </div>
      </AnimatedPage>
    );
  }

  const filteredQA = MOCK_QA
    .filter((q) => {
      if (filterAnswered === 'answered' && !q.isAnswered) return false;
      if (filterAnswered === 'unanswered' && q.isAnswered) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return q.question.toLowerCase().includes(query) || q.answers.some((a) => a.text.toLowerCase().includes(query));
      }
      return true;
    })
    .sort((a, b) => b.upvotes - a.upvotes);

  const toggleExpand = (id: string) => {
    setExpandedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <AnimatedPage keyProp={`course-qa-${courseId}`}>
      <div className="pb-20 lg:pb-0">
        {/* Breadcrumb */}
        <motion.div
          className="flex items-center gap-2 text-sm text-muted-foreground mb-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <button onClick={() => navigate('home')} className="hover:text-sky-500 transition-colors">Home</button>
          <span>/</span>
          <button onClick={() => navigate('course-detail', { courseId })} className="hover:text-sky-500 transition-colors">{course.title}</button>
          <span>/</span>
          <span className="text-foreground font-semibold">Q&A</span>
        </motion.div>

        {/* Header */}
        <GlassCard className="p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-lg font-extrabold text-foreground flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-sky-500" />
                Questions & Answers
              </h1>
              <p className="text-sm text-muted-foreground mt-1">{course.title}</p>
            </div>
            <GradientButton size="sm" onClick={() => setShowAskForm(!showAskForm)}>
              <HelpCircle className="w-4 h-4" />
              Ask Question
            </GradientButton>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search questions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-muted/30 border border-white/30 dark:border-white/10 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/50"
            />
          </div>

          {/* Filter tabs */}
          <div className="flex gap-2 mt-3">
            {(['all', 'answered', 'unanswered'] as const).map((filter) => (
              <motion.button
                key={filter}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize ${
                  filterAnswered === filter ? 'bg-sky-500 text-white' : 'bg-muted/30 text-muted-foreground'
                }`}
                onClick={() => setFilterAnswered(filter)}
                whileTap={{ scale: 0.95 }}
              >
                {filter} {filter !== 'all' && `(${MOCK_QA.filter((q) => filter === 'answered' ? q.isAnswered : !q.isAnswered).length})`}
              </motion.button>
            ))}
          </div>
        </GlassCard>

        {/* Ask Question Form */}
        <AnimatePresence>
          {showAskForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <GlassCard className="p-6 mb-6">
                <h3 className="text-sm font-bold text-foreground mb-3">Ask a Question</h3>
                <textarea
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  placeholder="Type your question here. Be specific for better answers..."
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl bg-muted/30 border border-white/30 dark:border-white/10 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/50 resize-none"
                />
                <div className="flex justify-end gap-3 mt-3">
                  <motion.button
                    className="px-4 py-2 rounded-xl bg-muted/30 text-sm font-semibold text-foreground"
                    onClick={() => { setShowAskForm(false); setQuestionText(''); }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Cancel
                  </motion.button>
                  <GradientButton size="sm" onClick={() => { setShowAskForm(false); setQuestionText(''); }}>
                    <Send className="w-4 h-4" />
                    Post Question
                  </GradientButton>
                </div>
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Q&A List */}
        <div className="space-y-4">
          {filteredQA.map((qa, i) => {
            const isExpanded = expandedQuestions.has(qa.id);
            return (
              <motion.div
                key={qa.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <GlassCard className="overflow-hidden">
                  <div className="p-5">
                    <div className="flex items-start gap-3">
                      <motion.button
                        className="flex flex-col items-center gap-1 pt-1 flex-shrink-0"
                        onClick={() => toggleExpand(qa.id)}
                        whileTap={{ scale: 0.95 }}
                      >
                        <ThumbsUp className="w-4 h-4 text-muted-foreground hover:text-sky-500" />
                        <span className="text-xs font-bold text-foreground">{qa.upvotes}</span>
                      </motion.button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {qa.isAnswered ? (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                              <CheckCircle2 className="w-3 h-3" /> Answered
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 text-[10px] font-bold">
                              <Clock className="w-3 h-3" /> Pending
                            </span>
                          )}
                        </div>
                        <button onClick={() => toggleExpand(qa.id)} className="text-left w-full">
                          <h4 className="text-sm font-bold text-foreground leading-relaxed">{qa.question}</h4>
                        </button>
                        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                          <span>{qa.askedBy}</span>
                          <span>&middot;</span>
                          <span>{qa.askedAt}</span>
                          {qa.answers.length > 0 && (
                            <>
                              <span>&middot;</span>
                              <span className="flex items-center gap-1">
                                <MessageCircle className="w-3 h-3" />
                                {qa.answers.length} answer{qa.answers.length > 1 ? 's' : ''}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Answers */}
                  <AnimatePresence>
                    {isExpanded && qa.answers.length > 0 && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <div className="border-t border-white/20 dark:border-white/5 bg-white/30 dark:bg-slate-800/20">
                          {qa.answers.map((answer, ai) => (
                            <div
                              key={ai}
                              className={`p-4 ${ai > 0 ? 'border-t border-white/10 dark:border-white/5' : ''}`}
                            >
                              <div className="flex items-start gap-3">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                                  answer.isInstructor
                                    ? 'bg-gradient-to-br from-sky-400 to-blue-600 text-white'
                                    : 'bg-muted/50 text-muted-foreground'
                                }`}>
                                  {answer.isInstructor ? 'I' : answer.answeredBy.charAt(0)}
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-foreground">{answer.answeredBy}</span>
                                    {answer.isInstructor && (
                                      <span className="px-1.5 py-0.5 rounded bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 text-[9px] font-bold">
                                        Instructor
                                      </span>
                                    )}
                                    <span className="text-[10px] text-muted-foreground">{answer.answeredAt}</span>
                                  </div>
                                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{answer.text}</p>
                                </div>
                              </div>
                            </div>
                          ))}

                          {/* Reply input */}
                          <div className="p-4 border-t border-white/10 dark:border-white/5">
                            <div className="flex gap-2">
                              <input
                                type="text"
                                placeholder="Write an answer..."
                                className="flex-1 px-4 py-2 rounded-xl bg-muted/30 border border-white/30 dark:border-white/10 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                              />
                              <GradientButton size="sm">
                                <Send className="w-3 h-3" />
                              </GradientButton>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </GlassCard>
              </motion.div>
            );
          })}

          {filteredQA.length === 0 && (
            <GlassCard className="p-8 text-center">
              <HelpCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No questions found. Be the first to ask!</p>
            </GlassCard>
          )}
        </div>
      </div>
    </AnimatedPage>
  );
}
