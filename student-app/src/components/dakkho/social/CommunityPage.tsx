'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  MessageSquare, ChevronLeft, Heart, MessageCircle, Share2,
  Send, MoreHorizontal, Bookmark, ImageIcon,
  Smile, Hash, TrendingUp, Clock, Pin,
} from 'lucide-react';
import { useNavigationStore } from '@/lib/store';
import { GlassCard } from '../shared/GlassCard';

export function CommunityPage() {
  const { goBack } = useNavigationStore();

  const [newPost, setNewPost] = useState('');
  const [activeFilter, setActiveFilter] = useState('trending');
  const [likedPosts, setLikedPosts] = useState<string[]>(['post-2']);
  const [bookmarkedPosts, setBookmarkedPosts] = useState<string[]>([]);

  const posts = [
    {
      id: 'post-1',
      author: 'Ayesha Khan',
      avatar: 'A',
      dept: 'CSE',
      time: '2 hours ago',
      content: 'Just completed the Data Structures course on DAKKHO! The algorithm visualization feature really helped me understand how binary trees work. Highly recommend it for anyone struggling with tree traversals. 🎉',
      likes: 24,
      comments: 8,
      shares: 3,
      pinned: true,
      tags: ['#DataStructures', '#StudyTips'],
    },
    {
      id: 'post-2',
      author: 'Rafiq Islam',
      avatar: 'R',
      dept: 'EEE',
      time: '4 hours ago',
      content: 'Can anyone help me understand three-phase power systems? I have an exam next week and the textbook explanation is confusing. Specifically, the relationship between line voltage and phase voltage in star and delta connections.',
      likes: 15,
      comments: 12,
      shares: 1,
      pinned: false,
      tags: ['#EEE', '#HelpNeeded'],
    },
    {
      id: 'post-3',
      author: 'Nusrat Jahan',
      avatar: 'N',
      dept: 'CSE',
      time: '6 hours ago',
      content: 'Study group tip: We created a shared Google Doc for our CSE group where everyone adds their notes after each lecture. It has been amazing for exam prep — we caught several mistakes in our notes that way! 📝',
      likes: 42,
      comments: 15,
      shares: 18,
      pinned: false,
      tags: ['#StudyGroup', '#Productivity'],
    },
    {
      id: 'post-4',
      author: 'Tanvir Ahmed',
      avatar: 'T',
      dept: 'ME',
      time: '1 day ago',
      content: 'The thermodynamics practice questions on DAKKHO are really close to what appeared in last semester\'s exam. If you\'re preparing for ME-301, make sure to go through all of them!',
      likes: 31,
      comments: 6,
      shares: 9,
      pinned: false,
      tags: ['#Thermodynamics', '#ExamPrep'],
    },
    {
      id: 'post-5',
      author: 'Sadia Rahman',
      avatar: 'S',
      dept: 'CE',
      time: '1 day ago',
      content: 'Finally finished my Engineering Drawing project! The isometric views took forever but the result is worth it. Anyone else find the section views tricky?',
      likes: 19,
      comments: 7,
      shares: 2,
      pinned: false,
      tags: ['#EngineeringDrawing', '#CE'],
    },
  ];

  const toggleLike = (postId: string) => {
    setLikedPosts((prev) =>
      prev.includes(postId) ? prev.filter((id) => id !== postId) : [...prev, postId]
    );
  };

  const toggleBookmark = (postId: string) => {
    setBookmarkedPosts((prev) =>
      prev.includes(postId) ? prev.filter((id) => id !== postId) : [...prev, postId]
    );
  };

  const trendingTags = [
    { tag: '#ExamPrep', count: 234 },
    { tag: '#StudyTips', count: 189 },
    { tag: '#DataStructures', count: 156 },
    { tag: '#CSE', count: 142 },
    { tag: '#LabReport', count: 98 },
  ];

  return (
    <div className="pb-20 lg:pb-0">
      {/* Header */}
      <motion.div className="flex items-center gap-3 mb-6" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <motion.button className="w-9 h-9 rounded-xl bg-muted/30 flex items-center justify-center text-foreground" onClick={goBack} whileTap={{ scale: 0.9 }}>
          <ChevronLeft className="w-5 h-5" />
        </motion.button>
        <div className="flex-1">
          <h1 className="text-xl font-extrabold text-foreground">Community</h1>
          <p className="text-xs text-muted-foreground">Share, learn, and grow together</p>
        </div>
      </motion.div>

      {/* Create Post */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <GlassCard className="p-4 mb-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              R
            </div>
            <div className="flex-1">
              <textarea
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 rounded-xl bg-muted/20 border border-white/20 dark:border-white/5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/50 resize-none"
                placeholder="Share something with the community..."
              />
              <div className="flex items-center justify-between mt-2">
                <div className="flex items-center gap-2">
                  <motion.button className="p-1.5 rounded-lg bg-muted/20 text-muted-foreground hover:text-sky-500" whileTap={{ scale: 0.9 }}>
                    <ImageIcon className="w-4 h-4" />
                  </motion.button>
                  <motion.button className="p-1.5 rounded-lg bg-muted/20 text-muted-foreground hover:text-sky-500" whileTap={{ scale: 0.9 }}>
                    <Smile className="w-4 h-4" />
                  </motion.button>
                  <motion.button className="p-1.5 rounded-lg bg-muted/20 text-muted-foreground hover:text-sky-500" whileTap={{ scale: 0.9 }}>
                    <Hash className="w-4 h-4" />
                  </motion.button>
                </div>
                <motion.button
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 ${
                    newPost.trim() ? 'bg-sky-500 text-white' : 'bg-muted/30 text-muted-foreground'
                  }`}
                  whileTap={{ scale: 0.95 }}
                >
                  <Send className="w-3 h-3" /> Post
                </motion.button>
              </div>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Filter */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="mb-4">
        <div className="flex gap-1 bg-muted/30 rounded-lg p-0.5">
          <motion.button
            className={`flex-1 px-3 py-1.5 rounded-md text-xs font-semibold flex items-center justify-center gap-1 ${
              activeFilter === 'trending' ? 'bg-white dark:bg-slate-700 shadow-sm text-foreground' : 'text-muted-foreground'
            }`}
            onClick={() => setActiveFilter('trending')}
            whileTap={{ scale: 0.95 }}
          >
            <TrendingUp className="w-3 h-3" /> Trending
          </motion.button>
          <motion.button
            className={`flex-1 px-3 py-1.5 rounded-md text-xs font-semibold flex items-center justify-center gap-1 ${
              activeFilter === 'latest' ? 'bg-white dark:bg-slate-700 shadow-sm text-foreground' : 'text-muted-foreground'
            }`}
            onClick={() => setActiveFilter('latest')}
            whileTap={{ scale: 0.95 }}
          >
            <Clock className="w-3 h-3" /> Latest
          </motion.button>
        </div>
      </motion.div>

      {/* Trending Tags */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-4">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {trendingTags.map((tag) => (
            <motion.button
              key={tag.tag}
              className="px-3 py-1.5 rounded-lg bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400 text-xs font-bold whitespace-nowrap flex items-center gap-1"
              whileTap={{ scale: 0.95 }}
            >
              {tag.tag} <span className="text-muted-foreground">• {tag.count}</span>
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Posts */}
      <div className="space-y-3">
        {posts.map((post, i) => {
          const isLiked = likedPosts.includes(post.id);
          const isBookmarked = bookmarkedPosts.includes(post.id);
          return (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 + i * 0.04 }}
            >
              <GlassCard className="p-4">
                {post.pinned && (
                  <div className="flex items-center gap-1 text-xs text-amber-500 font-semibold mb-2">
                    <Pin className="w-3 h-3" /> Pinned Post
                  </div>
                )}

                {/* Author */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
                    {post.avatar}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-foreground">{post.author}</p>
                    <p className="text-xs text-muted-foreground">{post.dept} • {post.time}</p>
                  </div>
                  <motion.button className="text-muted-foreground" whileTap={{ scale: 0.9 }}>
                    <MoreHorizontal className="w-4 h-4" />
                  </motion.button>
                </div>

                {/* Content */}
                <p className="text-sm text-foreground leading-relaxed mb-2">{post.content}</p>

                {/* Tags */}
                <div className="flex gap-1.5 mb-3">
                  {post.tags.map((tag) => (
                    <span key={tag} className="text-xs text-sky-500 font-semibold">{tag}</span>
                  ))}
                </div>

                {/* Reactions */}
                <div className="flex items-center justify-between pt-3 border-t border-white/20 dark:border-white/5">
                  <div className="flex items-center gap-4">
                    <motion.button
                      className="flex items-center gap-1.5 text-xs"
                      onClick={() => toggleLike(post.id)}
                      whileTap={{ scale: 0.9 }}
                    >
                      <Heart className={`w-4 h-4 ${isLiked ? 'text-red-500 fill-red-500' : 'text-muted-foreground'}`} />
                      <span className={isLiked ? 'text-red-500 font-semibold' : 'text-muted-foreground'}>{post.likes + (isLiked ? 1 : 0)}</span>
                    </motion.button>
                    <motion.button className="flex items-center gap-1.5 text-xs text-muted-foreground" whileTap={{ scale: 0.9 }}>
                      <MessageCircle className="w-4 h-4" />
                      <span>{post.comments}</span>
                    </motion.button>
                    <motion.button className="flex items-center gap-1.5 text-xs text-muted-foreground" whileTap={{ scale: 0.9 }}>
                      <Share2 className="w-4 h-4" />
                      <span>{post.shares}</span>
                    </motion.button>
                  </div>
                  <motion.button
                    className="text-muted-foreground"
                    onClick={() => toggleBookmark(post.id)}
                    whileTap={{ scale: 0.9 }}
                  >
                    <Bookmark className={`w-4 h-4 ${isBookmarked ? 'text-sky-500 fill-sky-500' : ''}`} />
                  </motion.button>
                </div>
              </GlassCard>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
