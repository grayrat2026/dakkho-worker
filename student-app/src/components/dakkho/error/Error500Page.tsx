'use client';

import { motion } from 'framer-motion';
import { Home, RefreshCw } from 'lucide-react';
import { useNavigationStore } from '@/lib/store';
import { GradientButton } from '../shared/GradientButton';

export function Error500Page() {
  const navigate = useNavigationStore((s) => s.navigate);

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <motion.div
        className="text-center"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      >
        <motion.div
          className="text-8xl font-extrabold text-red-500 mb-4"
          animate={{ y: [0, -10, 0], rotate: [0, 2, -2, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        >
          500
        </motion.div>
        <h2 className="text-xl font-bold text-foreground mb-2">Server Error</h2>
        <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto">
          Something went wrong on our end. We&apos;re working on fixing it.
        </p>
        <div className="flex gap-3 justify-center">
          <GradientButton onClick={() => navigate('home')} size="md">
            <Home className="w-4 h-4" />
            Go Home
          </GradientButton>
          <GradientButton onClick={() => window.location.reload()} size="md" variant="primary" className="bg-muted/50 text-foreground hover:bg-muted/70 shadow-transparent">
            <RefreshCw className="w-4 h-4" />
            Retry
          </GradientButton>
        </div>
      </motion.div>
    </div>
  );
}
