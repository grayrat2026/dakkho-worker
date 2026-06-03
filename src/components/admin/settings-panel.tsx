'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Server, Database, Cloud, HardDrive, Wifi, RefreshCw, Key, Save, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

export default function SettingsPanel() {
  const [status, setStatus] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // API Key form
  const [apiKey, setApiKey] = useState('');
  const [savingKey, setSavingKey] = useState(false);

  useEffect(() => { fetchStatus(); }, []);

  const fetchStatus = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/system/status');
      if (res.ok) { const data = await res.json(); setStatus(data); }
    } catch { toast({ title: 'Error', variant: 'destructive' }); }
    finally { setLoading(false); }
  };

  const handleSaveApiKey = async () => {
    if (!apiKey.trim()) {
      toast({ title: 'Error', description: 'Please enter an API key', variant: 'destructive' });
      return;
    }
    setSavingKey(true);
    try {
      const res = await fetch('/api/admin/system/api-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: apiKey.trim() }),
      });
      if (res.ok) {
        toast({ title: 'Success', description: 'API key updated. Please restart the server for changes to take effect.' });
        setApiKey('');
        fetchStatus();
      } else {
        const data = await res.json();
        toast({ title: 'Error', description: data.error || 'Failed to update', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Network error', variant: 'destructive' });
    } finally {
      setSavingKey(false);
    }
  };

  const services = [
    { name: 'Appwrite', key: 'appwrite', icon: Database, description: 'Primary database & auth' },
    { name: 'R2 - Videos', key: 'videos', icon: HardDrive, description: 'Video storage bucket', group: 'r2' },
    { name: 'R2 - Thumbnails', key: 'thumbnails', icon: HardDrive, description: 'Image storage bucket', group: 'r2' },
    { name: 'R2 - Avatars', key: 'avatars', icon: HardDrive, description: 'Avatar storage bucket', group: 'r2' },
    { name: 'R2 - Resources', key: 'resources', icon: HardDrive, description: 'Resource storage bucket', group: 'r2' },
    { name: 'Supabase', key: 'supabase', icon: Cloud, description: 'Edge functions & realtime' },
    { name: 'Prisma/SQLite', key: 'prisma', icon: Server, description: 'Local database for config & logs' },
    { name: 'MQTT', key: 'mqtt', icon: Wifi, description: 'Config broadcast channel' },
  ];

  const getStatusValue = (key: string, group?: string): string => {
    if (group === 'r2') {
      const r2 = status.r2 as Record<string, string> | undefined;
      return r2?.[key] || 'unknown';
    }
    return String(status[key] || 'unknown');
  };

  const getStatusColor = (value: string) => {
    if (value === 'connected') return 'bg-green-500/10 text-green-400';
    if (value === 'limited') return 'bg-amber-500/10 text-amber-400';
    return 'bg-red-500/10 text-red-400';
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* System Status */}
      <Card className="glass-card border-0">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Server className="h-5 w-5 text-dakkho-blue" /> System Status
            </CardTitle>
            <Button variant="outline" size="sm" onClick={fetchStatus} className="border-white/10">
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {services.map((service) => {
              const Icon = service.icon;
              const value = getStatusValue(service.key, service.group);
              return (
                <div key={service.name} className="flex items-center justify-between p-4 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
                      <Icon className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{service.name}</p>
                      <p className="text-xs text-muted-foreground">{service.description}</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className={getStatusColor(value)}>
                    {loading ? 'checking...' : value}
                  </Badge>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Appwrite API Key Configuration */}
      <Card className="glass-card border-0">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Key className="h-5 w-5 text-amber-400" /> Appwrite API Key
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg bg-amber-500/5 border border-amber-500/20">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-amber-200 font-medium">API Key Requires Proper Scopes</p>
                <p className="text-xs text-muted-foreground mt-1">
                  The Appwrite API key needs the following scopes to work with the admin panel:
                </p>
                <ul className="text-xs text-muted-foreground mt-2 space-y-1 list-disc list-inside">
                  <li>databases.read & databases.write</li>
                  <li>collections.read & collections.write</li>
                  <li>documents.read & documents.write</li>
                  <li>users.read & users.write</li>
                  <li>health.read</li>
                </ul>
                <p className="text-xs text-muted-foreground mt-2">
                  Go to Appwrite Console → Project → API Keys → Create a new key with these scopes, then paste it below.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>New API Key</Label>
            <div className="flex gap-2">
              <Input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="bg-white/5 border-white/10 font-mono text-sm"
                placeholder="standard_xxxxxxxxxxxxxxxxxxxxxxxx"
              />
              <Button onClick={handleSaveApiKey} disabled={savingKey} className="gradient-primary text-white flex-shrink-0">
                <Save className="h-4 w-4 mr-2" /> {savingKey ? 'Saving...' : 'Save'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              The API key is stored in the server .env file. After saving, restart the server for changes to take effect.
            </p>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between p-2 rounded bg-white/[0.03]">
              <span className="text-muted-foreground">Current Key Status</span>
              <Badge variant="secondary" className={getStatusValue('appwrite') === 'connected' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}>
                {getStatusValue('appwrite') === 'connected' ? 'Working' : 'Not Working'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Environment Info */}
      <Card className="glass-card border-0">
        <CardHeader><CardTitle className="text-lg">Environment</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            {[
              { label: 'App URL', value: 'https://dakkho.pro.bd' },
              { label: 'Appwrite Endpoint', value: 'https://sgp.cloud.appwrite.io/v1' },
              { label: 'Appwrite Project', value: 'dakkho' },
              { label: 'Database', value: 'dakkho_main' },
              { label: 'R2 Region', value: 'auto' },
              { label: 'R2 Access Key', value: '46b97...ac883' },
              { label: 'MQTT Broker', value: 'HiveMQ Cloud' },
            ].map((item) => (
              <div key={item.label} className="flex justify-between p-2 rounded bg-white/[0.03]">
                <span className="text-muted-foreground">{item.label}</span>
                <span className="font-mono text-xs">{item.value}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="glass-card border-0 border-dakkho-danger/20">
        <CardHeader><CardTitle className="text-lg text-dakkho-danger">Danger Zone</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-lg bg-red-500/5 border border-red-500/10">
            <div>
              <p className="text-sm font-medium">Clear All Sessions</p>
              <p className="text-xs text-muted-foreground">Force logout all admin sessions</p>
            </div>
            <Button variant="outline" size="sm" className="border-red-500/30 text-red-400 hover:bg-red-500/10">
              Clear Sessions
            </Button>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg bg-red-500/5 border border-red-500/10">
            <div>
              <p className="text-sm font-medium">Reset Config</p>
              <p className="text-xs text-muted-foreground">Reset all server config to defaults</p>
            </div>
            <Button variant="outline" size="sm" className="border-red-500/30 text-red-400 hover:bg-red-500/10">
              Reset Config
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
