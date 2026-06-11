'use client';

import { useState, useRef, useEffect, KeyboardEvent, ClipboardEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OTP_LENGTH } from '@/lib/constants';

interface OTPInputProps {
  onComplete: (otp: string) => void;
  onResend: () => void;
  cooldown: number;
  error?: string;
  mode?: 'numeric' | 'alphanumeric';
  isVerifying?: boolean;
}

type FeedbackType = 'none' | 'success' | 'error';

export function OTPInput({ onComplete, onResend, cooldown, error, mode = 'numeric', isVerifying = false }: OTPInputProps) {
  const [values, setValues] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [feedback, setFeedback] = useState<FeedbackType>('none');
  const [focusedIndex, setFocusedIndex] = useState<number>(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const hasAutoSubmitted = useRef(false);
  const prevErrorRef = useRef<string | undefined>(undefined);

  // Trigger error feedback when the error prop changes to a new value
  useEffect(() => {
    if (error && error !== prevErrorRef.current) {
      prevErrorRef.current = error;
      // Schedule feedback update asynchronously to satisfy react-hooks lint rule
      const errorTimer = requestAnimationFrame(() => setFeedback('error'));
      const clearTimer = setTimeout(() => setFeedback('none'), 1500);
      return () => {
        cancelAnimationFrame(errorTimer);
        clearTimeout(clearTimer);
      };
    }
    prevErrorRef.current = error;
  }, [error]);

  const isValidChar = (char: string): boolean => {
    if (mode === 'numeric') return /^\d$/.test(char);
    return /^[A-Za-z0-9]$/.test(char);
  };

  const handleChange = (index: number, value: string) => {
    if (isVerifying) return; // Don't allow changes while verifying
    const lastChar = value.slice(-1);
    if (value && !isValidChar(lastChar)) return;

    const newValues = [...values];
    newValues[index] = lastChar.toUpperCase();
    setValues(newValues);
    setFeedback('none');
    hasAutoSubmitted.current = false;

    // Auto-focus next input
    if (lastChar && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
      setFocusedIndex(index + 1);
    }

    // Check if all filled - auto submit
    if (newValues.every((v) => v !== '') && !hasAutoSubmitted.current) {
      hasAutoSubmitted.current = true;
      onComplete(newValues.join(''));
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!values[index] && index > 0) {
        const newValues = [...values];
        newValues[index - 1] = '';
        setValues(newValues);
        inputRefs.current[index - 1]?.focus();
        setFocusedIndex(index - 1);
      } else {
        const newValues = [...values];
        newValues[index] = '';
        setValues(newValues);
      }
      setFeedback('none');
      hasAutoSubmitted.current = false;
    }
    if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
      setFocusedIndex(index - 1);
    }
    if (e.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
      setFocusedIndex(index + 1);
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    if (isVerifying) return;
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').trim();
    const filterRegex = mode === 'numeric' ? /\D/g : /[^A-Za-z0-9]/g;
    const filtered = pasteData.replace(filterRegex, '').slice(0, OTP_LENGTH).toUpperCase();

    if (filtered.length > 0) {
      const newValues = [...values];
      for (let i = 0; i < filtered.length; i++) {
        newValues[i] = filtered[i];
      }
      setValues(newValues);
      setFeedback('none');

      // Focus the next empty input or the last filled one
      const nextEmpty = newValues.findIndex((v) => v === '');
      const focusIndex = nextEmpty === -1 ? OTP_LENGTH - 1 : nextEmpty;
      inputRefs.current[focusIndex]?.focus();
      setFocusedIndex(focusIndex);

      // Auto-submit if all filled
      if (newValues.every((v) => v !== '') && !hasAutoSubmitted.current) {
        hasAutoSubmitted.current = true;
        onComplete(newValues.join(''));
      }
    }
  };

  const handleFocus = (index: number) => {
    setFocusedIndex(index);
  };

  const getBorderColor = (index: number): string => {
    if (feedback === 'error') return 'border-red-400 dark:border-red-500';
    if (feedback === 'success') return 'border-emerald-400 dark:border-emerald-500';
    if (values[index]) return 'border-sky-400 dark:border-sky-500';
    if (focusedIndex === index) return 'border-sky-400 dark:border-sky-500';
    return 'border-transparent';
  };

  const getShadowClass = (index: number): string => {
    if (feedback === 'error') return 'shadow-md shadow-red-500/10';
    if (feedback === 'success') return 'shadow-md shadow-emerald-500/10';
    if (values[index]) return 'shadow-md shadow-sky-500/10';
    if (focusedIndex === index) return 'shadow-md shadow-sky-500/15';
    return '';
  };

  const shakeAnimation = feedback === 'error' ? {
    x: [0, -6, 6, -4, 4, -2, 2, 0],
    transition: { duration: 0.5 },
  } : {};

  const successAnimation = feedback === 'success' ? {
    scale: [1, 1.05, 1],
    transition: { duration: 0.3 },
  } : {};

  return (
    <div className="space-y-4">
      <motion.div
        className="flex justify-center gap-2 sm:gap-3"
        animate={shakeAnimation}
      >
        {values.map((value, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{
              opacity: 1,
              y: 0,
              ...successAnimation,
            }}
            transition={{ delay: index * 0.05, duration: 0.2 }}
          >
            <div className="relative">
              <motion.input
                ref={(el) => { inputRefs.current[index] = el; }}
                type="text"
                inputMode={mode === 'numeric' ? 'numeric' : 'text'}
                maxLength={1}
                value={value}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={handlePaste}
                onFocus={() => handleFocus(index)}
                onBlur={() => setFocusedIndex(-1)}
                disabled={isVerifying}
                className={`w-11 h-13 sm:w-12 sm:h-14 text-center text-xl font-bold rounded-xl bg-muted/30 border-2 outline-none transition-all duration-200 ${getBorderColor(index)} ${getShadowClass(index)} ${values[index] ? 'text-foreground' : 'text-muted-foreground'} ${isVerifying ? 'opacity-50 cursor-not-allowed' : ''}`}
                autoComplete="one-time-code"
              />
              {/* Focus ring animation */}
              <AnimatePresence>
                {focusedIndex === index && !values[index] && !isVerifying && (
                  <motion.div
                    className="absolute inset-0 rounded-xl border-2 border-sky-400/50 pointer-events-none"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    exit={{ opacity: 0 }}
                  />
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Error / Success feedback */}
      <AnimatePresence>
        {error && (
          <motion.p
            className="text-xs text-red-500 text-center font-medium"
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.2 }}
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Resend */}
      <div className="text-center">
        {cooldown > 0 ? (
          <p className="text-xs text-muted-foreground">
            Resend code in <span className="font-bold text-sky-500">{cooldown}s</span>
          </p>
        ) : cooldown === 0 ? (
          <motion.button
            onClick={onResend}
            disabled={isVerifying}
            className={`text-xs font-bold transition-colors ${isVerifying ? 'text-muted-foreground cursor-not-allowed' : 'text-sky-500 hover:text-sky-600'}`}
            whileHover={isVerifying ? {} : { scale: 1.05 }}
            whileTap={isVerifying ? {} : { scale: 0.95 }}
          >
            {isVerifying ? 'Verifying...' : 'Resend Code'}
          </motion.button>
        ) : (
          // cooldown === -1 means loading from server
          <p className="text-xs text-muted-foreground">Loading...</p>
        )}
      </div>
    </div>
  );
}
