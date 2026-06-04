'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Monitor, Cpu, Zap, Wrench, Building2, Ruler, Scissors, FlaskConical, Car, Snowflake,
  Wine, Printer, MapPin, Bot, Mountain, Plug, Gauge, Apple, ShoppingBag,
  ChevronLeft, Users, BookOpen, Clock, Star, GraduationCap, TrendingUp,
  CheckCircle, Play, ArrowRight, Search, Filter, BarChart3,
} from 'lucide-react';
import { useNavigationStore } from '@/lib/store';
import { COURSES, getInstructor, formatDuration } from '@/lib/mock-data';
import { GlassCard } from '../shared/GlassCard';
import { AnimatedPage } from '../shared/AnimatedPage';
import { GradientButton } from '../shared/GradientButton';
import { ProgressBar } from '../shared/ProgressBar';
import { AnimatedCounter } from '../shared/AnimatedCounter';

// Icon mapping
const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Monitor, Cpu, Zap, Wrench, Building2, Ruler, Scissors, FlaskConical, Car, Snowflake,
  Wine, Printer, MapPin, Bot, Mountain, Plug, Gauge, Apple, ShoppingBag,
};

export interface DepartmentInfo {
  name: string;
  slug: string;
  icon: string;
  color: string;
  description: string;
  categoryId: string;
}

export const DEPARTMENTS: Record<string, DepartmentInfo> = {
  'cse': { name: 'Computer Science & Technology', slug: 'cse', icon: 'Monitor', color: '#0ea5e9', description: 'Master programming, software development, web & mobile applications, databases, and algorithms. Build the digital future with cutting-edge technology skills.', categoryId: 'cat8' },
  'ete': { name: 'Electronics & Telecommunication', slug: 'ete', icon: 'Cpu', color: '#8b5cf6', description: 'Dive into digital electronics, microcontrollers, communication systems, and signal processing. Design the circuits that power modern technology.', categoryId: 'cat3' },
  'eee': { name: 'Electrical Engineering', slug: 'eee', icon: 'Zap', color: '#f59e0b', description: 'Learn power systems, circuit design, electrical machines, and renewable energy solutions. Power the world with electrical engineering expertise.', categoryId: 'cat4' },
  'me': { name: 'Mechanical Engineering', slug: 'me', icon: 'Wrench', color: '#64748b', description: 'Explore thermodynamics, manufacturing, fluid mechanics, and machine design. Build and optimize mechanical systems for the modern industry.', categoryId: 'cat5' },
  'ce': { name: 'Civil Engineering', slug: 'ce', icon: 'Building2', color: '#10b981', description: 'Master structural design, construction management, surveying, and infrastructure development. Shape the built environment around us.', categoryId: 'cat6' },
  'architecture': { name: 'Architecture & Interior Design', slug: 'architecture', icon: 'Ruler', color: '#ec4899', description: 'Create stunning architectural designs, master CAD software, and develop sustainable design principles for modern living spaces.', categoryId: 'cat7' },
  'textile': { name: 'Textile Engineering', slug: 'textile', icon: 'Scissors', color: '#06b6d4', description: 'Study fabric technology, dyeing processes, manufacturing, and quality control. Innovate in the textile industry with modern techniques.', categoryId: 'cat12' },
  'chemical': { name: 'Chemical Engineering', slug: 'chemical', icon: 'FlaskConical', color: '#f97316', description: 'Learn chemical processes, material science, and industrial chemistry. Transform raw materials into valuable products through chemical engineering.', categoryId: 'cat8' },
  'automobile': { name: 'Automobile Engineering', slug: 'automobile', icon: 'Car', color: '#ef4444', description: 'Master vehicle design, engine systems, automotive technology, and maintenance. Drive innovation in the automotive industry.', categoryId: 'cat5' },
  'rac': { name: 'Refrigeration & Air Conditioning', slug: 'rac', icon: 'Snowflake', color: '#38bdf8', description: 'Study HVAC systems, thermodynamics, and climate control technology. Keep the world comfortable with advanced climate solutions.', categoryId: 'cat4' },
  'glass-ceramic': { name: 'Glass & Ceramic Engineering', slug: 'glass-ceramic', icon: 'Wine', color: '#a855f7', description: 'Explore material science, glass manufacturing, and ceramic technology. Create innovative materials for diverse applications.', categoryId: 'cat8' },
  'printing': { name: 'Printing Engineering', slug: 'printing', icon: 'Printer', color: '#14b8a6', description: 'Master print technology, graphic arts, and digital publishing. Bring ideas to life through modern printing techniques.', categoryId: 'cat11' },
  'surveying': { name: 'Surveying Engineering', slug: 'surveying', icon: 'MapPin', color: '#84cc16', description: 'Learn land surveying, mapping, GIS, and geospatial technology. Map the world with precision and accuracy.', categoryId: 'cat6' },
  'mechatronics': { name: 'Mechatronics Engineering', slug: 'mechatronics', icon: 'Bot', color: '#e879f9', description: 'Combine robotics, automation, control systems, and smart manufacturing. Build intelligent systems for the future.', categoryId: 'cat3' },
  'mining': { name: 'Mining Engineering', slug: 'mining', icon: 'Mountain', color: '#78716c', description: 'Study mineral extraction, mine design, and geological engineering. Extract valuable resources responsibly and efficiently.', categoryId: 'cat5' },
  'metallurgical': { name: 'Metallurgical Engineering', slug: 'metallurgical', icon: 'Wrench', color: '#fb923c', description: 'Learn metal processing, material testing, and alloy development. Shape the metals that build our world.', categoryId: 'cat5' },
  'power': { name: 'Power Engineering', slug: 'power', icon: 'Plug', color: '#facc15', description: 'Master power generation, distribution, and electrical grid management. Keep the lights on and power flowing.', categoryId: 'cat4' },
  'instrumentation': { name: 'Instrumentation & Process Control', slug: 'instrumentation', icon: 'Gauge', color: '#2dd4bf', description: 'Study sensors, control systems, and industrial automation. Measure, monitor, and control industrial processes with precision.', categoryId: 'cat3' },
  'food': { name: 'Food Engineering', slug: 'food', icon: 'Apple', color: '#4ade80', description: 'Learn food processing, preservation, quality assurance, and nutrition technology. Ensure safe and nutritious food for all.', categoryId: 'cat8' },
  'leather': { name: 'Leather Engineering', slug: 'leather', icon: 'ShoppingBag', color: '#a16207', description: 'Study leather processing, tanning technology, and footwear manufacturing. Craft quality leather products for global markets.', categoryId: 'cat12' },
};

const FEATURED_INSTRUCTORS: Record<string, { name: string; title: string; experience: string; students: number; courses: number; rating: number; bio: string }> = {
  'cse': { name: 'Engr. Karim Uddin', title: 'Senior CSE Instructor', experience: '15+ years', students: 3450, courses: 8, rating: 4.8, bio: 'Passionate about making programming accessible to all polytechnic students across Bangladesh.' },
  'ete': { name: 'Fatema Begum', title: 'Electronics Specialist', experience: '12+ years', students: 2890, courses: 6, rating: 4.9, bio: 'Expert in digital electronics and microcontroller programming with BTEB curriculum development.' },
  'eee': { name: 'Dr. Shahid Hossain', title: 'Power Systems Expert', experience: '18+ years', students: 4200, courses: 9, rating: 4.9, bio: 'PhD in Electrical Engineering specializing in renewable energy solutions for Bangladesh.' },
  'me': { name: 'Rafiqul Islam', title: 'Mechanical Engineering Lead', experience: '20+ years', students: 1920, courses: 5, rating: 4.7, bio: 'Industry veteran bringing real-world experience to the classroom with hands-on projects.' },
  'ce': { name: 'Mizanur Rahman', title: 'Civil Engineering Expert', experience: '20+ years', students: 1750, courses: 4, rating: 4.5, bio: 'Specializing in construction management and structural design for major infrastructure projects.' },
  'architecture': { name: 'Nasreen Akter', title: 'Architecture Instructor', experience: '10+ years', students: 1540, courses: 4, rating: 4.6, bio: 'Award-winning architect expert in CAD software and sustainable design principles.' },
  'default': { name: 'Expert Instructor', title: 'Department Specialist', experience: '10+ years', students: 1500, courses: 4, rating: 4.6, bio: 'Dedicated educator with deep expertise in this technology field.' },
};

const STUDY_TIPS = [
  { icon: '📝', title: 'Take Notes', description: 'Write down key concepts while watching video lectures for better retention.' },
  { icon: '⏰', title: 'Regular Schedule', description: 'Set a fixed daily study time. Consistency beats intensity.' },
  { icon: '🔄', title: 'Practice Daily', description: 'Apply what you learn through hands-on projects and exercises.' },
  { icon: '🤝', title: 'Join Discussions', description: 'Engage with peers and instructors to deepen understanding.' },
  { icon: '📊', title: 'Track Progress', description: 'Monitor your learning progress and celebrate milestones.' },
  { icon: '🎯', title: 'Set Goals', description: 'Break down your learning into weekly targets for steady progress.' },
];

export function DepartmentPageTemplate({ departmentKey }: { departmentKey: string }) {
  const { navigate, goBack } = useNavigationStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');

  const department = DEPARTMENTS[departmentKey];
  const featuredInstructor = FEATURED_INSTRUCTORS[departmentKey] || FEATURED_INSTRUCTORS['default'];

  const departmentCourses = useMemo(() => {
    if (!department) return [];
    let filtered = COURSES.filter((c) => c.categoryId === department.categoryId);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (c) => c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q) || c.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    if (selectedLevel !== 'all') {
      filtered = filtered.filter((c) => c.level === selectedLevel);
    }
    return filtered;
  }, [department, searchQuery, selectedLevel]);

  const totalStudents = departmentCourses.reduce((sum, c) => sum + c.totalStudents, 0);
  const totalHours = departmentCourses.reduce((sum, c) => sum + c.duration, 0);
  const avgRating = departmentCourses.length > 0
    ? (departmentCourses.reduce((sum, c) => sum + c.rating, 0) / departmentCourses.length).toFixed(1)
    : '4.5';

  const IconComponent = department ? ICON_MAP[department.icon] || Monitor : Monitor;
  const colorHex = department?.color || '#0ea5e9';

  if (!department) {
    return (
      <AnimatedPage>
        <div className="text-center py-16">
          <p className="text-lg font-bold">Department not found</p>
          <GradientButton onClick={goBack} className="mt-4">Go Back</GradientButton>
        </div>
      </AnimatedPage>
    );
  }

  return (
    <AnimatedPage keyProp={departmentKey}>
      <div className="pb-20 lg:pb-0">
        {/* Breadcrumb */}
        <motion.div
          className="flex items-center gap-2 text-sm text-muted-foreground mb-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <button onClick={() => navigate('home')} className="hover:text-sky-500 transition-colors">Home</button>
          <span>/</span>
          <button onClick={() => navigate('explore')} className="hover:text-sky-500 transition-colors">Departments</button>
          <span>/</span>
          <span className="text-foreground font-semibold">{department.name}</span>
        </motion.div>

        {/* Hero Banner */}
        <GlassCard className="overflow-hidden mb-6">
          <div
            className="relative aspect-[21/9] md:aspect-[3/1] overflow-hidden"
            style={{ background: `linear-gradient(135deg, ${colorHex}dd, ${colorHex}88, ${colorHex}44)` }}
          >
            {/* Decorative elements */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-4 right-8 w-32 h-32 rounded-full border-4 border-white/30" />
              <div className="absolute bottom-4 left-12 w-20 h-20 rounded-full border-4 border-white/20" />
              <div className="absolute top-1/2 left-1/3 w-16 h-16 rounded-full border-2 border-white/15" />
            </div>

            <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent" />
            <div className="absolute inset-0 flex items-center p-6 md:p-10">
              <div className="max-w-2xl">
                <motion.div
                  className="w-14 h-14 md:w-20 md:h-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-4"
                  initial={{ scale: 0, rotate: -20 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', delay: 0.2 }}
                >
                  <IconComponent className="w-7 h-7 md:w-10 md:h-10 text-white" />
                </motion.div>
                <motion.h1
                  className="text-2xl md:text-4xl font-extrabold text-white mb-2"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  {department.name}
                </motion.h1>
                <motion.p
                  className="text-sm md:text-base text-white/80 max-w-xl leading-relaxed"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  {department.description}
                </motion.p>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Statistics Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { icon: BookOpen, label: 'Courses', value: departmentCourses.length, color: `text-[${colorHex}]`, bg: 'bg-sky-50 dark:bg-sky-900/20' },
            { icon: Users, label: 'Students', value: totalStudents, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
            { icon: Clock, label: 'Total Hours', value: Math.round(totalHours / 3600), color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' },
            { icon: Star, label: 'Avg Rating', value: parseFloat(avgRating), color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20', decimal: true },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.08 }}
            >
              <GlassCard className="p-4 text-center">
                <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center mx-auto mb-2`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                {stat.decimal ? (
                  <span className="text-xl font-extrabold text-foreground">{stat.value}</span>
                ) : (
                  <AnimatedCounter target={stat.value} className="text-xl font-extrabold text-foreground" />
                )}
                <p className="text-[10px] text-muted-foreground mt-0.5">{stat.label}</p>
              </GlassCard>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content - Courses */}
          <div className="lg:col-span-2">
            {/* Search and filter */}
            <GlassCard className="p-4 mb-6">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search courses..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-muted/30 border border-white/30 dark:border-white/10 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                  />
                </div>
                <div className="flex gap-2">
                  {['all', 'beginner', 'intermediate', 'advanced'].map((level) => (
                    <motion.button
                      key={level}
                      className={`px-3 py-2 rounded-lg text-xs font-semibold capitalize transition-all ${
                        selectedLevel === level
                          ? 'bg-sky-500 text-white shadow-md'
                          : 'bg-muted/30 text-muted-foreground hover:text-foreground'
                      }`}
                      onClick={() => setSelectedLevel(level)}
                      whileTap={{ scale: 0.95 }}
                    >
                      {level}
                    </motion.button>
                  ))}
                </div>
              </div>
            </GlassCard>

            {/* Courses Grid */}
            <h2 className="text-lg font-extrabold text-foreground mb-4 flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-sky-500" />
              Available Courses
              <span className="text-sm font-normal text-muted-foreground">({departmentCourses.length})</span>
            </h2>

            {departmentCourses.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                {departmentCourses.map((course, i) => {
                  const instructor = getInstructor(course.instructorId);
                  const levelColors: Record<string, string> = {
                    beginner: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400',
                    intermediate: 'bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400',
                    advanced: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400',
                    expert: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
                  };
                  return (
                    <motion.div
                      key={course.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <GlassCard
                        hover
                        className="overflow-hidden cursor-pointer"
                        onClick={() => navigate('course-detail', { courseId: course.id })}
                      >
                        <div
                          className="h-28 flex items-center justify-center relative"
                          style={{ background: `linear-gradient(135deg, ${colorHex}66, ${colorHex}33)` }}
                        >
                          <BookOpen className="w-10 h-10 text-white/30" />
                          <div className="absolute top-2 right-2">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${levelColors[course.level] || levelColors.beginner}`}>
                              {course.level}
                            </span>
                          </div>
                          {course.price === 0 && (
                            <div className="absolute top-2 left-2">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500 text-white">Free</span>
                            </div>
                          )}
                        </div>
                        <div className="p-4">
                          <h3 className="text-sm font-bold text-foreground line-clamp-2 mb-1">{course.title}</h3>
                          {instructor && (
                            <p className="text-xs text-muted-foreground mb-2">by {instructor.name}</p>
                          )}
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                              {course.rating}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {course.totalStudents}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDuration(course.duration)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between mt-3">
                            {course.price > 0 ? (
                              <span className="text-sm font-extrabold text-foreground">&#2547;{course.price}</span>
                            ) : (
                              <span className="text-sm font-extrabold text-emerald-500">Free</span>
                            )}
                            <motion.button
                              className="flex items-center gap-1 text-xs font-semibold text-sky-500"
                              whileHover={{ x: 3 }}
                            >
                              View <ArrowRight className="w-3 h-3" />
                            </motion.button>
                          </div>
                        </div>
                      </GlassCard>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <GlassCard className="p-8 text-center mb-6">
                <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No courses found. Try adjusting your search or filters.</p>
              </GlassCard>
            )}

            {/* Study Tips */}
            <h2 className="text-lg font-extrabold text-foreground mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
              Study Tips for {department.name}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              {STUDY_TIPS.map((tip, i) => (
                <motion.div
                  key={tip.title}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + i * 0.06 }}
                >
                  <GlassCard className="p-4 flex items-start gap-3">
                    <span className="text-2xl flex-shrink-0">{tip.icon}</span>
                    <div>
                      <h4 className="text-sm font-bold text-foreground">{tip.title}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">{tip.description}</p>
                    </div>
                  </GlassCard>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Featured Instructor */}
            <GlassCard className="p-6">
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">Featured Instructor</h3>
              <div className="flex items-center gap-3 mb-4">
                <motion.div
                  className="w-12 h-12 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white text-lg font-extrabold shadow-lg"
                  style={{ background: `linear-gradient(135deg, ${colorHex}, ${colorHex}cc)` }}
                  whileHover={{ scale: 1.1 }}
                >
                  {featuredInstructor.name.charAt(0)}
                </motion.div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">{featuredInstructor.name}</h4>
                  <p className="text-xs text-sky-500 font-semibold">{featuredInstructor.title}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed mb-4">{featuredInstructor.bio}</p>
              <div className="grid grid-cols-3 gap-2 text-center mb-4">
                <div>
                  <p className="text-sm font-extrabold text-foreground">{featuredInstructor.students.toLocaleString()}</p>
                  <p className="text-[10px] text-muted-foreground">Students</p>
                </div>
                <div>
                  <p className="text-sm font-extrabold text-foreground">{featuredInstructor.courses}</p>
                  <p className="text-[10px] text-muted-foreground">Courses</p>
                </div>
                <div>
                  <p className="text-sm font-extrabold text-foreground">{featuredInstructor.rating}</p>
                  <p className="text-[10px] text-muted-foreground">Rating</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <GraduationCap className="w-3.5 h-3.5" />
                <span>{featuredInstructor.experience} experience</span>
              </div>
            </GlassCard>

            {/* Department Skills */}
            <GlassCard className="p-6">
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">Key Skills</h3>
              <div className="space-y-3">
                {[
                  { skill: 'Practical Knowledge', level: 90 },
                  { skill: 'Theory & Concepts', level: 85 },
                  { skill: 'Problem Solving', level: 80 },
                  { skill: 'Industry Readiness', level: 75 },
                  { skill: 'BTEB Preparation', level: 95 },
                ].map((item) => (
                  <div key={item.skill}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-foreground">{item.skill}</span>
                      <span className="text-muted-foreground">{item.level}%</span>
                    </div>
                    <ProgressBar value={item.level} size="sm" />
                  </div>
                ))}
              </div>
            </GlassCard>

            {/* Career Path */}
            <GlassCard className="p-6">
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">Career Paths</h3>
              <div className="space-y-2">
                {['Junior Engineer', 'Technical Assistant', 'Project Supervisor', 'Quality Inspector', 'Research Assistant'].map((career, i) => (
                  <motion.div
                    key={career}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/30 dark:hover:bg-slate-800/30 transition-colors"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + i * 0.05 }}
                  >
                    <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span className="text-sm font-medium text-foreground">{career}</span>
                  </motion.div>
                ))}
              </div>
            </GlassCard>

            {/* Quick Stats */}
            <GlassCard className="p-6">
              <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">Department Overview</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Duration</span>
                  <span className="font-semibold text-foreground">4 Years (8 Semesters)</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Degree</span>
                  <span className="font-semibold text-foreground">Diploma-in-Engineering</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Affiliation</span>
                  <span className="font-semibold text-foreground">BTEB</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Seat Capacity</span>
                  <span className="font-semibold text-foreground">120 per institute</span>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      </div>
    </AnimatedPage>
  );
}
