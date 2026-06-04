'use client';

import { ReactNode, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sidebar } from './shared/Sidebar';
import { TopBar } from './shared/TopBar';
import { BottomNav } from './shared/BottomNav';
import { useNavigationStore } from '@/lib/store';

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const sidebarOpen = useNavigationStore((s) => s.sidebarOpen);
  const setSidebarOpen = useNavigationStore((s) => s.setSidebarOpen);

  // Lock body scroll when mobile sidebar is open
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [sidebarOpen]);

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <Sidebar />
      
      {/* Main content area - independent scroll from sidebar */}
      <main
        className="pt-16 pb-20 md:pb-6 md:pl-[260px] min-h-screen"
        style={{ overflowY: 'auto' }}
      >
        <motion.div
          className="p-4 md:p-6 max-w-[1400px] mx-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {children}
        </motion.div>
      </main>

      <BottomNav />

      {/* Mobile sidebar backdrop */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
