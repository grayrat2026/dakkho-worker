// API Mapper Utilities
// Maps API responses (from Appwrite/Worker) to the app's expected data types
// These types are defined in @/lib/mock-data.ts

import type { Technology } from '@/lib/api-client';
import type { Category, Course, Instructor, Video } from '@/lib/mock-data';

// ============ CONSTANTS FOR FALLBACK MAPPING ============

const DEFAULT_CATEGORY_ICONS = [
  'Globe', 'Smartphone', 'Cpu', 'Zap', 'Wrench', 'Building2', 'Ruler',
  'Code', 'BarChart3', 'Wifi', 'Palette', 'Scissors',
];

const DEFAULT_CATEGORY_COLORS = [
  '#0ea5e9', '#8b5cf6', '#f59e0b', '#ef4444', '#64748b', '#10b981',
  '#ec4899', '#2563eb', '#14b8a6', '#f97316', '#a855f7', '#06b6d4',
];

// ============ TECHNOLOGY → CATEGORY MAPPING ============

export function mapTechnologyToCategory(tech: Technology, index: number): Category {
  return {
    id: String(tech.id),
    name: tech.name,
    slug: tech.short_code?.toLowerCase() || tech.name.toLowerCase().replace(/\s+/g, '-'),
    icon: DEFAULT_CATEGORY_ICONS[index % DEFAULT_CATEGORY_ICONS.length],
    color: DEFAULT_CATEGORY_COLORS[index % DEFAULT_CATEGORY_COLORS.length],
    courseCount: 0,
  };
}

export function mapTechnologiesToCategories(technologies: Technology[]): Category[] {
  return technologies
    .filter((t) => t.is_active !== 0)
    .map((tech, i) => mapTechnologyToCategory(tech, i));
}

// ============ API COURSE → COURSE MAPPING ============

export function mapApiCourse(raw: any): Course {
  return {
    id: raw.id || raw.$id || '',
    title: raw.title || '',
    slug: raw.slug || (raw.title || '').toLowerCase().replace(/\s+/g, '-'),
    description: raw.description || '',
    thumbnailUrl: raw.thumbnailUrl || raw.thumbnail_url || '',
    categoryId: String(raw.categoryId || raw.category_id || raw.technologyId || raw.technology_id || ''),
    instructorId: String(raw.instructorId || raw.instructor_id || ''),
    level: raw.level || 'beginner',
    language: raw.language || 'Bangla',
    duration: Number(raw.duration || 0),
    totalVideos: Number(raw.totalVideos || raw.total_videos || 0),
    rating: Number(raw.rating || 0),
    totalReviews: Number(raw.totalReviews || raw.total_reviews || 0),
    totalStudents: Number(raw.totalStudents || raw.total_students || 0),
    isFeatured: Boolean(raw.isFeatured ?? raw.is_featured ?? false),
    tags: Array.isArray(raw.tags) ? raw.tags : [],
    price: Number(raw.price || 0),
  };
}

export function mapApiCourses(courses: any[]): Course[] {
  return courses.map(mapApiCourse);
}

// ============ API INSTRUCTOR → INSTRUCTOR MAPPING ============

export function mapApiInstructor(raw: any): Instructor {
  return {
    id: raw.id || raw.$id || '',
    name: raw.name || '',
    bio: raw.bio || '',
    avatarUrl: raw.avatarUrl || raw.avatar_url || '',
    coverUrl: raw.coverUrl || raw.cover_url || '',
    specialization: raw.specialization || '',
    rating: Number(raw.rating || 0),
    totalStudents: Number(raw.totalStudents || raw.total_students || 0),
    totalCourses: Number(raw.totalCourses || raw.total_courses || 0),
    socialLinks: raw.socialLinks || raw.social_links || undefined,
  };
}

export function mapApiInstructors(instructors: any[]): Instructor[] {
  return instructors.map(mapApiInstructor);
}

// ============ API VIDEO → VIDEO MAPPING ============

export function mapApiVideo(raw: any): Video {
  return {
    id: raw.id || raw.$id || '',
    title: raw.title || '',
    slug: raw.slug || (raw.title || '').toLowerCase().replace(/\s+/g, '-'),
    courseId: String(raw.courseId || raw.course_id || ''),
    duration: Number(raw.duration || 0),
    order: Number(raw.order || raw.sort_order || 0),
    isPreview: Boolean(raw.isPreview ?? raw.is_preview ?? false),
    description: raw.description || '',
  };
}

export function mapApiVideos(videos: any[]): Video[] {
  return videos.map(mapApiVideo);
}

// ============ API LIVE CLASS → LIVE SESSION MAPPING ============

export interface LiveSession {
  id: string;
  title: string;
  instructor: string;
  viewers: number;
  startedAt: string;
  subject: string;
  meetingUrl?: string;
  platform?: string;
  status?: string;
}

export function mapLiveClassToSession(raw: any): LiveSession {
  return {
    id: String(raw.id || ''),
    title: raw.title || '',
    instructor: raw.instructor_name || raw.instructorName || 'Instructor',
    viewers: Number(raw.viewers || raw.viewer_count || 0),
    startedAt: raw.startedAt || raw.scheduled_at
      ? formatTimeAgo(raw.startedAt || raw.scheduled_at)
      : 'Starting soon',
    subject: raw.subject || raw.technology_name || raw.technologyName || '',
    meetingUrl: raw.meeting_url || raw.meetingUrl || '',
    platform: raw.platform || '',
    status: raw.status || '',
  };
}

export function mapLiveClassesToSessions(liveClasses: any[]): LiveSession[] {
  return liveClasses
    .filter((lc) => lc.status === 'live' || lc.status === 'scheduled' || !lc.status)
    .map(mapLiveClassToSession);
}

// ============ UTILITY: formatTimeAgo (mirrors mock-data) ============

function formatTimeAgo(dateString: string): string {
  const now = Date.now();
  const then = new Date(dateString).getTime();
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
