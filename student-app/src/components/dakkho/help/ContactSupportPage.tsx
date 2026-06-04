'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare, ChevronLeft, Send, Paperclip, AlertCircle,
  CheckCircle, Clock, User, Mail, Phone, X, FileText, Loader2,
} from 'lucide-react';
import { useNavigationStore } from '@/lib/store';
import { GlassCard } from '../shared/GlassCard';
import { GradientButton } from '../shared/GradientButton';

export function ContactSupportPage() {
  const { goBack } = useNavigationStore();

  const [subject, setSubject] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [category, setCategory] = useState('General');
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState('');
  const [attachments, setAttachments] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const categories = ['General', 'Technical Issue', 'Billing', 'Course Content', 'Account', 'Feature Request'];
  const priorities = [
    { label: 'Low', color: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' },
    { label: 'Medium', color: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800' },
    { label: 'High', color: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800' },
    { label: 'Urgent', color: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800' },
  ];

  const previousTickets = [
    { id: 'TK-1024', subject: 'Video not loading in Chrome', status: 'resolved', date: '2 days ago' },
    { id: 'TK-1018', subject: 'Certificate not generated', status: 'in-progress', date: '5 days ago' },
    { id: 'TK-1005', subject: 'Payment failed but amount deducted', status: 'resolved', date: '2 weeks ago' },
  ];

  const statusColors: Record<string, string> = {
    resolved: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400',
    'in-progress': 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!subject.trim()) newErrors.subject = 'Subject is required';
    if (!description.trim()) newErrors.description = 'Description is required';
    else if (description.trim().length < 20) newErrors.description = 'Please provide at least 20 characters';
    if (!email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Invalid email format';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 2000));
    setIsSubmitting(false);
    setSubmitted(true);
  };

  const handleAttach = () => {
    if (attachments.length < 3) {
      setAttachments([...attachments, `screenshot-${attachments.length + 1}.png`]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  if (submitted) {
    return (
      <div className="pb-20 lg:pb-0">
        <motion.div className="flex items-center gap-3 mb-6" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <motion.button className="w-9 h-9 rounded-xl bg-muted/30 flex items-center justify-center text-foreground" onClick={goBack} whileTap={{ scale: 0.9 }}>
            <ChevronLeft className="w-5 h-5" />
          </motion.button>
          <h1 className="text-xl font-extrabold text-foreground">Contact Support</h1>
        </motion.div>
        <GlassCard className="p-8 text-center">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 15 }}>
            <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-500" />
            </div>
          </motion.div>
          <h2 className="text-lg font-extrabold text-foreground mb-2">Ticket Submitted!</h2>
          <p className="text-sm text-muted-foreground mb-1">Your support ticket has been created.</p>
          <p className="text-sm text-muted-foreground mb-4">Ticket ID: <span className="font-bold text-sky-500">TK-1032</span></p>
          <p className="text-xs text-muted-foreground mb-6">Our team will respond within 24-48 hours.</p>
          <GradientButton onClick={goBack} size="sm">Back to Help</GradientButton>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="pb-20 lg:pb-0">
      {/* Header */}
      <motion.div className="flex items-center gap-3 mb-6" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <motion.button className="w-9 h-9 rounded-xl bg-muted/30 flex items-center justify-center text-foreground" onClick={goBack} whileTap={{ scale: 0.9 }}>
          <ChevronLeft className="w-5 h-5" />
        </motion.button>
        <div>
          <h1 className="text-xl font-extrabold text-foreground">Contact Support</h1>
          <p className="text-xs text-muted-foreground">We are here to help you</p>
        </div>
      </motion.div>

      {/* Previous Tickets */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <GlassCard className="p-5 mb-4">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-sky-500" /> Recent Tickets
          </h3>
          <div className="space-y-2">
            {previousTickets.map((ticket, i) => (
              <motion.div
                key={ticket.id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-muted/20"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.05 }}
              >
                <div>
                  <p className="text-xs font-bold text-sky-500">{ticket.id}</p>
                  <p className="text-xs font-semibold text-foreground">{ticket.subject}</p>
                  <p className="text-xs text-muted-foreground">{ticket.date}</p>
                </div>
                <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${statusColors[ticket.status]}`}>
                  {ticket.status === 'in-progress' ? 'In Progress' : 'Resolved'}
                </span>
              </motion.div>
            ))}
          </div>
        </GlassCard>
      </motion.div>

      {/* Contact Form */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <GlassCard className="p-5">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-4">
            <MessageSquare className="w-4 h-4 text-sky-500" /> New Ticket
          </h3>

          <div className="space-y-4">
            {/* Email */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                Email <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setErrors({ ...errors, email: '' }); }}
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl bg-muted/30 border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/50 ${
                    errors.email ? 'border-red-500' : 'border-white/30 dark:border-white/10'
                  }`}
                  placeholder="your.email@example.com"
                />
              </div>
              {errors.email && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.email}</p>}
            </div>

            {/* Subject */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                Subject <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => { setSubject(e.target.value); setErrors({ ...errors, subject: '' }); }}
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl bg-muted/30 border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/50 ${
                    errors.subject ? 'border-red-500' : 'border-white/30 dark:border-white/10'
                  }`}
                  placeholder="Brief description of your issue"
                />
              </div>
              {errors.subject && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.subject}</p>}
            </div>

            {/* Category & Priority */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-muted/30 border border-white/30 dark:border-white/10 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/50 appearance-none"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Priority</label>
                <div className="flex gap-1 flex-wrap">
                  {priorities.map((p) => (
                    <motion.button
                      key={p.label}
                      className={`px-2 py-1.5 rounded-lg text-xs font-bold border ${priority === p.label ? p.color : 'bg-muted/30 text-muted-foreground border-transparent'}`}
                      onClick={() => setPriority(p.label)}
                      whileTap={{ scale: 0.95 }}
                    >
                      {p.label}
                    </motion.button>
                  ))}
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => { setDescription(e.target.value); setErrors({ ...errors, description: '' }); }}
                rows={5}
                className={`w-full px-4 py-3 rounded-xl bg-muted/30 border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/50 resize-none ${
                  errors.description ? 'border-red-500' : 'border-white/30 dark:border-white/10'
                }`}
                placeholder="Describe your issue in detail. Include any error messages, steps to reproduce, and relevant screenshots..."
              />
              <div className="flex items-center justify-between mt-1">
                {errors.description ? (
                  <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.description}</p>
                ) : <span />}
                <span className="text-xs text-muted-foreground">{description.length}/1000</span>
              </div>
            </div>

            {/* Attachments */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Attachments</label>
              <motion.button
                className="w-full p-3 rounded-xl border-2 border-dashed border-muted/50 text-muted-foreground flex items-center justify-center gap-2 hover:border-sky-500/50 hover:text-sky-500 transition-colors"
                onClick={handleAttach}
                whileTap={{ scale: 0.98 }}
              >
                <Paperclip className="w-4 h-4" />
                <span className="text-xs font-semibold">Add files ({attachments.length}/3)</span>
              </motion.button>
              <AnimatePresence>
                {attachments.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    {attachments.map((file, i) => (
                      <motion.div
                        key={file}
                        className="flex items-center justify-between p-2 rounded-lg bg-muted/20"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                      >
                        <div className="flex items-center gap-2">
                          <Paperclip className="w-3 h-3 text-sky-500" />
                          <span className="text-xs font-medium text-foreground">{file}</span>
                        </div>
                        <button onClick={() => removeAttachment(i)}>
                          <X className="w-3 h-3 text-muted-foreground hover:text-red-500" />
                        </button>
                      </motion.div>
                    ))}
                  </div>
                )}
              </AnimatePresence>
            </div>

            {/* Submit */}
            <GradientButton onClick={handleSubmit} loading={isSubmitting} className="w-full" size="sm">
              <Send className="w-4 h-4" /> Submit Ticket
            </GradientButton>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
}
