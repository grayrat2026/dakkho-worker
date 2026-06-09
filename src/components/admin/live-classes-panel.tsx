'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RefreshCw,
  Plus,
  Video,
  Trash2,
  Search,
  AlertTriangle,
  Inbox,
  ExternalLink,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { apiGet, apiPost, apiDelete, ApiError } from '@/lib/api-client';

interface LiveClass {
  id: number;
  courseId: string | null;
  title: string;
  titleBn: string | null;
  description: string | null;
  scheduledAt: string;
  durationMinutes: number;
  meetingUrl: string | null;
  platform: string;
  status: string;
  isActive: number;
  createdAt: string;
}

interface Course {
  id: string;
  title: string;
}

const platformBadgeStyles: Record<string, string> = {
  jitsi: 'bg-blue-500/15 text-blue-400 border border-blue-500/20',
  zoom: 'bg-purple-500/15 text-purple-400 border border-purple-500/20',
  meet: 'bg-green-500/15 text-green-400 border border-green-500/20',
  custom: 'bg-gray-500/15 text-gray-400 border border-gray-500/20',
};

const statusBadgeStyles: Record<string, string> = {
  scheduled: 'status-badge status-badge-pending',
  live: 'status-badge status-badge-active',
  completed: 'status-badge status-badge-verified',
  cancelled: 'status-badge status-badge-inactive',
};

export default function LiveClassesPanel() {
  const [classes, setClasses] = useState<LiveClass[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [courses, setCourses] = useState<Course[]>([]);
  const { toast } = useToast();
  const [form, setForm] = useState({
    title: '',
    title_bn: '',
    description: '',
    scheduled_at: '',
    duration_minutes: '60',
    meeting_url: '',
    platform: 'jitsi',
    course_id: '',
  });

  const fetchClasses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = (await apiGet('/live-classes?page=1&limit=100')) as any;
      setClasses(data.liveClasses || []);
      setTotal(data.total || 0);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch live classes';
      setError(message);
      toast({ title: 'Error', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchCourses = useCallback(async () => {
    try {
      const data = (await apiGet('/courses?page=1&limit=200')) as any;
      const docs = data.courses || data.documents || [];
      setCourses(
        docs.map((d: any) => ({
          id: String(d.id || ''),
          title: String(d.title || 'Untitled'),
        }))
      );
    } catch {
      // silent — dropdown can be empty
    }
  }, []);

  useEffect(() => {
    fetchClasses();
    fetchCourses();
  }, [fetchClasses, fetchCourses]);

  const handleCreate = async () => {
    try {
      await apiPost('/live-classes', {
        ...form,
        duration_minutes: parseInt(form.duration_minutes) || 60,
        course_id: form.course_id || null,
        meeting_url: form.meeting_url || null,
      });
      toast({ title: 'Live class scheduled!' });
      setDialogOpen(false);
      setForm({
        title: '',
        title_bn: '',
        description: '',
        scheduled_at: '',
        duration_minutes: '60',
        meeting_url: '',
        platform: 'jitsi',
        course_id: '',
      });
      fetchClasses();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof ApiError ? error.message : 'Failed',
        variant: 'destructive',
      });
    }
  };

  const handleCancel = async (id: number) => {
    if (!confirm('Cancel this live class?')) return;
    try {
      await apiDelete(`/live-classes/${id}`);
      toast({ title: 'Cancelled' });
      fetchClasses();
    } catch {
      toast({ title: 'Error', variant: 'destructive' });
    }
  };

  // Filter by search
  const filtered = classes.filter((cls) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      cls.title.toLowerCase().includes(q) ||
      (cls.titleBn && cls.titleBn.toLowerCase().includes(q)) ||
      cls.platform.toLowerCase().includes(q) ||
      cls.status.toLowerCase().includes(q)
    );
  });

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* ---- Page Header ---- */}
      <div className="page-header">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-dakkho-danger/15 flex items-center justify-center">
            <Video className="h-5 w-5 text-dakkho-danger" />
          </div>
          <h1 className="page-title">Live Classes</h1>
          <Badge
            variant="secondary"
            className="bg-dakkho-danger/15 text-dakkho-danger border border-dakkho-danger/20 text-xs"
          >
            {total}
          </Badge>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-primary text-white gap-2">
                <Plus className="h-4 w-4" /> Schedule Class
              </Button>
            </DialogTrigger>
          </Dialog>
          <Button
            variant="outline"
            size="icon"
            onClick={fetchClasses}
            className="border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] h-10 w-10"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* ---- Filters Bar ---- */}
      <div className="glass-card rounded-xl p-4">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search classes by title, platform, status..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-white/[0.04] border-white/[0.08] h-10"
            />
          </div>
        </div>
      </div>

      {/* ---- Data Table ---- */}
      <div className="glass-card rounded-xl overflow-hidden">
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Class</th>
                <th>Scheduled</th>
                <th>Duration</th>
                <th>Platform</th>
                <th>Status</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {/* Loading skeleton */}
              {loading &&
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={`skel-${i}`}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j}>
                        <Skeleton className="h-4 w-20" />
                      </td>
                    ))}
                  </tr>
                ))}

              {/* Error state */}
              {!loading && error && (
                <tr>
                  <td colSpan={6} className="text-center py-12">
                    <div className="flex flex-col items-center gap-3">
                      <AlertTriangle className="h-10 w-10 text-dakkho-warning" />
                      <p className="text-muted-foreground text-sm">{error}</p>
                      <Button variant="outline" size="sm" onClick={fetchClasses} className="gap-2">
                        <RefreshCw className="h-3.5 w-3.5" /> Retry
                      </Button>
                    </div>
                  </td>
                </tr>
              )}

              {/* Empty state */}
              {!loading && !error && filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12">
                    <div className="flex flex-col items-center gap-3">
                      <Inbox className="h-10 w-10 text-muted-foreground/50" />
                      <p className="text-muted-foreground text-sm">No live classes found</p>
                      <p className="text-muted-foreground/60 text-xs">
                        {search ? 'Try adjusting your search' : 'Schedule a class to get started'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}

              {/* Data rows */}
              {!loading &&
                !error &&
                filtered.map((cls, idx) => (
                  <motion.tr
                    key={cls.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03, duration: 0.2 }}
                  >
                    <td className="font-medium">
                      <div>{cls.title}</div>
                      {cls.titleBn && <div className="text-xs text-muted-foreground">{cls.titleBn}</div>}
                    </td>
                    <td className="text-sm">{new Date(cls.scheduledAt).toLocaleString()}</td>
                    <td className="text-sm">{cls.durationMinutes} min</td>
                    <td>
                      <span
                        className={`status-badge ${platformBadgeStyles[cls.platform] || platformBadgeStyles.custom}`}
                      >
                        {cls.platform === 'meet' ? 'Google Meet' : cls.platform.charAt(0).toUpperCase() + cls.platform.slice(1)}
                      </span>
                    </td>
                    <td>
                      <span className={statusBadgeStyles[cls.status] || 'status-badge'}>
                        {cls.status === 'live' && (
                          <span className="relative flex h-1.5 w-1.5 mr-0.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                          </span>
                        )}
                        {cls.status.charAt(0).toUpperCase() + cls.status.slice(1)}
                      </span>
                    </td>
                    <td className="text-right">
                      <div className="flex justify-end gap-1">
                        {cls.meetingUrl && (
                          <a href={cls.meetingUrl} target="_blank" rel="noopener noreferrer">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 text-xs hover:bg-dakkho-blue/10 hover:text-dakkho-blue"
                            >
                              <ExternalLink className="h-3 w-3 mr-1" /> Join
                            </Button>
                          </a>
                        )}
                        {cls.status !== 'cancelled' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleCancel(cls.id)}
                            className="h-8 text-xs text-destructive hover:bg-red-500/10"
                          >
                            Cancel
                          </Button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card Layout */}
        <div className="md:hidden space-y-3 p-4">
          {loading &&
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="glass-card rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              </div>
            ))}

          {!loading && !error && filtered.length === 0 && (
            <div className="glass-card rounded-xl p-8 text-center">
              <Inbox className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No live classes found</p>
            </div>
          )}

          <AnimatePresence>
            {!loading &&
              !error &&
              filtered.map((cls) => (
                <motion.div
                  key={cls.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.15 }}
                  className="glass-card rounded-xl p-4"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium">{cls.title}</p>
                      {cls.titleBn && <p className="text-xs text-muted-foreground">{cls.titleBn}</p>}
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(cls.scheduledAt).toLocaleString()} · {cls.durationMinutes} min
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={statusBadgeStyles[cls.status] || 'status-badge'}>
                        {cls.status === 'live' && (
                          <span className="relative flex h-1.5 w-1.5 mr-0.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                          </span>
                        )}
                        {cls.status.charAt(0).toUpperCase() + cls.status.slice(1)}
                      </span>
                      <span
                        className={`status-badge ${platformBadgeStyles[cls.platform] || platformBadgeStyles.custom}`}
                      >
                        {cls.platform === 'meet' ? 'Meet' : cls.platform.charAt(0).toUpperCase() + cls.platform.slice(1)}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    {cls.meetingUrl && (
                      <a href={cls.meetingUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 text-xs w-full hover:bg-dakkho-blue/10 hover:text-dakkho-blue"
                        >
                          <ExternalLink className="h-3 w-3 mr-1" /> Join
                        </Button>
                      </a>
                    )}
                    {cls.status !== 'cancelled' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleCancel(cls.id)}
                        className="h-8 text-xs text-destructive hover:bg-red-500/10"
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </motion.div>
              ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Schedule Live Class Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-[#141428] border-white/[0.08] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">Schedule Live Class</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground">Title</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="bg-white/[0.04] border-white/[0.08]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Title (বাংলা)</Label>
              <Input
                value={form.title_bn}
                onChange={(e) => setForm({ ...form, title_bn: e.target.value })}
                className="bg-white/[0.04] border-white/[0.08]"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="bg-white/[0.04] border-white/[0.08]"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Scheduled At</Label>
                <Input
                  type="datetime-local"
                  value={form.scheduled_at}
                  onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })}
                  className="bg-white/[0.04] border-white/[0.08]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Duration (min)</Label>
                <Input
                  type="number"
                  value={form.duration_minutes}
                  onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })}
                  className="bg-white/[0.04] border-white/[0.08]"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Platform</Label>
                <select
                  value={form.platform}
                  onChange={(e) => setForm({ ...form, platform: e.target.value })}
                  className="w-full h-9 rounded-md bg-white/[0.04] border border-white/[0.08] px-3 text-sm"
                >
                  <option value="jitsi">Jitsi</option>
                  <option value="zoom">Zoom</option>
                  <option value="meet">Google Meet</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Meeting URL</Label>
                <Input
                  value={form.meeting_url}
                  onChange={(e) => setForm({ ...form, meeting_url: e.target.value })}
                  className="bg-white/[0.04] border-white/[0.08]"
                  placeholder="https://..."
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Course (optional)</Label>
              <Select
                value={form.course_id}
                onValueChange={(v) => setForm({ ...form, course_id: v === '__none__' ? '' : v })}
              >
                <SelectTrigger className="bg-white/[0.04] border-white/[0.08]">
                  <SelectValue placeholder="Select a course" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">No course</SelectItem>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleCreate} className="w-full gradient-primary text-white">
              Schedule Class
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
