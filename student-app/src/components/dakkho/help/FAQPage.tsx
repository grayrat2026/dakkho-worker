'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HelpCircle, ChevronLeft, ChevronDown, ChevronUp, Search,
  BookOpen, User, CreditCard, Settings, Monitor, Sparkles,
} from 'lucide-react';
import { useNavigationStore } from '@/lib/store';
import { GlassCard } from '../shared/GlassCard';

interface FAQ {
  question: string;
  answer: string;
}

interface FAQSection {
  title: string;
  icon: React.ElementType;
  color: string;
  faqs: FAQ[];
}

export function FAQPage() {
  const { goBack } = useNavigationStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSection, setExpandedSection] = useState<string | null>('getting-started');
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);

  const sections: FAQSection[] = [
    {
      title: 'Getting Started',
      icon: Sparkles,
      color: 'text-sky-500 bg-sky-50 dark:bg-sky-900/20',
      faqs: [
        { question: 'How do I create a DAKKHO account?', answer: 'Visit the signup page and fill in your details including your name, email, institute, and technology. You will receive a verification email to activate your account. Once verified, you can start exploring courses immediately.' },
        { question: 'How do I enroll in a course?', answer: 'Navigate to any course page and click the "Enroll Now" or "Start Learning" button. Free courses are instantly accessible, while paid courses require payment completion first.' },
        { question: 'What devices does DAKKHO support?', answer: 'DAKKHO works on all modern browsers across desktop, tablet, and mobile devices. For the best experience, we recommend Chrome, Firefox, or Safari on their latest versions.' },
        { question: 'Is there a mobile app available?', answer: 'Currently, DAKKHO is a progressive web app (PWA) that works seamlessly on mobile browsers. You can add it to your home screen for an app-like experience. A native mobile app is in development.' },
      ],
    },
    {
      title: 'Account',
      icon: User,
      color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20',
      faqs: [
        { question: 'How do I reset my password?', answer: 'Go to the login page and click "Forgot Password". Enter your registered email address, and you will receive a password reset link. The link expires in 24 hours for security reasons.' },
        { question: 'Can I change my email address?', answer: 'Yes, you can update your email from Account Settings. You will need to verify the new email address before the change takes effect. Your old email will remain active for 7 days as a backup.' },
        { question: 'How do I enable two-factor authentication?', answer: 'Navigate to Account Settings > Security > Two-Factor Authentication. You can set up 2FA using an authenticator app like Google Authenticator or Authy. Backup codes will be provided during setup.' },
        { question: 'Can I delete my account?', answer: 'Yes, you can request account deletion from your profile settings. Please note that this action is irreversible and all your data, including course progress and certificates, will be permanently removed after a 30-day grace period.' },
      ],
    },
    {
      title: 'Courses',
      icon: BookOpen,
      color: 'text-violet-500 bg-violet-50 dark:bg-violet-900/20',
      faqs: [
        { question: 'How long do I have access to a course?', answer: 'Once enrolled, you have lifetime access to the course content, including any future updates. This applies to both free and paid courses.' },
        { question: 'Can I download course videos for offline viewing?', answer: 'Premium subscribers can download videos for offline viewing through the DAKKHO app. Downloaded content is protected and cannot be shared or transferred to other devices.' },
        { question: 'How do I get a certificate after completing a course?', answer: 'Certificates are automatically generated when you complete all required modules and assignments. You can download your certificate from the Certificates section in your profile.' },
        { question: 'What if I find incorrect content in a course?', answer: 'You can report any issues using the "Report Issue" button within the video player or course page. Our content team reviews all reports and updates the material accordingly.' },
      ],
    },
    {
      title: 'Payments',
      icon: CreditCard,
      color: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20',
      faqs: [
        { question: 'What payment methods are accepted?', answer: 'We accept bKash, Nagad, Rocket, Visa, Mastercard, and bank transfers. All payments are processed securely through our encrypted payment gateway.' },
        { question: 'Can I get a refund?', answer: 'Yes, we offer a 7-day refund policy for paid courses. If you are not satisfied with a course, you can request a refund within 7 days of purchase. Refunds are processed within 5-7 business days.' },
        { question: 'Are there any discounts available?', answer: 'We regularly offer seasonal discounts and promotions. Students from partner institutions may receive special pricing. Check the Pricing page for current offers and subscription plans.' },
        { question: 'How do subscriptions work?', answer: 'Subscriptions give you unlimited access to all courses for the duration of your plan. You can choose monthly or annual billing. Annual plans come with a significant discount compared to monthly billing.' },
      ],
    },
    {
      title: 'Technical',
      icon: Monitor,
      color: 'text-rose-500 bg-rose-50 dark:bg-rose-900/20',
      faqs: [
        { question: 'Video playback is not working. What should I do?', answer: 'Try refreshing the page first. If the issue persists, check your internet connection speed (minimum 2 Mbps recommended). Clear your browser cache and cookies. If using a VPN, try disabling it. Contact support if the problem continues.' },
        { question: 'The app is running slow. How can I improve performance?', answer: 'Close unnecessary browser tabs, ensure your browser is updated to the latest version, and try reducing the video quality setting. If using a mobile device, make sure you have sufficient free storage space.' },
        { question: 'How do I report a bug?', answer: 'Use the "Report Issue" option in Help & Support. Include a detailed description of the bug, steps to reproduce it, your device/browser information, and any screenshots. Our team will investigate and respond within 48 hours.' },
        { question: 'Is my data secure on DAKKHO?', answer: 'Absolutely. We use industry-standard encryption (AES-256) for data at rest and TLS 1.3 for data in transit. Your payment information is never stored on our servers. We are compliant with Bangladesh Data Protection regulations.' },
      ],
    },
  ];

  const filteredSections = sections.map((section) => ({
    ...section,
    faqs: section.faqs.filter(
      (faq) =>
        faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  })).filter((section) => section.faqs.length > 0);

  return (
    <div className="pb-20 lg:pb-0">
      {/* Header */}
      <motion.div className="flex items-center gap-3 mb-6" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <motion.button className="w-9 h-9 rounded-xl bg-muted/30 flex items-center justify-center text-foreground" onClick={goBack} whileTap={{ scale: 0.9 }}>
          <ChevronLeft className="w-5 h-5" />
        </motion.button>
        <div>
          <h1 className="text-xl font-extrabold text-foreground">FAQ</h1>
          <p className="text-xs text-muted-foreground">Frequently asked questions</p>
        </div>
      </motion.div>

      {/* Search */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search questions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/50 dark:border-white/10 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/50"
          />
        </div>
      </motion.div>

      {/* FAQ Sections */}
      <div className="space-y-4">
        {filteredSections.map((section, sectionIndex) => (
          <motion.div
            key={section.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + sectionIndex * 0.05 }}
          >
            <GlassCard className="overflow-hidden">
              {/* Section Header */}
              <motion.button
                className="w-full p-4 flex items-center justify-between"
                onClick={() => setExpandedSection(expandedSection === section.title.toLowerCase().replace(/\s/g, '-') ? null : section.title.toLowerCase().replace(/\s/g, '-'))}
                whileTap={{ scale: 0.99 }}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl ${section.color} flex items-center justify-center`}>
                    <section.icon className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-foreground">{section.title}</p>
                    <p className="text-xs text-muted-foreground">{section.faqs.length} questions</p>
                  </div>
                </div>
                {expandedSection === section.title.toLowerCase().replace(/\s/g, '-') ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </motion.button>

              {/* FAQs */}
              <AnimatePresence>
                {expandedSection === section.title.toLowerCase().replace(/\s/g, '-') && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 space-y-2">
                      {section.faqs.map((faq, faqIndex) => {
                        const faqId = `${section.title}-${faqIndex}`;
                        return (
                          <motion.div
                            key={faqIndex}
                            className="rounded-xl bg-muted/20 overflow-hidden"
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: faqIndex * 0.03 }}
                          >
                            <button
                              className="w-full p-3 flex items-start gap-2 text-left"
                              onClick={() => setExpandedFAQ(expandedFAQ === faqId ? null : faqId)}
                            >
                              <HelpCircle className="w-4 h-4 text-sky-500 mt-0.5 flex-shrink-0" />
                              <span className="text-sm font-semibold text-foreground flex-1">{faq.question}</span>
                              {expandedFAQ === faqId ? (
                                <ChevronUp className="w-3 h-3 text-muted-foreground mt-1" />
                              ) : (
                                <ChevronDown className="w-3 h-3 text-muted-foreground mt-1" />
                              )}
                            </button>
                            <AnimatePresence>
                              {expandedFAQ === faqId && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  className="overflow-hidden"
                                >
                                  <p className="px-3 pb-3 text-xs text-muted-foreground leading-relaxed pl-9">
                                    {faq.answer}
                                  </p>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {filteredSections.length === 0 && (
        <motion.div className="text-center py-12" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <HelpCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-semibold text-foreground">No results found</p>
          <p className="text-xs text-muted-foreground">Try different search terms</p>
        </motion.div>
      )}
    </div>
  );
}
