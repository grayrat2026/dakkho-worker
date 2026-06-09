'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  RefreshCw,
  Plus,
  MoreVertical,
  Trash2,
  Edit,
  Upload,
  Link2,
  X,
  CheckCircle2,
  Star,
  Users,
  BookOpen,
  GraduationCap,
  AlertCircle,
  ImageIcon,
  ToggleLeft,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { apiGet, apiPost, apiPut, apiDelete, apiUpload, ApiError } from '@/lib/api-client';
import type { Instructor } from '@/lib/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function renderStars(rating: number) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  const stars = [];

  for (let i = 0; i < 5; i++) {
    if (i < full) {
      stars.push(<Star key={i} className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />);
    } else if (i === full && half) {
      stars.push(<Star key={i} className="h-3.5 w-3.5 text-amber-400 fill-amber-400/50" />);
    } else {
      stars.push(<Star key={i} className="h-3.5 w-3.5 text-muted-foreground/30" />);
    }
  }

  return (
    <div className="flex items-center gap-0.5">
      {stars}
      <span className="ml-1 text-xs text-muted-foreground">{(rating ?? 0).toFixed(1)}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// FileUploadZone
// ---------------------------------------------------------------------------

function FileUploadZone({
  bucket,
  label,
  accept,
  onUploaded,
  currentUrl,
}: {
  bucket: string;
  label: string;
  accept: string;
  onUploaded: (url: string) => void;
  currentUrl?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState(currentUrl || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setUploadedUrl(currentUrl || '');
  }, [currentUrl]);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bucket', bucket);
      const result = await apiUpload('/upload', formData) as Record<string, unknown>;
      const url = result.url as string;
      setUploadedUrl(url);
      onUploaded(url);
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Upload failed';
      console.error(message);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  };

  return (
    <div className="space-y-2">
      {label && <Label className="text-xs text-muted-foreground">{label}</Label>}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
          dragOver
            ? 'border-violet-500/50 bg-violet-500/5'
            : 'border-white/10 hover:border-white/20 hover:bg-white/[0.02]'
        } ${uploading ? 'opacity-60 pointer-events-none' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileSelect}
          className="hidden"
        />
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-muted-foreground">Uploading...</p>
          </div>
        ) : uploadedUrl ? (
          <div className="flex flex-col items-center gap-2">
            <CheckCircle2 className="h-7 w-7 text-violet-400" />
            <p className="text-xs text-muted-foreground truncate max-w-full">File uploaded</p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-xs text-violet-400 h-6"
              onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
            >
              Replace
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload className="h-7 w-7 text-muted-foreground/40" />
            <p className="text-xs text-muted-foreground">Drag & drop or click</p>
          </div>
        )}
      </div>
      {uploadedUrl && (
        <div className="flex items-center gap-2">
          <Input
            value={uploadedUrl}
            readOnly
            className="bg-white/[0.04] border-white/[0.08] text-xs font-mono h-8"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="flex-shrink-0 h-8 w-8"
            onClick={() => { setUploadedUrl(''); onUploaded(''); }}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function InstructorsTable() {
  const { toast } = useToast();

  // Data state
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editInstructor, setEditInstructor] = useState<Instructor | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [form, setForm] = useState({
    name: '',
    email: '',
    bio: '',
    specialization: '',
    avatarUrl: '',
    coverUrl: '',
    socialLinks: '',
    isActive: true,
  });

  const LIMIT = 20;

  // ---- Fetch instructors ----
  const fetchInstructors = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
      if (search) params.set('search', search);

      const data = await apiGet(`/instructors?${params}`) as Record<string, unknown>;
      const docs = (data.documents ?? data.data ?? []) as Instructor[];
      setInstructors(docs);
      setTotal((data.total as number) || docs.length);
    } catch {
      setError('Failed to load instructors');
      toast({ title: 'Error', description: 'Failed to fetch instructors', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [page, search, toast]);

  useEffect(() => { fetchInstructors(); }, [fetchInstructors]);

  // ---- Dialog helpers ----
  const openCreateDialog = () => {
    setEditInstructor(null);
    setForm({
      name: '', email: '', bio: '', specialization: '',
      avatarUrl: '', coverUrl: '', socialLinks: '', isActive: true,
    });
    setDialogOpen(true);
  };

  const openEditDialog = (inst: Instructor) => {
    setEditInstructor(inst);
    setForm({
      name: inst.name || '',
      email: inst.email || '',
      bio: inst.bio || '',
      specialization: inst.specialization || '',
      avatarUrl: inst.avatarUrl || '',
      coverUrl: inst.coverUrl || '',
      socialLinks: inst.socialLinks || '',
      isActive: inst.isActive,
    });
    setDialogOpen(true);
  };

  // ---- Save ----
  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ title: 'Validation', description: 'Name is required', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name,
        email: form.email || undefined,
        bio: form.bio || undefined,
        specialization: form.specialization || undefined,
        avatarUrl: form.avatarUrl || undefined,
        coverUrl: form.coverUrl || undefined,
        socialLinks: form.socialLinks || undefined,
        isActive: form.isActive,
      };

      if (editInstructor) {
        await apiPut('/instructors', { instructorId: editInstructor.id, ...payload });
      } else {
        await apiPost('/instructors', payload);
      }
      toast({ title: 'Success', description: `Instructor ${editInstructor ? 'updated' : 'created'}` });
      setDialogOpen(false);
      fetchInstructors();
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Network error';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  // ---- Delete ----
  const deleteInstructor = async (id: string) => {
    if (!confirm('Delete this instructor?')) return;
    try {
      await apiDelete(`/instructors?id=${id}`);
      toast({ title: 'Deleted', description: 'Instructor removed' });
      fetchInstructors();
    } catch {
      toast({ title: 'Error', description: 'Failed to delete instructor', variant: 'destructive' });
    }
  };

  // ---- Toggle active ----
  const toggleActive = async (inst: Instructor) => {
    try {
      await apiPut('/instructors', { instructorId: inst.id, isActive: !inst.isActive });
      toast({ title: 'Success', description: inst.isActive ? 'Deactivated' : 'Activated' });
      fetchInstructors();
    } catch {
      toast({ title: 'Error', description: 'Failed to update', variant: 'destructive' });
    }
  };

  const totalPages = Math.ceil(total / LIMIT);

  // ---- Animation variants ----
  const rowVariants = {
    hidden: { opacity: 0, y: 8 },
    visible: (i: number) => ({
      opacity: 1, y: 0,
      transition: { delay: i * 0.03, duration: 0.3 },
    }),
    exit: { opacity: 0, transition: { duration: 0.15 } },
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-4"
    >
      {/* ===== Page Header ===== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
            <GraduationCap className="h-5 w-5 text-violet-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Instructors</h2>
            <p className="text-sm text-muted-foreground">{total} total instructors</p>
          </div>
        </div>
        <Button onClick={openCreateDialog} className="gradient-primary text-white self-start sm:self-auto">
          <Plus className="h-4 w-4 mr-2" /> Add Instructor
        </Button>
      </div>

      {/* ===== Filters ===== */}
      <Card className="glass-card border-0">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search instructors..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-9 bg-white/[0.04] border-white/[0.08]"
              />
            </div>
            <Button variant="outline" size="icon" onClick={fetchInstructors} className="border-white/[0.08] self-start">
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ===== Data Table ===== */}
      <Card className="glass-card border-0">
        <CardContent className="p-0">
          {/* Error State */}
          {error && !loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <AlertCircle className="h-10 w-10 text-destructive/60" />
              <p className="text-muted-foreground">{error}</p>
              <Button variant="outline" onClick={fetchInstructors} className="border-white/[0.08]">
                <RefreshCw className="h-4 w-4 mr-2" /> Retry
              </Button>
            </div>
          )}

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-white/[0.06] hover:bg-transparent">
                  <TableHead className="text-muted-foreground">Instructor</TableHead>
                  <TableHead className="text-muted-foreground">Email</TableHead>
                  <TableHead className="text-muted-foreground">Specialization</TableHead>
                  <TableHead className="text-muted-foreground">Rating</TableHead>
                  <TableHead className="text-muted-foreground">Students</TableHead>
                  <TableHead className="text-muted-foreground">Courses</TableHead>
                  <TableHead className="text-muted-foreground text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i} className="border-white/[0.06]">
                      {Array.from({ length: 7 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-5 w-full max-w-[120px] bg-white/5" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : instructors.length === 0 && !error ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-16">
                      <div className="flex flex-col items-center gap-3">
                        <GraduationCap className="h-10 w-10 text-muted-foreground/30" />
                        <p className="text-muted-foreground">No instructors found</p>
                        <Button variant="outline" size="sm" onClick={openCreateDialog} className="border-white/[0.08]">
                          <Plus className="h-3.5 w-3.5 mr-1.5" /> Add your first instructor
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  <AnimatePresence>
                    {instructors.map((inst, i) => (
                      <motion.tr
                        key={inst.id}
                        custom={i}
                        variants={rowVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="border-white/[0.06] hover:bg-white/[0.03] transition-colors"
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-3">
                            <div className="relative flex-shrink-0">
                              {inst.avatarUrl ? (
                                <img
                                  src={inst.avatarUrl}
                                  alt={inst.name}
                                  className="w-9 h-9 rounded-full object-cover border border-white/[0.08]"
                                />
                              ) : (
                                <div className="w-9 h-9 rounded-full bg-violet-500/15 flex items-center justify-center text-sm font-semibold text-violet-400">
                                  {inst.name?.charAt(0).toUpperCase() || 'I'}
                                </div>
                              )}
                              <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#1A1A2E] ${
                                inst.isActive ? 'bg-emerald-400' : 'bg-gray-500'
                              }`} />
                            </div>
                            <span className="truncate max-w-[160px]">{inst.name || 'Unknown'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {inst.email || '—'}
                        </TableCell>
                        <TableCell>
                          {inst.specialization ? (
                            <Badge variant="secondary" className="bg-violet-500/10 text-violet-400 text-xs">
                              {inst.specialization}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground/40 text-xs">—</span>
                          )}
                        </TableCell>
                        <TableCell>{renderStars(inst.rating ?? 0)}</TableCell>
                        <TableCell className="text-sm">
                          <div className="flex items-center gap-1">
                            <Users className="h-3.5 w-3.5 text-muted-foreground" />
                            {inst.totalStudents ?? 0}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          <div className="flex items-center gap-1">
                            <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                            {inst.totalCourses ?? 0}
                          </div>
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
                              <DropdownMenuItem onClick={() => toggleActive(inst)}>
                                <ToggleLeft className="h-4 w-4 mr-2" />
                                {inst.isActive ? 'Deactivate' : 'Activate'}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => deleteInstructor(inst.id)} className="text-destructive">
                                <Trash2 className="h-4 w-4 mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile Card Layout */}
          <div className="md:hidden p-4 space-y-3">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-lg bg-white/5" />
              ))
            ) : instructors.length === 0 && !error ? (
              <div className="flex flex-col items-center py-16 gap-3">
                <GraduationCap className="h-10 w-10 text-muted-foreground/30" />
                <p className="text-muted-foreground">No instructors found</p>
              </div>
            ) : (
              <AnimatePresence>
                {instructors.map((inst, i) => (
                  <motion.div
                    key={inst.id}
                    custom={i}
                    variants={rowVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          {inst.avatarUrl ? (
                            <img
                              src={inst.avatarUrl}
                              alt={inst.name}
                              className="w-8 h-8 rounded-full object-cover border border-white/[0.08]"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-violet-500/15 flex items-center justify-center text-xs font-semibold text-violet-400">
                              {inst.name?.charAt(0).toUpperCase() || 'I'}
                            </div>
                          )}
                          <p className="text-sm font-medium truncate">{inst.name || 'Unknown'}</p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{inst.email || 'No email'}</p>
                        {inst.specialization && (
                          <Badge variant="secondary" className="bg-violet-500/10 text-violet-400 text-[10px] mt-1.5">
                            {inst.specialization}
                          </Badge>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" /> {inst.totalStudents ?? 0}
                          </span>
                          <span className="flex items-center gap-1">
                            <BookOpen className="h-3 w-3" /> {inst.totalCourses ?? 0}
                          </span>
                          <span className="flex items-center gap-0.5">
                            <Star className="h-3 w-3 text-amber-400 fill-amber-400" /> {(inst.rating ?? 0).toFixed(1)}
                          </span>
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
                          <DropdownMenuItem onClick={() => deleteInstructor(inst.id)} className="text-destructive">
                            <Trash2 className="h-4 w-4 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.06]">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="border-white/[0.08]"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="border-white/[0.08]"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ===== Add/Edit Dialog ===== */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-[#1A1A2E] border-white/[0.08] max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-violet-400" />
              {editInstructor ? 'Edit Instructor' : 'Add Instructor'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {/* Name */}
            <div className="space-y-2">
              <Label>Name <span className="text-destructive">*</span></Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Instructor name"
                className="bg-white/[0.04] border-white/[0.08]"
              />
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="instructor@example.com"
                className="bg-white/[0.04] border-white/[0.08]"
              />
            </div>

            {/* Specialization */}
            <div className="space-y-2">
              <Label>Specialization</Label>
              <Input
                value={form.specialization}
                onChange={(e) => setForm((f) => ({ ...f, specialization: e.target.value }))}
                placeholder="e.g. Web Development, Data Science"
                className="bg-white/[0.04] border-white/[0.08]"
              />
            </div>

            {/* Bio */}
            <div className="space-y-2">
              <Label>Bio</Label>
              <Textarea
                value={form.bio}
                onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
                className="bg-white/[0.04] border-white/[0.08]"
                rows={3}
                placeholder="Brief biography..."
              />
            </div>

            {/* Avatar: Upload or Link */}
            <div className="space-y-2">
              <Label>Avatar</Label>
              <Tabs defaultValue={form.avatarUrl ? 'link' : 'upload'} className="w-full">
                <TabsList className="bg-white/[0.04] border border-white/[0.08] w-full">
                  <TabsTrigger value="upload" className="flex-1 data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-400">
                    <Upload className="h-3.5 w-3.5 mr-1.5" /> Upload
                  </TabsTrigger>
                  <TabsTrigger value="link" className="flex-1 data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-400">
                    <Link2 className="h-3.5 w-3.5 mr-1.5" /> Link
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="upload" className="mt-3">
                  <FileUploadZone
                    bucket="avatars"
                    label=""
                    accept="image/*"
                    onUploaded={(url) => setForm((f) => ({ ...f, avatarUrl: url }))}
                    currentUrl={form.avatarUrl}
                  />
                </TabsContent>
                <TabsContent value="link" className="mt-3">
                  <Input
                    value={form.avatarUrl}
                    onChange={(e) => setForm((f) => ({ ...f, avatarUrl: e.target.value }))}
                    className="bg-white/[0.04] border-white/[0.08]"
                    placeholder="https://example.com/avatar.jpg"
                  />
                </TabsContent>
              </Tabs>
            </div>

            {/* Cover: Upload or Link */}
            <div className="space-y-2">
              <Label>Cover Image</Label>
              <Tabs defaultValue={form.coverUrl ? 'link' : 'upload'} className="w-full">
                <TabsList className="bg-white/[0.04] border border-white/[0.08] w-full">
                  <TabsTrigger value="upload" className="flex-1 data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-400">
                    <ImageIcon className="h-3.5 w-3.5 mr-1.5" /> Upload
                  </TabsTrigger>
                  <TabsTrigger value="link" className="flex-1 data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-400">
                    <Link2 className="h-3.5 w-3.5 mr-1.5" /> Link
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="upload" className="mt-3">
                  <FileUploadZone
                    bucket="covers"
                    label=""
                    accept="image/*"
                    onUploaded={(url) => setForm((f) => ({ ...f, coverUrl: url }))}
                    currentUrl={form.coverUrl}
                  />
                </TabsContent>
                <TabsContent value="link" className="mt-3">
                  <Input
                    value={form.coverUrl}
                    onChange={(e) => setForm((f) => ({ ...f, coverUrl: e.target.value }))}
                    className="bg-white/[0.04] border-white/[0.08]"
                    placeholder="https://example.com/cover.jpg"
                  />
                </TabsContent>
              </Tabs>
            </div>

            {/* Social Links */}
            <div className="space-y-2">
              <Label>Social Links</Label>
              <Textarea
                value={form.socialLinks}
                onChange={(e) => setForm((f) => ({ ...f, socialLinks: e.target.value }))}
                className="bg-white/[0.04] border-white/[0.08] font-mono text-sm"
                rows={3}
                placeholder='{"twitter": "https://...", "linkedin": "https://...", "website": "https://..."}'
              />
              <p className="text-[10px] text-muted-foreground/60">Enter as JSON object with platform names as keys</p>
            </div>

            {/* Active toggle */}
            <div className="flex items-center justify-between rounded-lg bg-white/[0.02] border border-white/[0.06] p-3">
              <Label className="text-sm">Active</Label>
              <Switch checked={form.isActive} onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))} />
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="border-white/[0.08]">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="gradient-primary text-white">
              {saving ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
              ) : null}
              {editInstructor ? 'Update' : 'Create'} Instructor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
