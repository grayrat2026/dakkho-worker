'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  FileText, ChevronLeft, Clock, CheckCircle,
  BookOpen, Scale, Shield, Users, AlertTriangle,
} from 'lucide-react';
import { useNavigationStore } from '@/lib/store';
import { GlassCard } from '../shared/GlassCard';

export function TermsOfServicePage() {
  const { goBack } = useNavigationStore();
  const [activeSection, setActiveSection] = useState('introduction');

  const sections = [
    { id: 'introduction', title: '1. Introduction', icon: BookOpen },
    { id: 'acceptance', title: '2. Acceptance of Terms', icon: CheckCircle },
    { id: 'accounts', title: '3. User Accounts', icon: Users },
    { id: 'content', title: '4. Content & Intellectual Property', icon: Shield },
    { id: 'prohibited', title: '5. Prohibited Activities', icon: AlertTriangle },
    { id: 'payments', title: '6. Payments & Subscriptions', icon: FileText },
    { id: 'liability', title: '7. Limitation of Liability', icon: Scale },
    { id: 'modifications', title: '8. Modifications', icon: Clock },
  ];

  const content: Record<string, { title: string; body: string[] }> = {
    introduction: {
      title: '1. Introduction',
      body: [
        'Welcome to DAKKHO ("the Platform"), a comprehensive student streaming and learning platform operated by DAKKHO Education Technologies Ltd. ("we", "us", or "our").',
        'These Terms of Service ("Terms") govern your access to and use of the DAKKHO platform, including our website, mobile applications, and all related services. By accessing or using our Platform, you agree to be bound by these Terms.',
        'DAKKHO provides educational content, video streaming services, course management tools, and community features designed for students of polytechnic institutes in Bangladesh. Our mission is to make quality technical education accessible to all.',
      ],
    },
    acceptance: {
      title: '2. Acceptance of Terms',
      body: [
        'By creating an account, accessing, or using the DAKKHO Platform, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service, along with our Privacy Policy and Content Protection Policy.',
        'If you do not agree with any part of these Terms, you must not use the Platform. Your continued use of the Platform following any changes to these Terms constitutes acceptance of those changes.',
        'You must be at least 16 years of age to use this Platform. If you are under 18, you must have parental or guardian consent to use the Platform and make purchases.',
      ],
    },
    accounts: {
      title: '3. User Accounts',
      body: [
        'To access certain features of the Platform, you must register for an account. During registration, you agree to provide accurate, current, and complete information. You are responsible for maintaining the confidentiality of your account credentials.',
        'You must not share your account credentials with any third party. You are solely responsible for all activities that occur under your account. If you suspect unauthorized access to your account, you must notify us immediately at security@dakkho.com.',
        'We reserve the right to suspend or terminate accounts that violate these Terms, engage in fraudulent activity, or have been inactive for more than 24 consecutive months. Account deletion requests can be submitted through your account settings.',
      ],
    },
    content: {
      title: '4. Content & Intellectual Property',
      body: [
        'All content on the DAKKHO Platform, including but not limited to videos, text, images, audio, software, and course materials, is the intellectual property of DAKKHO, its instructors, or its content partners and is protected by applicable copyright and intellectual property laws.',
        'You are granted a limited, non-exclusive, non-transferable, revocable license to access and view the content for your personal, non-commercial educational purposes only. This license does not include the right to modify, distribute, transmit, display, perform, reproduce, publish, license, create derivative works from, transfer, or sell any content.',
        'Content protection measures are in place to prevent unauthorized copying, downloading, recording, or distribution of course materials. Circumventing these measures is a violation of these Terms and may result in immediate account termination and legal action.',
      ],
    },
    prohibited: {
      title: '5. Prohibited Activities',
      body: [
        'You agree not to engage in any of the following prohibited activities: (a) Copying, downloading, recording, or redistributing any course content; (b) Sharing your account credentials with others; (c) Using automated tools, bots, or scrapers to access the Platform; (d) Attempting to circumvent content protection measures; (e) Impersonating another user or misrepresenting your affiliation.',
        'Additionally, you must not: (f) Upload malicious code, viruses, or harmful content; (g) Harass, abuse, or threaten other users; (h) Create multiple accounts to exploit free trials or promotions; (i) Use the Platform for any unlawful purpose; (j) Interfere with or disrupt the Platform\'s infrastructure.',
        'Violation of these prohibitions may result in immediate account suspension or termination, forfeiture of any paid subscriptions, and potential legal proceedings.',
      ],
    },
    payments: {
      title: '6. Payments & Subscriptions',
      body: [
        'Certain features and content on the Platform require payment. All prices are displayed in Bangladeshi Taka (BDT) and include applicable taxes. Payments can be made via bKash, Nagad, Rocket, Visa, Mastercard, or bank transfer.',
        'Subscription plans are billed on a recurring basis (monthly or annually) depending on your selected plan. Your subscription will automatically renew at the end of each billing period unless you cancel before the renewal date. You can manage your subscription from your account settings.',
        'Refunds are subject to our Refund Policy. In general, we offer a 7-day refund window for course purchases and a prorated refund for annual subscriptions cancelled within the first 14 days.',
      ],
    },
    liability: {
      title: '7. Limitation of Liability',
      body: [
        'TO THE MAXIMUM EXTENT PERMITTED BY LAW, DAKKHO SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES, RESULTING FROM YOUR ACCESS TO OR USE OF (OR INABILITY TO ACCESS OR USE) THE PLATFORM.',
        'Our total liability for any claim arising from or related to these Terms shall not exceed the amount you paid to DAKKHO in the twelve (12) months preceding the event giving rise to the liability.',
        'We do not guarantee that the Platform will be error-free, uninterrupted, or free of viruses or other harmful components. We are not responsible for the content, accuracy, or opinions expressed by instructors or other users on the Platform.',
      ],
    },
    modifications: {
      title: '8. Modifications',
      body: [
        'We reserve the right to modify these Terms at any time. We will notify you of material changes by posting the updated Terms on our Platform and, where appropriate, sending you an email notification. Your continued use of the Platform after such modifications constitutes your acceptance of the revised Terms.',
        'If you do not agree with the modified Terms, you must discontinue use of the Platform and, if applicable, cancel your subscription. We will make reasonable efforts to provide at least 30 days\' notice before any material changes take effect.',
        'These Terms were last updated on January 15, 2025. For questions about these Terms, please contact us at legal@dakkho.com.',
      ],
    },
  };

  return (
    <div className="pb-20 lg:pb-0">
      {/* Header */}
      <motion.div className="flex items-center gap-3 mb-6" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <motion.button className="w-9 h-9 rounded-xl bg-muted/30 flex items-center justify-center text-foreground" onClick={goBack} whileTap={{ scale: 0.9 }}>
          <ChevronLeft className="w-5 h-5" />
        </motion.button>
        <div>
          <h1 className="text-xl font-extrabold text-foreground">Terms of Service</h1>
          <p className="text-xs text-muted-foreground">Last updated: January 15, 2025</p>
        </div>
      </motion.div>

      <div className="flex flex-col lg:flex-row gap-4">
        {/* Table of Contents */}
        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 }} className="lg:w-64 flex-shrink-0">
          <GlassCard className="p-4 lg:sticky lg:top-4">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Contents</h3>
            <div className="space-y-1">
              {sections.map((section, i) => (
                <motion.button
                  key={section.id}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
                    activeSection === section.id
                      ? 'bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400'
                      : 'text-muted-foreground hover:bg-muted/20 hover:text-foreground'
                  }`}
                  onClick={() => setActiveSection(section.id)}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.03 }}
                >
                  <section.icon className="w-3 h-3 flex-shrink-0" />
                  {section.title}
                </motion.button>
              ))}
            </div>
          </GlassCard>
        </motion.div>

        {/* Content */}
        <motion.div className="flex-1" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <GlassCard className="p-6">
            {sections.map((section, i) => {
              const sectionContent = content[section.id];
              return (
                <motion.div
                  key={section.id}
                  id={section.id}
                  className={`${i > 0 ? 'mt-8 pt-8 border-t border-white/20 dark:border-white/5' : ''}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.15 + i * 0.05 }}
                >
                  <h2 className="text-lg font-extrabold text-foreground mb-4 flex items-center gap-2">
                    <section.icon className="w-5 h-5 text-sky-500" />
                    {sectionContent.title}
                  </h2>
                  <div className="space-y-3">
                    {sectionContent.body.map((paragraph, pi) => (
                      <p key={pi} className="text-sm text-muted-foreground leading-relaxed">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </GlassCard>
        </motion.div>
      </div>
    </div>
  );
}
