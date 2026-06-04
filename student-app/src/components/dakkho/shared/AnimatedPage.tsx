'use client';

import { motion, AnimatePresence } from 'framer-motion';

interface AnimatedPageProps {
  children: React.ReactNode;
  keyProp?: string;
}

export function AnimatedPage({ children, keyProp }: AnimatedPageProps) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={keyProp}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
