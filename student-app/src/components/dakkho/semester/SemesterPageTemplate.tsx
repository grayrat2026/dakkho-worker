'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  BookOpen, Clock, ChevronLeft, GraduationCap, Target, Lightbulb,
  CheckCircle, Circle, Star, TrendingUp, Calendar, BarChart3,
  Play, Award, Users, Zap, BookMarked, ArrowRight,
} from 'lucide-react';
import { useNavigationStore } from '@/lib/store';
import { COURSES, getInstructor, formatDuration } from '@/lib/mock-data';
import { GlassCard } from '../shared/GlassCard';
import { AnimatedPage } from '../shared/AnimatedPage';
import { GradientButton } from '../shared/GradientButton';
import { ProgressBar } from '../shared/ProgressBar';
import { AnimatedCounter } from '../shared/AnimatedCounter';

interface Subject {
  name: string;
  code: string;
  credits: number;
}

interface SemesterInfo {
  title: string;
  period: string;
  subjects: Subject[];
}

export const SEMESTER_DATA: Record<number, SemesterInfo> = {
  1: { title: 'First Semester', period: 'Year 1, Term 1', subjects: [
    { name: 'Mathematics-I', code: 'MATH-101', credits: 3 },
    { name: 'Physics-I', code: 'PHYS-101', credits: 3 },
    { name: 'Engineering Drawing', code: 'ED-101', credits: 3 },
    { name: 'Workshop Practice', code: 'WP-101', credits: 3 },
    { name: 'English', code: 'ENG-101', credits: 2 },
    { name: 'Computer Fundamentals', code: 'CF-101', credits: 3 },
  ]},
  2: { title: 'Second Semester', period: 'Year 1, Term 2', subjects: [
    { name: 'Mathematics-II', code: 'MATH-201', credits: 3 },
    { name: 'Physics-II', code: 'PHYS-201', credits: 3 },
    { name: 'Basic Electricity', code: 'BE-201', credits: 3 },
    { name: 'Chemistry', code: 'CHEM-201', credits: 2 },
    { name: 'Bangla', code: 'BN-201', credits: 2 },
    { name: 'Programming Fundamentals', code: 'PF-201', credits: 3 },
  ]},
  3: { title: 'Third Semester', period: 'Year 2, Term 1', subjects: [
    { name: 'Mathematics-III', code: 'MATH-301', credits: 3 },
    { name: 'Data Structures', code: 'DS-301', credits: 3 },
    { name: 'Digital Electronics', code: 'DE-301', credits: 3 },
    { name: 'Object Oriented Programming', code: 'OOP-301', credits: 3 },
    { name: 'Database Management', code: 'DBMS-301', credits: 3 },
    { name: 'Technical Drawing', code: 'TD-301', credits: 2 },
  ]},
  4: { title: 'Fourth Semester', period: 'Year 2, Term 2', subjects: [
    { name: 'Discrete Mathematics', code: 'DM-401', credits: 3 },
    { name: 'Operating Systems', code: 'OS-401', credits: 3 },
    { name: 'Web Development', code: 'WD-401', credits: 3 },
    { name: 'Microprocessor', code: 'MP-401', credits: 3 },
    { name: 'Computer Networks', code: 'CN-401', credits: 3 },
    { name: 'Industrial Management', code: 'IM-401', credits: 2 },
  ]},
  5: { title: 'Fifth Semester', period: 'Year 3, Term 1', subjects: [
    { name: 'Software Engineering', code: 'SE-501', credits: 3 },
    { name: 'Mobile App Development', code: 'MAD-501', credits: 3 },
    { name: 'Computer Architecture', code: 'CA-501', credits: 3 },
    { name: 'Machine Learning', code: 'ML-501', credits: 3 },
    { name: 'Project-I', code: 'PRJ-501', credits: 4 },
    { name: 'Environmental Science', code: 'ES-501', credits: 2 },
  ]},
  6: { title: 'Sixth Semester', period: 'Year 3, Term 2', subjects: [
    { name: 'Cybersecurity', code: 'CS-601', credits: 3 },
    { name: 'Cloud Computing', code: 'CC-601', credits: 3 },
    { name: 'Data Science', code: 'DSA-601', credits: 3 },
    { name: 'IoT Systems', code: 'IOT-601', credits: 3 },
    { name: 'Project-II', code: 'PRJ-601', credits: 4 },
    { name: 'Entrepreneurship', code: 'ENT-601', credits: 2 },
  ]},
  7: { title: 'Seventh Semester', period: 'Year 4, Term 1', subjects: [
    { name: 'Advanced Programming', code: 'AP-701', credits: 3 },
    { name: 'DevOps & Deployment', code: 'DO-701', credits: 3 },
    { name: 'Elective-I', code: 'EL-701', credits: 3 },
    { name: 'Industrial Training', code: 'IT-701', credits: 4 },
    { name: 'Project-III', code: 'PRJ-701', credits: 4 },
  ]},
  8: { title: 'Eighth Semester', period: 'Year 4, Term 2', subjects: [
    { name: 'Elective-II', code: 'EL-801', credits: 3 },
    { name: 'Elective-III', code: 'EL-802', credits: 3 },
    { name: 'Capstone Project', code: 'CP-801', credits: 6 },
    { name: 'Professional Ethics', code: 'PE-801', credits: 2 },
    { name: 'Viva Voce', code: 'VV-801', credits: 2 },
  ]},
};

const SEMESTER_TIPS: Record<number, { title: string; tips: string[] }> = {
  1: { title: 'Getting Started', tips: ['Build a strong math foundation', 'Practice engineering drawing daily', 'Learn basic computer skills early', 'Develop good study habits from day one'] },
  2: { title: 'Building Foundations', tips: ['Focus on programming fundamentals', 'Understand electrical concepts thoroughly', 'Practice problem-solving regularly', 'Start building simple projects'] },
  3: { title: 'Core Skills', tips: ['Master data structures and algorithms', 'Practice OOP with real examples', 'Get hands-on with database design', 'Build mini projects for portfolio'] },
  4: { title: 'Expanding Knowledge', tips: ['Build a complete web application', 'Understand OS concepts deeply', 'Learn networking from the ground up', 'Practice system design thinking'] },
  5: { title: 'Specialization', tips: ['Choose your specialization wisely', 'Start your project early', 'Learn mobile development hands-on', 'Explore machine learning basics'] },
  6: { title: 'Advanced Topics', tips: ['Practice cybersecurity skills ethically', 'Deploy projects on cloud platforms', 'Work with real datasets', 'Start thinking about entrepreneurship'] },
  7: { title: 'Industry Ready', tips: ['Get industrial training seriously', 'Learn DevOps practices', 'Contribute to open source', 'Prepare your resume and portfolio'] },
  8: { title: 'Final Push', tips: ['Give your capstone project your best', 'Prepare thoroughly for viva', 'Network with professionals', 'Plan your career path ahead'] },
};

// Map subjects to possible course categories for matching
const SUBJECT_CATEGORY_MAP: Record<string, string[]> = {
  'Computer Fundamentals': ['cat8', 'cat1'],
  'Programming Fundamentals': ['cat8', 'cat1'],
  'Data Structures': ['cat8'],
  'Digital Electronics': ['cat3'],
  'Object Oriented Programming': ['cat8'],
  'Database Management': ['cat8'],
  'Web Development': ['cat1'],
  'Operating Systems': ['cat8'],
  'Microprocessor': ['cat3'],
  'Computer Networks': ['cat10'],
  'Software Engineering': ['cat8'],
  'Mobile App Development': ['cat2'],
  'Machine Learning': ['cat9'],
  'Cybersecurity': ['cat10'],
  'Cloud Computing': ['cat10'],
  'Data Science': ['cat9'],
};

export function SemesterPageTemplate({ semester }: { semester: number }) {
  const { navigate, goBack } = useNavigationStore();
  const data = SEMESTER_DATA[semester];
  const tips = SEMESTER_TIPS[semester];

  // Find related courses based on subjects
  const relatedCourses = useMemo(() => {
    if (!data) return [];
    const matchedCategoryIds = new Set<string>();
    data.subjects.forEach((subject) => {
      const cats = SUBJECT_CATEGORY_MAP[subject.name];
      if (cats) cats.forEach((c) => matchedCategoryIds.add(c));
    });
    if (matchedCategoryIds.size === 0) return COURSES.slice(0, 4);
    return COURSES.filter((c) => matchedCategoryIds.has(c.categoryId)).slice(0, 6);
  }, [data]);

  const totalCredits = data ? data.subjects.reduce((sum, s) => sum + s.credits, 0) : 0;
  const totalSubjects = data ? data.subjects.length : 0;

  // Simulate some progress for visualization
  const mockProgress = Math.min(semester * 12.5, 100);
  const completedSubjects = Math.min(Math.floor(semester * 0.8), totalSubjects);

  // Semester color gradient
  const semesterColors = [
    'from-sky-400 to-blue-600',
    'from-emerald-400 to-teal-600',
    'from-purple-400 to-indigo-600',
    'from-amber-400 to-orange-600',
    'from-rose-400 to-pink-600',
    'from-cyan-400 to-blue-600',
    'from-violet-400 to-purple-600',
    'from-lime-400 to-green-600',
  ];
  const gradientClass = semesterColors[(semester - 1) % semesterColors.length];

  if (!data) {
    return (
      <AnimatedPage>
        <div className="text-center py-16">
          <p className="text-lg font-bold">Semester not found</p>
          <GradientButton onClick={goBack} className="mt-4">Go Back</GradientButton>
        </div>
      </AnimatedPage>
    );
  }

  return (
    <AnimatedPage keyProp={`semester-${semester}`}>
      <div className="pb-20 lg:pb-0">
        {/* Breadcrumb */}
        <motion.div
          className="flex items-center gap-2 text-sm text-muted-foreground mb-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <button onClick={() => navigate('home')} className="hover:text-sky-500 transition-colors">Home</button>
          <span>/</span>
          <button onClick={() => navigate('explore')} className="hover:text-sky-500 transition-colors">Academics</button>
          <span>/</span>
          <span className="text-foreground font-semibold">{data.title}</span>
        </motion.div>

        {/* Hero Banner */}
        <GlassCard className="overflow-hidden mb-6">
          <div className={`relative aspect-[21/9] md:aspect-[3/1] bg-gradient-to-br ${gradientClass}`}>
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-4 right-8 w-40 h-40 rounded-full border-4 border-white/30" />
              <div className="absolute bottom-4 left-12 w-24 h-24 rounded-full border-4 border-white/20" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent" />
            <div className="absolute inset-0 flex items-center p-6 md:p-10">
              <div>
                <motion.div
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-sm text-white text-xs font-bold mb-3"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <Calendar className="w-3 h-3" />
                  {data.period}
                </motion.div>
                <motion.h1
                  className="text-2xl md:text-4xl font-extrabold text-white mb-2"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  {data.title}
                </motion.h1>
                <motion.p
                  className="text-sm md:text-base text-white/80"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  {totalSubjects} Subjects &middot; {totalCredits} Credits &middot; Semester {semester} of 8
                </motion.p>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Progress Overview */}
        <GlassCard className="p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-sky-500" />
              Overall Progress
            </h2>
            <span className="text-sm font-bold text-sky-500">{Math.round(mockProgress)}%</span>
          </div>
          <ProgressBar value={mockProgress} size="lg" showLabel />
          <div className="grid grid-cols-3 gap-4 mt-4 text-center">
            <div>
              <AnimatedCounter target={completedSubjects} className="text-lg font-extrabold text-foreground" />
              <p className="text-[10px] text-muted-foreground">Completed</p>
            </div>
            <div>
              <span className="text-lg font-extrabold text-foreground">{totalSubjects - completedSubjects}</span>
              <p className="text-[10px] text-muted-foreground">In Progress</p>
            </div>
            <div>
              <span className="text-lg font-extrabold text-foreground">{totalCredits}</span>
              <p className="text-[10px] text-muted-foreground">Total Credits</p>
            </div>
          </div>
        </GlassCard>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Subjects List */}
            <h2 className="text-lg font-extrabold text-foreground mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-sky-500" />
              Subjects
            </h2>
            <div className="space-y-3 mb-8">
              {data.subjects.map((subject, i) => {
                const isCompleted = i < completedSubjects;
                const isCurrent = i === completedSubjects;
                return (
                  <motion.div
                    key={subject.code}
                    initial={{ opacity: 0, x: -15 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.06 }}
                  >
                    <GlassCard className="p-4 flex items-center gap-4" hover={isCurrent}>
                      <motion.div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          isCompleted
                            ? 'bg-emerald-50 dark:bg-emerald-900/20'
                            : isCurrent
                              ? 'bg-sky-50 dark:bg-sky-900/20'
                              : 'bg-muted/30'
                        }`}
                        whileHover={{ scale: 1.05 }}
                      >
                        {isCompleted ? (
                          <CheckCircle className="w-5 h-5 text-emerald-500" />
                        ) : isCurrent ? (
                          <Play className="w-5 h-5 text-sky-500" />
                        ) : (
                          <Circle className="w-5 h-5 text-muted-foreground" />
                        )}
                      </motion.div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className={`text-sm font-bold ${isCompleted ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                            {subject.name}
                          </h3>
                          {isCurrent && (
                            <span className="px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 text-[10px] font-bold">
                              Current
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {subject.code} &middot; {subject.credits} Credits
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {isCompleted && (
                          <span className="text-xs font-bold text-emerald-500">92%</span>
                        )}
                        {isCurrent && (
                          <ProgressBar value={45} size="sm" className="w-16" />
                        )}
                      </div>
                    </GlassCard>
                  </motion.div>
                );
              })}
            </div>

            {/* Related Courses */}
            {relatedCourses.length > 0 && (
              <>
                <h2 className="text-lg font-extrabold text-foreground mb-4 flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-emerald-500" />
                  Recommended Courses
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                  {relatedCourses.map((course, i) => {
                    const instructor = getInstructor(course.instructorId);
                    return (
                      <motion.div
                        key={course.id}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 + i * 0.05 }}
                      >
                        <GlassCard
                          hover
                          className="overflow-hidden cursor-pointer"
                          onClick={() => navigate('course-detail', { courseId: course.id })}
                        >
                          <div className={`h-24 flex items-center justify-center bg-gradient-to-br ${gradientClass} opacity-80`}>
                            <BookOpen className="w-8 h-8 text-white/30" />
                          </div>
                          <div className="p-4">
                            <h3 className="text-sm font-bold text-foreground line-clamp-2 mb-1">{course.title}</h3>
                            {instructor && <p className="text-xs text-muted-foreground mb-2">by {instructor.name}</p>}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                                {course.rating}
                              </div>
                              {course.price === 0 ? (
                                <span className="text-xs font-bold text-emerald-500">Free</span>
                              ) : (
                                <span className="text-xs font-bold text-foreground">&#2547;{course.price}</span>
                              )}
                            </div>
                          </div>
                        </GlassCard>
                      </motion.div>
                    );
                  })}
                </div>
              </>
            )}

            {/* Study Tips */}
            {tips && (
              <>
                <h2 className="text-lg font-extrabold text-foreground mb-4 flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-amber-500" />
                  Study Tips — {tips.title}
                </h2>
                <GlassCard className="p-6 mb-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {tips.tips.map((tip, i) => (
                      <motion.div
                        key={i}
                        className="flex items-start gap-3"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 + i * 0.08 }}
                      >
                        <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center flex-shrink-0">
                          <Target className="w-4 h-4 text-amber-500" />
                        </div>
                        <p className="text-sm text-foreground font-medium">{tip}</p>
                      </motion.div>
                    ))}
                  </div>
                </GlassCard>
              </>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Semester Navigation */}
            <GlassCard className="p-6">
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">Semester Navigation</h3>
              <div className="grid grid-cols-4 gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                  <motion.button
                    key={s}
                    className={`w-full aspect-square rounded-xl flex items-center justify-center text-sm font-bold transition-all ${
                      s === semester
                        ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/30'
                        : s < semester
                          ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                          : 'bg-muted/30 text-muted-foreground'
                    }`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {s}
                  </motion.button>
                ))}
              </div>
              <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-emerald-500" /> Completed
                </span>
                <span className="flex items-center gap-1">
                  <Circle className="w-3 h-3" /> Upcoming
                </span>
              </div>
            </GlassCard>

            {/* Credit Summary */}
            <GlassCard className="p-6">
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">Credit Distribution</h3>
              <div className="space-y-3">
                {data.subjects.map((subject) => (
                  <div key={subject.code} className="flex items-center justify-between">
                    <span className="text-xs font-medium text-foreground line-clamp-1 flex-1 mr-2">{subject.name}</span>
                    <span className="text-xs font-bold text-muted-foreground flex-shrink-0">{subject.credits} Cr</span>
                  </div>
                ))}
                <div className="border-t border-white/20 dark:border-white/5 pt-3 flex items-center justify-between">
                  <span className="text-xs font-bold text-foreground">Total Credits</span>
                  <span className="text-sm font-extrabold text-sky-500">{totalCredits}</span>
                </div>
              </div>
            </GlassCard>

            {/* Key Dates */}
            <GlassCard className="p-6">
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">Key Dates</h3>
              <div className="space-y-3">
                {[
                  { event: 'Classes Begin', date: 'Jan 15, 2025', icon: Calendar },
                  { event: 'Mid-Term Exam', date: 'Mar 10, 2025', icon: BookMarked },
                  { event: 'Final Exam', date: 'May 20, 2025', icon: Award },
                  { event: 'Result Published', date: 'Jul 05, 2025', icon: TrendingUp },
                ].map((item, i) => (
                  <motion.div
                    key={item.event}
                    className="flex items-center gap-3"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + i * 0.05 }}
                  >
                    <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-900/20 flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-4 h-4 text-sky-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground">{item.event}</p>
                      <p className="text-[10px] text-muted-foreground">{item.date}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </GlassCard>

            {/* Quick Stats */}
            <GlassCard className="p-6">
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">Semester Stats</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Semester</span>
                  <span className="font-semibold text-foreground">{semester} of 8</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Year</span>
                  <span className="font-semibold text-foreground">{Math.ceil(semester / 2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subjects</span>
                  <span className="font-semibold text-foreground">{totalSubjects}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Credits</span>
                  <span className="font-semibold text-foreground">{totalCredits}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Avg. Study Hours</span>
                  <span className="font-semibold text-foreground">{totalCredits * 3}h/week</span>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      </div>
    </AnimatedPage>
  );
}
