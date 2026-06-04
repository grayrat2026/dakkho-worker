'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Send, Bell, Users, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { apiGet, apiPost, ApiError } from '@/lib/api-client';

interface NotifLog {
  id: number;
  type: string;
  category: string;
  title: string | null;
  message: string | null;
  target_type: string | null;
  sent_count: number;
  failed_count: number;
  created_at: string;
}

export default function PushPanel() {
  const [logs, setLogs] = useState<NotifLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalSubscribers: 0 });
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();
  const [form, setForm] = useState({ title: '', titleBn: '', message: '', messageBn: '', url: '' });

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const [logsData, statsData] = await Promise.all([
        apiGet('/push/logs?page=1&limit=50') as any,
        apiGet('/push/stats') as any,
      ]);
      setLogs(logsData.logs || []);
      setTotal(logsData.total || 0);
      setStats({ totalSubscribers: statsData.totalSubscribers || 0 });
    } catch { toast({ title: 'Error', variant: 'destructive' }); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const handleBroadcast = async () => {
    try {
      const result = await apiPost('/push/broadcast', form) as any;
      toast({ title: `Push sent to ${result.recipients || 0} devices!` });
      setDialogOpen(false);
      setForm({ title: '', titleBn: '', message: '', messageBn: '', url: '' });
      fetchLogs();
    } catch (error) {
      toast({ title: 'Error', description: error instanceof ApiError ? error.message : 'Failed', variant: 'destructive' });
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass-card border-0">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center"><Users className="h-5 w-5 text-blue-400" /></div>
            <div><p className="text-2xl font-bold">{stats.totalSubscribers}</p><p className="text-xs text-muted-foreground">Push Subscribers</p></div>
          </CardContent>
        </Card>
        <Card className="glass-card border-0">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center"><Bell className="h-5 w-5 text-green-400" /></div>
            <div><p className="text-2xl font-bold">{total}</p><p className="text-xs text-muted-foreground">Notifications Sent</p></div>
          </CardContent>
        </Card>
        <Card className="glass-card border-0">
          <CardContent className="p-4">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild><Button className="w-full gradient-primary text-white h-full min-h-[56px]"><Send className="h-5 w-5 mr-2" />Broadcast Push</Button></DialogTrigger>
              <DialogContent className="bg-[#1A1A2E] border-white/10 max-w-md">
                <DialogHeader><DialogTitle>Broadcast Push Notification</DialogTitle></DialogHeader>
                <div className="space-y-3 mt-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2"><Label>Title (English)</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="bg-white/5 border-white/10" /></div>
                    <div className="space-y-2"><Label>Title (বাংলা)</Label><Input value={form.titleBn} onChange={(e) => setForm({ ...form, titleBn: e.target.value })} className="bg-white/5 border-white/10" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2"><Label>Message (English)</Label><Textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} className="bg-white/5 border-white/10" /></div>
                    <div className="space-y-2"><Label>Message (বাংলা)</Label><Textarea value={form.messageBn} onChange={(e) => setForm({ ...form, messageBn: e.target.value })} className="bg-white/5 border-white/10" /></div>
                  </div>
                  <div className="space-y-2"><Label>URL (optional)</Label><Input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} className="bg-white/5 border-white/10" placeholder="https://..." /></div>
                  <Button onClick={handleBroadcast} className="w-full gradient-primary text-white"><Send className="h-4 w-4 mr-2" />Send to All</Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>

      <Card className="glass-card border-0">
        <CardHeader className="pb-3"><CardTitle className="text-lg flex items-center gap-2"><BarChart3 className="h-5 w-5 text-dakkho-blue" />Notification Logs ({total})</CardTitle></CardHeader>
        <CardContent>
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader><TableRow className="border-white/[0.06] hover:bg-transparent">
                <TableHead className="text-muted-foreground">Title</TableHead>
                <TableHead className="text-muted-foreground">Type</TableHead>
                <TableHead className="text-muted-foreground">Target</TableHead>
                <TableHead className="text-muted-foreground">Sent</TableHead>
                <TableHead className="text-muted-foreground">Failed</TableHead>
                <TableHead className="text-muted-foreground">Date</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {loading ? Array.from({ length: 3 }).map((_, i) => <TableRow key={i} className="border-white/[0.06]">{Array.from({ length: 6 }).map((_, j) => <TableCell key={j}><div className="h-5 rounded bg-white/5 animate-pulse" /></TableCell>)}</TableRow>) :
                logs.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No notifications sent yet</TableCell></TableRow> :
                logs.map((log) => (
                  <TableRow key={log.id} className="border-white/[0.06] hover:bg-white/[0.03]">
                    <TableCell className="font-medium text-sm">{log.title || '—'}</TableCell>
                    <TableCell><Badge className="bg-white/5 text-white/60 border-0 text-xs">{log.type}</Badge></TableCell>
                    <TableCell className="text-sm capitalize">{log.target_type || 'all'}</TableCell>
                    <TableCell className="text-sm text-green-400">{log.sent_count}</TableCell>
                    <TableCell className="text-sm text-red-400">{log.failed_count}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="md:hidden space-y-3">
            {loading ? Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 rounded-lg bg-white/5 animate-pulse" />) :
            logs.length === 0 ? <p className="text-center py-8 text-muted-foreground">No notifications sent yet</p> :
            logs.map((log) => (
              <div key={log.id} className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                <div className="flex justify-between items-start">
                  <p className="text-sm font-medium">{log.title || '—'}</p>
                  <span className="text-xs text-green-400">{log.sent_count} sent</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{log.type} · {log.target_type || 'all'} · {new Date(log.created_at).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
