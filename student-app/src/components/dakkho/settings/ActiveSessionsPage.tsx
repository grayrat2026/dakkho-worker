'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Smartphone, Monitor, Globe, MapPin, Clock, ChevronLeft,
  Shield, Trash2, CheckCircle, AlertTriangle, LogOut, Laptop,
  Tablet, Chrome,
} from 'lucide-react';
import { useNavigationStore } from '@/lib/store';
import { GlassCard } from '../shared/GlassCard';
import { GradientButton } from '../shared/GradientButton';

interface Session {
  id: string;
  device: 'mobile' | 'desktop' | 'tablet';
  browser: string;
  location: string;
  ip: string;
  lastActive: string;
  isCurrent: boolean;
  icon: React.ElementType;
}

const MOCK_SESSIONS: Session[] = [
  {
    id: 's1',
    device: 'mobile',
    browser: 'Chrome Mobile',
    location: 'Dhaka, Bangladesh',
    ip: '103.48.XX.XX',
    lastActive: 'Active now',
    isCurrent: true,
    icon: Smartphone,
  },
  {
    id: 's2',
    device: 'desktop',
    browser: 'Chrome 120',
    location: 'Dhaka, Bangladesh',
    ip: '103.48.XX.XX',
    lastActive: '2 hours ago',
    isCurrent: false,
    icon: Monitor,
  },
  {
    id: 's3',
    device: 'tablet',
    browser: 'Safari Mobile',
    location: 'Chittagong, Bangladesh',
    ip: '45.64.XX.XX',
    lastActive: '1 day ago',
    isCurrent: false,
    icon: Tablet,
  },
  {
    id: 's4',
    device: 'desktop',
    browser: 'Firefox 121',
    location: 'Sylhet, Bangladesh',
    ip: '37.111.XX.XX',
    lastActive: '3 days ago',
    isCurrent: false,
    icon: Laptop,
  },
];

export function ActiveSessionsPage() {
  const { goBack } = useNavigationStore();
  const [sessions, setSessions] = useState<Session[]>(MOCK_SESSIONS);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [revokedAll, setRevokedAll] = useState(false);
  const [showConfirmRevokeAll, setShowConfirmRevokeAll] = useState(false);

  const currentSession = sessions.find((s) => s.isCurrent);
  const otherSessions = sessions.filter((s) => !s.isCurrent);

  const handleRevoke = async (id: string) => {
    setRevokingId(id);
    await new Promise((r) => setTimeout(r, 1000));
    setSessions((prev) => prev.filter((s) => s.id !== id));
    setRevokingId(null);
  };

  const handleRevokeAll = async () => {
    setShowConfirmRevokeAll(false);
    setRevokedAll(true);
    await new Promise((r) => setTimeout(r, 1200));
    setSessions((prev) => prev.filter((s) => s.isCurrent));
    setTimeout(() => setRevokedAll(false), 3000);
  };

  return (
    <div className="pb-20 lg:pb-0">
      {/* Header */}
      <motion.div className="flex items-center gap-3 mb-6" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <motion.button
          className="w-9 h-9 rounded-xl bg-muted/30 flex items-center justify-center text-foreground"
          onClick={goBack}
          whileTap={{ scale: 0.9 }}
        >
          <ChevronLeft className="w-5 h-5" />
        </motion.button>
        <div>
          <h1 className="text-xl font-extrabold text-foreground">Active Sessions</h1>
          <p className="text-xs text-muted-foreground">Manage devices logged into your account</p>
        </div>
      </motion.div>

      {/* Success message */}
      {revokedAll && (
        <motion.div
          className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 flex items-center gap-2"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <CheckCircle className="w-4 h-4 text-emerald-500" />
          <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">All other sessions have been revoked!</p>
        </motion.div>
      )}

      {/* Current Session */}
      {currentSession && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <GlassCard className="p-5 mb-4">
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-4">
              <Shield className="w-4 h-4 text-emerald-500" /> Current Session
            </h3>
            <div className="flex items-center gap-4 p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-200/50 dark:border-emerald-800/30">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                <currentSession.icon className="w-6 h-6 text-emerald-500" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-foreground">{currentSession.browser}</p>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500 text-white font-bold">This device</span>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {currentSession.location}
                  </span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {currentSession.lastActive}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">IP: {currentSession.ip}</p>
              </div>
            </div>
          </GlassCard>
        </motion.div>
      )}

      {/* Other Sessions */}
      {otherSessions.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <GlassCard className="p-5 mb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Globe className="w-4 h-4 text-sky-500" /> Other Sessions ({otherSessions.length})
              </h3>
              <motion.button
                className="text-xs font-semibold text-red-500 px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/20"
                onClick={() => setShowConfirmRevokeAll(true)}
                whileTap={{ scale: 0.95 }}
              >
                Revoke All
              </motion.button>
            </div>

            <div className="space-y-3">
              <AnimatePresence>
                {otherSessions.map((session, i) => (
                  <motion.div
                    key={session.id}
                    className="flex items-center gap-4 p-3 rounded-xl bg-muted/20"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10, height: 0 }}
                    transition={{ delay: 0.15 + i * 0.05 }}
                  >
                    <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-900/20 flex items-center justify-center flex-shrink-0">
                      <session.icon className="w-5 h-5 text-sky-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground">{session.browser}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-3 h-3" /> {session.location}
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {session.lastActive}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">IP: {session.ip}</p>
                    </div>
                    <motion.button
                      className="text-xs font-semibold text-red-500 px-2.5 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 flex items-center gap-1 flex-shrink-0"
                      onClick={() => handleRevoke(session.id)}
                      whileTap={{ scale: 0.95 }}
                      disabled={revokingId === session.id}
                    >
                      {revokingId === session.id ? (
                        <motion.div className="w-3 h-3 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <LogOut className="w-3 h-3" />
                      )}
                      {revokingId === session.id ? 'Revoking...' : 'Revoke'}
                    </motion.button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </GlassCard>
        </motion.div>
      )}

      {/* No other sessions */}
      {otherSessions.length === 0 && !revokedAll && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <GlassCard className="p-8 text-center">
            <Shield className="w-12 h-12 text-sky-500 mx-auto mb-3" />
            <h3 className="text-base font-bold text-foreground mb-1">Only This Device</h3>
            <p className="text-xs text-muted-foreground">You are only logged in on this device. No other active sessions found.</p>
          </GlassCard>
        </motion.div>
      )}

      {/* Revoke All Confirmation Modal */}
      <AnimatePresence>
        {showConfirmRevokeAll && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowConfirmRevokeAll(false)}
          >
            <motion.div
              className="w-full max-w-sm mx-4 bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-2xl"
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-7 h-7 text-red-500" />
              </div>
              <h3 className="text-lg font-extrabold text-foreground text-center mb-2">Revoke All Sessions?</h3>
              <p className="text-sm text-muted-foreground text-center mb-6">
                This will log you out of all other devices. You will need to log in again on those devices.
              </p>
              <div className="flex gap-3">
                <motion.button
                  className="flex-1 px-4 py-2.5 rounded-xl bg-muted/30 text-sm font-semibold text-foreground"
                  onClick={() => setShowConfirmRevokeAll(false)}
                  whileTap={{ scale: 0.95 }}
                >
                  Cancel
                </motion.button>
                <GradientButton variant="danger" onClick={handleRevokeAll} className="flex-1">
                  <Trash2 className="w-4 h-4" /> Revoke All
                </GradientButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Security Tips */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <div className="p-3 rounded-xl bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800 flex items-start gap-2">
          <Shield className="w-4 h-4 text-sky-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-sky-700 dark:text-sky-300 leading-relaxed">
            If you notice any unfamiliar sessions, revoke them immediately and change your password. Enable two-factor authentication for extra security.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
