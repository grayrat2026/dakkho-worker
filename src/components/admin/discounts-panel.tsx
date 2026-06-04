'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Plus, Percent, Trash2 } from 'lucide-react';
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

interface Discount {
  id: number;
  name: string;
  name_bn: string | null;
  description: string | null;
  discount_type: string;
  discount_value: number;
  applicable_type: string;
  valid_from: string;
  valid_until: string;
  is_auto_apply: number;
  is_active: number;
  created_at: string;
}

export default function DiscountsPanel() {
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();
  const [form, setForm] = useState({ name: '', name_bn: '', description: '', discount_type: 'percentage', discount_value: '', applicable_type: 'all', valid_from: '', valid_until: '', is_auto_apply: false });

  const fetchDiscounts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet('/discounts?page=1&limit=100') as any;
      setDiscounts(data.discounts || []);
      setTotal(data.total || 0);
    } catch { toast({ title: 'Error', variant: 'destructive' }); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { fetchDiscounts(); }, [fetchDiscounts]);

  const handleCreate = async () => {
    try {
      await apiPost('/discounts', { ...form, discount_value: parseFloat(form.discount_value), is_auto_apply: form.is_auto_apply ? 1 : 0 });
      toast({ title: 'Discount created!' });
      setDialogOpen(false);
      setForm({ name: '', name_bn: '', description: '', discount_type: 'percentage', discount_value: '', applicable_type: 'all', valid_from: '', valid_until: '', is_auto_apply: false });
      fetchDiscounts();
    } catch (error) {
      toast({ title: 'Error', description: error instanceof ApiError ? error.message : 'Failed', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Deactivate this discount?')) return;
    try { await apiDelete(`/discounts/${id}`); toast({ title: 'Deactivated' }); fetchDiscounts(); }
    catch { toast({ title: 'Error', variant: 'destructive' }); }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <Card className="glass-card border-0">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" onClick={fetchDiscounts} className="border-white/10"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild><Button className="gradient-primary text-white"><Plus className="h-4 w-4 mr-2" /> Create Discount</Button></DialogTrigger>
              <DialogContent className="bg-[#1A1A2E] border-white/10 max-w-md">
                <DialogHeader><DialogTitle>Create Discount</DialogTitle></DialogHeader>
                <div className="space-y-3 mt-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2"><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-white/5 border-white/10" placeholder="Eid Special" /></div>
                    <div className="space-y-2"><Label>Name (বাংলা)</Label><Input value={form.name_bn} onChange={(e) => setForm({ ...form, name_bn: e.target.value })} className="bg-white/5 border-white/10" /></div>
                  </div>
                  <div className="space-y-2"><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="bg-white/5 border-white/10" /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2"><Label>Type</Label><select value={form.discount_type} onChange={(e) => setForm({ ...form, discount_type: e.target.value })} className="w-full h-9 rounded-md bg-white/5 border border-white/10 px-3 text-sm"><option value="percentage">Percentage %</option><option value="flat">Flat ৳</option></select></div>
                    <div className="space-y-2"><Label>Value</Label><Input type="number" value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: e.target.value })} className="bg-white/5 border-white/10" /></div>
                  </div>
                  <div className="space-y-2"><Label>Applicable To</Label><select value={form.applicable_type} onChange={(e) => setForm({ ...form, applicable_type: e.target.value })} className="w-full h-9 rounded-md bg-white/5 border border-white/10 px-3 text-sm"><option value="all">All Courses</option><option value="course">Specific Courses</option><option value="technology">Specific Technology</option><option value="institute">Specific Institute</option></select></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2"><Label>Valid From</Label><Input type="datetime-local" value={form.valid_from} onChange={(e) => setForm({ ...form, valid_from: e.target.value })} className="bg-white/5 border-white/10" /></div>
                    <div className="space-y-2"><Label>Valid Until</Label><Input type="datetime-local" value={form.valid_until} onChange={(e) => setForm({ ...form, valid_until: e.target.value })} className="bg-white/5 border-white/10" /></div>
                  </div>
                  <div className="flex items-center gap-2"><input type="checkbox" checked={form.is_auto_apply} onChange={(e) => setForm({ ...form, is_auto_apply: e.target.checked })} className="rounded" /><Label>Auto-apply at checkout</Label></div>
                  <Button onClick={handleCreate} className="w-full gradient-primary text-white">Create Discount</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card border-0">
        <CardHeader className="pb-3"><CardTitle className="text-lg flex items-center gap-2"><Percent className="h-5 w-5 text-dakkho-blue" />Discounts ({total})</CardTitle></CardHeader>
        <CardContent>
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader><TableRow className="border-white/[0.06] hover:bg-transparent">
                <TableHead className="text-muted-foreground">Name</TableHead>
                <TableHead className="text-muted-foreground">Discount</TableHead>
                <TableHead className="text-muted-foreground">Applicable</TableHead>
                <TableHead className="text-muted-foreground">Valid</TableHead>
                <TableHead className="text-muted-foreground">Auto</TableHead>
                <TableHead className="text-muted-foreground text-right">Action</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {loading ? Array.from({ length: 3 }).map((_, i) => <TableRow key={i} className="border-white/[0.06]">{Array.from({ length: 6 }).map((_, j) => <TableCell key={j}><div className="h-5 rounded bg-white/5 animate-pulse" /></TableCell>)}</TableRow>) :
                discounts.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No discounts</TableCell></TableRow> :
                discounts.map((d) => (
                  <TableRow key={d.id} className="border-white/[0.06] hover:bg-white/[0.03]">
                    <TableCell className="font-medium"><div>{d.name}</div>{d.name_bn && <div className="text-xs text-muted-foreground">{d.name_bn}</div>}</TableCell>
                    <TableCell>{d.discount_type === 'percentage' ? `${d.discount_value}%` : `৳${d.discount_value}`}</TableCell>
                    <TableCell className="capitalize text-sm">{d.applicable_type}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(d.valid_from).toLocaleDateString()} — {new Date(d.valid_until).toLocaleDateString()}</TableCell>
                    <TableCell>{d.is_auto_apply ? <Badge className="bg-green-500/10 text-green-400 border-0 text-xs">Auto</Badge> : 'Manual'}</TableCell>
                    <TableCell className="text-right"><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(d.id)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="md:hidden space-y-3">
            {loading ? Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 rounded-lg bg-white/5 animate-pulse" />) :
            discounts.length === 0 ? <p className="text-center py-8 text-muted-foreground">No discounts</p> :
            discounts.map((d) => (
              <div key={d.id} className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                <div className="flex justify-between items-start">
                  <div><p className="text-sm font-medium">{d.name}</p><p className="text-sm">{d.discount_type === 'percentage' ? `${d.discount_value}%` : `৳${d.discount_value}`} off</p></div>
                  {d.is_auto_apply ? <Badge className="bg-green-500/10 text-green-400 border-0 text-xs">Auto</Badge> : null}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
