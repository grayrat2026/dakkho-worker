'use client';

import { useState, useEffect } from 'react';
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

export default function Home() {
  const { adminUser, setAdminUser, currentPage, sidebarCollapsed, isLoading, setIsLoading } = useAdminStore();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/admin/auth/check');
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated && data.user) {
          setAdminUser(data.user);
        }
      }
    } catch {
      // Not authenticated
    } finally {
      setChecking(false);
    }
  };

  // Loading state while checking auth
  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0F0F1A' }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center overflow-hidden">
            <img src="/dakkho-logo.png" alt="DAKKHO" className="w-10 h-10 object-contain" />
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading DAKKHO Admin...</span>
          </div>
        </motion.div>
      </div>
    );
  }

  // Not authenticated - show login
  if (!adminUser) {
    return <LoginForm />;
  }

  // Authenticated - show admin dashboard
  const PageComponent = pageComponents[currentPage] || Dashboard;

  return (
    <div className="min-h-screen" style={{ background: '#0F0F1A' }}>
      <Sidebar />
      <Header />

      <motion.main
        initial={false}
        animate={{ paddingLeft: sidebarCollapsed ? 72 : 256 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className="pt-16 min-h-screen"
      >
        <div className="p-6">
          <motion.div
            key={currentPage}
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
