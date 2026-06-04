'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Plus, Trash2, Tag } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiGet, apiPost, apiPut, apiDelete, ApiError } from '@/lib/api-client';

interface Coupon {
  id: number;
  code: string;
  discount_type: string;
  discount_value: number;
  max_discount: number | null;
  min_purchase: number;
  usage_limit: number | null;
  usage_count: number;
  per_user_limit: number;
  valid_from: string;
  valid_until: string;
  is_active: number;
  created_at: string;
}

export default function CouponsPanel() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  const [form, setForm] = useState({
    code: '', discount_type: 'percentage', discount_value: '', max_discount: '',
    min_purchase: '0', usage_limit: '', per_user_limit: '1', valid_from: '', valid_until: '',
  });

  const fetchCoupons = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet('/coupons?page=1&limit=100') as any;
      setCoupons(data.coupons || []);
      setTotal(data.total || 0);
    } catch { toast({ title: 'Error', variant: 'destructive' }); }
    finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { fetchCoupons(); }, [fetchCoupons]);

  const handleCreate = async () => {
    try {
      await apiPost('/coupons', {
        code: form.code.toUpperCase(),
        discount_type: form.discount_type,
        discount_value: parseFloat(form.discount_value),
        max_discount: form.max_discount ? parseFloat(form.max_discount) : null,
        min_purchase: parseFloat(form.min_purchase) || 0,
        usage_limit: form.usage_limit ? parseInt(form.usage_limit) : null,
        per_user_limit: parseInt(form.per_user_limit) || 1,
        valid_from: form.valid_from,
        valid_until: form.valid_until,
      });
      toast({ title: 'Coupon created!' });
      setDialogOpen(false);
      setForm({ code: '', discount_type: 'percentage', discount_value: '', max_discount: '', min_purchase: '0', usage_limit: '', per_user_limit: '1', valid_from: '', valid_until: '' });
      fetchCoupons();
    } catch (error) {
      toast({ title: 'Error', description: error instanceof ApiError ? error.message : 'Failed', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Deactivate this coupon?')) return;
    try { await apiDelete(`/coupons/${id}`); toast({ title: 'Deactivated' }); fetchCoupons(); }
    catch { toast({ title: 'Error', variant: 'destructive' }); }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <Card className="glass-card border-0">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" onClick={fetchCoupons} className="border-white/10">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gradient-primary text-white"><Plus className="h-4 w-4 mr-2" /> Create Coupon</Button>
              </DialogTrigger>
              <DialogContent className="bg-[#1A1A2E] border-white/10 max-w-md">
                <DialogHeader><DialogTitle>Create Coupon</DialogTitle></DialogHeader>
                <div className="space-y-3 mt-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2"><Label>Code</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className="bg-white/5 border-white/10 uppercase" placeholder="SAVE20" /></div>
                    <div className="space-y-2"><Label>Type</Label><select value={form.discount_type} onChange={(e) => setForm({ ...form, discount_type: e.target.value })} className="w-full h-9 rounded-md bg-white/5 border border-white/10 px-3 text-sm"><option value="percentage">Percentage %</option><option value="flat">Flat ৳</option></select></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2"><Label>Discount Value</Label><Input type="number" value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: e.target.value })} className="bg-white/5 border-white/10" /></div>
                    <div className="space-y-2"><Label>Max Discount (৳)</Label><Input type="number" value={form.max_discount} onChange={(e) => setForm({ ...form, max_discount: e.target.value })} className="bg-white/5 border-white/10" placeholder="Optional" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2"><Label>Min Purchase (৳)</Label><Input type="number" value={form.min_purchase} onChange={(e) => setForm({ ...form, min_purchase: e.target.value })} className="bg-white/5 border-white/10" /></div>
                    <div className="space-y-2"><Label>Usage Limit</Label><Input type="number" value={form.usage_limit} onChange={(e) => setForm({ ...form, usage_limit: e.target.value })} className="bg-white/5 border-white/10" placeholder="Unlimited" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2"><Label>Valid From</Label><Input type="datetime-local" value={form.valid_from} onChange={(e) => setForm({ ...form, valid_from: e.target.value })} className="bg-white/5 border-white/10" /></div>
                    <div className="space-y-2"><Label>Valid Until</Label><Input type="datetime-local" value={form.valid_until} onChange={(e) => setForm({ ...form, valid_until: e.target.value })} className="bg-white/5 border-white/10" /></div>
                  </div>
                  <Button onClick={handleCreate} className="w-full gradient-primary text-white">Create Coupon</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card border-0">
        <CardHeader className="pb-3"><CardTitle className="text-lg flex items-center gap-2"><Tag className="h-5 w-5 text-dakkho-blue" />Coupons ({total})</CardTitle></CardHeader>
        <CardContent>
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader><TableRow className="border-white/[0.06] hover:bg-transparent">
                <TableHead className="text-muted-foreground">Code</TableHead>
                <TableHead className="text-muted-foreground">Discount</TableHead>
                <TableHead className="text-muted-foreground">Usage</TableHead>
                <TableHead className="text-muted-foreground">Valid</TableHead>
                <TableHead className="text-muted-foreground">Status</TableHead>
                <TableHead className="text-muted-foreground text-right">Action</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {loading ? Array.from({ length: 3 }).map((_, i) => <TableRow key={i} className="border-white/[0.06]">{Array.from({ length: 6 }).map((_, j) => <TableCell key={j}><div className="h-5 rounded bg-white/5 animate-pulse" /></TableCell>)}</TableRow>) :
                coupons.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No coupons</TableCell></TableRow> :
                coupons.map((c) => (
                  <TableRow key={c.id} className="border-white/[0.06] hover:bg-white/[0.03]">
                    <TableCell className="font-mono font-semibold text-dakkho-blue">{c.code}</TableCell>
                    <TableCell>{c.discount_type === 'percentage' ? `${c.discount_value}%` : `৳${c.discount_value}`}{c.max_discount ? <span className="text-xs text-muted-foreground"> (max ৳{c.max_discount})</span> : null}</TableCell>
                    <TableCell className="text-sm">{c.usage_count}{c.usage_limit ? `/${c.usage_limit}` : ''}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(c.valid_from).toLocaleDateString()} — {new Date(c.valid_until).toLocaleDateString()}</TableCell>
                    <TableCell>{c.is_active ? <Badge className="bg-green-500/10 text-green-400 border-green-500/20">Active</Badge> : <Badge className="bg-red-500/10 text-red-400 border-red-500/20">Inactive</Badge>}</TableCell>
                    <TableCell className="text-right"><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(c.id)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="md:hidden space-y-3">
            {loading ? Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 rounded-lg bg-white/5 animate-pulse" />) :
            coupons.length === 0 ? <p className="text-center py-8 text-muted-foreground">No coupons</p> :
            coupons.map((c) => (
              <div key={c.id} className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                <div className="flex justify-between items-start">
                  <div><p className="font-mono font-semibold text-dakkho-blue">{c.code}</p><p className="text-sm">{c.discount_type === 'percentage' ? `${c.discount_value}%` : `৳${c.discount_value}`} off</p></div>
                  {c.is_active ? <Badge className="bg-green-500/10 text-green-400 border-green-500/20 text-xs">Active</Badge> : <Badge className="bg-red-500/10 text-red-400 border-red-500/20 text-xs">Inactive</Badge>}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
