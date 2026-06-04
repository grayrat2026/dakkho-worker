import type { AppNotification } from './store';

// ============ INSTITUTES ============
export const POLYTECHNIC_INSTITUTES = [
  'Dhaka Polytechnic Institute',
  'Chittagong Polytechnic Institute',
  'Rajshahi Polytechnic Institute',
  'Khulna Polytechnic Institute',
  'Sylhet Polytechnic Institute',
  'Barishal Polytechnic Institute',
  'Rangpur Polytechnic Institute',
  'Mymensingh Polytechnic Institute',
  'Comilla Polytechnic Institute',
  'Dinajpur Polytechnic Institute',
  'Faridpur Polytechnic Institute',
  'Pabna Polytechnic Institute',
  'Jessore Polytechnic Institute',
  'Bogra Polytechnic Institute',
  'Kushtia Polytechnic Institute',
  'Tangail Polytechnic Institute',
  'Narsingdi Polytechnic Institute',
  'Gazipur Polytechnic Institute',
  'Narayanganj Polytechnic Institute',
  'Cox\'s Bazar Polytechnic Institute',
  'Habiganj Polytechnic Institute',
  'Jamalpur Polytechnic Institute',
  'Sherpur Polytechnic Institute',
  'Netrokona Polytechnic Institute',
  'Kishoreganj Polytechnic Institute',
  'Brahmanbaria Polytechnic Institute',
  'Chandpur Polytechnic Institute',
  'Noakhali Polytechnic Institute',
  'Feni Polytechnic Institute',
  'Lakshmipur Polytechnic Institute',
  'Gopalganj Polytechnic Institute',
  'Madaripur Polytechnic Institute',
  'Shariatpur Polytechnic Institute',
  'Munshiganj Polytechnic Institute',
  'Manikganj Polytechnic Institute',
  'Chapainawabganj Polytechnic Institute',
  'Naogaon Polytechnic Institute',
  'Natore Polytechnic Institute',
  'Sirajganj Polytechnic Institute',
  'Joypurhat Polytechnic Institute',
  'Satkhira Polytechnic Institute',
  'Meherpur Polytechnic Institute',
  'Magura Polytechnic Institute',
  'Jhenaidah Polytechnic Institute',
  'Chuadanga Polytechnic Institute',
  'Bagerhat Polytechnic Institute',
  'Patuakhali Polytechnic Institute',
  'Barguna Polytechnic Institute',
  'Jhalokathi Polytechnic Institute',
  'Pirojpur Polytechnic Institute',
  'Bandarban Polytechnic Institute',
  'Rangamati Polytechnic Institute',
  'Khagrachhari Polytechnic Institute',
  'Sunamganj Polytechnic Institute',
  'Moulvibazar Polytechnic Institute',
  'Kurigram Polytechnic Institute',
  'Lalmonirhat Polytechnic Institute',
  'Nilphamari Polytechnic Institute',
  'Gaibandha Polytechnic Institute',
  'Thakurgaon Polytechnic Institute',
  'Panchagarh Polytechnic Institute',
];

// ============ CATEGORIES ============
export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  color: string;
  courseCount: number;
}

export const CATEGORIES: Category[] = [
  { id: 'cat1', name: 'Web Development', slug: 'web-development', icon: 'Globe', color: '#0ea5e9', courseCount: 12 },
  { id: 'cat2', name: 'Mobile Development', slug: 'mobile-development', icon: 'Smartphone', color: '#8b5cf6', courseCount: 8 },
  { id: 'cat3', name: 'Electronics', slug: 'electronics', icon: 'Cpu', color: '#f59e0b', courseCount: 15 },
  { id: 'cat4', name: 'Electrical', slug: 'electrical', icon: 'Zap', color: '#ef4444', courseCount: 10 },
  { id: 'cat5', name: 'Mechanical', slug: 'mechanical', icon: 'Wrench', color: '#64748b', courseCount: 9 },
  { id: 'cat6', name: 'Civil Engineering', slug: 'civil-engineering', icon: 'Building2', color: '#10b981', courseCount: 11 },
  { id: 'cat7', name: 'Architecture', slug: 'architecture', icon: 'Ruler', color: '#ec4899', courseCount: 6 },
  { id: 'cat8', name: 'Programming', slug: 'programming', icon: 'Code', color: '#2563eb', courseCount: 14 },
  { id: 'cat9', name: 'Data Science', slug: 'data-science', icon: 'BarChart3', color: '#14b8a6', courseCount: 7 },
  { id: 'cat10', name: 'Networking', slug: 'networking', icon: 'Wifi', color: '#f97316', courseCount: 5 },
  { id: 'cat11', name: 'Graphics Design', slug: 'graphics-design', icon: 'Palette', color: '#a855f7', courseCount: 4 },
  { id: 'cat12', name: 'Textile', slug: 'textile', icon: 'Scissors', color: '#06b6d4', courseCount: 3 },
];

// ============ INSTRUCTORS ============
export interface Instructor {
  id: string;
  name: string;
  bio: string;
  avatarUrl: string;
  coverUrl: string;
  specialization: string;
  rating: number;
  totalStudents: number;
  totalCourses: number;
  socialLinks?: { platform: string; url: string }[];
}

export const INSTRUCTORS: Instructor[] = [
  {
    id: 'ins1', name: 'Engr. Karim Uddin', bio: 'Senior Instructor at Dhaka Polytechnic with 15+ years of teaching experience in CSE. Passionate about making programming accessible to all students.', avatarUrl: '', coverUrl: '', specialization: 'Programming & Web Development', rating: 4.8, totalStudents: 3450, totalCourses: 8,
    socialLinks: [{ platform: 'linkedin', url: '#' }, { platform: 'youtube', url: '#' }],
  },
  {
    id: 'ins2', name: 'Fatema Begum', bio: 'Electronics expert and curriculum developer for BTEB. Specializing in digital electronics and microcontroller programming.', avatarUrl: '', coverUrl: '', specialization: 'Electronics & Telecommunication', rating: 4.9, totalStudents: 2890, totalCourses: 6,
    socialLinks: [{ platform: 'linkedin', url: '#' }],
  },
  {
    id: 'ins3', name: 'Rafiqul Islam', bio: 'Mechanical engineer turned educator. Brings real-world industry experience to the classroom with hands-on projects.', avatarUrl: '', coverUrl: '', specialization: 'Mechanical Engineering', rating: 4.7, totalStudents: 1920, totalCourses: 5,
  },
  {
    id: 'ins4', name: 'Nasreen Akter', bio: 'Award-winning architecture instructor. Expert in CAD software and sustainable design principles.', avatarUrl: '', coverUrl: '', specialization: 'Architecture & Design', rating: 4.6, totalStudents: 1540, totalCourses: 4,
  },
  {
    id: 'ins5', name: 'Dr. Shahid Hossain', bio: 'PhD in Electrical Engineering. Specializing in power systems and renewable energy solutions for Bangladesh.', avatarUrl: '', coverUrl: '', specialization: 'Electrical Engineering', rating: 4.9, totalStudents: 4200, totalCourses: 9,
  },
  {
    id: 'ins6', name: 'Taslima Khatun', bio: 'Full-stack developer and tech lead. Building the next generation of web developers in Bangladesh.', avatarUrl: '', coverUrl: '', specialization: 'Web Development', rating: 4.8, totalStudents: 3100, totalCourses: 7,
  },
  {
    id: 'ins7', name: 'Mizanur Rahman', bio: 'Civil engineering veteran with 20+ years in construction management and structural design.', avatarUrl: '', coverUrl: '', specialization: 'Civil Engineering', rating: 4.5, totalStudents: 1750, totalCourses: 4,
  },
  {
    id: 'ins8', name: 'Sharmin Sultana', bio: 'Data scientist and AI researcher. Making machine learning accessible to polytechnic students across Bangladesh.', avatarUrl: '', coverUrl: '', specialization: 'Data Science & AI', rating: 4.7, totalStudents: 2300, totalCourses: 5,
  },
  {
    id: 'ins9', name: 'Jahangir Alam', bio: 'Networking specialist with Cisco and Huawei certifications. Building skilled network engineers for the digital age.', avatarUrl: '', coverUrl: '', specialization: 'Networking & Security', rating: 4.6, totalStudents: 1600, totalCourses: 4,
  },
  {
    id: 'ins10', name: 'Roksana Parvin', bio: 'Textile engineer focusing on modern fabric technology and sustainable manufacturing processes.', avatarUrl: '', coverUrl: '', specialization: 'Textile Engineering', rating: 4.4, totalStudents: 980, totalCourses: 3,
  },
];

// ============ COURSES ============
export interface Course {
  id: string;
  title: string;
  slug: string;
  description: string;
  thumbnailUrl: string;
  categoryId: string;
  instructorId: string;
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  language: string;
  duration: number;
  totalVideos: number;
  rating: number;
  totalReviews: number;
  totalStudents: number;
  isFeatured: boolean;
  tags: string[];
  price: number;
}

export const COURSES: Course[] = [
  { id: 'c1', title: 'Complete Web Development with HTML, CSS & JavaScript', slug: 'complete-web-dev', description: 'Learn web development from scratch. Master HTML5, CSS3, and modern JavaScript to build responsive websites and web applications. Perfect for CSE students starting their programming journey.', thumbnailUrl: '', categoryId: 'cat1', instructorId: 'ins1', level: 'beginner', language: 'Bangla', duration: 2400, totalVideos: 48, rating: 4.8, totalReviews: 234, totalStudents: 1250, isFeatured: true, tags: ['HTML', 'CSS', 'JavaScript'], price: 0 },
  { id: 'c2', title: 'React.js & Next.js - Modern Frontend Development', slug: 'react-nextjs', description: 'Build modern web applications with React.js and Next.js. Learn hooks, state management, SSR, and deployment strategies.', thumbnailUrl: '', categoryId: 'cat1', instructorId: 'ins6', level: 'intermediate', language: 'Bangla', duration: 1800, totalVideos: 36, rating: 4.9, totalReviews: 189, totalStudents: 890, isFeatured: true, tags: ['React', 'Next.js', 'Frontend'], price: 499 },
  { id: 'c3', title: 'Digital Electronics Fundamentals', slug: 'digital-electronics', description: 'Understand digital logic gates, combinational and sequential circuits, flip-flops, counters, and registers. Essential for ETE students.', thumbnailUrl: '', categoryId: 'cat3', instructorId: 'ins2', level: 'beginner', language: 'Bangla', duration: 1200, totalVideos: 24, rating: 4.9, totalReviews: 312, totalStudents: 1580, isFeatured: true, tags: ['Digital', 'Logic', 'Circuits'], price: 0 },
  { id: 'c4', title: 'Microcontroller Programming with Arduino', slug: 'arduino-programming', description: 'Hands-on Arduino programming for polytechnic students. Build real projects including home automation, robotics, and IoT devices.', thumbnailUrl: '', categoryId: 'cat3', instructorId: 'ins2', level: 'intermediate', language: 'Bangla', duration: 1500, totalVideos: 30, rating: 4.7, totalReviews: 167, totalStudents: 720, isFeatured: false, tags: ['Arduino', 'Microcontroller', 'IoT'], price: 399 },
  { id: 'c5', title: 'Electrical Circuit Analysis', slug: 'circuit-analysis', description: 'Master AC/DC circuit analysis, network theorems, and electrical measurements. Complete preparation for BTEB exams.', thumbnailUrl: '', categoryId: 'cat4', instructorId: 'ins5', level: 'beginner', language: 'Bangla', duration: 2000, totalVideos: 40, rating: 4.9, totalReviews: 278, totalStudents: 2100, isFeatured: true, tags: ['Circuits', 'AC', 'DC', 'BTEB'], price: 0 },
  { id: 'c6', title: 'Power Systems & Renewable Energy', slug: 'power-systems', description: 'Learn power generation, transmission, distribution, and renewable energy technologies. Essential for EEE diploma students.', thumbnailUrl: '', categoryId: 'cat4', instructorId: 'ins5', level: 'advanced', language: 'Bangla', duration: 1600, totalVideos: 32, rating: 4.8, totalReviews: 145, totalStudents: 680, isFeatured: false, tags: ['Power', 'Solar', 'Renewable'], price: 599 },
  { id: 'c7', title: 'Engineering Drawing & AutoCAD', slug: 'engineering-drawing-autocad', description: 'From hand drawing to AutoCAD. Master engineering drawing fundamentals and 2D/3D CAD modeling for mechanical engineering students.', thumbnailUrl: '', categoryId: 'cat5', instructorId: 'ins3', level: 'beginner', language: 'Bangla', duration: 1400, totalVideos: 28, rating: 4.7, totalReviews: 198, totalStudents: 940, isFeatured: true, tags: ['AutoCAD', 'Drawing', 'Mechanical'], price: 349 },
  { id: 'c8', title: 'Thermodynamics & Heat Transfer', slug: 'thermodynamics', description: 'Comprehensive thermodynamics course covering laws of thermodynamics, heat transfer, and their applications in mechanical systems.', thumbnailUrl: '', categoryId: 'cat5', instructorId: 'ins3', level: 'intermediate', language: 'Bangla', duration: 1100, totalVideos: 22, rating: 4.5, totalReviews: 87, totalStudents: 420, isFeatured: false, tags: ['Thermodynamics', 'Heat', 'ME'], price: 299 },
  { id: 'c9', title: 'Structural Analysis & Design', slug: 'structural-analysis', description: 'Learn structural analysis, RCC design, and steel structure design. Complete BTEB syllabus coverage with practical examples.', thumbnailUrl: '', categoryId: 'cat6', instructorId: 'ins7', level: 'intermediate', language: 'Bangla', duration: 1800, totalVideos: 36, rating: 4.6, totalReviews: 156, totalStudents: 850, isFeatured: false, tags: ['Structure', 'RCC', 'Steel'], price: 449 },
  { id: 'c10', title: 'Surveying & Estimation', slug: 'surveying-estimation', description: 'Master surveying techniques, equipment handling, and cost estimation for construction projects. Field practice included.', thumbnailUrl: '', categoryId: 'cat6', instructorId: 'ins7', level: 'beginner', language: 'Bangla', duration: 1000, totalVideos: 20, rating: 4.5, totalReviews: 92, totalStudents: 560, isFeatured: false, tags: ['Surveying', 'Estimation', 'Civil'], price: 0 },
  { id: 'c11', title: 'Architectural Design with Revit', slug: 'architectural-revit', description: 'Create professional architectural designs using Autodesk Revit. From floor plans to 3D rendering and walkthrough animations.', thumbnailUrl: '', categoryId: 'cat7', instructorId: 'ins4', level: 'intermediate', language: 'Bangla', duration: 1600, totalVideos: 32, rating: 4.6, totalReviews: 78, totalStudents: 380, isFeatured: true, tags: ['Revit', 'Architecture', '3D'], price: 549 },
  { id: 'c12', title: 'Interior Design Principles', slug: 'interior-design', description: 'Learn interior design fundamentals, space planning, color theory, and material selection for creating beautiful living and work spaces.', thumbnailUrl: '', categoryId: 'cat7', instructorId: 'ins4', level: 'beginner', language: 'Bangla', duration: 800, totalVideos: 16, rating: 4.4, totalReviews: 56, totalStudents: 290, isFeatured: false, tags: ['Interior', 'Design', 'Space'], price: 249 },
  { id: 'c13', title: 'Python Programming for Beginners', slug: 'python-beginners', description: 'Start your programming journey with Python. Learn variables, loops, functions, OOP, and build real projects. No prior experience needed.', thumbnailUrl: '', categoryId: 'cat8', instructorId: 'ins1', level: 'beginner', language: 'Bangla', duration: 1200, totalVideos: 24, rating: 4.8, totalReviews: 345, totalStudents: 1890, isFeatured: true, tags: ['Python', 'Programming', 'OOP'], price: 0 },
  { id: 'c14', title: 'C Programming & Data Structures', slug: 'c-programming-ds', description: 'Master C programming and data structures. Essential for BTEB CSE students covering arrays, pointers, linked lists, trees, and graphs.', thumbnailUrl: '', categoryId: 'cat8', instructorId: 'ins1', level: 'intermediate', language: 'Bangla', duration: 1500, totalVideos: 30, rating: 4.7, totalReviews: 267, totalStudents: 1340, isFeatured: false, tags: ['C', 'Data Structures', 'Algorithms'], price: 399 },
  { id: 'c15', title: 'Machine Learning with Python', slug: 'ml-python', description: 'Introduction to machine learning algorithms, model training, and evaluation using scikit-learn and TensorFlow. Build real ML projects.', thumbnailUrl: '', categoryId: 'cat9', instructorId: 'ins8', level: 'advanced', language: 'Bangla', duration: 2000, totalVideos: 40, rating: 4.7, totalReviews: 123, totalStudents: 560, isFeatured: true, tags: ['ML', 'AI', 'Python'], price: 699 },
  { id: 'c16', title: 'Data Visualization & Analytics', slug: 'data-visualization', description: 'Learn data visualization with Python, Tableau, and Excel. Turn raw data into actionable insights with beautiful charts and dashboards.', thumbnailUrl: '', categoryId: 'cat9', instructorId: 'ins8', level: 'intermediate', language: 'Bangla', duration: 900, totalVideos: 18, rating: 4.6, totalReviews: 89, totalStudents: 430, isFeatured: false, tags: ['Data', 'Visualization', 'Analytics'], price: 349 },
  { id: 'c17', title: 'Computer Networking & CCNA', slug: 'networking-ccna', description: 'Complete networking fundamentals and CCNA preparation. Learn OSI model, TCP/IP, routing, switching, and network security.', thumbnailUrl: '', categoryId: 'cat10', instructorId: 'ins9', level: 'intermediate', language: 'Bangla', duration: 1800, totalVideos: 36, rating: 4.6, totalReviews: 134, totalStudents: 670, isFeatured: false, tags: ['Networking', 'CCNA', 'Security'], price: 499 },
  { id: 'c18', title: 'Cybersecurity Fundamentals', slug: 'cybersecurity', description: 'Learn ethical hacking, vulnerability assessment, and cybersecurity best practices. Protect systems and networks from threats.', thumbnailUrl: '', categoryId: 'cat10', instructorId: 'ins9', level: 'advanced', language: 'Bangla', duration: 1400, totalVideos: 28, rating: 4.5, totalReviews: 67, totalStudents: 340, isFeatured: false, tags: ['Security', 'Hacking', 'Protection'], price: 599 },
  { id: 'c19', title: 'Flutter Mobile App Development', slug: 'flutter-mobile', description: 'Build cross-platform mobile apps with Flutter and Dart. From UI design to API integration and Play Store deployment.', thumbnailUrl: '', categoryId: 'cat2', instructorId: 'ins6', level: 'intermediate', language: 'Bangla', duration: 1600, totalVideos: 32, rating: 4.8, totalReviews: 112, totalStudents: 580, isFeatured: true, tags: ['Flutter', 'Dart', 'Mobile'], price: 499 },
  { id: 'c20', title: 'Android Development with Kotlin', slug: 'android-kotlin', description: 'Native Android app development using Kotlin. Learn activities, fragments, Room database, and Material Design.', thumbnailUrl: '', categoryId: 'cat2', instructorId: 'ins1', level: 'intermediate', language: 'Bangla', duration: 1400, totalVideos: 28, rating: 4.6, totalReviews: 89, totalStudents: 460, isFeatured: false, tags: ['Android', 'Kotlin', 'Mobile'], price: 449 },
  { id: 'c21', title: 'Graphic Design with Adobe Illustrator', slug: 'graphic-design-illustrator', description: 'Master vector graphic design with Adobe Illustrator. Create logos, icons, illustrations, and brand identity materials.', thumbnailUrl: '', categoryId: 'cat11', instructorId: 'ins4', level: 'beginner', language: 'Bangla', duration: 1000, totalVideos: 20, rating: 4.5, totalReviews: 78, totalStudents: 350, isFeatured: false, tags: ['Illustrator', 'Design', 'Vector'], price: 349 },
  { id: 'c22', title: 'Textile Manufacturing Processes', slug: 'textile-manufacturing', description: 'Comprehensive textile manufacturing course covering spinning, weaving, knitting, dyeing, and finishing processes.', thumbnailUrl: '', categoryId: 'cat12', instructorId: 'ins10', level: 'intermediate', language: 'Bangla', duration: 1200, totalVideos: 24, rating: 4.4, totalReviews: 45, totalStudents: 230, isFeatured: false, tags: ['Textile', 'Manufacturing', 'Dyeing'], price: 299 },
  { id: 'c23', title: 'Node.js & Express Backend Development', slug: 'nodejs-express', description: 'Build scalable backend APIs with Node.js and Express. Learn REST API design, MongoDB, authentication, and deployment.', thumbnailUrl: '', categoryId: 'cat1', instructorId: 'ins6', level: 'intermediate', language: 'Bangla', duration: 1500, totalVideos: 30, rating: 4.7, totalReviews: 145, totalStudents: 720, isFeatured: false, tags: ['Node.js', 'Express', 'Backend'], price: 449 },
  { id: 'c24', title: 'Database Management with SQL', slug: 'database-sql', description: 'Learn SQL and database management. Master MySQL, database design, normalization, and query optimization for CSE students.', thumbnailUrl: '', categoryId: 'cat8', instructorId: 'ins1', level: 'beginner', language: 'Bangla', duration: 1000, totalVideos: 20, rating: 4.6, totalReviews: 189, totalStudents: 980, isFeatured: false, tags: ['SQL', 'MySQL', 'Database'], price: 0 },
];

// ============ VIDEOS ============
export interface Video {
  id: string;
  title: string;
  slug: string;
  courseId: string;
  duration: number;
  order: number;
  isPreview: boolean;
  description: string;
}

const generateVideos = (courseId: string, courseTitle: string, count: number, startOrder: number): Video[] => {
  const topics = [
    'Introduction & Overview', 'Getting Started', 'Basic Concepts', 'Understanding the Fundamentals',
    'Core Principles', 'Deep Dive into Theory', 'Practical Examples', 'Hands-on Practice',
    'Advanced Techniques', 'Real-world Applications', 'Problem Solving', 'Common Mistakes to Avoid',
    'Best Practices', 'Industry Standards', 'Tips & Tricks', 'Summary & Review',
    'Assignment Walkthrough', 'Project Setup', 'Building the Solution', 'Testing & Debugging',
    'Performance Optimization', 'Security Considerations', 'Deployment Guide', 'Next Steps',
  ];

  // Deterministic pseudo-random based on courseId to avoid SSR/client hydration mismatch
  const seed = courseId.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);

  return Array.from({ length: count }, (_, i) => ({
    id: `v-${courseId}-${i + 1}`,
    title: `${topics[i % topics.length]} — ${courseTitle.split(' ').slice(0, 3).join(' ')}`,
    slug: `${courseId}-video-${i + 1}`,
    courseId,
    duration: ((seed * (i + 1) * 7 + 300) % 1200) + 300,
    order: startOrder + i,
    isPreview: i === 0,
    description: `In this lesson, we explore ${topics[i % topics.length].toLowerCase()} for ${courseTitle}.`,
  }));
};

export const VIDEOS: Video[] = [
  ...generateVideos('c1', 'Complete Web Development with HTML CSS & JavaScript', 48, 1),
  ...generateVideos('c2', 'React.js & Next.js Modern Frontend Development', 36, 1),
  ...generateVideos('c3', 'Digital Electronics Fundamentals', 24, 1),
  ...generateVideos('c4', 'Microcontroller Programming with Arduino', 30, 1),
  ...generateVideos('c5', 'Electrical Circuit Analysis', 40, 1),
  ...generateVideos('c13', 'Python Programming for Beginners', 24, 1),
  ...generateVideos('c15', 'Machine Learning with Python', 40, 1),
  ...generateVideos('c19', 'Flutter Mobile App Development', 32, 1),
];

// ============ NOTIFICATIONS ============
export const MOCK_NOTIFICATIONS: AppNotification[] = [
  { id: 'n1', title: 'New Course Available!', message: 'Machine Learning with Python is now live. Enroll now and get 20% off!', type: 'announcement', isRead: false, createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString() },
  { id: 'n2', title: 'Course Completed! 🎉', message: 'Congratulations! You have completed Digital Electronics Fundamentals.', type: 'success', isRead: false, createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString() },
  { id: 'n3', title: 'New Video Uploaded', message: 'Engr. Karim Uddin uploaded a new video: "React Hooks Deep Dive"', type: 'info', isRead: false, createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString() },
  { id: 'n4', title: 'Assignment Due Tomorrow', message: 'Your JavaScript project assignment is due tomorrow at 11:59 PM.', type: 'warning', isRead: true, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString() },
  { id: 'n5', title: 'Live Session Reminder', message: 'Dr. Shahid Hossain is going live in 30 minutes: "Power Systems Q&A"', type: 'info', isRead: true, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString() },
  { id: 'n6', title: 'Certificate Ready!', message: 'Your certificate for Python Programming for Beginners is ready to download.', type: 'success', isRead: true, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString() },
  { id: 'n7', title: 'Weekly Progress Report', message: 'You watched 12 hours this week! Keep up the great work.', type: 'info', isRead: true, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString() },
  { id: 'n8', title: 'New Feature: Bookmarks!', message: 'You can now bookmark courses to watch later. Try it out!', type: 'announcement', isRead: true, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString() },
  { id: 'n9', title: 'Subscription Renewal', message: 'Your premium subscription will renew in 5 days. Update your payment method.', type: 'warning', isRead: false, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString() },
  { id: 'n10', title: 'Instructor Replied', message: 'Engr. Karim Uddin replied to your question in Web Development course.', type: 'info', isRead: false, createdAt: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString() },
];

// ============ HELPER FUNCTIONS ============
export function getInstructor(id: string): Instructor | undefined {
  return INSTRUCTORS.find((i) => i.id === id);
}

export function getCourse(id: string): Course | undefined {
  return COURSES.find((c) => c.id === id);
}

export function getCategory(id: string): Category | undefined {
  return CATEGORIES.find((c) => c.id === id);
}

export function getCourseVideos(courseId: string): Video[] {
  return VIDEOS.filter((v) => v.courseId === courseId).sort((a, b) => a.order - b.order);
}

export function getInstructorCourses(instructorId: string): Course[] {
  return COURSES.filter((c) => c.instructorId === instructorId);
}

export function getCategoryCourses(categoryId: string): Course[] {
  return COURSES.filter((c) => c.categoryId === categoryId);
}

export function searchCourses(query: string): Course[] {
  const q = query.toLowerCase();
  return COURSES.filter(
    (c) =>
      c.title.toLowerCase().includes(q) ||
      c.description.toLowerCase().includes(q) ||
      c.tags.some((t) => t.toLowerCase().includes(q))
  );
}

export function searchInstructors(query: string): Instructor[] {
  const q = query.toLowerCase();
  return INSTRUCTORS.filter(
    (i) => i.name.toLowerCase().includes(q) || i.specialization.toLowerCase().includes(q)
  );
}

export function searchVideos(query: string): Video[] {
  const q = query.toLowerCase();
  return VIDEOS.filter(
    (v) => v.title.toLowerCase().includes(q) || v.description.toLowerCase().includes(q)
  ).slice(0, 20);
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function formatTimeAgo(dateString: string): string {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const diff = now - then;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

export function getLevelColor(level: string): string {
  switch (level) {
    case 'beginner': return '#10b981';
    case 'intermediate': return '#0ea5e9';
    case 'advanced': return '#f59e0b';
    case 'expert': return '#ef4444';
    default: return '#64748b';
  }
}

export const TRENDING_SEARCHES = [
  'Web Development', 'Python', 'Arduino', 'AutoCAD', 'React', 'Circuit Analysis', 'Machine Learning', 'Flutter',
];
