'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RefreshCw,
  Plus,
  Trash2,
  Tag,
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
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { apiGet, apiPost, apiDelete, ApiError } from '@/lib/api-client';

interface Coupon {
  id: number;
  code: string;
  discountType: string;
  discountValue: number;
  maxDiscount: number | null;
  minPurchase: number;
  usageLimit: number | null;
  usageCount: number;
  perUserLimit: number;
  validFrom: string;
  validUntil: string;
  isActive: number;
  createdAt: string;
}

export default function CouponsPanel() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { toast } = useToast();

  const [form, setForm] = useState({
    code: '',
    discount_type: 'percentage',
    discount_value: '',
    max_discount: '',
    min_purchase: '0',
    usage_limit: '',
    per_user_limit: '1',
    valid_from: '',
    valid_until: '',
  });

  const fetchCoupons = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = (await apiGet('/coupons?page=1&limit=100')) as any;
      setCoupons(data.coupons || []);
      setTotal(data.total || 0);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch coupons';
      setError(message);
      toast({ title: 'Error', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchCoupons();
  }, [fetchCoupons]);

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
      setForm({
        code: '',
        discount_type: 'percentage',
        discount_value: '',
        max_discount: '',
        min_purchase: '0',
        usage_limit: '',
        per_user_limit: '1',
        valid_from: '',
        valid_until: '',
      });
      fetchCoupons();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof ApiError ? error.message : 'Failed',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Deactivate this coupon?')) return;
    try {
      await apiDelete(`/coupons/${id}`);
      toast({ title: 'Deactivated' });
      fetchCoupons();
    } catch {
      toast({ title: 'Error', variant: 'destructive' });
    }
  };

  // Filter by search
  const filtered = coupons.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.code.toLowerCase().includes(q);
  });

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* ---- Page Header ---- */}
      <div className="page-header">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-dakkho-teal/15 flex items-center justify-center">
            <Tag className="h-5 w-5 text-dakkho-teal" />
          </div>
          <h1 className="page-title">Coupons</h1>
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
                <Plus className="h-4 w-4" /> Create Coupon
              </Button>
            </DialogTrigger>
          </Dialog>
          <Button
            variant="outline"
            size="icon"
            onClick={fetchCoupons}
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
              placeholder="Search coupon codes..."
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
                <th>Code</th>
                <th>Discount</th>
                <th>Usage</th>
                <th>Valid</th>
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
                      <Button variant="outline" size="sm" onClick={fetchCoupons} className="gap-2">
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
                      <p className="text-muted-foreground text-sm">No coupons found</p>
                      <p className="text-muted-foreground/60 text-xs">
                        {search ? 'Try adjusting your search' : 'Create a coupon to get started'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}

              {/* Data rows */}
              {!loading &&
                !error &&
                filtered.map((c, idx) => (
                  <motion.tr
                    key={c.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03, duration: 0.2 }}
                  >
                    <td className="font-mono font-semibold text-dakkho-blue">{c.code}</td>
                    <td>
                      {c.discountType === 'percentage' ? `${c.discountValue}%` : `৳${c.discountValue}`}
                      {c.maxDiscount ? (
                        <span className="text-xs text-muted-foreground"> (max ৳{c.maxDiscount})</span>
                      ) : null}
                    </td>
                    <td className="text-sm">
                      {c.usageCount}
                      {c.usageLimit ? `/${c.usageLimit}` : ''}
                    </td>
                    <td className="text-xs text-muted-foreground">
                      {new Date(c.validFrom).toLocaleDateString()} —{' '}
                      {new Date(c.validUntil).toLocaleDateString()}
                    </td>
                    <td>
                      <span
                        className={`status-badge ${c.isActive ? 'status-badge-active' : 'status-badge-inactive'}`}
                      >
                        <span className="relative flex h-1.5 w-1.5">
                          {c.isActive && (
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                          )}
                          <span
                            className={`relative inline-flex rounded-full h-1.5 w-1.5 ${c.isActive ? 'bg-emerald-500' : 'bg-red-500'}`}
                          />
                        </span>
                        {c.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:bg-red-500/10"
                        onClick={() => handleDelete(c.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
              <p className="text-muted-foreground text-sm">No coupons found</p>
            </div>
          )}

          <AnimatePresence>
            {!loading &&
              !error &&
              filtered.map((c) => (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.15 }}
                  className="glass-card rounded-xl p-4"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-mono font-semibold text-dakkho-blue">{c.code}</p>
                      <p className="text-sm">
                        {c.discountType === 'percentage' ? `${c.discountValue}%` : `৳${c.discountValue}`} off
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {c.usageCount}
                        {c.usageLimit ? `/${c.usageLimit}` : ''} used
                      </p>
                    </div>
                    <span
                      className={`status-badge ${c.isActive ? 'status-badge-active' : 'status-badge-inactive'}`}
                    >
                      {c.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="flex justify-end mt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-destructive hover:bg-red-500/10"
                      onClick={() => handleDelete(c.id)}
                    >
                      <Trash2 className="h-3 w-3 mr-1" /> Deactivate
                    </Button>
                  </div>
                </motion.div>
              ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Create Coupon Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-[#141428] border-white/[0.08] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">Create Coupon</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Code</Label>
                <Input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  className="bg-white/[0.04] border-white/[0.08] uppercase"
                  placeholder="SAVE20"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Type</Label>
                <select
                  value={form.discount_type}
                  onChange={(e) => setForm({ ...form, discount_type: e.target.value })}
                  className="w-full h-9 rounded-md bg-white/[0.04] border border-white/[0.08] px-3 text-sm"
                >
                  <option value="percentage">Percentage %</option>
                  <option value="flat">Flat ৳</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Discount Value</Label>
                <Input
                  type="number"
                  value={form.discount_value}
                  onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
                  className="bg-white/[0.04] border-white/[0.08]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Max Discount (৳)</Label>
                <Input
                  type="number"
                  value={form.max_discount}
                  onChange={(e) => setForm({ ...form, max_discount: e.target.value })}
                  className="bg-white/[0.04] border-white/[0.08]"
                  placeholder="Optional"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Min Purchase (৳)</Label>
                <Input
                  type="number"
                  value={form.min_purchase}
                  onChange={(e) => setForm({ ...form, min_purchase: e.target.value })}
                  className="bg-white/[0.04] border-white/[0.08]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Usage Limit</Label>
                <Input
                  type="number"
                  value={form.usage_limit}
                  onChange={(e) => setForm({ ...form, usage_limit: e.target.value })}
                  className="bg-white/[0.04] border-white/[0.08]"
                  placeholder="Unlimited"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Valid From</Label>
                <Input
                  type="datetime-local"
                  value={form.valid_from}
                  onChange={(e) => setForm({ ...form, valid_from: e.target.value })}
                  className="bg-white/[0.04] border-white/[0.08]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Valid Until</Label>
                <Input
                  type="datetime-local"
                  value={form.valid_until}
                  onChange={(e) => setForm({ ...form, valid_until: e.target.value })}
                  className="bg-white/[0.04] border-white/[0.08]"
                />
              </div>
            </div>
            <Button onClick={handleCreate} className="w-full gradient-primary text-white">
              Create Coupon
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
