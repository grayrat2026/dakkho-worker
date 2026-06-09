'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, Plus, Search, Package, Trash2, Edit, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { apiGet, apiPost, apiPut, apiDelete, ApiError } from '@/lib/api-client';
import type { CoursePackage, Course } from '@/lib/types';

const EMPTY_FORM = {
  courseId: '',
  packageType: 'basic' as 'basic' | 'standard' | 'premium',
  price: '',
  durationMonths: '1',
  maxUsers: '1',
  isAutoAssign: false,
  isActive: true,
};

const TYPE_COLORS: Record<string, string> = {
  basic: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  standard: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  premium: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
};

export default function PackagesPanel() {
  const [packages, setPackages] = useState<CoursePackage[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const fetchPackages = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet('/packages?page=1&limit=100') as any;
      setPackages(data.packages || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load packages');
      toast({ title: 'Error loading packages', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const fetchCourses = useCallback(async () => {
    try {
      const data = await apiGet('/courses?page=1&limit=500') as any;
      setCourses(data.courses || []);
    } catch {
      // silently fail — course select will just be empty
    }
  }, []);

  useEffect(() => {
    fetchPackages();
    fetchCourses();
  }, [fetchPackages, fetchCourses]);

  const getCourseTitle = (courseId: string) => {
    const course = courses.find((c) => c.id === courseId);
    return course?.title || courseId;
  };

  const filtered = packages.filter((pkg) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      getCourseTitle(pkg.courseId).toLowerCase().includes(q) ||
      pkg.packageType.toLowerCase().includes(q)
    );
  });

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (pkg: CoursePackage) => {
    setEditingId(pkg.id);
    setForm({
      courseId: pkg.courseId,
      packageType: pkg.packageType,
      price: String(pkg.price),
      durationMonths: String(pkg.durationMonths),
      maxUsers: String(pkg.maxUsers),
      isAutoAssign: pkg.isAutoAssign === 1,
      isActive: pkg.isActive === 1,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.courseId || !form.price) {
      toast({ title: 'Please fill in all required fields', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        course_id: form.courseId,
        package_type: form.packageType,
        price: parseFloat(form.price),
        duration_months: parseInt(form.durationMonths) || 1,
        max_users: parseInt(form.maxUsers) || 1,
        is_auto_assign: form.isAutoAssign ? 1 : 0,
        is_active: form.isActive ? 1 : 0,
      };

      if (editingId) {
        await apiPut(`/packages`, { id: editingId, ...payload });
        toast({ title: 'Package updated!' });
      } else {
        await apiPost('/packages', payload);
        toast({ title: 'Package created!' });
      }
      setDialogOpen(false);
      setForm(EMPTY_FORM);
      setEditingId(null);
      fetchPackages();
    } catch (err) {
      toast({
        title: editingId ? 'Update failed' : 'Create failed',
        description: err instanceof ApiError ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this package?')) return;
    try {
      await apiDelete(`/packages/${id}`);
      toast({ title: 'Package deleted' });
      fetchPackages();
    } catch {
      toast({ title: 'Error deleting package', variant: 'destructive' });
    }
  };

  const toggleAutoAssign = async (pkg: CoursePackage) => {
    try {
      await apiPut('/packages', {
        id: pkg.id,
        is_auto_assign: pkg.isAutoAssign === 1 ? 0 : 1,
      });
      fetchPackages();
    } catch {
      toast({ title: 'Error toggling auto-assign', variant: 'destructive' });
    }
  };

  const toggleActive = async (pkg: CoursePackage) => {
    try {
      await apiPut('/packages', {
        id: pkg.id,
        is_active: pkg.isActive === 1 ? 0 : 1,
      });
      fetchPackages();
    } catch {
      toast({ title: 'Error toggling active status', variant: 'destructive' });
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {/* Page Header */}
      <Card className="glass-card border-0">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Button variant="outline" size="icon" onClick={fetchPackages} className="border-white/10">
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Package className="h-5 w-5 text-dakkho-teal" />
                Course Packages
                <span className="text-sm font-normal text-muted-foreground">({total})</span>
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search packages..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 bg-white/[0.04] border-white/[0.08] w-56"
                />
                {search && (
                  <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                    <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                  </button>
                )}
              </div>
              <Button onClick={openCreate} className="gradient-primary text-white">
                <Plus className="h-4 w-4 mr-2" /> Create Package
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error State */}
      {error && (
        <Card className="glass-card border-0">
          <CardContent className="p-6 text-center">
            <p className="text-destructive mb-3">{error}</p>
            <Button variant="outline" onClick={fetchPackages} className="border-white/10">
              <RefreshCw className="h-4 w-4 mr-2" /> Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Data Table */}
      {!error && (
        <Card className="glass-card border-0">
          <CardContent className="p-0">
            <div className="hidden md:block overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Course</th>
                    <th>Type</th>
                    <th>Price</th>
                    <th>Duration</th>
                    <th>Max Users</th>
                    <th>Auto-assign</th>
                    <th>Active</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 8 }).map((_, j) => (
                          <td key={j}><div className="h-5 rounded bg-white/5 animate-shimmer" /></td>
                        ))}
                      </tr>
                    ))
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-muted-foreground">
                        <Package className="h-10 w-10 mx-auto mb-3 opacity-30" />
                        <p>No packages found</p>
                        {search && <p className="text-xs mt-1">Try adjusting your search</p>}
                      </td>
                    </tr>
                  ) : (
                    filtered.map((pkg) => (
                      <tr key={pkg.id}>
                        <td className="font-medium max-w-[200px] truncate">
                          {getCourseTitle(pkg.courseId)}
                        </td>
                        <td>
                          <Badge className={`${TYPE_COLORS[pkg.packageType] || 'bg-white/5'} border text-xs capitalize`}>
                            {pkg.packageType}
                          </Badge>
                        </td>
                        <td className="font-semibold">৳{pkg.price.toLocaleString()}</td>
                        <td className="text-sm">{pkg.durationMonths} {pkg.durationMonths === 1 ? 'month' : 'months'}</td>
                        <td className="text-sm">{pkg.maxUsers}</td>
                        <td>
                          <Switch
                            checked={pkg.isAutoAssign === 1}
                            onCheckedChange={() => toggleAutoAssign(pkg)}
                          />
                        </td>
                        <td>
                          <Switch
                            checked={pkg.isActive === 1}
                            onCheckedChange={() => toggleActive(pkg)}
                          />
                        </td>
                        <td className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(pkg)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(pkg.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile View */}
            <div className="md:hidden p-4 space-y-3">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-24 rounded-lg bg-white/5 animate-shimmer" />
                ))
              ) : filtered.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p>No packages found</p>
                </div>
              ) : (
                filtered.map((pkg) => (
                  <div key={pkg.id} className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06] space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm font-medium truncate max-w-[200px]">{getCourseTitle(pkg.courseId)}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={`${TYPE_COLORS[pkg.packageType] || 'bg-white/5'} border text-xs capitalize`}>
                            {pkg.packageType}
                          </Badge>
                          <span className="text-sm font-semibold">৳{pkg.price.toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`status-badge ${pkg.isActive === 1 ? 'status-badge-active' : 'status-badge-inactive'}`}>
                          {pkg.isActive === 1 ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{pkg.durationMonths}mo · {pkg.maxUsers} users</span>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(pkg)}>
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(pkg.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-[#141428] border-white/[0.08] max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Package' : 'Create Package'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {/* Course Select */}
            <div className="space-y-2">
              <Label>Course *</Label>
              <select
                value={form.courseId}
                onChange={(e) => setForm({ ...form, courseId: e.target.value })}
                className="w-full h-9 rounded-md bg-white/[0.04] border border-white/[0.08] px-3 text-sm focus:outline-none focus:ring-1 focus:ring-dakkho-blue"
              >
                <option value="">Select a course...</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </div>

            {/* Package Type */}
            <div className="space-y-2">
              <Label>Package Type *</Label>
              <select
                value={form.packageType}
                onChange={(e) => setForm({ ...form, packageType: e.target.value as 'basic' | 'standard' | 'premium' })}
                className="w-full h-9 rounded-md bg-white/[0.04] border border-white/[0.08] px-3 text-sm focus:outline-none focus:ring-1 focus:ring-dakkho-blue"
              >
                <option value="basic">Basic</option>
                <option value="standard">Standard</option>
                <option value="premium">Premium</option>
              </select>
            </div>

            {/* Price & Duration */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Price (৳) *</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  className="bg-white/[0.04] border-white/[0.08]"
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Duration (months)</Label>
                <Input
                  type="number"
                  min="1"
                  value={form.durationMonths}
                  onChange={(e) => setForm({ ...form, durationMonths: e.target.value })}
                  className="bg-white/[0.04] border-white/[0.08]"
                />
              </div>
            </div>

            {/* Max Users */}
            <div className="space-y-2">
              <Label>Max Users</Label>
              <Input
                type="number"
                min="1"
                value={form.maxUsers}
                onChange={(e) => setForm({ ...form, maxUsers: e.target.value })}
                className="bg-white/[0.04] border-white/[0.08]"
              />
            </div>

            {/* Switches */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="auto-assign">Auto-assign to enrolled students</Label>
                <Switch
                  id="auto-assign"
                  checked={form.isAutoAssign}
                  onCheckedChange={(checked) => setForm({ ...form, isAutoAssign: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="pkg-active">Active</Label>
                <Switch
                  id="pkg-active"
                  checked={form.isActive}
                  onCheckedChange={(checked) => setForm({ ...form, isActive: checked })}
                />
              </div>
            </div>

            {/* Submit */}
            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full gradient-primary text-white"
            >
              {submitting ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              {editingId ? 'Update Package' : 'Create Package'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
