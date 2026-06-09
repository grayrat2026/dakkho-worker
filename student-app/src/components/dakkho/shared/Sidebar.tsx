'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home, Compass, BookOpen, Bookmark, Grid3X3, GraduationCap,
  Settings, HelpCircle, X, LogOut, ChevronRight, Clock, Download,
  Award, Radio, Trophy, MessageCircle, Info, Monitor, Cpu, Zap,
  Wrench, Building2, Ruler, Scissors, FlaskConical, Car, Snowflake,
  Wine, Printer, MapPin, Bot, Mountain, Plug, Gauge, Apple, ShoppingBag,
  BookOpenCheck, FileQuestion, ClipboardList, Users, Heart, Flag,
  ChevronDown, DollarSign, Sparkles, CalendarDays
} from 'lucide-react';
import { useNavigationStore, useAuthStore, useServerConfigStore } from '@/lib/store';
import type { Page } from '@/lib/store';
import { TECHNOLOGY_SHORT_NAMES } from '@/lib/constants';
import Image from 'next/image';

interface SidebarItem {
  icon: React.ElementType;
  label: string;
  page: Page;
  badge?: number;
}

function SidebarContent() {
  const currentPage = useNavigationStore((s) => s.currentPage);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const setSidebarOpen = useNavigationStore((s) => s.setSidebarOpen);
  const navigate = useNavigationStore((s) => s.navigate);
  const isSidebarSectionVisible = useServerConfigStore((s) => s.isSidebarSectionVisible);
  const isFeatureEnabled = useServerConfigStore((s) => s.isFeatureEnabled);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({ dept: false, semester: false, exam: false, social: false });

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const menuItems: SidebarItem[] = [
    { icon: Home, label: 'Home', page: 'home' },
    { icon: Compass, label: 'Explore', page: 'explore' },
    { icon: BookOpen, label: 'My Courses', page: 'my-courses' },
    { icon: Bookmark, label: 'Bookmarks', page: 'bookmarks' },
    { icon: Grid3X3, label: 'Categories', page: 'category' },
    { icon: GraduationCap, label: 'Instructors', page: 'instructors' },
    { icon: Clock, label: 'Watch History', page: 'watch-history' },
    { icon: Download, label: 'Downloads', page: 'downloads' },
    { icon: Award, label: 'Certificates', page: 'certificates' },
    { icon: Radio, label: 'Live Sessions', page: 'live-sessions' },
    { icon: Trophy, label: 'Achievements', page: 'achievements' },
  ];

  const deptItems: SidebarItem[] = [
    { icon: Monitor, label: 'Computer Science', page: 'dept-cse' },
    { icon: Cpu, label: 'Electronics & Telecom', page: 'dept-ete' },
    { icon: Zap, label: 'Electrical Eng.', page: 'dept-eee' },
    { icon: Wrench, label: 'Mechanical Eng.', page: 'dept-me' },
    { icon: Building2, label: 'Civil Eng.', page: 'dept-ce' },
    { icon: Ruler, label: 'Architecture', page: 'dept-architecture' },
    { icon: Scissors, label: 'Textile Eng.', page: 'dept-textile' },
    { icon: FlaskConical, label: 'Chemical Eng.', page: 'dept-chemical' },
    { icon: Car, label: 'Automobile Eng.', page: 'dept-automobile' },
    { icon: Snowflake, label: 'RAC', page: 'dept-rac' },
    { icon: Wine, label: 'Glass & Ceramic', page: 'dept-glass-ceramic' },
    { icon: Printer, label: 'Printing Eng.', page: 'dept-printing' },
    { icon: MapPin, label: 'Surveying Eng.', page: 'dept-surveying' },
    { icon: Bot, label: 'Mechatronics', page: 'dept-mechatronics' },
    { icon: Mountain, label: 'Mining Eng.', page: 'dept-mining' },
    { icon: Gauge, label: 'Power Eng.', page: 'dept-power' },
    { icon: Apple, label: 'Food Eng.', page: 'dept-food' },
    { icon: ShoppingBag, label: 'Leather Eng.', page: 'dept-leather' },
  ];

  const semesterItems: SidebarItem[] = [
    { icon: BookOpenCheck, label: 'Semester 1', page: 'semester-1' },
    { icon: BookOpenCheck, label: 'Semester 2', page: 'semester-2' },
    { icon: BookOpenCheck, label: 'Semester 3', page: 'semester-3' },
    { icon: BookOpenCheck, label: 'Semester 4', page: 'semester-4' },
    { icon: BookOpenCheck, label: 'Semester 5', page: 'semester-5' },
    { icon: BookOpenCheck, label: 'Semester 6', page: 'semester-6' },
    { icon: BookOpenCheck, label: 'Semester 7', page: 'semester-7' },
    { icon: BookOpenCheck, label: 'Semester 8', page: 'semester-8' },
  ];

  const examItems: SidebarItem[] = [
    { icon: ClipboardList, label: 'Exam Prep', page: 'exam-prep' },
    { icon: CalendarDays, label: 'Exam Schedule', page: 'exam-schedule' },
    { icon: Award, label: 'Exam Results', page: 'exam-results' },
    { icon: FileQuestion, label: 'Practice', page: 'exam-practice' },
    { icon: Sparkles, label: 'Exam Tips', page: 'exam-tips' },
  ];

  const socialItems: SidebarItem[] = [
    { icon: Trophy, label: 'Leaderboard', page: 'leaderboard' },
    { icon: Users, label: 'Study Groups', page: 'study-groups' },
    { icon: Heart, label: 'Peers', page: 'peer-connections' },
    { icon: MessageCircle, label: 'Community', page: 'community' },
    { icon: Flag, label: 'Feedback', page: 'feedback' },
    { icon: DollarSign, label: 'Pricing', page: 'pricing' },
  ];

  const generalItems: SidebarItem[] = [
    { icon: Settings, label: 'Settings', page: 'settings' },
    { icon: HelpCircle, label: 'Help', page: 'help' },
    { icon: MessageCircle, label: 'Discussion', page: 'discussion' },
    { icon: Info, label: 'About', page: 'about' },
  ];

  // Filter menu items based on server-driven feature visibility
  const filteredMenuItems = menuItems.filter((item) => {
    const featureMap: Record<string, string> = {
      'my-courses': 'bookmarks', // My Courses always visible
      'bookmarks': 'bookmarks',
      'downloads': 'downloads',
      'certificates': 'certificates',
      'live-sessions': 'liveSessions',
      'achievements': 'achievements',
    };
    const feature = featureMap[item.page];
    return feature ? isFeatureEnabled(feature) : true;
  });

  // Filter social items based on server-driven feature visibility
  const filteredSocialItems = socialItems.filter((item) => {
    const featureMap: Record<string, string> = {
      'leaderboard': 'leaderboard',
      'study-groups': 'studyGroups',
      'peer-connections': 'peerConnections',
      'community': 'community',
      'feedback': 'feedback',
      'pricing': 'pricing',
    };
    const feature = featureMap[item.page];
    return feature ? isFeatureEnabled(feature) : true;
  });

  const handleNav = (page: Page) => {
    navigate(page);
    setSidebarOpen(false);
  };

  const renderNavItem = (item: SidebarItem, i: number, baseDelay: number) => {
    const isActive = currentPage === item.page;
    return (
      <motion.button
        key={item.page + item.label}
        className={`
          w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold
          transition-all duration-200 group relative
          ${isActive
            ? 'bg-gradient-to-r from-sky-500/10 to-blue-500/10 text-sky-600 dark:text-sky-400 shadow-sm shadow-sky-500/5'
            : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
          }
        `}
        onClick={() => handleNav(item.page)}
        whileHover={{ x: 4 }}
        whileTap={{ scale: 0.98 }}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: baseDelay + i * 0.02 }}
      >
        <item.icon className={`w-4 h-4 transition-colors ${isActive ? 'text-sky-500' : 'group-hover:text-sky-400'}`} />
        <span className="flex-1 text-left text-[13px]">{item.label}</span>
        {isActive && (
          <ChevronRight className="w-3.5 h-3.5 text-sky-500" />
        )}
      </motion.button>
    );
  };

  const renderCollapsibleSection = (id: string, label: string, items: SidebarItem[], baseDelay: number) => {
    const isExpanded = expandedSections[id];
    return (
      <div>
        <motion.button
          className="w-full flex items-center gap-3 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60 hover:text-muted-foreground transition-colors"
          onClick={() => toggleSection(id)}
          whileTap={{ scale: 0.98 }}
        >
          <motion.div animate={{ rotate: isExpanded ? 90 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown className="w-3 h-3" />
          </motion.div>
          <span className="flex-1 text-left">{label}</span>
          <span className="text-[9px] font-normal bg-muted/50 rounded-full px-1.5 py-0.5">{items.length}</span>
        </motion.button>
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className="overflow-hidden"
            >
              {items.map((item, i) => renderNavItem(item, i, baseDelay))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/20 dark:border-white/5">
        <motion.div
          className="flex items-center cursor-pointer"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => handleNav('home')}
        >
          <Image src="/logo.png" alt="Logo" width={32} height={32} className="rounded-lg" />
        </motion.div>
        <motion.button
          className="md:hidden w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center"
          onClick={() => setSidebarOpen(false)}
          whileHover={{ scale: 1.1, rotate: 90 }}
          whileTap={{ scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 300 }}
        >
          <X className="w-4 h-4" />
        </motion.button>
      </div>

      {/* User info (mobile only) */}
      {user && (
        <motion.div
          className="p-4 border-b border-white/20 dark:border-white/5 md:hidden"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="flex items-center gap-3">
            <motion.div
              className="w-12 h-12 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-sky-500/30"
              whileHover={{ scale: 1.05 }}
            >
              {user.fullName.charAt(0)}
            </motion.div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-foreground truncate">{user.fullName}</p>
              <p className="text-xs text-muted-foreground truncate">{user.technology ? (TECHNOLOGY_SHORT_NAMES[user.technology] || user.technology) : 'No technology set'}</p>
              <p className="text-xs text-sky-500 truncate">{user.institute || 'No institute set'}</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Nav items - scrollable independently */}
      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5" style={{ overscrollBehavior: 'contain' }}>
        <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">Menu</p>
        {filteredMenuItems.map((item, i) => {
          const isActive = currentPage === item.page;
          return (
            <motion.button
              key={item.page + item.label}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold
                transition-all duration-200 group relative
                ${isActive
                  ? 'bg-gradient-to-r from-sky-500/10 to-blue-500/10 text-sky-600 dark:text-sky-400 shadow-sm shadow-sky-500/5'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                }
              `}
              onClick={() => handleNav(item.page)}
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <motion.div
                animate={{ scale: isActive ? 1.1 : 1 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                <item.icon className={`w-5 h-5 transition-colors ${isActive ? 'text-sky-500' : 'group-hover:text-sky-400'}`} />
              </motion.div>
              <span className="flex-1 text-left">{item.label}</span>
              {isActive && (
                <ChevronRight className="w-4 h-4 text-sky-500" />
              )}
              {isActive && (
                <motion.div
                  className="absolute left-0 w-1 h-6 rounded-r-full bg-gradient-to-b from-sky-500 to-blue-600"
                  layoutId="sidebar-active-indicator"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
            </motion.button>
          );
        })}

        {/* Departments section */}
        {isSidebarSectionVisible('departments') && renderCollapsibleSection('dept', 'Departments', deptItems, 0.3)}

        {/* Semester section */}
        {isSidebarSectionVisible('semesters') && renderCollapsibleSection('semester', 'Semesters', semesterItems, 0.4)}

        {/* Exam section */}
        {isSidebarSectionVisible('exams') && renderCollapsibleSection('exam', 'Exams', examItems, 0.5)}

        {/* Social section */}
        {isSidebarSectionVisible('community') && renderCollapsibleSection('social', 'Community', filteredSocialItems, 0.6)}

        <p className="px-3 py-2 mt-4 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">General</p>
        {generalItems.map((item, i) => {
          const isActive = currentPage === item.page;
          return (
            <motion.button
              key={item.page + item.label}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold
                transition-all duration-200 group
                ${isActive
                  ? 'bg-gradient-to-r from-sky-500/10 to-blue-500/10 text-sky-600 dark:text-sky-400'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                }
              `}
              onClick={() => handleNav(item.page)}
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: (i + menuItems.length) * 0.03 }}
            >
              <item.icon className={`w-5 h-5 transition-colors ${isActive ? 'text-sky-500' : 'group-hover:text-sky-400'}`} />
              <span className="flex-1 text-left">{item.label}</span>
            </motion.button>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-white/20 dark:border-white/5">
        <motion.button
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          onClick={() => { logout(); setSidebarOpen(false); }}
          whileHover={{ x: 4 }}
          whileTap={{ scale: 0.98 }}
        >
          <LogOut className="w-5 h-5" />
          <span>Logout</span>
        </motion.button>
      </div>
    </div>
  );
}

export function Sidebar() {
  const sidebarOpen = useNavigationStore((s) => s.sidebarOpen);

  return (
    <>
      {/* Desktop sidebar - always visible, fixed, independent scroll */}
      <aside className="hidden md:flex fixed top-0 left-0 h-full w-[260px] z-40 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl border-r border-white/30 dark:border-white/10 flex-col">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar - overlay from right */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.aside
            className="fixed top-0 right-0 h-full w-[280px] z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-l border-white/50 dark:border-white/10 shadow-2xl shadow-sky-500/10 flex flex-col md:hidden"
            initial={{ x: 280 }}
            animate={{ x: 0 }}
            exit={{ x: 280 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <SidebarContent />
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
