'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, CheckCircle, XCircle, Clock, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { apiGet, apiPut, ApiError } from '@/lib/api-client';

interface InstituteRequest {
  id: number;
  user_id: string;
  user_email: string | null;
  user_name: string | null;
  institute_name: string;
  institute_name_bn: string | null;
  division: string | null;
  district: string | null;
  status: string;
  admin_note: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export default function InstituteRequests() {
  const [requests, setRequests] = useState<InstituteRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; id: number | null; note: string }>({ open: false, id: null, note: '' });
  const { toast } = useToast();

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const status = statusFilter !== 'all' ? `&status=${statusFilter}` : '';
      const data = await apiGet(`/institute-requests?page=1&limit=100${status}`) as any;
      setRequests(data.requests || []);
      setTotal(data.total || 0);
    } catch { toast({ title: 'Error', variant: 'destructive' }); }
    finally { setLoading(false); }
  }, [statusFilter, toast]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const handleApprove = async (id: number) => {
    try {
      await apiPut(`/institute-requests/${id}/approve`, {});
      toast({ title: 'Approved! Institute added to the system.' });
      fetchRequests();
    } catch (error) {
      toast({ title: 'Error', description: error instanceof ApiError ? error.message : 'Failed', variant: 'destructive' });
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

  const statusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'approved': return <Badge className="bg-green-500/10 text-green-400 border-green-500/20"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'rejected': return <Badge className="bg-red-500/10 text-red-400 border-red-500/20"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <Card className="glass-card border-0">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" size="icon" onClick={fetchRequests} className="border-white/10">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            {['all', 'pending', 'approved', 'rejected'].map((s) => (
              <Button key={s} variant={statusFilter === s ? 'default' : 'outline'} size="sm"
                onClick={() => setStatusFilter(s)}
                className={statusFilter === s ? 'gradient-primary text-white' : 'border-white/10'}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card border-0">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Institute Requests ({total})</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Desktop */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-white/[0.06] hover:bg-transparent">
                  <TableHead className="text-muted-foreground">Institute</TableHead>
                  <TableHead className="text-muted-foreground">Requested By</TableHead>
                  <TableHead className="text-muted-foreground">Division</TableHead>
                  <TableHead className="text-muted-foreground">Status</TableHead>
                  <TableHead className="text-muted-foreground">Date</TableHead>
                  <TableHead className="text-muted-foreground text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i} className="border-white/[0.06]">
                      {Array.from({ length: 6 }).map((_, j) => (<TableCell key={j}><div className="h-5 rounded bg-white/5 animate-pulse" /></TableCell>))}
                    </TableRow>
                  ))
                ) : requests.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No requests found</TableCell></TableRow>
                ) : (
                  requests.map((req) => (
                    <TableRow key={req.id} className="border-white/[0.06] hover:bg-white/[0.03]">
                      <TableCell className="font-medium">
                        <div>{req.institute_name}</div>
                        {req.institute_name_bn && <div className="text-xs text-muted-foreground">{req.institute_name_bn}</div>}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        <div>{req.user_name || 'Unknown'}</div>
                        <div className="text-xs">{req.user_email || ''}</div>
                      </TableCell>
                      <TableCell className="text-sm">{req.division || 'N/A'}</TableCell>
                      <TableCell>{statusBadge(req.status)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{new Date(req.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        {req.status === 'pending' && (
                          <div className="flex justify-end gap-2">
                            <Button size="sm" onClick={() => handleApprove(req.id)} className="gradient-primary text-white h-7 text-xs">
                              <CheckCircle className="h-3 w-3 mr-1" /> Approve
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setRejectDialog({ open: true, id: req.id, note: '' })} className="border-red-500/30 text-red-400 h-7 text-xs">
                              <XCircle className="h-3 w-3 mr-1" /> Reject
                            </Button>
                          </div>
                        )}
                        {req.admin_note && <div className="text-xs text-muted-foreground mt-1"><MessageSquare className="h-3 w-3 inline mr-1" />{req.admin_note}</div>}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile */}
          <div className="md:hidden space-y-3">
            {loading ? Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 rounded-lg bg-white/5 animate-pulse" />) :
            requests.length === 0 ? <p className="text-center py-8 text-muted-foreground">No requests found</p> :
            requests.map((req) => (
              <div key={req.id} className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium">{req.institute_name}</p>
                    {req.institute_name_bn && <p className="text-xs text-muted-foreground">{req.institute_name_bn}</p>}
                    <p className="text-xs text-muted-foreground mt-1">By: {req.user_name || req.user_email || 'Unknown'}</p>
                  </div>
                  {statusBadge(req.status)}
                </div>
                {req.status === 'pending' && (
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" onClick={() => handleApprove(req.id)} className="gradient-primary text-white h-7 text-xs flex-1">
                      <CheckCircle className="h-3 w-3 mr-1" /> Approve
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setRejectDialog({ open: true, id: req.id, note: '' })} className="border-red-500/30 text-red-400 h-7 text-xs flex-1">
                      <XCircle className="h-3 w-3 mr-1" /> Reject
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Reject Dialog */}
      <Dialog open={rejectDialog.open} onOpenChange={(open) => setRejectDialog({ ...rejectDialog, open })}>
        <DialogContent className="bg-[#1A1A2E] border-white/10 max-w-md">
          <DialogHeader><DialogTitle>Reject Institute Request</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Reason (optional)</Label>
              <Textarea value={rejectDialog.note} onChange={(e) => setRejectDialog({ ...rejectDialog, note: e.target.value })} className="bg-white/5 border-white/10" placeholder="Why is this being rejected?" />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setRejectDialog({ open: false, id: null, note: '' })} className="flex-1 border-white/10">Cancel</Button>
              <Button onClick={handleReject} className="flex-1 bg-red-600 hover:bg-red-700 text-white">Reject</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
