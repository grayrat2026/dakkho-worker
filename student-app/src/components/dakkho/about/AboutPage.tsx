'use client';

import { motion } from 'framer-motion';
import {
  Info, Target, Users, Mail, Phone, MapPin,
  ChevronDown, Heart, Globe, GraduationCap, BookOpen, Sparkles
} from 'lucide-react';
import { useState } from 'react';
import { GlassCard } from '../shared/GlassCard';

interface FAQItem {
  question: string;
  answer: string;
}

const FAQ_DATA: FAQItem[] = [
  {
    question: 'What is DAKKHO?',
    answer: 'DAKKHO is a comprehensive online learning platform designed specifically for polytechnic students in Bangladesh. We offer video courses, live sessions, assignments, and certifications aligned with the BTEB curriculum.',
  },
  {
    question: 'Is DAKKHO free to use?',
    answer: 'Many courses on DAKKHO are completely free. Premium courses are available at affordable prices with financial aid options for deserving students. We believe quality education should be accessible to everyone.',
  },
  {
    question: 'How do I earn certificates?',
    answer: 'Complete a course and pass all assignments with the required grade to earn a certificate. Certificates are digital and can be downloaded or shared directly from your profile.',
  },
  {
    question: 'Can I access courses offline?',
    answer: 'Yes! You can download courses for offline viewing through our Downloads feature. Downloaded content is available without an internet connection for up to 30 days.',
  },
  {
    question: 'Who are the instructors?',
    answer: 'Our instructors are experienced educators and industry professionals from polytechnic institutes across Bangladesh. They are vetted and trained to deliver high-quality, engaging content.',
  },
  {
    question: 'How do I get help if I am stuck?',
    answer: 'Use the Discussion section to ask questions, join live Q&A sessions with instructors, or reach out to our support team via email or phone. We are here to help you succeed.',
  },
];

const TEAM_MEMBERS = [
  { name: 'Engr. Aminul Islam', role: 'Founder & CEO', icon: GraduationCap },
  { name: 'Dr. Nadia Rahman', role: 'Chief Academic Officer', icon: BookOpen },
  { name: 'Fahim Shahriar', role: 'Lead Developer', icon: Globe },
  { name: 'Sumaiya Khan', role: 'Head of Content', icon: Sparkles },
];

export function AboutPage() {
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
          <Info className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold gradient-text">About DAKKHO</h1>
          <p className="text-sm text-muted-foreground">Learn more about our platform</p>
        </div>
      </motion.div>

      {/* About Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <GlassCard className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-sky-500/20">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold gradient-text mb-2">About DAKKHO</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                DAKKHO is Bangladesh&apos;s premier online learning platform built exclusively for polytechnic students. 
                We provide high-quality video courses aligned with the BTEB curriculum, covering all major technologies 
                from Web Development and Electronics to Civil Engineering and Architecture. Our mission is to make 
                quality technical education accessible to every polytechnic student across the country, regardless of 
                their location or financial background.
              </p>
              <div className="flex items-center gap-4 mt-4 flex-wrap">
                <div className="text-center">
                  <p className="text-2xl font-bold gradient-text">50+</p>
                  <p className="text-xs text-muted-foreground">Courses</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold gradient-text">10K+</p>
                  <p className="text-xs text-muted-foreground">Students</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold gradient-text">50+</p>
                  <p className="text-xs text-muted-foreground">Instructors</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold gradient-text">58</p>
                  <p className="text-xs text-muted-foreground">Institutes</p>
                </div>
              </div>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Mission Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <GlassCard className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-500/20">
              <Target className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mb-2">Our Mission</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                To democratize technical education in Bangladesh by providing world-class learning experiences 
                to every polytechnic student. We believe that geographical boundaries or financial constraints 
                should never be barriers to quality education. Through technology, community, and dedicated 
                instructors, we are building the future skilled workforce of Bangladesh.
              </p>
              <div className="grid grid-cols-2 gap-3 mt-4">
                {[
                  { label: 'Accessible Education', icon: Globe },
                  { label: 'Quality Content', icon: BookOpen },
                  { label: 'Student First', icon: Heart },
                  { label: 'Innovation', icon: Sparkles },
                ].map((value, vi) => (
                  <motion.div
                    key={value.label}
                    className="flex items-center gap-2 p-2 rounded-lg bg-muted/30"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + vi * 0.05 }}
                  >
                    <value.icon className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span className="text-xs font-semibold">{value.label}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Team Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <GlassCard className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Users className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-lg font-bold text-amber-600 dark:text-amber-400">Our Team</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {TEAM_MEMBERS.map((member, i) => (
              <motion.div
                key={member.name}
                className="flex items-center gap-3 p-3 rounded-xl bg-muted/30"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 + i * 0.05 }}
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center flex-shrink-0">
                  <member.icon className="w-4 h-4 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{member.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{member.role}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </GlassCard>
      </motion.div>

      {/* Contact Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <GlassCard className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
              <Mail className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-lg font-bold gradient-text">Contact Us</h2>
          </div>
          <div className="space-y-3">
            {[
              { icon: Mail, label: 'Email', value: 'support@dakkho.com.bd' },
              { icon: Phone, label: 'Phone', value: '+880 1234-567890' },
              { icon: MapPin, label: 'Address', value: 'Dhaka, Bangladesh' },
            ].map((contact, ci) => (
              <motion.div
                key={contact.label}
                className="flex items-center gap-3"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + ci * 0.05 }}
              >
                <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center flex-shrink-0">
                  <contact.icon className="w-4 h-4 text-sky-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{contact.label}</p>
                  <p className="text-sm font-semibold">{contact.value}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </GlassCard>
      </motion.div>

      {/* FAQ Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <GlassCard className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
              <Info className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-lg font-bold gradient-text">FAQ</h2>
          </div>
          <div className="space-y-2">
            {FAQ_DATA.map((faq, i) => (
              <motion.div
                key={i}
                className="rounded-xl overflow-hidden"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 + i * 0.05 }}
              >
                <button
                  className="w-full flex items-center justify-between p-3 text-left bg-muted/30 hover:bg-muted/50 rounded-xl transition-colors"
                  onClick={() => setOpenFAQ(openFAQ === i ? null : i)}
                >
                  <span className="text-sm font-semibold pr-4">{faq.question}</span>
                  <motion.div
                    animate={{ rotate: openFAQ === i ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  </motion.div>
                </button>
                <motion.div
                  initial={false}
                  animate={{
                    height: openFAQ === i ? 'auto' : 0,
                    opacity: openFAQ === i ? 1 : 0,
                  }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <p className="text-sm text-muted-foreground px-3 pb-3 pt-1 leading-relaxed">
                    {faq.answer}
                  </p>
                </motion.div>
              </motion.div>
            ))}
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
}
