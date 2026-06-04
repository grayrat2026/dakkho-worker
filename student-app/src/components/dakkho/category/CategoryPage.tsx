'use client';

import { motion } from 'framer-motion';
import { ChevronLeft, Globe, Smartphone, Cpu, Zap, Wrench, Building2, Ruler, Code, BarChart3, Wifi, Palette, Scissors } from 'lucide-react';
import { useNavigationStore } from '@/lib/store';
import { getCategory, getCategoryCourses, CATEGORIES } from '@/lib/mock-data';
import { CourseCardGrid } from '../shared/CourseCardGrid';
import { GradientButton } from '../shared/GradientButton';
import { GlassCard } from '../shared/GlassCard';

const iconMap: Record<string, React.ElementType> = {
  Globe, Smartphone, Cpu, Zap, Wrench, Building2, Ruler, Code, BarChart3, Wifi, Palette, Scissors,
};

export function CategoryPage() {
  const { pageParams, goBack, navigate } = useNavigationStore();
  const categoryId = pageParams.categoryId as string;

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

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {CATEGORIES.map((cat, i) => {
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
      </div>
    );
  }

  // Show specific category with its courses
  const category = getCategory(categoryId);
  const courses = getCategoryCourses(categoryId);

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
              {courses.length} course{courses.length !== 1 ? 's' : ''} available
            </p>
          </div>
        </div>
      </motion.div>

      {courses.length > 0 ? (
        <CourseCardGrid courses={courses} />
      ) : (
        <div className="text-center py-16">
          <p className="text-sm text-muted-foreground">No courses in this category yet</p>
          <GradientButton onClick={() => navigate('explore')} className="mt-4">Explore All Courses</GradientButton>
        </div>
      )}
    </div>
  );
}
