'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Mail, Phone, MessageSquare, Send, Clock, MapPin,
  Globe, Linkedin, Youtube, CheckCircle, AlertCircle,
  Calendar, BookOpen, User,
} from 'lucide-react';
import { useNavigationStore } from '@/lib/store';
import { getInstructor } from '@/lib/mock-data';
import { GlassCard } from '../shared/GlassCard';
import { AnimatedPage } from '../shared/AnimatedPage';
import { GradientButton } from '../shared/GradientButton';

const CONTACT_REASONS = [
  { id: 'course', label: 'Course-related Question', icon: BookOpen },
  { id: 'academic', label: 'Academic Guidance', icon: User },
  { id: 'technical', label: 'Technical Issue', icon: AlertCircle },
  { id: 'career', label: 'Career Advice', icon: MapPin },
  { id: 'feedback', label: 'Feedback/Suggestion', icon: MessageSquare },
  { id: 'other', label: 'Other', icon: Mail },
];

export function InstructorContactPage() {
  const { pageParams, navigate, goBack } = useNavigationStore();
  const instructorId = pageParams.instructorId as string;
  const instructor = getInstructor(instructorId);

  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [isSending, setIsSending] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [priority, setPriority] = useState<'normal' | 'urgent'>('normal');

  if (!instructor) {
    return (
      <AnimatedPage>
        <div className="text-center py-16">
          <p className="text-lg font-bold">Instructor not found</p>
          <GradientButton onClick={goBack} className="mt-4">Go Back</GradientButton>
        </div>
      </AnimatedPage>
    );
  }

  const handleSend = async () => {
    if (!subject.trim() || !message.trim() || !email.trim()) return;
    setIsSending(true);
    await new Promise((r) => setTimeout(r, 1500));
    setIsSending(false);
    setIsSent(true);
    setTimeout(() => {
      setIsSent(false);
      setSubject('');
      setMessage('');
      setEmail('');
      setSelectedReason('');
    }, 3000);
  };

  return (
    <AnimatedPage keyProp={`instructor-contact-${instructorId}`}>
      <div className="pb-20 lg:pb-0">
        {/* Breadcrumb */}
        <motion.div className="flex items-center gap-2 text-sm text-muted-foreground mb-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <button onClick={() => navigate('home')} className="hover:text-sky-500 transition-colors">Home</button>
          <span>/</span>
          <button onClick={() => navigate('instructor-profile', { instructorId })} className="hover:text-sky-500 transition-colors">{instructor.name}</button>
          <span>/</span>
          <span className="text-foreground font-semibold">Contact</span>
        </motion.div>

        {/* Header */}
        <GlassCard className="p-6 mb-6">
          <div className="flex items-center gap-4">
            <motion.div
              className="w-14 h-14 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white text-xl font-extrabold shadow-lg"
              whileHover={{ scale: 1.05 }}
            >
              {instructor.name.charAt(0)}
            </motion.div>
            <div>
              <h1 className="text-lg font-extrabold text-foreground">Contact {instructor.name}</h1>
              <p className="text-sm text-sky-500 font-semibold">{instructor.specialization}</p>
              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span>Usually responds within 24 hours</span>
              </div>
            </div>
          </div>
        </GlassCard>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Contact Form */}
          <div className="lg:col-span-2">
            {isSent ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <GlassCard className="p-8 text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', delay: 0.2 }}
                  >
                    <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                  </motion.div>
                  <h2 className="text-xl font-extrabold text-foreground mb-2">Message Sent!</h2>
                  <p className="text-sm text-muted-foreground">
                    Your message has been sent to {instructor.name}. You will receive a response within 24 hours.
                  </p>
                </GlassCard>
              </motion.div>
            ) : (
              <GlassCard className="p-6">
                <h2 className="text-base font-bold text-foreground mb-4">Send a Message</h2>

                {/* Reason selection */}
                <div className="mb-4">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
                    What is this about?
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {CONTACT_REASONS.map((reason) => (
                      <motion.button
                        key={reason.id}
                        className={`p-3 rounded-xl text-left transition-all border-2 ${
                          selectedReason === reason.id
                            ? 'border-sky-500 bg-sky-50/50 dark:bg-sky-900/20'
                            : 'border-white/30 dark:border-white/10 bg-white/30 dark:bg-slate-800/30 hover:border-sky-300'
                        }`}
                        onClick={() => setSelectedReason(reason.id)}
                        whileTap={{ scale: 0.98 }}
                      >
                        <reason.icon className={`w-4 h-4 mb-1 ${selectedReason === reason.id ? 'text-sky-500' : 'text-muted-foreground'}`} />
                        <p className={`text-xs font-medium ${selectedReason === reason.id ? 'text-sky-600 dark:text-sky-400' : 'text-foreground'}`}>
                          {reason.label}
                        </p>
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Email */}
                <div className="mb-4">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Your Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your.email@example.com"
                    className="w-full px-4 py-3 rounded-xl bg-muted/30 border border-white/30 dark:border-white/10 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                  />
                </div>

                {/* Subject */}
                <div className="mb-4">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Subject</label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Brief description of your inquiry"
                    className="w-full px-4 py-3 rounded-xl bg-muted/30 border border-white/30 dark:border-white/10 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                  />
                </div>

                {/* Message */}
                <div className="mb-4">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Message</label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Describe your question or concern in detail..."
                    rows={6}
                    className="w-full px-4 py-3 rounded-xl bg-muted/30 border border-white/30 dark:border-white/10 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/50 resize-none"
                  />
                </div>

                {/* Priority */}
                <div className="mb-6">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">Priority</label>
                  <div className="flex gap-3">
                    {(['normal', 'urgent'] as const).map((p) => (
                      <motion.button
                        key={p}
                        className={`px-4 py-2 rounded-xl text-xs font-semibold capitalize ${
                          priority === p
                            ? p === 'urgent'
                              ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-2 border-red-300 dark:border-red-700'
                              : 'bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 border-2 border-sky-300 dark:border-sky-700'
                            : 'bg-muted/30 text-muted-foreground border-2 border-transparent'
                        }`}
                        onClick={() => setPriority(p)}
                        whileTap={{ scale: 0.95 }}
                      >
                        {p}
                      </motion.button>
                    ))}
                  </div>
                </div>

                <GradientButton
                  className="w-full"
                  size="lg"
                  onClick={handleSend}
                  loading={isSending}
                  disabled={!subject.trim() || !message.trim() || !email.trim()}
                >
                  <Send className="w-4 h-4" />
                  Send Message
                </GradientButton>
              </GlassCard>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Contact info */}
            <GlassCard className="p-6">
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">Contact Information</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-900/20 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-4 h-4 text-sky-500" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Email</p>
                    <p className="text-sm font-medium text-foreground">{instructor.name.toLowerCase().replace(/\s+/g, '.')}@polytechnic.edu.bd</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center flex-shrink-0">
                    <Phone className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Office Hours</p>
                    <p className="text-sm font-medium text-foreground">Sun-Thu, 10 AM - 4 PM</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-4 h-4 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Location</p>
                    <p className="text-sm font-medium text-foreground">Dhaka Polytechnic Institute</p>
                  </div>
                </div>
              </div>

              {/* Social links */}
              {instructor.socialLinks && instructor.socialLinks.length > 0 && (
                <div className="mt-4 pt-4 border-t border-white/20 dark:border-white/5">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Social Profiles</p>
                  <div className="flex gap-2">
                    {instructor.socialLinks.map((link, i) => (
                      <motion.a
                        key={i}
                        href={link.url}
                        className="w-9 h-9 rounded-xl bg-muted/50 flex items-center justify-center hover:bg-sky-50 dark:hover:bg-sky-900/20 transition-colors"
                        whileHover={{ scale: 1.1 }}
                      >
                        {link.platform === 'linkedin' ? (
                          <Linkedin className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <Youtube className="w-4 h-4 text-muted-foreground" />
                        )}
                      </motion.a>
                    ))}
                  </div>
                </div>
              )}
            </GlassCard>

            {/* Response time */}
            <GlassCard className="p-6">
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">Response Times</h3>
              <div className="space-y-3">
                {[
                  { type: 'Course Questions', time: '~2 hours', icon: BookOpen },
                  { type: 'Technical Issues', time: '~4 hours', icon: AlertCircle },
                  { type: 'Academic Guidance', time: '~12 hours', icon: User },
                  { type: 'Career Advice', time: '~24 hours', icon: MapPin },
                ].map((item) => (
                  <div key={item.type} className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-xs font-medium text-foreground">
                      <item.icon className="w-3.5 h-3.5 text-muted-foreground" />
                      {item.type}
                    </span>
                    <span className="text-xs font-semibold text-sky-500">{item.time}</span>
                  </div>
                ))}
              </div>
            </GlassCard>

            {/* Guidelines */}
            <GlassCard className="p-6">
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">Contact Guidelines</h3>
              <div className="space-y-2">
                {[
                  'Be specific about your question or issue',
                  'Include course name and topic in the subject',
                  'Mention relevant code or error messages',
                  'Allow 24 hours for a response',
                  'Use office hours for urgent matters',
                ].map((guideline, i) => (
                  <motion.div
                    key={i}
                    className="flex items-start gap-2"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.05 }}
                  >
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-muted-foreground">{guideline}</p>
                  </motion.div>
                ))}
              </div>
            </GlassCard>
          </div>
        </div>
      </div>
    </AnimatedPage>
  );
}
