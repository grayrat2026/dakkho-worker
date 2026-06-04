'use client';

import { motion } from 'framer-motion';
import { Star, Users, Clock, Play, BookOpen } from 'lucide-react';
import { getInstructor, getCategory, formatDuration, getLevelColor } from '@/lib/mock-data';
import { useNavigationStore, useBookmarkStore } from '@/lib/store';
import { GlassCard } from './GlassCard';
import { ProgressBar } from './ProgressBar';
import { Heart } from 'lucide-react';
import type { Course } from '@/lib/mock-data';

interface CourseCardProps {
  course: Course;
  showProgress?: boolean;
  progress?: number;
  index?: number;
}

export function CourseCard({ course, showProgress = false, progress = 0, index = 0 }: CourseCardProps) {
  const navigate = useNavigationStore((s) => s.navigate);
  const { isBookmarked, toggleBookmark } = useBookmarkStore();
  const instructor = getInstructor(course.instructorId);
  const category = getCategory(course.categoryId);
  const bookmarked = isBookmarked(course.id);

  const thumbnailColors = [
    'from-sky-400 to-blue-600',
    'from-emerald-400 to-teal-600',
    'from-purple-400 to-indigo-600',
    'from-amber-400 to-orange-600',
    'from-rose-400 to-pink-600',
    'from-cyan-400 to-sky-600',
  ];
  const colorClass = thumbnailColors[course.id.charCodeAt(1) % thumbnailColors.length];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
    >
      <GlassCard
        hover
        className="overflow-hidden cursor-pointer group"
        onClick={() => navigate('course-detail', { courseId: course.id })}
      >
        {/* Thumbnail */}
        <div className={`relative aspect-video bg-gradient-to-br ${colorClass} overflow-hidden`}>
          <div className="absolute inset-0 flex items-center justify-center">
            <BookOpen className="w-12 h-12 text-white/30" />
          </div>
          {/* Play overlay on hover */}
          <motion.div
            className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <motion.div
              className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center"
              initial={{ scale: 0.5 }}
              whileHover={{ scale: 1 }}
            >
              <Play className="w-6 h-6 text-sky-600 ml-1" fill="currentColor" />
            </motion.div>
          </motion.div>
          {/* Level badge */}
          <span
            className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold text-white bg-black/40 backdrop-blur-sm"
            style={{ borderColor: getLevelColor(course.level) }}
          >
            {course.level.charAt(0).toUpperCase() + course.level.slice(1)}
          </span>
          {/* Price badge */}
          {course.price > 0 ? (
            <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold text-white bg-emerald-500/80 backdrop-blur-sm">
              ৳{course.price}
            </span>
          ) : (
            <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold text-white bg-sky-500/80 backdrop-blur-sm">
              Free
            </span>
          )}
          {/* Bookmark */}
          <motion.button
            className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center"
            onClick={(e) => { e.stopPropagation(); toggleBookmark(course.id); }}
            whileTap={{ scale: 0.8 }}
          >
            <Heart className={`w-4 h-4 ${bookmarked ? 'text-red-400 fill-red-400' : 'text-white'}`} />
          </motion.button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-2">
          {category && (
            <span className="text-[10px] font-semibold text-sky-500 uppercase tracking-wider">
              {category.name}
            </span>
          )}
          <h3 className="font-bold text-sm text-foreground line-clamp-2 leading-tight">
            {course.title}
          </h3>
          {instructor && (
            <p className="text-xs text-muted-foreground">{instructor.name}</p>
          )}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
              {course.rating}
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {course.totalStudents}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDuration(course.duration)}
            </span>
          </div>
          {showProgress && (
            <ProgressBar value={progress} size="sm" showLabel />
          )}
        </div>
      </GlassCard>
    </motion.div>
  );
}

interface CourseCardGridProps {
  courses: Course[];
  showProgress?: boolean;
  getProgress?: (courseId: string) => number;
}

export function CourseCardGrid({ courses, showProgress = false, getProgress }: CourseCardGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {courses.map((course, i) => (
        <CourseCard
          key={course.id}
          course={course}
          showProgress={showProgress}
          progress={getProgress ? getProgress(course.id) : 0}
          index={i}
        />
      ))}
    </div>
  );
}
