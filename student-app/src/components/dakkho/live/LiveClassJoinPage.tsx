'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Radio, Loader2, AlertCircle, Lock, BookOpen, ArrowRight,
  CheckCircle, Play, Video, Users, Clock, ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { useNavigationStore, useAuthStore } from '@/lib/store';
import { liveClassApi, enrollmentApi } from '@/lib/api-client';
import { StudentLiveClassRoom } from './StudentLiveClassRoom';
import { LIVEKIT_URL } from '@/lib/constants';
import { GlassCard } from '../shared/GlassCard';
import { GradientButton } from '../shared/GradientButton';

interface LiveClassInfo {
  id: number;
  title: string;
  title_bn?: string;
  description?: string;
  course_id?: string;
  instructor_id?: string;
  scheduled_at: string;
  duration_minutes: number;
  meeting_url?: string;
  platform: string;
  status: string;
  recording_url?: string;
}

type JoinState = 'loading' | 'not-enrolled' | 'joining' | 'live' | 'error' | 'not-found' | 'ended';

export function LiveClassJoinPage() {
  const params = useNavigationStore((s) => s.pageParams);
  const navigate = useNavigationStore((s) => s.navigate);
  const { user, isAuthenticated } = useAuthStore();

  const liveClassId = params.liveClassId || '';
  const [state, setState] = useState<JoinState>('loading');
  const [liveClass, setLiveClass] = useState<LiveClassInfo | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [livekitToken, setLivekitToken] = useState<string | null>(null);
  const [livekitUrl, setLivekitUrl] = useState(LIVEKIT_URL);
  const [roomName, setRoomName] = useState('');

  // Fetch live class info and check enrollment
  useEffect(() => {
    if (!liveClassId) {
      setState('not-found');
      return;
    }

    async function checkAndLoad() {
      try {
        // 1. Fetch all live classes and find the one matching the ID
        const { liveClasses } = await liveClassApi.list();
        const cls = (liveClasses as LiveClassInfo[]).find(
          (l) => String(l.id) === String(liveClassId)
        );

        if (!cls) {
          setState('not-found');
          return;
        }

        setLiveClass(cls);

        // 2. Check if class has ended
        if (cls.status === 'completed' || cls.status === 'cancelled') {
          setState('ended');
          return;
        }

        // 3. If no course_id (standalone class), anyone can join
        if (!cls.course_id) {
          await joinLiveClass(cls);
          return;
        }

        // 4. Check enrollment for course-based class
        try {
          const enrollCheck = await enrollmentApi.checkEnrollment(cls.course_id);
          if (enrollCheck.enrolled) {
            await joinLiveClass(cls);
          } else {
            setState('not-enrolled');
          }
        } catch {
          // If enrollment check fails, try to join anyway (API will enforce)
          await joinLiveClass(cls);
        }
      } catch (err: any) {
        console.error('Failed to load live class:', err);
        setState('error');
        setErrorMessage(err.message || 'Failed to load live class');
      }
    }

    checkAndLoad();
  }, [liveClassId]);

  // Join the live class by getting a LiveKit token
  const joinLiveClass = useCallback(async (cls: LiveClassInfo) => {
    setState('joining');
    try {
      const result = await liveClassApi.getLiveKitToken(cls.id);
      if (result.token) {
        setLivekitToken(result.token);
        setLivekitUrl(result.url || LIVEKIT_URL);
        setRoomName(result.room || '');
        setState('live');
      } else {
        setState('error');
        setErrorMessage('Failed to get access token for the live class.');
      }
    } catch (err: any) {
      const msg = err.message || 'Failed to join live class';
      // If error is 403 (not enrolled), show enrollment prompt
      if (msg.includes('enrolled') || msg.includes('403')) {
        setState('not-enrolled');
      } else {
        setState('error');
        setErrorMessage(msg);
      }
    }
  }, []);

  // Navigate to course enrollment page
  const goToEnrollPage = useCallback(() => {
    if (liveClass?.course_id) {
      navigate('course-detail', { courseId: liveClass.course_id });
    }
  }, [liveClass, navigate]);

  // Navigate to login page
  const goToLogin = useCallback(() => {
    navigate('login');
  }, [navigate]);

  // ─── Render States ───

  // Loading
  if (state === 'loading' || state === 'joining') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <Loader2 className="w-10 h-10 text-foreground" />
        </motion.div>
        <p className="text-muted-foreground text-sm">
          {state === 'joining' ? 'Joining live class...' : 'Loading live class...'}
        </p>
      </div>
    );
  }

  // Not found
  if (state === 'not-found') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4 px-4">
        <GlassCard className="p-8 text-center max-w-md">
          <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-bold mb-2">Live Class Not Found</h3>
          <p className="text-muted-foreground mb-4">
            This live class doesn&apos;t exist or has been removed.
          </p>
          <GradientButton onClick={() => navigate('live-sessions')}>
            Browse Live Classes
          </GradientButton>
        </GlassCard>
      </div>
    );
  }

  // Class ended
  if (state === 'ended') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4 px-4">
        <GlassCard className="p-8 text-center max-w-md">
          <Clock className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-bold mb-2">Class Has Ended</h3>
          <p className="text-muted-foreground mb-2">
            &ldquo;{liveClass?.title_bn || liveClass?.title}&rdquo; is no longer active.
          </p>
          {liveClass?.recording_url && (
            <a
              href={liveClass.recording_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-blue-500 hover:underline mt-2"
            >
              <Video className="w-4 h-4" /> Watch Recording
            </a>
          )}
          <div className="mt-4">
            <GradientButton onClick={() => navigate('live-sessions')}>
              Browse Live Classes
            </GradientButton>
          </div>
        </GlassCard>
      </div>
    );
  }

  // Not enrolled — show enrollment prompt
  if (state === 'not-enrolled') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <GlassCard className="p-8 text-center max-w-md" glow>
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold mb-2">Enrollment Required</h3>
            <p className="text-muted-foreground mb-1">
              You need to enroll in this course to join the live class.
            </p>
            <p className="text-sm font-semibold text-foreground mb-4">
              &ldquo;{liveClass?.title_bn || liveClass?.title}&rdquo;
            </p>

            {liveClass?.scheduled_at && (
              <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground mb-6">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {new Date(liveClass.scheduled_at).toLocaleString('en-US', {
                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                  })}
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  {liveClass.duration_minutes} min
                </span>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <GradientButton
                onClick={goToEnrollPage}
                icon={<BookOpen className="w-4 h-4" />}
                className="w-full"
              >
                Go to Course & Enroll
              </GradientButton>
              <button
                onClick={() => navigate('live-sessions')}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Browse other live classes
              </button>
            </div>
          </GlassCard>
        </motion.div>
      </div>
    );
  }

  // Error
  if (state === 'error') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4 px-4">
        <GlassCard className="p-8 text-center max-w-md">
          <AlertCircle className="w-12 h-12 mx-auto text-red-500 mb-4" />
          <h3 className="text-lg font-bold mb-2">Connection Failed</h3>
          <p className="text-muted-foreground mb-4">{errorMessage}</p>
          <div className="flex gap-2 justify-center">
            <GradientButton onClick={() => window.location.reload()}>
              Retry
            </GradientButton>
            <GradientButton onClick={() => navigate('live-sessions')}>
              Browse Classes
            </GradientButton>
          </div>
        </GlassCard>
      </div>
    );
  }

  // Live — show the actual LiveKit room
  if (state === 'live' && livekitToken) {
    return (
      <StudentLiveClassRoom
        roomName={roomName || `dakkho-class-${liveClassId}`}
        livekitToken={livekitToken}
        livekitUrl={livekitUrl}
        courseName={liveClass?.title_bn || liveClass?.title || 'Live Class'}
        onLeave={() => navigate('live-sessions')}
      />
    );
  }

  // Fallback
  return null;
}
