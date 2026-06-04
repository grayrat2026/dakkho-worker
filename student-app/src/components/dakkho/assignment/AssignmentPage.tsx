'use client';

import { motion } from 'framer-motion';
import { ClipboardList, Calendar, CheckCircle, Clock, AlertCircle, Upload } from 'lucide-react';
import { useState } from 'react';
import { GlassCard } from '../shared/GlassCard';
import { GradientButton } from '../shared/GradientButton';

interface Assignment {
  id: string;
  title: string;
  courseName: string;
  courseId: string;
  dueDate: string;
  status: 'pending' | 'submitted' | 'graded';
  grade?: string;
  maxGrade: string;
  description: string;
}

const MOCK_ASSIGNMENTS: Assignment[] = [
  {
    id: 'as1',
    title: 'Build a Responsive Portfolio Website',
    courseName: 'Complete Web Development with HTML, CSS & JavaScript',
    courseId: 'c1',
    dueDate: new Date(Date.now() + 86400000 * 3).toISOString(),
    status: 'pending',
    maxGrade: '100',
    description: 'Create a responsive portfolio website using HTML5, CSS3, and JavaScript with at least 4 sections.',
  },
  {
    id: 'as2',
    title: 'React Todo Application',
    courseName: 'React.js & Next.js - Modern Frontend Development',
    courseId: 'c2',
    dueDate: new Date(Date.now() + 86400000 * 7).toISOString(),
    status: 'pending',
    maxGrade: '100',
    description: 'Build a Todo application with React.js using hooks, context API, and localStorage for persistence.',
  },
  {
    id: 'as3',
    title: 'Digital Logic Circuit Design',
    courseName: 'Digital Electronics Fundamentals',
    courseId: 'c3',
    dueDate: new Date(Date.now() - 86400000 * 2).toISOString(),
    status: 'submitted',
    maxGrade: '100',
    description: 'Design and simulate a 4-bit ALU using logic gates with truth table verification.',
  },
  {
    id: 'as4',
    title: 'Arduino Temperature Monitor',
    courseName: 'Microcontroller Programming with Arduino',
    courseId: 'c4',
    dueDate: new Date(Date.now() - 86400000 * 5).toISOString(),
    status: 'graded',
    grade: '92',
    maxGrade: '100',
    description: 'Build a temperature monitoring system using Arduino with LCD display and serial output.',
  },
  {
    id: 'as5',
    title: 'Circuit Analysis Problem Set',
    courseName: 'Electrical Circuit Analysis',
    courseId: 'c5',
    dueDate: new Date(Date.now() - 86400000 * 10).toISOString(),
    status: 'graded',
    grade: '88',
    maxGrade: '100',
    description: 'Solve 10 circuit analysis problems covering Kirchhoff laws, Thevenin, and Norton theorems.',
  },
  {
    id: 'as6',
    title: 'Python Data Analysis Project',
    courseName: 'Python Programming for Beginners',
    courseId: 'c13',
    dueDate: new Date(Date.now() + 86400000 * 5).toISOString(),
    status: 'pending',
    maxGrade: '100',
    description: 'Analyze a dataset using Python, pandas, and matplotlib. Present findings with visualizations.',
  },
];

export function AssignmentPage() {
  const [assignments] = useState<Assignment[]>(MOCK_ASSIGNMENTS);

  const pendingCount = assignments.filter((a) => a.status === 'pending').length;
  const submittedCount = assignments.filter((a) => a.status === 'submitted').length;
  const gradedCount = assignments.filter((a) => a.status === 'graded').length;

  const getStatusConfig = (status: Assignment['status']) => {
    switch (status) {
      case 'pending':
        return { icon: Clock, label: 'Pending', color: 'text-amber-500', bg: 'bg-amber-500/10' };
      case 'submitted':
        return { icon: Upload, label: 'Submitted', color: 'text-sky-500', bg: 'bg-sky-500/10' };
      case 'graded':
        return { icon: CheckCircle, label: 'Graded', color: 'text-emerald-500', bg: 'bg-emerald-500/10' };
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const isOverdue = (dateStr: string) => new Date(dateStr) < new Date();

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
          <ClipboardList className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold gradient-text">Assignments</h1>
          <p className="text-sm text-muted-foreground">{pendingCount} pending, {submittedCount} submitted, {gradedCount} graded</p>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Pending', count: pendingCount, color: 'from-amber-500 to-amber-600', icon: Clock },
          { label: 'Submitted', count: submittedCount, color: 'from-sky-500 to-blue-600', icon: Upload },
          { label: 'Graded', count: gradedCount, color: 'from-emerald-500 to-emerald-600', icon: CheckCircle },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <GlassCard className="p-4 text-center">
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center mx-auto mb-2`}>
                <stat.icon className="w-4 h-4 text-white" />
              </div>
              <p className="text-2xl font-bold">{stat.count}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {/* Assignments List */}
      <div className="space-y-3">
        {assignments.map((assignment, i) => {
          const statusConfig = getStatusConfig(assignment.status);
          const StatusIcon = statusConfig.icon;
          const overdue = assignment.status === 'pending' && isOverdue(assignment.dueDate);

          return (
            <motion.div
              key={assignment.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <GlassCard hover className="p-4">
                <div className="flex items-start gap-4">
                  {/* Status Icon */}
                  <div className={`w-10 h-10 rounded-xl ${statusConfig.bg} flex items-center justify-center flex-shrink-0`}>
                    <StatusIcon className={`w-5 h-5 ${statusConfig.color}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-sm text-foreground">{assignment.title}</h3>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusConfig.bg} ${statusConfig.color} flex-shrink-0`}>
                        {statusConfig.label}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{assignment.courseName}</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">{assignment.description}</p>

                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      <span className={`flex items-center gap-1 text-xs ${overdue ? 'text-red-500 font-semibold' : 'text-muted-foreground'}`}>
                        <Calendar className="w-3 h-3" />
                        Due: {formatDate(assignment.dueDate)}
                        {overdue && (
                          <AlertCircle className="w-3 h-3 ml-1" />
                        )}
                      </span>
                      {assignment.status === 'graded' && assignment.grade && (
                        <span className="text-xs font-bold text-emerald-500">
                          Grade: {assignment.grade}/{assignment.maxGrade}
                        </span>
                      )}
                    </div>

                    {assignment.status === 'pending' && (
                      <div className="mt-3">
                        <GradientButton size="sm" className="text-xs">
                          <Upload className="w-3 h-3" />
                          Submit Assignment
                        </GradientButton>
                      </div>
                    )}
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
