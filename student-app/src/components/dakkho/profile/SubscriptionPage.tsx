'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Package, User, Users, Clock, ChevronRight, Sparkles,
  CreditCard, CheckCircle, AlertCircle, Loader2, BookOpen,
  Tag, X, ArrowRight, Shield, Info, Copy, Check, Search,
  CalendarDays, Wallet, Phone, Hash, ExternalLink, ShoppingBag,
} from 'lucide-react';
import { useNavigationStore, useAuthStore } from '@/lib/store';
import { packageApi, paymentApi, courseApi, couponApi } from '@/lib/api-client';
import type { CoursePackage, UserPackage, PaymentConfig } from '@/lib/api-client';
import { GlassCard } from '../shared/GlassCard';
import { AnimatedPage } from '../shared/AnimatedPage';
import { GradientButton } from '../shared/GradientButton';

// ============ TYPES ============
interface CourseItem {
  id: string;
  title: string;
  technology?: string;
  thumbnail_url?: string;
}

interface CouponState {
  code: string;
  valid: boolean | null;
  coupon: any | null;
  error: string | null;
  isValidating: boolean;
}

type PurchaseStep = 'select-course' | 'select-package' | 'payment' | 'submitted';

// ============ HELPER FUNCTIONS ============
function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-BD', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
}

function getDaysRemaining(expiresAt: string): number {
  if (!expiresAt) return 0;
  const now = new Date();
  const exp = new Date(expiresAt);
  const diff = exp.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function getPackageTypeLabel(type: string): { label: string; icon: React.ComponentType<{ className?: string }>; color: string; bgColor: string; description: string } {
  switch (type) {
    case 'single':
      return { label: 'Single', icon: User, color: 'text-sky-600 dark:text-sky-400', bgColor: 'bg-sky-50 dark:bg-sky-900/30', description: '1 user access' };
    case 'friend':
      return { label: 'Friend Pack', icon: Users, color: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-50 dark:bg-emerald-900/30', description: '2 users, shared access' };
    default:
      return { label: type, icon: Package, color: 'text-muted-foreground', bgColor: 'bg-muted/30', description: '' };
  }
}

function getStatusBadge(status: string): { label: string; color: string; bgColor: string } {
  switch (status) {
    case 'active':
      return { label: 'Active', color: 'text-emerald-600 dark:text-emerald-400', bgColor: 'bg-emerald-50 dark:bg-emerald-900/30' };
    case 'pending':
      return { label: 'Pending', color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-50 dark:bg-amber-900/30' };
    case 'expired':
      return { label: 'Expired', color: 'text-red-500 dark:text-red-400', bgColor: 'bg-red-50 dark:bg-red-900/30' };
    case 'cancelled':
      return { label: 'Cancelled', color: 'text-muted-foreground', bgColor: 'bg-muted/30' };
    default:
      return { label: status, color: 'text-muted-foreground', bgColor: 'bg-muted/30' };
  }
}

// ============ MAIN COMPONENT ============
export function SubscriptionPage() {
  const { navigate } = useNavigationStore();
  const { user, isAuthenticated } = useAuthStore();

  // Data state
  const [myPackages, setMyPackages] = useState<UserPackage[]>([]);
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [coursePackages, setCoursePackages] = useState<CoursePackage[]>([]);
  const [paymentConfigs, setPaymentConfigs] = useState<PaymentConfig[]>([]);

  // UI state
  const [isLoadingPackages, setIsLoadingPackages] = useState(true);
  const [isLoadingCourses, setIsLoadingCourses] = useState(true);
  const [isLoadingPackagesForCourse, setIsLoadingPackagesForCourse] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Selection state
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [selectedPackage, setSelectedPackage] = useState<CoursePackage | null>(null);
  const [purchaseStep, setPurchaseStep] = useState<PurchaseStep>('select-course');
  const [courseSearch, setCourseSearch] = useState('');

  // Payment form state
  const [trxId, setTrxId] = useState('');
  const [phone, setPhone] = useState('');
  const [coupon, setCoupon] = useState<CouponState>({
    code: '', valid: null, coupon: null, error: null, isValidating: false,
  });

  // Submit result state
  const [submitResult, setSubmitResult] = useState<{ success: boolean; message: string } | null>(null);

  // ============ FETCH DATA ============
  const fetchMyPackages = useCallback(async () => {
    if (!isAuthenticated) { setIsLoadingPackages(false); return; }
    setIsLoadingPackages(true);
    try {
      const res = await packageApi.mine();
      setMyPackages(res.packages || []);
    } catch {
      setMyPackages([]);
    } finally {
      setIsLoadingPackages(false);
    }
  }, [isAuthenticated]);

  const fetchCourses = useCallback(async () => {
    setIsLoadingCourses(true);
    try {
      const res = await courseApi.list({ limit: 100 });
      setCourses((res.courses || []).map((c: any) => ({
        id: c.id || c.$id || '',
        title: c.title || c.name || 'Untitled Course',
        technology: c.technology || '',
        thumbnail_url: c.thumbnail_url || c.thumbnail || '',
      })));
    } catch {
      setCourses([]);
    } finally {
      setIsLoadingCourses(false);
    }
  }, []);

  const fetchPaymentConfigs = useCallback(async () => {
    try {
      const res = await paymentApi.config();
      setPaymentConfigs(res.paymentConfig || []);
    } catch {
      setPaymentConfigs([]);
    }
  }, []);

  useEffect(() => {
    fetchMyPackages();
    fetchCourses();
    fetchPaymentConfigs();
  }, [fetchMyPackages, fetchCourses, fetchPaymentConfigs]);

  // Fetch packages when course is selected
  useEffect(() => {
    if (!selectedCourseId) { setCoursePackages([]); return; }
    const fetchPackages = async () => {
      setIsLoadingPackagesForCourse(true);
      try {
        const res = await packageApi.list(selectedCourseId);
        setCoursePackages((res.packages || []).filter((p: CoursePackage) => p.is_active === 1));
      } catch {
        setCoursePackages([]);
      } finally {
        setIsLoadingPackagesForCourse(false);
      }
    };
    fetchPackages();
  }, [selectedCourseId]);

  // ============ HANDLERS ============
  const handleSelectCourse = (courseId: string) => {
    setSelectedCourseId(courseId);
    setSelectedPackage(null);
    setPurchaseStep('select-package');
    setCoupon({ code: '', valid: null, coupon: null, error: null, isValidating: false });
    setTrxId('');
    setPhone('');
    setSubmitResult(null);
  };

  const handleSelectPackage = (pkg: CoursePackage) => {
    setSelectedPackage(pkg);
    setPurchaseStep('payment');
    setCoupon({ code: '', valid: null, coupon: null, error: null, isValidating: false });
    setTrxId('');
    setPhone('');
    setSubmitResult(null);
  };

  const handleValidateCoupon = async () => {
    if (!coupon.code.trim()) return;
    setCoupon((prev) => ({ ...prev, isValidating: true, valid: null, error: null, coupon: null }));
    try {
      const res = await couponApi.validate(coupon.code.trim());
      if (res.valid) {
        setCoupon((prev) => ({ ...prev, valid: true, coupon: res.coupon, error: null, isValidating: false }));
      } else {
        setCoupon((prev) => ({ ...prev, valid: false, coupon: null, error: res.error || 'Invalid coupon code', isValidating: false }));
      }
    } catch (err: any) {
      setCoupon((prev) => ({ ...prev, valid: false, coupon: null, error: err.message || 'Failed to validate coupon', isValidating: false }));
    }
  };

  const handleSubmitPayment = async () => {
    if (!selectedPackage || !trxId.trim()) return;
    setIsSubmitting(true);
    setSubmitResult(null);
    try {
      const data: { package_id: number; trx_id: string; phone?: string; proof_url?: string } = {
        package_id: selectedPackage.id,
        trx_id: trxId.trim(),
      };
      if (phone.trim()) data.phone = phone.trim();
      const res = await paymentApi.submit(data);
      if (res.success) {
        setSubmitResult({ success: true, message: res.message || 'Payment submitted successfully! Waiting for admin verification.' });
        setPurchaseStep('submitted');
        fetchMyPackages(); // Refresh packages
      } else {
        setSubmitResult({ success: false, message: res.message || 'Payment submission failed. Please try again.' });
      }
    } catch (err: any) {
      setSubmitResult({ success: false, message: err.message || 'Something went wrong. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetFlow = () => {
    setSelectedCourseId('');
    setSelectedPackage(null);
    setPurchaseStep('select-course');
    setCoupon({ code: '', valid: null, coupon: null, error: null, isValidating: false });
    setTrxId('');
    setPhone('');
    setSubmitResult(null);
    setCourseSearch('');
  };

  const handleCopyToClipboard = (text: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
  };

  // Computed
  const activePackages = myPackages.filter((p) => p.status === 'active');
  const pendingPackages = myPackages.filter((p) => p.status === 'pending');
  const filteredCourses = courses.filter((c) =>
    !courseSearch.trim() || c.title.toLowerCase().includes(courseSearch.toLowerCase())
  );

  const getDiscountedPrice = (): number => {
    if (!selectedPackage || !coupon.valid || !coupon.coupon) return selectedPackage?.price || 0;
    if (coupon.coupon.discount_type === 'percentage') {
      return Math.max(0, selectedPackage.price - (selectedPackage.price * coupon.coupon.discount_value / 100));
    }
    if (coupon.coupon.discount_type === 'flat') {
      return Math.max(0, selectedPackage.price - coupon.coupon.discount_value);
    }
    return selectedPackage?.price || 0;
  };

  // ============ RENDER ============
  return (
    <AnimatedPage keyProp="subscription">
      <div className="pb-20 lg:pb-0">
        {/* Breadcrumb */}
        <motion.div
          className="flex items-center gap-2 text-sm text-muted-foreground mb-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <button onClick={() => navigate('home')} className="hover:text-sky-500 transition-colors">Home</button>
          <span>/</span>
          <button onClick={() => navigate('profile')} className="hover:text-sky-500 transition-colors">Profile</button>
          <span>/</span>
          <span className="text-foreground font-semibold">Subscription</span>
        </motion.div>

        {/* Header */}
        <GlassCard className="p-6 mb-6 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', delay: 0.2 }}
          >
            <Package className="w-10 h-10 text-sky-400 mx-auto mb-3" />
          </motion.div>
          <h1 className="text-2xl font-extrabold text-foreground">Course Packages</h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-lg mx-auto">
            Purchase course packages to unlock premium content. Choose a single pack for yourself or a friend pack to share.
          </p>
        </GlassCard>

        {/* ===== ACTIVE PACKAGES SECTION ===== */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mb-6"
        >
          <h2 className="text-base font-bold text-foreground mb-3 flex items-center gap-2">
            <Shield className="w-4 h-4 text-sky-500" />
            Your Active Packages
          </h2>

          {isLoadingPackages ? (
            <GlassCard className="p-6">
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm">Loading your packages...</span>
              </div>
            </GlassCard>
          ) : activePackages.length === 0 && pendingPackages.length === 0 ? (
            <GlassCard className="p-6 text-center">
              <div className="flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-sky-50 dark:bg-sky-900/20 flex items-center justify-center">
                  <ShoppingBag className="w-7 h-7 text-sky-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">No Active Packages</p>
                  <p className="text-xs text-muted-foreground mt-1">You don&apos;t have any active course packages yet.</p>
                </div>
                <GradientButton
                  size="sm"
                  onClick={() => {
                    setPurchaseStep('select-course');
                    document.getElementById('purchase-section')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  Browse Courses
                  <ArrowRight className="w-4 h-4" />
                </GradientButton>
              </div>
            </GlassCard>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1 custom-scrollbar">
              {/* Pending packages first */}
              {pendingPackages.map((pkg, i) => {
                const status = getStatusBadge(pkg.status);
                const typeInfo = getPackageTypeLabel(pkg.package_type);
                return (
                  <motion.div
                    key={pkg.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <GlassCard className="p-4 border-amber-200 dark:border-amber-800/40">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${status.bgColor} ${status.color}`}>
                              {status.label}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${typeInfo.bgColor} ${typeInfo.color}`}>
                              {typeInfo.label}
                            </span>
                          </div>
                          <p className="text-sm font-bold text-foreground truncate">
                            Course ID: {pkg.course_id}
                          </p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <CalendarDays className="w-3 h-3" />
                              {formatDate(pkg.activated_at)} — {formatDate(pkg.expires_at)}
                            </span>
                          </div>
                          {pkg.status === 'pending' && (
                            <div className="flex items-center gap-1.5 mt-2 text-xs text-amber-600 dark:text-amber-400">
                              <AlertCircle className="w-3 h-3" />
                              <span>Payment verification pending. Admin will review shortly.</span>
                            </div>
                          )}
                        </div>
                        <div className="text-right ml-3 flex-shrink-0">
                          <p className="text-lg font-extrabold text-foreground">&#2547;{pkg.price}</p>
                          <p className="text-[10px] text-muted-foreground">{pkg.duration_months} months</p>
                        </div>
                      </div>
                    </GlassCard>
                  </motion.div>
                );
              })}

              {/* Active packages */}
              {activePackages.map((pkg, i) => {
                const status = getStatusBadge(pkg.status);
                const typeInfo = getPackageTypeLabel(pkg.package_type);
                const daysLeft = getDaysRemaining(pkg.expires_at);
                return (
                  <motion.div
                    key={pkg.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: (pendingPackages.length + i) * 0.05 }}
                  >
                    <GlassCard className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${status.bgColor} ${status.color}`}>
                              {status.label}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${typeInfo.bgColor} ${typeInfo.color}`}>
                              {typeInfo.label}
                            </span>
                          </div>
                          <p className="text-sm font-bold text-foreground truncate">
                            Course ID: {pkg.course_id}
                          </p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <CalendarDays className="w-3 h-3" />
                              {formatDate(pkg.activated_at)} — {formatDate(pkg.expires_at)}
                            </span>
                          </div>
                          <div className="mt-2">
                            <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                              <span>Time remaining</span>
                              <span className={daysLeft < 30 ? 'text-amber-600 dark:text-amber-400 font-semibold' : ''}>
                                {daysLeft} days left
                              </span>
                            </div>
                            <div className="w-full h-1.5 bg-muted/50 rounded-full overflow-hidden">
                              <motion.div
                                className={`h-full rounded-full ${daysLeft < 30 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(100, (daysLeft / (pkg.duration_months * 30)) * 100)}%` }}
                                transition={{ duration: 1, delay: 0.3 }}
                              />
                            </div>
                          </div>
                        </div>
                        <div className="text-right ml-3 flex-shrink-0">
                          <p className="text-lg font-extrabold text-foreground">&#2547;{pkg.price}</p>
                          <p className="text-[10px] text-muted-foreground">{pkg.duration_months} months</p>
                        </div>
                      </div>
                    </GlassCard>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* ===== PURCHASE SECTION ===== */}
        <div id="purchase-section">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <h2 className="text-base font-bold text-foreground mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-sky-500" />
              Get a Course Package
            </h2>

            {/* Step Indicator */}
            <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-1">
              {[
                { step: 'select-course', label: '1. Course', icon: BookOpen },
                { step: 'select-package', label: '2. Package', icon: Package },
                { step: 'payment', label: '3. Payment', icon: CreditCard },
              ].map((s, i) => {
                const stepOrder = ['select-course', 'select-package', 'payment', 'submitted'];
                const currentIndex = stepOrder.indexOf(purchaseStep);
                const thisIndex = stepOrder.indexOf(s.step);
                const isActive = purchaseStep === s.step;
                const isCompleted = currentIndex > thisIndex;
                const Icon = s.icon;

                return (
                  <div key={s.step} className="flex items-center gap-2">
                    {i > 0 && (
                      <div className={`w-6 h-0.5 ${isCompleted ? 'bg-sky-500' : 'bg-muted/50'}`} />
                    )}
                    <button
                      onClick={() => {
                        if (isCompleted) setPurchaseStep(s.step as PurchaseStep);
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
                        isActive
                          ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                          : isCompleted
                            ? 'bg-sky-50 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 cursor-pointer hover:bg-sky-100 dark:hover:bg-sky-900/50'
                            : 'bg-muted/30 text-muted-foreground'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {s.label}
                    </button>
                  </div>
                );
              })}
            </div>

            <AnimatePresence mode="wait">
              {/* ===== STEP 1: SELECT COURSE ===== */}
              {purchaseStep === 'select-course' && (
                <motion.div
                  key="select-course"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <GlassCard className="p-4">
                    {/* Search */}
                    <div className="relative mb-4">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        type="text"
                        placeholder="Search courses..."
                        value={courseSearch}
                        onChange={(e) => setCourseSearch(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/50 dark:bg-slate-800/50 border border-white/30 dark:border-white/10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/30 transition-all"
                      />
                    </div>

                    {isLoadingCourses ? (
                      <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span className="text-sm">Loading courses...</span>
                      </div>
                    ) : filteredCourses.length === 0 ? (
                      <div className="text-center py-8">
                        <BookOpen className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">
                          {courseSearch ? 'No courses found matching your search.' : 'No courses available yet.'}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
                        {filteredCourses.map((course, i) => (
                          <motion.button
                            key={course.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.03 }}
                            onClick={() => handleSelectCourse(course.id)}
                            className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/30 dark:bg-slate-800/30 hover:bg-sky-50/50 dark:hover:bg-sky-900/20 border border-transparent hover:border-sky-200 dark:hover:border-sky-700/50 transition-all text-left group"
                          >
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center flex-shrink-0">
                              <BookOpen className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-foreground truncate group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                                {course.title}
                              </p>
                              {course.technology && (
                                <p className="text-[11px] text-muted-foreground">{course.technology}</p>
                              )}
                            </div>
                            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-sky-500 transition-colors flex-shrink-0" />
                          </motion.button>
                        ))}
                      </div>
                    )}
                  </GlassCard>
                </motion.div>
              )}

              {/* ===== STEP 2: SELECT PACKAGE ===== */}
              {purchaseStep === 'select-package' && (
                <motion.div
                  key="select-package"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <GlassCard className="p-4">
                    {/* Back button */}
                    <button
                      onClick={() => { setPurchaseStep('select-course'); setSelectedCourseId(''); }}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-sky-500 transition-colors mb-4"
                    >
                      <ChevronRight className="w-3 h-3 rotate-180" />
                      Back to courses
                    </button>

                    {/* Selected course name */}
                    {selectedCourseId && (
                      <div className="flex items-center gap-2 mb-4 p-2.5 rounded-xl bg-sky-50/50 dark:bg-sky-900/20 border border-sky-200/50 dark:border-sky-700/30">
                        <BookOpen className="w-4 h-4 text-sky-500 flex-shrink-0" />
                        <span className="text-sm font-medium text-foreground truncate">
                          {courses.find((c) => c.id === selectedCourseId)?.title || `Course: ${selectedCourseId}`}
                        </span>
                      </div>
                    )}

                    {isLoadingPackagesForCourse ? (
                      <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span className="text-sm">Loading packages...</span>
                      </div>
                    ) : coursePackages.length === 0 ? (
                      <div className="text-center py-8">
                        <Package className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">No packages available for this course yet.</p>
                        <button
                          onClick={() => { setPurchaseStep('select-course'); setSelectedCourseId(''); }}
                          className="mt-3 text-sm text-sky-500 hover:text-sky-600 font-medium"
                        >
                          Choose a different course
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {coursePackages.map((pkg, i) => {
                          const typeInfo = getPackageTypeLabel(pkg.package_type);
                          const TypeIcon = typeInfo.icon;
                          const isSelected = selectedPackage?.id === pkg.id;

                          return (
                            <motion.button
                              key={pkg.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.08 }}
                              onClick={() => handleSelectPackage(pkg)}
                              className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                                isSelected
                                  ? 'border-sky-500 bg-sky-50/50 dark:bg-sky-900/20 shadow-lg shadow-sky-500/10'
                                  : 'border-white/30 dark:border-white/10 bg-white/30 dark:bg-slate-800/30 hover:border-sky-300 dark:hover:border-sky-700/50 hover:bg-sky-50/30 dark:hover:bg-sky-900/10'
                              }`}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  {/* Package type badge */}
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${typeInfo.bgColor} ${typeInfo.color}`}>
                                      <TypeIcon className="w-3.5 h-3.5" />
                                      {typeInfo.label}
                                    </span>
                                    {pkg.package_type === 'friend' && (
                                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400">
                                        Best Value
                                      </span>
                                    )}
                                  </div>

                                  {/* Description */}
                                  <p className="text-sm text-muted-foreground">
                                    {typeInfo.description} &middot; {pkg.duration_months} months access
                                  </p>

                                  {/* Max users */}
                                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                      <Users className="w-3 h-3" />
                                      Up to {pkg.max_users} user{pkg.max_users > 1 ? 's' : ''}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      {pkg.duration_months} months
                                    </span>
                                  </div>
                                </div>

                                {/* Price */}
                                <div className="text-right ml-4 flex-shrink-0">
                                  <p className="text-2xl font-extrabold text-foreground">&#2547;{pkg.price}</p>
                                  <p className="text-[10px] text-muted-foreground">per package</p>
                                </div>
                              </div>

                              {isSelected && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  className="mt-3 pt-3 border-t border-sky-200/50 dark:border-sky-700/30"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm font-semibold text-sky-600 dark:text-sky-400">Selected</span>
                                    <span className="flex items-center gap-1 text-sm text-sky-600 dark:text-sky-400 font-medium">
                                      Continue to payment
                                      <ArrowRight className="w-4 h-4" />
                                    </span>
                                  </div>
                                </motion.div>
                              )}
                            </motion.button>
                          );
                        })}
                      </div>
                    )}
                  </GlassCard>
                </motion.div>
              )}

              {/* ===== STEP 3: PAYMENT ===== */}
              {purchaseStep === 'payment' && selectedPackage && (
                <motion.div
                  key="payment"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  {/* Order Summary */}
                  <GlassCard className="p-4 mb-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-bold text-foreground">Order Summary</h3>
                      <button
                        onClick={() => { setPurchaseStep('select-package'); setSelectedPackage(null); }}
                        className="text-xs text-muted-foreground hover:text-sky-500 transition-colors"
                      >
                        Change package
                      </button>
                    </div>

                    <div className="flex items-center gap-3 p-3 rounded-xl bg-sky-50/50 dark:bg-sky-900/20">
                      {(() => {
                        const typeInfo = getPackageTypeLabel(selectedPackage.package_type);
                        const TypeIcon = typeInfo.icon;
                        return (
                          <div className={`w-10 h-10 rounded-lg ${typeInfo.bgColor} flex items-center justify-center flex-shrink-0`}>
                            <TypeIcon className={`w-5 h-5 ${typeInfo.color}`} />
                          </div>
                        );
                      })()}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground">
                          {getPackageTypeLabel(selectedPackage.package_type).label} Package
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {selectedPackage.duration_months} months &middot; Up to {selectedPackage.max_users} user{selectedPackage.max_users > 1 ? 's' : ''}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        {coupon.valid && coupon.coupon ? (
                          <>
                            <p className="text-xs text-muted-foreground line-through">&#2547;{selectedPackage.price}</p>
                            <p className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400">&#2547;{getDiscountedPrice()}</p>
                          </>
                        ) : (
                          <p className="text-lg font-extrabold text-foreground">&#2547;{selectedPackage.price}</p>
                        )}
                      </div>
                    </div>
                  </GlassCard>

                  {/* Coupon Code */}
                  <GlassCard className="p-4 mb-4">
                    <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                      <Tag className="w-4 h-4 text-sky-500" />
                      Have a Coupon Code?
                    </h3>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Enter coupon code"
                        value={coupon.code}
                        onChange={(e) => setCoupon((prev) => ({
                          ...prev,
                          code: e.target.value.toUpperCase(),
                          valid: null,
                          error: null,
                        }))}
                        className="flex-1 px-3 py-2.5 rounded-xl bg-white/50 dark:bg-slate-800/50 border border-white/30 dark:border-white/10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/30 transition-all uppercase tracking-wider font-mono"
                      />
                      <GradientButton
                        size="sm"
                        onClick={handleValidateCoupon}
                        disabled={!coupon.code.trim() || coupon.isValidating}
                        loading={coupon.isValidating}
                      >
                        Apply
                      </GradientButton>
                    </div>
                    {coupon.valid === true && coupon.coupon && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-2 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>
                          Coupon applied! You save &#2547;{(selectedPackage.price - getDiscountedPrice()).toFixed(0)}
                          {coupon.coupon.discount_type === 'percentage' && ` (${coupon.coupon.discount_value}% off)`}
                        </span>
                      </motion.div>
                    )}
                    {coupon.valid === false && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-2 flex items-center gap-1.5 text-xs text-red-500"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>{coupon.error || 'Invalid coupon code'}</span>
                      </motion.div>
                    )}
                  </GlassCard>

                  {/* Payment Instructions */}
                  {paymentConfigs.length > 0 && (
                    <GlassCard className="p-4 mb-4">
                      <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                        <Info className="w-4 h-4 text-sky-500" />
                        Payment Instructions
                      </h3>
                      <div className="space-y-3">
                        {paymentConfigs.map((config) => (
                          <div
                            key={config.id}
                            className="p-3 rounded-xl bg-white/30 dark:bg-slate-800/30 border border-white/20 dark:border-white/5"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                                <Wallet className="w-4 h-4 text-sky-500" />
                                {config.gateway}
                              </span>
                              {config.sandbox_mode === 1 && (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                                  Sandbox Mode
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground whitespace-pre-line leading-relaxed">
                              {config.instructions}
                            </div>
                            {/* Copyable account number detection - simple approach */}
                            {config.instructions && (
                              <button
                                onClick={() => handleCopyToClipboard(config.instructions)}
                                className="mt-2 flex items-center gap-1 text-[10px] text-sky-500 hover:text-sky-600 transition-colors"
                              >
                                <Copy className="w-3 h-3" />
                                Copy payment details
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </GlassCard>
                  )}

                  {/* Payment Form */}
                  <GlassCard className="p-4">
                    <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-sky-500" />
                      Submit Payment Proof
                    </h3>

                    <div className="space-y-4">
                      {/* Transaction ID */}
                      <div>
                        <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                          <Hash className="w-3 h-3 inline mr-1" />
                          Transaction ID <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. TXN123456789"
                          value={trxId}
                          onChange={(e) => setTrxId(e.target.value.toUpperCase())}
                          className="w-full px-3 py-2.5 rounded-xl bg-white/50 dark:bg-slate-800/50 border border-white/30 dark:border-white/10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/30 transition-all uppercase tracking-wider font-mono"
                        />
                      </div>

                      {/* Phone Number */}
                      <div>
                        <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
                          <Phone className="w-3 h-3 inline mr-1" />
                          Phone Number (bKash/Nagad)
                        </label>
                        <input
                          type="tel"
                          placeholder="e.g. 01XXXXXXXXX"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-xl bg-white/50 dark:bg-slate-800/50 border border-white/30 dark:border-white/10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/30 transition-all"
                        />
                      </div>

                      {/* Total */}
                      <div className="p-3 rounded-xl bg-sky-50/50 dark:bg-sky-900/20 border border-sky-200/50 dark:border-sky-700/30">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-foreground">Total Amount</span>
                          <div className="text-right">
                            {coupon.valid && coupon.coupon ? (
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground line-through">&#2547;{selectedPackage.price}</span>
                                <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">&#2547;{getDiscountedPrice()}</span>
                              </div>
                            ) : (
                              <span className="text-xl font-extrabold text-foreground">&#2547;{selectedPackage.price}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Error message */}
                      {submitResult && !submitResult.success && (
                        <motion.div
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-start gap-2 p-3 rounded-xl bg-red-50/50 dark:bg-red-900/20 border border-red-200/50 dark:border-red-700/30"
                        >
                          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                          <p className="text-xs text-red-600 dark:text-red-400">{submitResult.message}</p>
                        </motion.div>
                      )}

                      {/* Submit button */}
                      <GradientButton
                        className="w-full"
                        onClick={handleSubmitPayment}
                        disabled={!trxId.trim() || isSubmitting}
                        loading={isSubmitting}
                      >
                        {!trxId.trim() ? 'Enter Transaction ID' : isSubmitting ? 'Submitting...' : 'Submit Payment'}
                      </GradientButton>

                      <p className="text-[10px] text-muted-foreground text-center">
                        Your payment will be verified by an admin. You&apos;ll gain access once approved.
                      </p>
                    </div>
                  </GlassCard>
                </motion.div>
              )}

              {/* ===== STEP 4: SUBMITTED ===== */}
              {purchaseStep === 'submitted' && (
                <motion.div
                  key="submitted"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <GlassCard className="p-6 text-center">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', delay: 0.2 }}
                    >
                      <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="w-8 h-8 text-emerald-500" />
                      </div>
                    </motion.div>

                    <h3 className="text-lg font-extrabold text-foreground mb-2">Payment Submitted!</h3>
                    <p className="text-sm text-muted-foreground mb-1">
                      Your payment proof has been submitted successfully.
                    </p>
                    <p className="text-xs text-muted-foreground mb-6">
                      An admin will verify your payment. You&apos;ll gain access to the course once your payment is approved. This usually takes 1-24 hours.
                    </p>

                    <div className="p-3 rounded-xl bg-amber-50/50 dark:bg-amber-900/20 border border-amber-200/50 dark:border-amber-700/30 mb-6">
                      <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        <span>Your package status will show as <strong>Pending</strong> until verified.</span>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                      <GradientButton
                        className="flex-1"
                        onClick={handleResetFlow}
                      >
                        Purchase Another Package
                      </GradientButton>
                      <GradientButton
                        variant="success"
                        className="flex-1"
                        onClick={() => navigate('my-courses')}
                      >
                        View My Courses
                      </GradientButton>
                    </div>
                  </GlassCard>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Reset flow button (when in step 2/3) */}
            {purchaseStep !== 'select-course' && purchaseStep !== 'submitted' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-4 text-center"
              >
                <button
                  onClick={handleResetFlow}
                  className="text-xs text-muted-foreground hover:text-sky-500 transition-colors"
                >
                  Start over with a different course
                </button>
              </motion.div>
            )}
          </motion.div>
        </div>

        {/* ===== FAQ SECTION ===== */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="mt-6"
        >
          <GlassCard className="p-6">
            <h3 className="text-base font-bold text-foreground mb-4">Frequently Asked Questions</h3>
            <div className="space-y-4">
              {[
                { q: 'What is a Friend Pack?', a: 'A Friend Pack allows 2 students to share access to a course at a discounted price. Both users get full access to all course content.' },
                { q: 'How long does package access last?', a: 'Each package provides 6 months (1 semester) of access from the date of activation.' },
                { q: 'How do I pay?', a: 'Send payment via bKash/Nagad to the number shown in the payment instructions, then enter your Transaction ID and submit. An admin will verify your payment.' },
                { q: 'How long does payment verification take?', a: 'Payment verification usually takes 1-24 hours. Your package will show as "Pending" until an admin approves it.' },
                { q: 'Can I use a coupon code?', a: 'Yes! Enter your coupon code before submitting payment to get a discount on your package price.' },
                { q: 'What happens after my package expires?', a: 'You will lose access to the course content. You can purchase a new package to regain access.' },
              ].map((faq, i) => (
                <motion.div
                  key={i}
                  className="border-b border-white/20 dark:border-white/5 pb-3 last:border-b-0"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 + i * 0.05 }}
                >
                  <h4 className="text-sm font-bold text-foreground">{faq.q}</h4>
                  <p className="text-xs text-muted-foreground mt-1">{faq.a}</p>
                </motion.div>
              ))}
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </AnimatedPage>
  );
}
