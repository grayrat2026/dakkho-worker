'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, useMotionValue, useAnimation, PanInfo } from 'framer-motion';
import {
  Bell, BellOff, CheckCheck, Info, AlertTriangle, CheckCircle,
  AlertCircle, Megaphone, BookOpen, BellRing, Shield, ShieldCheck,
} from 'lucide-react';
import { useNotificationStore, type AppNotification } from '@/lib/store';
import { pushApi, studentNotificationsApi } from '@/lib/api-client';
import { GlassCard } from '../shared/GlassCard';

// ============ LOCAL UTILITY ============

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

// ============ ONESIGNAL TYPES ============

interface OneSignalEventNotification {
  notificationId: string;
  heading?: string;
  body?: string;
  data?: Record<string, unknown>;
  url?: string;
}

interface OneSignalNS {
  User: {
    PushSubscription: {
      id: string | null;
      optedIn: boolean;
    };
  };
  Notifications: {
    permission: boolean;
    permissionNative: NotificationPermission;
    requestPermission: () => Promise<boolean>;
    addEventListener: (event: string, callback: (...args: unknown[]) => void) => void;
    removeEventListener: (event: string, callback: (...args: unknown[]) => void) => void;
  };
  addListenerForNotificationOpened?: (callback: (notification: OneSignalEventNotification) => void) => void;
}

declare global {
  interface Window {
    OneSignal?: OneSignalNS;
    OneSignalDeferred?: Array<(os: OneSignalNS) => void>;
  }
}

// ============ TYPE-BASED CONFIG ============

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

const typeBorderColors: Record<string, string> = {
  info: 'border-l-sky-400',
  success: 'border-l-emerald-400',
  warning: 'border-l-amber-400',
  error: 'border-l-red-400',
  announcement: 'border-l-purple-400',
  'course-update': 'border-l-teal-400',
};

// ============ PERMISSION STATUS ============

type PushPermissionStatus = 'checking' | 'granted' | 'denied' | 'default' | 'unsupported';

// ============ SWIPEABLE NOTIFICATION CARD ============

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
      controls
        .start({ x: info.offset.x > 0 ? 300 : -300, opacity: 0, transition: { duration: 0.2 } })
        .then(() => {
          setIsDismissed(true);
          onDismiss(notification.id);
        });
    } else {
      controls.start({ x: 0, transition: { type: 'spring', stiffness: 500, damping: 30 } });
    }
  };

  const Icon = typeIcons[notification.type] || Info;
  const colorClass = typeColors[notification.type] || typeColors.info;
  const borderColor = typeBorderColors[notification.type] || 'border-l-sky-400';

  return (
    <AnimatePresence>
      {!isDismissed && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, height: 0, marginBottom: 0, padding: 0 }}
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
            className={`p-4 flex items-start gap-4 cursor-pointer ${
              !notification.isRead ? `border-l-4 ${borderColor}` : ''
            }`}
            onClick={() => onMarkRead(notification.id)}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${colorClass}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h3
                  className={`text-sm font-bold leading-tight ${
                    !notification.isRead ? 'text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  {notification.title}
                </h3>
                <span className="text-[10px] text-muted-foreground flex-shrink-0 mt-0.5">
                  {formatTimeAgo(notification.createdAt)}
                </span>
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

// ============ PERMISSION BANNER ============

function NotificationPermissionBanner({
  permissionStatus,
  onRequestPermission,
  isRequesting,
}: {
  permissionStatus: PushPermissionStatus;
  onRequestPermission: () => void;
  isRequesting: boolean;
}) {
  if (permissionStatus === 'granted' || permissionStatus === 'checking') return null;

  const isDenied = permissionStatus === 'denied';
  const isUnsupported = permissionStatus === 'unsupported';

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10, height: 0, marginBottom: 0, padding: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
    >
      <GlassCard className="p-4 mb-4">
        <div className="flex items-start gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
              isDenied
                ? 'text-red-500 bg-red-50 dark:bg-red-900/20'
                : isUnsupported
                  ? 'text-gray-500 bg-gray-50 dark:bg-gray-900/20'
                  : 'text-amber-500 bg-amber-50 dark:bg-amber-900/20'
            }`}
          >
            {isDenied ? <BellOff className="w-5 h-5" /> : <BellRing className="w-5 h-5" />}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-foreground">
              {isDenied
                ? 'Notifications Blocked'
                : isUnsupported
                  ? 'Push Not Available'
                  : 'Stay Updated'}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isDenied
                ? 'Push notifications are blocked in your browser. Enable them in your browser settings to receive important updates.'
                : isUnsupported
                  ? 'Push notifications are not supported in this browser. Use Chrome or Firefox for the best experience.'
                  : 'Enable push notifications to get instant updates about courses, announcements, and more.'}
            </p>
            {!isDenied && !isUnsupported && (
              <motion.button
                className="mt-3 flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 text-white text-xs font-bold shadow-lg shadow-sky-500/20"
                onClick={onRequestPermission}
                disabled={isRequesting}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {isRequesting ? (
                  <motion.div
                    className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                  />
                ) : (
                  <Bell className="w-4 h-4" />
                )}
                Enable Notifications
              </motion.button>
            )}
            {isDenied && (
              <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
                <Shield className="w-3 h-3" />
                Open browser settings → Site settings → Notifications → Allow
              </p>
            )}
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}

// ============ PERMISSION STATUS INDICATOR ============

function PermissionStatusIndicator({ status }: { status: PushPermissionStatus }) {
  const config: Record<PushPermissionStatus, { icon: React.ElementType; label: string; color: string }> = {
    checking: { icon: Bell, label: 'Checking...', color: 'text-muted-foreground' },
    granted: { icon: ShieldCheck, label: 'Push On', color: 'text-emerald-500' },
    denied: { icon: BellOff, label: 'Push Blocked', color: 'text-red-500' },
    default: { icon: Bell, label: 'Push Off', color: 'text-amber-500' },
    unsupported: { icon: BellOff, label: 'No Push', color: 'text-gray-400' },
  };

  const { icon: Icon, label, color } = config[status];

  return (
    <motion.div
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/30"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      title={`Notification permission: ${status}`}
    >
      <Icon className={`w-3.5 h-3.5 ${color}`} />
      <span className={`text-[10px] font-semibold ${color}`}>{label}</span>
    </motion.div>
  );
}

// ============ MAIN PAGE ============

export function NotificationsPage() {
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'announcements' | 'course-updates'>('all');
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [pushPermission, setPushPermission] = useState<PushPermissionStatus>('checking');
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [isFetchingApi, setIsFetchingApi] = useState(true);
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);

  const { notifications, markAsRead, markAllAsRead, addNotification, addNotifications } = useNotificationStore();

  // ---- Fetch notifications from API on mount ----
  useEffect(() => {
    let cancelled = false;
    setIsFetchingApi(true);
    studentNotificationsApi.list({ limit: 50 })
      .then((res) => {
        if (!cancelled && res.notifications) {
          const mapped: AppNotification[] = res.notifications.map((n) => ({
            id: n.id,
            title: n.title,
            message: n.message,
            type: (n.type as AppNotification['type']) || 'info',
            isRead: n.read,
            createdAt: n.createdAt,
            actionUrl: n.actionUrl || undefined,
          }));
          addNotifications(mapped);
        }
      })
      .catch(() => {
        // Silently fail — cached/local notifications still available
      })
      .finally(() => {
        if (!cancelled) setIsFetchingApi(false);
      });
    return () => { cancelled = true; };
  }, [addNotifications]);

  // ---- OneSignal: Check permission & register listener ----
  useEffect(() => {
    let foregroundHandler: ((event: unknown) => void) | null = null;

    const initOneSignal = (OneSignal: OneSignalNS) => {
      // Check current permission
      try {
        if (OneSignal.Notifications.permission) {
          setPushPermission('granted');
        } else if (OneSignal.Notifications.permissionNative === 'denied') {
          setPushPermission('denied');
        } else {
          setPushPermission('default');
        }

        // Register push token if already opted in
        if (OneSignal.User.PushSubscription.optedIn && OneSignal.User.PushSubscription.id) {
          pushApi.register({
            push_token: OneSignal.User.PushSubscription.id,
            device_type: 'web',
            device_info: navigator.userAgent,
          }).catch(() => {});
        }
      } catch {
        setPushPermission('default');
      }

      // Listen for foreground notifications
      foregroundHandler = (event: unknown) => {
        try {
          const evt = event as { notification?: OneSignalEventNotification };
          const notif = evt.notification;
          if (notif) {
            addNotification({
              id: notif.notificationId || `os-${Date.now()}`,
              title: notif.heading || 'New Notification',
              message: notif.body || '',
              type: 'info',
              isRead: false,
              createdAt: new Date().toISOString(),
              actionUrl: notif.url || undefined,
            });
          }
        } catch {
          // Silently fail
        }
      };

      try {
        OneSignal.Notifications.addEventListener('foregroundWillDisplay', foregroundHandler);
      } catch {
        // Older SDK version fallback
      }

      // Listen for notification permission changes
      try {
        const permissionHandler = () => {
          if (OneSignal.Notifications.permission) {
            setPushPermission('granted');
          } else if (OneSignal.Notifications.permissionNative === 'denied') {
            setPushPermission('denied');
          } else {
            setPushPermission('default');
          }
        };
        OneSignal.Notifications.addEventListener('permissionChange', permissionHandler as (...args: unknown[]) => void);
      } catch {
        // permissionChange may not be available in all versions
      }
    };

    // Wait for OneSignal SDK to be ready
    if (typeof window !== 'undefined') {
      if (window.OneSignal) {
        initOneSignal(window.OneSignal);
      } else if (window.OneSignalDeferred) {
        window.OneSignalDeferred.push((OneSignal) => {
          initOneSignal(OneSignal);
        });
      } else {
        // OneSignal not available at all
        if (!('Notification' in window)) {
          setPushPermission('unsupported');
        } else if (Notification.permission === 'granted') {
          setPushPermission('granted');
        } else if (Notification.permission === 'denied') {
          setPushPermission('denied');
        } else {
          setPushPermission('default');
        }
      }
    }

    return () => {
      // Cleanup: remove foreground listener if possible
      if (foregroundHandler && window.OneSignal) {
        try {
          window.OneSignal.Notifications.removeEventListener('foregroundWillDisplay', foregroundHandler);
        } catch {
          // Ignore cleanup errors
        }
      }
    };
  }, [addNotification]);

  // ---- Mark single notification as read (local + API) ----
  const handleMarkRead = useCallback(async (id: string) => {
    markAsRead(id);
    try {
      await studentNotificationsApi.markRead(id);
    } catch {
      // Silently fail — local state already updated
    }
  }, [markAsRead]);

  // ---- Mark all notifications as read (local + API) ----
  const handleMarkAllRead = useCallback(async () => {
    if (isMarkingAllRead) return;
    setIsMarkingAllRead(true);
    markAllAsRead();
    try {
      await studentNotificationsApi.markAllRead();
    } catch {
      // Silently fail — local state already updated
    } finally {
      setIsMarkingAllRead(false);
    }
  }, [markAllAsRead, isMarkingAllRead]);

  // ---- Request push permission ----
  const handleRequestPermission = useCallback(async () => {
    setIsRequestingPermission(true);
    try {
      if (window.OneSignal) {
        const granted = await window.OneSignal.Notifications.requestPermission();
        if (granted) {
          setPushPermission('granted');
          // Register the push token with backend
          const token = window.OneSignal.User.PushSubscription.id;
          if (token) {
            await pushApi.register({
              push_token: token,
              device_type: 'web',
              device_info: navigator.userAgent,
            });
          }
        } else {
          // Check if actually denied or just dismissed
          if (window.OneSignal.Notifications.permissionNative === 'denied') {
            setPushPermission('denied');
          } else {
            setPushPermission('default');
          }
        }
      } else if ('Notification' in window) {
        const result = await Notification.requestPermission();
        if (result === 'granted') {
          setPushPermission('granted');
        } else if (result === 'denied') {
          setPushPermission('denied');
        } else {
          setPushPermission('default');
        }
      }
    } catch (error) {
      console.error('Failed to request notification permission:', error);
    } finally {
      setIsRequestingPermission(false);
    }
  }, []);

  // ---- Notification list logic ----
  const displayNotifications = notifications;

  const filtered = displayNotifications.filter((n) => {
    if (dismissedIds.has(n.id)) return false;
    if (activeTab === 'unread') return !n.isRead;
    if (activeTab === 'announcements') return n.type === 'announcement';
    if (activeTab === 'course-updates') return n.type === 'course-update';
    return true;
  });

  const unreadCount = displayNotifications.filter((n) => !n.isRead && !dismissedIds.has(n.id)).length;

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
      {/* Header */}
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
          <PermissionStatusIndicator status={pushPermission} />
          {unreadCount > 0 && (
            <motion.button
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 text-sm font-semibold"
              onClick={handleMarkAllRead}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={isMarkingAllRead}
            >
              {isMarkingAllRead ? (
                <motion.div
                  className="w-4 h-4 border-2 border-sky-400/30 border-t-sky-600 rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                />
              ) : (
                <CheckCheck className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">Mark all read</span>
              <span className="sm:hidden">Read</span>
            </motion.button>
          )}
        </div>
      </motion.div>

      {/* Notification Permission Banner */}
      <AnimatePresence>
        <NotificationPermissionBanner
          permissionStatus={pushPermission}
          onRequestPermission={handleRequestPermission}
          isRequesting={isRequestingPermission}
        />
      </AnimatePresence>

      {/* Tabs */}
      <div
        className="flex gap-1 mb-6 bg-muted/30 rounded-xl p-1 overflow-x-auto"
        style={{ scrollbarWidth: 'none' }}
      >
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
        <AnimatePresence mode="popLayout">
          {filtered.map((notification, i) => (
            <SwipeableNotification
              key={notification.id}
              notification={notification}
              onDismiss={handleDismiss}
              onMarkRead={handleMarkRead}
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
            <p className="text-xs text-muted-foreground mt-1">
              {pushPermission === 'granted'
                ? "You're all caught up! New push notifications will appear here."
                : pushPermission === 'default' || pushPermission === 'denied'
                  ? 'Enable push notifications above to stay updated.'
                  : "You're all caught up! Swipe to dismiss individual notifications."}
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
