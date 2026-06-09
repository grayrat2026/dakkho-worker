'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import {
  Users,
  BookOpen,
  Video,
  GraduationCap,
  DollarSign,
  Clock,
  Package,
  UserPlus,
  Star,
  Shield,
  Trash2,
  Settings,
  Send,
  FileText,
  Eye,
  Plus,
  Edit,
  Activity,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Bell,
  Cog,
  CheckCircle,
  AlertCircle,
  BarChart3,
  ArrowUpRight,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { DashboardStats } from '@/lib/types';
import { apiGet } from '@/lib/api-client';

// ============================================================
// Animation Variants
// ============================================================
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

const cardHoverVariants = {
  rest: { scale: 1 },
  hover: { scale: 1.02, transition: { duration: 0.2 } },
};

// ============================================================
// Action Icon / Color Maps for Timeline
// ============================================================
const actionIcons: Record<string, React.ElementType> = {
  LOGIN: Shield,
  CREATE_COURSE: Plus,
  UPDATE_COURSE: Edit,
  DELETE_COURSE: Trash2,
  CREATE_VIDEO: Plus,
  DELETE_VIDEO: Trash2,
  SEND_TEST_EMAIL: Send,
  SEND_CUSTOM_EMAIL: Send,
  UPLOAD_FILE: FileText,
  UPDATE_CONFIG: Settings,
  VIEW_RESOURCE: Eye,
};

const actionColors: Record<string, string> = {
  LOGIN: 'text-blue-400 bg-blue-500/10',
  CREATE_COURSE: 'text-green-400 bg-green-500/10',
  UPDATE_COURSE: 'text-amber-400 bg-amber-500/10',
  DELETE_COURSE: 'text-red-400 bg-red-500/10',
  CREATE_VIDEO: 'text-green-400 bg-green-500/10',
  DELETE_VIDEO: 'text-red-400 bg-red-500/10',
  SEND_TEST_EMAIL: 'text-purple-400 bg-purple-500/10',
  SEND_CUSTOM_EMAIL: 'text-purple-400 bg-purple-500/10',
  UPLOAD_FILE: 'text-cyan-400 bg-cyan-500/10',
  UPDATE_CONFIG: 'text-amber-400 bg-amber-500/10',
  VIEW_RESOURCE: 'text-blue-400 bg-blue-500/10',
};

// ============================================================
// Stat Card Definitions
// ============================================================
interface StatCardDef {
  title: string;
  key: keyof DashboardStats;
  icon: React.ElementType;
  gradientClass: string;
  iconBg: string;
  iconColor: string;
  trend: number;
  format?: 'number' | 'currency';
  prefix?: string;
}

const statCardDefs: StatCardDef[] = [
  { title: 'Total Users', key: 'totalUsers', icon: Users, gradientClass: 'gradient-stat-blue', iconBg: 'bg-blue-500/15', iconColor: 'text-blue-400', trend: 0 },
  { title: 'Total Courses', key: 'totalCourses', icon: BookOpen, gradientClass: 'gradient-stat-emerald', iconBg: 'bg-emerald-500/15', iconColor: 'text-emerald-400', trend: 0 },
  { title: 'Total Videos', key: 'totalVideos', icon: Video, gradientClass: 'gradient-stat-purple', iconBg: 'bg-purple-500/15', iconColor: 'text-purple-400', trend: 0 },
  { title: 'Enrollments', key: 'totalEnrollments', icon: GraduationCap, gradientClass: 'gradient-stat-amber', iconBg: 'bg-amber-500/15', iconColor: 'text-amber-400', trend: 0 },
  { title: 'Revenue', key: 'totalRevenue', icon: DollarSign, gradientClass: 'gradient-stat-teal', iconBg: 'bg-teal-500/15', iconColor: 'text-teal-400', trend: 0, format: 'currency', prefix: '৳' },
  { title: 'Pending Payments', key: 'pendingPayments', icon: Clock, gradientClass: 'gradient-stat-rose', iconBg: 'bg-rose-500/15', iconColor: 'text-rose-400', trend: 0 },
  { title: 'Active Packages', key: 'activePackages', icon: Package, gradientClass: 'gradient-stat-cyan', iconBg: 'bg-cyan-500/15', iconColor: 'text-cyan-400', trend: 0 },
  { title: 'New Today', key: 'newSignupsToday', icon: UserPlus, gradientClass: 'gradient-stat-orange', iconBg: 'bg-orange-500/15', iconColor: 'text-orange-400', trend: 0 },
];

// ============================================================
// Quick Actions
// ============================================================
const quickActions = [
  { label: 'Add Course', icon: Plus, href: '/courses', gradient: 'from-blue-500 to-cyan-400' },
  { label: 'Send Notification', icon: Bell, href: '/notifications', gradient: 'from-purple-500 to-pink-400' },
  { label: 'View Payments', icon: CreditCard, href: '/payments', gradient: 'from-teal-500 to-emerald-400' },
  { label: 'Manage Config', icon: Cog, href: '/config', gradient: 'from-amber-500 to-orange-400' },
] as const;

// Chart data will be fetched from API; initialized as empty

// ============================================================
// Animated Counter Hook
// ============================================================
function useAnimatedCounter(target: number, duration = 1200, enabled = true) {
  const [count, setCount] = useState(0);
  const prevTarget = useRef(0);
  const rafIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const start = prevTarget.current;
    const diff = target - start;
    if (diff === 0) return; // already at target
    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const nextVal = Math.round(start + diff * eased);
      setCount(nextVal);
      if (progress < 1) {
        rafIdRef.current = requestAnimationFrame(step);
      } else {
        prevTarget.current = target;
        rafIdRef.current = null;
      }
    };
    rafIdRef.current = requestAnimationFrame(step);
    return () => {
      if (rafIdRef.current !== null) cancelAnimationFrame(rafIdRef.current);
    };
  }, [target, duration, enabled]);

  return count;
}

// ============================================================
// Stat Card Sub-Component
// ============================================================
function StatCard({ def, value, loading }: { def: StatCardDef; value: number; loading: boolean }) {
  const Icon = def.icon;
  const animatedValue = useAnimatedCounter(value, 1000, !loading);
  const isPositive = def.trend >= 0;

  const displayValue = loading
    ? '—'
    : def.format === 'currency'
      ? `${def.prefix || ''}${animatedValue.toLocaleString()}`
      : animatedValue.toLocaleString();

  return (
    <motion.div variants={cardHoverVariants} initial="rest" whileHover="hover">
      <Card className={`glass-card gradient-border rounded-xl border-0 overflow-hidden ${def.gradientClass}`}>
        <CardContent className="p-4 md:p-5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider truncate">
                {def.title}
              </p>
              <p className={`text-2xl md:text-3xl font-bold mt-1.5 ${def.iconColor} tabular-nums`}>
                {displayValue}
              </p>
              <div className="flex items-center gap-1 mt-1.5">
                {isPositive ? (
                  <TrendingUp className="h-3 w-3 text-emerald-400" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-rose-400" />
                )}
                <span className={`text-xs font-medium ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {isPositive ? '+' : ''}{def.trend}%
                </span>
                <span className="text-xs text-muted-foreground ml-0.5">vs last week</span>
              </div>
            </div>
            <div className={`w-10 h-10 md:w-11 md:h-11 rounded-xl ${def.iconBg} flex items-center justify-center flex-shrink-0`}>
              <Icon className={`h-5 w-5 md:h-5.5 md:w-5.5 ${def.iconColor}`} />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ============================================================
// Skeleton Loaders
// ============================================================
function StatCardSkeleton() {
  return (
    <Card className="glass-card gradient-border rounded-xl border-0 overflow-hidden">
      <CardContent className="p-4 md:p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="h-3 w-20 rounded bg-white/5 animate-shimmer" />
            <div className="h-7 w-28 rounded mt-2 bg-white/5 animate-shimmer" />
            <div className="h-3 w-24 rounded mt-2 bg-white/5 animate-shimmer" />
          </div>
          <div className="w-10 h-10 rounded-xl bg-white/5 animate-shimmer" />
        </div>
      </CardContent>
    </Card>
  );
}

function RowSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-12 rounded-lg bg-white/5 animate-shimmer" />
      ))}
    </div>
  );
}

function EmptyState({ icon: Icon, message }: { icon: React.ElementType; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
      <Icon className="h-8 w-8 mb-2 opacity-40" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

// ============================================================
// Main Dashboard Component
// ============================================================
export default function Dashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [popularCourses, setPopularCourses] = useState<Record<string, unknown>[]>([]);
  const [recentEnrollments, setRecentEnrollments] = useState<Record<string, unknown>[]>([]);
  const [recentLogs, setRecentLogs] = useState<Record<string, unknown>[]>([]);
  const [pendingPayments, setPendingPayments] = useState<Record<string, unknown>[]>([]);
  const [chartData, setChartData] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet('/analytics') as Record<string, unknown>;
      setStats(data.stats as DashboardStats);
      setPopularCourses((data.popularCourses as Record<string, unknown>[]) || []);
      setRecentEnrollments((data.recentEnrollments as Record<string, unknown>[]) || []);
      setRecentLogs((data.recentLogs as Record<string, unknown>[]) || []);
      setPendingPayments((data.pendingPayments as Record<string, unknown>[]) || []);
      if (data.chartData) {
        setChartData(data.chartData as Record<string, unknown>[]);
      }
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
      setError('Failed to load dashboard data. Please check your connection and try again.');
      // On error, keep all data as empty/null — do NOT set mock data
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const formatTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 7) return `${diffDays}d ago`;
      return d.toLocaleDateString();
    } catch {
      return dateStr;
    }
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalf = rating - fullStars >= 0.5;
    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />);
      } else if (i === fullStars && hasHalf) {
        stars.push(<Star key={i} className="h-3 w-3 fill-amber-400/50 text-amber-400" />);
      } else {
        stars.push(<Star key={i} className="h-3 w-3 text-white/20" />);
      }
    }
    return stars;
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* ============================================================ 
          Section 1: Enhanced Stat Cards (8 cards)
          ============================================================ */}
      <motion.div variants={itemVariants}>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
          {loading
            ? Array.from({ length: 8 }).map((_, i) => <StatCardSkeleton key={i} />)
            : statCardDefs.map((def) => (
                <StatCard
                  key={def.title}
                  def={def}
                  value={stats?.[def.key] ?? 0}
                  loading={loading}
                />
              ))}
        </div>
      </motion.div>

      {/* ============================================================ 
          Section 2: Quick Actions Row
          ============================================================ */}
      <motion.div variants={itemVariants}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <motion.button
                key={action.label}
                onClick={() => router.push(action.href)}
                className="group relative glass-card gradient-border rounded-xl overflow-hidden p-4 flex items-center gap-3 transition-all duration-300 hover:border-white/10"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {/* Hover gradient overlay */}
                <div className={`absolute inset-0 bg-gradient-to-r ${action.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
                <div className={`w-9 h-9 rounded-lg bg-gradient-to-r ${action.gradient} flex items-center justify-center flex-shrink-0 shadow-lg`}>
                  <Icon className="h-4 w-4 text-white" />
                </div>
                <div className="text-left relative z-10">
                  <p className="text-sm font-medium text-foreground">{action.label}</p>
                  <div className="flex items-center gap-0.5 mt-0.5">
                    <ArrowUpRight className="h-3 w-3 text-muted-foreground group-hover:text-dakkho-teal transition-colors" />
                    <span className="text-xs text-muted-foreground group-hover:text-dakkho-teal transition-colors">Go</span>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      </motion.div>

      {/* ============================================================ 
          Section 3: Two-Column Layout (Popular Courses + Activity Timeline)
          ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Popular Courses */}
        <motion.div variants={itemVariants}>
          <Card className="glass-card gradient-border rounded-xl border-0 overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Star className="h-5 w-5 text-amber-400" />
                Popular Courses
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <RowSkeleton count={5} />
              ) : popularCourses.length === 0 ? (
                <EmptyState icon={BookOpen} message="No course data available" />
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {popularCourses.slice(0, 5).map((course, i) => {
                    const rating = Number(course.rating ?? 0);
                    const students = Number(course.totalStudents ?? 0);
                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] transition-colors"
                      >
                        {/* Thumbnail placeholder */}
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-dakkho-blue/30 to-dakkho-teal/30 flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {(course.thumbnailUrl as string) ? (
                            <img
                              src={course.thumbnailUrl as string}
                              alt={String(course.title || 'Course')}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-sm font-bold text-dakkho-teal">{i + 1}</span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{String(course.title || 'Untitled')}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <div className="flex items-center gap-0.5">
                              {renderStars(rating)}
                            </div>
                            <span className="text-xs text-muted-foreground">{rating.toFixed(1)}</span>
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0 ml-2">
                          <p className="text-sm font-semibold text-dakkho-teal">{students}</p>
                          <p className="text-xs text-muted-foreground">students</p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Activity Timeline */}
        <motion.div variants={itemVariants}>
          <Card className="glass-card gradient-border rounded-xl border-0 overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5 text-dakkho-teal" />
                Activity Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <RowSkeleton count={6} />
              ) : recentLogs.length === 0 ? (
                <EmptyState icon={Activity} message="No activity yet" />
              ) : (
                <div className="space-y-1 max-h-96 overflow-y-auto">
                  {recentLogs.slice(0, 8).map((log, i) => {
                    const action = String(log.action || 'UNKNOWN');
                    const Icon = actionIcons[action] || Activity;
                    const colorClass = actionColors[action] || 'text-gray-400 bg-gray-500/10';
                    const [textColor, bgColor] = colorClass.split(' ');
                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/[0.03] transition-colors"
                      >
                        <div className={`w-8 h-8 rounded-lg ${bgColor} flex items-center justify-center flex-shrink-0`}>
                          <Icon className={`h-4 w-4 ${textColor}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm truncate">
                            <span className="font-medium">{String(log.userEmail || 'System')}</span>
                            <span className="text-muted-foreground"> {action.replace(/_/g, ' ').toLowerCase()}</span>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {log.resourceType && String(log.resourceType)}
                            {log.resourceId && ` \u00B7 ${String(log.resourceId).slice(0, 8)}...`}
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground flex-shrink-0 whitespace-nowrap">
                          {log.createdAt ? formatTime(String(log.createdAt)) : ''}
                        </span>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ============================================================ 
          Section 4: Full-Width Activity Chart
          ============================================================ */}
      <motion.div variants={itemVariants}>
        <Card className="glass-card gradient-border rounded-xl border-0 overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-dakkho-blue" />
                Activity Overview
              </CardTitle>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-dakkho-teal" />
                  <span>Enrollments</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-dakkho-blue" />
                  <span>Revenue</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-64 rounded-lg animate-shimmer bg-white/5" />
            ) : (
              <div className="h-64 md:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradientEnrollments" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00D4AA" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#00D4AA" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradientRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4A90E2" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#4A90E2" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis
                      dataKey="day"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#94A3B8', fontSize: 12 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#94A3B8', fontSize: 12 }}
                    />
                    <Tooltip
                      contentStyle={{
                        background: 'rgba(20, 20, 42, 0.95)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '12px',
                        color: '#F8FAFC',
                        fontSize: '12px',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                      }}
                      labelStyle={{ color: '#94A3B8', marginBottom: 4 }}
                    />
                    <Area
                      type="monotone"
                      dataKey="enrollments"
                      stroke="#00D4AA"
                      strokeWidth={2}
                      fill="url(#gradientEnrollments)"
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#4A90E2"
                      strokeWidth={2}
                      fill="url(#gradientRevenue)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* ============================================================ 
          Section 5: Bottom Row (Recent Enrollments + Pending Payments)
          ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Recent Enrollments */}
        <motion.div variants={itemVariants}>
          <Card className="glass-card gradient-border rounded-xl border-0 overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-dakkho-teal" />
                Recent Enrollments
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <RowSkeleton count={4} />
              ) : recentEnrollments.length === 0 ? (
                <EmptyState icon={GraduationCap} message="No enrollment data available" />
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {recentEnrollments.slice(0, 6).map((enrollment, i) => {
                    const progress = Number(enrollment.progress ?? 0);
                    const userName = String(enrollment.userName ?? `User ${String(enrollment.userId ?? 'Unknown').slice(0, 8)}`);
                    const courseName = String(enrollment.courseName ?? `Course ${String(enrollment.courseId ?? 'N/A').slice(0, 8)}`);
                    const time = enrollment.createdAt
                      ? formatTime(String(enrollment.createdAt))
                      : '';
                    const completed = Boolean(enrollment.completed);

                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="p-3 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] transition-colors"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">{userName}</p>
                            <p className="text-xs text-muted-foreground truncate">{courseName}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                            {completed ? (
                              <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/20 text-xs">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Done
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">{time}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Progress
                            value={progress}
                            className="h-1.5 flex-1 bg-white/5"
                          />
                          <span className="text-xs font-medium text-muted-foreground tabular-nums w-8 text-right">
                            {progress}%
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Pending Payments */}
        <motion.div variants={itemVariants}>
          <Card className="glass-card gradient-border rounded-xl border-0 overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-amber-400" />
                Pending Payments
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <RowSkeleton count={4} />
              ) : pendingPayments.length === 0 ? (
                <EmptyState icon={CheckCircle} message="All payments are up to date" />
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {pendingPayments.slice(0, 6).map((payment, i) => {
                    const amount = Number(payment.amount ?? 0);
                    const gateway = String(payment.gateway ?? 'Unknown');
                    const status = String(payment.status ?? 'pending');
                    const userName = String(payment.userName ?? `User ${String(payment.userId ?? 'Unknown').slice(0, 8)}`);
                    const trxId = String(payment.trxIdSubmitted ?? payment.gatewayTrxId ?? 'N/A');

                    const statusColorMap: Record<string, string> = {
                      pending: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
                      verified: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
                      rejected: 'bg-rose-500/15 text-rose-400 border-rose-500/20',
                      refunded: 'bg-purple-500/15 text-purple-400 border-purple-500/20',
                    };

                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{userName}</p>
                          <p className="text-xs text-muted-foreground font-mono">{trxId.length > 12 ? `${trxId.slice(0, 12)}...` : trxId}</p>
                        </div>
                        <div className="text-right flex-shrink-0 mr-2">
                          <p className="text-sm font-semibold">৳{amount.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground capitalize">{gateway}</p>
                        </div>
                        <Badge className={`${statusColorMap[status] || 'bg-white/5 text-white/40'} text-xs`}>
                          {status}
                        </Badge>
                        {status === 'pending' && (
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="px-2.5 py-1 rounded-lg gradient-primary text-white text-xs font-medium flex items-center gap-1 hover:shadow-lg hover:shadow-dakkho-teal/20 transition-shadow"
                            onClick={() => router.push('/payments')}
                          >
                            <CheckCircle className="h-3 w-3" />
                            Verify
                          </motion.button>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Error Banner */}
      {error && !loading && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm"
        >
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </motion.div>
      )}
    </motion.div>
  );
}
