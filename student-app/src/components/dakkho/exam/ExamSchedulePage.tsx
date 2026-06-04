'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar, ChevronLeft, Clock, MapPin, AlertTriangle,
  CheckCircle, Filter, ChevronDown, ChevronUp, BookOpen,
  Users, Bell, Download, List,
} from 'lucide-react';
import { useNavigationStore } from '@/lib/store';
import { GlassCard } from '../shared/GlassCard';
import { GradientButton } from '../shared/GradientButton';

export function ExamSchedulePage() {
  const { goBack } = useNavigationStore();

  const [selectedSemester, setSelectedSemester] = useState('6');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [expandedMonth, setExpandedMonth] = useState('March');

  const semesters = ['1', '2', '3', '4', '5', '6', '7', '8'];

  const exams = [
    { id: 1, subject: 'Mathematics-III', code: 'MATH-301', date: '2025-03-10', time: '10:00 AM - 1:00 PM', room: 'Room 301, Building A', type: 'Theory', semester: '6', status: 'upcoming' },
    { id: 2, subject: 'Digital Electronics', code: 'ETE-301', date: '2025-03-12', time: '2:00 PM - 5:00 PM', room: 'Room 205, Building B', type: 'Theory', semester: '6', status: 'upcoming' },
    { id: 3, subject: 'Data Structures', code: 'CSE-301', date: '2025-03-15', time: '10:00 AM - 1:00 PM', room: 'Lab 102, Building C', type: 'Theory', semester: '6', status: 'upcoming' },
    { id: 4, subject: 'Electrical Machines', code: 'EEE-301', date: '2025-03-18', time: '10:00 AM - 1:00 PM', room: 'Room 401, Building A', type: 'Theory', semester: '6', status: 'upcoming' },
    { id: 5, subject: 'Thermodynamics', code: 'ME-301', date: '2025-03-20', time: '2:00 PM - 5:00 PM', room: 'Room 302, Building B', type: 'Theory', semester: '6', status: 'upcoming' },
    { id: 6, subject: 'Programming Lab', code: 'CSE-302', date: '2025-03-22', time: '9:00 AM - 12:00 PM', room: 'Lab 201, Building C', type: 'Practical', semester: '6', status: 'upcoming' },
    { id: 7, subject: 'Electrical Lab', code: 'EEE-302', date: '2025-03-25', time: '9:00 AM - 12:00 PM', room: 'Lab 103, Building A', type: 'Practical', semester: '6', status: 'upcoming' },
    { id: 8, subject: 'English-II', code: 'ENG-201', date: '2025-03-28', time: '10:00 AM - 1:00 PM', room: 'Room 101, Building A', type: 'Theory', semester: '6', status: 'upcoming' },
    { id: 9, subject: 'Mathematics-II', code: 'MATH-201', date: '2025-02-15', time: '10:00 AM - 1:00 PM', room: 'Room 301, Building A', type: 'Theory', semester: '4', status: 'completed' },
    { id: 10, subject: 'Physics-I', code: 'PHYS-101', date: '2025-02-10', time: '2:00 PM - 5:00 PM', room: 'Room 205, Building B', type: 'Theory', semester: '2', status: 'completed' },
  ];

  const filteredExams = exams.filter((e) => e.semester === selectedSemester);

  const groupedExams = filteredExams.reduce<Record<string, typeof exams>>((acc, exam) => {
    const month = new Date(exam.date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    if (!acc[month]) acc[month] = [];
    acc[month].push(exam);
    return acc;
  }, {});

  const calendarDays = Array.from({ length: 31 }, (_, i) => i + 1);
  const examDates = new Map(filteredExams.map((e) => [new Date(e.date).getDate(), e]));

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400';
      case 'upcoming': return 'bg-sky-50 dark:bg-sky-900/20 text-sky-600 dark:text-sky-400';
      default: return 'bg-muted/30 text-muted-foreground';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Theory': return 'bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400';
      case 'Practical': return 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400';
      default: return 'bg-muted/30 text-muted-foreground';
    }
  };

  return (
    <div className="pb-20 lg:pb-0">
      {/* Header */}
      <motion.div className="flex items-center gap-3 mb-6" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <motion.button className="w-9 h-9 rounded-xl bg-muted/30 flex items-center justify-center text-foreground" onClick={goBack} whileTap={{ scale: 0.9 }}>
          <ChevronLeft className="w-5 h-5" />
        </motion.button>
        <div className="flex-1">
          <h1 className="text-xl font-extrabold text-foreground">Exam Schedule</h1>
          <p className="text-xs text-muted-foreground">Your complete exam timetable</p>
        </div>
        <motion.button className="p-2 rounded-xl bg-muted/30 text-foreground" whileTap={{ scale: 0.9 }}>
          <Download className="w-4 h-4" />
        </motion.button>
      </motion.div>

      {/* Semester Selector */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <GlassCard className="p-4 mb-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <span className="text-xs font-bold text-muted-foreground whitespace-nowrap">Semester:</span>
            {semesters.map((sem) => (
              <motion.button
                key={sem}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap ${
                  selectedSemester === sem ? 'bg-sky-500 text-white' : 'bg-muted/30 text-muted-foreground'
                }`}
                onClick={() => setSelectedSemester(sem)}
                whileTap={{ scale: 0.95 }}
              >
                {sem}
              </motion.button>
            ))}
          </div>
        </GlassCard>
      </motion.div>

      {/* View Mode Toggle */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="mb-4">
        <div className="flex gap-1 bg-muted/30 rounded-lg p-0.5 w-fit">
          <motion.button
            className={`px-4 py-2 rounded-md text-xs font-semibold flex items-center gap-1.5 ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 shadow-sm text-foreground' : 'text-muted-foreground'}`}
            onClick={() => setViewMode('list')}
            whileTap={{ scale: 0.95 }}
          >
            <List className="w-3 h-3" /> List
          </motion.button>
          <motion.button
            className={`px-4 py-2 rounded-md text-xs font-semibold flex items-center gap-1.5 ${viewMode === 'calendar' ? 'bg-white dark:bg-slate-700 shadow-sm text-foreground' : 'text-muted-foreground'}`}
            onClick={() => setViewMode('calendar')}
            whileTap={{ scale: 0.95 }}
          >
            <Calendar className="w-3 h-3" /> Calendar
          </motion.button>
        </div>
      </motion.div>

      {viewMode === 'list' ? (
        /* List View */
        <div className="space-y-4">
          {Object.entries(groupedExams).map(([month, monthExams], mi) => (
            <motion.div
              key={month}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + mi * 0.05 }}
            >
              <GlassCard className="overflow-hidden">
                <motion.button
                  className="w-full p-4 flex items-center justify-between"
                  onClick={() => setExpandedMonth(expandedMonth === month ? '' : month)}
                  whileTap={{ scale: 0.99 }}
                >
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-sky-500" />
                    {month}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground">{monthExams.length} exams</span>
                    {expandedMonth === month ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </motion.button>

                {expandedMonth === month && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    className="px-4 pb-4 space-y-2"
                  >
                    {monthExams.map((exam, i) => (
                      <motion.div
                        key={exam.id}
                        className="p-3 rounded-xl bg-muted/20"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="text-sm font-bold text-foreground">{exam.subject}</p>
                            <p className="text-xs text-muted-foreground">{exam.code}</p>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${getTypeColor(exam.type)}`}>{exam.type}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${getStatusColor(exam.status)}`}>
                              {exam.status === 'completed' ? 'Done' : 'Upcoming'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(exam.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {exam.time}
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {exam.room}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </GlassCard>
            </motion.div>
          ))}
        </div>
      ) : (
        /* Calendar View */
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <GlassCard className="p-5">
            <div className="text-center mb-4">
              <h3 className="text-base font-bold text-foreground">March 2025</h3>
            </div>
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="text-center text-xs font-bold text-muted-foreground py-1">{day}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {/* Empty cells for offset (March 2025 starts on Saturday) */}
              {Array.from({ length: 6 }, (_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {calendarDays.map((day) => {
                const exam = examDates.get(day);
                return (
                  <motion.div
                    key={day}
                    className={`aspect-square rounded-lg flex flex-col items-center justify-center text-xs cursor-pointer transition-all ${
                      exam ? 'bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800' : 'hover:bg-muted/20'
                    }`}
                    whileTap={{ scale: 0.9 }}
                  >
                    <span className={`font-bold ${exam ? 'text-sky-500' : 'text-foreground'}`}>{day}</span>
                    {exam && <div className="w-1.5 h-1.5 rounded-full bg-sky-500 mt-0.5" />}
                  </motion.div>
                );
              })}
            </div>
          </GlassCard>
        </motion.div>
      )}

      {/* Quick Stats */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <GlassCard className="p-5 mt-4">
          <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">Summary</h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-2 rounded-xl bg-muted/20">
              <p className="text-lg font-extrabold text-sky-500">{filteredExams.filter((e) => e.type === 'Theory').length}</p>
              <p className="text-xs text-muted-foreground">Theory</p>
            </div>
            <div className="text-center p-2 rounded-xl bg-muted/20">
              <p className="text-lg font-extrabold text-amber-500">{filteredExams.filter((e) => e.type === 'Practical').length}</p>
              <p className="text-xs text-muted-foreground">Practical</p>
            </div>
            <div className="text-center p-2 rounded-xl bg-muted/20">
              <p className="text-lg font-extrabold text-emerald-500">{filteredExams.filter((e) => e.status === 'completed').length}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
}
