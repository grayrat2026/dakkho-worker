'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Search, GraduationCap, Trash2, X, ChevronRight, Eye, Video, CheckCircle2, Circle, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { apiGet, apiDelete, ApiError } from '@/lib/api-client';
import type { Enrollment, Course, WatchProgress } from '@/lib/types';

interface EnrollmentWithDetails extends Enrollment {
  userName?: string;
  userEmail?: string;
  courseTitle?: string;
}

export default function EnrollmentsPanel() {
  const [enrollments, setEnrollments] = useState<EnrollmentWithDetails[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedEnrollment, setSelectedEnrollment] = useState<EnrollmentWithDetails | null>(null);
  const [videoProgress, setVideoProgress] = useState<WatchProgress[]>([]);
  const [progressLoading, setProgressLoading] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const { toast } = useToast();

  const fetchEnrollments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet('/enrollments?page=1&limit=100') as any;
      setEnrollments(data.enrollments || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load enrollments');
      toast({ title: 'Error loading enrollments', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchCourses = useCallback(async () => {
    try {
      const data = await apiGet('/courses?page=1&limit=500') as any;
      setCourses(data.documents || []);
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    fetchEnrollments();
    fetchCourses();
  }, [fetchEnrollments, fetchCourses]);

  const getCourseTitle = (courseId: string) => {
    const course = courses.find((c) => c.id === courseId);
    return course?.title || courseId;
  };

  // Enrich enrollment data with course titles
  const enriched = enrollments.map((enr) => ({
    ...enr,
    courseTitle: enr.courseTitle || getCourseTitle(enr.courseId),
  }));

  const filtered = enriched.filter((enr) => {
    // Status filter
    if (statusFilter === 'active' && enr.completed) return false;
    if (statusFilter === 'completed' && !enr.completed) return false;
    // Search filter
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (enr.userName || '').toLowerCase().includes(q) ||
      (enr.userEmail || '').toLowerCase().includes(q) ||
      (enr.courseTitle || '').toLowerCase().includes(q) ||
      enr.userId.toLowerCase().includes(q)
    );
  });

  const openDetail = async (enr: EnrollmentWithDetails) => {
    setSelectedEnrollment(enr);
    setDetailOpen(true);
    setProgressLoading(true);
    try {
      const data = await apiGet(`/enrollments/${enr.id}/progress`) as any;
      setVideoProgress(data.progress || data.videos || []);
    } catch {
      setVideoProgress([]);
    } finally {
      setProgressLoading(false);
    }
  };

  const handleRemove = async (id: string) => {
    if (!confirm('Remove this enrollment? The student will lose access to the course.')) return;
    try {
      await apiDelete(`/enrollments/${id}`);
      toast({ title: 'Enrollment removed' });
      fetchEnrollments();
    } catch {
      toast({ title: 'Error removing enrollment', variant: 'destructive' });
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'bg-emerald-500';
    if (progress >= 40) return 'bg-dakkho-blue';
    if (progress > 0) return 'bg-amber-500';
    return 'bg-white/10';
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {/* Page Header */}
      <Card className="glass-card border-0">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Button variant="outline" size="icon" onClick={fetchEnrollments} className="border-white/10">
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-dakkho-blue" />
                Enrollments
                <span className="text-sm font-normal text-muted-foreground">({total})</span>
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search students, courses..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 bg-white/[0.04] border-white/[0.08] w-56"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                    <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                  </button>
                )}
              </div>
              {/* Status Filter */}
              <div className="flex gap-1">
                {(['all', 'active', 'completed'] as const).map((s) => (
                  <Button
                    key={s}
                    variant={statusFilter === s ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setStatusFilter(s)}
                    className={statusFilter === s ? 'gradient-primary text-white' : 'border-white/10 capitalize'}
                  >
                    {s}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error State */}
      {error && (
        <Card className="glass-card border-0">
          <CardContent className="p-6 text-center">
            <p className="text-destructive mb-3">{error}</p>
            <Button variant="outline" onClick={fetchEnrollments} className="border-white/10">
              <RefreshCw className="h-4 w-4 mr-2" /> Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Data Table */}
      {!error && (
        <Card className="glass-card border-0">
          <CardContent className="p-0">
            <div className="hidden md:block overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Course</th>
                    <th>Progress</th>
                    <th>Status</th>
                    <th>Enrolled Date</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 6 }).map((_, j) => (
                          <td key={j}><div className="h-5 rounded bg-white/5 animate-shimmer" /></td>
                        ))}
                      </tr>
                    ))
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-muted-foreground">
                        <GraduationCap className="h-10 w-10 mx-auto mb-3 opacity-30" />
                        <p>No enrollments found</p>
                        {search && <p className="text-xs mt-1">Try adjusting your search or filters</p>}
                      </td>
                    </tr>
                  ) : (
                    filtered.map((enr) => (
                      <tr
                        key={enr.id}
                        className="cursor-pointer"
                        onClick={() => openDetail(enr)}
                      >
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center">
                              <User className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">{enr.userName || enr.userId}</p>
                              {enr.userEmail && (
                                <p className="text-xs text-muted-foreground">{enr.userEmail}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="max-w-[200px] truncate text-sm">{enr.courseTitle}</td>
                        <td>
                          <div className="flex items-center gap-2 min-w-[120px]">
                            <Progress value={enr.progress} className="h-2 flex-1" />
                            <span className="text-xs text-muted-foreground w-8 text-right">{enr.progress}%</span>
                          </div>
                        </td>
                        <td>
                          <span className={`status-badge ${enr.completed ? 'status-badge-active' : 'status-badge-pending'}`}>
                            {enr.completed ? 'Completed' : 'Active'}
                          </span>
                        </td>
                        <td className="text-sm text-muted-foreground">
                          {new Date(enr.createdAt).toLocaleDateString()}
                        </td>
                        <td className="text-right">
                          <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDetail(enr)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleRemove(enr.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile View */}
            <div className="md:hidden p-4 space-y-3">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-24 rounded-lg bg-white/5 animate-shimmer" />
                ))
              ) : filtered.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <GraduationCap className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p>No enrollments found</p>
                </div>
              ) : (
                filtered.map((enr) => (
                  <motion.div
                    key={enr.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => openDetail(enr)}
                    className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06] cursor-pointer hover:bg-white/[0.05] transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-white/[0.06] flex items-center justify-center shrink-0">
                            <User className="h-3 w-3 text-muted-foreground" />
                          </div>
                          <p className="text-sm font-medium truncate">{enr.userName || enr.userId}</p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 truncate">{enr.courseTitle}</p>
                      </div>
                      <span className={`status-badge text-[10px] ${enr.completed ? 'status-badge-active' : 'status-badge-pending'}`}>
                        {enr.completed ? 'Done' : 'Active'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${getProgressColor(enr.progress)}`}
                          style={{ width: `${enr.progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">{enr.progress}%</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enrollment Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="bg-[#141428] border-white/[0.08] max-w-lg">
          <DialogHeader>
            <DialogTitle>Enrollment Details</DialogTitle>
          </DialogHeader>
          {selectedEnrollment && (
            <div className="space-y-4 mt-4">
              {/* Student Info */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center">
                  <User className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="font-medium">{selectedEnrollment.userName || selectedEnrollment.userId}</p>
                  {selectedEnrollment.userEmail && (
                    <p className="text-xs text-muted-foreground">{selectedEnrollment.userEmail}</p>
                  )}
                </div>
              </div>

              {/* Course & Progress */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Course</p>
                  <span className={`status-badge text-xs ${selectedEnrollment.completed ? 'status-badge-active' : 'status-badge-pending'}`}>
                    {selectedEnrollment.completed ? 'Completed' : 'Active'}
                  </span>
                </div>
                <p className="font-medium text-sm">{selectedEnrollment.courseTitle}</p>
                <div className="flex items-center gap-2">
                  <Progress value={selectedEnrollment.progress} className="h-2.5 flex-1" />
                  <span className="text-sm font-semibold">{selectedEnrollment.progress}%</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Enrolled: {new Date(selectedEnrollment.createdAt).toLocaleDateString()}
                </p>
              </div>

              {/* Video Progress List */}
              <div className="space-y-2">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Video className="h-4 w-4 text-dakkho-blue" />
                  Video Progress
                </p>
                <div className="max-h-64 overflow-y-auto space-y-1 rounded-lg bg-white/[0.02] border border-white/[0.04] p-2">
                  {progressLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="h-8 rounded bg-white/5 animate-shimmer" />
                    ))
                  ) : videoProgress.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      No video progress available
                    </p>
                  ) : (
                    videoProgress.map((vp) => (
                      <div
                        key={vp.id}
                        className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white/[0.03] transition-colors"
                      >
                        {vp.completed ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                        ) : (
                          <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                        <span className="text-sm truncate flex-1">{vp.videoId}</span>
                        <span className="text-xs text-muted-foreground">{vp.progress}%</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Remove Button */}
              <Button
                variant="outline"
                className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10"
                onClick={() => {
                  handleRemove(selectedEnrollment.id);
                  setDetailOpen(false);
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" /> Remove Enrollment
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
