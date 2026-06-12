/**
 * Deep linking utilities for DAKKHO.
 *
 * Converts push notification URLs to in-app navigation actions
 * using the existing pageToUrl / urlToPage system.
 */

import { urlToPage, type Page } from './store';

/** Result of parsing a deep link URL */
export interface DeepLinkResult {
  page: Page;
  params: Record<string, unknown>;
}

/**
 * Parse a deep link URL from a push notification into a page + params.
 *
 * Supports formats like:
 *   /course/abc123       → course-detail with courseId
 *   /video/xyz456        → video-player with videoId
 *   /announcements       → notifications
 *   /instructor/ins1     → instructor-profile with instructorId
 *   /my-courses          → my-courses
 *
 * Falls back gracefully: unknown URLs go to home.
 */
export function parseDeepLink(url: string): DeepLinkResult {
  if (!url) return { page: 'home', params: {} };

  try {
    // Handle full URLs (https://dakkho.com/course/abc123)
    let pathname = url;
    if (url.startsWith('http://') || url.startsWith('https://')) {
      try {
        const parsed = new URL(url);
        pathname = parsed.pathname;
      } catch {
        // If URL parsing fails, treat the whole string as a path
        pathname = url;
      }
    }

    // Remove any leading domain-like segments if present
    pathname = pathname.replace(/^\/+/, '/');

    // ---- Special-case shortcuts from push notifications ----

    // /announcements → notifications page
    if (pathname === '/announcements' || pathname.startsWith('/announcements')) {
      return { page: 'notifications', params: {} };
    }

    // /course/{id} → course-detail with courseId
    const courseMatch = pathname.match(/^\/course\/([^/]+)/);
    if (courseMatch) {
      return { page: 'course-detail', params: { courseId: courseMatch[1] } };
    }

    // /video/{id} → video-player with videoId
    const videoMatch = pathname.match(/^\/video\/([^/]+)/);
    if (videoMatch) {
      return { page: 'video-player', params: { videoId: videoMatch[1] } };
    }

    // /instructor/{id} → instructor-profile with instructorId
    const instructorMatch = pathname.match(/^\/instructor\/([^/]+)/);
    if (instructorMatch) {
      return { page: 'instructor-profile', params: { instructorId: instructorMatch[1] } };
    }

    // /live → live-sessions
    // /live/join/{id} → live-class-join with liveClassId
    if (pathname === '/live') {
      return { page: 'live-sessions', params: {} };
    }
    const liveJoinMatch = pathname.match(/^\/live\/join\/([^/]+)/);
    if (liveJoinMatch) {
      return { page: 'live-class-join', params: { liveClassId: liveJoinMatch[1] } };
    }
    if (pathname.startsWith('/live')) {
      return { page: 'live-sessions', params: {} };
    }

    // /exam → exam-schedule
    if (pathname === '/exam' || pathname.startsWith('/exam')) {
      return { page: 'exam-schedule', params: {} };
    }

    // ---- Use the existing urlToPage system for standard paths ----
    const result = urlToPage(pathname);

    // If urlToPage returns 404, fall back to home
    if (result.page === 'error-404') {
      return { page: 'home', params: {} };
    }

    return {
      page: result.page as Page,
      params: result.params,
    };
  } catch {
    return { page: 'home', params: {} };
  }
}

/**
 * Extract a deep link URL from OneSignal notification data.
 * OneSignal can pass URLs via different fields:
 * - data.actionUrl (custom field)
 * - data.launchUrl (OneSignal default)
 * - url (top-level)
 */
export function extractNotificationUrl(notification: {
  data?: Record<string, unknown>;
  url?: string;
}): string | null {
  // Check custom data fields first
  if (notification.data) {
    const actionUrl = notification.data.actionUrl || notification.data.action_url;
    if (typeof actionUrl === 'string' && actionUrl) return actionUrl;

    const launchUrl = notification.data.launchUrl || notification.data.launch_url;
    if (typeof launchUrl === 'string' && launchUrl) return launchUrl;
  }

  // Fallback to top-level URL
  if (notification.url) return notification.url;

  return null;
}
