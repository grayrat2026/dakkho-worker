'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  BookOpen, Star, Users, Clock, Filter, Search,
  GraduationCap, ArrowRight, Grid3X3, List,
} from 'lucide-react';
import { useNavigationStore } from '@/lib/store';
import { getInstructor, getInstructorCourses, formatDuration, getLevelColor } from '@/lib/mock-data';
import { GlassCard } from '../shared/GlassCard';
import { AnimatedPage } from '../shared/AnimatedPage';
import { GradientButton } from '../shared/GradientButton';

export function InstructorCoursesPage() {
  const { pageParams, navigate, goBack } = useNavigationStore();
  const instructorId = pageParams.instructorId as string;
  const instructor = getInstructor(instructorId);
  const courses = getInstructorCourses(instructorId);

  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  if (!instructor) {
    return (
      <AnimatedPage>
        <div className="text-center py-16">
          <p className="text-lg font-bold">Instructor not found</p>
          <GradientButton onClick={goBack} className="mt-4">Go Back</GradientButton>
        </div>
      </AnimatedPage>
    );
  }

  const filteredCourses = courses.filter((course) => {
    if (levelFilter !== 'all' && course.level !== levelFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return course.title.toLowerCase().includes(q) || course.tags.some((t) => t.toLowerCase().includes(q));
    }
    return true;
  });

  const totalStudents = courses.reduce((sum, c) => sum + c.totalStudents, 0);
  const avgRating = courses.length > 0 ? (courses.reduce((sum, c) => sum + c.rating, 0) / courses.length).toFixed(1) : '0';

  const coverColors = [
    'from-sky-400 to-blue-600',
    'from-emerald-400 to-teal-600',
    'from-purple-400 to-indigo-600',
    'from-amber-400 to-orange-600',
    'from-rose-400 to-pink-600',
  ];

  return (
    <AnimatedPage keyProp={`instructor-courses-${instructorId}`}>
      <div className="pb-20 lg:pb-0">
        {/* Breadcrumb */}
        <motion.div className="flex items-center gap-2 text-sm text-muted-foreground mb-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <button onClick={() => navigate('home')} className="hover:text-sky-500 transition-colors">Home</button>
          <span>/</span>
          <button onClick={() => navigate('instructor-profile', { instructorId })} className="hover:text-sky-500 transition-colors">{instructor.name}</button>
          <span>/</span>
          <span className="text-foreground font-semibold">Courses</span>
        </motion.div>

        {/* Header */}
        <GlassCard className="p-6 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <motion.div
              className="w-14 h-14 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white text-xl font-extrabold shadow-lg"
              whileHover={{ scale: 1.05 }}
            >
              {instructor.name.charAt(0)}
            </motion.div>
            <div>
              <h1 className="text-lg font-extrabold text-foreground">Courses by {instructor.name}</h1>
              <p className="text-sm text-sky-500 font-semibold">{instructor.specialization}</p>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-3 rounded-xl bg-muted/30">
              <p className="text-lg font-extrabold text-foreground">{courses.length}</p>
              <p className="text-[10px] text-muted-foreground">Total Courses</p>
            </div>
            <div className="p-3 rounded-xl bg-muted/30">
              <p className="text-lg font-extrabold text-foreground">{totalStudents.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground">Total Students</p>
            </div>
            <div className="p-3 rounded-xl bg-muted/30">
              <p className="text-lg font-extrabold text-foreground">{avgRating}</p>
              <p className="text-[10px] text-muted-foreground">Avg Rating</p>
            </div>
          </div>
        </GlassCard>

        {/* Search and Filter */}
        <GlassCard className="p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search courses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-muted/30 border border-white/30 dark:border-white/10 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/50"
              />
            </div>
            <div className="flex gap-2 items-center">
              {['all', 'beginner', 'intermediate', 'advanced'].map((level) => (
                <motion.button
                  key={level}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold capitalize ${
                    levelFilter === level ? 'bg-sky-500 text-white' : 'bg-muted/30 text-muted-foreground'
                  }`}
                  onClick={() => setLevelFilter(level)}
                  whileTap={{ scale: 0.95 }}
                >
                  {level}
                </motion.button>
              ))}
              <div className="border-l border-white/20 dark:border-white/5 pl-2 ml-1 flex gap-1">
                <motion.button
                  className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-sky-50 dark:bg-sky-900/20 text-sky-500' : 'text-muted-foreground'}`}
                  onClick={() => setViewMode('grid')}
                  whileTap={{ scale: 0.95 }}
                >
                  <Grid3X3 className="w-4 h-4" />
                </motion.button>
                <motion.button
                  className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-sky-50 dark:bg-sky-900/20 text-sky-500' : 'text-muted-foreground'}`}
                  onClick={() => setViewMode('list')}
                  whileTap={{ scale: 0.95 }}
                >
                  <List className="w-4 h-4" />
                </motion.button>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Courses */}
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredCourses.map((course, i) => (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <GlassCard hover className="overflow-hidden cursor-pointer" onClick={() => navigate('course-detail', { courseId: course.id })}>
                  <div className={`h-28 flex items-center justify-center bg-gradient-to-br ${coverColors[i % coverColors.length]}`}>
                    <BookOpen className="w-10 h-10 text-white/30" />
                    <div className="absolute top-2 right-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white backdrop-blur-sm capitalize">{course.level}</span>
                    </div>
                    {course.price === 0 && (
                      <div className="absolute top-2 left-2">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500 text-white">Free</span>
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="text-sm font-bold text-foreground line-clamp-2 mb-2">{course.title}</h3>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Star className="w-3 h-3 text-amber-400 fill-amber-400" />{course.rating}</span>
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" />{course.totalStudents}</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDuration(course.duration)}</span>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      {course.price > 0 ? (
                        <span className="text-sm font-extrabold text-foreground">&#2547;{course.price}</span>
                      ) : (
                        <span className="text-sm font-extrabold text-emerald-500">Free</span>
                      )}
                      <span className="text-xs text-muted-foreground">{course.totalVideos} videos</span>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredCourses.map((course, i) => (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <GlassCard hover className="p-4 flex items-center gap-4 cursor-pointer" onClick={() => navigate('course-detail', { courseId: course.id })}>
                  <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${coverColors[i % coverColors.length]} flex items-center justify-center flex-shrink-0`}>
                    <BookOpen className="w-6 h-6 text-white/40" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-foreground line-clamp-1">{course.title}</h3>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Star className="w-3 h-3 text-amber-400 fill-amber-400" />{course.rating}</span>
                      <span>{course.totalStudents} students</span>
                      <span className="capitalize">{course.level}</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {course.price > 0 ? (
                      <span className="text-sm font-extrabold text-foreground">&#2547;{course.price}</span>
                    ) : (
                      <span className="text-sm font-extrabold text-emerald-500">Free</span>
                    )}
                    <div className="flex items-center gap-1 text-xs text-sky-500 font-semibold mt-1">
                      View <ArrowRight className="w-3 h-3" />
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        )}

        {filteredCourses.length === 0 && (
          <GlassCard className="p-8 text-center">
            <GraduationCap className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No courses found matching your filters.</p>
          </GlassCard>
        )}
      </div>
    </AnimatedPage>
  );
}
