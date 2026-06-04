'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  StickyNote, Plus, Trash2, Edit3, Save, Clock,
  BookOpen, Tag, Search, X, ChevronDown, FileText,
  Palette, Bold, Italic, Underline, List,
} from 'lucide-react';
import { useNavigationStore } from '@/lib/store';
import { getCourse, getCourseVideos, formatDuration } from '@/lib/mock-data';
import { GlassCard } from '../shared/GlassCard';
import { AnimatedPage } from '../shared/AnimatedPage';
import { GradientButton } from '../shared/GradientButton';

interface Note {
  id: string;
  videoId?: string;
  videoTitle?: string;
  timestamp?: number;
  content: string;
  tags: string[];
  color: string;
  createdAt: string;
  updatedAt: string;
}

const COLORS = [
  { name: 'Default', value: 'bg-white/70 dark:bg-slate-900/70', border: 'border-white/50 dark:border-white/10' },
  { name: 'Sky', value: 'bg-sky-50/80 dark:bg-sky-900/30', border: 'border-sky-200/50 dark:border-sky-800/30' },
  { name: 'Amber', value: 'bg-amber-50/80 dark:bg-amber-900/30', border: 'border-amber-200/50 dark:border-amber-800/30' },
  { name: 'Emerald', value: 'bg-emerald-50/80 dark:bg-emerald-900/30', border: 'border-emerald-200/50 dark:border-emerald-800/30' },
  { name: 'Rose', value: 'bg-rose-50/80 dark:bg-rose-900/30', border: 'border-rose-200/50 dark:border-rose-800/30' },
  { name: 'Purple', value: 'bg-purple-50/80 dark:bg-purple-900/30', border: 'border-purple-200/50 dark:border-purple-800/30' },
];

const MOCK_NOTES: Note[] = [
  { id: 'n1', videoId: 'v-c1-1', videoTitle: 'Introduction & Overview — Complete Web Development', timestamp: 120, content: 'Key concepts:\n- HTML5 is the latest standard for web pages\n- CSS3 adds advanced styling capabilities\n- JavaScript enables interactive functionality\n\nImportant: Always use semantic HTML tags for better accessibility.', tags: ['html', 'basics', 'important'], color: 'bg-sky-50/80 dark:bg-sky-900/30', createdAt: '2 days ago', updatedAt: '1 day ago' },
  { id: 'n2', videoId: 'v-c1-3', videoTitle: 'Basic Concepts — Complete Web Development', timestamp: 340, content: 'CSS Box Model:\n- Content → Padding → Border → Margin\n- box-sizing: border-box includes padding and border in width\n- Use flexbox for one-dimensional layouts\n- Use grid for two-dimensional layouts', tags: ['css', 'layout', 'box-model'], color: 'bg-amber-50/80 dark:bg-amber-900/30', createdAt: '3 days ago', updatedAt: '3 days ago' },
  { id: 'n3', videoId: 'v-c1-5', videoTitle: 'Core Principles — Complete Web Development', timestamp: 560, content: 'JavaScript Variables:\n- let: block-scoped, can be reassigned\n- const: block-scoped, cannot be reassigned\n- var: function-scoped (avoid using)\n\nFunctions:\n- Arrow functions: const fn = () => {}\n- Default parameters: const fn = (a = 1) => {}', tags: ['javascript', 'variables', 'functions'], color: 'bg-emerald-50/80 dark:bg-emerald-900/30', createdAt: '5 days ago', updatedAt: '4 days ago' },
  { id: 'n4', content: 'General Study Notes:\n- Practice coding for at least 1 hour daily\n- Build small projects to apply concepts\n- Review previous topics before starting new ones\n- Use browser DevTools for debugging\n- Follow MDN documentation for reference', tags: ['study-tips', 'general'], color: 'bg-purple-50/80 dark:bg-purple-900/30', createdAt: '1 week ago', updatedAt: '1 week ago' },
  { id: 'n5', videoId: 'v-c1-8', videoTitle: 'Hands-on Practice — Complete Web Development', timestamp: 780, content: 'Responsive Design Checklist:\n- Use viewport meta tag\n- Media queries for different breakpoints\n- Mobile-first approach\n- Flexible images with max-width: 100%\n- Test on multiple devices and browsers', tags: ['responsive', 'css', 'mobile'], color: 'bg-rose-50/80 dark:bg-rose-900/30', createdAt: '1 week ago', updatedAt: '6 days ago' },
];

export function CourseNotesPage() {
  const { pageParams, navigate, goBack } = useNavigationStore();
  const courseId = pageParams.courseId as string;
  const course = getCourse(courseId);

  const [notes, setNotes] = useState<Note[]>(MOCK_NOTES);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newNoteColor, setNewNoteColor] = useState(COLORS[0].value);
  const [newNoteTags, setNewNoteTags] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  if (!course) {
    return (
      <AnimatedPage>
        <div className="text-center py-16">
          <p className="text-lg font-bold">Course not found</p>
          <GradientButton onClick={goBack} className="mt-4">Go Back</GradientButton>
        </div>
      </AnimatedPage>
    );
  }

  const allTags = Array.from(new Set(notes.flatMap((n) => n.tags)));

  const filteredNotes = notes.filter((note) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (!note.content.toLowerCase().includes(q) && !note.tags.some((t) => t.toLowerCase().includes(q))) return false;
    }
    if (selectedTag && !note.tags.includes(selectedTag)) return false;
    return true;
  });

  const handleAddNote = () => {
    if (!newNoteContent.trim()) return;
    const newNote: Note = {
      id: `n-${Date.now()}`,
      content: newNoteContent,
      tags: newNoteTags.split(',').map((t) => t.trim()).filter(Boolean),
      color: newNoteColor,
      createdAt: 'Just now',
      updatedAt: 'Just now',
    };
    setNotes([newNote, ...notes]);
    setNewNoteContent('');
    setNewNoteTags('');
    setShowAddForm(false);
  };

  const handleDeleteNote = (id: string) => {
    setNotes(notes.filter((n) => n.id !== id));
  };

  const startEdit = (note: Note) => {
    setEditingNoteId(note.id);
    setEditContent(note.content);
  };

  const saveEdit = (id: string) => {
    setNotes(notes.map((n) => n.id === id ? { ...n, content: editContent, updatedAt: 'Just now' } : n));
    setEditingNoteId(null);
    setEditContent('');
  };

  const formatTimestamp = (seconds?: number) => {
    if (!seconds) return '';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <AnimatedPage keyProp={`course-notes-${courseId}`}>
      <div className="pb-20 lg:pb-0">
        {/* Breadcrumb */}
        <motion.div
          className="flex items-center gap-2 text-sm text-muted-foreground mb-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <button onClick={() => navigate('home')} className="hover:text-sky-500 transition-colors">Home</button>
          <span>/</span>
          <button onClick={() => navigate('course-detail', { courseId })} className="hover:text-sky-500 transition-colors">{course.title}</button>
          <span>/</span>
          <span className="text-foreground font-semibold">Notes</span>
        </motion.div>

        {/* Header */}
        <GlassCard className="p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-lg font-extrabold text-foreground flex items-center gap-2">
                <StickyNote className="w-5 h-5 text-sky-500" />
                My Notes
              </h1>
              <p className="text-sm text-muted-foreground mt-1">{course.title} &middot; {notes.length} notes</p>
            </div>
            <GradientButton size="sm" onClick={() => setShowAddForm(!showAddForm)}>
              <Plus className="w-4 h-4" />
              New Note
            </GradientButton>
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-muted/30 border border-white/30 dark:border-white/10 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/50"
            />
          </div>

          {/* Tags filter */}
          <div className="flex gap-2 flex-wrap">
            <motion.button
              className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold ${
                selectedTag === null ? 'bg-sky-500 text-white' : 'bg-muted/30 text-muted-foreground'
              }`}
              onClick={() => setSelectedTag(null)}
              whileTap={{ scale: 0.95 }}
            >
              All
            </motion.button>
            {allTags.map((tag) => (
              <motion.button
                key={tag}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold ${
                  selectedTag === tag ? 'bg-sky-500 text-white' : 'bg-muted/30 text-muted-foreground'
                }`}
                onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                whileTap={{ scale: 0.95 }}
              >
                #{tag}
              </motion.button>
            ))}
          </div>
        </GlassCard>

        {/* Add Note Form */}
        <AnimatePresence>
          {showAddForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <GlassCard className="p-6 mb-6">
                <h3 className="text-sm font-bold text-foreground mb-3">New Note</h3>

                {/* Color picker */}
                <div className="flex items-center gap-2 mb-3">
                  <Palette className="w-4 h-4 text-muted-foreground" />
                  {COLORS.map((c) => (
                    <motion.button
                      key={c.name}
                      className={`w-6 h-6 rounded-full ${c.value} border-2 ${
                        newNoteColor === c.value ? 'border-sky-500 ring-2 ring-sky-500/30' : 'border-transparent'
                      }`}
                      onClick={() => setNewNoteColor(c.value)}
                      whileTap={{ scale: 0.9 }}
                    />
                  ))}
                </div>

                <textarea
                  value={newNoteContent}
                  onChange={(e) => setNewNoteContent(e.target.value)}
                  placeholder="Write your note here..."
                  rows={5}
                  className="w-full px-4 py-3 rounded-xl bg-muted/30 border border-white/30 dark:border-white/10 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/50 resize-none"
                />
                <input
                  type="text"
                  value={newNoteTags}
                  onChange={(e) => setNewNoteTags(e.target.value)}
                  placeholder="Tags (comma separated, e.g., html, css, important)"
                  className="w-full mt-2 px-4 py-2.5 rounded-xl bg-muted/30 border border-white/30 dark:border-white/10 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                />
                <div className="flex justify-end gap-3 mt-3">
                  <motion.button
                    className="px-4 py-2 rounded-xl bg-muted/30 text-sm font-semibold text-foreground"
                    onClick={() => { setShowAddForm(false); setNewNoteContent(''); setNewNoteTags(''); }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Cancel
                  </motion.button>
                  <GradientButton size="sm" onClick={handleAddNote}>
                    <Save className="w-4 h-4" />
                    Save Note
                  </GradientButton>
                </div>
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Notes Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredNotes.map((note, i) => (
            <motion.div
              key={note.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              layout
            >
              <GlassCard className={`p-5 ${note.color} relative group`}>
                {/* Video reference */}
                {note.videoTitle && (
                  <div className="flex items-center gap-2 mb-3 text-xs text-muted-foreground">
                    <BookOpen className="w-3 h-3" />
                    <span className="line-clamp-1 flex-1">{note.videoTitle}</span>
                    {note.timestamp && (
                      <span className="px-1.5 py-0.5 rounded bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 text-[10px] font-bold">
                        {formatTimestamp(note.timestamp)}
                      </span>
                    )}
                  </div>
                )}

                {/* Content */}
                {editingNoteId === note.id ? (
                  <div>
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={6}
                      className="w-full px-3 py-2 rounded-lg bg-muted/30 border border-white/30 dark:border-white/10 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/50 resize-none"
                    />
                    <div className="flex gap-2 mt-2">
                      <GradientButton size="sm" onClick={() => saveEdit(note.id)}>
                        <Save className="w-3 h-3" /> Save
                      </GradientButton>
                      <motion.button
                        className="px-3 py-1.5 rounded-lg bg-muted/30 text-xs font-semibold text-foreground"
                        onClick={() => setEditingNoteId(null)}
                        whileTap={{ scale: 0.95 }}
                      >
                        Cancel
                      </motion.button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-foreground whitespace-pre-line leading-relaxed line-clamp-6">{note.content}</p>
                )}

                {/* Tags */}
                {note.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {note.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 rounded-full bg-white/50 dark:bg-white/10 text-[10px] font-semibold text-foreground"
                        onClick={() => setSelectedTag(tag)}
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/20 dark:border-white/5">
                  <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" />
                    {note.updatedAt}
                  </span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <motion.button
                      className="w-7 h-7 rounded-lg bg-white/50 dark:bg-white/10 flex items-center justify-center"
                      onClick={() => startEdit(note)}
                      whileTap={{ scale: 0.9 }}
                    >
                      <Edit3 className="w-3 h-3 text-muted-foreground" />
                    </motion.button>
                    <motion.button
                      className="w-7 h-7 rounded-lg bg-white/50 dark:bg-white/10 flex items-center justify-center"
                      onClick={() => handleDeleteNote(note.id)}
                      whileTap={{ scale: 0.9 }}
                    >
                      <Trash2 className="w-3 h-3 text-red-500" />
                    </motion.button>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>

        {filteredNotes.length === 0 && (
          <GlassCard className="p-8 text-center">
            <StickyNote className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No notes found. Start taking notes!</p>
          </GlassCard>
        )}
      </div>
    </AnimatedPage>
  );
}
