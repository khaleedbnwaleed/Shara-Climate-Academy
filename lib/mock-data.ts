export interface Course {
  id: string;
  title: string;
  description: string;
  category: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  duration: number;
  price: number;
  image: string;
  instructor: string;
  rating: number;
  students: number;
  enrollments: number;
  completions: number;
  revenue: number;
  lessonCount: number;
  lastUpdated: string;
  content: string;
  modules: Module[];
}

export interface Module {
  id: string;
  title: string;
  lessons: Lesson[];
}

export interface Lesson {
  id: string;
  title: string;
  contentType: 'video' | 'pdf' | 'text' | 'audio' | 'image';
  content: string;
  duration: number;
}

export interface User {
  id: string;
  email: string;
  password: string;
  name: string;
  role: 'student' | 'professional' | 'admin';
  avatar: string;
  bio: string;
  enrolledCourses: string[];
  completedCourses: string[];
  certificates: { courseId: string; date: string; certificateId: string }[];
  joinDate: string;
  lastActive: string;
  status: 'active' | 'inactive' | 'suspended';
  totalSpent: number;
}

export interface EnrolledCourse {
  courseId: string;
  enrolledDate: string;
  progress: number;
  completedLessons: number;
  totalLessons: number;
}

export interface Revenue {
  id: string;
  courseId: string;
  userId: string;
  amount: number;
  date: string;
  status: 'completed' | 'refunded' | 'pending';
}

export interface AnalyticsData {
  date: string;
  enrollments: number;
  revenue: number;
  completions: number;
  activeUsers: number;
}

export const mockCourses: Course[] = [
  {
    id: 'course-1',
    title: 'Climate Science Fundamentals',
    description: 'Understand the science behind climate change, greenhouse gases, and global warming.',
    category: 'Climate Science',
    level: 'beginner',
    duration: 12,
    price: 49,
    image: 'https://images.unsplash.com/photo-1569163139394-de4798aa62b2?w=800&q=80',
    instructor: 'Dr. Sarah Johnson',
    rating: 4.8,
    students: 2450,
    enrollments: 3200,
    completions: 1840,
    revenue: 156800,
    lessonCount: 24,
    lastUpdated: '2024-05-10',
    content: 'Comprehensive course on climate science',
    modules: [
      {
        id: 'mod-1',
        title: 'Introduction to Climate',
        lessons: [
          { id: 'lesson-1', title: 'What is Climate?', contentType: 'video', content: 'https://example.com/video1.mp4', duration: 15 },
          { id: 'lesson-2', title: 'Climate vs Weather', contentType: 'text', content: 'Climate is long-term patterns...', duration: 10 },
        ],
      },
    ],
  },
  {
    id: 'course-2',
    title: 'Renewable Energy Solutions',
    description: 'Learn about solar, wind, and other renewable energy sources transforming the world.',
    category: 'Energy',
    level: 'intermediate',
    duration: 15,
    price: 69,
    image: 'https://images.unsplash.com/photo-1497933761841-ae5f3cdc87d3?w=800&q=80',
    instructor: 'Prof. Michael Chen',
    rating: 4.7,
    students: 1890,
    enrollments: 2450,
    completions: 1225,
    revenue: 169050,
    lessonCount: 30,
    lastUpdated: '2024-05-12',
    content: 'In-depth course on renewable energy',
    modules: [
      {
        id: 'mod-2',
        title: 'Solar Energy',
        lessons: [
          { id: 'lesson-3', title: 'Solar Panels Explained', contentType: 'video', content: 'https://example.com/video2.mp4', duration: 20 },
          { id: 'lesson-4', title: 'Solar PDF Guide', contentType: 'pdf', content: 'https://example.com/solar.pdf', duration: 15 },
        ],
      },
    ],
  },
  {
    id: 'course-3',
    title: 'Climate Policy & Advocacy',
    description: 'Master the policy frameworks and advocacy strategies for climate action.',
    category: 'Policy',
    level: 'advanced',
    duration: 18,
    price: 89,
    image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&q=80',
    instructor: 'Dr. Emma Williams',
    rating: 4.9,
    students: 1250,
    enrollments: 1680,
    completions: 1008,
    revenue: 149520,
    lessonCount: 36,
    lastUpdated: '2024-05-08',
    content: 'Advanced policy and advocacy course',
    modules: [
      {
        id: 'mod-3',
        title: 'International Agreements',
        lessons: [
          { id: 'lesson-5', title: 'Paris Agreement Overview', contentType: 'video', content: 'https://example.com/video3.mp4', duration: 25 },
          { id: 'lesson-6', title: 'Policy Analysis', contentType: 'audio', content: 'https://example.com/audio1.mp3', duration: 20 },
        ],
      },
    ],
  },
  {
    id: 'course-4',
    title: 'Sustainable Agriculture',
    description: 'Explore sustainable farming practices and climate-smart agriculture techniques.',
    category: 'Agriculture',
    level: 'beginner',
    duration: 10,
    price: 39,
    image: 'https://images.unsplash.com/photo-1574943320219-553eb213f72d?w=800&q=80',
    instructor: 'James Rodriguez',
    rating: 4.6,
    students: 3100,
    enrollments: 4200,
    completions: 2100,
    revenue: 163800,
    lessonCount: 20,
    lastUpdated: '2024-05-14',
    content: 'Sustainable agriculture fundamentals',
    modules: [
      {
        id: 'mod-4',
        title: 'Soil Health',
        lessons: [
          { id: 'lesson-7', title: 'Understanding Soil', contentType: 'video', content: 'https://example.com/video4.mp4', duration: 18 },
          { id: 'lesson-8', title: 'Soil Nutrients Guide', contentType: 'pdf', content: 'https://example.com/soil.pdf', duration: 12 },
        ],
      },
    ],
  },
  {
    id: 'course-5',
    title: 'Climate Finance & Investment',
    description: 'Understanding climate-related financial opportunities and green investments.',
    category: 'Finance',
    level: 'advanced',
    duration: 16,
    price: 79,
    image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&q=80',
    instructor: 'Sarah Thompson',
    rating: 4.8,
    students: 950,
    enrollments: 1300,
    completions: 715,
    revenue: 102700,
    lessonCount: 28,
    lastUpdated: '2024-05-11',
    content: 'Climate finance and investment strategies',
    modules: [
      {
        id: 'mod-5',
        title: 'Green Bonds',
        lessons: [
          { id: 'lesson-9', title: 'Introduction to Green Bonds', contentType: 'video', content: 'https://example.com/video5.mp4', duration: 22 },
          { id: 'lesson-10', title: 'Investor Handbook', contentType: 'pdf', content: 'https://example.com/bonds.pdf', duration: 30 },
        ],
      },
    ],
  },
  {
    id: 'course-6',
    title: 'Carbon Management & Accounting',
    description: 'Learn how to measure, report, and manage carbon emissions effectively.',
    category: 'Climate Science',
    level: 'intermediate',
    duration: 14,
    price: 59,
    image: 'https://images.unsplash.com/photo-1516534775068-bb57fa6f7722?w=800&q=80',
    instructor: 'Dr. Robert Zhang',
    rating: 4.7,
    students: 1650,
    enrollments: 2100,
    completions: 1155,
    revenue: 123900,
    lessonCount: 26,
    lastUpdated: '2024-05-09',
    content: 'Carbon accounting and management course',
    modules: [
      {
        id: 'mod-6',
        title: 'Carbon Footprinting',
        lessons: [
          { id: 'lesson-11', title: 'Calculating Carbon Footprint', contentType: 'video', content: 'https://example.com/video6.mp4', duration: 20 },
          { id: 'lesson-12', title: 'Reduction Strategies', contentType: 'text', content: 'Strategies to reduce carbon...', duration: 15 },
        ],
      },
    ],
  },
  {
    id: 'course-7',
    title: 'Climate Communication & Storytelling',
    description: 'Master the art of communicating climate science effectively to diverse audiences.',
    category: 'Communication',
    level: 'beginner',
    duration: 9,
    price: 44,
    image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&q=80',
    instructor: 'Lisa Anderson',
    rating: 4.5,
    students: 2200,
    enrollments: 3100,
    completions: 1550,
    revenue: 136400,
    lessonCount: 18,
    lastUpdated: '2024-05-13',
    content: 'Climate communication fundamentals',
    modules: [
      {
        id: 'mod-7',
        title: 'Message Development',
        lessons: [
          { id: 'lesson-13', title: 'Crafting Your Message', contentType: 'video', content: 'https://example.com/video7.mp4', duration: 18 },
          { id: 'lesson-14', title: 'Storytelling Techniques', contentType: 'audio', content: 'https://example.com/audio2.mp3', duration: 25 },
        ],
      },
    ],
  },
  {
    id: 'course-8',
    title: 'Biodiversity & Conservation',
    description: 'Understand ecosystem conservation and biodiversity protection strategies.',
    category: 'Biodiversity',
    level: 'intermediate',
    duration: 13,
    price: 64,
    image: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=80',
    instructor: 'Dr. Patricia Green',
    rating: 4.8,
    students: 1720,
    enrollments: 2300,
    completions: 1150,
    revenue: 147200,
    lessonCount: 26,
    lastUpdated: '2024-05-07',
    content: 'Biodiversity and conservation course',
    modules: [
      {
        id: 'mod-8',
        title: 'Protected Areas',
        lessons: [
          { id: 'lesson-15', title: 'National Parks & Reserves', contentType: 'video', content: 'https://example.com/video8.mp4', duration: 22 },
          { id: 'lesson-16', title: 'Conservation Map', contentType: 'image', content: 'https://example.com/map.jpg', duration: 10 },
        ],
      },
    ],
  },
];

export const mockUsers: User[] = [
  {
    id: 'user-1',
    email: 'student@example.com',
    password: 'password123',
    name: 'Alex Johnson',
    role: 'student',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex',
    bio: 'Climate enthusiast eager to learn more',
    enrolledCourses: ['course-1', 'course-2'],
    completedCourses: ['course-3'],
    certificates: [{ courseId: 'course-3', date: '2024-04-15', certificateId: 'cert-1' }],
    joinDate: '2024-01-15',
    lastActive: '2024-05-14',
    status: 'active',
    totalSpent: 118,
  },
  {
    id: 'user-2',
    email: 'professional@example.com',
    password: 'password123',
    name: 'Jordan Chen',
    role: 'professional',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Jordan',
    bio: 'Climate policy expert',
    enrolledCourses: ['course-2', 'course-3', 'course-5'],
    completedCourses: ['course-1', 'course-4'],
    certificates: [
      { courseId: 'course-1', date: '2024-02-20', certificateId: 'cert-2' },
      { courseId: 'course-4', date: '2024-04-10', certificateId: 'cert-3' },
    ],
    joinDate: '2023-11-20',
    lastActive: '2024-05-13',
    status: 'active',
    totalSpent: 207,
  },
  {
    id: 'user-3',
    email: 'admin@example.com',
    password: 'password123',
    name: 'Admin User',
    role: 'admin',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin',
    bio: 'Platform administrator',
    enrolledCourses: [],
    completedCourses: [],
    certificates: [],
    joinDate: '2023-09-01',
    lastActive: '2024-05-14',
    status: 'active',
    totalSpent: 0,
  },
  {
    id: 'user-4',
    email: 'emma.davis@example.com',
    password: 'password123',
    name: 'Emma Davis',
    role: 'student',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emma',
    bio: 'Renewable energy specialist',
    enrolledCourses: ['course-2', 'course-6'],
    completedCourses: ['course-2'],
    certificates: [{ courseId: 'course-2', date: '2024-03-28', certificateId: 'cert-4' }],
    joinDate: '2024-02-10',
    lastActive: '2024-05-12',
    status: 'active',
    totalSpent: 128,
  },
  {
    id: 'user-5',
    email: 'mark.wilson@example.com',
    password: 'password123',
    name: 'Mark Wilson',
    role: 'professional',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mark',
    bio: 'Climate finance advisor',
    enrolledCourses: ['course-5', 'course-6'],
    completedCourses: ['course-5'],
    certificates: [{ courseId: 'course-5', date: '2024-04-05', certificateId: 'cert-5' }],
    joinDate: '2024-01-05',
    lastActive: '2024-05-14',
    status: 'active',
    totalSpent: 148,
  },
  {
    id: 'user-6',
    email: 'sophia.lee@example.com',
    password: 'password123',
    name: 'Sophia Lee',
    role: 'student',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sophia',
    bio: 'Sustainability advocate',
    enrolledCourses: ['course-1', 'course-4', 'course-7'],
    completedCourses: ['course-1'],
    certificates: [{ courseId: 'course-1', date: '2024-03-15', certificateId: 'cert-6' }],
    joinDate: '2023-12-01',
    lastActive: '2024-05-10',
    status: 'active',
    totalSpent: 152,
  },
  {
    id: 'user-7',
    email: 'david.brown@example.com',
    password: 'password123',
    name: 'David Brown',
    role: 'professional',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=David',
    bio: 'Environmental consultant',
    enrolledCourses: ['course-3', 'course-8'],
    completedCourses: ['course-8'],
    certificates: [{ courseId: 'course-8', date: '2024-04-20', certificateId: 'cert-7' }],
    joinDate: '2024-01-28',
    lastActive: '2024-05-14',
    status: 'active',
    totalSpent: 153,
  },
  {
    id: 'user-8',
    email: 'inactive.user@example.com',
    password: 'password123',
    name: 'Inactive User',
    role: 'student',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Inactive',
    bio: 'Inactive member',
    enrolledCourses: ['course-1'],
    completedCourses: [],
    certificates: [],
    joinDate: '2024-04-01',
    lastActive: '2024-04-15',
    status: 'inactive',
    totalSpent: 49,
  },
];

export const mockRevenue: Revenue[] = [
  { id: 'rev-1', courseId: 'course-1', userId: 'user-1', amount: 49, date: '2024-05-14', status: 'completed' },
  { id: 'rev-2', courseId: 'course-2', userId: 'user-1', amount: 69, date: '2024-05-13', status: 'completed' },
  { id: 'rev-3', courseId: 'course-2', userId: 'user-4', amount: 69, date: '2024-05-12', status: 'completed' },
  { id: 'rev-4', courseId: 'course-3', userId: 'user-2', amount: 89, date: '2024-05-11', status: 'completed' },
  { id: 'rev-5', courseId: 'course-5', userId: 'user-2', amount: 79, date: '2024-05-10', status: 'completed' },
  { id: 'rev-6', courseId: 'course-5', userId: 'user-5', amount: 79, date: '2024-05-10', status: 'completed' },
  { id: 'rev-7', courseId: 'course-1', userId: 'user-6', amount: 49, date: '2024-05-09', status: 'completed' },
  { id: 'rev-8', courseId: 'course-4', userId: 'user-4', amount: 39, date: '2024-05-08', status: 'completed' },
  { id: 'rev-9', courseId: 'course-4', userId: 'user-6', amount: 39, date: '2024-05-08', status: 'completed' },
  { id: 'rev-10', courseId: 'course-6', userId: 'user-4', amount: 59, date: '2024-05-07', status: 'completed' },
];

export const mockAnalyticsData: AnalyticsData[] = [
  { date: '2024-04-01', enrollments: 145, revenue: 7250, completions: 65, activeUsers: 1230 },
  { date: '2024-04-05', enrollments: 182, revenue: 9100, completions: 78, activeUsers: 1450 },
  { date: '2024-04-10', enrollments: 156, revenue: 7800, completions: 72, activeUsers: 1380 },
  { date: '2024-04-15', enrollments: 198, revenue: 9900, completions: 89, activeUsers: 1620 },
  { date: '2024-04-20', enrollments: 210, revenue: 10500, completions: 95, activeUsers: 1750 },
  { date: '2024-04-25', enrollments: 187, revenue: 9350, completions: 84, activeUsers: 1680 },
  { date: '2024-05-01', enrollments: 215, revenue: 10750, completions: 98, activeUsers: 1890 },
  { date: '2024-05-05', enrollments: 220, revenue: 11000, completions: 102, activeUsers: 2010 },
  { date: '2024-05-10', enrollments: 245, revenue: 12250, completions: 118, activeUsers: 2150 },
  { date: '2024-05-14', enrollments: 256, revenue: 12800, completions: 124, activeUsers: 2280 },
];
