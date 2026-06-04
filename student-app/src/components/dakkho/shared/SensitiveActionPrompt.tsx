'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, Shield } from 'lucide-react';
import { GradientButton } from './GradientButton';

interface SensitiveActionPromptProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  icon?: React.ElementType;
  requiresVerification?: boolean;
}

export function SensitiveActionPrompt({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  icon: Icon = Shield,
  requiresVerification = false,
}: SensitiveActionPromptProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full max-w-sm mx-4 bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-2xl"
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Icon */}
            <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-7 h-7 text-amber-500" />
            </div>

            {/* Title */}
            <h3 className="text-lg font-extrabold text-foreground text-center mb-2">{title}</h3>
            <p className="text-sm text-muted-foreground text-center mb-2">{description}</p>

            {/* Sensitive Warning */}
            {requiresVerification && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="w-4 h-4 text-red-500" />
                  <span className="text-xs font-bold text-red-600 dark:text-red-400 uppercase">Identity Verification Required</span>
                </div>
                <p className="text-xs text-red-600/70 dark:text-red-400/70">
                  This action requires you to verify your identity before proceeding.
                </p>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3 mt-4">
              <motion.button
                className="flex-1 px-4 py-2.5 rounded-xl bg-muted/30 text-sm font-semibold text-foreground"
                onClick={onClose}
                whileTap={{ scale: 0.95 }}
              >
                {cancelLabel}
              </motion.button>
              <GradientButton variant="danger" onClick={onConfirm} className="flex-1">
                {confirmLabel}
              </GradientButton>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
