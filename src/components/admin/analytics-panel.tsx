'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, Users, BookOpen, BarChart as BarChartIcon, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area,
} from 'recharts';
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

// ============================================================
// Theme Colors
// ============================================================
const COLORS = ['#4A90E2', '#00D4AA', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#0EA5E9', '#10B981'];

const EMPTY_ENROLLMENT: { month: string; enrollments: number }[] = [];
const EMPTY_DISTRIBUTION: { name: string; value: number }[] = [];
const EMPTY_GROWTH: { month: string; users: number }[] = [];

// ============================================================
// Types
// ============================================================
interface ChartData {
  enrollmentTrend: { month: string; enrollments: number }[];
  courseDistribution: { name: string; value: number }[];
  userGrowth: { month: string; users: number }[];
}

// ============================================================
// Stat Card Definitions
// ============================================================
const statDefs = [
  { title: 'Total Users', key: 'totalUsers', icon: Users, gradientClass: 'gradient-stat-blue', iconBg: 'bg-blue-500/15', iconColor: 'text-blue-400' },
  { title: 'Total Courses', key: 'totalCourses', icon: BookOpen, gradientClass: 'gradient-stat-emerald', iconBg: 'bg-emerald-500/15', iconColor: 'text-emerald-400' },
  { title: 'Total Videos', key: 'totalVideos', icon: BarChart3, gradientClass: 'gradient-stat-purple', iconBg: 'bg-purple-500/15', iconColor: 'text-purple-400' },
  { title: 'Enrollments', key: 'totalEnrollments', icon: TrendingUp, gradientClass: 'gradient-stat-amber', iconBg: 'bg-amber-500/15', iconColor: 'text-amber-400' },
] as const;

// ============================================================
// Component
// ============================================================
export default function AnalyticsPanel() {
  const [stats, setStats] = useState<Record<string, number>>({});
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
    fetchChartData();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const data = await apiGet('/analytics') as Record<string, unknown>;
      setStats((data.stats as Record<string, number>) || {});
    } catch { console.error('Failed to fetch analytics'); }
  };

  const fetchChartData = async () => {
    try {
      const data = await apiGet('/analytics/charts') as ChartData;
      setChartData(data);
    } catch {
      console.error('Failed to fetch chart data');
    } finally {
      setLoading(false);
    }
  };

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name?: string; color?: string }>; label?: string }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#141428] border border-white/[0.08] rounded-xl p-3 shadow-xl backdrop-blur-sm">
          <p className="text-xs text-muted-foreground mb-1">{label}</p>
          {payload.map((entry, i) => (
            <p key={i} className="text-sm font-medium" style={{ color: entry.color || '#00D4AA' }}>
              {entry.name || 'Value'}: {entry.value.toLocaleString()}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const hasEnrollmentData = chartData && chartData.enrollmentTrend.some(d => d.enrollments > 0);
  const hasDistributionData = chartData && chartData.courseDistribution.some(d => d.value > 0);
  const hasUserGrowthData = chartData && chartData.userGrowth.some(d => d.users > 0);

  const enrollmentData = hasEnrollmentData ? chartData!.enrollmentTrend : EMPTY_ENROLLMENT;
  const distributionData = hasDistributionData ? chartData!.courseDistribution : EMPTY_DISTRIBUTION;
  const growthData = hasUserGrowthData ? chartData!.userGrowth : EMPTY_GROWTH;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Page Header */}
      <motion.div variants={itemVariants} className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <Activity className="h-5 w-5 text-white" />
            </div>
            Analytics
          </h1>
          <p className="page-description">Platform insights, enrollment trends, and user growth</p>
        </div>
      </motion.div>

      {/* Summary Cards with gradient-stat classes */}
      <motion.div variants={itemVariants}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {statDefs.map((item) => {
            const Icon = item.icon;
            const value = stats[item.key] ?? 0;
            return (
              <Card key={item.title} className={`glass-card border-0 rounded-xl overflow-hidden ${item.gradientClass}`}>
                <CardContent className="p-4 md:p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider truncate">
                        {item.title}
                      </p>
                      <p className={`text-xl md:text-2xl font-bold mt-1.5 ${item.iconColor} tabular-nums`}>
                        {loading ? '\u2014' : value.toLocaleString()}
                      </p>
                    </div>
                    <div className={`w-9 h-9 md:w-10 md:h-10 rounded-xl ${item.iconBg} flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`h-4 w-4 md:h-5 md:w-5 ${item.iconColor}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </motion.div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Enrollment Trend */}
        <motion.div variants={itemVariants}>
          <Card className="glass-card border-0 rounded-xl overflow-hidden">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-dakkho-blue" />
                Enrollment Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-[280px] flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-dakkho-blue border-t-transparent rounded-full animate-spin" />
                </div>
              ) : !hasEnrollmentData ? (
                <div className="h-[280px] flex flex-col items-center justify-center text-muted-foreground">
                  <BarChartIcon className="h-12 w-12 mb-3 opacity-20" />
                  <p className="text-sm font-medium">No enrollment data yet</p>
                  <p className="text-xs mt-1">Data will appear as students enroll in courses</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={enrollmentData}>
                    <defs>
                      <linearGradient id="gradEnrollments" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4A90E2" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#4A90E2" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="month" stroke="#94A3B8" fontSize={12} axisLine={false} tickLine={false} />
                    <YAxis stroke="#94A3B8" fontSize={12} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="enrollments"
                      stroke="#4A90E2"
                      strokeWidth={2}
                      fill="url(#gradEnrollments)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Course Distribution */}
        <motion.div variants={itemVariants}>
          <Card className="glass-card border-0 rounded-xl overflow-hidden">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-dakkho-teal" />
                Course Level Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-[280px] flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-dakkho-teal border-t-transparent rounded-full animate-spin" />
                </div>
              ) : !hasDistributionData ? (
                <div className="h-[280px] flex flex-col items-center justify-center text-muted-foreground">
                  <BarChartIcon className="h-12 w-12 mb-3 opacity-20" />
                  <p className="text-sm font-medium">No course distribution data</p>
                  <p className="text-xs mt-1">Data will appear when courses are created</p>
                </div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={distributionData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                      >
                        {distributionData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          background: 'rgba(20, 20, 42, 0.95)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: '12px',
                          color: '#F8FAFC',
                          fontSize: '12px',
                          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap justify-center gap-3 mt-2">
                    {distributionData.map((item, i) => (
                      <div key={item.name} className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                        <span className="text-xs text-muted-foreground">{item.name} ({item.value})</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* User Growth */}
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <Card className="glass-card border-0 rounded-xl overflow-hidden">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-emerald-400" />
                User Growth
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-[300px] flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-dakkho-blue border-t-transparent rounded-full animate-spin" />
                </div>
              ) : !hasUserGrowthData ? (
                <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground">
                  <TrendingUp className="h-12 w-12 mb-3 opacity-20" />
                  <p className="text-sm font-medium">No user growth data yet</p>
                  <p className="text-xs mt-1">Data will appear as users register on the platform</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={growthData}>
                    <defs>
                      <linearGradient id="gradUserGrowth" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00D4AA" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#00D4AA" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="month" stroke="#94A3B8" fontSize={12} axisLine={false} tickLine={false} />
                    <YAxis stroke="#94A3B8" fontSize={12} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="users"
                      stroke="#00D4AA"
                      strokeWidth={2.5}
                      fill="url(#gradUserGrowth)"
                      dot={{ r: 4, fill: '#00D4AA', stroke: '#141428', strokeWidth: 2 }}
                      activeDot={{ r: 6, fill: '#00D4AA', stroke: '#141428', strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
