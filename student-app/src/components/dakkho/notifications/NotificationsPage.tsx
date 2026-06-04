'use client';

import { useState } from 'react';
import { motion, AnimatePresence, useMotionValue, useAnimation, PanInfo } from 'framer-motion';
import { Bell, CheckCheck, Info, AlertTriangle, CheckCircle, AlertCircle, Megaphone, BookOpen } from 'lucide-react';
import { useNotificationStore, type AppNotification } from '@/lib/store';
import { formatTimeAgo } from '@/lib/mock-data';
import { GlassCard } from '../shared/GlassCard';

const typeIcons: Record<string, React.ElementType> = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: AlertCircle,
  announcement: Megaphone,
  'course-update': BookOpen,
};

const typeColors: Record<string, string> = {
  info: 'text-sky-500 bg-sky-50 dark:bg-sky-900/20',
  success: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20',
  warning: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20',
  error: 'text-red-500 bg-red-50 dark:bg-red-900/20',
  announcement: 'text-purple-500 bg-purple-50 dark:bg-purple-900/20',
  'course-update': 'text-teal-500 bg-teal-50 dark:bg-teal-900/20',
};

function SwipeableNotification({
  notification,
  onDismiss,
  onMarkRead,
  index,
}: {
  notification: AppNotification;
  onDismiss: (id: string) => void;
  onMarkRead: (id: string) => void;
  index: number;
}) {
  const x = useMotionValue(0);
  const controls = useAnimation();
  const [isDismissed, setIsDismissed] = useState(false);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (Math.abs(info.offset.x) > 100) {
      controls.start({ x: info.offset.x > 0 ? 300 : -300, opacity: 0, transition: { duration: 0.2 } }).then(() => {
        setIsDismissed(true);
        onDismiss(notification.id);
      });
    } else {
      controls.start({ x: 0, transition: { type: 'spring', stiffness: 500, damping: 30 } });
    }
  };

  const Icon = typeIcons[notification.type] || Info;
  const colorClass = typeColors[notification.type] || typeColors.info;

  return (
    <AnimatePresence>
      {!isDismissed && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, height: 0, marginBottom: 0 }}
          transition={{ delay: index * 0.03 }}
          style={{ x }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.7}
          onDragEnd={handleDragEnd}
          className="touch-pan-y"
        >
          <GlassCard
            hover
            className={`p-4 flex items-start gap-4 cursor-pointer ${!notification.isRead ? 'border-l-4 border-l-sky-400' : ''}`}
            onClick={() => onMarkRead(notification.id)}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${colorClass}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h3 className={`text-sm font-bold ${!notification.isRead ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {notification.title}
                </h3>
                <span className="text-[10px] text-muted-foreground flex-shrink-0">{formatTimeAgo(notification.createdAt)}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notification.message}</p>
            </div>
            {!notification.isRead && (
              <div className="w-2 h-2 rounded-full bg-sky-500 flex-shrink-0 mt-2" />
            )}
          </GlassCard>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function NotificationsPage() {
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'announcements' | 'course-updates'>('all');
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const { notifications, markAsRead, markAllAsRead } = useNotificationStore();

  // Store is the single source of truth - initialized from MOCK_NOTIFICATIONS in DakkhoApp
  const displayNotifications = notifications;

  const filtered = displayNotifications.filter((n) => {
    if (dismissedIds.has(n.id)) return false;
    if (activeTab === 'unread') return !n.isRead;
    if (activeTab === 'announcements') return n.type === 'announcement';
    if (activeTab === 'course-updates') return n.type === 'info' || n.type === 'course-update';
    return true;
  });

  const unreadCount = displayNotifications.filter((n) => !n.isRead && !dismissedIds.has(n.id)).length;

  const handleMarkAllRead = () => {
    markAllAsRead();
  };

  const handleDismiss = (id: string) => {
    setDismissedIds((prev) => new Set(prev).add(id));
  };

  const tabs = [
    { key: 'all' as const, label: 'All' },
    { key: 'unread' as const, label: `Unread (${unreadCount})` },
    { key: 'announcements' as const, label: 'Announcements' },
    { key: 'course-updates' as const, label: 'Course Updates' },
  ];

  return (
    <div>
      <motion.div
        className="flex items-center justify-between mb-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div>
          <h1 className="text-2xl font-extrabold text-foreground">Notifications</h1>
          <p className="text-sm text-muted-foreground">{unreadCount} unread notifications</p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <motion.button
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 text-sm font-semibold"
              onClick={handleMarkAllRead}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <CheckCheck className="w-4 h-4" />
              Mark all read ({unreadCount})
            </motion.button>
          )}
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-muted/30 rounded-xl p-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {tabs.map((tab) => (
          <motion.button
            key={tab.key}
            className={`flex-shrink-0 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all ${
              activeTab === tab.key
                ? 'bg-white dark:bg-slate-800 shadow-sm text-sky-600 dark:text-sky-400'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => setActiveTab(tab.key)}
            whileTap={{ scale: 0.97 }}
          >
            {tab.label}
          </motion.button>
        ))}
      </div>

      {/* Notification list */}
      <div className="space-y-2">
        <AnimatePresence>
          {filtered.map((notification, i) => (
            <SwipeableNotification
              key={notification.id}
              notification={notification}
              onDismiss={handleDismiss}
              onMarkRead={markAsRead}
              index={i}
            />
          ))}
        </AnimatePresence>

        {filtered.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-16"
          >
            <div className="w-20 h-20 rounded-full bg-muted/30 flex items-center justify-center mx-auto mb-4">
              <Bell className="w-10 h-10 text-muted-foreground/30" />
            </div>
            <p className="text-sm font-semibold text-foreground">No notifications</p>
            <p className="text-xs text-muted-foreground mt-1">You&apos;re all caught up! Swipe to dismiss individual notifications.</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
