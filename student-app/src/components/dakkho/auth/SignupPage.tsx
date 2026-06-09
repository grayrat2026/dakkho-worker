'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, User, School, Cpu, ArrowLeft, ArrowRight, Check, ChevronsUpDown, Info, ShieldCheck } from 'lucide-react';
import { useAuthStore, useNavigationStore } from '@/lib/store';
import { GlassCard } from '../shared/GlassCard';
import { GradientButton } from '../shared/GradientButton';
import { PasswordStrengthIndicator, getPasswordRequirements } from './PasswordStrengthIndicator';
import { OTPInput } from './OTPInput';
import { instituteApi, technologyApi, type Institute, type Technology } from '@/lib/api-client';
import { OTP_RESEND_COOLDOWN } from '@/lib/constants';
import Image from 'next/image';

const TOTAL_STEPS = 4;

const STEP_MESSAGES = [
  "Let's get you started!",
  'Secure your account',
  'Tell us about your studies',
  'Almost there!',
];

const TECHNOLOGY_DESCRIPTIONS: Record<string, string> = {
  'Computer Science & Technology (CSE)': 'Programming, software development, web & mobile apps, databases, and algorithms',
  'Electronics & Telecommunication Engineering (ETE)': 'Digital electronics, microcontrollers, communication systems, and signal processing',
  'Electrical Engineering (EEE)': 'Power systems, circuit design, electrical machines, and renewable energy',
  'Mechanical Engineering (ME)': 'Thermodynamics, manufacturing, fluid mechanics, and machine design',
  'Civil Engineering (CE)': 'Structural design, construction, surveying, and infrastructure development',
  'Architecture & Interior Design': 'Building design, CAD modeling, space planning, and sustainable architecture',
  'Textile Engineering': 'Fabric technology, dyeing, manufacturing processes, and quality control',
  'Chemical Engineering': 'Chemical processes, material science, and industrial chemistry',
  'Automobile Engineering': 'Vehicle design, engine systems, automotive technology, and maintenance',
  'Refrigeration & Air Conditioning': 'HVAC systems, thermodynamics, and climate control technology',
  'Glass & Ceramic Engineering': 'Material science, glass manufacturing, and ceramic technology',
  'Printing Engineering': 'Print technology, graphic arts, and digital publishing',
  'Surveying Engineering': 'Land surveying, mapping, GIS, and geospatial technology',
  'Mechatronics Engineering': 'Robotics, automation, control systems, and smart manufacturing',
  'Mining Engineering': 'Mineral extraction, mine design, and geological engineering',
  'Metallurgical Engineering': 'Metal processing, material testing, and alloy development',
  'Power Engineering': 'Power generation, distribution, and electrical grid management',
  'Instrumentation & Process Control': 'Sensors, control systems, and industrial automation',
  'Food Engineering': 'Food processing, preservation, quality assurance, and nutrition technology',
  'Leather Engineering': 'Leather processing, tanning technology, and footwear manufacturing',
};

// Success confetti particles
function ConfettiParticles() {
  const particles = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    x: Math.random() * 300 - 150,
    y: Math.random() * 300 - 150,
    rotation: Math.random() * 360,
    scale: Math.random() * 0.5 + 0.5,
    color: ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'][Math.floor(Math.random() * 6)],
    delay: Math.random() * 0.5,
  }));

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute left-1/2 top-1/2 w-2 h-2 rounded-sm"
          style={{ backgroundColor: p.color }}
          initial={{ x: 0, y: 0, scale: 0, rotate: 0, opacity: 1 }}
          animate={{
            x: p.x,
            y: p.y,
            scale: p.scale,
            rotate: p.rotation,
            opacity: 0,
          }}
          transition={{
            duration: 1.5,
            delay: p.delay,
            ease: [0.4, 0, 0.2, 1],
          }}
        />
      ))}
    </div>
  );
}

export function SignupPage() {
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = backward
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    institute: '',
    customInstitute: '',
    technology: '',
    instituteId: undefined as number | undefined,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [otpError, setOtpError] = useState('');
  const [instituteSearch, setInstituteSearch] = useState('');
  const [showInstituteDropdown, setShowInstituteDropdown] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [hoveredTech, setHoveredTech] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { signup, isLoading, verifyOTP, resendOTP } = useAuthStore();
  const navigate = useNavigationStore((s) => s.navigate);
  const [apiInstitutes, setApiInstitutes] = useState<Institute[]>([]);
  const [apiTechnologies, setApiTechnologies] = useState<Technology[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Fetch institutes and technologies from Worker API
  useEffect(() => {
    async function fetchData() {
      try {
        const [instRes, techRes] = await Promise.all([
          instituteApi.list({ limit: 100 }),
          technologyApi.list(),
        ]);
        setApiInstitutes(instRes.institutes);
        setApiTechnologies(techRes.technologies);
      } catch (err) {
        console.error('Failed to fetch institutes/technologies:', err);
      } finally {
        setDataLoading(false);
      }
    }
    fetchData();
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(instituteSearch);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [instituteSearch]);

  // Cooldown timer
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  // Filter institutes from API
  const filteredInstitutes = apiInstitutes.filter((inst) =>
    inst.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
    (inst.name_bn && inst.name_bn.includes(debouncedSearch))
  );

  const validateStep = (s: number): boolean => {
    const newErrors: Record<string, string> = {};
    if (s === 1) {
      if (!formData.fullName.trim()) newErrors.fullName = 'Name is required';
      if (!formData.email.trim()) newErrors.email = 'Email is required';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Invalid email';
    }
    if (s === 2) {
      if (!formData.password) newErrors.password = 'Password is required';
      else if (formData.password.length < 8) newErrors.password = 'Min 8 characters';
      const reqs = getPasswordRequirements(formData.password);
      if (!reqs.every((r) => r.met)) newErrors.password = 'Password does not meet all requirements';
      if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    }
    if (s === 3) {
      const inst = formData.institute === 'custom' ? formData.customInstitute : formData.institute;
      if (!inst) newErrors.institute = 'Select your institute';
      if (!formData.technology) newErrors.technology = 'Select your technology';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(step)) {
      setDirection(1);
      if (step === 3) {
        // Step 3 validated — now call signup API which sends OTP
        setCooldown(OTP_RESEND_COOLDOWN);
        handleSignup();
        return;
      }
      setStep(step + 1);
    }
  };

  const handleSignup = async () => {
    try {
      await signup({
        fullName: formData.fullName,
        email: formData.email,
        password: formData.password,
        instituteId: formData.instituteId,
        technology: formData.technology,
      });
      // Signup succeeded — OTP was sent, move to step 4
      setStep(4);
    } catch (err: any) {
      setErrors({ ...errors, institute: err.message || 'Signup failed' });
    }
  };

  const prevStep = () => {
    if (step > 1) {
      setDirection(-1);
      setStep(step - 1);
    }
  };

  const handleOTPComplete = async (otp: string) => {
    const result = await verifyOTP(formData.email, otp);
    if (result) {
      setOtpVerified(true);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 2000);
    } else {
      setOtpError('Invalid OTP. Please try again.');
    }
  };

  const handleResendOTP = async () => {
    setCooldown(OTP_RESEND_COOLDOWN);
    setOtpError('');
    await resendOTP(formData.email);
  };

  const stepLabels = ['Account', 'Security', 'Institute', 'Verify'];

  const slideVariants = {
    enter: (dir: number) => ({ opacity: 0, x: dir > 0 ? 80 : -80 }),
    center: { opacity: 1, x: 0 },
    exit: (dir: number) => ({ opacity: 0, x: dir > 0 ? -80 : 80 }),
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-sky-950 p-4 relative overflow-hidden">
      {/* Decorative blobs */}
      <motion.div
        className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-sky-200/20 dark:bg-sky-800/10 blur-3xl"
        animate={{ y: [0, -20, 0], x: [0, -15, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-blue-200/20 dark:bg-blue-800/10 blur-3xl"
        animate={{ y: [0, 15, 0], x: [0, 10, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md relative z-10"
      >
        <GlassCard className="p-6 sm:p-8">
          {/* Logo */}
          <motion.div
            className="flex flex-col items-center mb-4"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
          >
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center mb-2 shadow-lg shadow-sky-500/30">
              <Image src="/logo.png" alt="DAKKHO" width={28} height={28} className="rounded-xl" />
            </div>
            <h1 className="text-xl font-extrabold gradient-text">Create Account</h1>
          </motion.div>

          {/* Step welcome message */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`message-${step}`}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.3 }}
              className="text-center mb-4"
            >
              <p className="text-sm font-semibold text-sky-500">{STEP_MESSAGES[step - 1]}</p>
            </motion.div>
          </AnimatePresence>

          {/* Step indicator */}
          <div className="flex items-center justify-between mb-6 px-2 relative">
            {stepLabels.map((label, i) => (
              <div key={i} className="flex flex-col items-center relative z-10">
                <motion.div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors duration-300 ${
                    i + 1 < step
                      ? 'bg-emerald-500 text-white'
                      : i + 1 === step
                      ? 'bg-gradient-to-r from-sky-500 to-blue-600 text-white'
                      : 'bg-muted text-muted-foreground'
                  }`}
                  animate={{ scale: i + 1 === step ? 1.1 : 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                >
                  {i + 1 < step ? <Check className="w-4 h-4" /> : i + 1}
                </motion.div>
                <span className="text-[10px] font-semibold text-muted-foreground mt-1">{label}</span>
              </div>
            ))}
            {/* Progress bar */}
            <div className="absolute left-8 right-8 top-4 h-0.5 bg-muted -z-0">
              <motion.div
                className="h-full bg-gradient-to-r from-sky-500 to-blue-600"
                animate={{ width: `${((step - 1) / (TOTAL_STEPS - 1)) * 100}%` }}
                transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
              />
            </div>
          </div>

          {/* Step content */}
          <AnimatePresence mode="wait" custom={direction}>
            {/* Step 1: Account */}
            {step === 1 && (
              <motion.div
                key="step1"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-semibold mb-1.5">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="text"
                      value={formData.fullName}
                      onChange={(e) => { setFormData({ ...formData, fullName: e.target.value }); setErrors({ ...errors, fullName: '' }); }}
                      placeholder="Enter your full name"
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-muted/30 border-2 border-transparent focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 outline-none text-sm transition-all"
                    />
                  </div>
                  <AnimatePresence>
                    {errors.fullName && (
                      <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-xs text-red-500 mt-1">{errors.fullName}</motion.p>
                    )}
                  </AnimatePresence>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => { setFormData({ ...formData, email: e.target.value }); setErrors({ ...errors, email: '' }); }}
                      placeholder="your@email.com"
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-muted/30 border-2 border-transparent focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 outline-none text-sm transition-all"
                    />
                  </div>
                  <AnimatePresence>
                    {errors.email && (
                      <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-xs text-red-500 mt-1">{errors.email}</motion.p>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}

            {/* Step 2: Security */}
            {step === 2 && (
              <motion.div
                key="step2"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-semibold mb-1.5">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => { setFormData({ ...formData, password: e.target.value }); setErrors({ ...errors, password: '' }); }}
                      placeholder="Create a strong password"
                      className="w-full pl-10 pr-10 py-3 rounded-xl bg-muted/30 border-2 border-transparent focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 outline-none text-sm transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
                    </button>
                  </div>
                  <PasswordStrengthIndicator password={formData.password} />
                  <AnimatePresence>
                    {errors.password && (
                      <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-xs text-red-500 mt-1">{errors.password}</motion.p>
                    )}
                  </AnimatePresence>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={formData.confirmPassword}
                      onChange={(e) => { setFormData({ ...formData, confirmPassword: e.target.value }); setErrors({ ...errors, confirmPassword: '' }); }}
                      placeholder="Confirm your password"
                      className="w-full pl-10 pr-10 py-3 rounded-xl bg-muted/30 border-2 border-transparent focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 outline-none text-sm transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
                    </button>
                  </div>
                  <AnimatePresence>
                    {errors.confirmPassword && (
                      <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-xs text-red-500 mt-1">{errors.confirmPassword}</motion.p>
                    )}
                  </AnimatePresence>
                  {/* Password match indicator */}
                  <AnimatePresence>
                    {formData.confirmPassword && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-1.5"
                      >
                        {formData.password === formData.confirmPassword ? (
                          <p className="text-xs text-emerald-500 font-medium">Passwords match</p>
                        ) : (
                          <p className="text-xs text-red-500 font-medium">Passwords do not match</p>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}

            {/* Step 3: Institute */}
            {step === 3 && (
              <motion.div
                key="step3"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="space-y-4"
              >
                {/* Institute dropdown */}
                <div className="relative">
                  <label className="block text-sm font-semibold mb-1.5">Polytechnic Institute</label>
                  <div
                    className="w-full px-4 py-3 rounded-xl bg-muted/30 border-2 border-transparent focus-within:border-sky-400 focus-within:ring-2 focus-within:ring-sky-400/20 cursor-pointer flex items-center justify-between"
                    onClick={() => setShowInstituteDropdown(!showInstituteDropdown)}
                  >
                    <div className="flex items-center gap-2">
                      <School className="w-4 h-4 text-muted-foreground" />
                      <span className={`text-sm ${formData.institute ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {formData.institute === 'custom' ? 'Other Institute...' : (formData.institute || 'Select your institute')}
                      </span>
                    </div>
                    <ChevronsUpDown className="w-4 h-4 text-muted-foreground" />
                  </div>

                  <AnimatePresence>
                    {showInstituteDropdown && (
                      <motion.div
                        className="absolute top-full left-0 right-0 mt-1 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-white/50 dark:border-white/10 rounded-xl shadow-xl z-50 max-h-60 overflow-hidden"
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                      >
                        <div className="p-2">
                          <input
                            type="text"
                            value={instituteSearch}
                            onChange={(e) => setInstituteSearch(e.target.value)}
                            placeholder="Search institute..."
                            className="w-full px-3 py-2 border border-white/20 dark:border-white/5 bg-muted/30 rounded-lg text-sm outline-none focus:border-sky-400"
                            autoFocus
                          />
                        </div>
                        <div className="overflow-y-auto max-h-40 px-1">
                          {dataLoading ? (
                            <p className="text-xs text-muted-foreground text-center py-2">Loading institutes...</p>
                          ) : filteredInstitutes.length > 0 ? (
                            filteredInstitutes.map((inst) => (
                              <button
                                key={inst.id}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-sky-50 dark:hover:bg-sky-900/20 transition-colors rounded-lg"
                                onClick={() => {
                                  setFormData({ ...formData, institute: String(inst.id), instituteId: inst.id });
                                  setShowInstituteDropdown(false);
                                  setInstituteSearch('');
                                  setErrors({ ...errors, institute: '' });
                                }}
                              >
                                <span>{inst.name}</span>
                                {inst.name_bn && <span className="text-muted-foreground text-xs ml-2">{inst.name_bn}</span>}
                                {inst.division && <span className="text-xs ml-2 px-1.5 py-0.5 bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400 rounded">{inst.division}</span>}
                              </button>
                            ))
                          ) : (
                            <p className="text-xs text-muted-foreground text-center py-2">No institutes found</p>
                          )}
                          <button
                            className="w-full text-left px-3 py-2 text-sm text-sky-500 font-semibold hover:bg-sky-50 dark:hover:bg-sky-900/20 transition-colors rounded-lg"
                            onClick={() => {
                              setFormData({ ...formData, institute: 'custom' });
                              setShowInstituteDropdown(false);
                              setInstituteSearch('');
                            }}
                          >
                            Can&apos;t find your institute? Add it
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  {formData.institute === 'custom' && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-2">
                      <input
                        type="text"
                        value={formData.customInstitute}
                        onChange={(e) => { setFormData({ ...formData, customInstitute: e.target.value }); setErrors({ ...errors, institute: '' }); }}
                        placeholder="Enter your institute name"
                        className="w-full px-4 py-3 rounded-xl bg-muted/30 border-2 border-transparent focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 outline-none text-sm transition-all"
                      />
                    </motion.div>
                  )}
                  <AnimatePresence>
                    {errors.institute && (
                      <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-xs text-red-500 mt-1">{errors.institute}</motion.p>
                    )}
                  </AnimatePresence>
                </div>

                {/* Technology */}
                <div>
                  <label className="block text-sm font-semibold mb-1.5">Technology</label>
                  <div className="relative">
                    <Cpu className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <select
                      value={formData.technology}
                      onChange={(e) => { setFormData({ ...formData, technology: e.target.value }); setErrors({ ...errors, technology: '' }); }}
                      onMouseEnter={() => setHoveredTech(formData.technology)}
                      onMouseLeave={() => setHoveredTech(null)}
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-muted/30 border-2 border-transparent focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 outline-none text-sm appearance-none transition-all"
                    >
                      <option value="">Select your technology</option>
                      {apiTechnologies.map((tech) => (
                        <option key={tech.id} value={tech.short_code}>{tech.name} ({tech.short_code})</option>
                      ))}
                    </select>
                  </div>
                  {/* Technology description tooltip */}
                  <AnimatePresence>
                    {formData.technology && (() => {
                      const tech = apiTechnologies.find(t => t.short_code === formData.technology);
                      return tech?.description ? (
                        <motion.div
                          initial={{ opacity: 0, y: -5, height: 0 }}
                          animate={{ opacity: 1, y: 0, height: 'auto' }}
                          exit={{ opacity: 0, y: -5, height: 0 }}
                          className="mt-2"
                        >
                          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800/50">
                            <Info className="w-3.5 h-3.5 text-sky-500 mt-0.5 flex-shrink-0" />
                            <p className="text-xs text-sky-700 dark:text-sky-300">{tech.description}</p>
                          </div>
                        </motion.div>
                      ) : null;
                    })()}
                  </AnimatePresence>
                  <AnimatePresence>
                    {errors.technology && (
                      <motion.p initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-xs text-red-500 mt-1">{errors.technology}</motion.p>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}

            {/* Step 4: OTP Verification */}
            {step === 4 && (
              <motion.div
                key="step4"
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="space-y-5 text-center relative"
              >
                {showConfetti && <ConfettiParticles />}

                <div>
                  <h3 className="text-lg font-bold mb-1">Verify Your Email</h3>
                  <p className="text-sm text-muted-foreground">
                    We sent a 6-digit code to <span className="font-semibold text-foreground">{formData.email}</span>
                  </p>
                </div>

                {otpVerified ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="flex flex-col items-center"
                  >
                    <motion.div
                      className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-3"
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 0.5 }}
                    >
                      <Check className="w-8 h-8 text-emerald-500" />
                    </motion.div>
                    <p className="text-sm font-semibold text-emerald-600">Verified! Redirecting...</p>
                  </motion.div>
                ) : (
                  <>
                    <OTPInput
                      onComplete={handleOTPComplete}
                      onResend={handleResendOTP}
                      cooldown={cooldown}
                      error={otpError}
                    />

                    {/* Terms & Conditions */}
                    <motion.div
                      className="pt-3 border-t border-muted-foreground/10"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 }}
                    >
                      <label className="flex items-start gap-2.5 cursor-pointer group">
                        <div className="relative mt-0.5">
                          <input
                            type="checkbox"
                            checked={agreedToTerms}
                            onChange={(e) => setAgreedToTerms(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-4 h-4 rounded border-2 border-muted-foreground/40 peer-checked:border-sky-500 peer-checked:bg-sky-500 transition-all duration-200 flex items-center justify-center">
                            <AnimatePresence>
                              {agreedToTerms && (
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  exit={{ scale: 0 }}
                                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                                >
                                  <Check className="w-3 h-3 text-white" strokeWidth={3} />
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors text-left">
                          I agree to the{' '}
                          <span className="text-sky-500 font-semibold">Terms of Service</span>{' '}
                          and{' '}
                          <span className="text-sky-500 font-semibold">Privacy Policy</span>
                        </span>
                      </label>
                    </motion.div>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation buttons */}
          <div className="flex items-center justify-between mt-6">
            {step > 1 ? (
              <motion.button
                onClick={prevStep}
                className="flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
                whileHover={{ x: -3 }}
                whileTap={{ scale: 0.95 }}
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </motion.button>
            ) : (
              <div />
            )}

            {step < TOTAL_STEPS && (
              <GradientButton onClick={nextStep} size="md">
                Next
                <ArrowRight className="w-4 h-4" />
              </GradientButton>
            )}

            {step === TOTAL_STEPS && !otpVerified && !agreedToTerms && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Agree to continue</span>
              </div>
            )}
          </div>

          {/* Login link */}
          <motion.div
            className="text-center mt-5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <p className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <button
                onClick={() => navigate('login')}
                className="font-bold text-sky-500 hover:text-sky-600 transition-colors"
              >
                Sign In
              </button>
            </p>
          </motion.div>
        </GlassCard>
      </motion.div>
    </div>
  );
}
