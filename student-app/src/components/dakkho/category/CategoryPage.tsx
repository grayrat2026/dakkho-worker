'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, Globe, Smartphone, Cpu, Zap, Wrench, Building2, Ruler, Code, BarChart3, Wifi, Palette, Scissors } from 'lucide-react';
import { useNavigationStore } from '@/lib/store';
import { getCategory, getCategoryCourses, CATEGORIES, COURSES } from '@/lib/mock-data';
import { courseApi, technologyApi } from '@/lib/api-client';
import { mapApiCourses, mapTechnologiesToCategories } from '../shared/apiMappers';
import type { Category, Course } from '@/lib/mock-data';
import { CourseCardGrid } from '../shared/CourseCardGrid';
import { GradientButton } from '../shared/GradientButton';
import { GlassCard } from '../shared/GlassCard';
import { CourseCardSkeleton, LoadingSkeleton } from '../shared/LoadingSkeleton';

const iconMap: Record<string, React.ElementType> = {
  Globe, Smartphone, Cpu, Zap, Wrench, Building2, Ruler, Code, BarChart3, Wifi, Palette, Scissors,
};

export function CategoryPage() {
  const { pageParams, goBack, navigate } = useNavigationStore();
  const categoryId = pageParams.categoryId as string;

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

  // Helper to find category by id
  const findCategory = (id: string) => categories.find((c) => c.id === id);

  // Helper to get courses for a category
  const getCoursesForCategory = (catId: string) => courses.filter((c) => c.categoryId === catId);

  // If no specific category, show all categories grid
  if (!categoryId) {
    return (
      <div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-2xl font-extrabold text-foreground mb-2">Categories</h1>
          <p className="text-sm text-muted-foreground mb-6">Browse courses by category</p>
        </motion.div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <LoadingSkeleton key={i} type="card" className="h-40" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {categories.map((cat, i) => {
              const Icon = iconMap[cat.icon] || Globe;
              return (
                <motion.div
                  key={cat.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <GlassCard
                    hover
                    className="p-4 cursor-pointer text-center"
                    onClick={() => navigate('category', { categoryId: cat.id })}
                  >
                    <motion.div
                      className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center"
                      style={{ backgroundColor: cat.color + '15' }}
                      whileHover={{ scale: 1.1, rotate: 5 }}
                    >
                      <Icon className="w-6 h-6" style={{ color: cat.color }} />
                    </motion.div>
                    <h3 className="font-bold text-sm text-foreground mb-1">{cat.name}</h3>
                    <p className="text-xs text-muted-foreground">{cat.courseCount} courses</p>
                  </GlassCard>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Show specific category with its courses
  const category = findCategory(categoryId);
  const categoryCourses = getCoursesForCategory(categoryId);

  if (!category) {
    return (
      <div>
        <motion.button
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
          onClick={goBack}
          whileHover={{ x: -3 }}
        >
          <ChevronLeft className="w-4 h-4" />
          Go Back
        </motion.button>
        <div className="text-center py-16">
          <p className="text-lg font-bold">Category not found</p>
          <GradientButton onClick={() => navigate('category')} className="mt-4">Browse All Categories</GradientButton>
        </div>
      </div>
    );
  }

  const Icon = iconMap[category.icon] || Globe;

  return (
    <div>
      <motion.button
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
        onClick={() => navigate('category')}
        whileHover={{ x: -3 }}
      >
        <ChevronLeft className="w-4 h-4" />
        All Categories
      </motion.button>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: category.color + '15' }}
          >
            <Icon className="w-5 h-5" style={{ color: category.color }} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-foreground">{category.name}</h1>
            <p className="text-sm text-muted-foreground">
              {categoryCourses.length} course{categoryCourses.length !== 1 ? 's' : ''} available
            </p>
          </div>
        </div>
      </motion.div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <CourseCardSkeleton key={i} />
          ))}
        </div>
      ) : categoryCourses.length > 0 ? (
        <CourseCardGrid courses={categoryCourses} />
      ) : (
        <div className="text-center py-16">
          <p className="text-sm text-muted-foreground">No courses in this category yet</p>
          <GradientButton onClick={() => navigate('explore')} className="mt-4">Explore All Courses</GradientButton>
        </div>
      )}
    </div>
  );
}
