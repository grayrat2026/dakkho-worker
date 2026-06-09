'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  MessageSquare,
  Search,
  Building2,
  AlertTriangle,
  Inbox,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { apiGet, apiPut, ApiError } from '@/lib/api-client';

interface InstituteRequest {
  id: number;
  userId: string;
  userEmail: string | null;
  userName: string | null;
  instituteName: string;
  instituteNameBn: string | null;
  division: string | null;
  district: string | null;
  status: string;
  adminNote: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

export default function InstituteRequests() {
  const [requests, setRequests] = useState<InstituteRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; id: number | null; note: string }>({
    open: false,
    id: null,
    note: '',
  });
  const { toast } = useToast();

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const status = statusFilter !== 'all' ? `&status=${statusFilter}` : '';
      const data = (await apiGet(`/institute-requests?page=1&limit=100${status}`)) as any;
      setRequests(data.requests || []);
      setTotal(data.total || 0);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch requests';
      setError(message);
      toast({ title: 'Error', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [statusFilter, toast]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleApprove = async (id: number) => {
    try {
      await apiPut(`/institute-requests/${id}/approve`, {});
      toast({ title: 'Approved! Institute added to the system.' });
      fetchRequests();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof ApiError ? error.message : 'Failed',
        variant: 'destructive',
      });
    }
  };

  const handleReject = async () => {
    if (!rejectDialog.id) return;
    try {
      await apiPut(`/institute-requests/${rejectDialog.id}/reject`, { admin_note: rejectDialog.note });
      toast({ title: 'Rejected' });
      setRejectDialog({ open: false, id: null, note: '' });
      fetchRequests();
    } catch (error) {
      toast({ title: 'Error', variant: 'destructive' });
    }
  };

  // Filter by search
  const filtered = requests.filter((req) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      req.instituteName.toLowerCase().includes(q) ||
      (req.instituteNameBn && req.instituteNameBn.toLowerCase().includes(q)) ||
      (req.userName && req.userName.toLowerCase().includes(q)) ||
      (req.userEmail && req.userEmail.toLowerCase().includes(q)) ||
      (req.division && req.division.toLowerCase().includes(q))
    );
  });

  const statusBadgeClass = (status: string) => {
    switch (status) {
      case 'pending':
        return 'status-badge status-badge-pending';
      case 'approved':
        return 'status-badge status-badge-active';
      case 'rejected':
        return 'status-badge status-badge-inactive';
      default:
        return 'status-badge';
    }
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-3 w-3" />;
      case 'approved':
        return <CheckCircle className="h-3 w-3" />;
      case 'rejected':
        return <XCircle className="h-3 w-3" />;
      default:
        return null;
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* ---- Page Header ---- */}
      <div className="page-header">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-dakkho-blue/15 flex items-center justify-center">
            <Building2 className="h-5 w-5 text-dakkho-blue" />
          </div>
          <h1 className="page-title">Institute Requests</h1>
          <Badge
            variant="secondary"
            className="bg-dakkho-blue/15 text-dakkho-blue border border-dakkho-blue/20 text-xs"
          >
            {total}
          </Badge>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="icon"
            onClick={fetchRequests}
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
              placeholder="Search institutes, users, divisions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-white/[0.04] border-white/[0.08] h-10"
            />
          </div>

          {/* Status filter buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {['all', 'pending', 'approved', 'rejected'].map((s) => (
              <Button
                key={s}
                variant={statusFilter === s ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter(s)}
                className={
                  statusFilter === s
                    ? 'gradient-primary text-white h-9'
                    : 'border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] h-9'
                }
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </Button>
            ))}
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
                <th>Institute</th>
                <th>Requested By</th>
                <th>Division</th>
                <th>Status</th>
                <th>Date</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {/* Loading skeleton */}
              {loading &&
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={`skel-${i}`}>
                    <td>
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24 mt-1" />
                    </td>
                    <td>
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-32 mt-1" />
                    </td>
                    <td>
                      <Skeleton className="h-4 w-16" />
                    </td>
                    <td>
                      <Skeleton className="h-6 w-20 rounded-full" />
                    </td>
                    <td>
                      <Skeleton className="h-4 w-20" />
                    </td>
                    <td className="text-right">
                      <div className="flex justify-end gap-2">
                        <Skeleton className="h-7 w-20 rounded-md" />
                        <Skeleton className="h-7 w-20 rounded-md" />
                      </div>
                    </td>
                  </tr>
                ))}

              {/* Error state */}
              {!loading && error && (
                <tr>
                  <td colSpan={6} className="text-center py-12">
                    <div className="flex flex-col items-center gap-3">
                      <AlertTriangle className="h-10 w-10 text-dakkho-warning" />
                      <p className="text-muted-foreground text-sm">{error}</p>
                      <Button variant="outline" size="sm" onClick={fetchRequests} className="gap-2">
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
                      <p className="text-muted-foreground text-sm">No requests found</p>
                      <p className="text-muted-foreground/60 text-xs">
                        {search ? 'Try adjusting your search' : 'New institute requests will appear here'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}

              {/* Data rows */}
              {!loading &&
                !error &&
                filtered.map((req, idx) => (
                  <motion.tr
                    key={req.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03, duration: 0.2 }}
                  >
                    <td className="font-medium">
                      <div>{req.instituteName}</div>
                      {req.instituteNameBn && (
                        <div className="text-xs text-muted-foreground">{req.instituteNameBn}</div>
                      )}
                    </td>
                    <td className="text-sm text-muted-foreground">
                      <div>{req.userName || 'Unknown'}</div>
                      <div className="text-xs">{req.userEmail || ''}</div>
                    </td>
                    <td className="text-sm">{req.division || 'N/A'}</td>
                    <td>
                      <span className={statusBadgeClass(req.status)}>
                        {statusIcon(req.status)}
                        {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                      </span>
                    </td>
                    <td className="text-xs text-muted-foreground">
                      {new Date(req.createdAt).toLocaleDateString()}
                    </td>
                    <td className="text-right">
                      {req.status === 'pending' && (
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleApprove(req.id)}
                            className="gradient-primary text-white h-8 text-xs"
                          >
                            <CheckCircle className="h-3 w-3 mr-1" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setRejectDialog({ open: true, id: req.id, note: '' })}
                            className="border-red-500/30 text-red-400 hover:bg-red-500/10 h-8 text-xs"
                          >
                            <XCircle className="h-3 w-3 mr-1" /> Reject
                          </Button>
                        </div>
                      )}
                      {req.adminNote && (
                        <div className="text-xs text-muted-foreground mt-1">
                          <MessageSquare className="h-3 w-3 inline mr-1" />
                          {req.adminNote}
                        </div>
                      )}
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
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
              </div>
            ))}

          {!loading && !error && filtered.length === 0 && (
            <div className="glass-card rounded-xl p-8 text-center">
              <Inbox className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No requests found</p>
            </div>
          )}

          <AnimatePresence>
            {!loading &&
              !error &&
              filtered.map((req) => (
                <motion.div
                  key={req.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.15 }}
                  className="glass-card rounded-xl p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{req.instituteName}</p>
                      {req.instituteNameBn && (
                        <p className="text-xs text-muted-foreground">{req.instituteNameBn}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        By: {req.userName || req.userEmail || 'Unknown'}
                      </p>
                    </div>
                    <span className={statusBadgeClass(req.status)}>
                      {statusIcon(req.status)}
                      {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                    </span>
                  </div>
                  {req.status === 'pending' && (
                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        onClick={() => handleApprove(req.id)}
                        className="gradient-primary text-white h-8 text-xs flex-1"
                      >
                        <CheckCircle className="h-3 w-3 mr-1" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setRejectDialog({ open: true, id: req.id, note: '' })}
                        className="border-red-500/30 text-red-400 hover:bg-red-500/10 h-8 text-xs flex-1"
                      >
                        <XCircle className="h-3 w-3 mr-1" /> Reject
                      </Button>
                    </div>
                  )}
                  {req.adminNote && (
                    <div className="text-xs text-muted-foreground mt-2">
                      <MessageSquare className="h-3 w-3 inline mr-1" />
                      {req.adminNote}
                    </div>
                  )}
                </motion.div>
              ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Reject Dialog */}
      <Dialog open={rejectDialog.open} onOpenChange={(open) => setRejectDialog({ ...rejectDialog, open })}>
        <DialogContent className="bg-[#141428] border-white/[0.08] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">Reject Institute Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground">Reason (optional)</Label>
              <Textarea
                value={rejectDialog.note}
                onChange={(e) => setRejectDialog({ ...rejectDialog, note: e.target.value })}
                className="bg-white/[0.04] border-white/[0.08]"
                placeholder="Why is this being rejected?"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setRejectDialog({ open: false, id: null, note: '' })}
                className="flex-1 border-white/[0.08] bg-transparent"
              >
                Cancel
              </Button>
              <Button onClick={handleReject} className="flex-1 bg-red-600 hover:bg-red-700 text-white">
                Reject
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
