'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RefreshCw,
  Send,
  Bell,
  Users,
  BarChart3,
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
import { apiGet, apiPost, ApiError } from '@/lib/api-client';

interface NotifLog {
  id: number;
  type: string;
  category: string;
  title: string | null;
  message: string | null;
  targetType: string | null;
  sentCount: number;
  failedCount: number;
  createdAt: string;
}

export default function PushPanel() {
  const [logs, setLogs] = useState<NotifLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({ totalSubscribers: 0 });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { toast } = useToast();
  const [form, setForm] = useState({ title: '', titleBn: '', message: '', messageBn: '', url: '' });

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [logsData, statsData] = await Promise.all([
        apiGet('/push/logs?page=1&limit=50') as any,
        apiGet('/push/stats') as any,
      ]);
      setLogs(logsData.logs || []);
      setTotal(logsData.total || 0);
      setStats({ totalSubscribers: statsData.totalSubscribers || 0 });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch push data';
      setError(message);
      toast({ title: 'Error', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleBroadcast = async () => {
    try {
      const result = (await apiPost('/push/broadcast', form)) as any;
      toast({ title: `Push sent to ${result.recipients || 0} devices!` });
      setDialogOpen(false);
      setForm({ title: '', titleBn: '', message: '', messageBn: '', url: '' });
      fetchLogs();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof ApiError ? error.message : 'Failed',
        variant: 'destructive',
      });
    }
  };

  // Filter by search
  const filtered = logs.filter((log) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (log.title && log.title.toLowerCase().includes(q)) ||
      (log.message && log.message.toLowerCase().includes(q)) ||
      log.type.toLowerCase().includes(q) ||
      (log.category && log.category.toLowerCase().includes(q))
    );
  });

  // Compute stats
  const totalSent = logs.reduce((acc, log) => acc + log.sentCount, 0);
  const totalFailed = logs.reduce((acc, log) => acc + log.failedCount, 0);
  const sentToday = logs.filter((log) => {
    const d = new Date(log.createdAt);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  }).length;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* ---- Page Header ---- */}
      <div className="page-header">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-dakkho-teal/15 flex items-center justify-center">
            <Bell className="h-5 w-5 text-dakkho-teal" />
          </div>
          <h1 className="page-title">Push Notifications</h1>
          <Badge
            variant="secondary"
            className="bg-dakkho-teal/15 text-dakkho-teal border border-dakkho-teal/20 text-xs"
          >
            {total}
          </Badge>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-primary text-white gap-2">
                <Send className="h-4 w-4" /> Broadcast Push
              </Button>
            </DialogTrigger>
          </Dialog>
          <Button
            variant="outline"
            size="icon"
            onClick={fetchLogs}
            className="border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] h-10 w-10"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* ---- Stats Cards ---- */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card gradient-border rounded-xl border-0 overflow-hidden gradient-stat-blue">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center">
              <Users className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.totalSubscribers}</p>
              <p className="text-xs text-muted-foreground">Push Subscribers</p>
            </div>
          </CardContent>
        </div>
        <div className="glass-card gradient-border rounded-xl border-0 overflow-hidden gradient-stat-teal">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/15 flex items-center justify-center">
              <Bell className="h-5 w-5 text-teal-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{sentToday}</p>
              <p className="text-xs text-muted-foreground">Sent Today</p>
            </div>
          </CardContent>
        </div>
        <div className="glass-card gradient-border rounded-xl border-0 overflow-hidden gradient-stat-amber">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalSent}</p>
              <p className="text-xs text-muted-foreground">Total Delivered</p>
            </div>
          </CardContent>
        </div>
      </div>

      {/* ---- Filters Bar ---- */}
      <div className="glass-card rounded-xl p-4">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search notification logs..."
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
                <th>Title</th>
                <th>Type</th>
                <th>Target</th>
                <th>Sent</th>
                <th>Failed</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {/* Loading skeleton */}
              {loading &&
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={`skel-${i}`}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j}>
                        <Skeleton className="h-4 w-20" />
                      </td>
                    ))}
                  </tr>
                ))}

              {/* Error state */}
              {!loading && error && (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <div className="flex flex-col items-center gap-3">
                      <AlertTriangle className="h-10 w-10 text-dakkho-warning" />
                      <p className="text-muted-foreground text-sm">{error}</p>
                      <Button variant="outline" size="sm" onClick={fetchLogs} className="gap-2">
                        <RefreshCw className="h-3.5 w-3.5" /> Retry
                      </Button>
                    </div>
                  </td>
                </tr>
              )}

              {/* Empty state */}
              {!loading && !error && filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <div className="flex flex-col items-center gap-3">
                      <Inbox className="h-10 w-10 text-muted-foreground/50" />
                      <p className="text-muted-foreground text-sm">No notifications sent yet</p>
                      <p className="text-muted-foreground/60 text-xs">
                        Broadcast your first push notification
                      </p>
                    </div>
                  </td>
                </tr>
              )}

              {/* Data rows */}
              {!loading &&
                !error &&
                filtered.map((log, idx) => {
                  const hasFailures = log.failedCount > 0;
                  return (
                    <motion.tr
                      key={log.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.03, duration: 0.2 }}
                    >
                      <td className="font-medium text-sm">{log.title || '—'}</td>
                      <td>
                        <span className="status-badge status-badge-verified">{log.type}</span>
                      </td>
                      <td className="text-sm capitalize">{log.targetType || 'all'}</td>
                      <td className="text-sm text-emerald-400 font-medium">{log.sentCount}</td>
                      <td className="text-sm">
                        {hasFailures ? (
                          <span className="text-red-400 font-medium">{log.failedCount}</span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </td>
                      <td>
                        <span
                          className={`status-badge ${hasFailures ? 'status-badge-pending' : 'status-badge-active'}`}
                        >
                          {hasFailures ? 'Partial' : 'Sent'}
                        </span>
                      </td>
                      <td className="text-xs text-muted-foreground">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                    </motion.tr>
                  );
                })}
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
              <p className="text-muted-foreground text-sm">No notifications sent yet</p>
            </div>
          )}

          <AnimatePresence>
            {!loading &&
              !error &&
              filtered.map((log) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.15 }}
                  className="glass-card rounded-xl p-4"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium">{log.title || '—'}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {log.type} · {log.targetType || 'all'}
                      </p>
                    </div>
                    <span
                      className={`status-badge ${log.failedCount > 0 ? 'status-badge-pending' : 'status-badge-active'}`}
                    >
                      {log.failedCount > 0 ? 'Partial' : 'Sent'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs text-emerald-400">{log.sentCount} sent</span>
                    {log.failedCount > 0 && (
                      <span className="text-xs text-red-400">{log.failedCount} failed</span>
                    )}
                    <span className="text-xs text-muted-foreground ml-auto">
                      {new Date(log.createdAt).toLocaleString()}
                    </span>
                  </div>
                </motion.div>
              ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Broadcast Push Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-[#141428] border-white/[0.08] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">Broadcast Push Notification</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Title (English)</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="bg-white/[0.04] border-white/[0.08]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Title (বাংলা)</Label>
                <Input
                  value={form.titleBn}
                  onChange={(e) => setForm({ ...form, titleBn: e.target.value })}
                  className="bg-white/[0.04] border-white/[0.08]"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Message (English)</Label>
                <Textarea
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  className="bg-white/[0.04] border-white/[0.08]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Message (বাংলা)</Label>
                <Textarea
                  value={form.messageBn}
                  onChange={(e) => setForm({ ...form, messageBn: e.target.value })}
                  className="bg-white/[0.04] border-white/[0.08]"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">URL (optional)</Label>
              <Input
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                className="bg-white/[0.04] border-white/[0.08]"
                placeholder="https://..."
              />
            </div>
            <Button onClick={handleBroadcast} className="w-full gradient-primary text-white gap-2">
              <Send className="h-4 w-4" /> Send to All
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
