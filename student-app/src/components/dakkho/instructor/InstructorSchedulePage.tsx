'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar, Clock, Video, MapPin, Users, Bell,
  ChevronLeft, ChevronRight, Plus, ExternalLink,
  Zap, BookOpen, Globe, Monitor,
} from 'lucide-react';
import { useNavigationStore } from '@/lib/store';
import { getInstructor } from '@/lib/mock-data';
import { GlassCard } from '../shared/GlassCard';
import { AnimatedPage } from '../shared/AnimatedPage';
import { GradientButton } from '../shared/GradientButton';

interface ScheduleSession {
  id: string;
  title: string;
  type: 'live' | 'office-hours' | 'workshop' | 'qna';
  date: string;
  time: string;
  duration: string;
  status: 'upcoming' | 'live' | 'completed';
  attendees: number;
  maxAttendees: number;
  description: string;
  courseId?: string;
}

const MOCK_SCHEDULE: ScheduleSession[] = [
  { id: 's1', title: 'Live Session: JavaScript Advanced Concepts', type: 'live', date: 'Today', time: '8:00 PM - 9:30 PM', duration: '1.5 hours', status: 'live', attendees: 45, maxAttendees: 100, description: 'Deep dive into closures, prototypes, and async/await patterns. Live coding and Q&A included.', courseId: 'c1' },
  { id: 's2', title: 'Office Hours: Project Help', type: 'office-hours', date: 'Today', time: '5:00 PM - 6:00 PM', duration: '1 hour', status: 'upcoming', attendees: 12, maxAttendees: 30, description: 'Drop-in session for students who need help with their course projects.' },
  { id: 's3', title: 'Workshop: Building REST APIs', type: 'workshop', date: 'Tomorrow', time: '7:00 PM - 9:00 PM', duration: '2 hours', status: 'upcoming', attendees: 67, maxAttendees: 80, description: 'Hands-on workshop covering REST API design, Node.js, Express, and MongoDB integration.', courseId: 'c23' },
  { id: 's4', title: 'Q&A: BTEB Exam Preparation', type: 'qna', date: 'Mar 28, 2025', time: '6:00 PM - 7:00 PM', duration: '1 hour', status: 'upcoming', attendees: 89, maxAttendees: 150, description: 'Open Q&A session focused on BTEB exam preparation strategies and important topics.' },
  { id: 's5', title: 'Live Session: React Hooks Deep Dive', type: 'live', date: 'Mar 30, 2025', time: '8:00 PM - 9:30 PM', duration: '1.5 hours', status: 'upcoming', attendees: 34, maxAttendees: 100, description: 'Comprehensive coverage of React hooks including useState, useEffect, useContext, and custom hooks.', courseId: 'c2' },
  { id: 's6', title: 'Workshop: Mobile App Design', type: 'workshop', date: 'Apr 2, 2025', time: '7:00 PM - 9:00 PM', duration: '2 hours', status: 'upcoming', attendees: 23, maxAttendees: 50, description: 'Design patterns and best practices for building beautiful mobile applications with Flutter.' },
  { id: 's7', title: 'Live Session: Python Projects', type: 'live', date: 'Apr 5, 2025', time: '8:00 PM - 9:00 PM', duration: '1 hour', status: 'upcoming', attendees: 56, maxAttendees: 100, description: 'Building practical Python projects from scratch. Step-by-step implementation with live coding.', courseId: 'c13' },
  { id: 's8', title: 'Office Hours: Career Guidance', type: 'office-hours', date: 'Apr 8, 2025', time: '4:00 PM - 5:00 PM', duration: '1 hour', status: 'upcoming', attendees: 8, maxAttendees: 20, description: 'Career guidance session for students looking to enter the tech industry.' },
];

const TYPE_CONFIG = {
  'live': { icon: Video, color: 'text-red-500 bg-red-50 dark:bg-red-900/20', border: 'border-l-red-500', label: 'Live Session' },
  'office-hours': { icon: Clock, color: 'text-sky-500 bg-sky-50 dark:bg-sky-900/20', border: 'border-l-sky-500', label: 'Office Hours' },
  'workshop': { icon: Zap, color: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20', border: 'border-l-amber-500', label: 'Workshop' },
  'qna': { icon: Users, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20', border: 'border-l-emerald-500', label: 'Q&A Session' },
};

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function InstructorSchedulePage() {
  const { pageParams, navigate, goBack } = useNavigationStore();
  const instructorId = pageParams.instructorId as string;
  const instructor = getInstructor(instructorId);

  const [filterType, setFilterType] = useState<string>('all');
  const [reminders, setReminders] = useState<Set<string>>(new Set());

  if (!instructor) {
    return (
      <AnimatedPage>
        <div className="text-center py-16">
          <p className="text-lg font-bold">Instructor not found</p>
          <GradientButton onClick={goBack} className="mt-4">Go Back</GradientButton>
        </div>
      </AnimatedPage>
    );
  }

  const filteredSchedule = MOCK_SCHEDULE
    .filter((s) => filterType === 'all' || s.type === filterType)
    .sort((a, b) => {
      if (a.status === 'live') return -1;
      if (b.status === 'live') return 1;
      return 0;
    });

  const toggleReminder = (id: string) => {
    setReminders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Generate calendar days for current month view
  const today = new Date();
  const currentMonth = today.toLocaleString('default', { month: 'long', year: 'numeric' });
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).getDay();
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const calendarDays = Array.from({ length: 35 }, (_, i) => {
    const dayNum = i - firstDay + 1;
    return dayNum >= 1 && dayNum <= daysInMonth ? dayNum : null;
  });

  // Session dates (mock - 5, 12, 19, 26 of current month)
  const sessionDates = new Set([5, 12, 19, 26]);

  return (
    <AnimatedPage keyProp={`instructor-schedule-${instructorId}`}>
      <div className="pb-20 lg:pb-0">
        {/* Breadcrumb */}
        <motion.div className="flex items-center gap-2 text-sm text-muted-foreground mb-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <button onClick={() => navigate('home')} className="hover:text-sky-500 transition-colors">Home</button>
          <span>/</span>
          <button onClick={() => navigate('instructor-profile', { instructorId })} className="hover:text-sky-500 transition-colors">{instructor.name}</button>
          <span>/</span>
          <span className="text-foreground font-semibold">Schedule</span>
        </motion.div>

        {/* Header */}
        <GlassCard className="p-6 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <motion.div
              className="w-12 h-12 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white text-lg font-extrabold"
              whileHover={{ scale: 1.05 }}
            >
              {instructor.name.charAt(0)}
            </motion.div>
            <div>
              <h1 className="text-lg font-extrabold text-foreground">Schedule & Sessions</h1>
              <p className="text-sm text-sky-500 font-semibold">{instructor.name}</p>
            </div>
          </div>

          {/* Filter tabs */}
          <div className="flex gap-2 flex-wrap">
            {['all', 'live', 'office-hours', 'workshop', 'qna'].map((type) => (
              <motion.button
                key={type}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize ${
                  filterType === type ? 'bg-sky-500 text-white' : 'bg-muted/30 text-muted-foreground'
                }`}
                onClick={() => setFilterType(type)}
                whileTap={{ scale: 0.95 }}
              >
                {type === 'qna' ? 'Q&A' : type === 'office-hours' ? 'Office Hours' : type === 'all' ? 'All Sessions' : type}
              </motion.button>
            ))}
          </div>
        </GlassCard>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main schedule list */}
          <div className="lg:col-span-2 space-y-4">
            {filteredSchedule.map((session, i) => {
              const config = TYPE_CONFIG[session.type];
              const hasReminder = reminders.has(session.id);
              return (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <GlassCard className={`p-5 border-l-4 ${config.border} ${session.status === 'live' ? 'ring-2 ring-red-500/20' : ''}`}>
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${config.color}`}>
                        <config.icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="text-sm font-bold text-foreground">{session.title}</h3>
                          {session.status === 'live' && (
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold animate-pulse">
                              <span className="w-1.5 h-1.5 rounded-full bg-white" /> LIVE
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">{session.description}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{session.date}</span>
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{session.time}</span>
                          <span className="flex items-center gap-1"><Users className="w-3 h-3" />{session.attendees}/{session.maxAttendees}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${config.color}`}>{config.label}</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/20 dark:border-white/5">
                      <motion.button
                        className={`flex items-center gap-1.5 text-xs font-semibold ${
                          hasReminder ? 'text-sky-500' : 'text-muted-foreground'
                        }`}
                        onClick={() => toggleReminder(session.id)}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Bell className={`w-3.5 h-3.5 ${hasReminder ? 'fill-sky-500' : ''}`} />
                        {hasReminder ? 'Reminder Set' : 'Set Reminder'}
                      </motion.button>
                      <GradientButton size="sm" onClick={() => { if (session.courseId) navigate('course-detail', { courseId: session.courseId }); }}>
                        {session.status === 'live' ? (
                          <><Video className="w-3 h-3" /> Join Now</>
                        ) : session.status === 'completed' ? (
                          'View Recording'
                        ) : (
                          'Register'
                        )}
                      </GradientButton>
                    </div>
                  </GlassCard>
                </motion.div>
              );
            })}
          </div>

          {/* Sidebar - Mini Calendar */}
          <div className="space-y-6">
            <GlassCard className="p-6">
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">{currentMonth}</h3>
              <div className="grid grid-cols-7 gap-1 text-center">
                {DAYS_OF_WEEK.map((day) => (
                  <span key={day} className="text-[10px] font-bold text-muted-foreground py-1">{day}</span>
                ))}
                {calendarDays.map((day, i) => (
                  <div
                    key={i}
                    className={`aspect-square flex items-center justify-center text-xs rounded-lg ${
                      day === today.getDate()
                        ? 'bg-sky-500 text-white font-bold'
                        : sessionDates.has(day || 0)
                          ? 'bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 font-semibold'
                          : day
                            ? 'text-foreground'
                            : ''
                    }`}
                  >
                    {day || ''}
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-3 mt-3 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-sky-500" /> Today
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-sky-200 dark:bg-sky-800" /> Sessions
                </span>
              </div>
            </GlassCard>

            {/* Quick Stats */}
            <GlassCard className="p-6">
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">This Month</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Video className="w-4 h-4 text-red-500" /> Live Sessions
                  </span>
                  <span className="font-bold text-foreground">4</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Clock className="w-4 h-4 text-sky-500" /> Office Hours
                  </span>
                  <span className="font-bold text-foreground">3</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-500" /> Workshops
                  </span>
                  <span className="font-bold text-foreground">2</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-500" /> Q&A Sessions
                  </span>
                  <span className="font-bold text-foreground">2</span>
                </div>
              </div>
            </GlassCard>

            {/* Upcoming Highlight */}
            <GlassCard className="p-6">
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">Next Session</h3>
              <div className="text-center">
                <div className="w-14 h-14 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-3">
                  <Video className="w-7 h-7 text-red-500" />
                </div>
                <h4 className="text-sm font-bold text-foreground">JavaScript Advanced</h4>
                <p className="text-xs text-muted-foreground mt-1">Today at 8:00 PM</p>
                <p className="text-xs text-red-500 font-bold mt-1">Starting Soon!</p>
                <GradientButton size="sm" className="mt-3 w-full">
                  <Video className="w-3 h-3" /> Join Session
                </GradientButton>
              </div>
            </GlassCard>
          </div>
        </div>
      </div>
    </AnimatedPage>
  );
}
