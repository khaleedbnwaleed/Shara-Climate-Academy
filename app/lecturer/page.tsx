'use client';

import { useMemo, useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  BookOpen, Users, GraduationCap, Star, TrendingUp, DollarSign, 
  Zap, Target, Activity, ChevronRight, Calendar, Eye
} from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useTheme } from '@/context/theme-context';
import Link from 'next/link';

export default function LecturerDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const instructorName = user?.name ?? 'Lecturer';
  
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [recentCourses, setRecentCourses] = useState<any[]>([]);
  
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
    if (user.role === 'student') router.push('/dashboard');
    if (user.role === 'admin') router.push('/admin');
  }, [user, router]);

  useEffect(() => {
    if (user?.role === 'professional' || user?.role === 'lecturer') {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      // Fetch courses
      const q = query(collection(db, 'courses'), where('instructorName', '==', instructorName));
      const querySnapshot = await getDocs(q);
      
      const coursesData = await Promise.all(querySnapshot.docs.map(async (doc) => {
        const lessonsRef = collection(db, 'courses', doc.id, 'lessons');
        const lessonsSnapshot = await getDocs(lessonsRef);
        
        return {
          id: doc.id,
          ...doc.data(),
          lessonCount: lessonsSnapshot.size,
          image: doc.data().imageUrl || 'https://images.unsplash.com/photo-1516534775068-bb57fa6f7722?w=800&q=80',
        };
      }));
      setCourses(coursesData);
      
      // Fetch all students
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const students = usersSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(u => u.role === 'student' || u.role === 'professional');
      setAllStudents(students);
      
      // Calculate UNIQUE students (each student counted only once)
      const enrolledStudentIds = new Set();
      coursesData.forEach(course => {
        students.forEach(student => {
          if (student.enrolledCourses?.includes(course.id)) {
            enrolledStudentIds.add(student.id);
          }
        });
      });
      const uniqueStudentsCount = enrolledStudentIds.size;
      setTotalStudents(uniqueStudentsCount);
      
      // Calculate total lessons
      const lessons = coursesData.reduce((sum, course) => sum + (course.lessonCount || 0), 0);
      setTotalLessons(lessons);
      
      // Calculate total revenue
      const revenue = coursesData.reduce((sum, course) => sum + ((course.price || 0) * (course.totalStudents || 0)), 0);
      setTotalRevenue(revenue);
      
      // Calculate average rating
      const avgRating = coursesData.reduce((sum, course) => sum + (course.rating || 4.5), 0) / (coursesData.length || 1);
      setAverageRating(parseFloat(avgRating.toFixed(1)));
      
      // Calculate completion rate
      const totalEnrollments = coursesData.reduce((sum, course) => sum + (course.totalStudents || 0), 0);
      const completedEnrollments = coursesData.reduce((sum, course) => sum + (course.completedCount || 0), 0);
      setCompletionRate(totalEnrollments > 0 ? Math.round((completedEnrollments / totalEnrollments) * 100) : 0);
      
      // Calculate Engagement Rate
      let totalLessonsCompleted = 0;
      let totalPossibleCompletions = 0;
      coursesData.forEach(course => {
        totalLessonsCompleted += (course.completedCount || 0);
        totalPossibleCompletions += (course.totalStudents || 0);
      });
      setEngagementRate(totalPossibleCompletions > 0 ? Math.round((totalLessonsCompleted / totalPossibleCompletions) * 100) : 0);
      
      // Calculate Quality Score
      setQualityScore(coursesData.length > 0 ? Math.round((avgRating / 5) * 100) : 85);
      
      // Calculate Growth Rate
      const now = new Date();
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(now.getMonth() - 3);
      
      let oldEnrollments = 0;
      let newEnrollments = 0;
      coursesData.forEach(course => {
        const createdDate = course.createdAt?.toDate?.() || new Date(course.createdAt);
        if (createdDate < threeMonthsAgo) {
          oldEnrollments += (course.totalStudents || 0);
        } else {
          newEnrollments += (course.totalStudents || 0);
        }
      });
      setRealGrowthRate(oldEnrollments > 0 ? Math.round(((newEnrollments - oldEnrollments) / oldEnrollments) * 100) : (newEnrollments > 0 ? 100 : 0));
      
      // Get recent courses (last 3)
      const sorted = [...coursesData].sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(0);
        const dateB = b.createdAt?.toDate?.() || new Date(0);
        return dateB - dateA;
      });
      setRecentCourses(sorted.slice(0, 3));
      
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-700"></div>
      </div>
    );
  }

  const StatCard = ({ icon: Icon, title, value, suffix = '', color = 'green' }) => (
    <div className={`rounded-xl p-5 shadow-sm border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2 rounded-lg bg-${color}-100 dark:bg-${color}-900/30`}>
          <Icon className={`h-5 w-5 text-${color}-600 dark:text-${color}-400`} />
        </div>
        {title === 'Rating' && (
          <div className="flex gap-0.5">
            {Array(5).fill(0).map((_, i) => (
              <Star key={i} className={`h-3 w-3 ${i < averageRating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
            ))}
          </div>
        )}
      </div>
      <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{value}{suffix}</p>
      <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{title}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="mb-6">
        <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          Dashboard
        </h1>
        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          Welcome back, {user?.name?.split(' ')[0]}. Here's your teaching overview.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={BookOpen} title="Total Courses" value={courses.length} />
        <StatCard icon={Users} title="Total Students" value={totalStudents} />
        <StatCard icon={GraduationCap} title="Total Lessons" value={totalLessons} />
        <StatCard icon={Star} title="Avg Rating" value={averageRating} suffix="" />
      </div>

      {/* Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Completion & Revenue */}
        <div className="space-y-4">
          <div className={`rounded-lg p-4 shadow-sm border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className={`h-4 w-4 ${isDarkMode ? 'text-green-400' : 'text-green-600'}`} />
              <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Completion Rate</span>
            </div>
            <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{completionRate}%</p>
            <div className="mt-2 h-2 bg-gray-200 rounded-full">
              <div className="h-2 bg-green-600 rounded-full" style={{ width: `${completionRate}%` }}></div>
            </div>
          </div>
          
          <div className={`rounded-lg p-4 shadow-sm border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className={`h-4 w-4 ${isDarkMode ? 'text-yellow-400' : 'text-yellow-600'}`} />
              <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Total Revenue</span>
            </div>
            <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>₦{totalRevenue.toLocaleString()}</p>
            <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Lifetime earnings</p>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className={`rounded-lg p-4 text-center shadow-sm border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
            <Zap className="h-6 w-6 text-yellow-500 mx-auto mb-2" />
            <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{engagementRate}%</p>
            <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Engagement</p>
          </div>
          <div className={`rounded-lg p-4 text-center shadow-sm border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
            <Target className="h-6 w-6 text-blue-500 mx-auto mb-2" />
            <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{qualityScore}%</p>
            <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Quality</p>
          </div>
          <div className={`rounded-lg p-4 text-center shadow-sm border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
            <Activity className="h-6 w-6 text-green-500 mx-auto mb-2" />
            <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{realGrowthRate}%</p>
            <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Growth</p>
          </div>
          <div className={`rounded-lg p-4 text-center shadow-sm border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
            <Calendar className="h-6 w-6 text-purple-500 mx-auto mb-2" />
            <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{courses.length}</p>
            <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Active Courses</p>
          </div>
        </div>
      </div>

      {/* Recent Courses */}
      <div className={`rounded-lg p-5 shadow-sm border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
        <div className="flex justify-between items-center mb-4">
          <h3 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Recent Courses</h3>
          <Link href="/lecturer/courses" className="text-sm text-green-600 hover:text-green-700 flex items-center gap-1">
            View All <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        
        {recentCourses.length > 0 ? (
          <div className="space-y-3">
            {recentCourses.map((course, i) => (
              <div key={course.id} className={`flex items-center gap-3 py-2 border-t first:border-0 ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}>
                <div className="w-8 h-8 rounded bg-green-100 flex items-center justify-center text-green-700 font-semibold text-xs">{i+1}</div>
                <div className="flex-1">
                  <p className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{course.title}</p>
                  <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{course.lessonCount || 0} lessons • {course.totalStudents || 0} students</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-green-600">₦{course.price || 0}</p>
                  <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{course.rating || 4.5} ★</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>No courses yet</p>
            <Link href="/lecturer/courses">
              <Button className="mt-3 bg-green-700">Create Your First Course</Button>
            </Link>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <Link href="/lecturer/courses">
          <div className={`rounded-lg p-4 text-center cursor-pointer transition hover:shadow-md border ${isDarkMode ? 'bg-gray-800 border-gray-700 hover:bg-gray-700' : 'bg-white border-gray-100 hover:shadow-lg'}`}>
            <BookOpen className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Manage Courses</p>
            <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Create, edit, and organize</p>
          </div>
        </Link>
        <Link href="/lecturer/students">
          <div className={`rounded-lg p-4 text-center cursor-pointer transition hover:shadow-md border ${isDarkMode ? 'bg-gray-800 border-gray-700 hover:bg-gray-700' : 'bg-white border-gray-100 hover:shadow-lg'}`}>
            <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>View Students</p>
            <p className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Track enrolled learners</p>
          </div>
        </Link>
      </div>
    </div>
  );
}