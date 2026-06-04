'use client';

import { motion } from 'framer-motion';
import {
  User, Lock, Bell, Moon, Info, LogOut, ChevronRight,
  Monitor, Download, Sun, HelpCircle, MessageSquare,
  CreditCard, Palette, Shield, Eye, Wifi, Settings, Languages,
} from 'lucide-react';
import { useAuthStore, useNavigationStore, useThemeStore } from '@/lib/store';
import { GlassCard } from '../shared/GlassCard';
import { GradientButton } from '../shared/GradientButton';

interface SettingItemProps {
  icon: React.ElementType;
  iconColor?: string;
  title: string;
  subtitle: string;
  onClick?: () => void;
  rightElement?: React.ReactNode;
}

function SettingItem({ icon: Icon, iconColor = 'text-sky-500', title, subtitle, onClick, rightElement }: SettingItemProps) {
  const content = (
    <div className="flex items-center justify-between py-2.5 cursor-pointer hover:bg-muted/20 rounded-lg px-1 -mx-1 transition-colors">
      <div className="flex items-center gap-3">
        <Icon className={`w-5 h-5 ${iconColor}`} />
        <div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      {rightElement || <ChevronRight className="w-4 h-4 text-muted-foreground" />}
    </div>
  );

  if (onClick) {
    return (
      <motion.div
        onClick={onClick}
        whileHover={{ x: 2 }}
        whileTap={{ scale: 0.98 }}
      >
        {content}
      </motion.div>
    );
  }

  return content;
}

export function SettingsPage() {
  const { theme, toggleTheme } = useThemeStore();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigationStore((s) => s.navigate);

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-extrabold text-foreground mb-2">Settings</h1>
        <p className="text-sm text-muted-foreground mb-6">Manage your account and preferences</p>
      </motion.div>

      <div className="space-y-4">
        {/* Account */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <GlassCard className="p-5 space-y-1">
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">Account</h3>

            {/* User info display - clickable to Account Settings */}
            {user && (
              <motion.div
                className="flex items-center gap-4 p-3 rounded-xl bg-muted/20 cursor-pointer hover:bg-muted/30 transition-colors mb-2"
                onClick={() => navigate('settings-account')}
                whileHover={{ x: 2 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white text-lg font-extrabold">
                  {user.fullName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground">{user.fullName}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                  {user.institute && (
                    <p className="text-xs text-sky-500 font-semibold mt-0.5">{user.institute}</p>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </motion.div>
            )}

            <SettingItem
              icon={User}
              title="Profile Information"
              subtitle="Update your name, email, avatar"
              onClick={() => navigate('edit-profile')}
            />
            <SettingItem
              icon={Lock}
              title="Change Password"
              subtitle="Update your security credentials"
              onClick={() => navigate('change-password')}
            />
            <SettingItem
              icon={Shield}
              title="Account & Security"
              subtitle="2FA, linked accounts, active sessions"
              onClick={() => navigate('settings-account')}
            />
          </GlassCard>
        </motion.div>

        {/* Video & Downloads */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <GlassCard className="p-5 space-y-1">
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">Video & Downloads</h3>
            <SettingItem
              icon={Monitor}
              title="Video Quality"
              subtitle="Streaming and download quality settings"
              onClick={() => navigate('settings-video-quality')}
            />
            <SettingItem
              icon={Download}
              title="Download Settings"
              subtitle="Offline download preferences and storage"
              onClick={() => navigate('settings-download-settings')}
            />
            <SettingItem
              icon={Wifi}
              title="Network & Data"
              subtitle="Wi-Fi only, data saver options"
              onClick={() => navigate('settings-network-data')}
            />
          </GlassCard>
        </motion.div>

        {/* Notifications */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <GlassCard className="p-5 space-y-1">
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">Notifications</h3>
            <SettingItem
              icon={Bell}
              title="Notification Preferences"
              subtitle="Push, email, SMS and quiet hours"
              onClick={() => navigate('settings-notifications')}
            />
          </GlassCard>
        </motion.div>

        {/* Appearance & Privacy */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
          <GlassCard className="p-5 space-y-1">
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">Appearance & Privacy</h3>
            <SettingItem
              icon={Palette}
              title="Theme & Appearance"
              subtitle="Dark mode, accent color, font size"
              onClick={() => navigate('settings-theme')}
              rightElement={
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{theme === 'dark' ? 'Dark' : 'Light'}</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              }
            />
            <SettingItem
              icon={Languages}
              title="Language & Subtitles"
              subtitle="App language, subtitle preferences, auto-translate"
              onClick={() => navigate('settings-language')}
            />
            <SettingItem
              icon={Eye}
              title="Privacy Settings"
              subtitle="Profile visibility, data sharing, analytics"
              onClick={() => navigate('settings-privacy')}
            />
            <SettingItem
              icon={Settings}
              title="Content Protection"
              subtitle="Screenshot, copy, and sharing controls"
              onClick={() => navigate('settings-content-protection')}
            />
          </GlassCard>
        </motion.div>

        {/* About & Help */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <GlassCard className="p-5 space-y-1">
            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">About & Help</h3>
            <SettingItem
              icon={Info}
              title="About DAKKHO"
              subtitle="Version 1.0.0"
              onClick={() => navigate('about')}
            />
            <SettingItem
              icon={HelpCircle}
              title="Help Center"
              subtitle="FAQs, tutorials, and support"
              onClick={() => navigate('help')}
            />
            <SettingItem
              icon={MessageSquare}
              title="Send Feedback"
              subtitle="Help us improve DAKKHO"
              onClick={() => navigate('feedback')}
            />
            <SettingItem
              icon={CreditCard}
              title="Subscription"
              subtitle="Manage your plan and billing"
              onClick={() => navigate('subscription')}
            />
          </GlassCard>
        </motion.div>

        {/* Logout */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
          <GradientButton
            variant="danger"
            className="w-full"
            onClick={() => { logout(); navigate('login'); }}
            size="lg"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </GradientButton>
        </motion.div>
      </div>
    </div>
  );
}
