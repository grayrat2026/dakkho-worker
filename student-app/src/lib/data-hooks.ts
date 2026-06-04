/**
 * DAKKHO Student App — Data Hooks
 *
 * React hooks for fetching data from the Worker API.
 * All data comes from real sources: D1, Appwrite, R2 via the Worker API.
 * NO mock data, NO demo data, NO hardcoded data.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  courseApi,
  instructorApi,
  technologyApi,
  instituteApi,
  eventApi,
  liveClassApi,
  configApi,
  type Institute,
  type Technology,
  type Event,
  type LiveClass,
} from './api-client';
import {
  mapApiCourse,
  mapApiCourses,
  mapApiInstructor,
  mapApiInstructors,
  mapApiVideo,
  mapApiVideos,
  mapTechnologiesToCategories,
  mapLiveClassesToSessions,
  type LiveSession,
} from '@/components/dakkho/shared/apiMappers';
import type { Category, Course, Instructor, Video } from './mock-data';

// ============ GENERIC HOOK HELPERS ============

interface DataState<T> {
  data: T;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

function createDataHook<T>(
  fetcher: () => Promise<T>,
  initialValue: T,
): () => DataState<T> {
  return () => {
    const [data, setData] = useState<T>(initialValue);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await fetcher();
        setData(result);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    return { data, loading, error, refetch: fetchData };
  };
}

// ============ COURSES ============

export function useCourses(params?: { technology?: string; limit?: number; offset?: number }) {
  const [data, setData] = useState<Course[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await courseApi.list(params);
      setData(mapApiCourses(result.courses || []));
      setTotal(result.total || 0);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch courses');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [params?.technology, params?.limit, params?.offset]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { data, total, loading, error, refetch: fetchData };
}

export function useCourse(courseId: string | null) {
  const [data, setData] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!courseId) { setData(null); setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const result = await courseApi.get(courseId);
      setData(mapApiCourse(result.course));
    } catch (err: any) {
      setError(err.message || 'Course not found');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

// ============ INSTRUCTORS ============

export function useInstructors(params?: { search?: string; limit?: number; offset?: number }) {
  const [data, setData] = useState<Instructor[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await instructorApi.list(params);
      setData(mapApiInstructors(result.instructors || []));
      setTotal(result.total || 0);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch instructors');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [params?.search, params?.limit, params?.offset]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { data, total, loading, error, refetch: fetchData };
}

export function useInstructor(instructorId: string | null) {
  const [data, setData] = useState<Instructor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!instructorId) { setData(null); setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const result = await instructorApi.get(instructorId);
      setData(mapApiInstructor(result.instructor));
    } catch (err: any) {
      setError(err.message || 'Instructor not found');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [instructorId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

// ============ TECHNOLOGIES → CATEGORIES ============

export function useCategories() {
  const [data, setData] = useState<Category[]>([]);
  const [rawTechnologies, setRawTechnologies] = useState<Technology[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await technologyApi.list();
      const techs = result.technologies || [];
      setRawTechnologies(techs);
      setData(mapTechnologiesToCategories(techs));
    } catch (err: any) {
      setError(err.message || 'Failed to fetch technologies');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { data, rawTechnologies, loading, error, refetch: fetchData };
}

// ============ COURSE VIDEOS ============

export function useCourseVideos(courseId: string | null) {
  const [data, setData] = useState<Video[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!courseId) { setData([]); setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const result = await courseApi.videos(courseId);
      setData(mapApiVideos(result.videos || []));
      setTotal(result.total || 0);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch videos');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { data, total, loading, error, refetch: fetchData };
}

// ============ INSTRUCTOR COURSES ============

export function useInstructorCourses(instructorId: string | null) {
  const [data, setData] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!instructorId) { setData([]); setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      // Fetch all courses and filter by instructor
      // The Worker API doesn't have a specific instructor-courses endpoint,
      // so we fetch courses and filter on client side
      const result = await courseApi.list({ limit: 100 });
      const allCourses = mapApiCourses(result.courses || []);
      setData(allCourses.filter(c => c.instructorId === instructorId));
    } catch (err: any) {
      setError(err.message || 'Failed to fetch instructor courses');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [instructorId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

// ============ INSTITUTES ============

export const useInstitutes = createDataHook<Institute[]>(
  async () => {
    const result = await instituteApi.list({ limit: 100 });
    return result.institutes || [];
  },
  [],
);

// ============ EVENTS ============

export const useEvents = createDataHook<Event[]>(
  async () => {
    const result = await eventApi.list();
    return result.events || [];
  },
  [],
);

// ============ LIVE CLASSES ============

export function useLiveClasses() {
  const [data, setData] = useState<LiveSession[]>([]);
  const [rawData, setRawData] = useState<LiveClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await liveClassApi.list();
      const classes = result.liveClasses || [];
      setRawData(classes);
      setData(mapLiveClassesToSessions(classes));
    } catch (err: any) {
      setError(err.message || 'Failed to fetch live classes');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { data, rawData, loading, error, refetch: fetchData };
}

// ============ SERVER CONFIG ============

export const useServerConfig = createDataHook<Record<string, any>>(
  async () => {
    const result = await configApi.get();
    return result.config || {};
  },
  {},
);

// ============ SEARCH ============

export function useCourseSearch(query: string) {
  const [data, setData] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!query.trim()) { setData([]); return; }

    const search = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await courseApi.list({ limit: 20 });
        const allCourses = mapApiCourses(result.courses || []);
        const q = query.toLowerCase();
        const filtered = allCourses.filter(
          c => c.title.toLowerCase().includes(q) ||
               c.description.toLowerCase().includes(q) ||
               c.tags.some(t => t.toLowerCase().includes(q))
        );
        setData(filtered);
      } catch (err: any) {
        setError(err.message);
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(search, 300);
    return () => clearTimeout(debounce);
  }, [query]);

  return { data, loading, error };
}

export function useInstructorSearch(query: string) {
  const [data, setData] = useState<Instructor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!query.trim()) { setData([]); return; }

    const search = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await instructorApi.list({ search: query, limit: 20 });
        setData(mapApiInstructors(result.instructors || []));
      } catch (err: any) {
        setError(err.message);
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(search, 300);
    return () => clearTimeout(debounce);
  }, [query]);

  return { data, loading, error };
}

export function useVideoSearch(query: string) {
  const [data, setData] = useState<Video[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!query.trim()) { setData([]); return; }

    const search = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch all courses' videos and search
        const courseResult = await courseApi.list({ limit: 50 });
        const courses = mapApiCourses(courseResult.courses || []);
        const q = query.toLowerCase();
        const allVideos: Video[] = [];

        for (const course of courses) {
          try {
            const videoResult = await courseApi.videos(course.id);
            const videos = mapApiVideos(videoResult.videos || []);
            allVideos.push(...videos);
          } catch {}
          if (allVideos.length >= 20) break;
        }

        setData(allVideos.filter(v =>
          v.title.toLowerCase().includes(q) ||
          v.description.toLowerCase().includes(q)
        ).slice(0, 20));
      } catch (err: any) {
        setError(err.message);
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(search, 500);
    return () => clearTimeout(debounce);
  }, [query]);

  return { data, loading, error };
}
