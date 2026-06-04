'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, SlidersHorizontal } from 'lucide-react';
import { CATEGORIES, COURSES, getCategory } from '@/lib/mock-data';
import { courseApi, technologyApi } from '@/lib/api-client';
import { mapApiCourses, mapTechnologiesToCategories } from '../shared/apiMappers';
import type { Course, Category } from '@/lib/mock-data';
import { CourseCardGrid } from '../shared/CourseCardGrid';
import { CourseCardSkeleton } from '../shared/LoadingSkeleton';

export function ExplorePage() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const [categories, setCategories] = useState<Category[]>(CATEGORIES);
  const [courses, setCourses] = useState<Course[]>(COURSES);
  const [loading, setLoading] = useState(true);

  // Fetch categories (technologies) from API
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await technologyApi.list();
        if (!cancelled && result.technologies?.length) {
          setCategories(mapTechnologiesToCategories(result.technologies));
        }
      } catch {
        // Keep mock fallback
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Fetch courses from API
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await courseApi.list({ limit: 50 });
        if (!cancelled && result.courses?.length) {
          setCourses(mapApiCourses(result.courses));
        }
      } catch {
        // Keep mock fallback
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const levels = ['beginner', 'intermediate', 'advanced', 'expert'];

  const filteredCourses = courses.filter((c) => {
    const matchesCategory = !selectedCategory || c.categoryId === selectedCategory;
    const matchesLevel = !selectedLevel || c.level === selectedLevel;
    const matchesSearch = !searchQuery ||
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesLevel && matchesSearch;
  });

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-extrabold text-foreground mb-2">Explore</h1>
        <p className="text-muted-foreground text-sm mb-6">Discover courses across all categories</p>
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
          placeholder="Search courses, topics, instructors..."
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

      {/* Category grid */}
      <motion.div
        className="mb-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
          <motion.button
            className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
              !selectedCategory
                ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-md'
                : 'bg-white/70 dark:bg-slate-800/70 text-foreground border border-white/50 dark:border-white/10'
            }`}
            onClick={() => setSelectedCategory(null)}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            All
          </motion.button>
          {categories.map((cat) => (
            <motion.button
              key={cat.id}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                selectedCategory === cat.id
                  ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white shadow-md'
                  : 'bg-white/70 dark:bg-slate-800/70 text-foreground border border-white/50 dark:border-white/10'
              }`}
              onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              {cat.name}
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Filters */}
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
                <p className="text-xs font-bold text-muted-foreground uppercase mb-2">Level</p>
                <div className="flex gap-2 flex-wrap">
                  {levels.map((level) => (
                    <motion.button
                      key={level}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold ${
                        selectedLevel === level
                          ? 'bg-sky-500 text-white'
                          : 'bg-muted/50 text-muted-foreground'
                      }`}
                      onClick={() => setSelectedLevel(selectedLevel === level ? null : level)}
                      whileTap={{ scale: 0.95 }}
                    >
                      {level.charAt(0).toUpperCase() + level.slice(1)}
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
            'Loading courses...'
          ) : (
            <>
              <span className="font-bold text-foreground">{filteredCourses.length}</span> courses found
            </>
          )}
        </p>
      </div>

      {/* Course grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <CourseCardSkeleton key={i} />
          ))}
        </div>
      ) : filteredCourses.length > 0 ? (
        <CourseCardGrid courses={filteredCourses} />
      ) : (
        <div className="text-center py-16">
          <p className="text-lg font-bold text-foreground mb-2">No courses found</p>
          <p className="text-sm text-muted-foreground">Try different filters or search terms</p>
        </div>
      )}
    </div>
  );
}
