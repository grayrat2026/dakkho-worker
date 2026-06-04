'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  Radio,
  Bell,
  PlayCircle,
  Calendar,
  Clock,
  AlertCircle,
  RefreshCw,
  Video,
  MonitorSmartphone,
} from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { GlassCard } from '../shared/GlassCard';
import { GradientButton } from '../shared/GradientButton';
import { EmptyState } from '../shared/EmptyState';
import { liveClassApi, technologyApi, type LiveClass, type Technology } from '@/lib/api-client';

// ─── Helpers ────────────────────────────────────────────────────

function formatScheduleDate(iso: string): { date: string; time: string } {
  try {
    const d = new Date(iso);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    let date: string;
    if (diffDays === 0) date = 'Today';
    else if (diffDays === 1) date = 'Tomorrow';
    else if (diffDays === -1) date = 'Yesterday';
    else date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    return { date, time };
  } catch {
    return { date: iso, time: '' };
  }
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function platformIcon(platform: string) {
  const lower = platform?.toLowerCase() || '';
  if (lower.includes('zoom')) return <Video className="w-3 h-3" />;
  if (lower.includes('jitsi')) return <MonitorSmartphone className="w-3 h-3" />;
  return <Radio className="w-3 h-3" />;
}

// ─── Skeleton Card ──────────────────────────────────────────────

function SessionSkeletonCard() {
  return (
    <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/50 dark:border-white/10 rounded-2xl p-4 animate-pulse">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0 space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-4 w-14 rounded-full bg-muted/50" />
            <div className="h-4 w-20 rounded-full bg-muted/50" />
          </div>
          <div className="h-5 w-3/4 rounded bg-muted/50" />
          <div className="h-3 w-1/2 rounded bg-muted/50" />
          <div className="flex items-center gap-3">
            <div className="h-3 w-20 rounded bg-muted/50" />
            <div className="h-3 w-16 rounded bg-muted/50" />
          </div>
        </div>
        <div className="h-9 w-24 rounded-xl bg-muted/50" />
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────

type FetchState = 'loading' | 'success' | 'error';

export function LiveSessionsPage() {
  const [sessions, setSessions] = useState<LiveClass[]>([]);
  const [technologies, setTechnologies] = useState<Technology[]>([]);
  const [fetchState, setFetchState] = useState<FetchState>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [reminders, setReminders] = useState<Set<number>>(new Set());

  // Build technology lookup map
  const techMap = useMemo(() => {
    const map = new Map<number, Technology>();
    for (const t of technologies) {
      map.set(t.id, t);
    }
    return map;
  }, [technologies]);

  // Track a trigger counter so retry can re-fire the effect
  const [retryTrigger, setRetryTrigger] = useState(0);

  useEffect(() => {
    let cancelled = false;

    Promise.all([liveClassApi.list(), technologyApi.list()])
      .then(([liveRes, techRes]) => {
        if (cancelled) return;
        setSessions(liveRes.liveClasses ?? []);
        setTechnologies(techRes.technologies ?? []);
        setFetchState('success');
      })
      .catch((err: any) => {
        if (cancelled) return;
        setErrorMsg(err?.message || 'Failed to load live sessions');
        setFetchState('error');
      });

    return () => { cancelled = true; };
  }, [retryTrigger]);

  const handleRetry = () => {
    setFetchState('loading');
    setErrorMsg('');
    setRetryTrigger((n) => n + 1);
  };

  // Group sessions
  const liveNow = useMemo(
    () => sessions.filter((s) => s.status === 'live'),
    [sessions],
  );
  const upcoming = useMemo(
    () => sessions.filter((s) => s.status === 'scheduled'),
    [sessions],
  );
  const replays = useMemo(
    () => sessions.filter((s) => !!s.recording_url),
    [sessions],
  );

  // Reminder toggle
  const toggleReminder = (id: number) => {
    setReminders((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ─── Error State ────────────────────────────────────────────
  if (fetchState === 'error') {
    return (
      <div className="p-4 md:p-6 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <motion.div
            className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4"
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          >
            <AlertCircle className="w-10 h-10 text-red-500" />
          </motion.div>
          <h3 className="text-lg font-bold text-foreground mb-2">Something went wrong</h3>
          <p className="text-muted-foreground text-sm max-w-xs mb-6">{errorMsg}</p>
          <GradientButton onClick={handleRetry} variant="primary" size="sm">
            <RefreshCw className="w-4 h-4" />
            Try Again
          </GradientButton>
        </motion.div>
      </div>
    );
  }

  // ─── Loading State ──────────────────────────────────────────
  if (fetchState === 'loading') {
    return (
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
        {/* Header skeleton */}
        <div className="flex items-center gap-3 animate-pulse">
          <div className="w-10 h-10 rounded-xl bg-muted/50" />
          <div className="space-y-2">
            <div className="h-6 w-40 rounded bg-muted/50" />
            <div className="h-3 w-56 rounded bg-muted/50" />
          </div>
        </div>
        {/* Skeleton cards */}
        <div className="space-y-3">
          <div className="h-4 w-24 rounded bg-muted/50 animate-pulse" />
          <SessionSkeletonCard />
          <SessionSkeletonCard />
        </div>
        <div className="space-y-3">
          <div className="h-4 w-20 rounded bg-muted/50 animate-pulse" />
          <SessionSkeletonCard />
          <SessionSkeletonCard />
          <SessionSkeletonCard />
        </div>
      </div>
    );
  }

  // ─── Empty State ────────────────────────────────────────────
  const hasAny = liveNow.length > 0 || upcoming.length > 0 || replays.length > 0;
  if (!hasAny) {
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
            <p className="text-sm text-muted-foreground">No sessions available</p>
          </div>
        </motion.div>

        <EmptyState
          icon={Radio}
          title="No Live Sessions Yet"
          description="There are no live sessions scheduled right now. Check back later for upcoming classes and replays."
          actionLabel="Refresh"
          onAction={handleRetry}
        />
      </div>
    );
  }

  // ─── Main Content ───────────────────────────────────────────
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
          <p className="text-sm text-muted-foreground">
            {liveNow.length > 0 && <span className="text-red-500 font-semibold">{liveNow.length} live now</span>}
            {liveNow.length > 0 && upcoming.length > 0 && <span> · </span>}
            {upcoming.length > 0 && <span>{upcoming.length} upcoming</span>}
            {(liveNow.length > 0 || upcoming.length > 0) && replays.length > 0 && <span> · </span>}
            {replays.length > 0 && <span>{replays.length} replays</span>}
          </p>
        </div>
      </motion.div>

      {/* ─── Live Now ──────────────────────────────────────── */}
      <AnimatePresence>
        {liveNow.length > 0 && (
          <motion.div
            className="space-y-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-center gap-2">
              <motion.div
                className="w-2 h-2 rounded-full bg-red-500"
                animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              <h2 className="text-sm font-bold uppercase tracking-wider text-red-500">Live Now</h2>
            </div>
            {liveNow.map((session, i) => {
              const { date, time } = formatScheduleDate(session.scheduled_at);
              const tech = techMap.get(session.technology_id);
              return (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <GlassCard className="p-4 border-l-4 border-l-red-500">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <motion.span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500 text-white"
                            animate={{ opacity: [1, 0.7, 1] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                          >
                            LIVE
                          </motion.span>
                          {tech && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400">
                              {tech.name_bn || tech.name}
                            </span>
                          )}
                        </div>
                        <h3 className="font-bold text-foreground mb-1 line-clamp-2">
                          {session.title_bn || session.title}
                        </h3>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {date}{time ? `, ${time}` : ''}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDuration(session.duration_minutes)}
                          </span>
                          {session.platform && (
                            <span className="flex items-center gap-1 font-medium text-foreground/70">
                              {platformIcon(session.platform)}
                              {session.platform}
                            </span>
                          )}
                        </div>
                      </div>
                      {session.meeting_url && (
                        <GradientButton
                          size="sm"
                          variant="danger"
                          onClick={() => window.open(session.meeting_url, '_blank', 'noopener')}
                        >
                          Join
                        </GradientButton>
                      )}
                    </div>
                  </GlassCard>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Upcoming ──────────────────────────────────────── */}
      <AnimatePresence>
        {upcoming.length > 0 && (
          <motion.div
            className="space-y-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <h2 className="text-sm font-bold uppercase tracking-wider text-sky-500">Upcoming</h2>
            {upcoming.map((session, i) => {
              const { date, time } = formatScheduleDate(session.scheduled_at);
              const tech = techMap.get(session.technology_id);
              const hasReminder = reminders.has(session.id);
              return (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: (i + liveNow.length) * 0.05 }}
                >
                  <GlassCard hover className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400">
                            UPCOMING
                          </span>
                          {tech && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400">
                              {tech.name_bn || tech.name}
                            </span>
                          )}
                        </div>
                        <h3 className="font-bold text-foreground mb-1 line-clamp-2">
                          {session.title_bn || session.title}
                        </h3>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {date}{time ? `, ${time}` : ''}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDuration(session.duration_minutes)}
                          </span>
                          {session.platform && (
                            <span className="flex items-center gap-1 font-medium text-foreground/70">
                              {platformIcon(session.platform)}
                              {session.platform}
                            </span>
                          )}
                        </div>
                      </div>
                      <motion.button
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors flex-shrink-0 ${
                          hasReminder
                            ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400'
                            : 'bg-muted/50 text-muted-foreground hover:text-foreground'
                        }`}
                        onClick={() => toggleReminder(session.id)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Bell className={`w-3 h-3 ${hasReminder ? 'fill-current' : ''}`} />
                        {hasReminder ? 'Reminder Set' : 'Set Reminder'}
                      </motion.button>
                    </div>
                  </GlassCard>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Replay Available ──────────────────────────────── */}
      <AnimatePresence>
        {replays.length > 0 && (
          <motion.div
            className="space-y-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <h2 className="text-sm font-bold uppercase tracking-wider text-emerald-500">Replay Available</h2>
            {replays.map((session, i) => {
              const { date } = formatScheduleDate(session.scheduled_at);
              const tech = techMap.get(session.technology_id);
              return (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: (i + liveNow.length + upcoming.length) * 0.05 }}
                >
                  <GlassCard hover className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                            REPLAY
                          </span>
                          {tech && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                              {tech.name_bn || tech.name}
                            </span>
                          )}
                        </div>
                        <h3 className="font-bold text-foreground mb-1 line-clamp-2">
                          {session.title_bn || session.title}
                        </h3>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {date}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDuration(session.duration_minutes)}
                          </span>
                          {session.platform && (
                            <span className="flex items-center gap-1 font-medium text-foreground/70">
                              {platformIcon(session.platform)}
                              {session.platform}
                            </span>
                          )}
                        </div>
                      </div>
                      <motion.button
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-colors flex-shrink-0"
                        onClick={() => window.open(session.recording_url, '_blank', 'noopener')}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <PlayCircle className="w-3 h-3" />
                        Watch Replay
                      </motion.button>
                    </div>
                  </GlassCard>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
