'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, CheckCircle, Clock, Lock, ChevronDown, ChevronLeft,
  BookOpen, Video, FileText, Download, Eye, Circle,
} from 'lucide-react';
import { useNavigationStore } from '@/lib/store';
import { getCourse, getCourseVideos, formatDuration } from '@/lib/mock-data';
import { GlassCard } from '../shared/GlassCard';
import { AnimatedPage } from '../shared/AnimatedPage';
import { GradientButton } from '../shared/GradientButton';
import { ProgressBar } from '../shared/ProgressBar';

export function CourseCurriculumPage() {
  const { pageParams, navigate, goBack } = useNavigationStore();
  const courseId = pageParams.courseId as string;
  const course = getCourse(courseId);
  const videos = getCourseVideos(courseId);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({ 'section-1': true });

  // Group videos into sections (every 8 videos = 1 section)
  const sections = videos.length > 0
    ? Array.from(
        { length: Math.ceil(videos.length / 8) },
        (_, i) => ({
          id: `section-${i + 1}`,
          title: `Section ${i + 1}: ${i === 0 ? 'Fundamentals' : i === 1 ? 'Core Concepts' : i === 2 ? 'Advanced Topics' : 'Projects & Practice'}`,
          videos: videos.slice(i * 8, (i + 1) * 8),
        })
      )
    : [];

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  // Mock progress: first few videos completed
  const completedVideoIds = new Set(videos.slice(0, Math.floor(videos.length * 0.3)).map((v) => v.id));
  const currentVideoId = videos[Math.floor(videos.length * 0.3)]?.id;
  const overallProgress = videos.length > 0 ? Math.round((completedVideoIds.size / videos.length) * 100) : 0;

  if (!course) {
    return (
      <AnimatedPage>
        <div className="text-center py-16">
          <p className="text-lg font-bold">Course not found</p>
          <GradientButton onClick={goBack} className="mt-4">Go Back</GradientButton>
        </div>
      </AnimatedPage>
    );
  }

  return (
    <AnimatedPage keyProp={`course-curriculum-${courseId}`}>
      <div className="pb-20 lg:pb-0">
        {/* Breadcrumb */}
        <motion.div
          className="flex items-center gap-2 text-sm text-muted-foreground mb-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <button onClick={() => navigate('home')} className="hover:text-sky-500 transition-colors">Home</button>
          <span>/</span>
          <button onClick={() => navigate('course-detail', { courseId })} className="hover:text-sky-500 transition-colors">{course.title}</button>
          <span>/</span>
          <span className="text-foreground font-semibold">Curriculum</span>
        </motion.div>

        {/* Header */}
        <GlassCard className="p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-lg font-extrabold text-foreground">Course Curriculum</h1>
              <p className="text-sm text-muted-foreground mt-1">{course.title}</p>
            </div>
            <GradientButton
              size="sm"
              onClick={() => navigate('video-player', { videoId: currentVideoId || videos[0]?.id, courseId })}
            >
              <Play className="w-4 h-4" />
              Continue
            </GradientButton>
          </div>

          {/* Progress bar */}
          <div className="flex items-center gap-4">
            <ProgressBar value={overallProgress} size="md" className="flex-1" showLabel />
            <span className="text-sm font-bold text-sky-500">{completedVideoIds.size}/{videos.length}</span>
          </div>

          {/* Overview stats */}
          <div className="flex flex-wrap gap-4 mt-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Video className="w-3 h-3" />{videos.length} Lectures</span>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDuration(course.duration)} Total</span>
            <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{completedVideoIds.size} Watched</span>
          </div>
        </GlassCard>

        {/* Sections */}
        <div className="space-y-3">
          {sections.length > 0 ? sections.map((section, si) => {
            const isExpanded = expandedSections[section.id] ?? false;
            const sectionCompleted = section.videos.every((v) => completedVideoIds.has(v.id));
            const sectionProgress = section.videos.filter((v) => completedVideoIds.has(v.id)).length;
            return (
              <motion.div
                key={section.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: si * 0.05 }}
              >
                <GlassCard className="overflow-hidden">
                  {/* Section header */}
                  <button
                    className="w-full p-4 flex items-center justify-between text-left"
                    onClick={() => toggleSection(section.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        sectionCompleted
                          ? 'bg-emerald-50 dark:bg-emerald-900/20'
                          : 'bg-sky-50 dark:bg-sky-900/20'
                      }`}>
                        {sectionCompleted ? (
                          <CheckCircle className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <BookOpen className="w-4 h-4 text-sky-500" />
                        )}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-foreground">{section.title}</h3>
                        <p className="text-xs text-muted-foreground">
                          {section.videos.length} lectures &middot; {formatDuration(section.videos.reduce((a, v) => a + v.duration, 0))}
                          {sectionProgress > 0 && ` · ${sectionProgress}/${section.videos.length} completed`}
                        </p>
                      </div>
                    </div>
                    <motion.div
                      animate={{ rotate: isExpanded ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    </motion.div>
                  </button>

                  {/* Progress bar for section */}
                  {sectionProgress > 0 && !sectionCompleted && (
                    <div className="px-4 pb-2">
                      <ProgressBar value={(sectionProgress / section.videos.length) * 100} size="sm" />
                    </div>
                  )}

                  {/* Section videos */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div className="border-t border-white/20 dark:border-white/5">
                          {section.videos.map((video, vi) => {
                            const isCompleted = completedVideoIds.has(video.id);
                            const isCurrent = video.id === currentVideoId;
                            return (
                              <motion.div
                                key={video.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: vi * 0.03 }}
                                className={`flex items-center gap-4 px-4 py-3 transition-colors cursor-pointer border-b border-white/10 dark:border-white/5 last:border-b-0 ${
                                  isCurrent
                                    ? 'bg-sky-50/50 dark:bg-sky-900/10'
                                    : 'hover:bg-white/30 dark:hover:bg-slate-800/30'
                                }`}
                                onClick={() => navigate('video-player', { videoId: video.id, courseId })}
                              >
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                  isCompleted
                                    ? 'bg-emerald-50 dark:bg-emerald-900/20'
                                    : isCurrent
                                      ? 'bg-sky-50 dark:bg-sky-900/20'
                                      : 'bg-muted/50'
                                }`}>
                                  {isCompleted ? (
                                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                                  ) : isCurrent ? (
                                    <Play className="w-4 h-4 text-sky-500" />
                                  ) : video.isPreview ? (
                                    <Eye className="w-4 h-4 text-amber-500" />
                                  ) : (
                                    <Circle className="w-4 h-4 text-muted-foreground" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className={`text-sm font-medium line-clamp-1 ${isCompleted ? 'text-muted-foreground' : 'text-foreground'}`}>
                                    {video.title}
                                  </h4>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-xs text-muted-foreground">{formatDuration(video.duration)}</span>
                                    {video.isPreview && (
                                      <span className="text-[10px] font-bold text-amber-500">Preview</span>
                                    )}
                                    {isCurrent && (
                                      <span className="text-[10px] font-bold text-sky-500">Up Next</span>
                                    )}
                                  </div>
                                </div>
                                {!video.isPreview && !isCompleted && !isCurrent && (
                                  <Lock className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                                )}
                              </motion.div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </GlassCard>
              </motion.div>
            );
          }) : (
            <GlassCard className="p-8 text-center">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No curriculum available yet. Check back later!</p>
            </GlassCard>
          )}
        </div>
      </div>
    </AnimatedPage>
  );
}
