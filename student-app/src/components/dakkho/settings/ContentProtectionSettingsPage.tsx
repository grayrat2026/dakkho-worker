'use client';

import { motion } from 'framer-motion';
import { Shield, Lock, ChevronLeft, Info } from 'lucide-react';
import { useNavigationStore } from '@/lib/store';
import { GlassCard } from '../shared/GlassCard';

export function ContentProtectionSettingsPage() {
  const { goBack } = useNavigationStore();

  return (
    <div className="pb-20 lg:pb-0">
      {/* Header */}
      <motion.div className="flex items-center gap-3 mb-6" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <motion.button className="w-9 h-9 rounded-xl bg-muted/30 flex items-center justify-center text-foreground" onClick={goBack} whileTap={{ scale: 0.9 }}>
          <ChevronLeft className="w-5 h-5" />
        </motion.button>
        <div>
          <h1 className="text-xl font-extrabold text-foreground">Content Protection</h1>
          <p className="text-xs text-muted-foreground">Managed by administrator</p>
        </div>
      </motion.div>

      {/* Admin Controlled Banner */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <GlassCard className="p-8 text-center">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-sky-500/20">
            <Lock className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-lg font-extrabold text-foreground mb-2">Administrator Controlled</h2>
          <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
            Content protection settings are managed by your institution administrator. These settings are applied automatically to protect course materials.
          </p>
          <div className="flex items-center justify-center gap-2 text-xs text-sky-500">
            <Shield className="w-4 h-4" />
            <span className="font-semibold">Your content is protected</span>
          </div>
        </GlassCard>
      </motion.div>

      {/* Info */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <div className="mt-4 p-3 rounded-xl bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800 flex items-start gap-2">
          <Info className="w-4 h-4 text-sky-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-sky-700 dark:text-sky-300 leading-relaxed">
            Content protection features like copy prevention, screenshot blocking, and print restrictions are enforced server-side. Contact your administrator to request changes.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
