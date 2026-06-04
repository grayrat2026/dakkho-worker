'use client';

import { motion } from 'framer-motion';
import { Home, Search } from 'lucide-react';
import { useNavigationStore } from '@/lib/store';
import { GradientButton } from '../shared/GradientButton';

export function Error404Page() {
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
          className="text-8xl font-extrabold gradient-text mb-4"
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        >
          404
        </motion.div>
        <h2 className="text-xl font-bold text-foreground mb-2">Page Not Found</h2>
        <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto">
          Oops! The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="flex gap-3 justify-center">
          <GradientButton onClick={() => navigate('home')} size="md">
            <Home className="w-4 h-4" />
            Go Home
          </GradientButton>
          <GradientButton onClick={() => navigate('search')} size="md" className="bg-muted/50 text-foreground hover:bg-muted/70 shadow-transparent">
            <Search className="w-4 h-4" />
            Search
          </GradientButton>
        </div>
      </motion.div>
    </div>
  );
}
