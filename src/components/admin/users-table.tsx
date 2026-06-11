'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  RefreshCw,
  Download,
  Users,
  AlertTriangle,
  UserPlus,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { apiGet, apiPut, apiDelete } from '@/lib/api-client';
import type { User } from '@/lib/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Map API response to D1-native User type */
function mapUser(doc: Record<string, unknown>): User {
  return {
    id: String(doc.id ?? ''),
    email: String(doc.email ?? ''),
    fullName: String(doc.fullName ?? ''),
    phone: doc.phone ? String(doc.phone) : undefined,
    bio: doc.bio ? String(doc.bio) : undefined,
    instituteId: doc.instituteId ? Number(doc.instituteId) : undefined,
    instituteName: doc.instituteName ? String(doc.instituteName) : undefined,
    technology: doc.technology ? String(doc.technology) : undefined,
    technologyName: doc.technologyName ? String(doc.technologyName) : undefined,
    semester: doc.semester ? Number(doc.semester) : undefined,
    avatarUrl: doc.avatarUrl ? String(doc.avatarUrl) : undefined,
    role: (doc.role as User['role']) ?? 'student',
    emailVerified: Boolean(doc.emailVerified),
    isActive: Boolean(doc.isActive),
    enrolledCourseIds: doc.enrolledCourseIds ? String(doc.enrolledCourseIds) : undefined,
    createdAt: String(doc.createdAt ?? ''),
    updatedAt: String(doc.updatedAt ?? ''),
  };
}

const PAGE_SIZE = 20;

const roleBadgeStyles: Record<string, string> = {
  admin: 'bg-dakkho-danger/15 text-dakkho-danger border-dakkho-danger/20',
  instructor: 'bg-dakkho-blue/15 text-dakkho-blue border-dakkho-blue/20',
  student: 'bg-dakkho-success/15 text-dakkho-success border-dakkho-success/20',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function UsersTable() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Dialog states
  const [formOpen, setFormOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    role: 'student' as User['role'],
    instituteId: '',
    technology: '',
    semester: 0,
    isActive: true,
  });

  // Institutes for dropdown (fetched lazily)
  const [institutes, setInstitutes] = useState<{ id: number; name: string }[]>([]);

  // Technologies for dropdown
  const [technologies, setTechnologies] = useState<{ id: number; name: string; shortCode: string }[]>([]);

  // -------------------------------------------------------------------------
  // Data fetching
  // -------------------------------------------------------------------------

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
      if (search) params.set('search', search);
      if (roleFilter !== 'all') params.set('role', roleFilter);

      const data = (await apiGet(`/users?${params}`)) as Record<string, unknown>;
      const docs = (data.users as Record<string, unknown>[]) || (data.documents as Record<string, unknown>[]) || [];
      setUsers(docs.map(mapUser));
      setTotal((data.total as number) || 0);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch users';
      setError(message);
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter, toast]);

  const fetchInstitutes = useCallback(async () => {
    try {
      const data = (await apiGet('/institutes?limit=200')) as Record<string, unknown>;
      const docs = (data.institutes as Record<string, unknown>[]) || (data.documents as Record<string, unknown>[]) || [];
      setInstitutes(
        docs.map((d) => ({ id: Number(d.id), name: String(d.name ?? 'Unknown') })),
      );
    } catch {
      // silent — dropdowns can be empty
    }
  }, []);

  const fetchTechnologies = useCallback(async () => {
    try {
      const data = await apiGet('/technologies') as Record<string, unknown>;
      const techs = (((data.technologies || data.documents) || []) as Record<string, unknown>[]);
      setTechnologies(
        techs.map((d) => ({ id: Number(d.id), name: String(d.name ?? 'Unknown'), shortCode: String((d as any).shortCode ?? (d as any).short_code ?? '') })),
      );
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    fetchInstitutes();
    fetchTechnologies();
  }, [fetchInstitutes, fetchTechnologies]);

  // -------------------------------------------------------------------------
  // CRUD handlers
  // -------------------------------------------------------------------------

  const openCreateDialog = () => {
    setEditUser(null);
    setForm({
      fullName: '',
      email: '',
      phone: '',
      role: 'student',
      instituteId: '',
      technology: '',
      semester: 0,
      isActive: true,
    });
    setFormOpen(true);
  };

  const openEditDialog = (user: User) => {
    setEditUser(user);
    setForm({
      fullName: user.fullName,
      email: user.email,
      phone: user.phone ?? '',
      role: user.role,
      instituteId: user.instituteId ? String(user.instituteId) : '',
      technology: user.technology ?? '',
      semester: user.semester ?? 0,
      isActive: user.isActive,
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        fullName: form.fullName,
        email: form.email,
        phone: form.phone || undefined,
        role: form.role,
        instituteId: form.instituteId ? Number(form.instituteId) : undefined,
        technology: form.technology || undefined,
        semester: form.semester || undefined,
        isActive: form.isActive,
      };

      if (editUser) {
        await apiPut('/users', { userId: editUser.id, ...payload });
        toast({ title: 'Success', description: 'User updated successfully' });
      } else {
        toast({ title: 'Info', description: 'User creation is handled via authentication flow' });
      }

      setFormOpen(false);
      fetchUsers();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save user';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await apiDelete(`/users?id=${deleteTarget.id}`);
      toast({ title: 'Deleted', description: 'User has been deleted' });
      setDeleteOpen(false);
      setDeleteTarget(null);
      fetchUsers();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete user';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    }
  };

  const toggleUserStatus = async (user: User) => {
    try {
      await apiPut('/users', { userId: user.id, isActive: !user.isActive });
      toast({
        title: 'Success',
        description: `User ${!user.isActive ? 'activated' : 'deactivated'}`,
      });
      fetchUsers();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update user';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    }
  };

  const handleExport = () => {
    const csvRows = [
      ['Name', 'Email', 'Role', 'Institute', 'Technology', 'Status', 'Joined'].join(','),
      ...users.map((u) =>
        [
          `"${u.fullName}"`,
          u.email,
          u.role,
          u.instituteName ?? u.instituteId ?? '',
          u.technologyName ?? u.technology ?? '',
          u.isActive ? 'Active' : 'Inactive',
          u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '',
        ].join(','),
      ),
    ];
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Exported', description: 'Users CSV downloaded' });
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  // -------------------------------------------------------------------------
  // Render helpers
  // -------------------------------------------------------------------------

  const renderRoleBadge = (role: string) => (
    <span
      className={`status-badge ${role === 'admin' ? 'status-badge-verified' : role === 'instructor' ? 'bg-dakkho-blue/15 text-dakkho-blue border border-dakkho-blue/20' : 'status-badge-active'}`}
    >
      {role}
    </span>
  );

  const renderStatusBadge = (isActive: boolean) => (
    <span className={`status-badge ${isActive ? 'status-badge-active' : 'status-badge-inactive'}`}>
      <span className="relative flex h-1.5 w-1.5">
        {isActive && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        )}
        <span
          className={`relative inline-flex rounded-full h-1.5 w-1.5 ${isActive ? 'bg-emerald-500' : 'bg-red-500'}`}
        />
      </span>
      {isActive ? 'Active' : 'Inactive'}
    </span>
  );

  // -------------------------------------------------------------------------
  // JSX
  // -------------------------------------------------------------------------

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* ---- Page Header ---- */}
      <div className="page-header">
        <div className="flex items-center gap-3">
          <h1 className="page-title">Users</h1>
          <Badge
            variant="secondary"
            className="bg-dakkho-blue/15 text-dakkho-blue border border-dakkho-blue/20 text-xs"
          >
            {total}
          </Badge>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button onClick={openCreateDialog} className="gradient-primary text-white gap-2">
            <UserPlus className="h-4 w-4" />
            Add User
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
              placeholder="Search users by name or email..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9 bg-white/[0.04] border-white/[0.08] h-10"
            />
          </div>

          {/* Role filter */}
          <Select
            value={roleFilter}
            onValueChange={(v) => {
              setRoleFilter(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[150px] bg-white/[0.04] border-white/[0.08] h-10">
              <SelectValue placeholder="All Roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="student">Student</SelectItem>
              <SelectItem value="instructor">Instructor</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>

          {/* Export */}
          <Button
            variant="outline"
            size="default"
            onClick={handleExport}
            className="border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] h-10 gap-2"
          >
            <Download className="h-4 w-4" />
            Export
          </Button>

          {/* Refresh */}
          <Button
            variant="outline"
            size="icon"
            onClick={fetchUsers}
            className="border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08] h-10 w-10"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* ---- Data Table ---- */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Role</th>
                <th className="hidden lg:table-cell">Institute</th>
                <th className="hidden xl:table-cell">Technology</th>
                <th>Status</th>
                <th className="hidden md:table-cell">Joined</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {/* ---- Loading skeleton ---- */}
              {loading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={`skel-${i}`}>
                    <td>
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-9 w-9 rounded-full" />
                        <Skeleton className="h-4 w-28" />
                      </div>
                    </td>
                    <td>
                      <Skeleton className="h-4 w-36" />
                    </td>
                    <td>
                      <Skeleton className="h-6 w-20 rounded-full" />
                    </td>
                    <td className="hidden lg:table-cell">
                      <Skeleton className="h-4 w-24" />
                    </td>
                    <td className="hidden xl:table-cell">
                      <Skeleton className="h-4 w-20" />
                    </td>
                    <td>
                      <Skeleton className="h-6 w-20 rounded-full" />
                    </td>
                    <td className="hidden md:table-cell">
                      <Skeleton className="h-4 w-24" />
                    </td>
                    <td className="text-right">
                      <Skeleton className="h-8 w-8 rounded-md ml-auto" />
                    </td>
                  </tr>
                ))}

              {/* ---- Error state ---- */}
              {!loading && error && (
                <tr>
                  <td colSpan={8} className="text-center py-12">
                    <div className="flex flex-col items-center gap-3">
                      <AlertTriangle className="h-10 w-10 text-dakkho-warning" />
                      <p className="text-muted-foreground text-sm">{error}</p>
                      <Button variant="outline" size="sm" onClick={fetchUsers} className="gap-2">
                        <RefreshCw className="h-3.5 w-3.5" /> Retry
                      </Button>
                    </div>
                  </td>
                </tr>
              )}

              {/* ---- Empty state ---- */}
              {!loading && !error && users.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-12">
                    <div className="flex flex-col items-center gap-3">
                      <Users className="h-10 w-10 text-muted-foreground/50" />
                      <p className="text-muted-foreground text-sm">No users found</p>
                      <p className="text-muted-foreground/60 text-xs">
                        Try adjusting your search or filters
                      </p>
                    </div>
                  </td>
                </tr>
              )}

              {/* ---- Data rows ---- */}
              {!loading &&
                !error &&
                users.map((user) => (
                  <tr key={user.id}>
                    {/* Avatar + Name */}
                    <td>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 border border-white/[0.08]">
                          <AvatarImage src={user.avatarUrl} alt={user.fullName} />
                          <AvatarFallback className="bg-dakkho-blue/20 text-dakkho-blue text-xs font-semibold">
                            {user.fullName.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-foreground truncate max-w-[160px]">
                          {user.fullName || 'Unknown'}
                        </span>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="text-muted-foreground">{user.email || 'N/A'}</td>

                    {/* Role */}
                    <td>{renderRoleBadge(user.role)}</td>

                    {/* Institute */}
                    <td className="hidden lg:table-cell text-muted-foreground text-sm">
                      {user.instituteName ?? user.instituteId ?? '—'}
                    </td>

                    {/* Technology */}
                    <td className="hidden xl:table-cell text-muted-foreground text-sm">
                      {user.technologyName ?? user.technology ?? '—'}
                    </td>

                    {/* Status */}
                    <td>{renderStatusBadge(user.isActive)}</td>

                    {/* Joined */}
                    <td className="hidden md:table-cell text-muted-foreground text-sm">
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                    </td>

                    {/* Actions */}
                    <td className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-white/[0.06]"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="end"
                          className="bg-[#1A1A2E] border-white/[0.08] z-50"
                        >
                          <DropdownMenuItem onClick={() => openEditDialog(user)} className="gap-2">
                            <Pencil className="h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => toggleUserStatus(user)}
                            className="gap-2"
                          >
                            {user.isActive ? 'Deactivate' : 'Activate'}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-white/[0.06]" />
                          <DropdownMenuItem
                            onClick={() => {
                              setDeleteTarget(user);
                              setDeleteOpen(true);
                            }}
                            className="gap-2 text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* ---- Pagination ---- */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.06]">
            <p className="text-sm text-muted-foreground">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 border-white/[0.08] bg-transparent"
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground px-2">
                {page} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 border-white/[0.08] bg-transparent"
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ---- Mobile Card Layout ---- */}
      <div className="md:hidden space-y-3">
        {loading &&
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="glass-card rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
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

        {!loading && !error && users.length === 0 && (
          <div className="glass-card rounded-xl p-8 text-center">
            <Users className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No users found</p>
          </div>
        )}

        <AnimatePresence>
          {!loading &&
            !error &&
            users.map((user) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className="glass-card rounded-xl p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <Avatar className="h-10 w-10 border border-white/[0.08] flex-shrink-0">
                      <AvatarImage src={user.avatarUrl} alt={user.fullName} />
                      <AvatarFallback className="bg-dakkho-blue/20 text-dakkho-blue text-sm font-semibold">
                        {user.fullName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {user.fullName || 'Unknown'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="bg-[#1A1A2E] border-white/[0.08] z-50"
                    >
                      <DropdownMenuItem onClick={() => openEditDialog(user)} className="gap-2">
                        <Pencil className="h-4 w-4" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => toggleUserStatus(user)}
                        className="gap-2"
                      >
                        {user.isActive ? 'Deactivate' : 'Activate'}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator className="bg-white/[0.06]" />
                      <DropdownMenuItem
                        onClick={() => {
                          setDeleteTarget(user);
                          setDeleteOpen(true);
                        }}
                        className="gap-2 text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="flex flex-wrap gap-1.5 mt-3">
                  {renderRoleBadge(user.role)}
                  {renderStatusBadge(user.isActive)}
                </div>

                {(user.instituteName || user.technologyName || user.instituteId || user.technology) && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {[user.technologyName ?? user.technology, user.instituteName ?? user.instituteId].filter(Boolean).join('·')}
                  </p>
                )}
              </motion.div>
            ))}
        </AnimatePresence>
      </div>

      {/* ---- Add/Edit User Dialog ---- */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="bg-[#1A1A2E] border-white/[0.08] max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {editUser ? 'Edit User' : 'Add User'}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {editUser ? 'Update user information' : 'Create a new user account'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-muted-foreground">
                Full Name
              </Label>
              <Input
                id="fullName"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                className="bg-white/[0.04] border-white/[0.08]"
                placeholder="Enter full name"
              />
            </div>

            {/* Email + Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-muted-foreground">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="bg-white/[0.04] border-white/[0.08]"
                  placeholder="user@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-muted-foreground">
                  Phone
                </Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="bg-white/[0.04] border-white/[0.08]"
                  placeholder="+880..."
                />
              </div>
            </div>

            {/* Role */}
            <div className="space-y-2">
              <Label className="text-muted-foreground">Role</Label>
              <Select
                value={form.role}
                onValueChange={(v) => setForm({ ...form, role: v as User['role'] })}
              >
                <SelectTrigger className="bg-white/[0.04] border-white/[0.08]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="instructor">Instructor</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Institute + Technology */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Institute</Label>
                <Select
                  value={form.instituteId}
                  onValueChange={(v) => setForm({ ...form, instituteId: v })}
                >
                  <SelectTrigger className="bg-white/[0.04] border-white/[0.08]">
                    <SelectValue placeholder="Select institute" />
                  </SelectTrigger>
                  <SelectContent>
                    {institutes.map((inst) => (
                      <SelectItem key={inst.id} value={String(inst.id)}>
                        {inst.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">Technology</Label>
                <Select
                  value={form.technology}
                  onValueChange={(v) => setForm({ ...form, technology: v })}
                >
                  <SelectTrigger className="bg-white/[0.04] border-white/[0.08]">
                    <SelectValue placeholder="Select technology" />
                  </SelectTrigger>
                  <SelectContent>
                    {technologies.map((tech) => (
                      <SelectItem key={tech.id} value={tech.shortCode || tech.name}>
                        {tech.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Semester */}
            <div className="space-y-2">
              <Label htmlFor="semester" className="text-muted-foreground">
                Semester
              </Label>
              <Input
                id="semester"
                type="number"
                min={0}
                max={12}
                value={form.semester}
                onChange={(e) => setForm({ ...form, semester: Number(e.target.value) })}
                className="bg-white/[0.04] border-white/[0.08] w-24"
              />
            </div>

            {/* Active switch */}
            <div className="flex items-center justify-between py-2">
              <Label className="text-muted-foreground">Active Status</Label>
              <div className="flex items-center gap-2">
                <span className={`text-xs ${form.isActive ? 'text-dakkho-success' : 'text-dakkho-danger'}`}>
                  {form.isActive ? 'Active' : 'Inactive'}
                </span>
                <Switch
                  checked={form.isActive}
                  onCheckedChange={(v) => setForm({ ...form, isActive: v })}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="mt-6 gap-2">
            <Button
              variant="outline"
              onClick={() => setFormOpen(false)}
              className="border-white/[0.08] bg-transparent"
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="gradient-primary text-white gap-2">
              {saving && <RefreshCw className="h-4 w-4 animate-spin" />}
              {editUser ? 'Update User' : 'Create User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- Delete Confirmation Dialog ---- */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="bg-[#1A1A2E] border-white/[0.08]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-dakkho-warning" />
              Delete User
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Are you sure you want to delete{' '}
              <span className="font-semibold text-foreground">
                {deleteTarget?.fullName || deleteTarget?.email}
              </span>
              ? This action cannot be undone. All associated data will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/[0.08] bg-transparent">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
