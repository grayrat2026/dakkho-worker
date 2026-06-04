'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, ChevronLeft, Plus, Search, MessageSquare,
  BookOpen, Clock, UserPlus, Lock, Globe, ChevronRight,
  X, CheckCircle, UserCheck, Sparkles,
} from 'lucide-react';
import { useNavigationStore } from '@/lib/store';
import { GlassCard } from '../shared/GlassCard';
import { GradientButton } from '../shared/GradientButton';

export function StudyGroupsPage() {
  const { goBack } = useNavigationStore();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [joinedGroups, setJoinedGroups] = useState<string[]>(['cse-algo', 'math-study']);

  const groups = [
    {
      id: 'cse-algo',
      name: 'CSE Algorithm Masters',
      description: 'Deep dive into algorithms and data structures for semester 6 exam prep',
      members: 24,
      maxMembers: 30,
      subject: 'CSE',
      isPublic: true,
      lastActive: '5 min ago',
      chatPreview: 'Can anyone explain Dijkstra\'s algorithm with an example?',
      onlineMembers: 8,
      color: 'from-sky-400 to-blue-600',
    },
    {
      id: 'math-study',
      name: 'Math Warriors',
      description: 'Practice group for Mathematics-III. We solve problems together every evening.',
      members: 18,
      maxMembers: 25,
      subject: 'Mathematics',
      isPublic: true,
      lastActive: '12 min ago',
      chatPreview: 'The integration problem from chapter 5 is tricky...',
      onlineMembers: 5,
      color: 'from-violet-400 to-violet-600',
    },
    {
      id: 'eee-circuit',
      name: 'Circuit Solvers',
      description: 'Electrical circuits problem solving and lab preparation group',
      members: 15,
      maxMembers: 20,
      subject: 'EEE',
      isPublic: false,
      lastActive: '1 hour ago',
      chatPreview: 'Lab report format for the transformer experiment?',
      onlineMembers: 3,
      color: 'from-amber-400 to-amber-600',
    },
    {
      id: 'me-thermo',
      name: 'Thermo Study Circle',
      description: 'Thermodynamics concepts, numerical problems, and exam strategies',
      members: 12,
      maxMembers: 20,
      subject: 'ME',
      isPublic: true,
      lastActive: '3 hours ago',
      chatPreview: 'Entropy change in irreversible processes...',
      onlineMembers: 2,
      color: 'from-emerald-400 to-emerald-600',
    },
    {
      id: 'eng-practice',
      name: 'English Communication',
      description: 'Improve presentation skills, report writing, and technical English',
      members: 20,
      maxMembers: 30,
      subject: 'English',
      isPublic: true,
      lastActive: '30 min ago',
      chatPreview: 'Has anyone prepared the technical report template?',
      onlineMembers: 6,
      color: 'from-rose-400 to-rose-600',
    },
    {
      id: 'ce-drawing',
      name: 'Drawing & Design Hub',
      description: 'Engineering drawing practice, CAD tips, and assignment help',
      members: 10,
      maxMembers: 15,
      subject: 'CE',
      isPublic: false,
      lastActive: '2 hours ago',
      chatPreview: 'Can someone share the isometric projection tips?',
      onlineMembers: 1,
      color: 'from-teal-400 to-teal-600',
    },
  ];

  const filteredGroups = groups.filter((g) => {
    if (filter === 'joined') return joinedGroups.includes(g.id);
    if (filter === 'public') return g.isPublic;
    return true;
  }).filter((g) =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleJoin = (groupId: string) => {
    setJoinedGroups((prev) =>
      prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]
    );
  };

  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [newGroupSubject, setNewGroupSubject] = useState('CSE');
  const [newGroupPublic, setNewGroupPublic] = useState(true);

  return (
    <div className="pb-20 lg:pb-0">
      {/* Header */}
      <motion.div className="flex items-center gap-3 mb-6" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <motion.button className="w-9 h-9 rounded-xl bg-muted/30 flex items-center justify-center text-foreground" onClick={goBack} whileTap={{ scale: 0.9 }}>
          <ChevronLeft className="w-5 h-5" />
        </motion.button>
        <div className="flex-1">
          <h1 className="text-xl font-extrabold text-foreground">Study Groups</h1>
          <p className="text-xs text-muted-foreground">Learn together, achieve more</p>
        </div>
        <motion.button
          className="w-9 h-9 rounded-xl bg-sky-500 flex items-center justify-center text-white"
          onClick={() => setShowCreateModal(true)}
          whileTap={{ scale: 0.9 }}
        >
          <Plus className="w-5 h-5" />
        </motion.button>
      </motion.div>

      {/* Search */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search groups..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/50 dark:border-white/10 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/50"
          />
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="mb-4">
        <div className="flex gap-2">
          {[
            { id: 'all', label: 'All Groups' },
            { id: 'joined', label: 'My Groups' },
            { id: 'public', label: 'Public' },
          ].map((f) => (
            <motion.button
              key={f.id}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                filter === f.id ? 'bg-sky-500 text-white' : 'bg-muted/30 text-muted-foreground'
              }`}
              onClick={() => setFilter(f.id)}
              whileTap={{ scale: 0.95 }}
            >
              {f.label}
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Groups List */}
      <div className="space-y-3">
        {filteredGroups.map((group, i) => {
          const isJoined = joinedGroups.includes(group.id);
          return (
            <motion.div
              key={group.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.04 }}
            >
              <GlassCard className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${group.color} flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-md`}>
                    {group.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h4 className="text-sm font-bold text-foreground truncate">{group.name}</h4>
                      {group.isPublic ? (
                        <Globe className="w-3 h-3 text-sky-500 flex-shrink-0" />
                      ) : (
                        <Lock className="w-3 h-3 text-amber-500 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mb-2 line-clamp-1">{group.description}</p>

                    {/* Chat Preview */}
                    <div className="p-2 rounded-lg bg-muted/20 mb-2">
                      <div className="flex items-start gap-1.5">
                        <MessageSquare className="w-3 h-3 text-sky-500 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-muted-foreground line-clamp-1">{group.chatPreview}</p>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" />{group.members}/{group.maxMembers}</span>
                      <span className="flex items-center gap-1"><UserCheck className="w-3 h-3 text-emerald-500" />{group.onlineMembers} online</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{group.lastActive}</span>
                    </div>
                  </div>
                </div>

                {/* Action */}
                <div className="mt-3 flex justify-end">
                  <motion.button
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 ${
                      isJoined
                        ? 'bg-sky-50 dark:bg-sky-900/20 text-sky-500'
                        : 'bg-sky-500 text-white'
                    }`}
                    onClick={() => toggleJoin(group.id)}
                    whileTap={{ scale: 0.95 }}
                  >
                    {isJoined ? (
                      <><CheckCircle className="w-3 h-3" /> Joined</>
                    ) : (
                      <><UserPlus className="w-3 h-3" /> Join</>
                    )}
                  </motion.button>
                </div>
              </GlassCard>
            </motion.div>
          );
        })}
      </div>

      {filteredGroups.length === 0 && (
        <motion.div className="text-center py-12" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-semibold text-foreground">No groups found</p>
          <p className="text-xs text-muted-foreground">Try different search terms or create a new group</p>
        </motion.div>
      )}

      {/* Create Group Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-2xl"
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-extrabold text-foreground">Create Study Group</h2>
                <motion.button onClick={() => setShowCreateModal(false)} whileTap={{ scale: 0.9 }}>
                  <X className="w-5 h-5 text-muted-foreground" />
                </motion.button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Group Name</label>
                  <input
                    type="text"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-muted/30 border border-white/30 dark:border-white/10 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                    placeholder="e.g., Physics Problem Solvers"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">Description</label>
                  <textarea
                    value={newGroupDesc}
                    onChange={(e) => setNewGroupDesc(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2.5 rounded-xl bg-muted/30 border border-white/30 dark:border-white/10 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/50 resize-none"
                    placeholder="What is this group about?"
                  />
                </div>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">Subject</label>
                    <select
                      value={newGroupSubject}
                      onChange={(e) => setNewGroupSubject(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-muted/30 border border-white/30 dark:border-white/10 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                    >
                      {['CSE', 'EEE', 'ME', 'CE', 'ETE', 'Mathematics', 'English'].map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">Visibility</label>
                    <div className="flex gap-2">
                      <motion.button
                        className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold ${newGroupPublic ? 'bg-sky-500 text-white' : 'bg-muted/30 text-muted-foreground'}`}
                        onClick={() => setNewGroupPublic(true)}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Globe className="w-3 h-3 mx-auto mb-0.5" />Public
                      </motion.button>
                      <motion.button
                        className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold ${!newGroupPublic ? 'bg-sky-500 text-white' : 'bg-muted/30 text-muted-foreground'}`}
                        onClick={() => setNewGroupPublic(false)}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Lock className="w-3 h-3 mx-auto mb-0.5" />Private
                      </motion.button>
                    </div>
                  </div>
                </div>
                <GradientButton onClick={() => setShowCreateModal(false)} className="w-full" size="sm">
                  <Sparkles className="w-4 h-4" /> Create Group
                </GradientButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
