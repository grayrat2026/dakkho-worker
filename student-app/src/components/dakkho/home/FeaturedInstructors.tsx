'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Star, Users, BookOpen, ArrowRight } from 'lucide-react';
import { useNavigationStore } from '@/lib/store';
import { INSTRUCTORS } from '@/lib/mock-data';
import { instructorApi } from '@/lib/api-client';
import { mapApiInstructors } from '../shared/apiMappers';
import type { Instructor } from '@/lib/mock-data';
import { LoadingSkeleton } from '../shared/LoadingSkeleton';
import { GlassCard } from '../shared/GlassCard';

const AVATAR_GRADIENTS = [
  'from-sky-400 to-blue-600',
  'from-emerald-400 to-teal-600',
  'from-purple-400 to-indigo-600',
  'from-amber-400 to-orange-600',
  'from-rose-400 to-pink-600',
  'from-cyan-400 to-sky-600',
];

export function FeaturedInstructors() {
  const navigate = useNavigationStore((s) => s.navigate);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await instructorApi.list({ limit: 6 });
        if (!cancelled && result.instructors?.length) {
          setInstructors(mapApiInstructors(result.instructors).slice(0, 6));
        } else if (!cancelled) {
          setInstructors(INSTRUCTORS.slice(0, 6));
        }
      } catch {
        if (!cancelled) setInstructors(INSTRUCTORS.slice(0, 6));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir === 'left' ? -300 : 300, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-extrabold text-foreground">Featured Instructors</h2>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
          <LoadingSkeleton type="card" count={3} className="w-60 h-56 flex-shrink-0" />
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-extrabold text-foreground">Featured Instructors</h2>
        <div className="flex gap-2">
          <motion.button
            className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center"
            onClick={() => scroll('left')}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <ChevronLeft className="w-4 h-4" />
          </motion.button>
          <motion.button
            className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center"
            onClick={() => scroll('right')}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <ChevronRight className="w-4 h-4" />
          </motion.button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-2"
        style={{ scrollbarWidth: 'none' }}
      >
        {instructors.map((instructor, i) => {
          const gradient = AVATAR_GRADIENTS[i % AVATAR_GRADIENTS.length];
          return (
            <motion.div
              key={instructor.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex-shrink-0 w-60"
            >
              <GlassCard
                hover
                className="p-5 text-center cursor-pointer"
                onClick={() => navigate('instructor-profile', { instructorId: instructor.id })}
              >
                {/* Avatar with gradient and initial */}
                <motion.div
                  className={`w-16 h-16 mx-auto rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white text-xl font-extrabold mb-3 shadow-lg`}
                  whileHover={{ scale: 1.1 }}
                >
                  {instructor.name.charAt(0)}
                </motion.div>

                {/* Name */}
                <h3 className="text-sm font-bold text-foreground line-clamp-1">{instructor.name}</h3>

                {/* Specialization */}
                <p className="text-xs text-sky-500 font-semibold mt-0.5 line-clamp-1">{instructor.specialization}</p>

                {/* Rating stars */}
                <div className="flex items-center justify-center gap-1 mt-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-3 h-3 ${
                        star <= Math.floor(instructor.rating)
                          ? 'text-amber-400 fill-amber-400'
                          : star <= instructor.rating
                            ? 'text-amber-400 fill-amber-200'
                            : 'text-muted'
                      }`}
                    />
                  ))}
                  <span className="text-xs font-semibold text-foreground ml-1">{instructor.rating}</span>
                </div>

                {/* Stats */}
                <div className="flex items-center justify-center gap-4 mt-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {instructor.totalStudents.toLocaleString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <BookOpen className="w-3 h-3" />
                    {instructor.totalCourses}
                  </span>
                </div>

                {/* View Profile button */}
                <motion.button
                  className="mt-3 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 text-xs font-semibold"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate('instructor-profile', { instructorId: instructor.id });
                  }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  View Profile
                  <ArrowRight className="w-3 h-3" />
                </motion.button>
              </GlassCard>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
