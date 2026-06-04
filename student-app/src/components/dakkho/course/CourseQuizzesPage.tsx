'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, CheckCircle2, XCircle, Clock, ChevronRight,
  Trophy, Target, RotateCcw, ArrowRight, BookOpen,
  BarChart3, Zap, Award, Star, Percent,
} from 'lucide-react';
import { useNavigationStore } from '@/lib/store';
import { getCourse } from '@/lib/mock-data';
import { GlassCard } from '../shared/GlassCard';
import { AnimatedPage } from '../shared/AnimatedPage';
import { GradientButton } from '../shared/GradientButton';
import { ProgressBar } from '../shared/ProgressBar';

interface QuizOption {
  id: string;
  text: string;
}

interface QuizQuestion {
  id: string;
  question: string;
  options: QuizOption[];
  correctOptionId: string;
  explanation: string;
}

interface Quiz {
  id: string;
  title: string;
  description: string;
  questionCount: number;
  duration: string;
  difficulty: 'easy' | 'medium' | 'hard';
  bestScore: number | null;
  attempts: number;
  questions: QuizQuestion[];
}

const MOCK_QUIZZES: Quiz[] = [
  {
    id: 'q1', title: 'Fundamentals Quiz', description: 'Test your understanding of basic concepts from Section 1.', questionCount: 5, duration: '10 min', difficulty: 'easy', bestScore: 80, attempts: 2,
    questions: [
      { id: 'q1-1', question: 'What does HTML stand for?', options: [{ id: 'a', text: 'Hyper Text Markup Language' }, { id: 'b', text: 'High Tech Modern Language' }, { id: 'c', text: 'Hyper Transfer Markup Language' }, { id: 'd', text: 'Home Tool Markup Language' }], correctOptionId: 'a', explanation: 'HTML stands for Hyper Text Markup Language. It is the standard markup language for creating web pages.' },
      { id: 'q1-2', question: 'Which CSS property is used to change the text color?', options: [{ id: 'a', text: 'font-color' }, { id: 'b', text: 'text-color' }, { id: 'c', text: 'color' }, { id: 'd', text: 'foreground-color' }], correctOptionId: 'c', explanation: 'The CSS "color" property sets the color of text content. There is no font-color or text-color property in CSS.' },
      { id: 'q1-3', question: 'Which tag is used for the largest heading in HTML?', options: [{ id: 'a', text: '<h6>' }, { id: 'b', text: '<heading>' }, { id: 'c', text: '<h1>' }, { id: 'd', text: '<head>' }], correctOptionId: 'c', explanation: '<h1> defines the largest heading. HTML headings range from <h1> (largest) to <h6> (smallest).' },
      { id: 'q1-4', question: 'What is the correct syntax for referring to an external script?', options: [{ id: 'a', text: '<script href="app.js">' }, { id: 'b', text: '<script name="app.js">' }, { id: 'c', text: '<script src="app.js">' }, { id: 'd', text: '<script file="app.js">' }], correctOptionId: 'c', explanation: 'The src attribute specifies the URL of an external script file.' },
      { id: 'q1-5', question: 'Which property is used to change the background color in CSS?', options: [{ id: 'a', text: 'bgcolor' }, { id: 'b', text: 'background-color' }, { id: 'c', text: 'color-background' }, { id: 'd', text: 'bg-color' }], correctOptionId: 'b', explanation: 'The "background-color" property sets the background color of an element.' },
    ],
  },
  {
    id: 'q2', title: 'Core Concepts Quiz', description: 'Challenge yourself with intermediate questions from Section 2.', questionCount: 5, duration: '15 min', difficulty: 'medium', bestScore: 60, attempts: 1,
    questions: [
      { id: 'q2-1', question: 'What is the CSS box model order from inside to outside?', options: [{ id: 'a', text: 'Margin, Border, Padding, Content' }, { id: 'b', text: 'Content, Padding, Border, Margin' }, { id: 'c', text: 'Padding, Content, Border, Margin' }, { id: 'd', text: 'Content, Border, Padding, Margin' }], correctOptionId: 'b', explanation: 'The CSS box model from inside to outside is: Content → Padding → Border → Margin.' },
      { id: 'q2-2', question: 'Which JavaScript method is used to add an element at the end of an array?', options: [{ id: 'a', text: 'append()' }, { id: 'b', text: 'push()' }, { id: 'c', text: 'add()' }, { id: 'd', text: 'insert()' }], correctOptionId: 'b', explanation: 'The push() method adds one or more elements to the end of an array and returns the new length.' },
      { id: 'q2-3', question: 'What does "===" operator check in JavaScript?', options: [{ id: 'a', text: 'Value only' }, { id: 'b', text: 'Type only' }, { id: 'c', text: 'Value and Type' }, { id: 'd', text: 'Reference' }], correctOptionId: 'c', explanation: 'The strict equality operator (===) checks both value and type without type coercion.' },
      { id: 'q2-4', question: 'Which CSS display property makes an element a flex container?', options: [{ id: 'a', text: 'display: block' }, { id: 'b', text: 'display: flex' }, { id: 'c', text: 'display: inline' }, { id: 'd', text: 'display: grid' }], correctOptionId: 'b', explanation: 'display: flex makes an element a block-level flex container.' },
      { id: 'q2-5', question: 'What is the purpose of the "querySelector" method?', options: [{ id: 'a', text: 'Create a new element' }, { id: 'b', text: 'Select the first matching element' }, { id: 'c', text: 'Select all matching elements' }, { id: 'd', text: 'Remove an element' }], correctOptionId: 'b', explanation: 'querySelector() returns the first element that matches a specified CSS selector.' },
    ],
  },
  {
    id: 'q3', title: 'Advanced Topics Quiz', description: 'Prove your mastery with advanced questions from Section 3.', questionCount: 5, duration: '20 min', difficulty: 'hard', bestScore: null, attempts: 0,
    questions: [
      { id: 'q3-1', question: 'What is the Virtual DOM?', options: [{ id: 'a', text: 'A browser API' }, { id: 'b', text: 'A lightweight copy of the real DOM' }, { id: 'c', text: 'A CSS framework' }, { id: 'd', text: 'A database model' }], correctOptionId: 'b', explanation: 'The Virtual DOM is a lightweight JavaScript representation of the real DOM used for efficient UI updates.' },
      { id: 'q3-2', question: 'Which React hook is used for side effects?', options: [{ id: 'a', text: 'useState' }, { id: 'b', text: 'useContext' }, { id: 'c', text: 'useEffect' }, { id: 'd', text: 'useRef' }], correctOptionId: 'c', explanation: 'useEffect is the React hook designed for performing side effects in function components.' },
      { id: 'q3-3', question: 'What does REST stand for?', options: [{ id: 'a', text: 'Remote Execution of Server Tasks' }, { id: 'b', text: 'Representational State Transfer' }, { id: 'c', text: 'Reliable Event Synchronization Technique' }, { id: 'd', text: 'Resource Entity State Transmission' }], correctOptionId: 'b', explanation: 'REST stands for Representational State Transfer, an architectural style for web services.' },
      { id: 'q3-4', question: 'What is the time complexity of binary search?', options: [{ id: 'a', text: 'O(n)' }, { id: 'b', text: 'O(n log n)' }, { id: 'c', text: 'O(log n)' }, { id: 'd', text: 'O(1)' }], correctOptionId: 'c', explanation: 'Binary search has O(log n) time complexity because it halves the search space with each step.' },
      { id: 'q3-5', question: 'What is the purpose of a CDN?', options: [{ id: 'a', text: 'Data encryption' }, { id: 'b', text: 'Distribute content geographically' }, { id: 'c', text: 'Version control' }, { id: 'd', text: 'Database management' }], correctOptionId: 'b', explanation: 'A Content Delivery Network (CDN) distributes content across multiple geographic locations for faster delivery.' },
    ],
  },
];

const DIFFICULTY_CONFIG = {
  easy: { color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20', label: 'Easy' },
  medium: { color: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20', label: 'Medium' },
  hard: { color: 'text-red-500 bg-red-50 dark:bg-red-900/20', label: 'Hard' },
};

export function CourseQuizzesPage() {
  const { pageParams, navigate, goBack } = useNavigationStore();
  const courseId = pageParams.courseId as string;
  const course = getCourse(courseId);

  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [showResults, setShowResults] = useState(false);
  const [showExplanation, setShowExplanation] = useState<string | null>(null);

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

  // Quiz List View
  if (!activeQuiz) {
    return (
      <AnimatedPage keyProp={`course-quizzes-${courseId}`}>
        <div className="pb-20 lg:pb-0">
          {/* Breadcrumb */}
          <motion.div className="flex items-center gap-2 text-sm text-muted-foreground mb-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <button onClick={() => navigate('home')} className="hover:text-sky-500 transition-colors">Home</button>
            <span>/</span>
            <button onClick={() => navigate('course-detail', { courseId })} className="hover:text-sky-500 transition-colors">{course.title}</button>
            <span>/</span>
            <span className="text-foreground font-semibold">Quizzes</span>
          </motion.div>

          <GlassCard className="p-6 mb-6">
            <h1 className="text-lg font-extrabold text-foreground flex items-center gap-2">
              <Brain className="w-5 h-5 text-sky-500" />
              Course Quizzes
            </h1>
            <p className="text-sm text-muted-foreground mt-1">{course.title}</p>
          </GlassCard>

          {/* Quiz stats overview */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { icon: Brain, label: 'Total Quizzes', value: MOCK_QUIZZES.length, color: 'text-sky-500 bg-sky-50 dark:bg-sky-900/20' },
              { icon: Trophy, label: 'Completed', value: MOCK_QUIZZES.filter((q) => q.bestScore !== null).length, color: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20' },
              { icon: Target, label: 'Avg Score', value: `${Math.round(MOCK_QUIZZES.filter((q) => q.bestScore).reduce((a, q) => a + (q.bestScore || 0), 0) / Math.max(MOCK_QUIZZES.filter((q) => q.bestScore).length, 1))}%`, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' },
            ].map((stat, i) => (
              <motion.div key={stat.label} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                <GlassCard className="p-4 text-center">
                  <div className={`w-8 h-8 rounded-lg ${stat.color} flex items-center justify-center mx-auto mb-2`}>
                    <stat.icon className="w-4 h-4" />
                  </div>
                  <p className="text-lg font-extrabold text-foreground">{stat.value}</p>
                  <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                </GlassCard>
              </motion.div>
            ))}
          </div>

          {/* Quiz list */}
          <div className="space-y-4">
            {MOCK_QUIZZES.map((quiz, i) => {
              const diffConfig = DIFFICULTY_CONFIG[quiz.difficulty];
              return (
                <motion.div
                  key={quiz.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.08 }}
                >
                  <GlassCard hover className="p-5 cursor-pointer" onClick={() => { setActiveQuiz(quiz); setCurrentQuestionIndex(0); setSelectedAnswers({}); setShowResults(false); }}>
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white flex-shrink-0">
                        <Brain className="w-6 h-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="text-sm font-bold text-foreground">{quiz.title}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${diffConfig.color}`}>
                            {diffConfig.label}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">{quiz.description}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" />{quiz.questionCount} Questions</span>
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{quiz.duration}</span>
                          <span className="flex items-center gap-1"><RotateCcw className="w-3 h-3" />{quiz.attempts} attempts</span>
                        </div>
                        {quiz.bestScore !== null && (
                          <div className="mt-2">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-muted-foreground">Best Score</span>
                              <span className="font-bold text-sky-500">{quiz.bestScore}%</span>
                            </div>
                            <ProgressBar value={quiz.bestScore} size="sm" />
                          </div>
                        )}
                      </div>
                      <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
                    </div>
                  </GlassCard>
                </motion.div>
              );
            })}
          </div>
        </div>
      </AnimatedPage>
    );
  }

  // Quiz Taking / Results View
  const currentQuestion = activeQuiz.questions[currentQuestionIndex];
  const totalQuestions = activeQuiz.questions.length;

  if (showResults) {
    const correctCount = activeQuiz.questions.filter((q) => selectedAnswers[q.id] === q.correctOptionId).length;
    const score = Math.round((correctCount / totalQuestions) * 100);
    const passed = score >= 60;

    return (
      <AnimatedPage keyProp={`quiz-results-${activeQuiz.id}`}>
        <div className="pb-20 lg:pb-0">
          <GlassCard className="p-8 text-center mb-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.2 }}
            >
              {passed ? (
                <Trophy className="w-16 h-16 text-amber-400 mx-auto mb-4" />
              ) : (
                <XCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
              )}
            </motion.div>
            <h2 className="text-2xl font-extrabold text-foreground mb-2">
              {passed ? 'Congratulations!' : 'Keep Practicing!'}
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              {passed ? 'You have passed the quiz!' : 'You need 60% to pass. Review the material and try again.'}
            </p>
            <div className="text-5xl font-extrabold mb-1" style={{ color: passed ? '#10b981' : '#ef4444' }}>{score}%</div>
            <p className="text-sm text-muted-foreground">{correctCount}/{totalQuestions} correct answers</p>
            <div className="flex justify-center gap-4 mt-6">
              <GradientButton size="sm" onClick={() => { setActiveQuiz(null); }}>
                Back to Quizzes
              </GradientButton>
              <motion.button
                className="px-4 py-2 rounded-xl bg-muted/30 text-sm font-semibold text-foreground flex items-center gap-2"
                onClick={() => { setCurrentQuestionIndex(0); setSelectedAnswers({}); setShowResults(false); }}
                whileTap={{ scale: 0.95 }}
              >
                <RotateCcw className="w-4 h-4" /> Retry
              </motion.button>
            </div>
          </GlassCard>

          {/* Detailed results */}
          <div className="space-y-3">
            {activeQuiz.questions.map((q, i) => {
              const isCorrect = selectedAnswers[q.id] === q.correctOptionId;
              return (
                <motion.div key={q.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.08 }}>
                  <GlassCard className={`p-4 border-l-4 ${isCorrect ? 'border-l-emerald-500' : 'border-l-red-500'}`}>
                    <div className="flex items-start gap-3">
                      {isCorrect ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                      )}
                      <div>
                        <p className="text-sm font-semibold text-foreground">{q.question}</p>
                        {!isCorrect && (
                          <p className="text-xs text-red-500 mt-1">Your answer: {q.options.find((o) => o.id === selectedAnswers[q.id])?.text}</p>
                        )}
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                          Correct: {q.options.find((o) => o.id === q.correctOptionId)?.text}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2 italic">{q.explanation}</p>
                      </div>
                    </div>
                  </GlassCard>
                </motion.div>
              );
            })}
          </div>
        </div>
      </AnimatedPage>
    );
  }

  // Active quiz taking
  return (
    <AnimatedPage keyProp={`quiz-active-${activeQuiz.id}-${currentQuestionIndex}`}>
      <div className="pb-20 lg:pb-0">
        {/* Progress */}
        <GlassCard className="p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-foreground">{activeQuiz.title}</h3>
            <span className="text-xs text-muted-foreground">{currentQuestionIndex + 1}/{totalQuestions}</span>
          </div>
          <ProgressBar value={(currentQuestionIndex / totalQuestions) * 100} size="sm" />
        </GlassCard>

        {/* Question */}
        <motion.div
          key={currentQuestion.id}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          <GlassCard className="p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-900/20 flex items-center justify-center text-sky-500 text-sm font-bold">
                {currentQuestionIndex + 1}
              </span>
              <h2 className="text-base font-bold text-foreground">{currentQuestion.question}</h2>
            </div>

            <div className="space-y-3">
              {currentQuestion.options.map((option) => {
                const isSelected = selectedAnswers[currentQuestion.id] === option.id;
                return (
                  <motion.button
                    key={option.id}
                    className={`w-full p-4 rounded-xl text-left text-sm font-medium transition-all border-2 ${
                      isSelected
                        ? 'border-sky-500 bg-sky-50/50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-300'
                        : 'border-white/30 dark:border-white/10 bg-white/30 dark:bg-slate-800/30 text-foreground hover:border-sky-300'
                    }`}
                    onClick={() => setSelectedAnswers({ ...selectedAnswers, [currentQuestion.id]: option.id })}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        isSelected ? 'border-sky-500 bg-sky-500' : 'border-muted-foreground/30'
                      }`}>
                        {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                      {option.text}
                    </div>
                  </motion.button>
                );
              })}
            </div>

            {/* Explanation */}
            <AnimatePresence>
              {showExplanation === currentQuestion.id && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 p-4 rounded-xl bg-amber-50/50 dark:bg-amber-900/20 border border-amber-200/50 dark:border-amber-800/30"
                >
                  <p className="text-xs text-amber-700 dark:text-amber-300 font-semibold mb-1">Explanation:</p>
                  <p className="text-xs text-foreground">{currentQuestion.explanation}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </GlassCard>
        </motion.div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-4">
          <motion.button
            className="px-4 py-2.5 rounded-xl bg-muted/30 text-sm font-semibold text-foreground"
            onClick={() => setActiveQuiz(null)}
            whileTap={{ scale: 0.95 }}
          >
            Exit Quiz
          </motion.button>
          <div className="flex gap-3">
            <motion.button
              className="px-4 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 text-sm font-semibold"
              onClick={() => setShowExplanation(showExplanation === currentQuestion.id ? null : currentQuestion.id)}
              whileTap={{ scale: 0.95 }}
            >
              <Zap className="w-4 h-4 inline" /> Hint
            </motion.button>
            {currentQuestionIndex < totalQuestions - 1 ? (
              <GradientButton size="sm" onClick={() => setCurrentQuestionIndex(currentQuestionIndex + 1)}>
                Next <ArrowRight className="w-4 h-4" />
              </GradientButton>
            ) : (
              <GradientButton size="sm" onClick={() => setShowResults(true)}>
                <CheckCircle2 className="w-4 h-4" /> Submit
              </GradientButton>
            )}
          </div>
        </div>
      </div>
    </AnimatedPage>
  );
}
