'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  GitBranch, ChevronLeft, Calendar, Tag, Bug,
  Sparkles, Zap, Shield, ArrowRight, Clock, CheckCircle,
  AlertTriangle, Star,
} from 'lucide-react';
import { useNavigationStore } from '@/lib/store';
import { GlassCard } from '../shared/GlassCard';

export function ChangelogPage() {
  const { goBack } = useNavigationStore();

  const versions = [
    {
      version: 'v1.2.0',
      date: 'February 20, 2025',
      title: 'Exam Preparation Suite',
      type: 'major',
      highlights: [
        'Added comprehensive exam preparation hub with subject selection and study plans',
        'Introduced practice mode with multiple difficulty levels and detailed explanations',
        'New exam schedule page with calendar and list views',
        'Exam results page with GPA calculator and semester-wise breakdown',
        'Study tips and strategies section with wellness guides',
      ],
      features: [
        'Exam preparation dashboard with progress tracking',
        'Practice questions with instant feedback and explanations',
        'Exam calendar with subject, time, and room information',
        'GPA trend chart and cumulative statistics',
        'Pomodoro timer integration for focused study sessions',
      ],
      fixes: [
        'Fixed progress bar not updating after video completion',
        'Resolved certificate generation delay for completed courses',
        'Fixed search results not filtering by department correctly',
      ],
    },
    {
      version: 'v1.1.0',
      date: 'February 5, 2025',
      title: 'Content Protection & Security',
      type: 'major',
      highlights: [
        'Implemented advanced content protection system with screenshot blocking',
        'Added custom context menu replacing browser default',
        'Two-factor authentication support for enhanced account security',
        'Invisible digital watermarking for video content',
      ],
      features: [
        'Screenshot and screen recording detection and blocking',
        'Copy protection and drag prevention for course materials',
        'Custom right-click context menu with allowed actions only',
        'Two-factor authentication via authenticator apps',
        'Active session management and remote logout',
        'Download quality selector with storage limit controls',
      ],
      fixes: [
        'Fixed video playback stuttering on Safari browsers',
        'Resolved login session timeout issues',
        'Fixed notification badge count not resetting after reading',
      ],
    },
    {
      version: 'v1.0.2',
      date: 'January 25, 2025',
      title: 'Performance & Bug Fixes',
      type: 'patch',
      highlights: [
        'Significant performance improvements for video loading times',
        'Fixed multiple UI rendering issues on mobile devices',
      ],
      features: [
        'Video preloading optimization for faster start times',
        'Reduced initial page load time by 40%',
        'Improved offline caching strategy for better reliability',
      ],
      fixes: [
        'Fixed course curriculum not loading for some departments',
        'Resolved video quality auto-switching causing brief pauses',
        'Fixed dark mode toggle not persisting across sessions',
        'Corrected GPA calculation for courses with lab components',
        'Fixed bookmark synchronization delay',
        'Resolved keyboard navigation issues in quiz mode',
      ],
    },
    {
      version: 'v1.0.1',
      date: 'January 18, 2025',
      title: 'Quick Fixes',
      type: 'patch',
      highlights: [
        'Emergency fix for video playback on older browsers',
        'Corrected payment processing for bKash transactions',
      ],
      fixes: [
        'Fixed video not playing on Firefox versions below 120',
        'Resolved bKash payment callback not completing enrollment',
        'Fixed course progress showing 100% for unwatched videos',
        'Corrected semester display order in profile settings',
      ],
    },
    {
      version: 'v1.0.0',
      date: 'January 15, 2025',
      title: 'Initial Launch 🎉',
      type: 'major',
      highlights: [
        'DAKKHO officially launches with core streaming and learning features',
        'Support for all polytechnic institute departments and semesters',
        'Complete course catalog with video streaming and progress tracking',
      ],
      features: [
        'User registration and authentication system',
        'Video streaming with adaptive quality (480p, 720p, 1080p)',
        'Course enrollment and progress tracking',
        'Department and semester-based course organization',
        'Instructor profiles and course ratings',
        'Bookmarks and watch history',
        'Certificate generation upon course completion',
        'Notification system for course updates',
        'Dark mode and theme customization',
        'Mobile-responsive design with bottom navigation',
        'Search functionality across courses and instructors',
        'Community features with discussion forums',
      ],
    },
  ];

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'major': return 'bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400';
      case 'patch': return 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400';
      default: return 'bg-muted/30 text-muted-foreground';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'major': return Sparkles;
      case 'patch': return Bug;
      default: return GitBranch;
    }
  };

  return (
    <div className="pb-20 lg:pb-0">
      {/* Header */}
      <motion.div className="flex items-center gap-3 mb-6" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <motion.button className="w-9 h-9 rounded-xl bg-muted/30 flex items-center justify-center text-foreground" onClick={goBack} whileTap={{ scale: 0.9 }}>
          <ChevronLeft className="w-5 h-5" />
        </motion.button>
        <div>
          <h1 className="text-xl font-extrabold text-foreground">Changelog</h1>
          <p className="text-xs text-muted-foreground">What\'s new in DAKKHO</p>
        </div>
      </motion.div>

      {/* Current Version Banner */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <GlassCard className="p-5 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center shadow-lg">
              <GitBranch className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-foreground">Current Version</h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-sky-500 text-white font-bold">{versions[0].version}</span>
              </div>
              <p className="text-sm text-muted-foreground">{versions[0].title}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <Calendar className="w-3 h-3" /> {versions[0].date}
              </p>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Version Timeline */}
      <div className="space-y-4">
        {versions.map((version, vi) => {
          const TypeIcon = getTypeIcon(version.type);
          return (
            <motion.div
              key={version.version}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + vi * 0.05 }}
            >
              <GlassCard className="p-5">
                {/* Version Header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-xl ${getTypeColor(version.type)} flex items-center justify-center flex-shrink-0`}>
                    <TypeIcon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-extrabold text-foreground">{version.version}</h3>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${getTypeColor(version.type)}`}>
                        {version.type}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-foreground">{version.title}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {version.date}
                    </p>
                  </div>
                </div>

                {/* Highlights */}
                <div className="space-y-3 mb-4">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Star className="w-3 h-3 text-amber-500" /> Highlights
                  </h4>
                  {version.highlights.map((highlight, i) => (
                    <motion.div
                      key={i}
                      className="flex items-start gap-2 p-2 rounded-lg bg-sky-50/50 dark:bg-sky-900/10"
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 + i * 0.03 }}
                    >
                      <Sparkles className="w-3.5 h-3.5 text-sky-500 mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-foreground">{highlight}</p>
                    </motion.div>
                  ))}
                </div>

                {/* Features */}
                {version.features && version.features.length > 0 && (
                  <div className="mb-3">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-2">
                      <Zap className="w-3 h-3 text-emerald-500" /> New Features
                    </h4>
                    <div className="space-y-1">
                      {version.features.map((feature, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500 mt-0.5 flex-shrink-0" />
                          <p className="text-xs text-muted-foreground">{feature}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Bug Fixes */}
                {version.fixes && version.fixes.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 mb-2">
                      <Bug className="w-3 h-3 text-amber-500" /> Bug Fixes
                    </h4>
                    <div className="space-y-1">
                      {version.fixes.map((fix, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                          <p className="text-xs text-muted-foreground">{fix}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </GlassCard>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
