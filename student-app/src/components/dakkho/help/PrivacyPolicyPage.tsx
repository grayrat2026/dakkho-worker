'use client';

import { motion } from 'framer-motion';
import {
  Shield, ChevronLeft, Eye, Database, Lock, Users,
  Globe, Cookie, Bell, Scale, Mail, Clock,
} from 'lucide-react';
import { useNavigationStore } from '@/lib/store';
import { GlassCard } from '../shared/GlassCard';

export function PrivacyPolicyPage() {
  const { goBack } = useNavigationStore();

  const sections = [
    {
      title: '1. Information We Collect',
      icon: Database,
      color: 'text-sky-500 bg-sky-50 dark:bg-sky-900/20',
      content: [
        { subtitle: 'Personal Information', text: 'When you create an account, we collect your full name, email address, phone number (optional), institute name, technology/department, and semester information. This information is necessary to provide our educational services and personalize your learning experience.' },
        { subtitle: 'Usage Data', text: 'We automatically collect information about how you interact with the Platform, including pages visited, videos watched, time spent on content, click patterns, and feature usage. This data helps us improve our services and provide personalized recommendations.' },
        { subtitle: 'Device Information', text: 'We collect device-specific information such as browser type, operating system, device model, unique device identifiers, screen resolution, and network information (IP address, connection type) to optimize performance and ensure compatibility.' },
        { subtitle: 'Payment Information', text: 'When you make a purchase, we collect payment transaction details. However, your full payment card information is never stored on our servers — it is processed securely by our payment partners (bKash, SSLCommerz) who are PCI-DSS compliant.' },
      ],
    },
    {
      title: '2. How We Use Your Information',
      icon: Eye,
      color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20',
      content: [
        { subtitle: 'Service Delivery', text: 'We use your information to provide, maintain, and improve the DAKKHO Platform, process your enrollments and payments, deliver course content, track your learning progress, and issue certificates upon course completion.' },
        { subtitle: 'Personalization', text: 'Your data helps us personalize your experience by recommending relevant courses, displaying appropriate content for your technology/department, and customizing the interface to your preferences and learning patterns.' },
        { subtitle: 'Communication', text: 'We use your contact information to send important service notifications (course updates, grade postings, security alerts), respond to your support requests, and with your consent, send promotional communications about new courses and offers.' },
        { subtitle: 'Analytics & Improvement', text: 'We analyze usage patterns to understand how students use the Platform, identify popular content and features, detect and fix bugs, optimize performance, and make data-driven decisions about new features and improvements.' },
      ],
    },
    {
      title: '3. Data Sharing & Disclosure',
      icon: Users,
      color: 'text-violet-500 bg-violet-50 dark:bg-violet-900/20',
      content: [
        { subtitle: 'Instructors', text: 'Course instructors can see anonymized progress data and engagement metrics for their courses. They do not have access to your personal contact information unless you choose to contact them directly through the Platform.' },
        { subtitle: 'Service Providers', text: 'We share data with trusted third-party service providers who assist in operating the Platform (cloud hosting, payment processing, email delivery, analytics). All providers are contractually obligated to protect your data and use it only for the specified purposes.' },
        { subtitle: 'Legal Requirements', text: 'We may disclose your information if required by law, regulation, legal process, or governmental request. We may also disclose information when we believe in good faith that disclosure is necessary to protect our rights, protect your safety or the safety of others, investigate fraud, or respond to a government request.' },
        { subtitle: 'Anonymized Data', text: 'We may share aggregated, anonymized data that cannot be used to identify you with research institutions, educational organizations, and partners for the purpose of improving technical education in Bangladesh.' },
      ],
    },
    {
      title: '4. Data Security',
      icon: Lock,
      color: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20',
      content: [
        { subtitle: 'Encryption', text: 'All data in transit is protected using TLS 1.3 encryption. Data at rest is encrypted using AES-256 encryption. Your passwords are hashed using bcrypt with a minimum of 12 rounds and are never stored in plain text.' },
        { subtitle: 'Access Controls', text: 'We implement strict access controls based on the principle of least privilege. Only authorized personnel with a legitimate need can access user data. All access is logged and audited regularly.' },
        { subtitle: 'Content Protection', text: 'We employ advanced content protection measures including screenshot prevention, screen recording detection, copy protection, and digital watermarking to protect course content from unauthorized distribution.' },
        { subtitle: 'Incident Response', text: 'In the event of a data breach, we will notify affected users within 72 hours as required by Bangladesh Data Protection regulations. We maintain a comprehensive incident response plan and conduct regular security assessments.' },
      ],
    },
    {
      title: '5. Cookies & Tracking',
      icon: Cookie,
      color: 'text-rose-500 bg-rose-50 dark:bg-rose-900/20',
      content: [
        { subtitle: 'Essential Cookies', text: 'We use essential cookies to maintain your session, remember your login state, and ensure the security of your account. These cookies are necessary for the Platform to function and cannot be disabled.' },
        { subtitle: 'Analytics Cookies', text: 'With your consent, we use analytics cookies to understand how you use the Platform, measure performance, and identify areas for improvement. You can control these preferences from your Privacy Settings.' },
        { subtitle: 'Third-Party Tracking', text: 'We use third-party services (Google Analytics, Mixpanel) that may set their own cookies. These services collect information about your browsing activity across different websites. You can opt out through your browser settings or our privacy controls.' },
      ],
    },
    {
      title: '6. Your Rights',
      icon: Scale,
      color: 'text-teal-500 bg-teal-50 dark:bg-teal-900/20',
      content: [
        { subtitle: 'Access & Portability', text: 'You have the right to access your personal data and receive a copy in a machine-readable format. You can download your data from Account Settings > Privacy > Download My Data.' },
        { subtitle: 'Correction & Deletion', text: 'You can update your personal information at any time through your account settings. You can request deletion of your account and all associated data, which will be processed within 30 days.' },
        { subtitle: 'Consent Management', text: 'You can manage your consent preferences for cookies, analytics, and marketing communications at any time from your Privacy Settings. Withdrawal of consent does not affect the lawfulness of processing based on consent before its withdrawal.' },
      ],
    },
  ];

  return (
    <div className="pb-20 lg:pb-0">
      {/* Header */}
      <motion.div className="flex items-center gap-3 mb-6" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <motion.button className="w-9 h-9 rounded-xl bg-muted/30 flex items-center justify-center text-foreground" onClick={goBack} whileTap={{ scale: 0.9 }}>
          <ChevronLeft className="w-5 h-5" />
        </motion.button>
        <div>
          <h1 className="text-xl font-extrabold text-foreground">Privacy Policy</h1>
          <p className="text-xs text-muted-foreground">Last updated: January 15, 2025</p>
        </div>
      </motion.div>

      {/* Summary Banner */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <GlassCard className="p-5 mb-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center flex-shrink-0">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-foreground mb-1">Your Privacy Matters</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                At DAKKHO, we are committed to protecting your personal information and being transparent about how we collect, use, and share your data. This policy outlines our practices in compliance with Bangladesh Data Protection regulations.
              </p>
              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span>Effective: January 15, 2025</span>
                <span>•</span>
                <Mail className="w-3 h-3" />
                <span>privacy@dakkho.com</span>
              </div>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Sections */}
      <div className="space-y-4">
        {sections.map((section, sectionIndex) => (
          <motion.div
            key={section.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + sectionIndex * 0.05 }}
          >
            <GlassCard className="p-5">
              <h2 className="text-base font-extrabold text-foreground mb-4 flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg ${section.color} flex items-center justify-center`}>
                  <section.icon className="w-4 h-4" />
                </div>
                {section.title}
              </h2>
              <div className="space-y-4">
                {section.content.map((item, itemIndex) => (
                  <motion.div
                    key={item.subtitle}
                    className="pl-4 border-l-2 border-sky-200 dark:border-sky-800"
                    initial={{ opacity: 0, x: -5 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15 + sectionIndex * 0.05 + itemIndex * 0.03 }}
                  >
                    <h3 className="text-sm font-bold text-foreground mb-1">{item.subtitle}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{item.text}</p>
                  </motion.div>
                ))}
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {/* Contact */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
        <GlassCard className="p-5 mt-4">
          <h2 className="text-base font-extrabold text-foreground mb-2">Questions About Privacy?</h2>
          <p className="text-sm text-muted-foreground mb-3">If you have any questions about this Privacy Policy or how we handle your data, please contact our Data Protection Officer.</p>
          <div className="flex items-center gap-2 text-sm text-sky-500 font-semibold">
            <Mail className="w-4 h-4" />
            privacy@dakkho.com
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
}
