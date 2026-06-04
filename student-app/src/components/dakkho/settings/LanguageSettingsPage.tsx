'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Globe, ChevronLeft, CheckCircle, Languages, Subtitles,
  RefreshCw, BookOpen, Monitor, Type, Save,
} from 'lucide-react';
import { useNavigationStore } from '@/lib/store';
import { GlassCard } from '../shared/GlassCard';
import { GradientButton } from '../shared/GradientButton';

function Selector({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-1 bg-muted/30 rounded-lg p-0.5">
      {options.map((opt) => (
        <motion.button
          key={opt}
          className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
            value === opt ? 'bg-white dark:bg-slate-700 shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => onChange(opt)}
          whileTap={{ scale: 0.95 }}
        >
          {opt}
        </motion.button>
      ))}
    </div>
  );
}

export function LanguageSettingsPage() {
  const { goBack } = useNavigationStore();

  const [appLanguage, setAppLanguage] = useState('English');
  const [subtitleLanguage, setSubtitleLanguage] = useState('English');
  const [autoTranslate, setAutoTranslate] = useState(true);
  const [translateTarget, setTranslateTarget] = useState('Bangla');
  const [subtitleSize, setSubtitleSize] = useState('Medium');
  const [subtitleBackground, setSubtitleBackground] = useState('Semi-transparent');
  const [interfaceFont, setInterfaceFont] = useState('Default');
  const [saved, setSaved] = useState(false);

  const languages = [
    { code: 'bn', name: 'বাংলা (Bangla)', flag: '🇧🇩', native: 'Bangla', progress: 95 },
    { code: 'en', name: 'English', flag: '🇬🇧', native: 'English', progress: 100 },
    { code: 'hi', name: 'हिन्दी (Hindi)', flag: '🇮🇳', native: 'Hindi', progress: 70 },
    { code: 'ar', name: 'العربية (Arabic)', flag: '🇸🇦', native: 'Arabic', progress: 45 },
  ];

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="pb-20 lg:pb-0">
      {/* Header */}
      <motion.div className="flex items-center gap-3 mb-6" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <motion.button className="w-9 h-9 rounded-xl bg-muted/30 flex items-center justify-center text-foreground" onClick={goBack} whileTap={{ scale: 0.9 }}>
          <ChevronLeft className="w-5 h-5" />
        </motion.button>
        <div>
          <h1 className="text-xl font-extrabold text-foreground">Language Settings</h1>
          <p className="text-xs text-muted-foreground">Customize language and subtitle preferences</p>
        </div>
      </motion.div>

      {saved && (
        <motion.div
          className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 flex items-center gap-2"
          initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        >
          <CheckCircle className="w-4 h-4 text-emerald-500" />
          <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">Language preferences saved!</p>
        </motion.div>
      )}

      {/* App Language */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <GlassCard className="p-5 mb-4">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-4">
            <Languages className="w-4 h-4 text-sky-500" /> App Language
          </h3>
          <div className="space-y-3">
            {languages.map((lang, i) => (
              <motion.div
                key={lang.code}
                className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                  appLanguage === lang.native
                    ? 'bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800'
                    : 'bg-muted/20 border border-transparent hover:bg-muted/30'
                }`}
                onClick={() => setAppLanguage(lang.native)}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.05 }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="text-2xl">{lang.flag}</span>
                <div className="flex-1">
                  <p className="text-sm font-bold text-foreground">{lang.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1.5 rounded-full bg-muted/30 overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-sky-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${lang.progress}%` }}
                        transition={{ delay: 0.3 + i * 0.1, duration: 0.5 }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground">{lang.progress}%</span>
                  </div>
                </div>
                {appLanguage === lang.native && (
                  <CheckCircle className="w-5 h-5 text-sky-500" />
                )}
              </motion.div>
            ))}
          </div>
        </GlassCard>
      </motion.div>

      {/* Subtitle Preferences */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <GlassCard className="p-5 mb-4">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-4">
            <Subtitles className="w-4 h-4 text-sky-500" /> Video Subtitles
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-semibold text-foreground">Subtitle Language</p>
                <p className="text-xs text-muted-foreground">Default language for video subtitles</p>
              </div>
              <Selector options={['Bangla', 'English', 'Hindi', 'Off']} value={subtitleLanguage} onChange={setSubtitleLanguage} />
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-semibold text-foreground">Subtitle Size</p>
                <p className="text-xs text-muted-foreground">Adjust subtitle text size</p>
              </div>
              <Selector options={['Small', 'Medium', 'Large']} value={subtitleSize} onChange={setSubtitleSize} />
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-semibold text-foreground">Subtitle Background</p>
                <p className="text-xs text-muted-foreground">Subtitle backdrop style</p>
              </div>
              <Selector options={['None', 'Semi-transparent', 'Solid']} value={subtitleBackground} onChange={setSubtitleBackground} />
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Auto-Translate */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <GlassCard className="p-5 mb-4">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-4">
            <RefreshCw className="w-4 h-4 text-sky-500" /> Auto-Translate
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-semibold text-foreground">Enable Auto-Translate</p>
                <p className="text-xs text-muted-foreground">Automatically translate content to your preferred language</p>
              </div>
              <motion.button
                className={`w-11 h-6 rounded-full p-0.5 transition-colors ${autoTranslate ? 'bg-sky-500' : 'bg-muted'}`}
                onClick={() => setAutoTranslate(!autoTranslate)}
                whileTap={{ scale: 0.9 }}
              >
                <motion.div
                  className="w-5 h-5 rounded-full bg-white shadow-sm"
                  animate={{ x: autoTranslate ? 20 : 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              </motion.button>
            </div>
            {autoTranslate && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-3 rounded-xl bg-muted/20">
                <p className="text-xs font-semibold text-muted-foreground mb-2">Translate to</p>
                <div className="flex gap-2 flex-wrap">
                  {['Bangla', 'English', 'Hindi', 'Arabic'].map((lang) => (
                    <motion.button
                      key={lang}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                        translateTarget === lang ? 'bg-sky-500 text-white' : 'bg-muted/30 text-muted-foreground'
                      }`}
                      onClick={() => setTranslateTarget(lang)}
                      whileTap={{ scale: 0.95 }}
                    >
                      {lang}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </GlassCard>
      </motion.div>

      {/* Interface Font */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <GlassCard className="p-5">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-4">
            <Type className="w-4 h-4 text-sky-500" /> Interface Font
          </h3>
          <div className="space-y-3">
            {['Default', 'Noto Sans Bengali', 'Hind Siliguri', 'Kalpurush'].map((font, i) => (
              <motion.div
                key={font}
                className={`flex items-center justify-between p-3 rounded-xl cursor-pointer ${
                  interfaceFont === font ? 'bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800' : 'bg-muted/20'
                }`}
                onClick={() => setInterfaceFont(font)}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 + i * 0.05 }}
                whileTap={{ scale: 0.98 }}
              >
                <div>
                  <p className="text-sm font-semibold text-foreground" style={{ fontFamily: font === 'Default' ? undefined : font }}>
                    {font}
                  </p>
                  <p className="text-xs text-muted-foreground">The quick brown fox jumps over the lazy dog</p>
                </div>
                {interfaceFont === font && <CheckCircle className="w-4 h-4 text-sky-500" />}
              </motion.div>
            ))}
          </div>
          <div className="mt-4">
            <GradientButton onClick={handleSave} size="sm">
              <Save className="w-4 h-4" /> Save Language Settings
            </GradientButton>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
}
