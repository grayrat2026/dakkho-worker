'use client';

import { motion } from 'framer-motion';
import {
  Shield, ChevronLeft, Eye, Database, Lock, Users,
  Cookie, Scale, Mail, CheckCircle, Clock, ExternalLink,
} from 'lucide-react';
import { useNavigationStore } from '@/lib/store';
import { GlassCard } from '../shared/GlassCard';
import { GradientButton } from '../shared/GradientButton';

export function PrivacyPage() {
  const { goBack } = useNavigationStore();

  const privacyPoints = [
    {
      title: 'What We Collect',
      description: 'We collect your name, email, institute, and technology to personalize your learning experience. Usage data helps us improve our services.',
      icon: Database,
      color: 'text-sky-500 bg-sky-50 dark:bg-sky-900/20',
    },
    {
      title: 'How We Use It',
      description: 'Your data is used to provide and improve the platform, deliver course content, track progress, and personalize recommendations.',
      icon: Eye,
      color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20',
    },
    {
      title: 'Data Security',
      description: 'All data is encrypted with TLS 1.3 in transit and AES-256 at rest. Passwords are hashed using bcrypt. Payment info is never stored on our servers.',
      icon: Lock,
      color: 'text-violet-500 bg-violet-50 dark:bg-violet-900/20',
    },
    {
      title: 'Data Sharing',
      description: 'We only share data with trusted service providers necessary for platform operations. We never sell your personal information to third parties.',
      icon: Users,
      color: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20',
    },
  ];

  const yourRights = [
    { right: 'Access your data', desc: 'Download a copy of all your personal data' },
    { right: 'Delete your data', desc: 'Request permanent deletion of your account and data' },
    { right: 'Correct information', desc: 'Update or correct your personal information anytime' },
    { right: 'Manage cookies', desc: 'Control cookie preferences from Privacy Settings' },
    { right: 'Opt out of analytics', desc: 'Disable usage analytics in your privacy settings' },
    { right: 'Data portability', desc: 'Receive your data in a machine-readable format' },
  ];

  const cookieTypes = [
    { type: 'Essential', desc: 'Required for login and security', canDisable: false },
    { type: 'Analytics', desc: 'Help us understand platform usage', canDisable: true },
    { type: 'Marketing', desc: 'Used for personalized recommendations', canDisable: true },
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
          <p className="text-xs text-muted-foreground">How we protect your data</p>
        </div>
      </motion.div>

      {/* Summary Banner */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <GlassCard className="p-5 mb-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center flex-shrink-0 shadow-lg">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-foreground mb-1">Your Privacy Matters</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                At DAKKHO, we take your privacy seriously. We only collect data necessary to provide and improve our services, and we never sell your personal information. Here is a summary of our practices.
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

      {/* Privacy Points */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        {privacyPoints.map((point, i) => (
          <motion.div
            key={point.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.05 }}
          >
            <GlassCard className="p-4 h-full">
              <div className={`w-10 h-10 rounded-xl ${point.color} flex items-center justify-center mb-3`}>
                <point.icon className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-foreground mb-1">{point.title}</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">{point.description}</p>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {/* Your Rights */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <GlassCard className="p-5 mb-4">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-4">
            <Scale className="w-4 h-4 text-sky-500" /> Your Rights
          </h3>
          <div className="space-y-2">
            {yourRights.map((item, i) => (
              <motion.div
                key={item.right}
                className="flex items-start gap-2 p-2 rounded-lg bg-muted/20"
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 + i * 0.03 }}
              >
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-bold text-foreground">{item.right}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </GlassCard>
      </motion.div>

      {/* Cookie Info */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <GlassCard className="p-5 mb-4">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-4">
            <Cookie className="w-4 h-4 text-sky-500" /> Cookie Policy
          </h3>
          <div className="space-y-2">
            {cookieTypes.map((cookie, i) => (
              <motion.div
                key={cookie.type}
                className="flex items-center justify-between p-2.5 rounded-lg bg-muted/20"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 + i * 0.03 }}
              >
                <div>
                  <p className="text-xs font-bold text-foreground">{cookie.type}</p>
                  <p className="text-xs text-muted-foreground">{cookie.desc}</p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  cookie.canDisable ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-500' : 'bg-sky-50 dark:bg-sky-900/20 text-sky-500'
                }`}>
                  {cookie.canDisable ? 'Optional' : 'Required'}
                </span>
              </motion.div>
            ))}
          </div>
        </GlassCard>
      </motion.div>

      {/* Link to Full Policy */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <GlassCard className="p-5">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">Full Privacy Policy</h3>
          <p className="text-xs text-muted-foreground mb-4">
            This is a summary only. For the complete Privacy Policy document with all legal details, please read the full version.
          </p>
          <GradientButton size="sm" className="w-full">
            <Shield className="w-4 h-4" /> Read Full Privacy Policy
          </GradientButton>
          <div className="mt-3 text-center">
            <p className="text-xs text-muted-foreground">
              Privacy questions? Contact our DPO at <span className="text-sky-500 font-semibold">privacy@dakkho.com</span>
            </p>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
}
