'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  BookOpen,
  Users,
  GraduationCap,
  Star,
  TrendingUp,
  DollarSign,
  Zap,
  Target,
  Activity,
  ChevronRight,
  Calendar,
  type LucideIcon,
} from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useTheme } from '@/context/theme-context';
import Link from 'next/link';

type CourseDate =
  | Date
  | string
  | number
  | { toDate?: () => Date }
  | null;

type LecturerCourse = {
  id: string;
  title?: string;
  instructorName?: string;
  price?: number;
  totalStudents?: number;
  rating?: number;
  completedCount?: number;
  createdAt?: CourseDate;
  lessonCount: number;
  image: string;
};

type LecturerStudent = {
  id: string;
  name?: string;
  email?: string | null;
  role?: string;
  enrolledCourses?: string[];
};

type StatCardProps = {
  icon: LucideIcon;
  title: string;
  value: string | number;
  suffix?: string;
  color?: string;
};

function getCourseDate(value: CourseDate | undefined): Date {
  if (value instanceof Date) {
    return value;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? new Date(0) : date;
  }

  if (
    value &&
    typeof value === 'object' &&
    'toDate' in value &&
    typeof value.toDate === 'function'
  ) {
    return value.toDate();
  }

  return new Date(0);
}

export default function LecturerDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const instructorName = user?.name ?? 'Lecturer';

  const [courses, setCourses] = useState<LecturerCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [allStudents, setAllStudents] = useState<LecturerStudent[]>([]);
  const [recentCourses, setRecentCourses] = useState<LecturerCourse[]>([]);

  const [totalStudents, setTotalStudents] = useState(0);
  const [totalLessons, setTotalLessons] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [averageRating, setAverageRating] = useState(4.5);
  const [completionRate, setCompletionRate] = useState(0);
  const [engagementRate, setEngagementRate] = useState(0);
  const [qualityScore, setQualityScore] = useState(0);
  const [realGrowthRate, setRealGrowthRate] = useState(0);

  useEffect(() => {
    if (!user) return;

    if (user.role === 'student') {
      router.push('/dashboard');
    } else if (user.role === 'admin') {
      router.push('/admin');
    }
  }, [user, router]);

  useEffect(() => {
    if (user?.role === 'professional' || user?.role === 'lecturer') {
      void fetchData();
    } else if (user) {
      setLoading(false);
    }
  }, [user]);

  const fetchData = async () => {
    try {
      // Fetch courses belonging to this lecturer.
      const coursesQuery = query(
        collection(db, 'courses'),
        where('instructorName', '==', instructorName)
      );

      const coursesSnapshot = await getDocs(coursesQuery);

      const coursesData: LecturerCourse[] = await Promise.all(
        coursesSnapshot.docs.map(async (courseDoc) => {
          const data = courseDoc.data();

          const lessonsRef = collection(
            db,
            'courses',
            courseDoc.id,
            'lessons'
          );

          const lessonsSnapshot = await getDocs(lessonsRef);

          return {
            ...data,
            id: courseDoc.id,
            title:
              typeof data.title === 'string' ? data.title : 'Untitled Course',
            price: typeof data.price === 'number' ? data.price : 0,
            totalStudents:
              typeof data.totalStudents === 'number'
                ? data.totalStudents
                : 0,
            rating: typeof data.rating === 'number' ? data.rating : undefined,
            completedCount:
              typeof data.completedCount === 'number'
                ? data.completedCount
                : 0,
            lessonCount: lessonsSnapshot.size,
            image:
              typeof data.imageUrl === 'string'
                ? data.imageUrl
                : 'https://images.unsplash.com/photo-1516534775068-bb57fa6f7722?w=800&q=80',
          } as LecturerCourse;
        })
      );

      setCourses(coursesData);

      // Fetch students and professionals.
      const usersSnapshot = await getDocs(collection(db, 'users'));

      const students: LecturerStudent[] = usersSnapshot.docs
        .map((userDoc) => {
          const data = userDoc.data();

          return {
            ...data,
            id: userDoc.id,
            role: typeof data.role === 'string' ? data.role : undefined,
            enrolledCourses: Array.isArray(data.enrolledCourses)
              ? data.enrolledCourses.filter(
                  (courseId): courseId is string =>
                    typeof courseId === 'string'
                )
              : [],
          } as LecturerStudent;
        })
        .filter(
          (student) =>
            student.role === 'student' ||
            student.role === 'professional'
        );

      setAllStudents(students);

      // Count each enrolled student only once.
      const enrolledStudentIds = new Set<string>();

      coursesData.forEach((course) => {
        students.forEach((student) => {
          if (student.enrolledCourses?.includes(course.id)) {
            enrolledStudentIds.add(student.id);
          }
        });
      });

      setTotalStudents(enrolledStudentIds.size);

      // Calculate total lessons.
      const lessons = coursesData.reduce(
        (sum, course) => sum + course.lessonCount,
        0
      );

      setTotalLessons(lessons);

      // Calculate estimated course revenue.
      const revenue = coursesData.reduce(
        (sum, course) =>
          sum + (course.price ?? 0) * (course.totalStudents ?? 0),
        0
      );

      setTotalRevenue(revenue);

      // Calculate average rating.
      const avgRating =
        coursesData.reduce(
          (sum, course) => sum + (course.rating ?? 4.5),
          0
        ) / (coursesData.length || 1);

      setAverageRating(Number(avgRating.toFixed(1)));

      // Calculate completion rate.
      const totalEnrollments = coursesData.reduce(
        (sum, course) => sum + (course.totalStudents ?? 0),
        0
      );

      const completedEnrollments = coursesData.reduce(
        (sum, course) => sum + (course.completedCount ?? 0),
        0
      );

      setCompletionRate(
        totalEnrollments > 0
          ? Math.round(
              (completedEnrollments / totalEnrollments) * 100
            )
          : 0
      );

      // Calculate engagement rate.
      const totalLessonsCompleted = coursesData.reduce(
        (sum, course) => sum + (course.completedCount ?? 0),
        0
      );

      const totalPossibleCompletions = coursesData.reduce(
        (sum, course) => sum + (course.totalStudents ?? 0),
        0
      );

      setEngagementRate(
        totalPossibleCompletions > 0
          ? Math.round(
              (totalLessonsCompleted / totalPossibleCompletions) * 100
            )
          : 0
      );

      // Calculate quality score.
      setQualityScore(
        coursesData.length > 0
          ? Math.round((avgRating / 5) * 100)
          : 85
      );

      // Calculate growth using course creation dates.
      const now = new Date();
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(now.getMonth() - 3);

      let oldEnrollments = 0;
      let newEnrollments = 0;

      coursesData.forEach((course) => {
        const createdDate = getCourseDate(course.createdAt);

        if (createdDate < threeMonthsAgo) {
          oldEnrollments += course.totalStudents ?? 0;
        } else {
          newEnrollments += course.totalStudents ?? 0;
        }
      });

      setRealGrowthRate(
        oldEnrollments > 0
          ? Math.round(
              ((newEnrollments - oldEnrollments) / oldEnrollments) * 100
            )
          : newEnrollments > 0
            ? 100
            : 0
      );

      // Get the three most recently created courses.
      const sorted = [...coursesData].sort(
        (a, b) =>
          getCourseDate(b.createdAt).getTime() -
          getCourseDate(a.createdAt).getTime()
      );

      setRecentCourses(sorted.slice(0, 3));
    } catch (error) {
      console.error('Error fetching lecturer dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({
    icon: Icon,
    title,
    value,
    suffix = '',
    color = 'green',
  }: StatCardProps) => (
    <div
      className={`rounded-xl p-5 shadow-sm border ${
        isDarkMode
          ? 'bg-gray-800 border-gray-700'
          : 'bg-white border-gray-100'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2 rounded-lg bg-${color}-100 dark:bg-${color}-900/30`}>
          <Icon className={`h-5 w-5 text-${color}-600 dark:text-${color}-400`} />
        </div>

        {title === 'Avg Rating' && (
          <div className="flex gap-0.5">
            {Array.from({ length: 5 }, (_, i) => (
              <Star
                key={i}
                className={`h-3 w-3 ${
                  i < averageRating
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-gray-300'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      <p
        className={`text-2xl font-bold ${
          isDarkMode ? 'text-white' : 'text-gray-900'
        }`}
      >
        {value}
        {suffix}
      </p>

      <p
        className={`text-xs mt-1 ${
          isDarkMode ? 'text-gray-400' : 'text-gray-500'
        }`}
      >
        {title}
      </p>
    </div>
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-700" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="mb-6">
        <h1
          className={`text-2xl font-bold ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}
        >
          Dashboard
        </h1>

        <p
          className={`text-sm ${
            isDarkMode ? 'text-gray-400' : 'text-gray-500'
          }`}
        >
          Welcome back, {user?.name?.split(' ')[0]}. Here's your teaching overview.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={BookOpen} title="Total Courses" value={courses.length} />
        <StatCard icon={Users} title="Total Students" value={totalStudents} />
        <StatCard
          icon={GraduationCap}
          title="Total Lessons"
          value={totalLessons}
        />
        <StatCard
          icon={Star}
          title="Avg Rating"
          value={averageRating}
        />
      </div>

      {/* Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Completion and Revenue */}
        <div className="space-y-4">
          <div
            className={`rounded-lg p-4 shadow-sm border ${
              isDarkMode
                ? 'bg-gray-800 border-gray-700'
                : 'bg-white border-gray-100'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp
                className={`h-4 w-4 ${
                  isDarkMode ? 'text-green-400' : 'text-green-600'
                }`}
              />
              <span
                className={`text-xs ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}
              >
                Completion Rate
              </span>
            </div>

            <p
              className={`text-2xl font-bold ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}
            >
              {completionRate}%
            </p>

            <div className="mt-2 h-2 bg-gray-200 rounded-full">
              <div
                className="h-2 bg-green-600 rounded-full"
                style={{
                  width: `${Math.min(100, Math.max(0, completionRate))}%`,
                }}
              />
            </div>
          </div>

          <div
            className={`rounded-lg p-4 shadow-sm border ${
              isDarkMode
                ? 'bg-gray-800 border-gray-700'
                : 'bg-white border-gray-100'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <DollarSign
                className={`h-4 w-4 ${
                  isDarkMode ? 'text-yellow-400' : 'text-yellow-600'
                }`}
              />
              <span
                className={`text-xs ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}
              >
                Total Revenue
              </span>
            </div>

            <p
              className={`text-2xl font-bold ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}
            >
              ₦{totalRevenue.toLocaleString()}
            </p>

            <p
              className={`text-xs mt-1 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`}
            >
              Estimated course earnings
            </p>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div
            className={`rounded-lg p-4 text-center shadow-sm border ${
              isDarkMode
                ? 'bg-gray-800 border-gray-700'
                : 'bg-white border-gray-100'
            }`}
          >
            <Zap className="h-6 w-6 text-yellow-500 mx-auto mb-2" />
            <p
              className={`text-2xl font-bold ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}
            >
              {engagementRate}%
            </p>
            <p
              className={`text-xs ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`}
            >
              Engagement
            </p>
          </div>

          <div
            className={`rounded-lg p-4 text-center shadow-sm border ${
              isDarkMode
                ? 'bg-gray-800 border-gray-700'
                : 'bg-white border-gray-100'
            }`}
          >
            <Target className="h-6 w-6 text-blue-500 mx-auto mb-2" />
            <p
              className={`text-2xl font-bold ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}
            >
              {qualityScore}%
            </p>
            <p
              className={`text-xs ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`}
            >
              Quality
            </p>
          </div>

          <div
            className={`rounded-lg p-4 text-center shadow-sm border ${
              isDarkMode
                ? 'bg-gray-800 border-gray-700'
                : 'bg-white border-gray-100'
            }`}
          >
            <Activity className="h-6 w-6 text-green-500 mx-auto mb-2" />
            <p
              className={`text-2xl font-bold ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}
            >
              {realGrowthRate}%
            </p>
            <p
              className={`text-xs ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`}
            >
              Growth
            </p>
          </div>

          <div
            className={`rounded-lg p-4 text-center shadow-sm border ${
              isDarkMode
                ? 'bg-gray-800 border-gray-700'
                : 'bg-white border-gray-100'
            }`}
          >
            <Calendar className="h-6 w-6 text-purple-500 mx-auto mb-2" />
            <p
              className={`text-2xl font-bold ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}
            >
              {courses.length}
            </p>
            <p
              className={`text-xs ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`}
            >
              Active Courses
            </p>
          </div>
        </div>
      </div>

      {/* Recent Courses */}
      <div
        className={`rounded-lg p-5 shadow-sm border ${
          isDarkMode
            ? 'bg-gray-800 border-gray-700'
            : 'bg-white border-gray-100'
        }`}
      >
        <div className="flex justify-between items-center mb-4">
          <h3
            className={`font-semibold ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}
          >
            Recent Courses
          </h3>

          <Link
            href="/lecturer/courses"
            className="text-sm text-green-600 hover:text-green-700 flex items-center gap-1"
          >
            View All <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        {recentCourses.length > 0 ? (
          <div className="space-y-3">
            {recentCourses.map((course, i) => (
              <div
                key={course.id}
                className={`flex items-center gap-3 py-2 border-t first:border-0 ${
                  isDarkMode ? 'border-gray-700' : 'border-gray-100'
                }`}
              >
                <div className="w-8 h-8 rounded bg-green-100 flex items-center justify-center text-green-700 font-semibold text-xs">
                  {i + 1}
                </div>

                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-medium ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}
                  >
                    {course.title}
                  </p>

                  <p
                    className={`text-xs ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}
                  >
                    {course.lessonCount} lessons • {course.totalStudents ?? 0} students
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-sm font-semibold text-green-600">
                    ₦{(course.price ?? 0).toLocaleString()}
                  </p>

                  <p
                    className={`text-xs ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}
                  >
                    {course.rating ?? 4.5} ★
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>
              No courses yet
            </p>

            <Link href="/lecturer/courses">
              <Button className="mt-3 bg-green-700">
                Create Your First Course
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <Link href="/lecturer/courses">
          <div
            className={`rounded-lg p-4 text-center cursor-pointer transition hover:shadow-md border ${
              isDarkMode
                ? 'bg-gray-800 border-gray-700 hover:bg-gray-700'
                : 'bg-white border-gray-100 hover:shadow-lg'
            }`}
          >
            <BookOpen className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <p
              className={`font-medium ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}
            >
              Manage Courses
            </p>
            <p
              className={`text-xs ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`}
            >
              Create, edit, and organize
            </p>
          </div>
        </Link>

        <Link href="/lecturer/students">
          <div
            className={`rounded-lg p-4 text-center cursor-pointer transition hover:shadow-md border ${
              isDarkMode
                ? 'bg-gray-800 border-gray-700 hover:bg-gray-700'
                : 'bg-white border-gray-100 hover:shadow-lg'
            }`}
          >
            <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <p
              className={`font-medium ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}
            >
              View Students
            </p>
            <p
              className={`text-xs ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`}
            >
              Track enrolled learners
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}