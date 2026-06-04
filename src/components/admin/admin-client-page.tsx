'use client';

import { useState, useEffect } from 'react';
import { apiPost, assetUrl } from '@/lib/api-client';
import { motion } from 'framer-motion';
import { useAdminStore } from '@/lib/store';
import { Loader2 } from 'lucide-react';
import LoginForm from '@/components/admin/login-form';
import Sidebar from '@/components/admin/sidebar';
import Header from '@/components/admin/header';
import Dashboard from '@/components/admin/dashboard';
import UsersTable from '@/components/admin/users-table';
import CoursesTable from '@/components/admin/courses-table';
import VideosTable from '@/components/admin/videos-table';
import InstructorsTable from '@/components/admin/instructors-table';
import CategoriesTable from '@/components/admin/categories-table';
import InstitutesTable from '@/components/admin/institutes-table';
import NotificationsPanel from '@/components/admin/notifications-panel';
import ConfigPanel from '@/components/admin/config-panel';
import EmailPanel from '@/components/admin/email-panel';
import AnalyticsPanel from '@/components/admin/analytics-panel';
import SettingsPanel from '@/components/admin/settings-panel';

const pageComponents: Record<string, React.ComponentType> = {
  dashboard: Dashboard,
  users: UsersTable,
  courses: CoursesTable,
  videos: VideosTable,
  instructors: InstructorsTable,
  categories: CategoriesTable,
  institutes: InstitutesTable,
  notifications: NotificationsPanel,
  config: ConfigPanel,
  email: EmailPanel,
  analytics: AnalyticsPanel,
  settings: SettingsPanel,
};

const validPages = Object.keys(pageComponents);

export default function AdminClientPage({ currentPage: initialPage }: { currentPage: string }) {
  const { adminUser, setAdminUser, sidebarCollapsed } = useAdminStore();
  const [checking, setChecking] = useState(true);
  const [isDesktop, setIsDesktop] = useState(false);
  const [currentPage, setCurrentPage] = useState(initialPage);

  // Helper: extract page name from URL path (handles trailing slashes)
  const getPageFromPath = (pathname: string): string => {
    const clean = pathname.replace(/^\/+|\/+$/g, ''); // strip leading/trailing slashes
    const firstSegment = clean.split('/')[0] || 'dashboard';
    return validPages.includes(firstSegment) ? firstSegment : 'dashboard';
  };

  // CRITICAL FIX: Sync currentPage when initialPage prop changes (from Next.js router)
  useEffect(() => {
    setCurrentPage(validPages.includes(initialPage) ? initialPage : 'dashboard');
  }, [initialPage]);

  // Listen for popstate (back/forward browser navigation)
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPage(getPageFromPath(window.location.pathname));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Sync from URL on mount
  useEffect(() => {
    setCurrentPage(getPageFromPath(window.location.pathname));
  }, []);

  useEffect(() => {
    checkAuth();
    const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const checkAuth = async () => {
    try {
      const data = await apiPost('/auth/check', {});
      if ((data as Record<string, unknown>).authenticated && (data as Record<string, unknown>).user) {
        setAdminUser((data as Record<string, unknown>).user as Record<string, unknown>);
      }
    } catch {
      // Not authenticated
    } finally {
      setChecking(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0F0F1A' }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center overflow-hidden">
            <img src={assetUrl('/dakkho-logo.png')} alt="DAKKHO" className="w-10 h-10 object-contain" />
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading DAKKHO Admin...</span>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!adminUser) {
    return <LoginForm />;
  }

  const pageKey = validPages.includes(currentPage) ? currentPage : 'dashboard';
  const PageComponent = pageComponents[pageKey] || Dashboard;

  return (
    <div className="min-h-screen" style={{ background: '#0F0F1A' }}>
      <Sidebar />
      <Header />
      <motion.main
        initial={false}
        animate={{ paddingLeft: isDesktop ? (sidebarCollapsed ? 72 : 256) : 0 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className="pt-16 min-h-screen"
      >
        <div className="p-4 md:p-6">
          <motion.div
            key={pageKey}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <PageComponent />
          </motion.div>
        </div>
      </motion.main>
    </div>
  );
}
