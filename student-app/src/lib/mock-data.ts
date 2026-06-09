// DAKKHO Student App — Type Definitions & Utility Functions
//
// ALL mock/demo data has been REMOVED.
// All data now comes from the Worker API (D1, R2).
// See data-hooks.ts for React hooks that fetch from the API.
// See api-client.ts for direct API calls.
// See shared/apiMappers.ts for API→type mapping.

// ============ TYPE DEFINITIONS ============
// These types define the shape of data used throughout the app.
// They are populated from the Worker API, not hardcoded.

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  color: string;
  courseCount: number;
}

export interface Instructor {
  id: string;
  name: string;
  bio: string;
  avatarUrl: string;
  coverUrl: string;
  specialization: string;
  rating: number;
  totalStudents: number;
  totalCourses: number;
  socialLinks?: { platform: string; url: string }[];
}

export interface Course {
  id: string;
  title: string;
  slug: string;
  description: string;
  thumbnailUrl: string;
  categoryId: string;
  instructorId: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  language: string;
  duration: number;
  totalVideos: number;
  rating: number;
  totalReviews: number;
  totalStudents: number;
  isFeatured: boolean;
  tags: string[];
  price: number;
}

export interface Video {
  id: string;
  title: string;
  slug: string;
  courseId: string;
  duration: number;
  order: number;
  isPreview: boolean;
  description: string;
}

// ============ UTILITY FUNCTIONS ============
// These are pure functions that don't depend on any data source.

export function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '0m';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function formatTimeAgo(dateString: string): string {
  if (!dateString) return '';
  const now = Date.now();
  const then = new Date(dateString).getTime();
  if (isNaN(then)) return '';
  const diff = now - then;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

export function getLevelColor(level: string): string {
  switch (level) {
    case 'beginner': return '#10b981';
    case 'intermediate': return '#0ea5e9';
    case 'advanced': return '#f59e0b';
    case 'expert': return '#ef4444';
    default: return '#64748b';
  }
}
