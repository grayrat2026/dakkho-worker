'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Plus, MoreVertical, Trash2, Edit, Search, Cpu, BadgeCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { apiPost, apiPut, apiDelete, ApiError } from '@/lib/api-client';

interface Technology {
  id: number;
  name: string;
  name_bn: string | null;
  short_code: string | null;
  description: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

const techColors: Record<string, string> = {
  CIVIL: 'bg-amber-500/10 text-amber-400',
  CST: 'bg-blue-500/10 text-blue-400',
  ELECTRICAL: 'bg-yellow-500/10 text-yellow-400',
  EMED: 'bg-rose-500/10 text-rose-400',
  ELEX: 'bg-purple-500/10 text-purple-400',
  MECH: 'bg-orange-500/10 text-orange-400',
  POWER: 'bg-green-500/10 text-green-400',
};

const techIcons: Record<string, string> = {
  CIVIL: '🏗️',
  CST: '💻',
  ELECTRICAL: '⚡',
  EMED: '🏥',
  ELEX: '📡',
  MECH: '⚙️',
  POWER: '🔌',
};

export default function TechnologiesTable() {
  const [technologies, setTechnologies] = useState<Technology[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTech, setEditTech] = useState<Technology | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  const [form, setForm] = useState({
    name: '',
    name_bn: '',
    short_code: '',
    description: '',
  });

  const fetchTechnologies = useCallback(async () => {
    setLoading(true);
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '';
      const baseUrl = API_BASE.replace(/\/+$/, '');
      const url = `${baseUrl}/api/technologies`;
      const res = await fetch(url);
      const data = await res.json();
      setTechnologies((data.technologies as Technology[]) || []);
    } catch {
      toast({ title: 'Error loading technologies', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchTechnologies(); }, [fetchTechnologies]);

  const openCreateDialog = () => {
    setEditTech(null);
    setForm({ name: '', name_bn: '', short_code: '', description: '' });
    setDialogOpen(true);
  };

  const openEditDialog = (tech: Technology) => {
    setEditTech(tech);
    setForm({
      name: tech.name || '',
      name_bn: tech.name_bn || '',
      short_code: tech.short_code || '',
      description: tech.description || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    try {
      if (!form.name.trim()) {
        toast({ title: 'Name is required', variant: 'destructive' });
        return;
      }
      if (editTech) {
        await apiPut('/technologies', { technologyId: editTech.id, ...form });
      } else {
        await apiPost('/technologies', form);
      }
      toast({ title: editTech ? 'Technology updated' : 'Technology created' });
      setDialogOpen(false);
      fetchTechnologies();
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Failed';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    }
  };

  const deleteTechnology = async (id: number) => {
    if (!confirm('Delete this technology?')) return;
    try {
      await apiDelete(`/technologies?id=${id}`);
      toast({ title: 'Deleted' });
      fetchTechnologies();
    } catch {
      toast({ title: 'Error', variant: 'destructive' });
    }
  };

  const toggleActive = async (tech: Technology) => {
    try {
      await apiPut('/technologies', { technologyId: tech.id, is_active: tech.is_active ? 0 : 1 });
      toast({ title: tech.is_active ? 'Deactivated' : 'Activated' });
      fetchTechnologies();
    } catch {
      toast({ title: 'Error', variant: 'destructive' });
    }
  };

  const filteredTechnologies = technologies.filter((tech) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      tech.name.toLowerCase().includes(q) ||
      (tech.name_bn && tech.name_bn.toLowerCase().includes(q)) ||
      (tech.short_code && tech.short_code.toLowerCase().includes(q))
    );
  });

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <Card className="glass-card border-0">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" size="icon" onClick={fetchTechnologies} className="border-white/10">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search technologies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white/5 border-white/10"
              />
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openCreateDialog} className="gradient-primary text-white">
                  <Plus className="h-4 w-4 mr-2" /> Add Technology
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#1A1A2E] border-white/10 max-w-md">
                <DialogHeader>
                  <DialogTitle>{editTech ? 'Edit Technology' : 'Add Technology'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Name (English)</Label>
                    <Input
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="bg-white/5 border-white/10"
                      placeholder="e.g. Computer Science"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Name (বাংলা)</Label>
                    <Input
                      value={form.name_bn}
                      onChange={(e) => setForm({ ...form, name_bn: e.target.value })}
                      className="bg-white/5 border-white/10"
                      placeholder="যেমন: কম্পিউটার সায়েন্স"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Short Code</Label>
                    <Input
                      value={form.short_code}
                      onChange={(e) => setForm({ ...form, short_code: e.target.value.toUpperCase() })}
                      className="bg-white/5 border-white/10"
                      placeholder="e.g. CST"
                      maxLength={10}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      className="bg-white/5 border-white/10 min-h-[80px]"
                      placeholder="Brief description of this technology..."
                    />
                  </div>
                  <Button onClick={handleSave} className="w-full gradient-primary text-white">
                    {editTech ? 'Update' : 'Create'}
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
            <Cpu className="h-5 w-5 text-dakkho-blue" />
            Technologies ({filteredTechnologies.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-white/[0.06] hover:bg-transparent">
                  <TableHead className="text-muted-foreground">Technology</TableHead>
                  <TableHead className="text-muted-foreground">Short Code</TableHead>
                  <TableHead className="text-muted-foreground">Description</TableHead>
                  <TableHead className="text-muted-foreground">Status</TableHead>
                  <TableHead className="text-muted-foreground text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i} className="border-white/[0.06]">
                      {Array.from({ length: 5 }).map((_, j) => (
                        <TableCell key={j}><div className="h-5 rounded bg-white/5 animate-pulse" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : filteredTechnologies.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No technologies found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTechnologies.map((tech) => (
                    <TableRow key={tech.id} className="border-white/[0.06] hover:bg-white/[0.03]">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-lg ${(techColors[tech.short_code || ''] || 'bg-white/5 text-white/60')} flex items-center justify-center text-lg`}>
                            {techIcons[tech.short_code || ''] || tech.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium">{tech.name}</div>
                            {tech.name_bn && (
                              <span className="text-xs text-muted-foreground">{tech.name_bn}</span>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`${techColors[tech.short_code || ''] || 'bg-white/5 text-white/60'} border-0 font-mono text-xs`}>
                          {tech.short_code || 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {tech.description || '—'}
                      </TableCell>
                      <TableCell>
                        {tech.is_active ? (
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
                            <DropdownMenuItem onClick={() => openEditDialog(tech)}>
                              <Edit className="h-4 w-4 mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toggleActive(tech)}>
                              {tech.is_active ? 'Deactivate' : 'Activate'}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => deleteTechnology(tech.id)} className="text-destructive">
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
                <div key={i} className="h-20 rounded-lg bg-white/5 animate-pulse" />
              ))
            ) : filteredTechnologies.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No technologies found</p>
            ) : (
              filteredTechnologies.map((tech) => (
                <div key={tech.id} className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-lg ${(techColors[tech.short_code || ''] || 'bg-white/5 text-white/60')} flex items-center justify-center text-base flex-shrink-0`}>
                          {techIcons[tech.short_code || ''] || tech.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-medium truncate">{tech.name}</p>
                          </div>
                          {tech.name_bn && (
                            <p className="text-xs text-muted-foreground truncate">{tech.name_bn}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <Badge variant="outline" className={`${techColors[tech.short_code || ''] || 'bg-white/5 text-white/60'} border-0 font-mono text-[10px]`}>
                          {tech.short_code || 'N/A'}
                        </Badge>
                        {tech.is_active ? (
                          <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/20 text-[10px]">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/20 text-[10px]">
                            Inactive
                          </Badge>
                        )}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-[#1A1A2E] border-white/10">
                        <DropdownMenuItem onClick={() => openEditDialog(tech)}>
                          <Edit className="h-4 w-4 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toggleActive(tech)}>
                          {tech.is_active ? 'Deactivate' : 'Activate'}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => deleteTechnology(tech.id)} className="text-destructive">
                          <Trash2 className="h-4 w-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
