'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X } from 'lucide-react';
import { pushApi } from '@/lib/api-client';

const DISMISSED_KEY = 'dakkho_notif_prompt_dismissed';
const DISMISSED_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

export default function NotificationPermissionModal() {
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if we should show the prompt
    const checkPermission = () => {
      // Don't show if already granted or denied
      if (typeof window === 'undefined') return;

      const permission = Notification.permission;
      if (permission === 'granted' || permission === 'denied') return;

      // Check if dismissed recently
      const dismissedAt = localStorage.getItem(DISMISSED_KEY);
      if (dismissedAt) {
        const elapsed = Date.now() - parseInt(dismissedAt);
        if (elapsed < DISMISSED_DURATION) return;
      }

      setShow(true);
    };

    // Delay showing by 3 seconds after page load
    const timer = setTimeout(checkPermission, 3000);
    return () => clearTimeout(timer);
  }, []);

  const handleEnable = async () => {
    setLoading(true);
    try {
      // Use OneSignal to request permission
      const OneSignal = (window as any).OneSignal;
      if (OneSignal) {
        await OneSignal.Notifications.requestPermission();

        // Get the push token and register with backend
        const userId = await OneSignal.User?.PushSubscription?.id;
        if (userId) {
          try {
            await pushApi.register({
              push_token: userId,
              device_type: 'web',
              device_info: navigator.userAgent,
            });
          } catch {}
        }
      } else {
        // Fallback to native Notification API
        const result = await Notification.requestPermission();
        if (result === 'granted') {
          // Try to register with OneSignal later
        }
      }
    } catch (error) {
      console.error('Notification permission error:', error);
    } finally {
      setLoading(false);
      setShow(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    setShow(false);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={handleDismiss}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-sm w-full p-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleDismiss}
              className="absolute top-3 right-3 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>

            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center mb-4">
                <Bell className="w-8 h-8 text-sky-500" />
              </div>

              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                Stay Updated! 🔔
              </h3>

              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                Get notified about new courses, grades, announcements, and live sessions. Never miss an important update!
              </p>

              <div className="flex gap-3 w-full">
                <button
                  onClick={handleDismiss}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  Later
                </button>
                <button
                  onClick={handleEnable}
                  disabled={loading}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-sky-500 hover:bg-sky-600 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Enabling...' : 'Enable Notifications'}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
