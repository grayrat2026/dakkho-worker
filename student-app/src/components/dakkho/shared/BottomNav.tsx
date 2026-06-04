'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Home, Compass, BookOpen, User, Clock } from 'lucide-react';
import { useNavigationStore, useServerConfigStore } from '@/lib/store';
import type { Page } from '@/lib/store';

interface NavTab {
  icon: React.ElementType;
  label: string;
  page: Page;
}

const tabs: NavTab[] = [
  { icon: Home, label: 'Home', page: 'home' },
  { icon: Compass, label: 'Explore', page: 'explore' },
  { icon: BookOpen, label: 'Courses', page: 'my-courses' },
  { icon: Clock, label: 'History', page: 'watch-history' },
  { icon: User, label: 'Profile', page: 'profile' },
];

export function BottomNav() {
  const { currentPage, navigate } = useNavigationStore();
  const isBottomNavTabVisible = useServerConfigStore((s) => s.isBottomNavTabVisible);

  const visibleTabs = tabs.filter((tab) => isBottomNavTabVisible(tab.page));

  return (
    <motion.nav
      className="fixed bottom-0 left-0 right-0 z-30 md:hidden bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl border-t border-white/30 dark:border-white/5"
      initial={{ y: 64 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-center justify-around h-16">
        {visibleTabs.map((tab) => {
          const isActive = currentPage === tab.page;
          return (
            <motion.button
              key={tab.page}
              className="flex flex-col items-center justify-center gap-0.5 w-16 h-full relative"
              onClick={() => navigate(tab.page)}
              whileTap={{ scale: 0.9 }}
            >
              <motion.div
                className="relative"
                animate={{ y: isActive ? -2 : 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              >
                <tab.icon
                  className={`w-5 h-5 transition-colors ${
                    isActive ? 'text-sky-500' : 'text-muted-foreground'
                  }`}
                  fill={isActive ? 'currentColor' : 'none'}
                />
              </motion.div>
              <AnimatePresence>
                {isActive && (
                  <motion.span
                    className="text-[10px] font-bold text-sky-500"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    transition={{ duration: 0.2 }}
                  >
                    {tab.label}
                  </motion.span>
                )}
              </AnimatePresence>
              {isActive && (
                <motion.div
                  className="absolute -bottom-0 left-1/2 -translate-x-1/2 w-6 h-1 rounded-full bg-gradient-to-r from-sky-500 to-blue-600"
                  layoutId="bottomnav-indicator"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </motion.nav>
  );
}
