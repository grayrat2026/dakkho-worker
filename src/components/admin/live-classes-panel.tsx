'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Plus, Video, Trash2, Edit } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { apiGet, apiPost, apiDelete, ApiError } from '@/lib/api-client';

interface LiveClass {
  id: number;
  course_id: string | null;
  title: string;
  title_bn: string | null;
  description: string | null;
  scheduled_at: string;
  duration_minutes: number;
  meeting_url: string | null;
  platform: string;
  status: string;
  is_active: number;
  created_at: string;
}

export default function LiveClassesPanel() {
  const [classes, setClasses] = useState<LiveClass[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();
  const [form, setForm] = useState({ title: '', title_bn: '', description: '', scheduled_at: '', duration_minutes: '60', meeting_url: '', platform: 'jitsi', course_id: '' });

  const fetchClasses = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet('/live-classes?page=1&limit=100') as any;
      setClasses(data.liveClasses || []);
      setTotal(data.total || 0);
    } catch { toast({ title: 'Error', variant: 'destructive' }); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { fetchClasses(); }, [fetchClasses]);

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
      setForm({ title: '', title_bn: '', description: '', scheduled_at: '', duration_minutes: '60', meeting_url: '', platform: 'jitsi', course_id: '' });
      fetchClasses();
    } catch (error) {
      toast({ title: 'Error', description: error instanceof ApiError ? error.message : 'Failed', variant: 'destructive' });
    }
  };

  const handleCancel = async (id: number) => {
    if (!confirm('Cancel this live class?')) return;
    try { await apiDelete(`/live-classes/${id}`); toast({ title: 'Cancelled' }); fetchClasses(); }
    catch { toast({ title: 'Error', variant: 'destructive' }); }
  };

  const statusColors: Record<string, string> = {
    scheduled: 'bg-blue-500/10 text-blue-400',
    live: 'bg-green-500/10 text-green-400',
    completed: 'bg-gray-500/10 text-gray-400',
    cancelled: 'bg-red-500/10 text-red-400',
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <Card className="glass-card border-0">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" onClick={fetchClasses} className="border-white/10"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild><Button className="gradient-primary text-white"><Plus className="h-4 w-4 mr-2" /> Schedule Class</Button></DialogTrigger>
              <DialogContent className="bg-[#1A1A2E] border-white/10 max-w-md">
                <DialogHeader><DialogTitle>Schedule Live Class</DialogTitle></DialogHeader>
                <div className="space-y-3 mt-4">
                  <div className="space-y-2"><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="bg-white/5 border-white/10" /></div>
                  <div className="space-y-2"><Label>Title (বাংলা)</Label><Input value={form.title_bn} onChange={(e) => setForm({ ...form, title_bn: e.target.value })} className="bg-white/5 border-white/10" /></div>
                  <div className="space-y-2"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="bg-white/5 border-white/10" /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2"><Label>Scheduled At</Label><Input type="datetime-local" value={form.scheduled_at} onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })} className="bg-white/5 border-white/10" /></div>
                    <div className="space-y-2"><Label>Duration (min)</Label><Input type="number" value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })} className="bg-white/5 border-white/10" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2"><Label>Platform</Label><select value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })} className="w-full h-9 rounded-md bg-white/5 border border-white/10 px-3 text-sm"><option value="jitsi">Jitsi</option><option value="zoom">Zoom</option><option value="meet">Google Meet</option><option value="custom">Custom</option></select></div>
                    <div className="space-y-2"><Label>Meeting URL</Label><Input value={form.meeting_url} onChange={(e) => setForm({ ...form, meeting_url: e.target.value })} className="bg-white/5 border-white/10" placeholder="https://..." /></div>
                  </div>
                  <div className="space-y-2"><Label>Course ID (optional)</Label><Input value={form.course_id} onChange={(e) => setForm({ ...form, course_id: e.target.value })} className="bg-white/5 border-white/10" placeholder="Appwrite course document ID" /></div>
                  <Button onClick={handleCreate} className="w-full gradient-primary text-white">Schedule Class</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card border-0">
        <CardHeader className="pb-3"><CardTitle className="text-lg flex items-center gap-2"><Video className="h-5 w-5 text-dakkho-blue" />Live Classes ({total})</CardTitle></CardHeader>
        <CardContent>
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader><TableRow className="border-white/[0.06] hover:bg-transparent">
                <TableHead className="text-muted-foreground">Class</TableHead>
                <TableHead className="text-muted-foreground">Scheduled</TableHead>
                <TableHead className="text-muted-foreground">Duration</TableHead>
                <TableHead className="text-muted-foreground">Platform</TableHead>
                <TableHead className="text-muted-foreground">Status</TableHead>
                <TableHead className="text-muted-foreground text-right">Action</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {loading ? Array.from({ length: 3 }).map((_, i) => <TableRow key={i} className="border-white/[0.06]">{Array.from({ length: 6 }).map((_, j) => <TableCell key={j}><div className="h-5 rounded bg-white/5 animate-pulse" /></TableCell>)}</TableRow>) :
                classes.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No live classes</TableCell></TableRow> :
                classes.map((cls) => (
                  <TableRow key={cls.id} className="border-white/[0.06] hover:bg-white/[0.03]">
                    <TableCell className="font-medium"><div>{cls.title}</div>{cls.title_bn && <div className="text-xs text-muted-foreground">{cls.title_bn}</div>}</TableCell>
                    <TableCell className="text-sm">{new Date(cls.scheduled_at).toLocaleString()}</TableCell>
                    <TableCell className="text-sm">{cls.duration_minutes} min</TableCell>
                    <TableCell className="capitalize text-sm">{cls.platform}</TableCell>
                    <TableCell><Badge className={`${statusColors[cls.status] || 'bg-white/5'} border-0 text-xs capitalize`}>{cls.status}</Badge></TableCell>
                    <TableCell className="text-right">
                      {cls.meeting_url && <a href={cls.meeting_url} target="_blank" rel="noopener noreferrer"><Button size="sm" variant="ghost" className="h-7 text-xs">Join</Button></a>}
                      {cls.status !== 'cancelled' && <Button size="sm" variant="ghost" onClick={() => handleCancel(cls.id)} className="h-7 text-xs text-destructive">Cancel</Button>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="md:hidden space-y-3">
            {loading ? Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 rounded-lg bg-white/5 animate-pulse" />) :
            classes.length === 0 ? <p className="text-center py-8 text-muted-foreground">No live classes</p> :
            classes.map((cls) => (
              <div key={cls.id} className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                <div className="flex justify-between items-start">
                  <div><p className="text-sm font-medium">{cls.title}</p><p className="text-xs text-muted-foreground">{new Date(cls.scheduled_at).toLocaleString()} · {cls.duration_minutes} min</p></div>
                  <Badge className={`${statusColors[cls.status] || 'bg-white/5'} border-0 text-xs capitalize`}>{cls.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
