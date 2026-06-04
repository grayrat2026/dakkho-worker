'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Bell, Megaphone, Clock, ChevronLeft, Pin, MessageSquare,
  ThumbsUp, ExternalLink, AlertTriangle, Info, CheckCircle2,
  Calendar, Tag,
} from 'lucide-react';
import { useNavigationStore } from '@/lib/store';
import { getCourse, getInstructor } from '@/lib/mock-data';
import { GlassCard } from '../shared/GlassCard';
import { AnimatedPage } from '../shared/AnimatedPage';
import { GradientButton } from '../shared/GradientButton';

interface Announcement {
  id: string;
  title: string;
  content: string;
  type: 'info' | 'update' | 'urgent' | 'achievement';
  date: string;
  isInstructor: boolean;
  authorName: string;
  isPinned: boolean;
  likes: number;
  hasRead: boolean;
}

const MOCK_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'a1', title: 'New Section Added: Advanced Topics', content: 'I have added a new section covering advanced concepts including performance optimization, design patterns, and best practices. This section includes 8 new video lectures and 3 hands-on projects. Make sure to check it out and start learning!', type: 'update', date: '2 hours ago', isInstructor: true, authorName: 'Engr. Karim Uddin', isPinned: true, likes: 45, hasRead: false,
  },
  {
    id: 'a2', title: 'Assignment Deadline Extended', content: 'Due to the recent holidays, the deadline for Assignment #3 has been extended by one week. The new deadline is March 25, 2025 at 11:59 PM. Please use this extra time to submit quality work.', type: 'info', date: '1 day ago', isInstructor: true, authorName: 'Engr. Karim Uddin', isPinned: true, likes: 32, hasRead: false,
  },
  {
    id: 'a3', title: 'Live Q&A Session This Friday', content: 'Join us for a live Q&A session this Friday at 8:00 PM BST. We will cover common exam questions, tricky topics from Section 4, and have an open discussion. Prepare your questions in advance!', type: 'info', date: '2 days ago', isInstructor: true, authorName: 'Engr. Karim Uddin', isPinned: false, likes: 28, hasRead: true,
  },
  {
    id: 'a4', title: 'Important: Exam Preparation Guide', content: 'The BTEB final exam is approaching. I have uploaded a comprehensive preparation guide with important topics, previous year questions, and study tips. Make sure to review it thoroughly before the exam.', type: 'urgent', date: '3 days ago', isInstructor: true, authorName: 'Engr. Karim Uddin', isPinned: false, likes: 67, hasRead: true,
  },
  {
    id: 'a5', title: '500 Students Milestone!', content: 'We have crossed 500 students enrolled in this course! Thank you all for your support and dedication. As a celebration, I am adding bonus content next week. Stay tuned!', type: 'achievement', date: '1 week ago', isInstructor: true, authorName: 'Engr. Karim Uddin', isPinned: false, likes: 89, hasRead: true,
  },
  {
    id: 'a6', title: 'Video Quality Update', content: 'Some students reported video quality issues on mobile devices. We have re-encoded all videos in higher resolution for better viewing experience. Please clear your cache and reload the course.', type: 'update', date: '2 weeks ago', isInstructor: true, authorName: 'Engr. Karim Uddin', isPinned: false, likes: 15, hasRead: true,
  },
];

const TYPE_CONFIG = {
  info: { icon: Info, color: 'text-sky-500 bg-sky-50 dark:bg-sky-900/20', label: 'Info' },
  update: { icon: Megaphone, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20', label: 'Update' },
  urgent: { icon: AlertTriangle, color: 'text-red-500 bg-red-50 dark:bg-red-900/20', label: 'Urgent' },
  achievement: { icon: CheckCircle2, color: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20', label: 'Milestone' },
};

export function CourseAnnouncementsPage() {
  const { pageParams, navigate, goBack } = useNavigationStore();
  const courseId = pageParams.courseId as string;
  const course = getCourse(courseId);
  const instructor = course ? getInstructor(course.instructorId) : undefined;

  const [filterType, setFilterType] = useState<string>('all');
  const [readAnnouncements, setReadAnnouncements] = useState<Set<string>>(
    new Set(MOCK_ANNOUNCEMENTS.filter((a) => a.hasRead).map((a) => a.id))
  );

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

  const filteredAnnouncements = MOCK_ANNOUNCEMENTS
    .filter((a) => filterType === 'all' || a.type === filterType)
    .sort((a, b) => (a.isPinned === b.isPinned ? 0 : a.isPinned ? -1 : 1));

  const unreadCount = MOCK_ANNOUNCEMENTS.filter((a) => !readAnnouncements.has(a.id)).length;
  const markAsRead = (id: string) => setReadAnnouncements((prev) => new Set([...prev, id]));
  const markAllAsRead = () => setReadAnnouncements(new Set(MOCK_ANNOUNCEMENTS.map((a) => a.id)));

  return (
    <AnimatedPage keyProp={`course-announcements-${courseId}`}>
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
          <span className="text-foreground font-semibold">Announcements</span>
        </motion.div>

        {/* Header */}
        <GlassCard className="p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-extrabold text-foreground flex items-center gap-2">
                <Bell className="w-5 h-5 text-sky-500" />
                Announcements
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold">{unreadCount}</span>
                )}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">{course.title}</p>
            </div>
            {unreadCount > 0 && (
              <motion.button
                className="text-xs font-semibold text-sky-500 hover:underline"
                onClick={markAllAsRead}
                whileTap={{ scale: 0.95 }}
              >
                Mark all as read
              </motion.button>
            )}
          </div>

          {/* Filter tabs */}
          <div className="flex gap-2 mt-4 flex-wrap">
            {['all', 'info', 'update', 'urgent', 'achievement'].map((type) => (
              <motion.button
                key={type}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize ${
                  filterType === type ? 'bg-sky-500 text-white' : 'bg-muted/30 text-muted-foreground'
                }`}
                onClick={() => setFilterType(type)}
                whileTap={{ scale: 0.95 }}
              >
                {type}
              </motion.button>
            ))}
          </div>
        </GlassCard>

        {/* Announcements List */}
        <div className="space-y-4">
          {filteredAnnouncements.map((announcement, i) => {
            const config = TYPE_CONFIG[announcement.type];
            const isRead = readAnnouncements.has(announcement.id);
            return (
              <motion.div
                key={announcement.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <GlassCard
                  className={`p-5 relative ${!isRead ? 'border-l-4 border-l-sky-500' : ''}`}
                  onClick={() => markAsRead(announcement.id)}
                >
                  {/* Pinned badge */}
                  {announcement.isPinned && (
                    <div className="absolute top-3 right-3">
                      <Pin className="w-3.5 h-3.5 text-sky-500" />
                    </div>
                  )}

                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${config.color}`}>
                      <config.icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${config.color}`}>
                          {config.label}
                        </span>
                        {announcement.isPinned && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400">
                            Pinned
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-bold text-foreground mb-1">{announcement.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{announcement.content}</p>
                      <div className="flex items-center gap-4 mt-3 flex-wrap">
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          {announcement.date}
                        </span>
                        <span className="text-xs text-muted-foreground">by {announcement.authorName}</span>
                        <motion.button
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-sky-500 transition-colors"
                          whileTap={{ scale: 0.95 }}
                        >
                          <ThumbsUp className="w-3 h-3" />
                          {announcement.likes}
                        </motion.button>
                      </div>
                    </div>
                  </div>

                  {/* Unread indicator */}
                  {!isRead && (
                    <div className="absolute top-5 right-5 w-2 h-2 rounded-full bg-sky-500" />
                  )}
                </GlassCard>
              </motion.div>
            );
          })}
        </div>

        {filteredAnnouncements.length === 0 && (
          <GlassCard className="p-8 text-center">
            <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No announcements found for this filter.</p>
          </GlassCard>
        )}
      </div>
    </AnimatedPage>
  );
}
