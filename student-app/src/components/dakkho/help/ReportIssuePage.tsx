'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bug, ChevronLeft, Send, AlertCircle, CheckCircle,
  AlertTriangle, Info, X, Paperclip, Loader2, Monitor,
  Smartphone, Globe, Plus, Minus, ListChecks,
} from 'lucide-react';
import { useNavigationStore } from '@/lib/store';
import { GlassCard } from '../shared/GlassCard';
import { GradientButton } from '../shared/GradientButton';

export function ReportIssuePage() {
  const { goBack } = useNavigationStore();

  const [title, setTitle] = useState('');
  const [severity, setSeverity] = useState('Medium');
  const [category, setCategory] = useState('Playback');
  const [steps, setSteps] = useState(['']);
  const [expectedBehavior, setExpectedBehavior] = useState('');
  const [actualBehavior, setActualBehavior] = useState('');
  const [browser, setBrowser] = useState('');
  const [device, setDevice] = useState('');
  const [attachments, setAttachments] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const severityLevels = [
    { label: 'Low', desc: 'Minor inconvenience', icon: Info, color: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' },
    { label: 'Medium', desc: 'Feature not working properly', icon: AlertCircle, color: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800' },
    { label: 'High', desc: 'Major feature broken', icon: AlertTriangle, color: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800' },
    { label: 'Critical', desc: 'App unusable / data loss', icon: Bug, color: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800' },
  ];

  const categories = ['Playback', 'Navigation', 'Authentication', 'Payment', 'Content', 'UI/Display', 'Performance', 'Other'];

  const browserOptions = [
    { name: 'Chrome', icon: Globe },
    { name: 'Firefox', icon: Globe },
    { name: 'Safari', icon: Globe },
    { name: 'Edge', icon: Globe },
  ];

  const deviceTypes = [
    { name: 'Desktop', icon: Monitor },
    { name: 'Tablet', icon: Smartphone },
    { name: 'Mobile', icon: Smartphone },
  ];

  const addStep = () => {
    if (steps.length < 8) setSteps([...steps, '']);
  };

  const removeStep = (index: number) => {
    if (steps.length > 1) {
      setSteps(steps.filter((_, i) => i !== index));
    }
  };

  const updateStep = (index: number, value: string) => {
    const newSteps = [...steps];
    newSteps[index] = value;
    setSteps(newSteps);
  };

  const handleAttach = () => {
    if (attachments.length < 5) {
      setAttachments([...attachments, `bug-screenshot-${attachments.length + 1}.png`]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = 'Issue title is required';
    if (!expectedBehavior.trim()) newErrors.expected = 'Expected behavior is required';
    if (!actualBehavior.trim()) newErrors.actual = 'Actual behavior is required';
    if (steps.every((s) => !s.trim())) newErrors.steps = 'At least one step is required';
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

  if (submitted) {
    return (
      <div className="pb-20 lg:pb-0">
        <motion.div className="flex items-center gap-3 mb-6" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <motion.button className="w-9 h-9 rounded-xl bg-muted/30 flex items-center justify-center text-foreground" onClick={goBack} whileTap={{ scale: 0.9 }}>
            <ChevronLeft className="w-5 h-5" />
          </motion.button>
          <h1 className="text-xl font-extrabold text-foreground">Report Issue</h1>
        </motion.div>
        <GlassCard className="p-8 text-center">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 15 }}>
            <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-500" />
            </div>
          </motion.div>
          <h2 className="text-lg font-extrabold text-foreground mb-2">Bug Report Submitted!</h2>
          <p className="text-sm text-muted-foreground mb-1">Report ID: <span className="font-bold text-sky-500">BUG-2048</span></p>
          <p className="text-xs text-muted-foreground mb-6">Our engineering team will investigate and prioritize this issue. You will receive updates via email.</p>
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
          <h1 className="text-xl font-extrabold text-foreground">Report an Issue</h1>
          <p className="text-xs text-muted-foreground">Help us fix bugs and improve DAKKHO</p>
        </div>
      </motion.div>

      {/* Severity Selection */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <GlassCard className="p-5 mb-4">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-sky-500" /> Severity
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {severityLevels.map((level, i) => (
              <motion.div
                key={level.label}
                className={`p-3 rounded-xl cursor-pointer border-2 transition-all ${
                  severity === level.label ? level.color : 'bg-muted/20 border-transparent'
                }`}
                onClick={() => setSeverity(level.label)}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <level.icon className="w-4 h-4" />
                  <span className="text-sm font-bold">{level.label}</span>
                </div>
                <p className="text-xs opacity-70">{level.desc}</p>
              </motion.div>
            ))}
          </div>
        </GlassCard>
      </motion.div>

      {/* Issue Details */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <GlassCard className="p-5 mb-4">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-4">
            <Bug className="w-4 h-4 text-sky-500" /> Issue Details
          </h3>
          <div className="space-y-4">
            {/* Title */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                Issue Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => { setTitle(e.target.value); setErrors({ ...errors, title: '' }); }}
                className={`w-full px-4 py-2.5 rounded-xl bg-muted/30 border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/50 ${
                  errors.title ? 'border-red-500' : 'border-white/30 dark:border-white/10'
                }`}
                placeholder="e.g., Video freezes at 2:30 mark"
              />
              {errors.title && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.title}</p>}
            </div>

            {/* Category */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Category</label>
              <div className="flex gap-1.5 flex-wrap">
                {categories.map((cat) => (
                  <motion.button
                    key={cat}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                      category === cat ? 'bg-sky-500 text-white' : 'bg-muted/30 text-muted-foreground'
                    }`}
                    onClick={() => setCategory(cat)}
                    whileTap={{ scale: 0.95 }}
                  >
                    {cat}
                  </motion.button>
                ))}
              </div>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Steps to Reproduce */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <GlassCard className="p-5 mb-4">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-3">
            <ListChecks className="w-4 h-4 text-sky-500" /> Steps to Reproduce
          </h3>
          {errors.steps && <p className="text-xs text-red-500 mb-2 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.steps}</p>}
          <div className="space-y-2">
            {steps.map((step, i) => (
              <motion.div
                key={i}
                className="flex items-center gap-2"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <span className="w-6 h-6 rounded-full bg-sky-50 dark:bg-sky-900/20 flex items-center justify-center text-xs font-bold text-sky-500 flex-shrink-0">
                  {i + 1}
                </span>
                <input
                  type="text"
                  value={step}
                  onChange={(e) => updateStep(i, e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl bg-muted/30 border border-white/30 dark:border-white/10 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                  placeholder={`Step ${i + 1}...`}
                />
                {steps.length > 1 && (
                  <motion.button onClick={() => removeStep(i)} whileTap={{ scale: 0.9 }} className="text-muted-foreground hover:text-red-500">
                    <Minus className="w-4 h-4" />
                  </motion.button>
                )}
              </motion.div>
            ))}
          </div>
          {steps.length < 8 && (
            <motion.button
              className="mt-2 flex items-center gap-1 text-xs font-semibold text-sky-500"
              onClick={addStep}
              whileTap={{ scale: 0.95 }}
            >
              <Plus className="w-3 h-3" /> Add Step
            </motion.button>
          )}
        </GlassCard>
      </motion.div>

      {/* Expected vs Actual */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <GlassCard className="p-5 mb-4">
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                Expected Behavior <span className="text-red-500">*</span>
              </label>
              <textarea
                value={expectedBehavior}
                onChange={(e) => { setExpectedBehavior(e.target.value); setErrors({ ...errors, expected: '' }); }}
                rows={3}
                className={`w-full px-4 py-3 rounded-xl bg-muted/30 border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/50 resize-none ${
                  errors.expected ? 'border-red-500' : 'border-white/30 dark:border-white/10'
                }`}
                placeholder="What should happen?"
              />
              {errors.expected && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.expected}</p>}
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                Actual Behavior <span className="text-red-500">*</span>
              </label>
              <textarea
                value={actualBehavior}
                onChange={(e) => { setActualBehavior(e.target.value); setErrors({ ...errors, actual: '' }); }}
                rows={3}
                className={`w-full px-4 py-3 rounded-xl bg-muted/30 border text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/50 resize-none ${
                  errors.actual ? 'border-red-500' : 'border-white/30 dark:border-white/10'
                }`}
                placeholder="What actually happens?"
              />
              {errors.actual && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.actual}</p>}
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Environment & Attachments */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <GlassCard className="p-5">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-3">
            <Monitor className="w-4 h-4 text-sky-500" /> Environment
          </h3>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Browser</label>
              <div className="flex gap-2 flex-wrap">
                {browserOptions.map((b) => (
                  <motion.button
                    key={b.name}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${
                      browser === b.name ? 'bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400' : 'bg-muted/30 text-muted-foreground'
                    }`}
                    onClick={() => setBrowser(b.name)}
                    whileTap={{ scale: 0.95 }}
                  >
                    <b.icon className="w-3 h-3" /> {b.name}
                  </motion.button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Device Type</label>
              <div className="flex gap-2 flex-wrap">
                {deviceTypes.map((d) => (
                  <motion.button
                    key={d.name}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${
                      device === d.name ? 'bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400' : 'bg-muted/30 text-muted-foreground'
                    }`}
                    onClick={() => setDevice(d.name)}
                    whileTap={{ scale: 0.95 }}
                  >
                    <d.icon className="w-3 h-3" /> {d.name}
                  </motion.button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1.5">Screenshots ({attachments.length}/5)</label>
              <motion.button
                className="w-full p-3 rounded-xl border-2 border-dashed border-muted/50 text-muted-foreground flex items-center justify-center gap-2 hover:border-sky-500/50 hover:text-sky-500 transition-colors"
                onClick={handleAttach}
                whileTap={{ scale: 0.98 }}
              >
                <Paperclip className="w-4 h-4" />
                <span className="text-xs font-semibold">Attach Screenshots</span>
              </motion.button>
              {attachments.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  {attachments.map((file, i) => (
                    <motion.div key={file} className="flex items-center justify-between p-2 rounded-lg bg-muted/20" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <div className="flex items-center gap-2">
                        <Paperclip className="w-3 h-3 text-sky-500" />
                        <span className="text-xs font-medium text-foreground">{file}</span>
                      </div>
                      <button onClick={() => removeAttachment(i)}><X className="w-3 h-3 text-muted-foreground hover:text-red-500" /></button>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="mt-4">
            <GradientButton onClick={handleSubmit} loading={isSubmitting} className="w-full" size="sm">
              <Send className="w-4 h-4" /> Submit Bug Report
            </GradientButton>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
}
