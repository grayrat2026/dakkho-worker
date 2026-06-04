'use client';

import { motion } from 'framer-motion';
import { Play, Sparkles, ArrowRight } from 'lucide-react';
import { useNavigationStore } from '@/lib/store';
import { GradientButton } from '../shared/GradientButton';

export function HeroSection() {
  const navigate = useNavigationStore((s) => s.navigate);

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-sky-500 via-blue-600 to-indigo-700 p-6 md:p-10 text-white mb-8">
      {/* Floating decorative elements */}
      <motion.div
        className="absolute top-6 right-10 w-20 h-20 rounded-full bg-white/10"
        animate={{ y: [0, -15, 0], rotate: [0, 180, 360] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'linear' }}
      />
      <motion.div
        className="absolute bottom-6 left-6 w-12 h-12 rounded-full bg-white/10"
        animate={{ y: [0, 10, 0], x: [0, 8, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute top-1/2 right-1/3 w-3 h-3 rounded-full bg-white/20"
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-1/3 left-1/4 w-2 h-2 rounded-full bg-white/20"
        animate={{ y: [0, 6, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute top-10 left-1/2 w-4 h-4 rounded-full bg-white/15"
        animate={{ scale: [1, 1.5, 1] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="relative z-10 max-w-xl">
        <motion.div
          className="flex items-center gap-2 mb-4"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Sparkles className="w-5 h-5 text-amber-300" />
          <span className="text-sm font-bold text-white/80">Bangladesh&apos;s #1 Polytechnic Platform</span>
        </motion.div>

        <motion.h1
          className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          Learn, Stream{' '}
          <motion.span
            className="inline-block"
            animate={{ color: ['#fff', '#fbbf24', '#34d399', '#fff'] }}
            transition={{ duration: 4, repeat: Infinity }}
          >
            & Succeed
          </motion.span>
        </motion.h1>

        <motion.p
          className="text-base md:text-lg text-white/80 mb-6 max-w-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          Watch courses from top instructors, ace your BTEB exams, and build skills that matter.
        </motion.p>

        <motion.div
          className="flex flex-wrap gap-3"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <GradientButton
            onClick={() => navigate('explore')}
            className="bg-white text-sky-600 hover:bg-white/90 shadow-white/30"
            variant="primary"
            size="lg"
          >
            <Play className="w-4 h-4" />
            Start Learning
          </GradientButton>
          <GradientButton
            onClick={() => navigate('explore')}
            className="bg-white/15 hover:bg-white/25 shadow-transparent border border-white/30"
            size="lg"
          >
            Explore Courses
            <ArrowRight className="w-4 h-4" />
          </GradientButton>
        </motion.div>
      </div>
    </div>
  );
}
