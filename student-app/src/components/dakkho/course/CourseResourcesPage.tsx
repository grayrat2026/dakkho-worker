'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Download, FileText, File, Image, Archive, FileCode,
  ChevronLeft, Clock, HardDrive, ExternalLink, Search,
  FolderOpen, Eye, CheckCircle,
} from 'lucide-react';
import { useNavigationStore } from '@/lib/store';
import { getCourse, getInstructor, formatDuration } from '@/lib/mock-data';
import { GlassCard } from '../shared/GlassCard';
import { AnimatedPage } from '../shared/AnimatedPage';
import { GradientButton } from '../shared/GradientButton';

interface Resource {
  id: string;
  name: string;
  type: 'pdf' | 'code' | 'image' | 'archive' | 'document';
  size: string;
  downloadCount: number;
  uploadedAt: string;
  section: string;
  description: string;
}

const MOCK_RESOURCES: Resource[] = [
  { id: 'res1', name: 'Complete Course Syllabus', type: 'pdf', size: '2.4 MB', downloadCount: 856, uploadedAt: 'Jan 15, 2025', section: 'General', description: 'Full course syllabus and outline covering all 8 sections with learning objectives.' },
  { id: 'res2', name: 'HTML & CSS Cheat Sheet', type: 'pdf', size: '1.1 MB', downloadCount: 1243, uploadedAt: 'Jan 20, 2025', section: 'Section 1: Fundamentals', description: 'Quick reference guide for HTML5 tags and CSS3 properties.' },
  { id: 'res3', name: 'JavaScript Fundamentals Code Pack', type: 'code', size: '3.8 MB', downloadCount: 678, uploadedAt: 'Feb 1, 2025', section: 'Section 2: Core Concepts', description: 'All source code examples from the JavaScript fundamentals section.' },
  { id: 'res4', name: 'CSS Layout Diagrams', type: 'image', size: '5.2 MB', downloadCount: 432, uploadedAt: 'Feb 10, 2025', section: 'Section 2: Core Concepts', description: 'Visual diagrams explaining Flexbox and Grid layout concepts.' },
  { id: 'res5', name: 'React Project Starter Template', type: 'code', size: '8.1 MB', downloadCount: 923, uploadedAt: 'Feb 20, 2025', section: 'Section 3: Advanced Topics', description: 'Pre-configured React project template with all dependencies set up.' },
  { id: 'res6', name: 'API Design Guidelines Document', type: 'document', size: '1.5 MB', downloadCount: 345, uploadedAt: 'Mar 1, 2025', section: 'Section 4: Projects', description: 'Best practices and guidelines for REST API design and documentation.' },
  { id: 'res7', name: 'Final Project Assets Pack', type: 'archive', size: '24.5 MB', downloadCount: 567, uploadedAt: 'Mar 10, 2025', section: 'Section 4: Projects', description: 'All images, icons, and design assets needed for the final project.' },
  { id: 'res8', name: 'BTEB Exam Preparation Guide', type: 'pdf', size: '3.7 MB', downloadCount: 2341, uploadedAt: 'Mar 15, 2025', section: 'General', description: 'Comprehensive guide for BTEB exam preparation with previous year questions.' },
  { id: 'res9', name: 'Node.js Backend Code Examples', type: 'code', size: '4.2 MB', downloadCount: 543, uploadedAt: 'Mar 18, 2025', section: 'Section 3: Advanced Topics', description: 'Complete Node.js and Express backend implementation examples.' },
  { id: 'res10', name: 'Database Schema Diagrams', type: 'image', size: '2.1 MB', downloadCount: 389, uploadedAt: 'Mar 20, 2025', section: 'Section 3: Advanced Topics', description: 'Entity-Relationship diagrams and database schema visualizations.' },
];

const TYPE_ICONS = {
  pdf: { icon: FileText, color: 'text-red-500 bg-red-50 dark:bg-red-900/20' },
  code: { icon: FileCode, color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' },
  image: { icon: Image, color: 'text-purple-500 bg-purple-50 dark:bg-purple-900/20' },
  archive: { icon: Archive, color: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20' },
  document: { icon: File, color: 'text-sky-500 bg-sky-50 dark:bg-sky-900/20' },
};

export function CourseResourcesPage() {
  const { pageParams, navigate, goBack } = useNavigationStore();
  const courseId = pageParams.courseId as string;
  const course = getCourse(courseId);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [downloadedIds, setDownloadedIds] = useState<Set<string>>(new Set());

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

  const filteredResources = MOCK_RESOURCES.filter((r) => {
    if (filterType !== 'all' && r.type !== filterType) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return r.name.toLowerCase().includes(q) || r.description.toLowerCase().includes(q) || r.section.toLowerCase().includes(q);
    }
    return true;
  });

  // Group by section
  const grouped = filteredResources.reduce<Record<string, Resource[]>>((acc, r) => {
    if (!acc[r.section]) acc[r.section] = [];
    acc[r.section].push(r);
    return acc;
  }, {});

  const totalSize = MOCK_RESOURCES.reduce((sum, r) => sum + parseFloat(r.size), 0).toFixed(1);
  const totalDownloads = MOCK_RESOURCES.reduce((sum, r) => sum + r.downloadCount, 0);

  const handleDownload = (id: string) => {
    setDownloadedIds((prev) => new Set([...prev, id]));
  };

  return (
    <AnimatedPage keyProp={`course-resources-${courseId}`}>
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
          <span className="text-foreground font-semibold">Resources</span>
        </motion.div>

        {/* Header with stats */}
        <GlassCard className="p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-lg font-extrabold text-foreground flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-sky-500" />
                Course Resources
              </h1>
              <p className="text-sm text-muted-foreground mt-1">{course.title}</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center p-3 rounded-xl bg-muted/30">
              <p className="text-lg font-extrabold text-foreground">{MOCK_RESOURCES.length}</p>
              <p className="text-[10px] text-muted-foreground">Resources</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-muted/30">
              <p className="text-lg font-extrabold text-foreground">{totalSize} MB</p>
              <p className="text-[10px] text-muted-foreground">Total Size</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-muted/30">
              <p className="text-lg font-extrabold text-foreground">{totalDownloads.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground">Downloads</p>
            </div>
          </div>

          {/* Search and filter */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search resources..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-muted/30 border border-white/30 dark:border-white/10 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/50"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {['all', 'pdf', 'code', 'image', 'archive', 'document'].map((type) => (
                <motion.button
                  key={type}
                  className={`px-3 py-2 rounded-lg text-xs font-semibold capitalize ${
                    filterType === type ? 'bg-sky-500 text-white' : 'bg-muted/30 text-muted-foreground'
                  }`}
                  onClick={() => setFilterType(type)}
                  whileTap={{ scale: 0.95 }}
                >
                  {type}
                </motion.button>
              ))}
            </div>
          </div>
        </GlassCard>

        {/* Grouped Resources */}
        <div className="space-y-6">
          {Object.entries(grouped).map(([section, resources], si) => (
            <motion.div
              key={section}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: si * 0.1 }}
            >
              <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <FolderOpen className="w-4 h-4" />
                {section}
              </h2>
              <div className="space-y-2">
                {resources.map((resource, ri) => {
                  const config = TYPE_ICONS[resource.type];
                  const isDownloaded = downloadedIds.has(resource.id);
                  return (
                    <motion.div
                      key={resource.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: si * 0.1 + ri * 0.03 }}
                    >
                      <GlassCard className="p-4 flex items-center gap-4" hover>
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${config.color}`}>
                          <config.icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-bold text-foreground line-clamp-1">{resource.name}</h3>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{resource.description}</p>
                          <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                            <span className="uppercase font-bold">{resource.type}</span>
                            <span>{resource.size}</span>
                            <span className="flex items-center gap-1">
                              <Download className="w-2.5 h-2.5" />
                              {resource.downloadCount.toLocaleString()}
                            </span>
                            <span>{resource.uploadedAt}</span>
                          </div>
                        </div>
                        <motion.button
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all flex-shrink-0 ${
                            isDownloaded
                              ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                              : 'bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400'
                          }`}
                          onClick={() => handleDownload(resource.id)}
                          whileTap={{ scale: 0.95 }}
                          whileHover={{ scale: 1.02 }}
                        >
                          {isDownloaded ? (
                            <>
                              <CheckCircle className="w-3.5 h-3.5" />
                              Done
                            </>
                          ) : (
                            <>
                              <Download className="w-3.5 h-3.5" />
                              Download
                            </>
                          )}
                        </motion.button>
                      </GlassCard>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          ))}
        </div>

        {filteredResources.length === 0 && (
          <GlassCard className="p-8 text-center">
            <FolderOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No resources found matching your search.</p>
          </GlassCard>
        )}
      </div>
    </AnimatedPage>
  );
}
