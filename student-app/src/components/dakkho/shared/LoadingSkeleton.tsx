'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface LoadingSkeletonProps {
  className?: string;
  count?: number;
  type?: 'card' | 'line' | 'circle' | 'video';
}

export function LoadingSkeleton({ className, count = 1, type = 'card' }: LoadingSkeletonProps) {
  const baseClass = 'bg-muted/50 animate-pulse rounded-xl';

  const typeClasses = {
    card: 'h-48 w-full',
    line: 'h-4 w-full',
    circle: 'h-12 w-12 rounded-full',
    video: 'aspect-video w-full',
  };

  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          className={cn(baseClass, typeClasses[type], className)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: i * 0.05 }}
        />
      ))}
    </>
  );
}

export function CourseCardSkeleton() {
  return (
    <div className="glass-card p-0 overflow-hidden">
      <div className="aspect-video bg-muted/50 animate-pulse" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-muted/50 animate-pulse rounded w-3/4" />
        <div className="h-3 bg-muted/50 animate-pulse rounded w-1/2" />
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 bg-muted/50 animate-pulse rounded-full" />
          <div className="h-3 bg-muted/50 animate-pulse rounded w-1/3" />
        </div>
      </div>
    </div>
  );
}

export function VideoCardSkeleton() {
  return (
    <div className="glass-card p-0 overflow-hidden flex gap-3">
      <div className="w-40 h-24 bg-muted/50 animate-pulse rounded-xl flex-shrink-0" />
      <div className="py-3 pr-3 space-y-2 flex-1">
        <div className="h-4 bg-muted/50 animate-pulse rounded w-full" />
        <div className="h-3 bg-muted/50 animate-pulse rounded w-2/3" />
        <div className="h-2 bg-muted/50 animate-pulse rounded w-1/2" />
      </div>
    </div>
  );
}
