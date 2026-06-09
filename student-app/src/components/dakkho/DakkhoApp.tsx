'use client';

import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigationStore, useAuthStore, useNotificationStore, useServerConfigStore, useThemeStore, urlToPage } from '@/lib/store';
// Notifications now come from OneSignal push notifications
import { ContentProtection } from './ContentProtection';
import { AppShell } from './AppShell';
import { ErrorBoundary } from './ErrorBoundary';
import NotificationPermissionModal from './notifications/NotificationPermissionModal';

// Auth pages
import { LoginPage } from './auth/LoginPage';
import { SignupPage } from './auth/SignupPage';
import { ForgotPasswordPage } from './auth/ForgotPasswordPage';

// Main pages
import { HomePage } from './home/HomePage';
import { ExplorePage } from './explore/ExplorePage';
import { CourseDetailPage } from './course/CourseDetailPage';
import { VideoPlayerPage } from './video/VideoPlayerPage';
import { InstructorsPage } from './instructor/InstructorsPage';
import { InstructorProfilePage } from './instructor/InstructorProfilePage';
import { NotificationsPage } from './notifications/NotificationsPage';
import { ProfilePage } from './profile/ProfilePage';
import { MyCoursesPage } from './courses/MyCoursesPage';
import { BookmarksPage } from './bookmarks/BookmarksPage';
import { SearchPage } from './search/SearchPage';
import { SettingsPage } from './settings/SettingsPage';
import { HelpPage } from './settings/HelpPage';
import { Error404Page } from './error/Error404Page';
import { Error500Page } from './error/Error500Page';
import { CategoryPage } from './category/CategoryPage';
import { WatchHistoryPage } from './history/WatchHistoryPage';
import { DownloadsPage } from './downloads/DownloadsPage';
import { CertificatesPage } from './certificates/CertificatesPage';
import { LiveSessionsPage } from './live/LiveSessionsPage';
import { AchievementsPage } from './achievements/AchievementsPage';
import { AssignmentPage } from './assignment/AssignmentPage';
import { DiscussionPage } from './discussion/DiscussionPage';
import { AboutPage } from './about/AboutPage';

// Department pages
import { CSEPage } from './department/CSEPage';
import { ETEPage } from './department/ETEPage';
import { EEEPage } from './department/EEEPage';
import { MEPage } from './department/MEPage';
import { CEPage } from './department/CEPage';
import { ArchitecturePage } from './department/ArchitecturePage';
import { TextilePage } from './department/TextilePage';
import { ChemicalPage } from './department/ChemicalPage';
import { AutomobilePage } from './department/AutomobilePage';
import { RACPage } from './department/RACPage';
import { GlassCeramicPage } from './department/GlassCeramicPage';
import { PrintingPage } from './department/PrintingPage';
import { SurveyingPage } from './department/SurveyingPage';
import { MechatronicsPage } from './department/MechatronicsPage';
import { MiningPage } from './department/MiningPage';
import { MetallurgicalPage } from './department/MetallurgicalPage';
import { PowerPage } from './department/PowerPage';
import { InstrumentationPage } from './department/InstrumentationPage';
import { FoodPage } from './department/FoodPage';
import { LeatherPage } from './department/LeatherPage';

// Semester pages
import { Semester1Page } from './semester/Semester1Page';
import { Semester2Page } from './semester/Semester2Page';
import { Semester3Page } from './semester/Semester3Page';
import { Semester4Page } from './semester/Semester4Page';
import { Semester5Page } from './semester/Semester5Page';
import { Semester6Page } from './semester/Semester6Page';
import { Semester7Page } from './semester/Semester7Page';
import { Semester8Page } from './semester/Semester8Page';

// Course sub-pages
import { CourseCurriculumPage } from './course/CourseCurriculumPage';
import { CourseReviewsPage } from './course/CourseReviewsPage';
import { CourseQAPage } from './course/CourseQAPage';
import { CourseAnnouncementsPage } from './course/CourseAnnouncementsPage';
import { CourseResourcesPage } from './course/CourseResourcesPage';
import { CourseNotesPage } from './course/CourseNotesPage';
import { CourseQuizzesPage } from './course/CourseQuizzesPage';
import { CourseProgressPage } from './course/CourseProgressPage';

// Instructor sub-pages
import { InstructorCoursesPage } from './instructor/InstructorCoursesPage';
import { InstructorReviewsPage } from './instructor/InstructorReviewsPage';
import { InstructorSchedulePage } from './instructor/InstructorSchedulePage';
import { InstructorContactPage } from './instructor/InstructorContactPage';

// Profile sub-pages
import { EditProfilePage } from './profile/EditProfilePage';
import { ChangePasswordPage } from './profile/ChangePasswordPage';
import { LearningStatsPage } from './profile/LearningStatsPage';
import { SubscriptionPage } from './profile/SubscriptionPage';
import { ReferralPage } from './profile/ReferralPage';
import { DeleteAccountPage } from './profile/DeleteAccountPage';

// Settings sub-pages
import { AccountSettingsPage } from './settings/AccountSettingsPage';
import { NotificationSettingsPage } from './settings/NotificationSettingsPage';
import { PrivacySettingsPage } from './settings/PrivacySettingsPage';
import { LanguageSettingsPage } from './settings/LanguageSettingsPage';
import { ThemeSettingsPage } from './settings/ThemeSettingsPage';
import { DownloadSettingsPage } from './settings/DownloadSettingsPage';
import { VideoQualityPage } from './settings/VideoQualityPage';
import { NetworkDataPage } from './settings/NetworkDataPage';
import { ContentProtectionSettingsPage } from './settings/ContentProtectionSettingsPage';
import { ActiveSessionsPage } from './settings/ActiveSessionsPage';

// Help sub-pages
import { FAQPage } from './help/FAQPage';
import { ContactSupportPage } from './help/ContactSupportPage';
import { ReportIssuePage } from './help/ReportIssuePage';
import { TermsOfServicePage } from './help/TermsOfServicePage';
import { PrivacyPolicyPage } from './help/PrivacyPolicyPage';
import { RefundPolicyPage } from './help/RefundPolicyPage';

// Exam pages
import { ExamPrepPage } from './exam/ExamPrepPage';
import { ExamSchedulePage } from './exam/ExamSchedulePage';
import { ExamResultsPage } from './exam/ExamResultsPage';
import { ExamPracticePage } from './exam/ExamPracticePage';
import { ExamTipsPage } from './exam/ExamTipsPage';

// Social/Community pages
import { LeaderboardPage } from './social/LeaderboardPage';
import { StudyGroupsPage } from './social/StudyGroupsPage';
import { PeerConnectionsPage } from './social/PeerConnectionsPage';
import { CommunityPage } from './social/CommunityPage';
import { FeedbackPage } from './social/FeedbackPage';
import { RoadmapPage } from './social/RoadmapPage';

// Misc pages
import { PricingPage } from './misc/PricingPage';
import { ChangelogPage } from './misc/ChangelogPage';
import { MaintenancePage } from './misc/MaintenancePage';
import { TermsPage } from './misc/TermsPage';
import { PrivacyPage } from './misc/PrivacyPage';

function PageRouter() {
  const currentPage = useNavigationStore((s) => s.currentPage);
  const pageParams = useNavigationStore((s) => s.pageParams);

  const pages: Record<string, React.ReactNode> = {
    // Auth pages (also accessible when authenticated, e.g. forgot-password)
    'forgot-password': <ForgotPasswordPage />,
    // Main pages
    home: <HomePage />,
    explore: <ExplorePage />,
    search: <SearchPage />,
    notifications: <NotificationsPage />,
    profile: <ProfilePage />,
    // Course pages
    'course-detail': <CourseDetailPage />,
    'video-player': <VideoPlayerPage />,
    'course-curriculum': <CourseCurriculumPage />,
    'course-reviews': <CourseReviewsPage />,
    'course-qa': <CourseQAPage />,
    'course-announcements': <CourseAnnouncementsPage />,
    'course-resources': <CourseResourcesPage />,
    'course-notes': <CourseNotesPage />,
    'course-quizzes': <CourseQuizzesPage />,
    'course-progress': <CourseProgressPage />,
    // Instructor pages
    instructors: <InstructorsPage />,
    'instructor-profile': <InstructorProfilePage />,
    'instructor-courses': <InstructorCoursesPage />,
    'instructor-reviews': <InstructorReviewsPage />,
    'instructor-schedule': <InstructorSchedulePage />,
    'instructor-contact': <InstructorContactPage />,
    // User pages
    'my-courses': <MyCoursesPage />,
    bookmarks: <BookmarksPage />,
    settings: <SettingsPage />,
    help: <HelpPage />,
    'watch-history': <WatchHistoryPage />,
    downloads: <DownloadsPage />,
    certificates: <CertificatesPage />,
    'live-sessions': <LiveSessionsPage />,
    achievements: <AchievementsPage />,
    assignment: <AssignmentPage />,
    discussion: <DiscussionPage />,
    about: <AboutPage />,
    // Department pages
    'dept-cse': <CSEPage />,
    'dept-ete': <ETEPage />,
    'dept-eee': <EEEPage />,
    'dept-me': <MEPage />,
    'dept-ce': <CEPage />,
    'dept-architecture': <ArchitecturePage />,
    'dept-textile': <TextilePage />,
    'dept-chemical': <ChemicalPage />,
    'dept-automobile': <AutomobilePage />,
    'dept-rac': <RACPage />,
    'dept-glass-ceramic': <GlassCeramicPage />,
    'dept-printing': <PrintingPage />,
    'dept-surveying': <SurveyingPage />,
    'dept-mechatronics': <MechatronicsPage />,
    'dept-mining': <MiningPage />,
    'dept-metallurgical': <MetallurgicalPage />,
    'dept-power': <PowerPage />,
    'dept-instrumentation': <InstrumentationPage />,
    'dept-food': <FoodPage />,
    'dept-leather': <LeatherPage />,
    // Semester pages
    'semester-1': <Semester1Page />,
    'semester-2': <Semester2Page />,
    'semester-3': <Semester3Page />,
    'semester-4': <Semester4Page />,
    'semester-5': <Semester5Page />,
    'semester-6': <Semester6Page />,
    'semester-7': <Semester7Page />,
    'semester-8': <Semester8Page />,
    // Profile sub-pages
    'edit-profile': <EditProfilePage />,
    'change-password': <ChangePasswordPage />,
    'learning-stats': <LearningStatsPage />,
    subscription: <SubscriptionPage />,
    referral: <ReferralPage />,
    'delete-account': <DeleteAccountPage />,
    // Settings sub-pages
    'settings-account': <AccountSettingsPage />,
    'settings-notifications': <NotificationSettingsPage />,
    'settings-privacy': <PrivacySettingsPage />,
    'settings-language': <LanguageSettingsPage />,
    'settings-theme': <ThemeSettingsPage />,
    'settings-downloads': <DownloadSettingsPage />,
    'settings-video-quality': <VideoQualityPage />,
    'settings-download-settings': <DownloadSettingsPage />,
    'settings-network-data': <NetworkDataPage />,
    'settings-content-protection': <ContentProtectionSettingsPage />,
    'settings-sessions': <ActiveSessionsPage />,
    // Help sub-pages
    faq: <FAQPage />,
    'contact-support': <ContactSupportPage />,
    'report-issue': <ReportIssuePage />,
    'terms-of-service': <TermsOfServicePage />,
    'privacy-policy': <PrivacyPolicyPage />,
    'refund-policy': <RefundPolicyPage />,
    // Exam pages
    'exam-prep': <ExamPrepPage />,
    'exam-schedule': <ExamSchedulePage />,
    'exam-results': <ExamResultsPage />,
    'exam-practice': <ExamPracticePage />,
    'exam-tips': <ExamTipsPage />,
    // Social/Community pages
    leaderboard: <LeaderboardPage />,
    'study-groups': <StudyGroupsPage />,
    'peer-connections': <PeerConnectionsPage />,
    community: <CommunityPage />,
    feedback: <FeedbackPage />,
    roadmap: <RoadmapPage />,
    // Category
    category: <CategoryPage />,
    // Misc pages
    pricing: <PricingPage />,
    changelog: <ChangelogPage />,
    maintenance: <MaintenancePage />,
    terms: <TermsPage />,
    privacy: <PrivacyPage />,
    // Error pages
    'error-404': <Error404Page />,
    'error-500': <Error500Page />,
  };

  // Include pageParams in key for pages that need full remount on param change
  const paramKey = (pageParams?.videoId || pageParams?.courseId || pageParams?.instructorId)
    ? `-${pageParams.videoId || ''}${pageParams.courseId || ''}${pageParams.instructorId || ''}`
    : '';

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={`${currentPage}${paramKey}`}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      >
        {pages[currentPage] || <Error404Page />}
      </motion.div>
    </AnimatePresence>
  );
}

export function DakkhoApp() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const hydrateAuth = useAuthStore((s) => s.hydrateAuth);
  const currentPage = useNavigationStore((s) => s.currentPage);
  const navigate = useNavigationStore((s) => s.navigate);
  const syncFromUrl = useNavigationStore((s) => s.syncFromUrl);
  const loadFromPreferences = useThemeStore((s) => s.loadFromPreferences);
  const hydrateFromStorage = useNotificationStore((s) => s.hydrateFromStorage);

  // Initialize server config on mount
  const fetchConfig = useServerConfigStore((s) => s.fetchConfig);

  // ── Hydrate ALL client-only state in a single useEffect ──
  // This runs AFTER the first render, so the first client render
  // matches the server render (both unauthenticated), avoiding the
  // hydration mismatch that previously caused the AppShell to flash.
  useEffect(() => {
    // 1. Auth session from localStorage
    hydrateAuth();

    // 2. Theme preference from localStorage
    const stored = localStorage.getItem('dakkho_theme_mode');
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      loadFromPreferences(stored as 'light' | 'dark' | 'system');
    }

    // 3. Notifications from localStorage
    hydrateFromStorage();

    // 4. Server config
    fetchConfig();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync from browser URL on initial load
  useEffect(() => {
    const currentPath = window.location.pathname;
    if (currentPath !== '/') {
      syncFromUrl(currentPath);
    }
  }, []);

  // Listen for browser back/forward (popstate)
  useEffect(() => {
    const handlePopState = (_event: PopStateEvent) => {
      const currentPath = window.location.pathname;
      syncFromUrl(currentPath);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [syncFromUrl]);

  // Auth pages (no shell)
  const authPages: Record<string, React.ReactNode> = {
    login: <LoginPage />,
    signup: <SignupPage />,
    'forgot-password': <ForgotPasswordPage />,
  };

  // Redirect authenticated users away from auth pages
  // Note: 'forgot-password' is allowed even when authenticated — a logged-in
  // user who forgot their password needs to be able to access this flow.
  const authPageKeys = ['login', 'signup'];
  const redirectingRef = useRef(false);
  useEffect(() => {
    if (isAuthenticated && authPageKeys.includes(currentPage) && !redirectingRef.current) {
      redirectingRef.current = true;
      navigate('home');
      requestAnimationFrame(() => { redirectingRef.current = false; });
    }
  }, [isAuthenticated, currentPage, navigate]);

  // ── While auth is being hydrated, show a loading screen ──
  // This avoids the flash where SSR renders auth pages but the
  // client would render the AppShell (hydration mismatch), and
  // also avoids the blank "return null" when on an auth page.
  if (!isHydrated) {
    return (
      <ErrorBoundary>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <motion.div
            className="w-8 h-8 rounded-full border-2 border-sky-500 border-t-transparent"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
        </div>
      </ErrorBoundary>
    );
  }

  // ── Unauthenticated: show auth pages (no shell) ──
  if (!isAuthenticated) {
    return (
      <ErrorBoundary>
        <ContentProtection>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              {authPages[currentPage] || <LoginPage />}
            </motion.div>
          </AnimatePresence>
        </ContentProtection>
      </ErrorBoundary>
    );
  }

  // ── Authenticated but on an auth page → fall through to AppShell ──
  // The redirect useEffect above will fire on the next tick and
  // navigate to 'home'. Previously this returned `null` causing a
  // blank flash while the redirect was pending.

  // ── Authenticated pages (with shell) ──
  // ErrorBoundary wraps ONLY the PageRouter so that page errors
  // don't unmount the AppShell (TopBar, Sidebar, BottomNav).
  return (
    <ContentProtection>
      <AppShell>
        <NotificationPermissionModal />
        <ErrorBoundary>
          <PageRouter />
        </ErrorBoundary>
      </AppShell>
    </ContentProtection>
  );
}
