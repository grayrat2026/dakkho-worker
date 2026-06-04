'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Plus, MoreVertical, Trash2, Edit, Search, Building2, MapPin, BadgeCheck, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiGet, apiPost, apiPut, apiDelete, ApiError } from '@/lib/api-client';

interface Institute {
  id: number;
  name: string;
  name_bn: string | null;
  division: string | null;
  district: string | null;
  eiin_number: string | null;
  type: string;
  is_requested: number;
  requested_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export default function InstitutesTable() {
  const [institutes, setInstitutes] = useState<Institute[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editInstitute, setEditInstitute] = useState<Institute | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  const [form, setForm] = useState({
    name: '',
    name_bn: '',
    division: '',
    district: '',
    type: 'polytechnic',
    eiin_number: '',
  });

  const fetchInstitutes = useCallback(async () => {
    setLoading(true);
    try {
      // Use student API (no auth needed for reading institutes)
      const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '';
      const baseUrl = API_BASE.replace(/\/+$/, '');
      const url = `${baseUrl}/api/institutes?page=${page}&limit=20${searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : ''}`;
      const res = await fetch(url);
      const data = await res.json();
      setInstitutes((data.institutes as Institute[]) || []);
      setTotal((data.total as number) || 0);
    } catch {
      toast({ title: 'Error loading institutes', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, toast]);

  useEffect(() => { fetchInstitutes(); }, [fetchInstitutes]);

  const openCreateDialog = () => {
    setEditInstitute(null);
    setForm({ name: '', name_bn: '', division: '', district: '', type: 'polytechnic', eiin_number: '' });
    setDialogOpen(true);
  };

  const openEditDialog = (inst: Institute) => {
    setEditInstitute(inst);
    setForm({
      name: inst.name || '',
      name_bn: inst.name_bn || '',
      division: inst.division || '',
      district: inst.district || '',
      type: inst.type || 'polytechnic',
      eiin_number: inst.eiin_number || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editInstitute) {
        // Update via admin D1 API - we need a dedicated endpoint
        // For now, use the existing Appwrite-based update
        await apiPut('/institutes', { instituteId: editInstitute.id, ...form });
      } else {
        await apiPost('/institutes', form);
      }
      toast({ title: 'Success' });
      setDialogOpen(false);
      fetchInstitutes();
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Failed';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    }
  };

  const deleteInstitute = async (id: number) => {
    if (!confirm('Delete this institute?')) return;
    try {
      await apiDelete(`/institutes?id=${id}`);
      toast({ title: 'Deleted' });
      fetchInstitutes();
    } catch {
      toast({ title: 'Error', variant: 'destructive' });
    }
  };

  const divisionColors: Record<string, string> = {
    'ঢাকা': 'bg-blue-500/10 text-blue-400',
    'চট্টগ্রাম': 'bg-green-500/10 text-green-400',
    'রাজশাহী': 'bg-purple-500/10 text-purple-400',
    'খুলনা': 'bg-orange-500/10 text-orange-400',
    'বরিশাল': 'bg-cyan-500/10 text-cyan-400',
    'সিলেট': 'bg-emerald-500/10 text-emerald-400',
    'রংপুর': 'bg-rose-500/10 text-rose-400',
    'ময়মনসিংহ': 'bg-amber-500/10 text-amber-400',
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <Card className="glass-card border-0">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" size="icon" onClick={fetchInstitutes} className="border-white/10">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search institutes..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                className="pl-10 bg-white/5 border-white/10"
              />
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openCreateDialog} className="gradient-primary text-white">
                  <Plus className="h-4 w-4 mr-2" /> Add Institute
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#1A1A2E] border-white/10 max-w-md">
                <DialogHeader>
                  <DialogTitle>{editInstitute ? 'Edit Institute' : 'Add Institute'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Name (English)</Label>
                    <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-white/5 border-white/10" placeholder="e.g. Dhaka Polytechnic Institute" />
                  </div>
                  <div className="space-y-2">
                    <Label>Name (বাংলা)</Label>
                    <Input value={form.name_bn} onChange={(e) => setForm({ ...form, name_bn: e.target.value })} className="bg-white/5 border-white/10" placeholder="যেমন: ঢাকা পলিটেকনিক ইনস্টিটিউট" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Division</Label>
                      <Input value={form.division} onChange={(e) => setForm({ ...form, division: e.target.value })} className="bg-white/5 border-white/10" placeholder="ঢাকা" />
                    </div>
                    <div className="space-y-2">
                      <Label>District</Label>
                      <Input value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} className="bg-white/5 border-white/10" placeholder="ঢাকা" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="w-full h-9 rounded-md bg-white/5 border border-white/10 px-3 text-sm">
                        <option value="polytechnic">Polytechnic</option>
                        <option value="technical_college">Technical College</option>
                        <option value="vocational">Vocational</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label>EIIN Number</Label>
                      <Input value={form.eiin_number} onChange={(e) => setForm({ ...form, eiin_number: e.target.value })} className="bg-white/5 border-white/10" placeholder="Optional" />
                    </div>
                  </div>
                  <Button onClick={handleSave} className="w-full gradient-primary text-white">
                    {editInstitute ? 'Update' : 'Create'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card border-0">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="h-5 w-5 text-dakkho-blue" />
            Institutes ({total})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-white/[0.06] hover:bg-transparent">
                  <TableHead className="text-muted-foreground">Name</TableHead>
                  <TableHead className="text-muted-foreground">Division</TableHead>
                  <TableHead className="text-muted-foreground">District</TableHead>
                  <TableHead className="text-muted-foreground">Type</TableHead>
                  <TableHead className="text-muted-foreground">Status</TableHead>
                  <TableHead className="text-muted-foreground text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i} className="border-white/[0.06]">
                      {Array.from({ length: 6 }).map((_, j) => (
                        <TableCell key={j}><div className="h-5 rounded bg-white/5 animate-pulse" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : institutes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No institutes found
                    </TableCell>
                  </TableRow>
                ) : (
                  institutes.map((inst) => (
                    <TableRow key={inst.id} className="border-white/[0.06] hover:bg-white/[0.03]">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-xs font-semibold text-amber-400">
                            {inst.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span>{inst.name}</span>
                              {inst.is_requested === 1 && (
                                <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/20 text-[10px] px-1.5 py-0">
                                  NEW
                                </Badge>
                              )}
                            </div>
                            {inst.name_bn && (
                              <span className="text-xs text-muted-foreground">{inst.name_bn}</span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {inst.division && (
                          <Badge variant="outline" className={`${divisionColors[inst.division] || 'bg-white/5 text-white/60'} border-0 text-xs`}>
                            <MapPin className="h-3 w-3 mr-1" />
                            {inst.division}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{inst.district || 'N/A'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-white/5 text-white/60 border-white/10 text-xs capitalize">
                          {inst.type.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {inst.is_active ? (
                          <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/20 text-xs">
                            <BadgeCheck className="h-3 w-3 mr-1" /> Active
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/20 text-xs">
                            Inactive
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-[#1A1A2E] border-white/10">
                            <DropdownMenuItem onClick={() => openEditDialog(inst)}>
                              <Edit className="h-4 w-4 mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => deleteInstitute(inst.id)} className="text-destructive">
                              <Trash2 className="h-4 w-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card Layout */}
          <div className="md:hidden space-y-3">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-24 rounded-lg bg-white/5 animate-pulse" />
              ))
            ) : institutes.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No institutes found</p>
            ) : (
              institutes.map((inst) => (
                <div key={inst.id} className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center text-xs font-semibold text-amber-400">
                          {inst.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-medium truncate">{inst.name}</p>
                            {inst.is_requested === 1 && (
                              <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/20 text-[9px] px-1 py-0">
                                NEW
                              </Badge>
                            )}
                          </div>
                          {inst.name_bn && (
                            <p className="text-xs text-muted-foreground truncate">{inst.name_bn}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {inst.division && (
                          <Badge variant="outline" className={`${divisionColors[inst.division] || 'bg-white/5 text-white/60'} border-0 text-[10px]`}>
                            {inst.division}
                          </Badge>
                        )}
                        {inst.district && (
                          <span className="text-[10px] text-muted-foreground">{inst.district}</span>
                        )}
                        <Badge variant="outline" className="bg-white/5 text-white/60 border-white/10 text-[10px] capitalize">
                          {inst.type.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-[#1A1A2E] border-white/10">
                        <DropdownMenuItem onClick={() => openEditDialog(inst)}>
                          <Edit className="h-4 w-4 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => deleteInstitute(inst.id)} className="text-destructive">
                          <Trash2 className="h-4 w-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Pagination */}
          {total > 20 && (
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/[0.06]">
              <p className="text-sm text-muted-foreground">
                Showing {((page - 1) * 20) + 1}–{Math.min(page * 20, total)} of {total}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                  className="border-white/10"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page * 20 >= total}
                  onClick={() => setPage(p => p + 1)}
                  className="border-white/10"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
