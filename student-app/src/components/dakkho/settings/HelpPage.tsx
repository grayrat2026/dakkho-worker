'use client';

import { motion } from 'framer-motion';
import {
  HelpCircle, MessageSquare, Mail, ExternalLink, ChevronRight,
  ChevronLeft, BookOpen, Shield, CreditCard, AlertCircle, Phone,
} from 'lucide-react';
import { useNavigationStore } from '@/lib/store';
import { GlassCard } from '../shared/GlassCard';

export function HelpPage() {
  const { goBack, navigate } = useNavigationStore();

  const faqs = [
    { q: 'How do I enroll in a course?', a: 'Navigate to any course page and click the "Enroll Now" or "Start Learning" button. Free courses are instantly accessible.' },
    { q: 'Can I download videos for offline viewing?', a: 'Currently, offline viewing is not supported. You need an internet connection to stream content.' },
    { q: 'How do I track my progress?', a: 'Your watch progress is automatically saved. Check "My Courses" to see your progress bars and completed courses.' },
    { q: 'Is there a certificate upon completion?', a: 'Yes! You receive a certificate after completing all videos in a course.' },
    { q: 'How do I contact an instructor?', a: 'You can use the Q&A section in the video player to ask questions directly to instructors.' },
  ];

  const helpCategories = [
    { icon: BookOpen, label: 'FAQs', desc: 'Browse frequently asked questions', page: 'faq' as const, color: 'text-sky-500 bg-sky-50 dark:bg-sky-900/20' },
    { icon: MessageSquare, label: 'Contact Support', desc: 'Get help from our support team', page: 'contact-support' as const, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' },
    { icon: AlertCircle, label: 'Report an Issue', desc: 'Tell us about a problem you found', page: 'report-issue' as const, color: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20' },
    { icon: Shield, label: 'Terms of Service', desc: 'Read our terms and conditions', page: 'terms-of-service' as const, color: 'text-purple-500 bg-purple-50 dark:bg-purple-900/20' },
    { icon: Shield, label: 'Privacy Policy', desc: 'How we handle your data', page: 'privacy-policy' as const, color: 'text-rose-500 bg-rose-50 dark:bg-rose-900/20' },
    { icon: CreditCard, label: 'Refund Policy', desc: 'Our refund and cancellation terms', page: 'refund-policy' as const, color: 'text-teal-500 bg-teal-50 dark:bg-teal-900/20' },
  ];

  return (
    <div className="pb-20 lg:pb-0">
      {/* Header */}
      <motion.div className="flex items-center gap-3 mb-6" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <motion.button
          className="w-9 h-9 rounded-xl bg-muted/30 flex items-center justify-center text-foreground"
          onClick={goBack}
          whileTap={{ scale: 0.9 }}
        >
          <ChevronLeft className="w-5 h-5" />
        </motion.button>
        <div>
          <h1 className="text-xl font-extrabold text-foreground">Help & Support</h1>
          <p className="text-xs text-muted-foreground">Find answers and get assistance</p>
        </div>
      </motion.div>

      {/* Quick Contact */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        {[
          { icon: MessageSquare, label: 'Live Chat', desc: 'Chat with our support team', color: 'text-sky-500 bg-sky-50 dark:bg-sky-900/20', page: 'contact-support' as const },
          { icon: Mail, label: 'Email Us', desc: 'support@dakkho.pro.bd', color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20', page: 'contact-support' as const },
        ].map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <GlassCard
              hover
              className="p-4 flex items-center gap-3 cursor-pointer"
              onClick={() => navigate(item.page)}
            >
              <div className={`w-10 h-10 rounded-xl ${item.color} flex items-center justify-center`}>
                <item.icon className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-foreground">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {/* Help Categories */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <h2 className="text-lg font-extrabold text-foreground mb-4 flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-sky-500" />
          Help Categories
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          {helpCategories.map((cat, i) => (
            <motion.div
              key={cat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.05 }}
            >
              <GlassCard
                hover
                className="p-4 flex items-center gap-3 cursor-pointer"
                onClick={() => navigate(cat.page)}
              >
                <div className={`w-10 h-10 rounded-xl ${cat.color} flex items-center justify-center`}>
                  <cat.icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-foreground">{cat.label}</p>
                  <p className="text-xs text-muted-foreground">{cat.desc}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* FAQs */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-extrabold text-foreground flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-sky-500" />
            Frequently Asked Questions
          </h2>
          <motion.button
            className="text-xs text-sky-500 font-semibold px-3 py-1.5 rounded-lg bg-sky-50 dark:bg-sky-900/20"
            onClick={() => navigate('faq')}
            whileTap={{ scale: 0.95 }}
          >
            View All
          </motion.button>
        </div>
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 + i * 0.05 }}
            >
              <GlassCard className="p-4">
                <h3 className="text-sm font-bold text-foreground mb-1">{faq.q}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{faq.a}</p>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
