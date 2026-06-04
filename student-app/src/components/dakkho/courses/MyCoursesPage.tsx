'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Clock, CheckCircle } from 'lucide-react';
import { COURSES } from '@/lib/mock-data';
import { CourseCardGrid } from '../shared/CourseCardGrid';

export function MyCoursesPage() {
  const [activeTab, setActiveTab] = useState<'in-progress' | 'completed' | 'all'>('all');

  // Mock enrolled courses
  const enrolledCourses = COURSES.slice(0, 8);
  const inProgress = enrolledCourses.slice(0, 5);
  const completed = enrolledCourses.slice(5, 8);

  const displayCourses = activeTab === 'in-progress' ? inProgress :
    activeTab === 'completed' ? completed : enrolledCourses;

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-extrabold text-foreground mb-2">My Courses</h1>
        <p className="text-sm text-muted-foreground mb-6">Track your learning progress</p>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-muted/30 rounded-xl p-1">
        {[
          { key: 'all' as const, label: 'All', icon: BookOpen },
          { key: 'in-progress' as const, label: 'In Progress', icon: Clock },
          { key: 'completed' as const, label: 'Completed', icon: CheckCircle },
        ].map((tab) => (
          <motion.button
            key={tab.key}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all ${
              activeTab === tab.key
                ? 'bg-white dark:bg-slate-800 shadow-sm text-sky-600 dark:text-sky-400'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setActiveTab(tab.key)}
            whileTap={{ scale: 0.97 }}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </motion.button>
        ))}
      </div>

      {/* Course grid */}
      <CourseCardGrid
        courses={displayCourses}
        showProgress
        getProgress={(courseId) => {
          const idx = enrolledCourses.findIndex((c) => c.id === courseId);
          if (activeTab === 'completed') return 100;
          if (activeTab === 'in-progress') return Math.floor(Math.random() * 80) + 10;
          return idx < 5 ? Math.floor(Math.random() * 80) + 10 : 100;
        }}
      />
    </div>
  );
}
