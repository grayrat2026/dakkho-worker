'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Camera, Mail, Phone, MapPin, Building, BookOpen,
  Save, X, CheckCircle, AlertCircle, ChevronLeft, Eye, EyeOff,
  Upload, Shield, GraduationCap, Loader2,
} from 'lucide-react';
import { useNavigationStore, useAuthStore } from '@/lib/store';
import { instituteApi, technologyApi, studentProfileApi, type Institute, type Technology } from '@/lib/api-client';
import { GlassCard } from '../shared/GlassCard';
import { AnimatedPage } from '../shared/AnimatedPage';
import { GradientButton } from '../shared/GradientButton';

export function EditProfilePage() {
  const { goBack, navigate } = useNavigationStore();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const [fullName, setFullName] = useState(user?.fullName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState('');
  const [institute, setInstitute] = useState(user?.institute || '');
  const [technology, setTechnology] = useState(user?.technology || '');
  const [apiInstitutes, setApiInstitutes] = useState<Institute[]>([]);
  const [apiTechnologies, setApiTechnologies] = useState<Technology[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [bio, setBio] = useState('');
  const [semester, setSemester] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Keep a ref to user so the mount effect doesn't need it as a dependency
  const userRef = useRef(user);
  userRef.current = user;

  // Fetch institutes, technologies, and profile data from Worker API
  useEffect(() => {
    async function fetchData() {
      try {
        const [instRes, techRes, profileRes] = await Promise.all([
          instituteApi.list({ limit: 100 }),
          technologyApi.list(),
          studentProfileApi.stats().catch(() => null),
        ]);
        setApiInstitutes(instRes.institutes);
        setApiTechnologies(techRes.technologies);

        // Pre-fill profile fields from API
        if (profileRes?.profile) {
          if (profileRes.profile.phone) setPhone(profileRes.profile.phone);
          if (profileRes.profile.bio) setBio(profileRes.profile.bio);
          if (profileRes.profile.semester) setSemester(profileRes.profile.semester);
          // Update avatarUrl in store if available
          const currentUser = userRef.current;
          if (profileRes.profile.avatarUrl && currentUser && !currentUser.avatarUrl) {
            setUser({ ...currentUser, avatarUrl: profileRes.profile.avatarUrl });
          }
        }
      } catch (err) {
        console.error('Failed to fetch institutes/technologies:', err);
      } finally {
        setDataLoading(false);
      }
    }
    fetchData();
  }, [setUser]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!fullName.trim()) newErrors.fullName = 'Full name is required';
    if (!email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Invalid email format';
    if (!institute.trim()) newErrors.institute = 'Institute is required';
    if (!technology.trim()) newErrors.technology = 'Technology is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      // Find the instituteId from the selected institute name
      const selectedInstitute = apiInstitutes.find((inst) => inst.name === institute);
      const instituteId = selectedInstitute ? String(selectedInstitute.id) : undefined;

      await studentProfileApi.update({
        name: fullName,
        phone,
        bio,
        semester,
        technology,
        instituteId,
      });

      if (user) {
        setUser({ ...user, fullName, email, institute, technology });
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      console.error('Failed to save profile:', err);
      setSaveError(err?.message || 'Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const result = await studentProfileApi.uploadAvatar(file);
      // Update the user in the store with new avatarUrl
      if (user) {
        setUser({ ...user, avatarUrl: result.avatarUrl });
      }
    } catch (err: any) {
      console.error('Avatar upload failed:', err);
      setSaveError(err?.message || 'Failed to upload avatar');
    } finally {
      setUploading(false);
      // Reset the file input so the same file can be selected again
      if (avatarInputRef.current) {
        avatarInputRef.current.value = '';
      }
    }
  };

  return (
    <AnimatedPage keyProp="edit-profile">
      <div className="pb-20 lg:pb-0">
        {/* Breadcrumb */}
        <motion.div className="flex items-center gap-2 text-sm text-muted-foreground mb-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <button onClick={() => navigate('home')} className="hover:text-sky-500 transition-colors">Home</button>
          <span>/</span>
          <button onClick={() => navigate('profile')} className="hover:text-sky-500 transition-colors">Profile</button>
          <span>/</span>
          <span className="text-foreground font-semibold">Edit Profile</span>
        </motion.div>

        {/* Header with avatar */}
        <GlassCard className="p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="relative">
              <motion.div
                className="w-20 h-20 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center text-white text-3xl font-extrabold shadow-lg overflow-hidden"
                whileHover={{ scale: 1.05 }}
              >
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt={fullName} className="w-full h-full object-cover" />
                ) : (
                  fullName.charAt(0) || 'U'
                )}
              </motion.div>
              <motion.button
                className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-sky-500 flex items-center justify-center text-white shadow-md"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Camera className="w-4 h-4" />
                )}
              </motion.button>
              {/* Hidden file input for avatar upload */}
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </div>
            <div>
              <h1 className="text-lg font-extrabold text-foreground">Edit Profile</h1>
              <p className="text-sm text-muted-foreground">Update your personal information</p>
              {uploading && (
                <motion.div
                  className="flex items-center gap-1 mt-1 text-sky-500 text-xs font-semibold"
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Loader2 className="w-3 h-3 animate-spin" /> Uploading avatar...
                </motion.div>
              )}
              {saved && (
                <motion.div
                  className="flex items-center gap-1 mt-1 text-emerald-500 text-xs font-semibold"
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <CheckCircle className="w-3 h-3" /> Changes saved successfully!
                </motion.div>
              )}
              {saveError && (
                <motion.div
                  className="flex items-center gap-1 mt-1 text-red-500 text-xs font-semibold"
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <AlertCircle className="w-3 h-3" /> {saveError}
                </motion.div>
              )}
            </div>
          </div>
        </GlassCard>

        {/* Form */}
        <GlassCard className="p-6">
          <h2 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-sky-500" />
            Personal Information
          </h2>

          <div className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                Full Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => { setFullName(e.target.value); setErrors({ ...errors, fullName: '' }); }}
                  className={`w-full pl-10 pr-4 py-3 rounded-xl bg-muted/30 border text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/50 ${
                    errors.fullName ? 'border-red-500' : 'border-white/30 dark:border-white/10'
                  }`}
                  placeholder="Enter your full name"
                />
              </div>
              {errors.fullName && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.fullName}</p>}
            </div>

            {/* Email */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                Email <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setErrors({ ...errors, email: '' }); }}
                  className={`w-full pl-10 pr-4 py-3 rounded-xl bg-muted/30 border text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/50 ${
                    errors.email ? 'border-red-500' : 'border-white/30 dark:border-white/10'
                  }`}
                  placeholder="your.email@example.com"
                />
              </div>
              {errors.email && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.email}</p>}
            </div>

            {/* Phone */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-muted/30 border border-white/30 dark:border-white/10 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                  placeholder="+880 1XXX-XXXXXX"
                />
              </div>
            </div>

            {/* Institute */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                Institute <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <select
                  value={institute}
                  onChange={(e) => { setInstitute(e.target.value); setErrors({ ...errors, institute: '' }); }}
                  className={`w-full pl-10 pr-4 py-3 rounded-xl bg-muted/30 border text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/50 appearance-none ${
                    errors.institute ? 'border-red-500' : 'border-white/30 dark:border-white/10'
                  }`}
                >
                  <option value="">Select your institute</option>
                  {dataLoading ? (
                    <option disabled>Loading institutes...</option>
                  ) : (
                    apiInstitutes.map((inst) => (
                      <option key={inst.id} value={inst.name}>{inst.name}</option>
                    ))
                  )}
                </select>
              </div>
              {errors.institute && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.institute}</p>}
            </div>

            {/* Technology */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                Technology <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <select
                  value={technology}
                  onChange={(e) => { setTechnology(e.target.value); setErrors({ ...errors, technology: '' }); }}
                  className={`w-full pl-10 pr-4 py-3 rounded-xl bg-muted/30 border text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/50 appearance-none ${
                    errors.technology ? 'border-red-500' : 'border-white/30 dark:border-white/10'
                  }`}
                >
                  <option value="">Select your technology</option>
                  {dataLoading ? (
                    <option disabled>Loading technologies...</option>
                  ) : (
                    apiTechnologies.map((tech) => (
                      <option key={tech.id} value={tech.short_code}>{tech.name} ({tech.short_code})</option>
                    ))
                  )}
                </select>
              </div>
              {errors.technology && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.technology}</p>}
            </div>

            {/* Semester */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Current Semester</label>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                  <motion.button
                    key={s}
                    className={`py-2 rounded-xl text-sm font-bold ${
                      semester === s.toString()
                        ? 'bg-sky-500 text-white shadow-md'
                        : 'bg-muted/30 text-muted-foreground'
                    }`}
                    onClick={() => setSemester(s.toString())}
                    whileTap={{ scale: 0.95 }}
                  >
                    {s}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Bio */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                placeholder="Tell us about yourself and your learning goals..."
                className="w-full px-4 py-3 rounded-xl bg-muted/30 border border-white/30 dark:border-white/10 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-sky-500/50 resize-none"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/20 dark:border-white/5">
            <motion.button
              className="px-4 py-2.5 rounded-xl bg-muted/30 text-sm font-semibold text-foreground flex items-center gap-2"
              onClick={() => navigate('profile')}
              whileTap={{ scale: 0.95 }}
            >
              <X className="w-4 h-4" /> Cancel
            </motion.button>
            <GradientButton onClick={handleSave} loading={isSaving}>
              <Save className="w-4 h-4" /> Save Changes
            </GradientButton>
          </div>
        </GlassCard>
      </div>
    </AnimatedPage>
  );
}
