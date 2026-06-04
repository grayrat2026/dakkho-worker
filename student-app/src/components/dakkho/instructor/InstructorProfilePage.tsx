'use client';

import { motion } from 'framer-motion';
import { Star, Users, BookOpen, Globe, Youtube, Linkedin, ChevronLeft } from 'lucide-react';
import { useNavigationStore } from '@/lib/store';
import { getInstructor, getInstructorCourses, formatDuration } from '@/lib/mock-data';
import { GlassCard } from '../shared/GlassCard';
import { CourseCardGrid } from '../shared/CourseCardGrid';
import { AnimatedCounter } from '../shared/AnimatedCounter';
import { GradientButton } from '../shared/GradientButton';

export function InstructorProfilePage() {
  const { pageParams, navigate, goBack } = useNavigationStore();
  const instructorId = pageParams.instructorId as string;
  const instructor = getInstructor(instructorId);
  const courses = instructor ? getInstructorCourses(instructor.id) : [];

  if (!instructor) {
    return (
      <div className="text-center py-16">
        <p className="text-lg font-bold">Instructor not found</p>
        <GradientButton onClick={goBack} className="mt-4">Go Back</GradientButton>
      </div>
    );
  }

  const coverColors = ['from-sky-400 to-blue-600', 'from-emerald-400 to-teal-600', 'from-purple-400 to-indigo-600'];

  return (
    <div>
      <motion.button
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
        onClick={goBack}
        whileHover={{ x: -3 }}
      >
        <ChevronLeft className="w-4 h-4" />
        Go Back
      </motion.button>

      {/* Cover + Avatar */}
      <GlassCard className="overflow-hidden mb-6">
        <div className={`h-32 md:h-48 bg-gradient-to-br ${coverColors[0]} relative`}>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center text-white text-4xl font-extrabold">
              {instructor.name.charAt(0)}
            </div>
          </div>
        </div>
        <div className="p-6 pt-4">
          <h1 className="text-xl font-extrabold text-foreground">{instructor.name}</h1>
          <p className="text-sm text-sky-500 font-semibold">{instructor.specialization}</p>
          <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{instructor.bio}</p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="text-center">
              <AnimatedCounter target={instructor.totalStudents} className="text-xl font-extrabold text-foreground" />
              <p className="text-xs text-muted-foreground mt-0.5">Students</p>
            </div>
            <div className="text-center">
              <AnimatedCounter target={instructor.totalCourses} className="text-xl font-extrabold text-foreground" />
              <p className="text-xs text-muted-foreground mt-0.5">Courses</p>
            </div>
            <div className="text-center">
              <span className="text-xl font-extrabold text-foreground">{instructor.rating}</span>
              <p className="text-xs text-muted-foreground mt-0.5">Rating</p>
            </div>
          </div>

          {/* Social links */}
          {instructor.socialLinks && instructor.socialLinks.length > 0 && (
            <div className="flex gap-3 mt-4">
              {instructor.socialLinks.map((link, i) => (
                <motion.a
                  key={i}
                  href={link.url}
                  className="w-9 h-9 rounded-xl bg-muted/50 flex items-center justify-center"
                  whileHover={{ scale: 1.1 }}
                >
                  {link.platform === 'linkedin' ? <Linkedin className="w-4 h-4 text-muted-foreground" /> : <Youtube className="w-4 h-4 text-muted-foreground" />}
                </motion.a>
              ))}
            </div>
          )}
        </div>
      </GlassCard>

      {/* Courses */}
      <h2 className="text-lg font-extrabold text-foreground mb-4">Courses by {instructor.name}</h2>
      <CourseCardGrid courses={courses} />
    </div>
  );
}
