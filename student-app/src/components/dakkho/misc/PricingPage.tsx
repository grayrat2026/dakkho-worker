'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  CreditCard, ChevronLeft, Check, X, Star, Shield,
  Zap, Crown, Gift, HelpCircle, Users, BookOpen,
  Award, Download, MessageSquare, Sparkles,
} from 'lucide-react';
import { useNavigationStore } from '@/lib/store';
import { GlassCard } from '../shared/GlassCard';
import { GradientButton } from '../shared/GradientButton';

export function PricingPage() {
  const { goBack } = useNavigationStore();
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly');

  const plans = [
    {
      id: 'free',
      name: 'Free',
      desc: 'Get started with basic learning',
      monthlyPrice: 0,
      annualPrice: 0,
      color: 'from-slate-400 to-slate-600',
      features: [
        { name: 'Access free courses', included: true },
        { name: 'Basic video streaming', included: true },
        { name: 'Community access', included: true },
        { name: 'Progress tracking', included: true },
        { name: 'Certificate of completion', included: false },
        { name: 'Offline downloads', included: false },
        { name: 'Priority support', included: false },
        { name: 'AI study assistant', included: false },
        { name: 'Live class access', included: false },
      ],
      cta: 'Current Plan',
      popular: false,
    },
    {
      id: 'pro',
      name: 'Pro',
      desc: 'Unlock your full potential',
      monthlyPrice: 299,
      annualPrice: 2499,
      color: 'from-sky-400 to-blue-600',
      features: [
        { name: 'All free features', included: true },
        { name: 'All course access', included: true },
        { name: 'HD video streaming', included: true },
        { name: 'Certificate of completion', included: true },
        { name: 'Offline downloads (5GB)', included: true },
        { name: 'Priority support', included: true },
        { name: 'AI study assistant', included: false },
        { name: 'Live class access', included: false },
        { name: '1-on-1 mentor sessions', included: false },
      ],
      cta: 'Upgrade to Pro',
      popular: true,
    },
    {
      id: 'premium',
      name: 'Premium',
      desc: 'The ultimate learning experience',
      monthlyPrice: 499,
      annualPrice: 4499,
      color: 'from-violet-400 to-violet-600',
      features: [
        { name: 'All Pro features', included: true },
        { name: 'Unlimited downloads', included: true },
        { name: 'AI study assistant', included: true },
        { name: 'Live class access', included: true },
        { name: '1-on-1 mentor sessions', included: true },
        { name: 'Early access to new courses', included: true },
        { name: 'Custom study plans', included: true },
        { name: 'Exclusive community', included: true },
        { name: 'Career guidance', included: true },
      ],
      cta: 'Go Premium',
      popular: false,
    },
  ];

  const testimonials = [
    { name: 'Ayesha Khan', dept: 'CSE', semester: 6, text: 'DAKKHO Pro has transformed my study routine. The offline downloads save me during commute, and the certificates look great on my CV!', rating: 5 },
    { name: 'Rafiq Islam', dept: 'EEE', semester: 5, text: 'The AI study assistant in Premium is incredible. It generates practice questions based on my weak areas. Worth every taka!', rating: 5 },
    { name: 'Sadia Rahman', dept: 'CE', semester: 4, text: 'As a free user, I was amazed by the quality of content. When I upgraded to Pro, the certificate feature helped me land an internship.', rating: 4 },
  ];

  const faqs = [
    { q: 'Can I switch plans anytime?', a: 'Yes, you can upgrade or downgrade your plan at any time. When upgrading, you will get immediate access to new features. When downgrading, changes take effect at the end of your billing period.' },
    { q: 'Is there a student discount?', a: 'Students from partner polytechnic institutes receive a 20% discount on all paid plans. Contact your institution\'s DAKKHO coordinator for the discount code.' },
    { q: 'What payment methods do you accept?', a: 'We accept bKash, Nagad, Rocket, Visa, Mastercard, and bank transfers. All payments are processed securely.' },
    { q: 'Can I get a refund?', a: 'Yes, we offer a 7-day refund policy for new subscriptions. If you are not satisfied, contact support within 7 days for a full refund.' },
  ];

  const getPrice = (plan: typeof plans[0]) => {
    return billingPeriod === 'monthly' ? plan.monthlyPrice : plan.annualPrice;
  };

  return (
    <div className="pb-20 lg:pb-0">
      {/* Header */}
      <motion.div className="flex items-center gap-3 mb-6" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <motion.button className="w-9 h-9 rounded-xl bg-muted/30 flex items-center justify-center text-foreground" onClick={goBack} whileTap={{ scale: 0.9 }}>
          <ChevronLeft className="w-5 h-5" />
        </motion.button>
        <div>
          <h1 className="text-xl font-extrabold text-foreground">Pricing Plans</h1>
          <p className="text-xs text-muted-foreground">Choose the plan that fits your goals</p>
        </div>
      </motion.div>

      {/* Billing Toggle */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="flex justify-center mb-6">
        <div className="flex items-center gap-3 p-1 bg-muted/30 rounded-xl">
          <motion.button
            className={`px-4 py-2 rounded-lg text-xs font-bold ${billingPeriod === 'monthly' ? 'bg-white dark:bg-slate-700 shadow-sm text-foreground' : 'text-muted-foreground'}`}
            onClick={() => setBillingPeriod('monthly')}
            whileTap={{ scale: 0.95 }}
          >
            Monthly
          </motion.button>
          <motion.button
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 ${billingPeriod === 'annual' ? 'bg-white dark:bg-slate-700 shadow-sm text-foreground' : 'text-muted-foreground'}`}
            onClick={() => setBillingPeriod('annual')}
            whileTap={{ scale: 0.95 }}
          >
            Annual <span className="text-[10px] text-emerald-500 font-bold">Save 30%</span>
          </motion.button>
        </div>
      </motion.div>

      {/* Plans */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {plans.map((plan, i) => (
          <motion.div
            key={plan.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.08 }}
          >
            <GlassCard className={`p-5 relative ${plan.popular ? 'border-2 border-sky-500' : ''}`}>
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-sky-500 text-white text-[10px] font-bold">
                  MOST POPULAR
                </div>
              )}
              <div className="text-center mb-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${plan.color} flex items-center justify-center mx-auto mb-3 shadow-md`}>
                  {plan.id === 'free' ? <Gift className="w-6 h-6 text-white" /> : plan.id === 'pro' ? <Zap className="w-6 h-6 text-white" /> : <Crown className="w-6 h-6 text-white" />}
                </div>
                <h3 className="text-lg font-extrabold text-foreground">{plan.name}</h3>
                <p className="text-xs text-muted-foreground mb-2">{plan.desc}</p>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-2xl font-extrabold text-foreground">৳{getPrice(plan)}</span>
                  {plan.monthlyPrice > 0 && (
                    <span className="text-xs text-muted-foreground">/{billingPeriod === 'monthly' ? 'mo' : 'yr'}</span>
                  )}
                </div>
                {billingPeriod === 'annual' && plan.monthlyPrice > 0 && (
                  <p className="text-xs text-emerald-500 font-semibold">৳{Math.round(plan.annualPrice / 12)}/mo billed annually</p>
                )}
              </div>

              <div className="space-y-2 mb-4">
                {plan.features.map((feature) => (
                  <div key={feature.name} className="flex items-center gap-2">
                    {feature.included ? (
                      <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    ) : (
                      <X className="w-4 h-4 text-muted-foreground/30 flex-shrink-0" />
                    )}
                    <span className={`text-xs ${feature.included ? 'text-foreground' : 'text-muted-foreground/50'}`}>{feature.name}</span>
                  </div>
                ))}
              </div>

              <GradientButton
                variant={plan.popular ? 'primary' : plan.id === 'free' ? 'success' : 'primary'}
                className="w-full"
                size="sm"
              >
                {plan.cta}
              </GradientButton>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {/* Feature Comparison */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
        <GlassCard className="p-5 mb-4">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">Feature Comparison</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/20 dark:border-white/5">
                  <th className="text-left py-2 font-bold text-muted-foreground">Feature</th>
                  <th className="text-center py-2 font-bold text-muted-foreground">Free</th>
                  <th className="text-center py-2 font-bold text-sky-500">Pro</th>
                  <th className="text-center py-2 font-bold text-violet-500">Premium</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Course Access', 'Free only', 'All courses', 'All + Early access'],
                  ['Video Quality', '720p', '1080p HD', '4K + Original'],
                  ['Downloads', '—', '5 GB', 'Unlimited'],
                  ['Certificates', '—', '✓', '✓ + Verified'],
                  ['Support', 'Community', 'Priority', '1-on-1 Mentor'],
                  ['AI Assistant', '—', '—', '✓'],
                  ['Live Classes', '—', '—', '✓'],
                ].map((row, i) => (
                  <tr key={i} className="border-b border-white/10 dark:border-white/5">
                    <td className="py-2 font-semibold text-foreground">{row[0]}</td>
                    <td className="text-center py-2 text-muted-foreground">{row[1]}</td>
                    <td className="text-center py-2 text-foreground">{row[2]}</td>
                    <td className="text-center py-2 text-foreground">{row[3]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </motion.div>

      {/* Testimonials */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <GlassCard className="p-5 mb-4">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">Student Testimonials</h3>
          <div className="space-y-3">
            {testimonials.map((t, i) => (
              <motion.div
                key={t.name}
                className="p-3 rounded-xl bg-muted/20"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.45 + i * 0.05 }}
              >
                <div className="flex items-center gap-1 mb-1">
                  {Array.from({ length: 5 }).map((_, si) => (
                    <Star key={si} className={`w-3 h-3 ${si < t.rating ? 'text-amber-500 fill-amber-500' : 'text-muted-foreground/30'}`} />
                  ))}
                </div>
                <p className="text-xs text-foreground leading-relaxed mb-2">"{t.text}"</p>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white text-[10px] font-bold">{t.name.charAt(0)}</div>
                  <div>
                    <p className="text-xs font-bold text-foreground">{t.name}</p>
                    <p className="text-[10px] text-muted-foreground">{t.dept} • Semester {t.semester}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </GlassCard>
      </motion.div>

      {/* FAQ */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
        <GlassCard className="p-5">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-4">
            <HelpCircle className="w-4 h-4 text-sky-500" /> Pricing FAQ
          </h3>
          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div key={i} className="p-3 rounded-xl bg-muted/20">
                <p className="text-sm font-bold text-foreground mb-1">{faq.q}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
}
