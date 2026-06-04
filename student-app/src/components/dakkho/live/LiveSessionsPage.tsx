'use client';

import { motion } from 'framer-motion';
import { Radio, Bell, PlayCircle, Users, Calendar, Clock } from 'lucide-react';
import { useState } from 'react';
import { GlassCard } from '../shared/GlassCard';
import { GradientButton } from '../shared/GradientButton';

interface LiveSession {
  id: string;
  title: string;
  instructor: string;
  date: string;
  time: string;
  duration: string;
  status: 'live' | 'upcoming' | 'replay';
  attendees: number;
  category: string;
}

const MOCK_SESSIONS: LiveSession[] = [
  {
    id: 'ls1',
    title: 'Power Systems Q&A - Live Doubt Clearing',
    instructor: 'Dr. Shahid Hossain',
    date: 'Today',
    time: 'Now',
    duration: '1h 30m',
    status: 'live',
    attendees: 142,
    category: 'Electrical',
  },
  {
    id: 'ls2',
    title: 'React Hooks Deep Dive - Advanced Patterns',
    instructor: 'Taslima Khatun',
    date: 'Today',
    time: '5:00 PM',
    duration: '2h',
    status: 'upcoming',
    attendees: 89,
    category: 'Web Development',
  },
  {
    id: 'ls3',
    title: 'Arduino Project Workshop - Build a Smart Home',
    instructor: 'Fatema Begum',
    date: 'Tomorrow',
    time: '10:00 AM',
    duration: '3h',
    status: 'upcoming',
    attendees: 67,
    category: 'Electronics',
  },
  {
    id: 'ls4',
    title: 'Python Data Structures Interview Prep',
    instructor: 'Engr. Karim Uddin',
    date: 'Tomorrow',
    time: '3:00 PM',
    duration: '1h 30m',
    status: 'upcoming',
    attendees: 54,
    category: 'Programming',
  },
  {
    id: 'ls5',
    title: 'AutoCAD Tips & Tricks for Mechanical Students',
    instructor: 'Rafiqul Islam',
    date: 'Last Week',
    time: '2:00 PM',
    duration: '1h 45m',
    status: 'replay',
    attendees: 210,
    category: 'Mechanical',
  },
  {
    id: 'ls6',
    title: 'Introduction to Machine Learning Models',
    instructor: 'Sharmin Sultana',
    date: 'Last Week',
    time: '11:00 AM',
    duration: '2h',
    status: 'replay',
    attendees: 178,
    category: 'Data Science',
  },
];

export function LiveSessionsPage() {
  const [reminders, setReminders] = useState<Set<string>>(new Set());

  const toggleReminder = (id: string) => {
    setReminders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const liveSessions = MOCK_SESSIONS.filter((s) => s.status === 'live');
  const upcomingSessions = MOCK_SESSIONS.filter((s) => s.status === 'upcoming');
  const replaySessions = MOCK_SESSIONS.filter((s) => s.status === 'replay');

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shadow-lg shadow-red-500/20">
          <Radio className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold gradient-text">Live Sessions</h1>
          <p className="text-sm text-muted-foreground">{liveSessions.length} live now, {upcomingSessions.length} upcoming</p>
        </div>
      </motion.div>

      {/* Live Now Section */}
      {liveSessions.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <motion.div
              className="w-2 h-2 rounded-full bg-red-500"
              animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <h2 className="text-sm font-bold uppercase tracking-wider text-red-500">Live Now</h2>
          </div>
          {liveSessions.map((session, i) => (
            <motion.div
              key={session.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <GlassCard className="p-4 border-l-4 border-l-red-500">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <motion.span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500 text-white"
                        animate={{ opacity: [1, 0.7, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        LIVE
                      </motion.span>
                      <span className="text-xs text-muted-foreground">{session.category}</span>
                    </div>
                    <h3 className="font-bold text-foreground mb-1">{session.title}</h3>
                    <p className="text-sm text-muted-foreground">{session.instructor}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {session.attendees} watching
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {session.duration}
                      </span>
                    </div>
                  </div>
                  <GradientButton size="sm" variant="danger">
                    Join Live
                  </GradientButton>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      )}

      {/* Upcoming Section */}
      {upcomingSessions.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Upcoming</h2>
          {upcomingSessions.map((session, i) => (
            <motion.div
              key={session.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: (i + liveSessions.length) * 0.05 }}
            >
              <GlassCard hover className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400">
                        UPCOMING
                      </span>
                      <span className="text-xs text-muted-foreground">{session.category}</span>
                    </div>
                    <h3 className="font-bold text-foreground mb-1">{session.title}</h3>
                    <p className="text-sm text-muted-foreground">{session.instructor}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {session.date}, {session.time}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {session.duration}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {session.attendees} registered
                      </span>
                    </div>
                  </div>
                  <motion.button
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                      reminders.has(session.id)
                        ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400'
                        : 'bg-muted/50 text-muted-foreground hover:text-foreground'
                    }`}
                    onClick={() => toggleReminder(session.id)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Bell className={`w-3 h-3 ${reminders.has(session.id) ? 'fill-current' : ''}`} />
                    {reminders.has(session.id) ? 'Reminder Set' : 'Set Reminder'}
                  </motion.button>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      )}

      {/* Replay Section */}
      {replaySessions.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Replay Available</h2>
          {replaySessions.map((session, i) => (
            <motion.div
              key={session.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: (i + liveSessions.length + upcomingSessions.length) * 0.05 }}
            >
              <GlassCard hover className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        REPLAY
                      </span>
                      <span className="text-xs text-muted-foreground">{session.category}</span>
                    </div>
                    <h3 className="font-bold text-foreground mb-1">{session.title}</h3>
                    <p className="text-sm text-muted-foreground">{session.instructor}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {session.date}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {session.duration}
                      </span>
                    </div>
                  </div>
                  <motion.button
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <PlayCircle className="w-3 h-3" />
                    Watch Replay
                  </motion.button>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
