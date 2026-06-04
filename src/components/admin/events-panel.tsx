'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Plus, Calendar, Megaphone, Trash2 } from 'lucide-react';
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

interface Event {
  id: number;
  title: string;
  title_bn: string | null;
  description: string | null;
  event_type: string;
  start_date: string;
  end_date: string | null;
  is_featured: number;
  is_active: number;
  created_at: string;
}

export default function EventsPanel() {
  const [events, setEvents] = useState<Event[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();
  const [form, setForm] = useState({ title: '', title_bn: '', description: '', event_type: 'event', start_date: '', end_date: '', is_featured: false });

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet('/events?page=1&limit=100') as any;
      setEvents(data.events || []);
      setTotal(data.total || 0);
    } catch { toast({ title: 'Error', variant: 'destructive' }); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const handleCreate = async () => {
    try {
      await apiPost('/events', { ...form, is_featured: form.is_featured ? 1 : 0 });
      toast({ title: 'Event created!' });
      setDialogOpen(false);
      setForm({ title: '', title_bn: '', description: '', event_type: 'event', start_date: '', end_date: '', is_featured: false });
      fetchEvents();
    } catch (error) {
      toast({ title: 'Error', description: error instanceof ApiError ? error.message : 'Failed', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this event?')) return;
    try { await apiDelete(`/events/${id}`); toast({ title: 'Deleted' }); fetchEvents(); }
    catch { toast({ title: 'Error', variant: 'destructive' }); }
  };

  const handleBroadcast = async (id: number) => {
    try { await apiPost(`/events/${id}/broadcast`, {}); toast({ title: 'Broadcast sent!' }); }
    catch { toast({ title: 'Error', variant: 'destructive' }); }
  };

  const typeColors: Record<string, string> = {
    special_day: 'bg-amber-500/10 text-amber-400',
    event: 'bg-blue-500/10 text-blue-400',
    holiday: 'bg-red-500/10 text-red-400',
    announcement: 'bg-green-500/10 text-green-400',
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <Card className="glass-card border-0">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" onClick={fetchEvents} className="border-white/10"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild><Button className="gradient-primary text-white"><Plus className="h-4 w-4 mr-2" /> Create Event</Button></DialogTrigger>
              <DialogContent className="bg-[#1A1A2E] border-white/10 max-w-md">
                <DialogHeader><DialogTitle>Create Event</DialogTitle></DialogHeader>
                <div className="space-y-3 mt-4">
                  <div className="space-y-2"><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="bg-white/5 border-white/10" /></div>
                  <div className="space-y-2"><Label>Title (বাংলা)</Label><Input value={form.title_bn} onChange={(e) => setForm({ ...form, title_bn: e.target.value })} className="bg-white/5 border-white/10" /></div>
                  <div className="space-y-2"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="bg-white/5 border-white/10" /></div>
                  <div className="space-y-2"><Label>Type</Label><select value={form.event_type} onChange={(e) => setForm({ ...form, event_type: e.target.value })} className="w-full h-9 rounded-md bg-white/5 border border-white/10 px-3 text-sm"><option value="event">Event</option><option value="special_day">Special Day</option><option value="holiday">Holiday</option><option value="announcement">Announcement</option></select></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2"><Label>Start Date</Label><Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="bg-white/5 border-white/10" /></div>
                    <div className="space-y-2"><Label>End Date</Label><Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className="bg-white/5 border-white/10" /></div>
                  </div>
                  <div className="flex items-center gap-2"><input type="checkbox" checked={form.is_featured} onChange={(e) => setForm({ ...form, is_featured: e.target.checked })} className="rounded" /><Label>Featured on Homepage</Label></div>
                  <Button onClick={handleCreate} className="w-full gradient-primary text-white">Create Event</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card border-0">
        <CardHeader className="pb-3"><CardTitle className="text-lg flex items-center gap-2"><Calendar className="h-5 w-5 text-dakkho-blue" />Events ({total})</CardTitle></CardHeader>
        <CardContent>
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader><TableRow className="border-white/[0.06] hover:bg-transparent">
                <TableHead className="text-muted-foreground">Event</TableHead>
                <TableHead className="text-muted-foreground">Type</TableHead>
                <TableHead className="text-muted-foreground">Date</TableHead>
                <TableHead className="text-muted-foreground">Featured</TableHead>
                <TableHead className="text-muted-foreground text-right">Actions</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {loading ? Array.from({ length: 3 }).map((_, i) => <TableRow key={i} className="border-white/[0.06]">{Array.from({ length: 5 }).map((_, j) => <TableCell key={j}><div className="h-5 rounded bg-white/5 animate-pulse" /></TableCell>)}</TableRow>) :
                events.length === 0 ? <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No events</TableCell></TableRow> :
                events.map((ev) => (
                  <TableRow key={ev.id} className="border-white/[0.06] hover:bg-white/[0.03]">
                    <TableCell className="font-medium"><div>{ev.title}</div>{ev.title_bn && <div className="text-xs text-muted-foreground">{ev.title_bn}</div>}</TableCell>
                    <TableCell><Badge className={`${typeColors[ev.event_type] || 'bg-white/5'} border-0 text-xs capitalize`}>{ev.event_type.replace('_', ' ')}</Badge></TableCell>
                    <TableCell className="text-sm">{new Date(ev.start_date).toLocaleDateString()}{ev.end_date ? ` — ${new Date(ev.end_date).toLocaleDateString()}` : ''}</TableCell>
                    <TableCell>{ev.is_featured ? <Badge className="bg-amber-500/10 text-amber-400 border-0">⭐</Badge> : '—'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => handleBroadcast(ev.id)} className="h-7 text-xs"><Megaphone className="h-3 w-3 mr-1" />Push</Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(ev.id)} className="h-7 text-xs text-destructive"><Trash2 className="h-3 w-3" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="md:hidden space-y-3">
            {loading ? Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 rounded-lg bg-white/5 animate-pulse" />) :
            events.length === 0 ? <p className="text-center py-8 text-muted-foreground">No events</p> :
            events.map((ev) => (
              <div key={ev.id} className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                <div className="flex justify-between items-start">
                  <div><p className="text-sm font-medium">{ev.title}</p><p className="text-xs text-muted-foreground">{new Date(ev.start_date).toLocaleDateString()}</p></div>
                  <Badge className={`${typeColors[ev.event_type] || 'bg-white/5'} border-0 text-xs capitalize`}>{ev.event_type.replace('_', ' ')}</Badge>
                </div>
                <div className="flex gap-2 mt-2">
                  <Button size="sm" variant="ghost" onClick={() => handleBroadcast(ev.id)} className="h-7 text-xs"><Megaphone className="h-3 w-3 mr-1" />Push</Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(ev.id)} className="h-7 text-xs text-destructive"><Trash2 className="h-3 w-3 mr-1" />Delete</Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
