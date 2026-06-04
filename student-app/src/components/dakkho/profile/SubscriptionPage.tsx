'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Crown, Star, CheckCircle, Zap, Shield, BookOpen,
  Users, Clock, Download, Award, ChevronRight,
  Sparkles, Lock,
} from 'lucide-react';
import { useNavigationStore } from '@/lib/store';
import { GlassCard } from '../shared/GlassCard';
import { AnimatedPage } from '../shared/AnimatedPage';
import { GradientButton } from '../shared/GradientButton';

interface PlanFeature {
  text: string;
  included: boolean;
}

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  period: string;
  description: string;
  features: PlanFeature[];
  popular?: boolean;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  gradient: string;
}

const PLANS: SubscriptionPlan[] = [
  {
    id: 'free', name: 'Free', price: 0, period: 'Forever', description: 'Get started with basic learning resources.',
    icon: BookOpen, color: 'text-sky-500 bg-sky-50 dark:bg-sky-900/20', gradient: 'from-sky-400 to-blue-600',
    features: [
      { text: 'Access free courses', included: true },
      { text: 'Basic video quality (720p)', included: true },
      { text: 'Limited downloads (5/month)', included: true },
      { text: 'Community forum access', included: true },
      { text: 'Premium courses', included: false },
      { text: 'Offline downloads', included: false },
      { text: 'Certificates', included: false },
      { text: 'Priority support', included: false },
    ],
  },
  {
    id: 'pro', name: 'Pro', price: 299, period: '/month', description: 'Unlock premium content and advanced features.',
    icon: Zap, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20', gradient: 'from-emerald-400 to-teal-600', popular: true,
    features: [
      { text: 'All free features', included: true },
      { text: 'All premium courses', included: true },
      { text: 'HD video quality (1080p)', included: true },
      { text: 'Unlimited downloads', included: true },
      { text: 'Course certificates', included: true },
      { text: 'Priority support', included: true },
      { text: 'Ad-free experience', included: true },
      { text: '1-on-1 mentoring', included: false },
    ],
  },
  {
    id: 'premium', name: 'Premium', price: 499, period: '/month', description: 'The ultimate learning experience with everything included.',
    icon: Crown, color: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20', gradient: 'from-amber-400 to-orange-600',
    features: [
      { text: 'All Pro features', included: true },
      { text: '4K video quality', included: true },
      { text: '1-on-1 mentoring sessions', included: true },
      { text: 'Custom learning path', included: true },
      { text: 'Job placement assistance', included: true },
      { text: 'Early access to new courses', included: true },
      { text: 'BTEB exam preparation pack', included: true },
      { text: 'Lifetime certificate access', included: true },
    ],
  },
];

const ANNUAL_DISCOUNT = 0.8; // 20% off

export function SubscriptionPage() {
  const { navigate } = useNavigationStore();
  const [isAnnual, setIsAnnual] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string>('pro');
  const [isSubscribing, setIsSubscribing] = useState(false);

  const getPrice = (plan: SubscriptionPlan) => {
    if (plan.price === 0) return 0;
    return isAnnual ? Math.round(plan.price * ANNUAL_DISCOUNT) : plan.price;
  };

  const handleSubscribe = async () => {
    setIsSubscribing(true);
    await new Promise((r) => setTimeout(r, 2000));
    setIsSubscribing(false);
  };

  return (
    <AnimatedPage keyProp="subscription">
      <div className="pb-20 lg:pb-0">
        {/* Breadcrumb */}
        <motion.div className="flex items-center gap-2 text-sm text-muted-foreground mb-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <button onClick={() => navigate('home')} className="hover:text-sky-500 transition-colors">Home</button>
          <span>/</span>
          <button onClick={() => navigate('profile')} className="hover:text-sky-500 transition-colors">Profile</button>
          <span>/</span>
          <span className="text-foreground font-semibold">Subscription</span>
        </motion.div>

        {/* Header */}
        <GlassCard className="p-6 mb-6 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.2 }}
          >
            <Sparkles className="w-10 h-10 text-amber-400 mx-auto mb-3" />
          </motion.div>
          <h1 className="text-2xl font-extrabold text-foreground">Choose Your Plan</h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-lg mx-auto">
            Unlock your full potential with premium courses, certificates, and personalized learning experiences.
          </p>

          {/* Annual toggle */}
          <div className="flex items-center justify-center gap-3 mt-6">
            <span className={`text-sm font-semibold ${!isAnnual ? 'text-foreground' : 'text-muted-foreground'}`}>Monthly</span>
            <motion.button
              className={`relative w-12 h-6 rounded-full transition-colors ${isAnnual ? 'bg-sky-500' : 'bg-muted'}`}
              onClick={() => setIsAnnual(!isAnnual)}
              whileTap={{ scale: 0.95 }}
            >
              <motion.div
                className="w-5 h-5 rounded-full bg-white shadow-md absolute top-0.5"
                animate={{ left: isAnnual ? '26px' : '2px' }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              />
            </motion.button>
            <span className={`text-sm font-semibold ${isAnnual ? 'text-foreground' : 'text-muted-foreground'}`}>
              Annual
              <span className="ml-1 px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                Save 20%
              </span>
            </span>
          </div>
        </GlassCard>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {PLANS.map((plan, i) => {
            const Icon = plan.icon;
            const isSelected = selectedPlan === plan.id;
            const price = getPrice(plan);

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.1 }}
              >
                <GlassCard
                  className={`p-6 relative cursor-pointer transition-all ${
                    isSelected ? 'ring-2 ring-sky-500 shadow-xl shadow-sky-500/10' : ''
                  } ${plan.popular ? 'border-sky-300 dark:border-sky-700' : ''}`}
                  onClick={() => setSelectedPlan(plan.id)}
                >
                  {/* Popular badge */}
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="px-3 py-1 rounded-full bg-sky-500 text-white text-[10px] font-bold shadow-md">
                        Most Popular
                      </span>
                    </div>
                  )}

                  <div className="text-center mb-4">
                    <div className={`w-12 h-12 rounded-xl ${plan.color} flex items-center justify-center mx-auto mb-3`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-extrabold text-foreground">{plan.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{plan.description}</p>
                  </div>

                  {/* Price */}
                  <div className="text-center mb-4">
                    {price === 0 ? (
                      <span className="text-3xl font-extrabold text-emerald-500">Free</span>
                    ) : (
                      <div>
                        <span className="text-3xl font-extrabold text-foreground">&#2547;{price}</span>
                        <span className="text-sm text-muted-foreground">{isAnnual ? '/year' : plan.period}</span>
                        {isAnnual && plan.price > 0 && (
                          <p className="text-[10px] text-muted-foreground line-through mt-0.5">
                            &#2547;{plan.price * 12}/year
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Features */}
                  <div className="space-y-2 mb-4">
                    {plan.features.map((feature) => (
                      <div key={feature.text} className="flex items-center gap-2">
                        {feature.included ? (
                          <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        ) : (
                          <Lock className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />
                        )}
                        <span className={`text-xs ${feature.included ? 'text-foreground' : 'text-muted-foreground/60'}`}>
                          {feature.text}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* CTA */}
                  {price === 0 ? (
                    <div className="w-full py-3 rounded-xl bg-muted/30 text-sm font-semibold text-muted-foreground text-center">
                      Current Plan
                    </div>
                  ) : (
                    <GradientButton
                      className="w-full"
                      variant={isSelected ? 'primary' : 'success'}
                      onClick={(e: React.MouseEvent) => { e.stopPropagation(); setSelectedPlan(plan.id); handleSubscribe(); }}
                      loading={isSubscribing && isSelected}
                    >
                      {isSelected ? 'Subscribe Now' : 'Select Plan'}
                    </GradientButton>
                  )}
                </GlassCard>
              </motion.div>
            );
          })}
        </div>

        {/* FAQ */}
        <GlassCard className="p-6">
          <h3 className="text-base font-bold text-foreground mb-4">Frequently Asked Questions</h3>
          <div className="space-y-4">
            {[
              { q: 'Can I cancel my subscription anytime?', a: 'Yes, you can cancel your subscription at any time. You will continue to have access until the end of your billing period.' },
              { q: 'Is there a refund policy?', a: 'We offer a 7-day money-back guarantee for all new subscriptions. If you are not satisfied, contact support for a full refund.' },
              { q: 'Can I switch between plans?', a: 'Yes, you can upgrade or downgrade your plan at any time. Changes will take effect at the start of your next billing cycle.' },
              { q: 'Do certificates expire?', a: 'No, certificates you earn during your subscription period are yours to keep forever, even after your subscription ends.' },
            ].map((faq, i) => (
              <motion.div
                key={i}
                className="border-b border-white/20 dark:border-white/5 pb-3 last:border-b-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 + i * 0.08 }}
              >
                <h4 className="text-sm font-bold text-foreground">{faq.q}</h4>
                <p className="text-xs text-muted-foreground mt-1">{faq.a}</p>
              </motion.div>
            ))}
          </div>
        </GlassCard>
      </div>
    </AnimatedPage>
  );
}
