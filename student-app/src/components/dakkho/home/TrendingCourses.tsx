'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp } from 'lucide-react';
import { COURSES } from '@/lib/mock-data';
import { courseApi } from '@/lib/api-client';
import { mapApiCourses } from '../shared/apiMappers';
import type { Course } from '@/lib/mock-data';
import { CourseCardGrid } from '../shared/CourseCardGrid';
import { CourseCardSkeleton } from '../shared/LoadingSkeleton';

export function TrendingCourses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await courseApi.list({ limit: 20 });
        if (!cancelled && result.courses?.length) {
          const mapped = mapApiCourses(result.courses);
          // Featured courses or most popular as trending
          const trending = mapped.filter((c) => c.isFeatured).slice(0, 8);
          setCourses(trending.length > 0 ? trending : mapped.slice(0, 8));
        } else if (!cancelled) {
          setCourses(COURSES.filter((c) => c.isFeatured).slice(0, 8));
        }
      } catch {
        if (!cancelled) setCourses(COURSES.filter((c) => c.isFeatured).slice(0, 8));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-sky-500" />
          <h2 className="text-lg font-extrabold text-foreground">Trending Courses</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <CourseCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-5 h-5 text-sky-500" />
        <h2 className="text-lg font-extrabold text-foreground">Trending Courses</h2>
      </div>
      <CourseCardGrid courses={courses} />
    </div>
  );
}
