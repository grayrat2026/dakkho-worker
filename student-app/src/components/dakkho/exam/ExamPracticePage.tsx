'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain, ChevronLeft, Play, Clock, Target, Zap,
  BookOpen, CheckCircle, XCircle, ArrowRight, ArrowLeft,
  RotateCcw, BarChart3, Sparkles, Award,
} from 'lucide-react';
import { useNavigationStore } from '@/lib/store';
import { GlassCard } from '../shared/GlassCard';
import { GradientButton } from '../shared/GradientButton';

interface Question {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  subject: string;
  difficulty: string;
}

export function ExamPracticePage() {
  const { goBack } = useNavigationStore();

  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState('Mixed');
  const [questionCount, setQuestionCount] = useState(10);
  const [isPracticing, setIsPracticing] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [isFinished, setIsFinished] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);

  const subjects = [
    { id: 'math', name: 'Mathematics', icon: '📐', questionCount: 45 },
    { id: 'physics', name: 'Physics', icon: '⚡', questionCount: 38 },
    { id: 'cse', name: 'Programming', icon: '💻', questionCount: 52 },
    { id: 'eee', name: 'Electrical', icon: '🔌', questionCount: 30 },
    { id: 'me', name: 'Mechanical', icon: '🔧', questionCount: 25 },
    { id: 'ce', name: 'Civil', icon: '🏗️', questionCount: 28 },
  ];

  const questions: Question[] = [
    {
      id: 1, subject: 'cse', difficulty: 'Easy',
      question: 'What is the time complexity of binary search?',
      options: ['O(n)', 'O(log n)', 'O(n²)', 'O(1)'],
      correctAnswer: 1,
      explanation: 'Binary search divides the search space in half with each comparison, resulting in O(log n) time complexity.',
    },
    {
      id: 2, subject: 'cse', difficulty: 'Medium',
      question: 'Which data structure is used for implementing BFS?',
      options: ['Stack', 'Queue', 'Tree', 'Graph'],
      correctAnswer: 1,
      explanation: 'BFS (Breadth-First Search) uses a Queue data structure to visit nodes level by level.',
    },
    {
      id: 3, subject: 'cse', difficulty: 'Hard',
      question: 'What is the worst-case time complexity of QuickSort?',
      options: ['O(n log n)', 'O(n)', 'O(n²)', 'O(log n)'],
      correctAnswer: 2,
      explanation: 'QuickSort has O(n²) worst-case time complexity when the pivot selection is consistently poor (e.g., already sorted array with first/last element as pivot).',
    },
    {
      id: 4, subject: 'math', difficulty: 'Easy',
      question: 'What is the derivative of x²?',
      options: ['x', '2x', '2x²', 'x/2'],
      correctAnswer: 1,
      explanation: 'Using the power rule: d/dx(x²) = 2x¹ = 2x.',
    },
    {
      id: 5, subject: 'math', difficulty: 'Medium',
      question: 'What is the integral of 1/x dx?',
      options: ['x²', 'ln|x| + C', '1/x² + C', 'eˣ + C'],
      correctAnswer: 1,
      explanation: 'The integral of 1/x is ln|x| + C, which is a standard formula in calculus.',
    },
  ];

  const startPractice = () => {
    setIsPracticing(true);
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setShowExplanation(false);
    setAnswers(new Array(questionCount).fill(null));
    setTimeElapsed(0);
  };

  const handleAnswer = (index: number) => {
    if (showExplanation) return;
    setSelectedAnswer(index);
    const newAnswers = [...answers];
    newAnswers[currentQuestion] = index;
    setAnswers(newAnswers);
    setShowExplanation(true);
  };

  const nextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
    } else {
      setIsFinished(true);
    }
  };

  const resetPractice = () => {
    setIsPracticing(false);
    setIsFinished(false);
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setShowExplanation(false);
    setAnswers([]);
  };

  const correctCount = answers.reduce((sum: number, ans, i) => {
    if (ans !== null && questions[i] && ans === questions[i].correctAnswer) return sum + 1;
    return sum;
  }, 0);

  if (isFinished) {
    const score = Math.round((correctCount / questions.length) * 100);
    return (
      <div className="pb-20 lg:pb-0">
        <motion.div className="flex items-center gap-3 mb-6" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <motion.button className="w-9 h-9 rounded-xl bg-muted/30 flex items-center justify-center text-foreground" onClick={goBack} whileTap={{ scale: 0.9 }}>
            <ChevronLeft className="w-5 h-5" />
          </motion.button>
          <h1 className="text-xl font-extrabold text-foreground">Practice Results</h1>
        </motion.div>

        <GlassCard className="p-8 text-center mb-4">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 15 }}>
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
              <span className="text-2xl font-extrabold text-white">{score}%</span>
            </div>
          </motion.div>
          <h2 className="text-lg font-extrabold text-foreground mb-1">{score >= 80 ? 'Excellent!' : score >= 60 ? 'Good Job!' : 'Keep Practicing!'}</h2>
          <p className="text-sm text-muted-foreground">You answered {correctCount} out of {questions.length} correctly</p>
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/20">
              <p className="text-lg font-extrabold text-emerald-500">{correctCount}</p>
              <p className="text-xs text-muted-foreground">Correct</p>
            </div>
            <div className="p-2 rounded-xl bg-red-50 dark:bg-red-900/20">
              <p className="text-lg font-extrabold text-red-500">{questions.length - correctCount}</p>
              <p className="text-xs text-muted-foreground">Wrong</p>
            </div>
            <div className="p-2 rounded-xl bg-sky-50 dark:bg-sky-900/20">
              <p className="text-lg font-extrabold text-sky-500">{questions.length}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
          </div>
        </GlassCard>

        <div className="flex gap-3">
          <GradientButton onClick={resetPractice} variant="primary" size="sm" className="flex-1">
            <RotateCcw className="w-4 h-4" /> Try Again
          </GradientButton>
          <GradientButton onClick={goBack} variant="success" size="sm" className="flex-1">
            <CheckCircle className="w-4 h-4" /> Done
          </GradientButton>
        </div>
      </div>
    );
  }

  if (isPracticing) {
    const q = questions[currentQuestion];
    return (
      <div className="pb-20 lg:pb-0">
        <motion.div className="flex items-center justify-between mb-4" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <motion.button className="w-9 h-9 rounded-xl bg-muted/30 flex items-center justify-center text-foreground" onClick={resetPractice} whileTap={{ scale: 0.9 }}>
            <ChevronLeft className="w-5 h-5" />
          </motion.button>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Question {currentQuestion + 1} of {questions.length}</p>
          </div>
          <div className="flex items-center gap-1 text-xs font-semibold text-sky-500">
            <Clock className="w-3 h-3" />
            <span>{Math.floor(timeElapsed / 60)}:{(timeElapsed % 60).toString().padStart(2, '0')}</span>
          </div>
        </motion.div>

        {/* Progress bar */}
        <div className="h-1.5 rounded-full bg-muted/30 mb-6 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-sky-400 to-blue-600"
            animate={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        <AnimatePresence mode="wait">
          <motion.div key={currentQuestion} initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
            <GlassCard className="p-5 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  q.difficulty === 'Easy' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500' :
                  q.difficulty === 'Medium' ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-500' :
                  'bg-red-50 dark:bg-red-900/20 text-red-500'
                }`}>{q.difficulty}</span>
                <span className="text-xs text-muted-foreground">{q.subject.toUpperCase()}</span>
              </div>
              <h2 className="text-base font-bold text-foreground mb-4">{q.question}</h2>

              <div className="space-y-2">
                {q.options.map((option, i) => {
                  const isCorrect = i === q.correctAnswer;
                  const isSelected = selectedAnswer === i;
                  let optionStyle = 'bg-muted/20 border-transparent';
                  if (showExplanation) {
                    if (isCorrect) optionStyle = 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-500';
                    else if (isSelected && !isCorrect) optionStyle = 'bg-red-50 dark:bg-red-900/20 border-red-500';
                  } else if (isSelected) {
                    optionStyle = 'bg-sky-50 dark:bg-sky-900/20 border-sky-500';
                  }

                  return (
                    <motion.button
                      key={i}
                      className={`w-full p-3 rounded-xl border-2 text-left flex items-center gap-3 ${optionStyle}`}
                      onClick={() => handleAnswer(i)}
                      whileTap={!showExplanation ? { scale: 0.98 } : undefined}
                      disabled={showExplanation}
                    >
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        showExplanation && isCorrect ? 'bg-emerald-500 text-white' :
                        showExplanation && isSelected && !isCorrect ? 'bg-red-500 text-white' :
                        'bg-muted/30 text-muted-foreground'
                      }`}>
                        {showExplanation && isCorrect ? <CheckCircle className="w-4 h-4" /> :
                         showExplanation && isSelected && !isCorrect ? <XCircle className="w-4 h-4" /> :
                         String.fromCharCode(65 + i)}
                      </span>
                      <span className="text-sm font-medium text-foreground">{option}</span>
                    </motion.button>
                  );
                })}
              </div>

              {showExplanation && (
                <motion.div className="mt-4 p-3 rounded-xl bg-sky-50 dark:bg-sky-900/20" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <p className="text-xs font-bold text-sky-600 dark:text-sky-400 mb-1">Explanation</p>
                  <p className="text-xs text-muted-foreground">{q.explanation}</p>
                </motion.div>
              )}
            </GlassCard>
          </motion.div>
        </AnimatePresence>

        {showExplanation && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <GradientButton onClick={nextQuestion} className="w-full" size="sm">
              {currentQuestion < questions.length - 1 ? (
                <><ArrowRight className="w-4 h-4" /> Next Question</>
              ) : (
                <><BarChart3 className="w-4 h-4" /> View Results</>
              )}
            </GradientButton>
          </motion.div>
        )}
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
          <h1 className="text-xl font-extrabold text-foreground">Practice Mode</h1>
          <p className="text-xs text-muted-foreground">Test your knowledge</p>
        </div>
      </motion.div>

      {/* Subject Selection */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <GlassCard className="p-5 mb-4">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-4">
            <BookOpen className="w-4 h-4 text-sky-500" /> Select Subject
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {subjects.map((subject, i) => (
              <motion.div
                key={subject.id}
                className={`p-3 rounded-xl cursor-pointer text-center transition-all ${
                  selectedSubject === subject.id
                    ? 'bg-sky-50 dark:bg-sky-900/20 border-2 border-sky-500'
                    : 'bg-muted/20 border-2 border-transparent hover:bg-muted/30'
                }`}
                onClick={() => setSelectedSubject(subject.id)}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 + i * 0.04 }}
                whileTap={{ scale: 0.95 }}
              >
                <span className="text-2xl block mb-1">{subject.icon}</span>
                <p className="text-xs font-bold text-foreground">{subject.name}</p>
                <p className="text-[10px] text-muted-foreground">{subject.questionCount} questions</p>
              </motion.div>
            ))}
          </div>
        </GlassCard>
      </motion.div>

      {/* Settings */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <GlassCard className="p-5 mb-4">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-4">
            <Target className="w-4 h-4 text-sky-500" /> Practice Settings
          </h3>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-2">Difficulty</label>
              <div className="flex gap-2">
                {['Easy', 'Medium', 'Hard', 'Mixed'].map((d) => (
                  <motion.button
                    key={d}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                      difficulty === d ? 'bg-sky-500 text-white' : 'bg-muted/30 text-muted-foreground'
                    }`}
                    onClick={() => setDifficulty(d)}
                    whileTap={{ scale: 0.95 }}
                  >
                    {d}
                  </motion.button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-2">Number of Questions</label>
              <div className="flex gap-2">
                {[5, 10, 15, 20].map((count) => (
                  <motion.button
                    key={count}
                    className={`px-4 py-2 rounded-lg text-xs font-bold ${
                      questionCount === count ? 'bg-sky-500 text-white' : 'bg-muted/30 text-muted-foreground'
                    }`}
                    onClick={() => setQuestionCount(count)}
                    whileTap={{ scale: 0.95 }}
                  >
                    {count}
                  </motion.button>
                ))}
              </div>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Start Button */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <GradientButton onClick={startPractice} className="w-full" size="lg" disabled={!selectedSubject}>
          <Play className="w-5 h-5" /> Start Practice
        </GradientButton>
        {!selectedSubject && (
          <p className="text-xs text-muted-foreground text-center mt-2">Please select a subject to start</p>
        )}
      </motion.div>
    </div>
  );
}
