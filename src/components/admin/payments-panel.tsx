'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, CheckCircle, XCircle, RotateCcw, CreditCard, Settings } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { apiGet, apiPut, ApiError } from '@/lib/api-client';

interface Payment {
  id: number;
  user_id: string;
  package_id: number | null;
  course_id: string | null;
  amount: number;
  currency: string;
  gateway: string;
  gateway_trx_id: string | null;
  status: string;
  trx_id_submitted: string | null;
  phone_submitted: string | null;
  verified_by: string | null;
  verified_at: string | null;
  created_at: string;
}

export default function PaymentsPanel() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [configOpen, setConfigOpen] = useState(false);
  const [configs, setConfigs] = useState<any[]>([]);
  const { toast } = useToast();

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const status = statusFilter !== 'all' ? `&status=${statusFilter}` : '';
      const data = await apiGet(`/payments?page=1&limit=100${status}`) as any;
      setPayments(data.payments || []);
      setTotal(data.total || 0);
    } catch { toast({ title: 'Error', variant: 'destructive' }); }
    finally { setLoading(false); }
  }, [statusFilter, toast]);

  const fetchConfig = useCallback(async () => {
    try {
      const data = await apiGet('/payments/config') as any;
      setConfigs(data.configs || []);
    } catch {}
  }, []);

  useEffect(() => { fetchPayments(); fetchConfig(); }, [fetchPayments, fetchConfig]);

  const handleVerify = async (id: number) => {
    try { await apiPut(`/payments/${id}/verify`, {}); toast({ title: 'Payment verified & package activated!' }); fetchPayments(); }
    catch { toast({ title: 'Error', variant: 'destructive' }); }
  };

  const handleReject = async (id: number) => {
    if (!confirm('Reject this payment?')) return;
    try { await apiPut(`/payments/${id}/reject`, { reason: 'Rejected by admin' }); toast({ title: 'Payment rejected' }); fetchPayments(); }
    catch { toast({ title: 'Error', variant: 'destructive' }); }
  };

  const handleRefund = async (id: number) => {
    if (!confirm('Refund this payment? This will deactivate the user package.')) return;
    try { await apiPut(`/payments/${id}/refund`, { reason: 'Refunded by admin' }); toast({ title: 'Payment refunded' }); fetchPayments(); }
    catch { toast({ title: 'Error', variant: 'destructive' }); }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
      verified: 'bg-green-500/10 text-green-400 border-green-500/20',
      failed: 'bg-red-500/10 text-red-400 border-red-500/20',
      refunded: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    };
    return <Badge className={map[status] || 'bg-white/5'}>{status}</Badge>;
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <Card className="glass-card border-0">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" size="icon" onClick={fetchPayments} className="border-white/10"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></Button>
            {['all', 'pending', 'verified', 'failed', 'refunded'].map((s) => (
              <Button key={s} variant={statusFilter === s ? 'default' : 'outline'} size="sm"
                onClick={() => setStatusFilter(s)}
                className={statusFilter === s ? 'gradient-primary text-white' : 'border-white/10'}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </Button>
            ))}
            <Button variant="outline" size="sm" onClick={() => { fetchConfig(); setConfigOpen(true); }} className="border-white/10 ml-auto">
              <Settings className="h-4 w-4 mr-2" /> Payment Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card border-0">
        <CardHeader className="pb-3"><CardTitle className="text-lg flex items-center gap-2"><CreditCard className="h-5 w-5 text-dakkho-blue" />Payments ({total})</CardTitle></CardHeader>
        <CardContent>
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader><TableRow className="border-white/[0.06] hover:bg-transparent">
                <TableHead className="text-muted-foreground">TrxID</TableHead>
                <TableHead className="text-muted-foreground">Amount</TableHead>
                <TableHead className="text-muted-foreground">Gateway</TableHead>
                <TableHead className="text-muted-foreground">Phone</TableHead>
                <TableHead className="text-muted-foreground">Status</TableHead>
                <TableHead className="text-muted-foreground">Date</TableHead>
                <TableHead className="text-muted-foreground text-right">Actions</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {loading ? Array.from({ length: 3 }).map((_, i) => <TableRow key={i} className="border-white/[0.06]">{Array.from({ length: 7 }).map((_, j) => <TableCell key={j}><div className="h-5 rounded bg-white/5 animate-pulse" /></TableCell>)}</TableRow>) :
                payments.length === 0 ? <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No payments</TableCell></TableRow> :
                payments.map((p) => (
                  <TableRow key={p.id} className="border-white/[0.06] hover:bg-white/[0.03]">
                    <TableCell className="font-mono text-sm">{p.trx_id_submitted || p.gateway_trx_id || 'N/A'}</TableCell>
                    <TableCell className="font-semibold">৳{p.amount}</TableCell>
                    <TableCell className="capitalize text-sm">{p.gateway}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.phone_submitted || '—'}</TableCell>
                    <TableCell>{statusBadge(p.status)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      {p.status === 'pending' && (
                        <div className="flex justify-end gap-1">
                          <Button size="sm" onClick={() => handleVerify(p.id)} className="gradient-primary text-white h-7 text-xs"><CheckCircle className="h-3 w-3 mr-1" />Verify</Button>
                          <Button size="sm" variant="outline" onClick={() => handleReject(p.id)} className="border-red-500/30 text-red-400 h-7 text-xs"><XCircle className="h-3 w-3 mr-1" />Reject</Button>
                        </div>
                      )}
                      {p.status === 'verified' && (
                        <Button size="sm" variant="ghost" onClick={() => handleRefund(p.id)} className="h-7 text-xs text-purple-400"><RotateCcw className="h-3 w-3 mr-1" />Refund</Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="md:hidden space-y-3">
            {loading ? Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 rounded-lg bg-white/5 animate-pulse" />) :
            payments.length === 0 ? <p className="text-center py-8 text-muted-foreground">No payments</p> :
            payments.map((p) => (
              <div key={p.id} className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                <div className="flex justify-between items-start">
                  <div><p className="font-mono text-sm">{p.trx_id_submitted || 'N/A'}</p><p className="font-semibold">৳{p.amount}</p></div>
                  {statusBadge(p.status)}
                </div>
                <div className="flex gap-2 mt-2">
                  {p.status === 'pending' && <>
                    <Button size="sm" onClick={() => handleVerify(p.id)} className="gradient-primary text-white h-7 text-xs flex-1"><CheckCircle className="h-3 w-3 mr-1" />Verify</Button>
                    <Button size="sm" variant="outline" onClick={() => handleReject(p.id)} className="border-red-500/30 text-red-400 h-7 text-xs flex-1"><XCircle className="h-3 w-3 mr-1" />Reject</Button>
                  </>}
                  {p.status === 'verified' && <Button size="sm" variant="ghost" onClick={() => handleRefund(p.id)} className="h-7 text-xs text-purple-400"><RotateCcw className="h-3 w-3 mr-1" />Refund</Button>}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Payment Config Dialog */}
      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent className="bg-[#1A1A2E] border-white/10 max-w-lg">
          <DialogHeader><DialogTitle>Payment Gateway Settings</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-4">
            {configs.map((cfg) => (
              <div key={cfg.id} className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium capitalize">{cfg.gateway}</span>
                    {cfg.is_active ? <Badge className="bg-green-500/10 text-green-400 border-green-500/20">Active</Badge> : <Badge className="bg-white/5 text-white/40">Inactive</Badge>}
                    {cfg.sandbox_mode ? <Badge className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20">Sandbox</Badge> : null}
                  </div>
                  <Button size="sm" variant="outline" className="border-white/10 text-xs h-7"
                    onClick={async () => {
                      const guide = await apiGet(`/payments/config/${cfg.gateway}/setup-guide`) as any;
                      toast({ title: guide.title, description: guide.steps?.join('. ') });
                    }}>
                    Setup Guide
                  </Button>
                </div>
                {cfg.instructions && <p className="text-xs text-muted-foreground">{cfg.instructions}</p>}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
