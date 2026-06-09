'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Send, Bell, Users, Building2, User, RefreshCw, Search, Cpu, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { apiGet, apiPost, ApiError } from '@/lib/api-client';

// ============================================================
// Animation Variants
// ============================================================
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

// ============================================================
// Types
// ============================================================
interface NotifHistoryItem {
  id: string;
  title: string;
  message: string;
  type: string;
  targetType: string;
  targetId: string;
  sentCount: number;
  failedCount: number;
  createdAt: string;
  source: string;
  userId?: string;
  read?: boolean;
}

type TargetMode = 'all' | 'user' | 'institute' | 'technology';

// ============================================================
// Component
// ============================================================
export default function NotificationsPanel() {
  const [form, setForm] = useState({
    title: '',
    message: '',
    type: 'info',
    targetAll: false,
    targetUserId: '',
    targetInstitute: '',
    targetTechnology: '',
    actionUrl: '',
  });
  const [targetMode, setTargetMode] = useState<TargetMode>('all');
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<NotifHistoryItem[]>([]);
  const [totalHistory, setTotalHistory] = useState(0);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const data = await apiGet('/notifications?limit=50') as Record<string, unknown>;
      setHistory((data.documents as NotifHistoryItem[]) || []);
      setTotalHistory(Number(data.total) || 0);
    } catch {
      toast({ title: 'Error loading history', variant: 'destructive' });
    } finally {
      setLoadingHistory(false);
    }
  }, [toast]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  // Filter history by search
  const filteredHistory = useMemo(() => {
    if (!searchQuery.trim()) return history;
    const q = searchQuery.toLowerCase();
    return history.filter(
      (n) =>
        n.title?.toLowerCase().includes(q) ||
        n.message?.toLowerCase().includes(q) ||
        n.type?.toLowerCase().includes(q) ||
        n.targetType?.toLowerCase().includes(q)
    );
  }, [history, searchQuery]);

  const handleTargetModeChange = (mode: TargetMode) => {
    setTargetMode(mode);
    setForm({
      ...form,
      targetAll: mode === 'all',
      targetUserId: mode === 'user' ? form.targetUserId : '',
      targetInstitute: mode === 'institute' ? form.targetInstitute : '',
      targetTechnology: mode === 'technology' ? form.targetTechnology : '',
    });
  };

  const handleSend = async () => {
    if (!form.title || !form.message) {
      toast({ title: 'Error', description: 'Title and message are required', variant: 'destructive' });
      return;
    }
    if (targetMode !== 'all' && !form.targetUserId && !form.targetInstitute && !form.targetTechnology) {
      toast({ title: 'Error', description: 'Select a target audience', variant: 'destructive' });
      return;
    }

    setSending(true);
    try {
      const data = await apiPost('/notifications', form) as Record<string, unknown>;
      const count = Number(data.count) || 0;

      if (count === 0 && targetMode === 'all') {
        toast({
          title: 'Notification Logged',
          description: 'No registered users found yet, but the notification has been logged to history. It will be delivered when users register.',
        });
      } else {
        toast({ title: 'Success', description: `Sent ${count} notification(s)` });
      }

      setForm({ title: '', message: '', type: 'info', targetAll: false, targetUserId: '', targetInstitute: '', targetTechnology: '', actionUrl: '' });
      setTargetMode('all');
      fetchHistory();
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Network error';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const typeColors: Record<string, string> = {
    info: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    error: 'bg-red-500/10 text-red-400 border-red-500/20',
    announcement: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    'course-update': 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
  };

  const targetLabels: Record<string, string> = {
    all: 'All Users',
    user: 'Specific User',
    institute: 'By Institute',
    technology: 'By Technology',
  };

  const targetModeOptions: { value: TargetMode; label: string; icon: React.ElementType }[] = [
    { value: 'all', label: 'All Users', icon: Users },
    { value: 'user', label: 'Specific User', icon: User },
    { value: 'institute', label: 'By Institute', icon: Building2 },
    { value: 'technology', label: 'By Technology', icon: Cpu },
  ];

  const getStatusBadge = (notif: NotifHistoryItem) => {
    if (notif.failedCount > 0 && notif.sentCount > 0) {
      return (
        <Badge className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px]">
          <Clock className="h-3 w-3 mr-1" />Partial
        </Badge>
      );
    }
    if (notif.sentCount > 0) {
      return (
        <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px]">
          <CheckCircle2 className="h-3 w-3 mr-1" />Delivered
        </Badge>
      );
    }
    return (
      <Badge className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px]">
        <Clock className="h-3 w-3 mr-1" />Logged
      </Badge>
    );
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Page Header */}
      <motion.div variants={itemVariants} className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <Bell className="h-5 w-5 text-white" />
            </div>
            Notifications
          </h1>
          <p className="page-description">Send in-app notifications and view delivery history</p>
        </div>
      </motion.div>

      <Tabs defaultValue="send" className="space-y-4">
        <TabsList className="bg-white/5 border border-white/10">
          <TabsTrigger value="send" className="data-[state=active]:bg-dakkho-blue/20 data-[state=active]:text-dakkho-blue">
            <Send className="h-4 w-4 mr-2" /> Compose
          </TabsTrigger>
          <TabsTrigger value="history" className="data-[state=active]:bg-dakkho-blue/20 data-[state=active]:text-dakkho-blue">
            <Bell className="h-4 w-4 mr-2" /> History ({totalHistory})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="send">
          <motion.div variants={itemVariants}>
            <Card className="glass-card border-0 rounded-xl">
              <CardHeader>
                <CardTitle className="text-lg">Send In-App Notification</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Title & Type */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      className="bg-white/[0.04] border-white/[0.08] focus:border-dakkho-blue/50"
                      placeholder="Notification title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                      <SelectTrigger className="bg-white/[0.04] border-white/[0.08]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#141428] border-white/[0.08]">
                        <SelectItem value="info">Info</SelectItem>
                        <SelectItem value="success">Success</SelectItem>
                        <SelectItem value="warning">Warning</SelectItem>
                        <SelectItem value="error">Error</SelectItem>
                        <SelectItem value="announcement">Announcement</SelectItem>
                        <SelectItem value="course-update">Course Update</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Message */}
                <div className="space-y-2">
                  <Label>Message</Label>
                  <Textarea
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    className="bg-white/[0.04] border-white/[0.08] focus:border-dakkho-blue/50"
                    rows={4}
                    placeholder="Notification message..."
                  />
                </div>

                {/* Action URL */}
                <div className="space-y-2">
                  <Label>Action URL (optional)</Label>
                  <Input
                    value={form.actionUrl}
                    onChange={(e) => setForm({ ...form, actionUrl: e.target.value })}
                    className="bg-white/[0.04] border-white/[0.08] focus:border-dakkho-blue/50"
                    placeholder="https://..."
                  />
                </div>

                {/* Target Audience */}
                <div className="border-t border-white/[0.06] pt-5">
                  <p className="text-sm font-medium mb-3">Target Audience</p>

                  {/* Target Mode Selector */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                    {targetModeOptions.map((opt) => {
                      const Icon = opt.icon;
                      const isActive = targetMode === opt.value;
                      return (
                        <button
                          key={opt.value}
                          onClick={() => handleTargetModeChange(opt.value)}
                          className={`flex items-center gap-2 p-3 rounded-lg border transition-all text-sm font-medium ${
                            isActive
                              ? 'border-dakkho-blue/50 bg-dakkho-blue/10 text-dakkho-blue'
                              : 'border-white/[0.08] bg-white/[0.03] text-muted-foreground hover:border-white/20 hover:bg-white/[0.06]'
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          <span className="hidden sm:inline">{opt.label}</span>
                          <span className="sm:hidden">{opt.label.split(' ').pop()}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Target-Specific Inputs */}
                  {targetMode === 'all' && (
                    <div className="flex items-center justify-between p-3 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-dakkho-teal" />
                        <span className="text-sm">Send to all registered users</span>
                      </div>
                      <Switch
                        checked={form.targetAll}
                        onCheckedChange={(v) => {
                          setForm({ ...form, targetAll: v });
                          if (v) setTargetMode('all');
                        }}
                      />
                    </div>
                  )}

                  {targetMode === 'user' && (
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <User className="h-3.5 w-3.5" /> Specific User ID
                      </Label>
                      <Input
                        value={form.targetUserId}
                        onChange={(e) => setForm({ ...form, targetUserId: e.target.value })}
                        className="bg-white/[0.04] border-white/[0.08] focus:border-dakkho-blue/50"
                        placeholder="Enter user ID"
                      />
                    </div>
                  )}

                  {targetMode === 'institute' && (
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Building2 className="h-3.5 w-3.5" /> Institute
                      </Label>
                      <Input
                        value={form.targetInstitute}
                        onChange={(e) => setForm({ ...form, targetInstitute: e.target.value })}
                        className="bg-white/[0.04] border-white/[0.08] focus:border-dakkho-blue/50"
                        placeholder="Enter institute ID or name"
                      />
                    </div>
                  )}

                  {targetMode === 'technology' && (
                    <div className="space-y-2">
                      <Label className="flex items-center gap-2">
                        <Cpu className="h-3.5 w-3.5" /> Technology
                      </Label>
                      <Input
                        value={form.targetTechnology}
                        onChange={(e) => setForm({ ...form, targetTechnology: e.target.value })}
                        className="bg-white/[0.04] border-white/[0.08] focus:border-dakkho-blue/50"
                        placeholder="e.g. React, Python, Flutter"
                      />
                    </div>
                  )}
                </div>

                {/* Send Button */}
                <Button onClick={handleSend} disabled={sending} className="w-full gradient-primary text-white font-medium">
                  {sending ? 'Sending...' : <><Send className="h-4 w-4 mr-2" /> Send Notification</>}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        <TabsContent value="history">
          <motion.div variants={itemVariants}>
            <Card className="glass-card border-0 rounded-xl">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <CardTitle className="text-lg">Notification History</CardTitle>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1 sm:flex-initial">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-white/[0.04] border-white/[0.08] pl-9 w-full sm:w-56"
                        placeholder="Search notifications..."
                      />
                    </div>
                    <Button variant="outline" size="sm" onClick={fetchHistory} disabled={loadingHistory} className="border-white/[0.08]">
                      <RefreshCw className={`h-4 w-4 ${loadingHistory ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loadingHistory && history.length === 0 ? (
                  <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="h-16 rounded-lg bg-white/5 animate-shimmer" />
                    ))}
                  </div>
                ) : filteredHistory.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Bell className="h-12 w-12 mb-3 opacity-20" />
                    <p className="text-sm font-medium">{searchQuery ? 'No matching notifications found' : 'No notifications sent yet'}</p>
                    <p className="text-xs mt-1">
                      {searchQuery ? 'Try a different search term' : 'Send your first notification using the Compose tab'}
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto -mx-6 px-6">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Title</th>
                          <th>Type</th>
                          <th>Target</th>
                          <th>Status</th>
                          <th>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredHistory.map((notif) => (
                          <tr key={notif.id}>
                            <td>
                              <div>
                                <p className="font-medium text-sm">{notif.title || 'No Title'}</p>
                                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{notif.message || ''}</p>
                              </div>
                            </td>
                            <td>
                              <Badge className={`${typeColors[notif.type] || typeColors.info} text-[10px]`}>
                                {notif.type || 'info'}
                              </Badge>
                            </td>
                            <td>
                              <span className="text-xs text-muted-foreground">
                                {targetLabels[notif.targetType as keyof typeof targetLabels] || notif.targetType || '\u2014'}
                                {notif.targetId && notif.targetId !== 'all' && (
                                  <span className="ml-1 font-mono">{notif.targetId.slice(0, 8)}...</span>
                                )}
                              </span>
                            </td>
                            <td>
                              <div className="flex items-center gap-1.5">
                                {getStatusBadge(notif)}
                                {notif.sentCount > 0 && (
                                  <span className="text-[10px] text-muted-foreground">
                                    {notif.sentCount} sent
                                  </span>
                                )}
                              </div>
                            </td>
                            <td>
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {notif.createdAt ? new Date(notif.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
