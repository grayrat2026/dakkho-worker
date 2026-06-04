'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, SlidersHorizontal, Star, Users, BookOpen, ArrowRight, Filter } from 'lucide-react';
import { INSTRUCTORS } from '@/lib/mock-data';
import { instructorApi } from '@/lib/api-client';
import { mapApiInstructors } from '../shared/apiMappers';
import type { Instructor } from '@/lib/mock-data';
import { useNavigationStore } from '@/lib/store';
import { GlassCard } from '../shared/GlassCard';
import { LoadingSkeleton } from '../shared/LoadingSkeleton';

const AVATAR_GRADIENTS = [
  'from-sky-400 to-blue-600',
  'from-emerald-400 to-teal-600',
  'from-purple-400 to-indigo-600',
  'from-amber-400 to-orange-600',
  'from-rose-400 to-pink-600',
  'from-cyan-400 to-sky-600',
  'from-lime-400 to-green-600',
  'from-fuchsia-400 to-purple-600',
  'from-red-400 to-rose-600',
  'from-teal-400 to-cyan-600',
];

export function InstructorsPage() {
  const navigate = useNavigationStore((s) => s.navigate);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialization, setSelectedSpecialization] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const [instructors, setInstructors] = useState<Instructor[]>(INSTRUCTORS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await instructorApi.list();
        if (!cancelled && result.instructors?.length) {
          setInstructors(mapApiInstructors(result.instructors));
        }
      } catch {
        // Keep mock fallback
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const SPECIALIZATIONS = Array.from(new Set(instructors.map((i) => i.specialization)));

  const filteredInstructors = instructors.filter((instructor) => {
    const matchesSearch = !searchQuery ||
      instructor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      instructor.specialization.toLowerCase().includes(searchQuery.toLowerCase()) ||
      instructor.bio.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSpec = !selectedSpecialization || instructor.specialization === selectedSpecialization;
    return matchesSearch && matchesSpec;
  });

  return (
    <div>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-extrabold text-foreground mb-2">Instructors</h1>
        <p className="text-muted-foreground text-sm mb-6">
          Learn from the best polytechnic instructors across Bangladesh
        </p>
      </motion.div>

      {/* Search bar */}
      <motion.div
        className="relative mb-6"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search instructors by name, specialization..."
          className="w-full pl-12 pr-12 py-3.5 rounded-2xl bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-white/50 dark:border-white/10 shadow-lg shadow-sky-500/5 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 transition-all text-sm"
        />
        <motion.button
          className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-xl bg-muted/50 flex items-center justify-center"
          onClick={() => setShowFilters(!showFilters)}
          whileTap={{ scale: 0.9 }}
        >
          <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
        </motion.button>
      </motion.div>

      {/* Specialization pills */}
      <motion.div
        className="mb-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
          <motion.button
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
              !selectedSpecialization
                ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-md'
                : 'bg-white/70 dark:bg-slate-800/70 text-foreground border border-white/50 dark:border-white/10'
            }`}
            onClick={() => setSelectedSpecialization(null)}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            All
          </motion.button>
          {SPECIALIZATIONS.map((spec) => (
            <motion.button
              key={spec}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                selectedSpecialization === spec
                  ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-md'
                  : 'bg-white/70 dark:bg-slate-800/70 text-foreground border border-white/50 dark:border-white/10'
              }`}
              onClick={() => setSelectedSpecialization(selectedSpecialization === spec ? null : spec)}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              {spec}
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Filters panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6"
          >
            <div className="p-4 glass-card space-y-3">
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase mb-2">Sort By</p>
                <div className="flex gap-2 flex-wrap">
                  {['Rating', 'Students', 'Courses'].map((sort) => (
                    <motion.button
                      key={sort}
                      className="px-3 py-1.5 rounded-full text-xs font-semibold bg-muted/50 text-muted-foreground hover:bg-sky-500 hover:text-white transition-colors"
                      whileTap={{ scale: 0.95 }}
                    >
                      {sort}
                    </motion.button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase mb-2">View</p>
                <div className="flex gap-2">
                  {(['grid', 'list'] as const).map((mode) => (
                    <motion.button
                      key={mode}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                        viewMode === mode ? 'bg-sky-500 text-white' : 'bg-muted/50 text-muted-foreground'
                      }`}
                      onClick={() => setViewMode(mode)}
                      whileTap={{ scale: 0.95 }}
                    >
                      {mode.charAt(0).toUpperCase() + mode.slice(1)}
                    </motion.button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results count */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          {loading ? (
            'Loading instructors...'
          ) : (
            <>
              <span className="font-bold text-foreground">{filteredInstructors.length}</span> instructors found
            </>
          )}
        </p>
      </div>

      {/* Instructor Grid / List */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <LoadingSkeleton key={i} type="card" className="h-56" />
          ))}
        </div>
      ) : filteredInstructors.length > 0 ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredInstructors.map((instructor, i) => {
              const gradient = AVATAR_GRADIENTS[i % AVATAR_GRADIENTS.length];
              return (
                <motion.div
                  key={instructor.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <GlassCard
                    hover
                    className="p-5 text-center cursor-pointer"
                    onClick={() => navigate('instructor-profile', { instructorId: instructor.id })}
                  >
                    {/* Avatar */}
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

                    {/* Rating */}
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

                    {/* View Profile */}
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
        ) : (
          <div className="space-y-3">
            {filteredInstructors.map((instructor, i) => {
              const gradient = AVATAR_GRADIENTS[i % AVATAR_GRADIENTS.length];
              return (
                <motion.div
                  key={instructor.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <GlassCard
                    hover
                    className="p-4 cursor-pointer flex items-center gap-4"
                    onClick={() => navigate('instructor-profile', { instructorId: instructor.id })}
                  >
                    {/* Avatar */}
                    <div className={`w-14 h-14 flex-shrink-0 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white text-lg font-extrabold shadow-lg`}>
                      {instructor.name.charAt(0)}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-foreground line-clamp-1">{instructor.name}</h3>
                      <p className="text-xs text-sky-500 font-semibold line-clamp-1">{instructor.specialization}</p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{instructor.bio}</p>
                    </div>

                    {/* Stats */}
                    <div className="flex-shrink-0 text-right">
                      <div className="flex items-center gap-1 justify-end">
                        <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                        <span className="text-sm font-bold text-foreground">{instructor.rating}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {instructor.totalStudents.toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <BookOpen className="w-3 h-3" />
                          {instructor.totalCourses}
                        </span>
                      </div>
                    </div>

                    {/* Arrow */}
                    <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  </GlassCard>
                </motion.div>
              );
            })}
          </div>
        )
      ) : (
        <div className="text-center py-16">
          <p className="text-lg font-bold text-foreground mb-2">No instructors found</p>
          <p className="text-sm text-muted-foreground">Try different filters or search terms</p>
        </div>
      )}
    </div>
  );
}
