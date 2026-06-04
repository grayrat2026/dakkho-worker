'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Sun, Moon, Monitor, Palette, ChevronLeft, CheckCircle, Type,
  Save, SwatchBook, Eye, Contrast,
} from 'lucide-react';
import { useNavigationStore, useThemeStore, useAuthStore } from '@/lib/store';
import { GlassCard } from '../shared/GlassCard';
import { GradientButton } from '../shared/GradientButton';

const ACCENT_COLORS = [
  { name: 'Sky', value: 'sky-500', gradient: 'from-sky-400 to-sky-600', hex: '#0ea5e9' },
  { name: 'Emerald', value: 'emerald-500', gradient: 'from-emerald-400 to-emerald-600', hex: '#10b981' },
  { name: 'Violet', value: 'violet-500', gradient: 'from-violet-400 to-violet-600', hex: '#8b5cf6' },
  { name: 'Rose', value: 'rose-500', gradient: 'from-rose-400 to-rose-600', hex: '#f43f5e' },
  { name: 'Amber', value: 'amber-500', gradient: 'from-amber-400 to-amber-600', hex: '#f59e0b' },
  { name: 'Teal', value: 'teal-500', gradient: 'from-teal-400 to-teal-600', hex: '#14b8a6' },
  { name: 'Orange', value: 'orange-500', gradient: 'from-orange-400 to-orange-600', hex: '#f97316' },
  { name: 'Cyan', value: 'cyan-500', gradient: 'from-cyan-400 to-cyan-600', hex: '#06b6d4' },
];

export function ThemeSettingsPage() {
  const { goBack } = useNavigationStore();
  const { theme, toggleTheme } = useThemeStore();
  const user = useAuthStore((s) => s.user);

  const [themeMode, setThemeMode] = useState<'light' | 'dark' | 'system'>(theme === 'dark' ? 'dark' : 'light');
  const [accentColor, setAccentColor] = useState('Sky');
  const [fontSize, setFontSize] = useState(16);
  const [borderRadius, setBorderRadius] = useState(16);
  const [compactMode, setCompactMode] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleThemeChange = (mode: 'light' | 'dark' | 'system') => {
    setThemeMode(mode);
    if (mode === 'dark') {
      if (theme !== 'dark') toggleTheme();
    } else if (mode === 'light') {
      if (theme !== 'light') toggleTheme();
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark && theme !== 'dark') toggleTheme();
      if (!prefersDark && theme !== 'light') toggleTheme();
    }
  };

  const handleSave = async () => {
    if (!user?.id) { setSaved(true); setTimeout(() => setSaved(false), 3000); return; }
    setIsSaving(true);
    try {
      await fetch('/api/user/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          themeMode,
          accentColor: ACCENT_COLORS.find(c => c.name === accentColor)?.hex || '#0ea5e9',
          fontSize,
          compactMode,
        }),
      });
    } catch {}
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    setIsSaving(false);
  };

  return (
    <div className="pb-20 lg:pb-0">
      {/* Header */}
      <motion.div className="flex items-center gap-3 mb-6" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <motion.button className="w-9 h-9 rounded-xl bg-muted/30 flex items-center justify-center text-foreground" onClick={goBack} whileTap={{ scale: 0.9 }}>
          <ChevronLeft className="w-5 h-5" />
        </motion.button>
        <div>
          <h1 className="text-xl font-extrabold text-foreground">Theme & Appearance</h1>
          <p className="text-xs text-muted-foreground">Customize how DAKKHO looks and feels</p>
        </div>
      </motion.div>

      {saved && (
        <motion.div
          className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 flex items-center gap-2"
          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        >
          <CheckCircle className="w-4 h-4 text-emerald-500" />
          <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Theme preferences saved!</p>
        </motion.div>
      )}

      {/* Theme Mode */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <GlassCard className="p-5 mb-4">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-4">
            <Contrast className="w-4 h-4 text-sky-500" /> Theme Mode
          </h3>
          <div className="grid grid-cols-3 gap-3">
            {[
              { mode: 'light' as const, icon: Sun, label: 'Light', desc: 'Clean and bright' },
              { mode: 'dark' as const, icon: Moon, label: 'Dark', desc: 'Easy on the eyes' },
              { mode: 'system' as const, icon: Monitor, label: 'System', desc: 'Follow device' },
            ].map((item, i) => (
              <motion.div
                key={item.mode}
                className={`p-4 rounded-xl cursor-pointer text-center transition-all ${
                  themeMode === item.mode
                    ? 'bg-sky-50 dark:bg-sky-900/20 border-2 border-sky-500'
                    : 'bg-muted/20 border-2 border-transparent hover:bg-muted/30'
                }`}
                onClick={() => handleThemeChange(item.mode)}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <item.icon className={`w-6 h-6 mx-auto mb-2 ${themeMode === item.mode ? 'text-sky-500' : 'text-muted-foreground'}`} />
                <p className="text-sm font-bold text-foreground">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </GlassCard>
      </motion.div>

      {/* Accent Color */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <GlassCard className="p-5 mb-4">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-4">
            <SwatchBook className="w-4 h-4 text-sky-500" /> Accent Color
          </h3>
          <div className="grid grid-cols-4 gap-3">
            {ACCENT_COLORS.map((color, i) => (
              <motion.div
                key={color.name}
                className="flex flex-col items-center gap-1.5 cursor-pointer"
                onClick={() => setAccentColor(color.name)}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.15 + i * 0.03 }}
                whileTap={{ scale: 0.9 }}
              >
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color.gradient} flex items-center justify-center shadow-md ${
                  accentColor === color.name ? 'ring-2 ring-offset-2 ring-sky-500 dark:ring-offset-slate-900' : ''
                }`}>
                  {accentColor === color.name && <CheckCircle className="w-4 h-4 text-white" />}
                </div>
                <span className="text-xs font-semibold text-muted-foreground">{color.name}</span>
              </motion.div>
            ))}
          </div>
          {/* Preview */}
          <div className="mt-4 p-3 rounded-xl bg-muted/20">
            <p className="text-xs font-semibold text-muted-foreground mb-2">Preview</p>
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${ACCENT_COLORS.find(c => c.name === accentColor)?.gradient || 'from-sky-400 to-sky-600'} shadow-md`} />
              <div className="flex-1 h-2 rounded-full bg-muted/30 overflow-hidden">
                <motion.div
                  className={`h-full rounded-full bg-gradient-to-r ${ACCENT_COLORS.find(c => c.name === accentColor)?.gradient || 'from-sky-400 to-sky-600'}`}
                  initial={{ width: '0%' }}
                  animate={{ width: '65%' }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                />
              </div>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Font Size */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <GlassCard className="p-5 mb-4">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-4">
            <Type className="w-4 h-4 text-sky-500" /> Font Size
          </h3>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">Aa</span>
                <span className="text-sm font-bold text-foreground">{fontSize}px</span>
                <span className="text-lg text-muted-foreground">Aa</span>
              </div>
              <input
                type="range"
                min={12}
                max={22}
                value={fontSize}
                onChange={(e) => setFontSize(parseInt(e.target.value))}
                className="w-full h-2 rounded-full bg-muted/30 appearance-none cursor-pointer accent-sky-500"
              />
              <div className="flex justify-between mt-1">
                <span className="text-xs text-muted-foreground">Small</span>
                <span className="text-xs text-muted-foreground">Default</span>
                <span className="text-xs text-muted-foreground">Large</span>
              </div>
            </div>

            {/* Border Radius */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">Sharp</span>
                <span className="text-sm font-bold text-foreground">{borderRadius}px</span>
                <span className="text-xs text-muted-foreground">Round</span>
              </div>
              <input
                type="range"
                min={0}
                max={24}
                value={borderRadius}
                onChange={(e) => setBorderRadius(parseInt(e.target.value))}
                className="w-full h-2 rounded-full bg-muted/30 appearance-none cursor-pointer accent-sky-500"
              />
            </div>

            {/* Compact Mode */}
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-semibold text-foreground">Compact Mode</p>
                <p className="text-xs text-muted-foreground">Reduce spacing for more content</p>
              </div>
              <motion.button
                className={`w-11 h-6 rounded-full p-0.5 transition-colors ${compactMode ? 'bg-sky-500' : 'bg-muted'}`}
                onClick={() => setCompactMode(!compactMode)}
                whileTap={{ scale: 0.9 }}
              >
                <motion.div
                  className="w-5 h-5 rounded-full bg-white shadow-sm"
                  animate={{ x: compactMode ? 20 : 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              </motion.button>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Preview Card */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <GlassCard className="p-5 mb-4">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-4">
            <Eye className="w-4 h-4 text-sky-500" /> Live Preview
          </h3>
          <div className="p-4 rounded-xl bg-muted/20" style={{ borderRadius: `${borderRadius}px` }}>
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${ACCENT_COLORS.find(c => c.name === accentColor)?.gradient || 'from-sky-400 to-sky-600'}`} style={{ borderRadius: `${borderRadius / 2}px` }} />
              <div>
                <p className="font-bold text-foreground" style={{ fontSize: `${fontSize}px` }}>Sample Course Title</p>
                <p className="text-muted-foreground" style={{ fontSize: `${fontSize - 2}px` }}>Instructor Name</p>
              </div>
            </div>
            <div className="h-2 rounded-full bg-muted/30 overflow-hidden">
              <div className={`h-full rounded-full w-3/5 bg-gradient-to-r ${ACCENT_COLORS.find(c => c.name === accentColor)?.gradient || 'from-sky-400 to-sky-600'}`} style={{ borderRadius: `${borderRadius / 2}px` }} />
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Save Button */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
        <GradientButton onClick={handleSave} size="sm" className="w-full">
          <Save className="w-4 h-4" /> Save Theme Settings
        </GradientButton>
      </motion.div>
    </div>
  );
}
