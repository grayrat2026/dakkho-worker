'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RefreshCw,
  Plus,
  Calendar,
  Megaphone,
  Trash2,
  Search,
  AlertTriangle,
  Inbox,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { apiGet, apiPost, apiDelete, ApiError } from '@/lib/api-client';

interface Event {
  id: number;
  title: string;
  titleBn: string | null;
  description: string | null;
  eventType: string;
  startDate: string;
  endDate: string | null;
  isFeatured: number;
  isActive: number;
  createdAt: string;
}

const typeBadgeStyles: Record<string, string> = {
  event: 'bg-blue-500/15 text-blue-400 border border-blue-500/20',
  special_day: 'bg-amber-500/15 text-amber-400 border border-amber-500/20',
  holiday: 'bg-green-500/15 text-green-400 border border-green-500/20',
  exam: 'bg-purple-500/15 text-purple-400 border border-purple-500/20',
  workshop: 'bg-orange-500/15 text-orange-400 border border-orange-500/20',
  announcement: 'bg-teal-500/15 text-teal-400 border border-teal-500/20',
};

export default function EventsPanel() {
  const [events, setEvents] = useState<Event[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { toast } = useToast();
  const [form, setForm] = useState({
    title: '',
    title_bn: '',
    description: '',
    event_type: 'event',
    start_date: '',
    end_date: '',
    is_featured: false,
  });

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = (await apiGet('/events?page=1&limit=100')) as any;
      setEvents(data.events || []);
      setTotal(data.total || 0);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch events';
      setError(message);
      toast({ title: 'Error', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleCreate = async () => {
    try {
      await apiPost('/events', { ...form, is_featured: form.is_featured ? 1 : 0 });
      toast({ title: 'Event created!' });
      setDialogOpen(false);
      setForm({
        title: '',
        title_bn: '',
        description: '',
        event_type: 'event',
        start_date: '',
        end_date: '',
        is_featured: false,
      });
      fetchEvents();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof ApiError ? error.message : 'Failed',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this event?')) return;
    try {
      await apiDelete(`/events/${id}`);
      toast({ title: 'Deleted' });
      fetchEvents();
    } catch {
      toast({ title: 'Error', variant: 'destructive' });
    }
  };

  const handleBroadcast = async (id: number) => {
    try {
      await apiPost(`/events/${id}/broadcast`, {});
      toast({ title: 'Broadcast sent!' });
    } catch {
      toast({ title: 'Error', variant: 'destructive' });
    }
  };

  // Filter by search
  const filtered = events.filter((ev) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      ev.title.toLowerCase().includes(q) ||
      (ev.titleBn && ev.titleBn.toLowerCase().includes(q)) ||
      (ev.description && ev.description.toLowerCase().includes(q)) ||
      ev.eventType.toLowerCase().includes(q)
    );
  });

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* ---- Page Header ---- */}
      <div className="page-header">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-dakkho-blue/15 flex items-center justify-center">
            <Calendar className="h-5 w-5 text-dakkho-blue" />
          </div>
          <h1 className="page-title">Events</h1>
          <Badge
            variant="secondary"
            className="bg-dakkho-blue/15 text-dakkho-blue border border-dakkho-blue/20 text-xs"
          >
            {total}
          </Badge>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-primary text-white gap-2">
                <Plus className="h-4 w-4" /> Create Event
              </Button>
            </DialogTrigger>
          </Dialog>
          <Button
            variant="outline"
            size="icon"
            onClick={fetchEvents}
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
              placeholder="Search events by title, type..."
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
                <th>Event</th>
                <th>Type</th>
                <th>Date</th>
                <th>Featured</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
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
                      <Button variant="outline" size="sm" onClick={fetchEvents} className="gap-2">
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
                      <p className="text-muted-foreground text-sm">No events found</p>
                      <p className="text-muted-foreground/60 text-xs">
                        {search ? 'Try adjusting your search' : 'Create an event to get started'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}

              {/* Data rows */}
              {!loading &&
                !error &&
                filtered.map((ev, idx) => (
                  <motion.tr
                    key={ev.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03, duration: 0.2 }}
                  >
                    <td className="font-medium">
                      <div>{ev.title}</div>
                      {ev.titleBn && <div className="text-xs text-muted-foreground">{ev.titleBn}</div>}
                    </td>
                    <td>
                      <span
                        className={`status-badge ${typeBadgeStyles[ev.eventType] || 'bg-white/5 text-white/60 border border-white/10'}`}
                      >
                        {ev.eventType.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="text-sm">
                      {new Date(ev.startDate).toLocaleDateString()}
                      {ev.endDate ? ` — ${new Date(ev.endDate).toLocaleDateString()}` : ''}
                    </td>
                    <td>
                      {ev.isFeatured ? (
                        <span className="status-badge status-badge-pending">⭐ Featured</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td>
                      <span
                        className={`status-badge ${ev.isActive ? 'status-badge-active' : 'status-badge-inactive'}`}
                      >
                        {ev.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleBroadcast(ev.id)}
                          className="h-8 text-xs hover:bg-dakkho-blue/10 hover:text-dakkho-blue"
                        >
                          <Megaphone className="h-3 w-3 mr-1" /> Push
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(ev.id)}
                          className="h-8 text-xs text-destructive hover:bg-red-500/10"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
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
              <p className="text-muted-foreground text-sm">No events found</p>
            </div>
          )}

          <AnimatePresence>
            {!loading &&
              !error &&
              filtered.map((ev) => (
                <motion.div
                  key={ev.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.15 }}
                  className="glass-card rounded-xl p-4"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium">{ev.title}</p>
                      {ev.titleBn && <p className="text-xs text-muted-foreground">{ev.titleBn}</p>}
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(ev.startDate).toLocaleDateString()}
                      </p>
                    </div>
                    <span
                      className={`status-badge ${typeBadgeStyles[ev.eventType] || 'bg-white/5 text-white/60 border border-white/10'}`}
                    >
                      {ev.eventType.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleBroadcast(ev.id)}
                      className="h-7 text-xs hover:bg-dakkho-blue/10 hover:text-dakkho-blue"
                    >
                      <Megaphone className="h-3 w-3 mr-1" /> Push
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDelete(ev.id)}
                      className="h-7 text-xs text-destructive hover:bg-red-500/10"
                    >
                      <Trash2 className="h-3 w-3 mr-1" /> Delete
                    </Button>
                  </div>
                </motion.div>
              ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Create Event Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-[#141428] border-white/[0.08] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">Create Event</DialogTitle>
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
            <div className="space-y-2">
              <Label className="text-muted-foreground">Type</Label>
              <select
                value={form.event_type}
                onChange={(e) => setForm({ ...form, event_type: e.target.value })}
                className="w-full h-9 rounded-md bg-white/[0.04] border border-white/[0.08] px-3 text-sm"
              >
                <option value="event">Event</option>
                <option value="special_day">Special Day</option>
                <option value="holiday">Holiday</option>
                <option value="exam">Exam</option>
                <option value="workshop">Workshop</option>
                <option value="announcement">Announcement</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Start Date</Label>
                <Input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                  className="bg-white/[0.04] border-white/[0.08]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">End Date</Label>
                <Input
                  type="date"
                  value={form.end_date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                  className="bg-white/[0.04] border-white/[0.08]"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.is_featured}
                onChange={(e) => setForm({ ...form, is_featured: e.target.checked })}
                className="rounded"
              />
              <Label className="text-muted-foreground">Featured on Homepage</Label>
            </div>
            <Button onClick={handleCreate} className="w-full gradient-primary text-white">
              Create Event
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
