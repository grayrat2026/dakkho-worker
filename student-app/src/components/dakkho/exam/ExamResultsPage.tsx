'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Award, ChevronLeft, TrendingUp, BarChart3, Star,
  BookOpen, Target, Calculator, ChevronDown, ChevronUp,
  ArrowUp, ArrowDown, Minus, Sparkles, GraduationCap,
} from 'lucide-react';
import { useNavigationStore } from '@/lib/store';
import { GlassCard } from '../shared/GlassCard';

export function ExamResultsPage() {
  const { goBack } = useNavigationStore();

  const [selectedSemester, setSelectedSemester] = useState('6');
  const [expandedSemester, setExpandedSemester] = useState<string | null>('6');

  const semesters = [
    {
      id: '6',
      name: 'Semester 6',
      gpa: 3.52,
      totalCredits: 18,
      status: 'Current',
      subjects: [
        { name: 'Mathematics-III', code: 'MATH-301', credits: 3, grade: 'A', gradePoint: 3.5, marks: 78 },
        { name: 'Digital Electronics', code: 'ETE-301', credits: 3, grade: 'A+', gradePoint: 4.0, marks: 89 },
        { name: 'Data Structures', code: 'CSE-301', credits: 4, grade: 'A', gradePoint: 3.5, marks: 82 },
        { name: 'Electrical Machines', code: 'EEE-301', credits: 3, grade: 'B+', gradePoint: 3.0, marks: 72 },
        { name: 'Programming Lab', code: 'CSE-302', credits: 2, grade: 'A+', gradePoint: 4.0, marks: 92 },
        { name: 'Electrical Lab', code: 'EEE-302', credits: 2, grade: 'A', gradePoint: 3.5, marks: 80 },
        { name: 'English-II', code: 'ENG-201', credits: 1, grade: 'B+', gradePoint: 3.0, marks: 68 },
      ],
    },
    {
      id: '5',
      name: 'Semester 5',
      gpa: 3.35,
      totalCredits: 18,
      status: 'Completed',
      subjects: [
        { name: 'Mathematics-II', code: 'MATH-201', credits: 3, grade: 'B+', gradePoint: 3.0, marks: 71 },
        { name: 'Object Oriented Programming', code: 'CSE-201', credits: 4, grade: 'A+', gradePoint: 4.0, marks: 90 },
        { name: 'Database Systems', code: 'CSE-202', credits: 3, grade: 'A', gradePoint: 3.5, marks: 83 },
        { name: 'Analog Electronics', code: 'ETE-201', credits: 3, grade: 'B', gradePoint: 2.5, marks: 65 },
        { name: 'OOP Lab', code: 'CSE-203', credits: 2, grade: 'A+', gradePoint: 4.0, marks: 88 },
        { name: 'DB Lab', code: 'CSE-204', credits: 2, grade: 'A', gradePoint: 3.5, marks: 79 },
        { name: 'Social Science', code: 'SOC-101', credits: 1, grade: 'A', gradePoint: 3.5, marks: 76 },
      ],
    },
    {
      id: '4',
      name: 'Semester 4',
      gpa: 3.10,
      totalCredits: 17,
      status: 'Completed',
      subjects: [
        { name: 'Mathematics-I', code: 'MATH-101', credits: 3, grade: 'B+', gradePoint: 3.0, marks: 70 },
        { name: 'Physics-I', code: 'PHYS-101', credits: 3, grade: 'A', gradePoint: 3.5, marks: 81 },
        { name: 'Basic Electronics', code: 'ETE-101', credits: 3, grade: 'B+', gradePoint: 3.0, marks: 74 },
        { name: 'Engineering Drawing', code: 'CE-101', credits: 2, grade: 'A', gradePoint: 3.5, marks: 85 },
        { name: 'Physics Lab', code: 'PHYS-102', credits: 2, grade: 'A+', gradePoint: 4.0, marks: 91 },
        { name: 'Electronics Lab', code: 'ETE-102', credits: 2, grade: 'B', gradePoint: 2.5, marks: 62 },
        { name: 'Bangla', code: 'BEN-101', credits: 2, grade: 'A', gradePoint: 3.5, marks: 77 },
      ],
    },
  ];

  const getGradeColor = (grade: string) => {
    if (grade.startsWith('A')) return 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400';
    if (grade.startsWith('B')) return 'bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400';
    if (grade.startsWith('C')) return 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400';
    return 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400';
  };

  const totalCreditsEarned = semesters.reduce((sum, sem) => sum + sem.totalCredits, 0);
  const cumulativeGPA = semesters.reduce((sum, sem) => sum + sem.gpa * sem.totalCredits, 0) / totalCreditsEarned;

  return (
    <div className="pb-20 lg:pb-0">
      {/* Header */}
      <motion.div className="flex items-center gap-3 mb-6" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <motion.button className="w-9 h-9 rounded-xl bg-muted/30 flex items-center justify-center text-foreground" onClick={goBack} whileTap={{ scale: 0.9 }}>
          <ChevronLeft className="w-5 h-5" />
        </motion.button>
        <div>
          <h1 className="text-xl font-extrabold text-foreground">Exam Results</h1>
          <p className="text-xs text-muted-foreground">Your academic performance</p>
        </div>
      </motion.div>

      {/* GPA Overview */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <GlassCard className="p-5 mb-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center shadow-lg">
              <span className="text-2xl font-extrabold text-white">{cumulativeGPA.toFixed(2)}</span>
            </div>
            <div>
              <h2 className="text-base font-extrabold text-foreground">Cumulative GPA</h2>
              <p className="text-xs text-muted-foreground">{totalCreditsEarned} credits earned</p>
              <div className="flex items-center gap-1 mt-1">
                <TrendingUp className="w-3 h-3 text-emerald-500" />
                <span className="text-xs font-semibold text-emerald-500">+0.17 from last semester</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-2 rounded-xl bg-muted/20">
              <p className="text-sm font-extrabold text-sky-500">{semesters.length}</p>
              <p className="text-xs text-muted-foreground">Semesters</p>
            </div>
            <div className="text-center p-2 rounded-xl bg-muted/20">
              <p className="text-sm font-extrabold text-emerald-500">{semesters.reduce((s, sem) => s + sem.subjects.filter(sub => sub.grade.startsWith('A')).length, 0)}</p>
              <p className="text-xs text-muted-foreground">A Grades</p>
            </div>
            <div className="text-center p-2 rounded-xl bg-muted/20">
              <p className="text-sm font-extrabold text-amber-500">{totalCreditsEarned}</p>
              <p className="text-xs text-muted-foreground">Credits</p>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* GPA Calculator */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <GlassCard className="p-5 mb-4">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-4">
            <Calculator className="w-4 h-4 text-sky-500" /> GPA Trend
          </h3>
          <div className="flex items-end gap-2 h-32">
            {semesters.map((sem, i) => (
              <motion.div
                key={sem.id}
                className="flex-1 flex flex-col items-center gap-1"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
              >
                <span className="text-xs font-bold text-foreground">{sem.gpa.toFixed(2)}</span>
                <motion.div
                  className="w-full rounded-t-lg bg-gradient-to-t from-sky-500 to-sky-400"
                  initial={{ height: 0 }}
                  animate={{ height: `${(sem.gpa / 4.0) * 100}%` }}
                  transition={{ delay: 0.3 + i * 0.1, duration: 0.5 }}
                />
                <span className="text-xs text-muted-foreground">S{sem.id}</span>
              </motion.div>
            ))}
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>0.0</span>
            <span>4.0 Scale</span>
          </div>
        </GlassCard>
      </motion.div>

      {/* Semester-wise Breakdown */}
      <div className="space-y-3">
        {semesters.map((semester, si) => (
          <motion.div
            key={semester.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + si * 0.05 }}
          >
            <GlassCard className="overflow-hidden">
              <motion.button
                className="w-full p-4 flex items-center justify-between"
                onClick={() => setExpandedSemester(expandedSemester === semester.id ? null : semester.id)}
                whileTap={{ scale: 0.99 }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center">
                    <GraduationCap className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-foreground">{semester.name}</p>
                    <p className="text-xs text-muted-foreground">{semester.totalCredits} credits • {semester.subjects.length} subjects</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-lg font-extrabold text-sky-500">{semester.gpa.toFixed(2)}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      semester.status === 'Current' ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-500' : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500'
                    }`}>{semester.status}</span>
                  </div>
                  {expandedSemester === semester.id ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </div>
              </motion.button>

              {expandedSemester === semester.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  className="px-4 pb-4"
                >
                  <div className="space-y-2">
                    {semester.subjects.map((subject, i) => (
                      <motion.div
                        key={subject.code}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-muted/20"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04 }}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-foreground">{subject.name}</p>
                          <p className="text-xs text-muted-foreground">{subject.code} • {subject.credits} credits</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-foreground">{subject.marks}%</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${getGradeColor(subject.grade)}`}>
                            {subject.grade}
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </GlassCard>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
