'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Star, ThumbsUp, ThumbsDown, MessageCircle, Filter,
  TrendingUp, Award, Users, ChevronDown, BarChart3,
} from 'lucide-react';
import { useNavigationStore } from '@/lib/store';
import { getInstructor } from '@/lib/mock-data';
import { GlassCard } from '../shared/GlassCard';
import { AnimatedPage } from '../shared/AnimatedPage';
import { GradientButton } from '../shared/GradientButton';
import { ProgressBar } from '../shared/ProgressBar';

const MOCK_INSTRUCTOR_REVIEWS = [
  { id: 'ir1', studentName: 'Rahim Ahmed', courseName: 'Complete Web Development', rating: 5, date: '1 week ago', comment: 'Engr. Karim Uddin is an exceptional teacher. His explanations are crystal clear and he always provides practical examples. I went from zero programming knowledge to building my own websites!', helpful: 34, unhelpful: 1 },
  { id: 'ir2', studentName: 'Sadia Khatun', courseName: 'Python Programming for Beginners', rating: 5, date: '2 weeks ago', comment: 'The way he breaks down complex concepts into simple, digestible parts is amazing. Every lecture feels like a conversation rather than a lecture. Highly recommended!', helpful: 28, unhelpful: 0 },
  { id: 'ir3', studentName: 'Tanvir Hasan', courseName: 'C Programming & Data Structures', rating: 4, date: '3 weeks ago', comment: 'Very knowledgeable instructor. The only suggestion would be to add more practice problems. Otherwise, excellent teaching methodology.', helpful: 15, unhelpful: 2 },
  { id: 'ir4', studentName: 'Nusrat Jahan', courseName: 'Android Development with Kotlin', rating: 5, date: '1 month ago', comment: 'I love how he encourages students to think independently. The assignments are challenging but rewarding. He also responds to questions very quickly!', helpful: 22, unhelpful: 0 },
  { id: 'ir5', studentName: 'Imran Hossain', courseName: 'Database Management with SQL', rating: 4, date: '1 month ago', comment: 'Good instructor with deep knowledge of the subject. The course structure is well-organized and covers all BTEB topics thoroughly.', helpful: 12, unhelpful: 1 },
  { id: 'ir6', studentName: 'Farzana Akter', courseName: 'Complete Web Development', rating: 5, date: '2 months ago', comment: 'Best instructor on the platform! His real-world experience shows in every lecture. The tips he gives for exam preparation are invaluable.', helpful: 45, unhelpful: 1 },
];

export function InstructorReviewsPage() {
  const { pageParams, navigate, goBack } = useNavigationStore();
  const instructorId = pageParams.instructorId as string;
  const instructor = getInstructor(instructorId);

  const [sortBy, setSortBy] = useState<'recent' | 'helpful' | 'highest'>('recent');
  const [ratingFilter, setRatingFilter] = useState<number | null>(null);

  if (!instructor) {
    return (
      <AnimatedPage>
        <div className="text-center py-16">
          <p className="text-lg font-bold">Instructor not found</p>
          <GradientButton onClick={goBack} className="mt-4">Go Back</GradientButton>
        </div>
      </AnimatedPage>
    );
  }

  const filteredReviews = MOCK_INSTRUCTOR_REVIEWS
    .filter((r) => ratingFilter === null || r.rating === ratingFilter)
    .sort((a, b) => {
      if (sortBy === 'helpful') return b.helpful - a.helpful;
      if (sortBy === 'highest') return b.rating - a.rating;
      return 0;
    });

  const ratingDist = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: MOCK_INSTRUCTOR_REVIEWS.filter((r) => r.rating === star).length,
    percentage: (MOCK_INSTRUCTOR_REVIEWS.filter((r) => r.rating === star).length / MOCK_INSTRUCTOR_REVIEWS.length) * 100,
  }));

  return (
    <AnimatedPage keyProp={`instructor-reviews-${instructorId}`}>
      <div className="pb-20 lg:pb-0">
        {/* Breadcrumb */}
        <motion.div className="flex items-center gap-2 text-sm text-muted-foreground mb-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <button onClick={() => navigate('home')} className="hover:text-sky-500 transition-colors">Home</button>
          <span>/</span>
          <button onClick={() => navigate('instructor-profile', { instructorId })} className="hover:text-sky-500 transition-colors">{instructor.name}</button>
          <span>/</span>
          <span className="text-foreground font-semibold">Reviews</span>
        </motion.div>

        {/* Header with rating overview */}
        <GlassCard className="p-6 mb-6">
          <div className="flex items-center gap-4 mb-4">
            <motion.div
              className="w-12 h-12 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white text-lg font-extrabold"
              whileHover={{ scale: 1.05 }}
            >
              {instructor.name.charAt(0)}
            </motion.div>
            <div>
              <h1 className="text-lg font-extrabold text-foreground">Instructor Reviews</h1>
              <p className="text-sm text-sky-500 font-semibold">{instructor.name}</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-6">
            {/* Overall rating */}
            <div className="text-center sm:text-left sm:pr-6 sm:border-r border-white/20 dark:border-white/5 flex-shrink-0">
              <div className="text-4xl font-extrabold text-foreground">{instructor.rating}</div>
              <div className="flex gap-0.5 justify-center sm:justify-start mt-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className={`w-4 h-4 ${s <= Math.round(instructor.rating) ? 'text-amber-400 fill-amber-400' : 'text-muted'}`} />
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{MOCK_INSTRUCTOR_REVIEWS.length} reviews</p>
              <p className="text-xs text-muted-foreground">{instructor.totalStudents.toLocaleString()} students</p>
            </div>

            {/* Distribution */}
            <div className="flex-1 space-y-2">
              {ratingDist.map((item) => (
                <button
                  key={item.star}
                  className="w-full flex items-center gap-3 group"
                  onClick={() => setRatingFilter(ratingFilter === item.star ? null : item.star)}
                >
                  <span className="text-xs font-medium text-foreground w-3">{item.star}</span>
                  <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                  <ProgressBar value={item.percentage} size="sm" className="flex-1" color={ratingFilter === item.star ? 'bg-sky-500' : 'bg-amber-400'} />
                  <span className="text-xs text-muted-foreground w-6 text-right">{item.count}</span>
                </button>
              ))}
            </div>
          </div>
        </GlassCard>

        {/* Sort */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-semibold text-foreground">{filteredReviews.length} Reviews</span>
          <div className="flex gap-2">
            {[
              { key: 'recent' as const, label: 'Recent' },
              { key: 'helpful' as const, label: 'Helpful' },
              { key: 'highest' as const, label: 'Highest' },
            ].map((option) => (
              <motion.button
                key={option.key}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                  sortBy === option.key ? 'bg-sky-500 text-white' : 'bg-muted/30 text-muted-foreground'
                }`}
                onClick={() => setSortBy(option.key)}
                whileTap={{ scale: 0.95 }}
              >
                {option.label}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Reviews list */}
        <div className="space-y-4">
          {filteredReviews.map((review, i) => (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <GlassCard className="p-5">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {review.studentName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-foreground">{review.studentName}</h4>
                      <span className="text-[10px] text-muted-foreground">{review.date}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} className={`w-3 h-3 ${s <= review.rating ? 'text-amber-400 fill-amber-400' : 'text-muted'}`} />
                        ))}
                      </div>
                      <span className="text-xs text-sky-500 font-semibold">{review.courseName}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{review.comment}</p>
                    <div className="flex items-center gap-4 mt-3">
                      <motion.button
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-sky-500 transition-colors"
                        whileTap={{ scale: 0.95 }}
                      >
                        <ThumbsUp className="w-3 h-3" />
                        Helpful ({review.helpful})
                      </motion.button>
                      <motion.button
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-red-500 transition-colors"
                        whileTap={{ scale: 0.95 }}
                      >
                        <ThumbsDown className="w-3 h-3" />
                        ({review.unhelpful})
                      </motion.button>
                    </div>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>

        {filteredReviews.length === 0 && (
          <GlassCard className="p-8 text-center">
            <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No reviews found for this filter.</p>
          </GlassCard>
        )}
      </div>
    </AnimatedPage>
  );
}
