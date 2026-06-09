'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Server, Database, Cloud, HardDrive, RefreshCw, AlertTriangle, CheckCircle2, XCircle, AlertCircle, Trash2, RotateCcw, Clock, Settings, Shield, Bell } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiGet, apiPost, apiDelete, ApiError } from '@/lib/api-client';

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
interface ServiceStatus {
  status: 'connected' | 'error' | 'limited';
  message?: string;
}

interface SystemStatus {
  r2: Record<string, ServiceStatus>;
  d1: ServiceStatus;
  kv: ServiceStatus;
  email: ServiceStatus;
  onesignal: ServiceStatus;
}

interface AuditLog {
  id: string;
  action: string;
  resource_type: string;
  resource_id: string | null;
  user_id: string | null;
  user_email: string | null;
  details: string;
  ip_address: string | null;
  created_at: string;
}

// ============================================================
// Component
// ============================================================
export default function SettingsPanel() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Audit logs
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logPage, setLogPage] = useState(1);

  // Danger zone
  const [clearing, setClearing] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => { fetchStatus(); fetchAuditLogs(); }, []);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const data = await apiGet('/system/status');
      setStatus(data as SystemStatus);
    } catch { toast({ title: 'Error', variant: 'destructive' }); }
    finally { setLoading(false); }
  };

  const fetchAuditLogs = async () => {
    setLogsLoading(true);
    try {
      const data = await apiGet('/analytics') as Record<string, unknown>;
      setAuditLogs((data.recentLogs as AuditLog[]) || []);
    } catch {
      // Audit logs may fail silently
    } finally {
      setLogsLoading(false);
    }
  };

  const handleClearSessions = async () => {
    if (!confirm('Are you sure? This will force logout all admin sessions including your own.')) return;
    setClearing(true);
    try {
      await apiDelete('/auth/sessions');
      toast({ title: 'Success', description: 'All sessions cleared. You will need to log in again.' });
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Failed to clear sessions';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setClearing(false);
    }
  };

  const handleResetConfig = async () => {
    if (!confirm('Are you sure? This will reset all server configuration to defaults.')) return;
    setResetting(true);
    try {
      await apiPost('/config/reset', {});
      toast({ title: 'Success', description: 'Configuration reset to defaults.' });
      fetchStatus();
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Failed to reset config';
      toast({ title: 'Error', description: message, variant: 'destructive' });
    } finally {
      setResetting(false);
    }
  };

  const getServiceStatus = (key: string, group?: string): ServiceStatus => {
    if (!status) return { status: 'error', message: 'Loading...' };
    if (group === 'r2') {
      const r2 = status.r2 as Record<string, ServiceStatus> | undefined;
      return r2?.[key] || { status: 'error', message: 'Unknown' };
    }
    return (status as Record<string, ServiceStatus>)[key] || { status: 'error', message: 'Unknown' };
  };

  const getStatusIcon = (svc: ServiceStatus) => {
    if (svc.status === 'connected') return <CheckCircle2 className="h-4 w-4 text-emerald-400" />;
    if (svc.status === 'limited') return <AlertCircle className="h-4 w-4 text-amber-400" />;
    return <XCircle className="h-4 w-4 text-red-400" />;
  };

  const getStatusColor = (svc: ServiceStatus) => {
    if (svc.status === 'connected') return 'bg-emerald-500/10 text-emerald-400';
    if (svc.status === 'limited') return 'bg-amber-500/10 text-amber-400';
    return 'bg-red-500/10 text-red-400';
  };

  const services = [
    { name: 'D1 Database', key: 'd1', icon: Database, description: 'Primary database, sessions & audit logs', color: 'text-blue-400' },
    { name: 'Workers KV', key: 'kv', icon: Cloud, description: 'Config cache & real-time broadcast', color: 'text-cyan-400' },
    { name: 'R2 - Videos', key: 'videos', icon: HardDrive, description: 'Video storage bucket', group: 'r2', color: 'text-purple-400' },
    { name: 'R2 - Thumbnails', key: 'thumbnails', icon: HardDrive, description: 'Image storage bucket', group: 'r2', color: 'text-purple-400' },
    { name: 'R2 - Avatars', key: 'avatars', icon: HardDrive, description: 'Avatar storage bucket', group: 'r2', color: 'text-purple-400' },
    { name: 'R2 - Resources', key: 'resources', icon: HardDrive, description: 'Resource storage bucket', group: 'r2', color: 'text-purple-400' },
    { name: 'Resend', key: 'email', icon: Server, description: 'Email delivery service', color: 'text-amber-400' },
    { name: 'OneSignal', key: 'onesignal', icon: Bell, description: 'Push notification service', color: 'text-rose-400' },
  ];

  const formatTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleString();
    } catch {
      return dateStr;
    }
  };

  const logPages = Math.ceil(auditLogs.length / 10);

  // D1 health check info
  const d1Status = status?.d1;
  const showD1Error = d1Status?.status === 'error';

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
              <Settings className="h-5 w-5 text-white" />
            </div>
            Settings
          </h1>
          <p className="page-description">System status, service health, audit logs, and danger zone</p>
        </div>
      </motion.div>

      {/* System Status */}
      <motion.div variants={itemVariants}>
        <Card className="glass-card border-0 rounded-xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Server className="h-5 w-5 text-dakkho-blue" /> System Status
              </CardTitle>
              <Button variant="outline" size="sm" onClick={fetchStatus} className="border-white/[0.08]">
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {services.map((service) => {
                const Icon = service.icon;
                const svc = getServiceStatus(service.key, service.group);
                return (
                  <div
                    key={service.name}
                    className="flex items-center justify-between p-3 md:p-4 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.10] transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
                        <Icon className={`h-4 w-4 md:h-5 md:w-5 ${service.color}`} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{service.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{service.description}</p>
                        {svc.message && svc.status !== 'connected' && (
                          <p className="text-xs text-red-300/80 mt-0.5 max-w-[200px] truncate" title={svc.message}>
                            {svc.message}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {getStatusIcon(svc)}
                      <Badge variant="secondary" className={`${getStatusColor(svc)} text-[10px] md:text-xs`}>
                        {loading ? '...' : svc.status}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* D1 Error Fix Instructions */}
      {status && showD1Error && (
        <motion.div variants={itemVariants}>
          <Card className="glass-card border-0 rounded-xl border-amber-500/20">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-400" /> Fix D1 Database Issue
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg bg-amber-500/5 border border-amber-500/20 space-y-3">
                <div className="flex items-start gap-2">
                  <XCircle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-amber-200">D1 Database Connection Failed</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      The D1 database is not responding. Check the following:
                    </p>
                    <ol className="text-xs text-muted-foreground mt-2 space-y-1 list-decimal list-inside">
                      <li>Verify the D1 database binding in <span className="text-blue-400 font-mono">wrangler.toml</span></li>
                      <li>Check that the D1 database ID is correct</li>
                      <li>Run <span className="font-mono text-green-300">wrangler d1 execute dakkho-admin-db --command=&quot;SELECT 1&quot;</span> to test connectivity</li>
                      <li>Redeploy the worker if bindings have changed</li>
                    </ol>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Audit Logs */}
      <motion.div variants={itemVariants}>
        <Card className="glass-card border-0 rounded-xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5 text-dakkho-blue" /> Audit Logs
              </CardTitle>
              <Button variant="outline" size="sm" onClick={fetchAuditLogs} className="border-white/[0.08]">
                <RefreshCw className={`h-4 w-4 mr-2 ${logsLoading ? 'animate-spin' : ''}`} /> Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {logsLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-10 rounded-lg bg-white/5 animate-shimmer" />
                ))}
              </div>
            ) : auditLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                <Clock className="h-10 w-10 mb-2 opacity-20" />
                <p className="text-sm">No audit logs found</p>
                <p className="text-xs mt-1">Logs will appear as admin actions are performed</p>
              </div>
            ) : (
              <div className="space-y-1">
                {auditLogs.slice((logPage - 1) * 10, logPage * 10).map((log, i) => (
                  <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] transition-colors gap-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge variant="secondary" className="bg-white/5 text-muted-foreground text-[10px] flex-shrink-0">
                        {log.action}
                      </Badge>
                      <span className="text-sm text-muted-foreground truncate">
                        {log.resourceType}{log.resourceId ? `/${log.resourceId.slice(0, 8)}` : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="truncate max-w-[120px]">{log.userEmail || 'System'}</span>
                      <span className="flex-shrink-0">{formatTime(log.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {logPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/[0.06]">
                <p className="text-sm text-muted-foreground">Page {logPage} of {logPages}</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setLogPage(Math.max(1, logPage - 1))} disabled={logPage === 1} className="border-white/[0.08]">Previous</Button>
                  <Button variant="outline" size="sm" onClick={() => setLogPage(Math.min(logPages, logPage + 1))} disabled={logPage === logPages} className="border-white/[0.08]">Next</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Environment Info */}
      <motion.div variants={itemVariants}>
        <Card className="glass-card border-0 rounded-xl">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5 text-dakkho-teal" /> Environment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              {[
                { label: 'App URL', value: 'N/A' },
                { label: 'API Backend', value: 'N/A' },
                { label: 'Primary Database', value: 'N/A' },
                { label: 'D1 Database', value: 'N/A' },
                { label: 'KV Namespace', value: 'N/A' },
                { label: 'Object Storage', value: 'N/A' },
                { label: 'Email Provider', value: 'N/A' },
                { label: 'Push Notifications', value: 'N/A' },
              ].map((item) => (
                <div key={item.label} className="flex justify-between p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.04]">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="font-mono text-xs">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Danger Zone */}
      <motion.div variants={itemVariants}>
        <Card className="glass-card border-0 rounded-xl overflow-hidden">
          <CardHeader className="border-b border-red-500/10">
            <CardTitle className="text-lg text-red-400 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" /> Danger Zone
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl bg-red-500/5 border border-red-500/10 gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0">
                  <Trash2 className="h-4 w-4 text-red-400" />
                </div>
                <div>
                  <p className="text-sm font-medium">Clear All Sessions</p>
                  <p className="text-xs text-muted-foreground">Force logout all admin sessions (including yours)</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearSessions}
                disabled={clearing}
                className="border-red-500/30 text-red-400 hover:bg-red-500/10 flex-shrink-0"
              >
                <Trash2 className="h-4 w-4 mr-2" /> {clearing ? 'Clearing...' : 'Clear Sessions'}
              </Button>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-xl bg-red-500/5 border border-red-500/10 gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0">
                  <RotateCcw className="h-4 w-4 text-red-400" />
                </div>
                <div>
                  <p className="text-sm font-medium">Reset Config</p>
                  <p className="text-xs text-muted-foreground">Reset all server config to defaults</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetConfig}
                disabled={resetting}
                className="border-red-500/30 text-red-400 hover:bg-red-500/10 flex-shrink-0"
              >
                <RotateCcw className="h-4 w-4 mr-2" /> {resetting ? 'Resetting...' : 'Reset Config'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
