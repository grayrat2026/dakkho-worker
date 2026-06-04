'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Users, ChevronLeft, Search, UserPlus, BookOpen,
  MapPin, GraduationCap, MessageSquare, Star,
  CheckCircle, Sparkles, UserCheck, Filter,
} from 'lucide-react';
import { useNavigationStore } from '@/lib/store';
import { GlassCard } from '../shared/GlassCard';

export function PeerConnectionsPage() {
  const { goBack } = useNavigationStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'suggestions' | 'connected'>('suggestions');
  const [connected, setConnected] = useState<string[]>(['peer-3']);

  const suggestions = [
    {
      id: 'peer-1', name: 'Farzana Akter', dept: 'CSE', semester: 6,
      institute: 'Dhaka Polytechnic Institute',
      mutualCourses: 4, avatar: 'F', bio: 'Passionate about algorithms and web development',
      skills: ['JavaScript', 'Python', 'Data Structures'], online: true,
    },
    {
      id: 'peer-2', name: 'Mahmud Hasan', dept: 'EEE', semester: 6,
      institute: 'Dhaka Polytechnic Institute',
      mutualCourses: 2, avatar: 'M', bio: 'Circuit design enthusiast, lab report helper',
      skills: ['Circuit Analysis', 'MATLAB', 'PCB Design'], online: false,
    },
    {
      id: 'peer-4', name: 'Tanvir Ahmed', dept: 'ME', semester: 5,
      institute: 'Dhaka Polytechnic Institute',
      mutualCourses: 3, avatar: 'T', bio: 'Thermodynamics and fluid mechanics expert',
      skills: ['AutoCAD', 'Thermodynamics', 'Manufacturing'], online: true,
    },
    {
      id: 'peer-5', name: 'Sadia Rahman', dept: 'CE', semester: 6,
      institute: 'Dhaka Polytechnic Institute',
      mutualCourses: 2, avatar: 'S', bio: 'Structural analysis and surveying enthusiast',
      skills: ['AutoCAD', 'STAAD Pro', 'Surveying'], online: false,
    },
    {
      id: 'peer-6', name: 'Kamal Uddin', dept: 'CSE', semester: 4,
      institute: 'Chittagong Polytechnic Institute',
      mutualCourses: 3, avatar: 'K', bio: 'Full-stack developer and competitive programmer',
      skills: ['React', 'Node.js', 'C++'], online: true,
    },
  ];

  const connectedPeers = [
    {
      id: 'peer-3', name: 'Nusrat Jahan', dept: 'CSE', semester: 6,
      institute: 'Dhaka Polytechnic Institute',
      mutualCourses: 5, avatar: 'N', bio: 'Machine learning and data science enthusiast',
      skills: ['Python', 'TensorFlow', 'Statistics'], online: true,
      connectedDate: '2 weeks ago',
    },
  ];

  const toggleConnection = (peerId: string) => {
    setConnected((prev) =>
      prev.includes(peerId) ? prev.filter((id) => id !== peerId) : [...prev, peerId]
    );
  };

  const displayData = activeTab === 'suggestions' ? suggestions : connectedPeers;

  const colors = [
    'from-sky-400 to-blue-600',
    'from-emerald-400 to-emerald-600',
    'from-violet-400 to-violet-600',
    'from-amber-400 to-amber-600',
    'from-rose-400 to-rose-600',
  ];

  return (
    <div className="pb-20 lg:pb-0">
      {/* Header */}
      <motion.div className="flex items-center gap-3 mb-6" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <motion.button className="w-9 h-9 rounded-xl bg-muted/30 flex items-center justify-center text-foreground" onClick={goBack} whileTap={{ scale: 0.9 }}>
          <ChevronLeft className="w-5 h-5" />
        </motion.button>
        <div>
          <h1 className="text-xl font-extrabold text-foreground">Peer Connections</h1>
          <p className="text-xs text-muted-foreground">Find study partners and connect</p>
        </div>
      </motion.div>

      {/* Search */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name, department, or skills..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border border-white/50 dark:border-white/10 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/50"
          />
        </div>
      </motion.div>

      {/* Tabs */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="mb-4">
        <div className="flex gap-1 bg-muted/30 rounded-lg p-0.5">
          <motion.button
            className={`flex-1 px-4 py-2 rounded-md text-xs font-semibold ${activeTab === 'suggestions' ? 'bg-white dark:bg-slate-700 shadow-sm text-foreground' : 'text-muted-foreground'}`}
            onClick={() => setActiveTab('suggestions')}
            whileTap={{ scale: 0.95 }}
          >
            <Sparkles className="w-3 h-3 inline mr-1" /> Suggestions
          </motion.button>
          <motion.button
            className={`flex-1 px-4 py-2 rounded-md text-xs font-semibold ${activeTab === 'connected' ? 'bg-white dark:bg-slate-700 shadow-sm text-foreground' : 'text-muted-foreground'}`}
            onClick={() => setActiveTab('connected')}
            whileTap={{ scale: 0.95 }}
          >
            <UserCheck className="w-3 h-3 inline mr-1" /> Connected ({connected.length})
          </motion.button>
        </div>
      </motion.div>

      {/* Peer Cards */}
      <div className="space-y-3">
        {displayData.map((peer, i) => {
          const isConnection = connected.includes(peer.id);
          const colorIdx = i % colors.length;
          return (
            <motion.div
              key={peer.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.05 }}
            >
              <GlassCard className="p-4">
                <div className="flex items-start gap-3">
                  <div className="relative">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colors[colorIdx]} flex items-center justify-center text-white font-bold text-lg shadow-md`}>
                      {peer.avatar}
                    </div>
                    {peer.online && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <h4 className="text-sm font-bold text-foreground">{peer.name}</h4>
                      {isConnection && <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                      <span className="flex items-center gap-0.5"><GraduationCap className="w-3 h-3" />{peer.dept} • Sem {peer.semester}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">{peer.bio}</p>

                    {/* Skills */}
                    <div className="flex gap-1 flex-wrap mb-2">
                      {peer.skills.map((skill) => (
                        <span key={skill} className="text-[10px] px-2 py-0.5 rounded-full bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 font-semibold">
                          {skill}
                        </span>
                      ))}
                    </div>

                    {/* Mutual Info */}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <BookOpen className="w-3 h-3 text-sky-500" />
                        {peer.mutualCourses} mutual courses
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {peer.institute}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action */}
                <div className="mt-3 flex items-center justify-between">
                  <motion.button
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-muted/30 text-muted-foreground flex items-center gap-1.5"
                    whileTap={{ scale: 0.95 }}
                  >
                    <MessageSquare className="w-3 h-3" /> Message
                  </motion.button>
                  <motion.button
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 ${
                      isConnection
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500'
                        : 'bg-sky-500 text-white'
                    }`}
                    onClick={() => toggleConnection(peer.id)}
                    whileTap={{ scale: 0.95 }}
                  >
                    {isConnection ? (
                      <><UserCheck className="w-3 h-3" /> Connected</>
                    ) : (
                      <><UserPlus className="w-3 h-3" /> Connect</>
                    )}
                  </motion.button>
                </div>
              </GlassCard>
            </motion.div>
          );
        })}
      </div>

      {displayData.length === 0 && (
        <motion.div className="text-center py-12" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm font-semibold text-foreground">No peers found</p>
          <p className="text-xs text-muted-foreground">Try adjusting your search</p>
        </motion.div>
      )}
    </div>
  );
}
