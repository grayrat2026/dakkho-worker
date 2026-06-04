'use client';

import { useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Globe, Smartphone, Cpu, Zap, Wrench, Building2, Ruler,
  Code, BarChart3, Wifi, Palette, Scissors, ArrowRight,
} from 'lucide-react';
import { useNavigationStore } from '@/lib/store';
import { CATEGORIES } from '@/lib/mock-data';

const lucideIconMap: Record<string, React.ElementType> = {
  Globe, Smartphone, Cpu, Zap, Wrench, Building2, Ruler,
  Code, BarChart3, Wifi, Palette, Scissors,
};

export function CategoryPills() {
  const navigate = useNavigationStore((s) => s.navigate);
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div className="mb-8">
      <h2 className="text-lg font-extrabold text-foreground mb-4">Browse Categories</h2>
      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto pb-2 scroll-smooth"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {CATEGORIES.map((cat, i) => {
          const IconComponent = lucideIconMap[cat.icon];
          return (
            <motion.button
              key={cat.id}
              className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-white/50 dark:border-white/10 shadow-sm hover:shadow-md transition-all text-sm font-semibold text-foreground"
              onClick={() => navigate('category', { categoryId: cat.id })}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
            >
              {IconComponent && <IconComponent className="w-4 h-4" style={{ color: cat.color }} />}
              <span>{cat.name}</span>
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-muted/60 text-[10px] font-bold text-muted-foreground">
                {cat.courseCount}
              </span>
            </motion.button>
          );
        })}

        {/* View All button */}
        <motion.button
          className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800/30 text-sm font-semibold text-sky-600 dark:text-sky-400"
          onClick={() => navigate('explore')}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: CATEGORIES.length * 0.03 }}
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.95 }}
        >
          View All
          <ArrowRight className="w-3.5 h-3.5" />
        </motion.button>
      </div>
    </div>
  );
}
