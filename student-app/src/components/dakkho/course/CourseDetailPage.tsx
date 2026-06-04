'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Users, Clock, BookOpen, Play, ChevronLeft, Heart, Share2, Award, CheckCircle, ChevronDown, User } from 'lucide-react';
import { useNavigationStore, useBookmarkStore } from '@/lib/store';
import { getCourse, getInstructor, getCategory, getCourseVideos, formatDuration, getLevelColor, COURSES } from '@/lib/mock-data';
import { GlassCard } from '../shared/GlassCard';
import { GradientButton } from '../shared/GradientButton';
import { ProgressBar } from '../shared/ProgressBar';
import { CourseCardGrid } from '../shared/CourseCardGrid';

export function CourseDetailPage() {
  const { pageParams, navigate, goBack } = useNavigationStore();
  const { isBookmarked, toggleBookmark } = useBookmarkStore();
  const [activeTab, setActiveTab] = useState<'overview' | 'curriculum' | 'reviews' | 'instructor'>('overview');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({ 'section-1': true });

  const courseId = pageParams.courseId as string;
  const course = getCourse(courseId);
  const instructor = course ? getInstructor(course.instructorId) : undefined;
  const category = course ? getCategory(course.categoryId) : undefined;
  const videos = course ? getCourseVideos(course.id) : [];
  const bookmarked = course ? isBookmarked(course.id) : false;

  // Related courses - same category, different course
  const relatedCourses = course
    ? COURSES.filter((c) => c.categoryId === course.categoryId && c.id !== course.id).slice(0, 4)
    : [];

  // What You'll Learn items (derived from tags and course content)
  const learnings = course ? [
    `Master the fundamentals of ${course.tags[0] || course.title.split(' ').slice(0, 2).join(' ')}`,
    `Build real-world projects with hands-on practice`,
    `Understand core concepts and industry best practices`,
    `Prepare effectively for BTEB examinations`,
    `Gain practical skills for professional development`,
    ...(course.tags.length > 1 ? [`Work with ${course.tags.slice(1).join(', ')} technologies`] : []),
  ] : [];

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

  if (!course) {
    return (
      <div className="text-center py-16">
        <p className="text-lg font-bold">Course not found</p>
        <GradientButton onClick={goBack} className="mt-4">Go Back</GradientButton>
      </div>
    );
  }

  const tabs = [
    { key: 'overview' as const, label: 'Overview' },
    { key: 'curriculum' as const, label: 'Curriculum' },
    { key: 'reviews' as const, label: 'Reviews' },
    { key: 'instructor' as const, label: 'Instructor' },
  ];

  const thumbnailColors = [
    'from-sky-400 to-blue-600',
    'from-emerald-400 to-teal-600',
    'from-purple-400 to-indigo-600',
    'from-amber-400 to-orange-600',
  ];
  const colorClass = thumbnailColors[course.id.charCodeAt(1) % thumbnailColors.length];

  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  return (
    <div className="pb-20 lg:pb-0">
      {/* Breadcrumb */}
      <motion.div
        className="flex items-center gap-2 text-sm text-muted-foreground mb-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <button onClick={() => navigate('home')} className="hover:text-sky-500 transition-colors">Home</button>
        <span>/</span>
        <button onClick={() => navigate('explore')} className="hover:text-sky-500 transition-colors">Courses</button>
        <span>/</span>
        <span className="text-foreground font-semibold line-clamp-1">{course.title}</span>
      </motion.div>

      {/* Course header */}
      <GlassCard className="overflow-hidden mb-6">
        <div className={`relative aspect-video md:aspect-[21/9] bg-gradient-to-br ${colorClass}`}>
          <div className="absolute inset-0 flex items-center justify-center">
            <BookOpen className="w-20 h-20 text-white/20" />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
            {category && (
              <span className="text-xs font-bold uppercase tracking-wider text-white/70 mb-2 block">{category.name}</span>
            )}
            <h1 className="text-xl md:text-2xl font-extrabold mb-2">{course.title}</h1>
            <div className="flex flex-wrap items-center gap-4 text-sm">
              {instructor && <span>by {instructor.name}</span>}
              <span className="flex items-center gap-1"><Star className="w-4 h-4 text-amber-400 fill-amber-400" />{course.rating}</span>
              <span className="flex items-center gap-1"><Users className="w-4 h-4" />{course.totalStudents} students</span>
              <span className="flex items-center gap-1"><Clock className="w-4 h-4" />{formatDuration(course.duration)}</span>
            </div>
          </div>
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2">
          {/* Tabs */}
          <div className="flex gap-1 mb-6 bg-muted/30 rounded-xl p-1">
            {tabs.map((tab) => (
              <motion.button
                key={tab.key}
                className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all ${
                  activeTab === tab.key
                    ? 'bg-white dark:bg-slate-800 shadow-sm text-sky-600 dark:text-sky-400'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setActiveTab(tab.key)}
                whileTap={{ scale: 0.97 }}
              >
                {tab.label}
              </motion.button>
            ))}
          </div>

          {/* Tab content */}
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* About This Course */}
                <GlassCard className="p-6 space-y-4">
                  <h2 className="text-lg font-bold">About This Course</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">{course.description}</p>
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Award className="w-4 h-4 text-sky-500" />
                      <span className="text-muted-foreground">Level: <span className="font-semibold text-foreground">{course.level}</span></span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-sky-500" />
                      <span className="text-muted-foreground">Duration: <span className="font-semibold text-foreground">{formatDuration(course.duration)}</span></span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <BookOpen className="w-4 h-4 text-sky-500" />
                      <span className="text-muted-foreground">Videos: <span className="font-semibold text-foreground">{course.totalVideos}</span></span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="w-4 h-4 text-sky-500" />
                      <span className="text-muted-foreground">Students: <span className="font-semibold text-foreground">{course.totalStudents}</span></span>
                    </div>
                  </div>
                  {course.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2">
                      {course.tags.map((tag) => (
                        <span key={tag} className="px-3 py-1 rounded-full bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 text-xs font-semibold">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </GlassCard>

                {/* What You'll Learn */}
                <GlassCard className="p-6">
                  <h2 className="text-lg font-bold mb-4">What You&apos;ll Learn</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {learnings.map((item, i) => (
                      <motion.div
                        key={i}
                        className="flex items-start gap-3"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                      >
                        <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-foreground">{item}</span>
                      </motion.div>
                    ))}
                  </div>
                </GlassCard>

                {/* Instructor Card */}
                {instructor && (
                  <GlassCard className="p-6">
                    <h2 className="text-lg font-bold mb-4">Your Instructor</h2>
                    <div className="flex items-start gap-4">
                      <motion.div
                        className="w-14 h-14 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white text-lg font-extrabold flex-shrink-0"
                        whileHover={{ scale: 1.1 }}
                      >
                        {instructor.name.charAt(0)}
                      </motion.div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-bold text-foreground">{instructor.name}</h3>
                        <p className="text-sm text-sky-500 font-semibold">{instructor.specialization}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                            {instructor.rating} Rating
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {instructor.totalStudents.toLocaleString()} Students
                          </span>
                          <span className="flex items-center gap-1">
                            <BookOpen className="w-3 h-3" />
                            {instructor.totalCourses} Courses
                          </span>
                        </div>
                        <motion.button
                          className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 text-xs font-semibold"
                          onClick={() => navigate('instructor-profile', { instructorId: instructor.id })}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <User className="w-3 h-3" />
                          View Full Profile
                        </motion.button>
                      </div>
                    </div>
                  </GlassCard>
                )}
              </div>
            )}

            {activeTab === 'curriculum' && (
              <div className="space-y-3">
                {/* Overview stats */}
                <GlassCard className="p-4 flex items-center gap-6 text-sm">
                  <span className="text-muted-foreground">{sections.length} sections</span>
                  <span className="text-muted-foreground">{videos.length} lectures</span>
                  <span className="text-muted-foreground">{formatDuration(course.duration)} total</span>
                </GlassCard>

                {/* Expandable sections */}
                {sections.length > 0 ? sections.map((section, si) => {
                  const isExpanded = expandedSections[section.id] ?? false;
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
                            <span className="w-7 h-7 rounded-lg bg-sky-50 dark:bg-sky-900/20 flex items-center justify-center text-sky-500 text-xs font-bold">
                              {si + 1}
                            </span>
                            <div>
                              <h3 className="text-sm font-bold text-foreground">{section.title}</h3>
                              <p className="text-xs text-muted-foreground">{section.videos.length} lectures &middot; {formatDuration(section.videos.reduce((a, v) => a + v.duration, 0))}</p>
                            </div>
                          </div>
                          <motion.div
                            animate={{ rotate: isExpanded ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          </motion.div>
                        </button>

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
                                {section.videos.map((video, vi) => (
                                  <motion.div
                                    key={video.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: vi * 0.03 }}
                                    className="flex items-center gap-4 px-4 py-3 hover:bg-white/30 dark:hover:bg-slate-800/30 transition-colors cursor-pointer border-b border-white/10 dark:border-white/5 last:border-b-0"
                                    onClick={() => navigate('video-player', { videoId: video.id, courseId: course.id })}
                                  >
                                    <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center text-muted-foreground font-medium text-xs flex-shrink-0">
                                      {vi + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <h4 className="text-sm font-medium text-foreground line-clamp-1">{video.title}</h4>
                                      <p className="text-xs text-muted-foreground mt-0.5">{formatDuration(video.duration)}{video.isPreview ? ' \u00B7 Preview' : ''}</p>
                                    </div>
                                    <Play className="w-4 h-4 text-sky-500 flex-shrink-0" />
                                  </motion.div>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </GlassCard>
                    </motion.div>
                  );
                }) : (
                  <GlassCard className="p-8 text-center">
                    <p className="text-sm text-muted-foreground">No curriculum available yet</p>
                  </GlassCard>
                )}
              </div>
            )}

            {activeTab === 'reviews' && (
              <GlassCard className="p-6">
                <h2 className="text-lg font-bold mb-4">Reviews</h2>
                <div className="text-center py-8">
                  <Star className="w-12 h-12 text-amber-400 mx-auto mb-3" />
                  <p className="text-2xl font-extrabold text-foreground">{course.rating}</p>
                  <p className="text-sm text-muted-foreground">{course.totalReviews} reviews</p>
                </div>
                {[1, 2, 3].map((r) => (
                  <div key={r} className="border-t border-white/20 dark:border-white/5 pt-4 mt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
                        {String.fromCharCode(64 + r)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">Student {r}</p>
                        <div className="flex gap-0.5">
                          {[1,2,3,4,5].map((s) => (
                            <Star key={s} className={`w-3 h-3 ${s <= 4 ? 'text-amber-400 fill-amber-400' : 'text-muted'}`} />
                          ))}
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">Great course! Very well explained and easy to follow.</p>
                  </div>
                ))}
              </GlassCard>
            )}

            {activeTab === 'instructor' && instructor && (
              <GlassCard className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <motion.div
                    className="w-16 h-16 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white text-xl font-extrabold"
                    whileHover={{ scale: 1.1 }}
                  >
                    {instructor.name.charAt(0)}
                  </motion.div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground">{instructor.name}</h3>
                    <p className="text-sm text-sky-500 font-semibold">{instructor.specialization}</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">{instructor.bio}</p>
                <div className="flex gap-6 text-sm">
                  <div><span className="font-bold text-foreground">{instructor.totalStudents.toLocaleString()}</span> <span className="text-muted-foreground">students</span></div>
                  <div><span className="font-bold text-foreground">{instructor.totalCourses}</span> <span className="text-muted-foreground">courses</span></div>
                  <div><span className="font-bold text-foreground">{instructor.rating}</span> <span className="text-muted-foreground">rating</span></div>
                </div>
              </GlassCard>
            )}
          </motion.div>
        </div>

        {/* Sidebar */}
        <div>
          <GlassCard className="p-6 sticky top-20 space-y-4">
            <div className="flex items-center justify-between">
              {course.price > 0 ? (
                <span className="text-2xl font-extrabold text-foreground">&#2547;{course.price}</span>
              ) : (
                <span className="text-2xl font-extrabold text-emerald-500">Free</span>
              )}
              <div className="flex gap-2">
                <motion.button
                  className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center"
                  onClick={() => toggleBookmark(course.id)}
                  whileTap={{ scale: 0.9 }}
                >
                  <Heart className={`w-5 h-5 ${bookmarked ? 'text-red-500 fill-red-500' : 'text-muted-foreground'}`} />
                </motion.button>
                <motion.button
                  className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center"
                  whileTap={{ scale: 0.9 }}
                >
                  <Share2 className="w-5 h-5 text-muted-foreground" />
                </motion.button>
              </div>
            </div>

            <GradientButton className="w-full" size="lg" onClick={() => navigate('video-player', { videoId: videos[0]?.id, courseId: course.id })}>
              <Play className="w-4 h-4" />
              {course.price > 0 ? 'Enroll Now' : 'Start Learning'}
            </GradientButton>

            <div className="space-y-3 text-sm pt-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Level</span>
                <span className="font-semibold">{course.level.charAt(0).toUpperCase() + course.level.slice(1)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Duration</span>
                <span className="font-semibold">{formatDuration(course.duration)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Videos</span>
                <span className="font-semibold">{course.totalVideos}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Language</span>
                <span className="font-semibold">{course.language}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Students</span>
                <span className="font-semibold">{course.totalStudents.toLocaleString()}</span>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Related Courses */}
      {relatedCourses.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-extrabold text-foreground mb-4">Related Courses</h2>
          <CourseCardGrid courses={relatedCourses} />
        </div>
      )}

      {/* Sticky enroll/continue button on mobile */}
      <div className="fixed bottom-16 left-0 right-0 p-4 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-t border-white/50 dark:border-white/10 lg:hidden z-40">
        <GradientButton
          className="w-full"
          size="lg"
          onClick={() => navigate('video-player', { videoId: videos[0]?.id, courseId: course.id })}
        >
          <Play className="w-4 h-4" />
          {course.price > 0 ? 'Enroll Now' : 'Continue Learning'}
        </GradientButton>
      </div>
    </div>
  );
}
