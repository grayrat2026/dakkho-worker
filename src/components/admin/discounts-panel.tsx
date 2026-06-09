'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RefreshCw,
  Plus,
  Percent,
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

interface Discount {
  id: number;
  name: string;
  nameBn: string | null;
  description: string | null;
  discountType: string;
  discountValue: number;
  applicableType: string;
  validFrom: string;
  validUntil: string;
  isAutoApply: number;
  isActive: number;
  createdAt: string;
}

export default function DiscountsPanel() {
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: '',
    name_bn: '',
    description: '',
    discount_type: 'percentage',
    discount_value: '',
    applicable_type: 'all',
    valid_from: '',
    valid_until: '',
    is_auto_apply: false,
  });

  const fetchDiscounts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = (await apiGet('/discounts?page=1&limit=100')) as any;
      setDiscounts(data.discounts || []);
      setTotal(data.total || 0);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch discounts';
      setError(message);
      toast({ title: 'Error', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchDiscounts();
  }, [fetchDiscounts]);

  const handleCreate = async () => {
    try {
      await apiPost('/discounts', {
        ...form,
        discount_value: parseFloat(form.discount_value),
        is_auto_apply: form.is_auto_apply ? 1 : 0,
      });
      toast({ title: 'Discount created!' });
      setDialogOpen(false);
      setForm({
        name: '',
        name_bn: '',
        description: '',
        discount_type: 'percentage',
        discount_value: '',
        applicable_type: 'all',
        valid_from: '',
        valid_until: '',
        is_auto_apply: false,
      });
      fetchDiscounts();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof ApiError ? error.message : 'Failed',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Deactivate this discount?')) return;
    try {
      await apiDelete(`/discounts/${id}`);
      toast({ title: 'Deactivated' });
      fetchDiscounts();
    } catch {
      toast({ title: 'Error', variant: 'destructive' });
    }
  };

  // Filter by search
  const filtered = discounts.filter((d) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      d.name.toLowerCase().includes(q) ||
      (d.nameBn && d.nameBn.toLowerCase().includes(q)) ||
      (d.description && d.description.toLowerCase().includes(q))
    );
  });

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* ---- Page Header ---- */}
      <div className="page-header">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-dakkho-purple/15 flex items-center justify-center">
            <Percent className="h-5 w-5 text-dakkho-purple" />
          </div>
          <h1 className="page-title">Discounts</h1>
          <Badge
            variant="secondary"
            className="bg-dakkho-purple/15 text-dakkho-purple border border-dakkho-purple/20 text-xs"
          >
            {total}
          </Badge>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gradient-primary text-white gap-2">
                <Plus className="h-4 w-4" /> Create Discount
              </Button>
            </DialogTrigger>
          </Dialog>
          <Button
            variant="outline"
            size="icon"
            onClick={fetchDiscounts}
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
              placeholder="Search discounts by name..."
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
                <th>Name</th>
                <th>Discount</th>
                <th>Applicable</th>
                <th>Valid</th>
                <th>Auto</th>
                <th>Status</th>
                <th className="text-right">Action</th>
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
                      <Button variant="outline" size="sm" onClick={fetchDiscounts} className="gap-2">
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
                      <p className="text-muted-foreground text-sm">No discounts found</p>
                      <p className="text-muted-foreground/60 text-xs">
                        {search ? 'Try adjusting your search' : 'Create a discount to get started'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}

              {/* Data rows */}
              {!loading &&
                !error &&
                filtered.map((d, idx) => (
                  <motion.tr
                    key={d.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03, duration: 0.2 }}
                  >
                    <td className="font-medium">
                      <div>{d.name}</div>
                      {d.nameBn && <div className="text-xs text-muted-foreground">{d.nameBn}</div>}
                    </td>
                    <td>{d.discountType === 'percentage' ? `${d.discountValue}%` : `৳${d.discountValue}`}</td>
                    <td className="capitalize text-sm">{d.applicableType}</td>
                    <td className="text-xs text-muted-foreground">
                      {new Date(d.validFrom).toLocaleDateString()} —{' '}
                      {new Date(d.validUntil).toLocaleDateString()}
                    </td>
                    <td>
                      {d.isAutoApply ? (
                        <span className="status-badge status-badge-verified">Auto</span>
                      ) : (
                        <span className="text-muted-foreground text-sm">Manual</span>
                      )}
                    </td>
                    <td>
                      <span
                        className={`status-badge ${d.isActive ? 'status-badge-active' : 'status-badge-inactive'}`}
                      >
                        <span className="relative flex h-1.5 w-1.5">
                          {d.isActive && (
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                          )}
                          <span
                            className={`relative inline-flex rounded-full h-1.5 w-1.5 ${d.isActive ? 'bg-emerald-500' : 'bg-red-500'}`}
                          />
                        </span>
                        {d.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:bg-red-500/10"
                        onClick={() => handleDelete(d.id)}
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
              <p className="text-muted-foreground text-sm">No discounts found</p>
            </div>
          )}

          <AnimatePresence>
            {!loading &&
              !error &&
              filtered.map((d) => (
                <motion.div
                  key={d.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.15 }}
                  className="glass-card rounded-xl p-4"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium">{d.name}</p>
                      {d.nameBn && <p className="text-xs text-muted-foreground">{d.nameBn}</p>}
                      <p className="text-sm mt-1">
                        {d.discountType === 'percentage' ? `${d.discountValue}%` : `৳${d.discountValue}`} off
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span
                        className={`status-badge ${d.isActive ? 'status-badge-active' : 'status-badge-inactive'}`}
                      >
                        {d.isActive ? 'Active' : 'Inactive'}
                      </span>
                      {d.isAutoApply && <span className="status-badge status-badge-verified text-xs">Auto</span>}
                    </div>
                  </div>
                  <div className="flex justify-end mt-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-destructive hover:bg-red-500/10"
                      onClick={() => handleDelete(d.id)}
                    >
                      <Trash2 className="h-3 w-3 mr-1" /> Deactivate
                    </Button>
                  </div>
                </motion.div>
              ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Create Discount Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-[#141428] border-white/[0.08] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">Create Discount</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="bg-white/[0.04] border-white/[0.08]"
                  placeholder="Eid Special"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Name (বাংলা)</Label>
                <Input
                  value={form.name_bn}
                  onChange={(e) => setForm({ ...form, name_bn: e.target.value })}
                  className="bg-white/[0.04] border-white/[0.08]"
                />
              </div>
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
              <div className="space-y-2">
                <Label className="text-muted-foreground">Value</Label>
                <Input
                  type="number"
                  value={form.discount_value}
                  onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
                  className="bg-white/[0.04] border-white/[0.08]"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">Applicable To</Label>
              <select
                value={form.applicable_type}
                onChange={(e) => setForm({ ...form, applicable_type: e.target.value })}
                className="w-full h-9 rounded-md bg-white/[0.04] border border-white/[0.08] px-3 text-sm"
              >
                <option value="all">All Courses</option>
                <option value="course">Specific Courses</option>
                <option value="technology">Specific Technology</option>
                <option value="institute">Specific Institute</option>
              </select>
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
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.is_auto_apply}
                onChange={(e) => setForm({ ...form, is_auto_apply: e.target.checked })}
                className="rounded"
              />
              <Label className="text-muted-foreground">Auto-apply at checkout</Label>
            </div>
            <Button onClick={handleCreate} className="w-full gradient-primary text-white">
              Create Discount
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
