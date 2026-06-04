'use client';

import { motion } from 'framer-motion';
import {
  FileText, ChevronLeft, Scale, Shield, Users, CreditCard,
  AlertTriangle, BookOpen, ArrowRight, CheckCircle, Clock,
  ExternalLink,
} from 'lucide-react';
import { useNavigationStore } from '@/lib/store';
import { GlassCard } from '../shared/GlassCard';
import { GradientButton } from '../shared/GradientButton';

export function TermsPage() {
  const { goBack } = useNavigationStore();

  const keyPoints = [
    {
      title: 'Account Responsibility',
      description: 'You are responsible for maintaining the confidentiality of your account credentials. Do not share your login information with anyone.',
      icon: Users,
      color: 'text-sky-500 bg-sky-50 dark:bg-sky-900/20',
    },
    {
      title: 'Content Protection',
      description: 'All course content is protected by intellectual property laws. Copying, recording, or redistributing content is strictly prohibited.',
      icon: Shield,
      color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20',
    },
    {
      title: 'Payment Terms',
      description: 'Subscriptions auto-renew at the end of each billing period. Refunds are subject to our 7-day refund policy for course purchases.',
      icon: CreditCard,
      color: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20',
    },
    {
      title: 'Prohibited Activities',
      description: 'Account sharing, content piracy, using automated tools, and circumventing security measures are violations of our terms.',
      icon: AlertTriangle,
      color: 'text-red-500 bg-red-50 dark:bg-red-900/20',
    },
  ];

  const importantClauses = [
    'You must be at least 16 years old to use DAKKHO.',
    'Your subscription automatically renews unless cancelled before the renewal date.',
    'We reserve the right to suspend accounts that violate our Terms of Service.',
    'Content protection measures are in place — circumventing them may result in legal action.',
    'Refunds are available within 7 days of purchase for qualifying courses.',
    'We may modify these terms with 30 days\' notice for material changes.',
    'Your use of the platform constitutes acceptance of our Privacy Policy.',
    'Limitation of liability applies — see full terms for details.',
  ];

  return (
    <div className="pb-20 lg:pb-0">
      {/* Header */}
      <motion.div className="flex items-center gap-3 mb-6" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <motion.button className="w-9 h-9 rounded-xl bg-muted/30 flex items-center justify-center text-foreground" onClick={goBack} whileTap={{ scale: 0.9 }}>
          <ChevronLeft className="w-5 h-5" />
        </motion.button>
        <div>
          <h1 className="text-xl font-extrabold text-foreground">Terms of Service</h1>
          <p className="text-xs text-muted-foreground">Quick summary of our terms</p>
        </div>
      </motion.div>

      {/* Summary Banner */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <GlassCard className="p-5 mb-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center flex-shrink-0">
              <Scale className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-foreground mb-1">Terms at a Glance</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Here is a simplified summary of our Terms of Service. For the complete legal document, please read our full Terms of Service.
              </p>
              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span>Last updated: January 15, 2025</span>
              </div>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Key Points */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <GlassCard className="p-5 mb-4">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-4">
            <BookOpen className="w-4 h-4 text-sky-500" /> Key Points
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {keyPoints.map((point, i) => (
              <motion.div
                key={point.title}
                className="p-3 rounded-xl bg-muted/20"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.05 }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-8 h-8 rounded-lg ${point.color} flex items-center justify-center flex-shrink-0`}>
                    <point.icon className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-foreground">{point.title}</h4>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{point.description}</p>
              </motion.div>
            ))}
          </div>
        </GlassCard>
      </motion.div>

      {/* Important Clauses */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <GlassCard className="p-5 mb-4">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-4">
            <CheckCircle className="w-4 h-4 text-sky-500" /> Important Things to Know
          </h3>
          <div className="space-y-2">
            {importantClauses.map((clause, i) => (
              <motion.div
                key={i}
                className="flex items-start gap-2 p-2 rounded-lg bg-muted/10"
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.03 }}
              >
                <CheckCircle className="w-3.5 h-3.5 text-sky-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-muted-foreground leading-relaxed">{clause}</p>
              </motion.div>
            ))}
          </div>
        </GlassCard>
      </motion.div>

      {/* Link to Full Terms */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <GlassCard className="p-5">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">Full Terms of Service</h3>
          <p className="text-xs text-muted-foreground mb-4">
            This is a summary only. For the complete Terms of Service document with all legal details, please read the full version.
          </p>
          <GradientButton size="sm" className="w-full">
            <FileText className="w-4 h-4" /> Read Full Terms of Service
          </GradientButton>
          <div className="mt-3 text-center">
            <p className="text-xs text-muted-foreground">
              Questions? Contact us at <span className="text-sky-500 font-semibold">legal@dakkho.com</span>
            </p>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
}
