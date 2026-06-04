'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Check, X } from 'lucide-react';

interface PasswordStrengthIndicatorProps {
  password: string;
}

interface Requirement {
  label: string;
  met: boolean;
}

export function getPasswordStrength(password: string): {
  score: number;
  label: string;
  color: string;
  bgColor: string;
} {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 0) return { score: 0, label: '', color: '#94a3b8', bgColor: 'rgba(148,163,184,0.2)' };
  if (score === 1) return { score: 1, label: 'Weak', color: '#ef4444', bgColor: 'rgba(239,68,68,0.15)' };
  if (score === 2) return { score: 2, label: 'Fair', color: '#f59e0b', bgColor: 'rgba(245,158,11,0.15)' };
  if (score === 3) return { score: 3, label: 'Good', color: '#eab308', bgColor: 'rgba(234,179,8,0.15)' };
  if (score === 4) return { score: 4, label: 'Strong', color: '#10b981', bgColor: 'rgba(16,185,129,0.15)' };
  return { score: 5, label: 'Very Strong', color: '#059669', bgColor: 'rgba(5,150,105,0.15)' };
}

export function getPasswordRequirements(password: string): Requirement[] {
  return [
    { label: '8+ characters', met: password.length >= 8 },
    { label: 'Uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'Number', met: /[0-9]/.test(password) },
    { label: 'Special character', met: /[^A-Za-z0-9]/.test(password) },
  ];
}

export function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
  if (!password) return null;

  const strength = getPasswordStrength(password);
  const requirements = getPasswordRequirements(password);

  return (
    <motion.div
      className="space-y-3 mt-2"
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Strength bar */}
      <div className="space-y-1.5">
        <div className="flex gap-1">
          {[1, 2, 3, 4].map((level) => (
            <motion.div
              key={level}
              className="h-1.5 flex-1 rounded-full overflow-hidden"
              style={{ backgroundColor: 'rgba(100,116,139,0.15)' }}
            >
              <motion.div
                className="h-full rounded-full"
                initial={{ width: 0 }}
                animate={{
                  width: level <= strength.score ? '100%' : '0%',
                  backgroundColor: level <= strength.score ? strength.color : 'rgba(100,116,139,0.15)',
                }}
                transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
              />
            </motion.div>
          ))}
        </div>
        <AnimatePresence>
          {strength.label && (
            <motion.div
              className="flex items-center gap-1.5"
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
            >
              <motion.div
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: strength.color }}
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 0.5 }}
              />
              <p className="text-xs font-semibold" style={{ color: strength.color }}>
                {strength.label}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Requirements checklist */}
      <div className="space-y-1.5">
        {requirements.map((req, index) => (
          <motion.div
            key={req.label}
            className="flex items-center gap-2"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05, duration: 0.2 }}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={req.met ? 'met' : 'unmet'}
                initial={{ scale: 0, rotate: -90 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: 90 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                className="flex-shrink-0"
              >
                {req.met ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <X className="w-3.5 h-3.5 text-muted-foreground/50" />
                )}
              </motion.div>
            </AnimatePresence>
            <motion.span
              className="text-xs transition-colors duration-300"
              animate={{
                color: req.met ? '#10b981' : 'var(--muted-foreground)',
              }}
              transition={{ duration: 0.3 }}
            >
              {req.label}
            </motion.span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
