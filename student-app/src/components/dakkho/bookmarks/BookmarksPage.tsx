'use client';

import { motion } from 'framer-motion';
import { Bookmark, Trash2 } from 'lucide-react';
import { useBookmarkStore, useNavigationStore } from '@/lib/store';
import { COURSES } from '@/lib/mock-data';
import { CourseCardGrid } from '../shared/CourseCardGrid';
import { EmptyState } from '../shared/EmptyState';
import { toast } from 'sonner';

export function BookmarksPage() {
  const { bookmarks, toggleBookmark } = useBookmarkStore();
  const navigate = useNavigationStore((s) => s.navigate);

  const bookmarkedCourses = COURSES.filter((c) => bookmarks.includes(c.id));

  const handleRemove = (courseId: string) => {
    const course = COURSES.find((c) => c.id === courseId);
    toggleBookmark(courseId);
    toast.success(`Removed "${course?.title || 'Course'}" from bookmarks`, {
      action: {
        label: 'Undo',
        onClick: () => toggleBookmark(courseId),
      },
    });
  };

  return (
    <div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl font-extrabold text-foreground mb-2">Bookmarks</h1>
        <p className="text-sm text-muted-foreground mb-6">
          {bookmarkedCourses.length} saved course{bookmarkedCourses.length !== 1 ? 's' : ''}
        </p>
      </motion.div>

      {bookmarkedCourses.length > 0 ? (
        <CourseCardGrid courses={bookmarkedCourses} />
      ) : (
        <EmptyState
          icon={Bookmark}
          title="No bookmarks yet"
          description="Save courses to watch later by clicking the bookmark icon"
          actionLabel="Explore Courses"
          onAction={() => navigate('explore')}
        />
      )}
    </div>
  );
}
