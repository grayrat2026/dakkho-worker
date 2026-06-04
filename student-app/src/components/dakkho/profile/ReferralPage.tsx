'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Gift, Share2, Copy, CheckCircle, Users, Award,
  TrendingUp, Star, Zap, Link2, Mail, MessageSquare,
  ChevronRight, Sparkles,
} from 'lucide-react';
import { useNavigationStore } from '@/lib/store';
import { GlassCard } from '../shared/GlassCard';
import { AnimatedPage } from '../shared/AnimatedPage';
import { GradientButton } from '../shared/GradientButton';
import { AnimatedCounter } from '../shared/AnimatedCounter';

const REFERRAL_REWARDS = [
  { referrals: 1, reward: '1 Week Pro Access', icon: Zap, color: 'text-sky-500 bg-sky-50 dark:bg-sky-900/20' },
  { referrals: 3, reward: '1 Month Pro Access', icon: Star, color: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20' },
  { referrals: 5, reward: '3 Months Pro Access', icon: Award, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' },
  { referrals: 10, reward: '1 Year Premium Access', icon: Gift, color: 'text-purple-500 bg-purple-50 dark:bg-purple-900/20' },
];

const RECENT_REFERRALS = [
  { name: 'Ahmed K.', status: 'joined', date: '2 days ago', reward: '1 Week Pro' },
  { name: 'Sadia R.', status: 'enrolled', date: '5 days ago', reward: '1 Month Pro' },
  { name: 'Tanvir M.', status: 'joined', date: '1 week ago', reward: '1 Week Pro' },
  { name: 'Nusrat J.', status: 'pending', date: '1 week ago', reward: '-' },
  { name: 'Imran H.', status: 'enrolled', date: '2 weeks ago', reward: '1 Month Pro' },
];

export function ReferralPage() {
  const { navigate } = useNavigationStore();

  const [copied, setCopied] = useState(false);
  const [sharedVia, setSharedVia] = useState<string | null>(null);

  const referralCode = 'DAKKHO2024RAHIM';
  const referralLink = `https://dakkho.edu.bd/ref/${referralCode}`;
  const totalReferrals = 7;
  const earnedRewards = 3;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = (platform: string) => {
    setSharedVia(platform);
    setTimeout(() => setSharedVia(null), 2000);
  };

  return (
    <AnimatedPage keyProp="referral">
      <div className="pb-20 lg:pb-0">
        {/* Breadcrumb */}
        <motion.div className="flex items-center gap-2 text-sm text-muted-foreground mb-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <button onClick={() => navigate('home')} className="hover:text-sky-500 transition-colors">Home</button>
          <span>/</span>
          <button onClick={() => navigate('profile')} className="hover:text-sky-500 transition-colors">Profile</button>
          <span>/</span>
          <span className="text-foreground font-semibold">Referral Program</span>
        </motion.div>

        {/* Header */}
        <GlassCard className="p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <motion.div
              className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center text-white shadow-lg"
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', delay: 0.2 }}
            >
              <Gift className="w-6 h-6" />
            </motion.div>
            <div>
              <h1 className="text-lg font-extrabold text-foreground">Refer & Earn</h1>
              <p className="text-sm text-muted-foreground">Share DAKKHO with friends and earn rewards</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Total Referrals', value: totalReferrals, color: 'text-sky-500 bg-sky-50 dark:bg-sky-900/20' },
              { label: 'Rewards Earned', value: earnedRewards, color: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20' },
              { label: 'Pending Rewards', value: 1, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                className="p-3 rounded-xl bg-muted/30 text-center"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.08 }}
              >
                <AnimatedCounter target={stat.value} className="text-xl font-extrabold text-foreground" />
                <p className="text-[10px] text-muted-foreground mt-0.5">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </GlassCard>

        {/* Referral Link */}
        <GlassCard className="p-6 mb-6">
          <h2 className="text-base font-bold text-foreground mb-3 flex items-center gap-2">
            <Link2 className="w-5 h-5 text-sky-500" />
            Your Referral Link
          </h2>
          <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/30 border border-white/30 dark:border-white/10">
            <span className="text-sm text-foreground font-medium flex-1 truncate">{referralLink}</span>
            <motion.button
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold flex-shrink-0 ${
                copied
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                  : 'bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400'
              }`}
              onClick={handleCopy}
              whileTap={{ scale: 0.95 }}
            >
              {copied ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied!' : 'Copy'}
            </motion.button>
          </div>

          {/* Share buttons */}
          <div className="mt-4">
            <p className="text-xs font-semibold text-muted-foreground mb-2">Share via</p>
            <div className="flex gap-2">
              {[
                { platform: 'whatsapp', label: 'WhatsApp', icon: MessageSquare, color: 'bg-emerald-500 hover:bg-emerald-600' },
                { platform: 'email', label: 'Email', icon: Mail, color: 'bg-sky-500 hover:bg-sky-600' },
                { platform: 'copy', label: 'Copy Link', icon: Link2, color: 'bg-amber-500 hover:bg-amber-600' },
              ].map((share) => (
                <motion.button
                  key={share.platform}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-xs font-semibold ${share.color} transition-colors`}
                  onClick={() => handleShare(share.platform)}
                  whileTap={{ scale: 0.95 }}
                  whileHover={{ scale: 1.02 }}
                >
                  {sharedVia === share.platform ? (
                    <CheckCircle className="w-3.5 h-3.5" />
                  ) : (
                    <share.icon className="w-3.5 h-3.5" />
                  )}
                  {share.label}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Referral code */}
          <div className="mt-4 pt-4 border-t border-white/20 dark:border-white/5">
            <p className="text-xs text-muted-foreground">Your referral code: <span className="font-bold text-foreground">{referralCode}</span></p>
          </div>
        </GlassCard>

        {/* Rewards Tiers */}
        <GlassCard className="p-6 mb-6">
          <h2 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            Reward Tiers
          </h2>
          <div className="space-y-3">
            {REFERRAL_REWARDS.map((reward, i) => {
              const isUnlocked = totalReferrals >= reward.referrals;
              const isCurrent = !isUnlocked && (i === 0 || totalReferrals >= REFERRAL_REWARDS[i - 1].referrals);
              return (
                <motion.div
                  key={reward.referrals}
                  className={`flex items-center gap-4 p-4 rounded-xl ${
                    isUnlocked
                      ? 'bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-200/50 dark:border-emerald-800/30'
                      : isCurrent
                        ? 'bg-sky-50/50 dark:bg-sky-900/10 border border-sky-200/50 dark:border-sky-800/30'
                        : 'bg-muted/20'
                  }`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.08 }}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${reward.color}`}>
                    {isUnlocked ? (
                      <CheckCircle className="w-5 h-5 text-emerald-500" />
                    ) : (
                      <reward.icon className="w-5 h-5" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-foreground">{reward.referrals} Referrals</h4>
                    <p className="text-xs text-muted-foreground">{reward.reward}</p>
                  </div>
                  {isUnlocked ? (
                    <span className="text-xs font-bold text-emerald-500">Unlocked!</span>
                  ) : isCurrent ? (
                    <span className="text-xs font-bold text-sky-500">{reward.referrals - totalReferrals} more</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      <Lock className="w-3 h-3 inline" />
                    </span>
                  )}
                </motion.div>
              );
            })}
          </div>
        </GlassCard>

        {/* Recent Referrals */}
        <GlassCard className="p-6">
          <h2 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-sky-500" />
            Recent Referrals
          </h2>
          <div className="space-y-3">
            {RECENT_REFERRALS.map((referral, i) => {
              const statusConfig = {
                enrolled: { label: 'Enrolled', color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20' },
                joined: { label: 'Joined', color: 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-900/20' },
                pending: { label: 'Pending', color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20' },
              };
              const config = statusConfig[referral.status as keyof typeof statusConfig];
              return (
                <motion.div
                  key={i}
                  className="flex items-center gap-3"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.06 }}
                >
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {referral.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{referral.name}</p>
                    <p className="text-[10px] text-muted-foreground">{referral.date}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${config.color}`}>
                    {config.label}
                  </span>
                  {referral.reward !== '-' && (
                    <span className="text-xs font-semibold text-emerald-500">{referral.reward}</span>
                  )}
                </motion.div>
              );
            })}
          </div>
        </GlassCard>
      </div>
    </AnimatedPage>
  );
}

function Lock({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}
