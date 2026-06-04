'use client';

import { motion } from 'framer-motion';
import {
  CreditCard, ChevronLeft, CheckCircle, Clock, AlertTriangle,
  ArrowRight, Shield, HelpCircle, FileText, Calendar,
  RefreshCw, XCircle, Info,
} from 'lucide-react';
import { useNavigationStore } from '@/lib/store';
import { GlassCard } from '../shared/GlassCard';

export function RefundPolicyPage() {
  const { goBack } = useNavigationStore();

  const eligibilityItems = [
    { eligible: true, text: 'Course purchased within the last 7 days' },
    { eligible: true, text: 'Less than 25% of course content viewed' },
    { eligible: true, text: 'Technical issues preventing course access' },
    { eligible: true, text: 'Course significantly different from description' },
    { eligible: false, text: 'More than 7 days since purchase' },
    { eligible: false, text: 'More than 25% of course content viewed' },
    { eligible: false, text: 'Violation of Terms of Service' },
    { eligible: false, text: 'Course accessed via free promotion or coupon' },
  ];

  const refundSteps = [
    { step: 1, title: 'Submit Request', description: 'Go to Account Settings > Purchase History and click "Request Refund" on the course. Select a reason and provide details.', icon: FileText },
    { step: 2, title: 'Review Process', description: 'Our team reviews your request within 2-3 business days. We verify eligibility criteria and may contact you for additional information.', icon: Clock },
    { step: 3, title: 'Approval & Processing', description: 'Once approved, the refund is initiated to your original payment method. Processing time depends on your payment provider.', icon: CheckCircle },
    { step: 4, title: 'Refund Received', description: 'bKash/Nagad refunds: 1-3 days. Bank/card refunds: 5-10 business days. You will receive an email confirmation.', icon: CreditCard },
  ];

  const subscriptionRules = [
    { plan: 'Monthly Subscription', policy: 'Can cancel anytime. No prorated refund for the current billing period. Access continues until end of billing cycle.' },
    { plan: 'Annual Subscription', policy: '14-day cooling-off period with full refund. After 14 days, prorated refund based on unused months minus a 10% administrative fee.' },
    { plan: 'Individual Course', policy: '7-day refund window from date of purchase, provided less than 25% of content has been accessed.' },
    { plan: 'Bundle Purchase', policy: '7-day refund window. If any course in the bundle exceeds 25% access, the bundle is not eligible for refund.' },
  ];

  return (
    <div className="pb-20 lg:pb-0">
      {/* Header */}
      <motion.div className="flex items-center gap-3 mb-6" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <motion.button className="w-9 h-9 rounded-xl bg-muted/30 flex items-center justify-center text-foreground" onClick={goBack} whileTap={{ scale: 0.9 }}>
          <ChevronLeft className="w-5 h-5" />
        </motion.button>
        <div>
          <h1 className="text-xl font-extrabold text-foreground">Refund Policy</h1>
          <p className="text-xs text-muted-foreground">Our commitment to your satisfaction</p>
        </div>
      </motion.div>

      {/* Summary Banner */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <GlassCard className="p-5 mb-4">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center flex-shrink-0">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-foreground mb-1">7-Day Money-Back Guarantee</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                We want you to be completely satisfied with your purchase. If you are not happy with a course, you can request a full refund within 7 days of purchase, provided you have viewed less than 25% of the course content.
              </p>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Eligibility */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <GlassCard className="p-5 mb-4">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-4">
            <CheckCircle className="w-4 h-4 text-sky-500" /> Refund Eligibility
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <p className="text-xs font-bold text-emerald-500 uppercase tracking-wider">Eligible</p>
              {eligibilityItems.filter((i) => i.eligible).map((item, i) => (
                <motion.div
                  key={i}
                  className="flex items-start gap-2 p-2 rounded-lg bg-emerald-50/50 dark:bg-emerald-900/10"
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 + i * 0.03 }}
                >
                  <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                  <span className="text-xs text-foreground">{item.text}</span>
                </motion.div>
              ))}
            </div>
            <div className="space-y-2">
              <p className="text-xs font-bold text-red-500 uppercase tracking-wider">Not Eligible</p>
              {eligibilityItems.filter((i) => !i.eligible).map((item, i) => (
                <motion.div
                  key={i}
                  className="flex items-start gap-2 p-2 rounded-lg bg-red-50/50 dark:bg-red-900/10"
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 + i * 0.03 }}
                >
                  <XCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <span className="text-xs text-foreground">{item.text}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Refund Process */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <GlassCard className="p-5 mb-4">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-4">
            <RefreshCw className="w-4 h-4 text-sky-500" /> Refund Process
          </h3>
          <div className="space-y-4">
            {refundSteps.map((step, i) => (
              <motion.div
                key={step.step}
                className="flex gap-4"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.05 }}
              >
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-sky-50 dark:bg-sky-900/20 flex items-center justify-center flex-shrink-0">
                    <step.icon className="w-5 h-5 text-sky-500" />
                  </div>
                  {i < refundSteps.length - 1 && (
                    <div className="w-0.5 h-full bg-sky-200 dark:bg-sky-800 mt-2" />
                  )}
                </div>
                <div className="pb-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-sky-500">Step {step.step}</span>
                    <h4 className="text-sm font-bold text-foreground">{step.title}</h4>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{step.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </GlassCard>
      </motion.div>

      {/* Subscription Refund Rules */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <GlassCard className="p-5 mb-4">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-4">
            <Calendar className="w-4 h-4 text-sky-500" /> Subscription & Plan Rules
          </h3>
          <div className="space-y-3">
            {subscriptionRules.map((rule, i) => (
              <motion.div
                key={rule.plan}
                className="p-3 rounded-xl bg-muted/20"
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 + i * 0.03 }}
              >
                <p className="text-sm font-bold text-foreground mb-1">{rule.plan}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{rule.policy}</p>
              </motion.div>
            ))}
          </div>
        </GlassCard>
      </motion.div>

      {/* Processing Timeline */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <GlassCard className="p-5 mb-4">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-sky-500" /> Processing Timeline
          </h3>
          <div className="space-y-2">
            {[
              { method: 'bKash', time: '1-3 business days', icon: '📱' },
              { method: 'Nagad', time: '1-3 business days', icon: '📱' },
              { method: 'Rocket', time: '1-3 business days', icon: '📱' },
              { method: 'Visa/Mastercard', time: '5-10 business days', icon: '💳' },
              { method: 'Bank Transfer', time: '7-14 business days', icon: '🏦' },
            ].map((item, i) => (
              <motion.div
                key={item.method}
                className="flex items-center justify-between p-2.5 rounded-lg bg-muted/20"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 + i * 0.03 }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{item.icon}</span>
                  <span className="text-sm font-semibold text-foreground">{item.method}</span>
                </div>
                <span className="text-xs text-muted-foreground">{item.time}</span>
              </motion.div>
            ))}
          </div>
        </GlassCard>
      </motion.div>

      {/* Important Notes */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <GlassCard className="p-5">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-500" /> Important Notes
          </h3>
          <div className="space-y-2">
            {[
              'Refunds are processed to the original payment method only. We cannot transfer refunds to a different account or method.',
              'Certificate of completion will be revoked if a course refund is processed.',
              'Group or institutional purchases may have different refund terms as specified in the purchase agreement.',
              'Refund abuse (repeated purchasing and refunding) may result in account restrictions.',
              'For any refund disputes, please contact our support team at billing@dakkho.com before escalating to your payment provider.',
            ].map((note, i) => (
              <div key={i} className="flex items-start gap-2">
                <Info className="w-3 h-3 text-amber-500 mt-1 flex-shrink-0" />
                <p className="text-xs text-muted-foreground leading-relaxed">{note}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 rounded-xl bg-sky-50 dark:bg-sky-900/20 flex items-start gap-2">
            <HelpCircle className="w-4 h-4 text-sky-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-semibold text-sky-700 dark:text-sky-300">Need help with a refund?</p>
              <p className="text-xs text-sky-600 dark:text-sky-400">Contact us at billing@dakkho.com or visit Help & Support</p>
            </div>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
}
