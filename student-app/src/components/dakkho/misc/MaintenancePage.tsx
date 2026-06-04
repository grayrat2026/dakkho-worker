'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Wrench, ChevronLeft, Clock, RefreshCw, Bell,
  CheckCircle, AlertTriangle, Mail, Shield, Zap,
} from 'lucide-react';
import { useNavigationStore } from '@/lib/store';
import { GlassCard } from '../shared/GlassCard';
import { GradientButton } from '../shared/GradientButton';

export function MaintenancePage() {
  const { goBack } = useNavigationStore();

  const [timeLeft, setTimeLeft] = useState({ hours: 2, minutes: 34, seconds: 56 });
  const [email, setEmail] = useState('');
  const [notified, setNotified] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        let { hours, minutes, seconds } = prev;
        seconds -= 1;
        if (seconds < 0) {
          seconds = 59;
          minutes -= 1;
        }
        if (minutes < 0) {
          minutes = 59;
          hours -= 1;
        }
        if (hours < 0) return { hours: 0, minutes: 0, seconds: 0 };
        return { hours, minutes, seconds };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleNotify = () => {
    if (email.trim() && /\S+@\S+\.\S+/.test(email)) {
      setNotified(true);
    }
  };

  const maintenanceTasks = [
    { task: 'Database migration', status: 'completed', icon: CheckCircle },
    { task: 'Server infrastructure upgrade', status: 'completed', icon: CheckCircle },
    { task: 'Video CDN optimization', status: 'in-progress', icon: RefreshCw },
    { task: 'Security patches deployment', status: 'pending', icon: Clock },
    { task: 'Performance testing', status: 'pending', icon: Clock },
  ];

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'completed': return 'text-emerald-500';
      case 'in-progress': return 'text-amber-500 animate-spin';
      default: return 'text-muted-foreground';
    }
  };

  const pad = (n: number) => n.toString().padStart(2, '0');

  return (
    <div className="pb-20 lg:pb-0">
      {/* Header */}
      <motion.div className="flex items-center gap-3 mb-6" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <motion.button className="w-9 h-9 rounded-xl bg-muted/30 flex items-center justify-center text-foreground" onClick={goBack} whileTap={{ scale: 0.9 }}>
          <ChevronLeft className="w-5 h-5" />
        </motion.button>
        <div>
          <h1 className="text-xl font-extrabold text-foreground">Scheduled Maintenance</h1>
          <p className="text-xs text-muted-foreground">We will be back soon</p>
        </div>
      </motion.div>

      {/* Main Status */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <GlassCard className="p-6 text-center mb-6">
          <motion.div
            className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center mx-auto mb-4 shadow-lg"
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
          >
            <Wrench className="w-10 h-10 text-white" />
          </motion.div>
          <h2 className="text-xl font-extrabold text-foreground mb-2">Under Maintenance</h2>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6">
            We are performing scheduled maintenance to improve your DAKKHO experience. Some features may be temporarily unavailable.
          </p>

          {/* Countdown */}
          <div className="flex items-center justify-center gap-3 mb-6">
            {[
              { value: timeLeft.hours, label: 'Hours' },
              { value: timeLeft.minutes, label: 'Minutes' },
              { value: timeLeft.seconds, label: 'Seconds' },
            ].map((unit, i) => (
              <motion.div
                key={unit.label}
                className="text-center"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 + i * 0.1 }}
              >
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center shadow-md mb-1">
                  <span className="text-xl font-extrabold text-white">{pad(unit.value)}</span>
                </div>
                <span className="text-xs text-muted-foreground font-semibold">{unit.label}</span>
              </motion.div>
            ))}
          </div>

          <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
            <Clock className="w-3 h-3" /> Estimated completion: 2:34 AM BST
          </p>
        </GlassCard>
      </motion.div>

      {/* Progress */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <GlassCard className="p-5 mb-4">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-4">
            <RefreshCw className="w-4 h-4 text-sky-500" /> Maintenance Progress
          </h3>
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-foreground">Overall Progress</span>
              <span className="text-xs font-bold text-sky-500">40%</span>
            </div>
            <div className="h-2.5 rounded-full bg-muted/30 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-sky-400 to-blue-600"
                initial={{ width: 0 }}
                animate={{ width: '40%' }}
                transition={{ duration: 1, delay: 0.3 }}
              />
            </div>
          </div>
          <div className="space-y-3">
            {maintenanceTasks.map((task, i) => (
              <motion.div
                key={task.task}
                className="flex items-center gap-3"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + i * 0.05 }}
              >
                <task.icon className={`w-4 h-4 flex-shrink-0 ${getStatusStyle(task.status)}`} />
                <span className="text-xs text-foreground flex-1">{task.task}</span>
                <span className={`text-[10px] font-bold ${
                  task.status === 'completed' ? 'text-emerald-500' :
                  task.status === 'in-progress' ? 'text-amber-500' : 'text-muted-foreground'
                }`}>
                  {task.status === 'completed' ? 'Done' : task.status === 'in-progress' ? 'In Progress' : 'Pending'}
                </span>
              </motion.div>
            ))}
          </div>
        </GlassCard>
      </motion.div>

      {/* What's Being Updated */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <GlassCard className="p-5 mb-4">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-4">
            <Zap className="w-4 h-4 text-sky-500" /> What We Are Improving
          </h3>
          <div className="space-y-2">
            {[
              { title: 'Faster Video Streaming', desc: 'Upgrading CDN infrastructure for 2x faster video loading', icon: Zap, color: 'text-sky-500 bg-sky-50 dark:bg-sky-900/20' },
              { title: 'Enhanced Security', desc: 'Deploying latest security patches and encryption updates', icon: Shield, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' },
              { title: 'Database Optimization', desc: 'Migrating to improved database structure for better performance', icon: RefreshCw, color: 'text-violet-500 bg-violet-50 dark:bg-violet-900/20' },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                className="flex items-start gap-3 p-3 rounded-xl bg-muted/20"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.05 }}
              >
                <div className={`w-8 h-8 rounded-lg ${item.color} flex items-center justify-center flex-shrink-0`}>
                  <item.icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </GlassCard>
      </motion.div>

      {/* Get Notified */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <GlassCard className="p-5">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-3">
            <Bell className="w-4 h-4 text-sky-500" /> Get Notified When We Are Back
          </h3>
          {notified ? (
            <motion.div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center gap-2" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              <p className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold">You will be notified when DAKKHO is back online!</p>
            </motion.div>
          ) : (
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-muted/30 border border-white/30 dark:border-white/10 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                  placeholder="Enter your email"
                />
              </div>
              <GradientButton onClick={handleNotify} size="sm">
                <Bell className="w-4 h-4" /> Notify
              </GradientButton>
            </div>
          )}
        </GlassCard>
      </motion.div>
    </div>
  );
}
