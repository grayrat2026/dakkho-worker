'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, Search, Bell, X } from 'lucide-react';
import { useNavigationStore, useAuthStore, useNotificationStore, useSearchStore, useServerConfigStore } from '@/lib/store';
import Image from 'next/image';

export function TopBar() {
  const { toggleSidebar, navigate } = useNavigationStore();
  const user = useAuthStore((s) => s.user);
  const [searchFocused, setSearchFocused] = useState(false);
  const storeSearchQuery = useSearchStore((s) => s.query);
  const storeSetQuery = useSearchStore((s) => s.setQuery);
  const storeNotifications = useNotificationStore((s) => s.notifications);
  const markAsRead = useNotificationStore((s) => s.markAsRead);
  const isTopBarElementVisible = useServerConfigStore((s) => s.isTopBarElementVisible);

  // Only count actual unread notifications from store - no mock fallback
  const unreadCount = storeNotifications.filter(n => !n.isRead).length;

  const handleSearchSubmit = useCallback(() => {
    if (storeSearchQuery.trim()) {
      navigate('search', { query: storeSearchQuery });
    }
  }, [storeSearchQuery, navigate]);

  const handleNotificationClick = useCallback(() => {
    navigate('notifications');
  }, [navigate]);

  return (
    <motion.header
      className="fixed top-0 left-0 right-0 z-30 h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-white/30 dark:border-white/5"
      initial={{ y: -64 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      <div className="h-full flex items-center justify-between px-4 md:px-6 gap-3">
        {/* LEFT side: Logo image only (no DAKKHO text) */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Logo image - click goes home */}
          <motion.div
            className="flex items-center cursor-pointer"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('home')}
          >
            <Image src="/logo.png" alt="Logo" width={32} height={32} className="rounded-lg" priority />
          </motion.div>
        </div>

        {/* CENTER: Search bar */}
        {isTopBarElementVisible('search') && (
        <motion.div
          className="flex-1 max-w-lg mx-auto"
          animate={{ scale: searchFocused ? 1.02 : 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
          <div className={`relative flex items-center bg-muted/50 dark:bg-muted/30 rounded-xl border transition-all duration-300 ${searchFocused ? 'border-sky-400 shadow-lg shadow-sky-500/10' : 'border-transparent'}`}>
            <Search className="w-4 h-4 ml-3 text-muted-foreground flex-shrink-0" />
            <input
              type="text"
              placeholder="Search courses, instructors..."
              className="w-full bg-transparent py-2.5 px-3 text-sm outline-none placeholder:text-muted-foreground"
              onFocus={() => { setSearchFocused(true); navigate('search'); }}
              onBlur={() => setSearchFocused(false)}
              value={storeSearchQuery}
              onChange={(e) => storeSetQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit()}
            />
            <AnimatePresence>
              {storeSearchQuery && (
                <motion.button
                  className="mr-2 w-6 h-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0"
                  onClick={() => storeSetQuery('')}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0 }}
                  transition={{ type: 'spring', stiffness: 400 }}
                >
                  <X className="w-3 h-3 text-muted-foreground" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
        )}

        {/* RIGHT side: Notification bell + User avatar + Hamburger (mobile) */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Notification bell with proper badge */}
          {isTopBarElementVisible('notifications') && (
          <motion.button
            className="relative w-10 h-10 rounded-xl bg-muted/50 dark:bg-muted/30 flex items-center justify-center"
            onClick={handleNotificationClick}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Bell className="w-5 h-5 text-muted-foreground" />

            {/* Red dot badge - only visible when there are unread notifications */}
            {unreadCount > 0 && (
              <motion.span
                className="absolute top-1.5 right-1.5 min-w-[8px] min-h-[8px] w-2 h-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-slate-900"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 500 }}
              >
                {/* Pulsing ring effect for visibility */}
                <motion.span
                  className="absolute inset-0 rounded-full bg-red-500"
                  animate={{ scale: [1, 1.8, 1], opacity: [0.6, 0, 0.6] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                />
              </motion.span>
            )}
          </motion.button>
          )}

          {/* User avatar (desktop only) */}
          {isTopBarElementVisible('avatar') && (
          <motion.button
            className="hidden md:flex w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 items-center justify-center text-white font-bold text-sm shadow-lg shadow-sky-500/20"
            onClick={() => navigate('profile')}
            whileHover={{ scale: 1.05, boxShadow: '0 10px 25px -5px rgba(14, 165, 233, 0.4)' }}
            whileTap={{ scale: 0.95 }}
          >
            {user?.fullName?.charAt(0) || 'U'}
          </motion.button>
          )}

          {/* Hamburger menu (mobile only) — RIGHT side */}
          {isTopBarElementVisible('hamburger') && (
          <motion.button
            className="md:hidden w-10 h-10 rounded-xl bg-muted/50 dark:bg-muted/30 flex items-center justify-center"
            onClick={toggleSidebar}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Menu className="w-5 h-5 text-muted-foreground" />
          </motion.button>
          )}
        </div>
      </div>
    </motion.header>
  );
}
