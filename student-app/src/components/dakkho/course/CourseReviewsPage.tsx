'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Star, ThumbsUp, ThumbsDown, ChevronLeft, Send, User,
  MessageCircle, Filter, TrendingUp, AlertCircle,
} from 'lucide-react';
import { useNavigationStore } from '@/lib/store';
import { getCourse } from '@/lib/mock-data';
import { GlassCard } from '../shared/GlassCard';
import { AnimatedPage } from '../shared/AnimatedPage';
import { GradientButton } from '../shared/GradientButton';
import { ProgressBar } from '../shared/ProgressBar';

const MOCK_REVIEWS = [
  { id: 'r1', name: 'Rahim Ahmed', avatar: '', rating: 5, date: '2 days ago', comment: 'Excellent course! The instructor explains everything very clearly. The hands-on projects really helped me understand the concepts. Highly recommended for all CSE students!', helpful: 24, unhelpful: 2 },
  { id: 'r2', name: 'Sadia Khatun', avatar: '', rating: 4, date: '1 week ago', comment: 'Great content and well-structured curriculum. Some topics could use more examples, but overall a very useful course for BTEB preparation.', helpful: 18, unhelpful: 1 },
  { id: 'r3', name: 'Tanvir Hasan', avatar: '', rating: 5, date: '2 weeks ago', comment: 'Best course I have taken on this platform. The practical approach makes it easy to follow along and learn effectively. The quizzes are very helpful for exam preparation.', helpful: 31, unhelpful: 0 },
  { id: 'r4', name: 'Nusrat Jahan', avatar: '', rating: 4, date: '3 weeks ago', comment: 'Good course for beginners. The explanations are thorough and the video quality is excellent. Would love to see more advanced content added.', helpful: 12, unhelpful: 1 },
  { id: 'r5', name: 'Imran Hossain', avatar: '', rating: 5, date: '1 month ago', comment: 'Outstanding teaching methodology! The real-world examples and step-by-step approach make complex topics easy to understand. This course helped me score well in my exams.', helpful: 42, unhelpful: 3 },
  { id: 'r6', name: 'Farzana Akter', avatar: '', rating: 3, date: '1 month ago', comment: 'Decent course overall. Some sections feel a bit rushed and could use more depth. The instructor is knowledgeable but the pacing could be improved.', helpful: 8, unhelpful: 2 },
];

export function CourseReviewsPage() {
  const { pageParams, navigate, goBack } = useNavigationStore();
  const courseId = pageParams.courseId as string;
  const course = getCourse(courseId);

  const [ratingFilter, setRatingFilter] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<'recent' | 'helpful'>('recent');
  const [newReview, setNewReview] = useState('');
  const [newRating, setNewRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [showReviewForm, setShowReviewForm] = useState(false);

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

  const filteredReviews = MOCK_REVIEWS
    .filter((r) => ratingFilter === null || r.rating === ratingFilter)
    .sort((a, b) => sortBy === 'recent' ? 0 : b.helpful - a.helpful);

  // Rating distribution
  const ratingDist = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: MOCK_REVIEWS.filter((r) => r.rating === star).length,
    percentage: (MOCK_REVIEWS.filter((r) => r.rating === star).length / MOCK_REVIEWS.length) * 100,
  }));

  return (
    <AnimatedPage keyProp={`course-reviews-${courseId}`}>
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
          <span className="text-foreground font-semibold">Reviews</span>
        </motion.div>

        {/* Rating Overview */}
        <GlassCard className="p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-6">
            {/* Overall rating */}
            <div className="text-center sm:text-left sm:pr-6 sm:border-r border-white/20 dark:border-white/5">
              <div className="text-4xl font-extrabold text-foreground">{course.rating}</div>
              <div className="flex gap-0.5 justify-center sm:justify-start mt-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className={`w-4 h-4 ${s <= Math.round(course.rating) ? 'text-amber-400 fill-amber-400' : 'text-muted'}`} />
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{course.totalReviews} reviews</p>
              <p className="text-xs text-muted-foreground">{course.totalStudents} students</p>
            </div>

            {/* Rating distribution */}
            <div className="flex-1 space-y-2">
              {ratingDist.map((item) => (
                <button
                  key={item.star}
                  className="w-full flex items-center gap-3 group"
                  onClick={() => setRatingFilter(ratingFilter === item.star ? null : item.star)}
                >
                  <span className="text-xs font-medium text-foreground w-3">{item.star}</span>
                  <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                  <ProgressBar
                    value={item.percentage}
                    size="sm"
                    className="flex-1"
                    color={ratingFilter === item.star ? 'bg-sky-500' : 'bg-amber-400'}
                  />
                  <span className="text-xs text-muted-foreground w-8 text-right">{item.count}</span>
                </button>
              ))}
            </div>
          </div>
        </GlassCard>

        {/* Filter and Sort */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-semibold text-foreground">
              {filteredReviews.length} Review{filteredReviews.length !== 1 ? 's' : ''}
              {ratingFilter && ` (${ratingFilter} star)`}
            </span>
          </div>
          <div className="flex gap-2">
            <motion.button
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                sortBy === 'recent' ? 'bg-sky-500 text-white' : 'bg-muted/30 text-muted-foreground'
              }`}
              onClick={() => setSortBy('recent')}
              whileTap={{ scale: 0.95 }}
            >
              Recent
            </motion.button>
            <motion.button
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                sortBy === 'helpful' ? 'bg-sky-500 text-white' : 'bg-muted/30 text-muted-foreground'
              }`}
              onClick={() => setSortBy('helpful')}
              whileTap={{ scale: 0.95 }}
            >
              Most Helpful
            </motion.button>
          </div>
        </div>

        {/* Write Review Button */}
        <motion.div className="mb-6">
          <GlassCard
            hover
            className="p-4 flex items-center gap-3 cursor-pointer"
            onClick={() => setShowReviewForm(!showReviewForm)}
          >
            <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-900/20 flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-sky-500" />
            </div>
            <span className="text-sm font-semibold text-foreground flex-1">Write a Review</span>
            <GradientButton size="sm">Write</GradientButton>
          </GlassCard>
        </motion.div>

        {/* Review Form */}
        <AnimatePresence>
          {showReviewForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <GlassCard className="p-6 mb-6">
                <h3 className="text-sm font-bold text-foreground mb-4">Your Review</h3>
                {/* Star rating selector */}
                <div className="flex items-center gap-1 mb-4">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <motion.button
                      key={s}
                      onMouseEnter={() => setHoverRating(s)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setNewRating(s)}
                      whileHover={{ scale: 1.2 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <Star className={`w-7 h-7 transition-colors ${
                        s <= (hoverRating || newRating) ? 'text-amber-400 fill-amber-400' : 'text-muted'
                      }`} />
                    </motion.button>
                  ))}
                  <span className="text-sm text-muted-foreground ml-2">
                    {newRating > 0 ? `${newRating} Star${newRating > 1 ? 's' : ''}` : 'Select rating'}
                  </span>
                </div>
                {/* Review text */}
                <textarea
                  value={newReview}
                  onChange={(e) => setNewReview(e.target.value)}
                  placeholder="Share your experience with this course..."
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl bg-muted/30 border border-white/30 dark:border-white/10 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/50 resize-none"
                />
                <div className="flex justify-end gap-3 mt-4">
                  <motion.button
                    className="px-4 py-2 rounded-xl bg-muted/30 text-sm font-semibold text-foreground"
                    onClick={() => { setShowReviewForm(false); setNewReview(''); setNewRating(0); }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Cancel
                  </motion.button>
                  <GradientButton size="sm" onClick={() => setShowReviewForm(false)}>
                    <Send className="w-4 h-4" />
                    Submit Review
                  </GradientButton>
                </div>
              </GlassCard>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Reviews List */}
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
                    {review.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-foreground">{review.name}</h4>
                      <span className="text-[10px] text-muted-foreground">{review.date}</span>
                    </div>
                    <div className="flex gap-0.5 mt-0.5">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} className={`w-3 h-3 ${s <= review.rating ? 'text-amber-400 fill-amber-400' : 'text-muted'}`} />
                      ))}
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
            <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No reviews found for this filter.</p>
          </GlassCard>
        )}
      </div>
    </AnimatedPage>
  );
}
