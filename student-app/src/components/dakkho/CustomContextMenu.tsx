'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield,
  Flag,
  Share2,
  Bookmark,
  Download,
  Link2,
} from 'lucide-react';

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
}

interface CustomContextMenuProps {
  menu: ContextMenuState;
  onClose: () => void;
}

interface MenuItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  action: () => void;
  danger?: boolean;
}

const MENU_ITEMS: MenuItem[] = [
  { icon: Link2, label: 'Copy Link', action: () => { if (typeof navigator !== 'undefined') navigator.clipboard?.writeText(window.location.href).catch(() => {}); } },
  { icon: Share2, label: 'Share', action: () => {} },
  { icon: Bookmark, label: 'Bookmark', action: () => {} },
  { icon: Download, label: 'Download Info', action: () => {} },
  { icon: Flag, label: 'Report Issue', action: () => {} },
  { icon: Shield, label: 'About DAKKHO', action: () => { if (typeof window !== 'undefined') window.open('#', '_blank'); } },
];

// Dividers after index 2 (Copy Link, Share, Bookmark) and index 4 (Report Issue)
const DIVIDER_AFTER = [2, 4];

export function CustomContextMenu({ menu, onClose }: CustomContextMenuProps) {
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!menu.visible) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex((prev) => (prev + 1) % MENU_ITEMS.length);
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex((prev) => (prev - 1 + MENU_ITEMS.length) % MENU_ITEMS.length);
        return;
      }

      if (e.key === 'Enter' && focusedIndex >= 0 && focusedIndex < MENU_ITEMS.length) {
        e.preventDefault();
        MENU_ITEMS[focusedIndex].action();
        onClose();
      }
    },
    [menu.visible, onClose, focusedIndex]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Adjust position so menu doesn't overflow viewport (client-only)
  const menuWidth = 200;
  const menuHeight = MENU_ITEMS.length * 40 + 20;
  const adjustedX = typeof window !== 'undefined' && menu.x + menuWidth > window.innerWidth ? menu.x - menuWidth : menu.x;
  const adjustedY = typeof window !== 'undefined' && menu.y + menuHeight > window.innerHeight ? menu.y - menuHeight : menu.y;

  return (
    <AnimatePresence>
      {menu.visible && (
        <>
          {/* Backdrop to close on outside click */}
          <motion.div
            className="fixed inset-0 z-[9998]"
            onClick={onClose}
            onContextMenu={(e) => {
              e.preventDefault();
              onClose();
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          />
          <motion.div
            className="fixed z-[9999] min-w-[200px] bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-white/40 dark:border-white/10 rounded-xl shadow-2xl shadow-sky-500/10 py-1.5 overflow-hidden"
            style={{ left: adjustedX, top: adjustedY }}
            initial={{ opacity: 0, scale: 0.85, x: -10, y: -5 }}
            animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, x: -10, y: -5 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          >
            {MENU_ITEMS.map((item, i) => (
              <div key={i}>
                <motion.button
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                    focusedIndex === i
                      ? 'bg-sky-100/60 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400'
                      : item.danger
                        ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
                        : 'text-foreground hover:bg-sky-50/60 dark:hover:bg-sky-900/20'
                  }`}
                  onClick={() => {
                    item.action();
                    onClose();
                  }}
                  onMouseEnter={() => setFocusedIndex(i)}
                  onMouseLeave={() => setFocusedIndex(-1)}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03, duration: 0.15 }}
                >
                  <item.icon
                    className={`w-4 h-4 ${
                      item.danger
                        ? 'text-red-400'
                        : 'text-sky-500'
                    }`}
                  />
                  {item.label}
                </motion.button>
                {DIVIDER_AFTER.includes(i) && (
                  <div className="my-1 mx-3 border-t border-white/20 dark:border-white/5" />
                )}
              </div>
            ))}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
