
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { db } from '@/lib/firebase';
import {
  collection,
  getDocs,
  doc,
  getDoc,
} from 'firebase/firestore';
import {
  BookOpen,
  Award,
  Clock,
  TrendingUp,
  Target,
  Activity,
  Flame,
  Star,
  RefreshCw,
  Sparkles,
  Crown,
  type LucideIcon,
} from 'lucide-react';
import { useTheme } from '@/context/theme-context';
import ClimateTutor from '@/components/climate-tutor/ClimateTutor';

type DashboardCourse = {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  duration: number;
  instructorName: string;
  rating: number;
  lessonCount: number;
  progress: number;
  isCompleted: boolean;
  completedLessonsCount: number;
};

type StatCardProps = {
  icon: LucideIcon;
  label: string;
  value: string | number;
  color?: string;
};

type MetricCardProps = {
  icon: LucideIcon;
  label: string;
  value: string | number;
  progress: number;
  color?: string;
};

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  const [enrolledCoursesData, setEnrolledCoursesData] = useState<DashboardCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [totalWatchMinutes, setTotalWatchMinutes] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  useEffect(() => {
    if (user?.role === 'lecturer') {
      router.push('/lecturer');
    }

    if (user?.role === 'admin') {
      router.push('/admin');
    }
  }, [user, router]);

  useEffect(() => {
    if (user) {
      fetchAllData();
    } else {
      setLoading(false);
    }
    // fetchAllData is intentionally triggered when the authenticated user changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (user?.role === 'lecturer' || user?.role === 'admin') {
    return null;
  }

  const fetchAllData = async () => {
    try {
      setSyncing(true);

      const userCompletedCourses = user?.completedCourses || [];
      const enrolledCourses = user?.enrolledCourses || [];

      const coursesList: DashboardCourse[] = [];
      let totalWatchTime = 0;

      for (const courseId of enrolledCourses) {
        const courseRef = doc(db, 'courses', courseId);
        const courseSnap = await getDoc(courseRef);

        if (!courseSnap.exists()) {
          continue;
        }

        const courseData = courseSnap.data();
        const isCompleted = userCompletedCourses.includes(courseId);

        const lessonsRef = collection(
          db,
          'courses',
          courseId,
          'lessons'
        );

        const lessonsSnapshot = await getDocs(lessonsRef);
        const lessonCount = lessonsSnapshot.size;

        let progress = 0;
        let completedLessonsCount = 0;

        if (isCompleted) {
          progress = 100;
          totalWatchTime += lessonCount * 7;
        } else {
          const savedProgress = localStorage.getItem(
            `completed_lessons_${user?.uid}_${courseId}`
          );

          if (savedProgress) {
            try {
              const completed: string[] = JSON.parse(savedProgress);

              completedLessonsCount = completed.length;

              progress =
                lessonCount > 0
                  ? Math.round(
                      (completedLessonsCount / lessonCount) * 100
                    )
                  : 0;

              totalWatchTime += Math.floor(
                (progress / 100) * lessonCount * 7
              );
            } catch {
              console.error(
                `Invalid saved lesson progress for course ${courseId}`
              );
            }
          }
        }

        coursesList.push({
          id: courseId,
          title: courseData.title || 'Untitled Course',
          description: courseData.description || '',
          imageUrl: courseData.imageUrl || '',
          duration: Number(courseData.duration) || 0,
          instructorName: courseData.instructorName || '',
          rating: Number(courseData.rating) || 4.5,
          lessonCount,
          progress,
          isCompleted,
          completedLessonsCount,
        });
      }

      setEnrolledCoursesData(coursesList);
      setTotalWatchMinutes(totalWatchTime);

      const now = new Date();
      setLastSyncTime(now.toLocaleTimeString());

      if (user?.uid) {
        localStorage.setItem(
          `last_sync_${user.uid}`,
          now.toISOString()
        );
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  };

  const handleManualSync = async () => {
    if (syncing) return;

    setSyncing(true);
    await fetchAllData();
    setSyncing(false);
  };

  const enrolledCount = enrolledCoursesData.length;

  const completedCount = enrolledCoursesData.filter(
    (course) => course.isCompleted
  ).length;

  const inProgressCount = enrolledCoursesData.filter(
    (course) => !course.isCompleted && course.progress > 0
  ).length;

  const avgProgress =
    enrolledCount > 0
      ? Math.round(
          enrolledCoursesData.reduce(
            (sum, course) => sum + course.progress,
            0
          ) / enrolledCount
        )
      : 0;

  const totalHours = Math.floor(totalWatchMinutes / 60);

  const engagementRate =
    enrolledCount > 0
      ? Math.round((completedCount / enrolledCount) * 100)
      : 0;

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
      </div>
    );
  }

  const StatCard = ({
    icon: Icon,
    label,
    value,
    color = 'green',
  }: StatCardProps) => (
    <div
      className={`p-4 rounded-xl border ${
        isDarkMode
          ? 'bg-gray-800/50 border-gray-700'
          : 'bg-white border-gray-100'
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p
            className={`text-xs font-medium uppercase tracking-wider ${
              isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`}
          >
            {label}
          </p>
          <p
            className={`text-2xl font-bold mt-1 ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}
          >
            {value}
          </p>
        </div>

        <div className={`p-2 rounded-lg bg-${color}-50 dark:bg-${color}-900/20`}>
          <Icon
            className={`h-5 w-5 text-${color}-600 dark:text-${color}-400`}
          />
        </div>
      </div>
    </div>
  );

  const MetricCard = ({
    icon: Icon,
    label,
    value,
    progress,
    color = 'green',
  }: MetricCardProps) => (
    <div
      className={`p-4 rounded-xl border ${
        isDarkMode
          ? 'bg-gray-800/50 border-gray-700'
          : 'bg-white border-gray-100'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg bg-${color}-100 dark:bg-${color}-900/30`}>
          <Icon
            className={`h-5 w-5 text-${color}-600 dark:text-${color}-400`}
          />
        </div>

        <div className="flex-1">
          <p
            className={`text-xs ${
              isDarkMode ? 'text-gray-400' : 'text-gray-500'
            }`}
          >
            {label}
          </p>
          <p
            className={`text-xl font-semibold ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}
          >
            {value}
          </p>
        </div>
      </div>

      <div className="mt-3">
        <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full bg-${color}-600 rounded-full transition-all duration-500`}
            style={{
              width: `${Math.min(100, Math.max(0, progress))}%`,
            }}
          />
        </div>
      </div>
    </div>
  );

  const inProgressCourses = enrolledCoursesData.filter(
    (course) => !course.isCompleted && course.progress > 0
  );

  const notStartedCourses = enrolledCoursesData.filter(
    (course) => !course.isCompleted && course.progress === 0
  );

  const completedCourses = enrolledCoursesData.filter(
    (course) => course.isCompleted
  );

  return (
    <div className="flex-1">
      <div className="border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">
                Dashboard
              </h1>

              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Welcome back, {user?.name?.split(' ')[0] || 'Student'}
              </p>
            </div>

            <div className="flex gap-2">
              {lastSyncTime && (
                <span
                  className={`text-xs hidden sm:block ${
                    isDarkMode ? 'text-gray-500' : 'text-gray-400'
                  } self-center`}
                >
                  Last sync: {lastSyncTime}
                </span>
              )}

              <Button
                size="sm"
                variant="outline"
                onClick={handleManualSync}
                disabled={syncing}
                className="gap-2"
              >
                {syncing ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Sync
              </Button>

              <Link href="/courses">
                <Button size="sm" variant="outline" className="gap-2">
                  <BookOpen className="h-4 w-4" />
                  Browse Courses
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard
            icon={BookOpen}
            label="Enrolled"
            value={enrolledCount}
            color="green"
          />
          <StatCard
            icon={Award}
            label="Completed"
            value={completedCount}
            color="blue"
          />
          <StatCard
            icon={Clock}
            label="Hours Watched"
            value={totalHours}
            color="purple"
          />
          <StatCard
            icon={TrendingUp}
            label="Avg Progress"
            value={`${avgProgress}%`}
            color="orange"
          />
        </div>

        {/* Progress Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <MetricCard
            icon={Target}
            label="Completion Rate"
            value={`${avgProgress}%`}
            progress={avgProgress}
            color="green"
          />

          <MetricCard
            icon={Activity}
            label="Engagement"
            value={`${engagementRate}%`}
            progress={engagementRate}
            color="blue"
          />

          <div
            className={`p-4 rounded-xl border ${
              isDarkMode
                ? 'bg-gray-800/50 border-gray-700'
                : 'bg-white border-gray-100'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                <Flame className="h-5 w-5 text-orange-600" />
              </div>

              <div className="flex-1">
                <p
                  className={`text-xs ${
                    isDarkMode ? 'text-gray-400' : 'text-gray-500'
                  }`}
                >
                  Learning Streak
                </p>

                <p
                  className={`text-xl font-semibold ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}
                >
                  {completedCount > 0
                    ? `${completedCount} day${completedCount > 1 ? 's' : ''}`
                    : '0 days'}
                </p>
              </div>
            </div>

            <div className="mt-3">
              <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-orange-600 rounded-full"
                  style={{
                    width: `${Math.min(completedCount * 20, 100)}%`,
                  }}
                />
              </div>

              <p className="text-xs text-gray-500 mt-2">
                Complete courses to increase your streak!
              </p>
            </div>
          </div>
        </div>

        {/* Continue Learning Section */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Continue Learning
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Pick up where you left off
              </p>
            </div>
          </div>

          {inProgressCourses.length > 0 ? (
            <div className="space-y-3">
              {inProgressCourses.map((course) => (
                <Link
                  key={`inprogress-${course.id}`}
                  href={`/courses/${course.id}`}
                >
                  <div
                    className={`group rounded-xl border overflow-hidden transition-all duration-300 hover:shadow-md cursor-pointer ${
                      isDarkMode
                        ? 'bg-gray-800/50 border-gray-700 hover:bg-gray-800'
                        : 'bg-white border-gray-100 hover:shadow-lg'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row">
                      <div className="sm:w-32 w-full h-28 sm:h-24 bg-gray-100 dark:bg-gray-700 overflow-hidden">
                        <img
                          src={
                            course.imageUrl ||
                            'https://images.unsplash.com/photo-1446776653964-20c1d3a81b06'
                          }
                          alt={course.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>

                      <div className="flex-1 p-4">
                        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                          <div>
                            <h3
                              className={`font-medium text-sm sm:text-base ${
                                isDarkMode ? 'text-white' : 'text-gray-900'
                              }`}
                            >
                              {course.title}
                            </h3>

                            <p
                              className={`text-xs ${
                                isDarkMode ? 'text-gray-400' : 'text-gray-500'
                              }`}
                            >
                              {course.instructorName || 'Shara Academy'}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                              <span
                                className={`text-xs ${
                                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                                }`}
                              >
                                {course.rating}
                              </span>
                            </div>

                            <span
                              className={`text-xs ${
                                isDarkMode ? 'text-gray-600' : 'text-gray-300'
                              }`}
                            >
                              •
                            </span>

                            <span
                              className={`text-xs ${
                                isDarkMode ? 'text-gray-400' : 'text-gray-500'
                              }`}
                            >
                              {course.lessonCount} lessons
                            </span>
                          </div>
                        </div>

                        <div className="mt-3">
                          <div className="flex justify-between text-xs mb-1">
                            <span
                              className={
                                isDarkMode ? 'text-gray-400' : 'text-gray-500'
                              }
                            >
                              Progress
                            </span>
                            <span className="font-medium text-green-600">
                              {course.progress}%
                            </span>
                          </div>

                          <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-green-600 rounded-full transition-all"
                              style={{ width: `${course.progress}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : notStartedCourses.length > 0 ? (
            <div className="space-y-3">
              {notStartedCourses.map((course) => (
                <Link
                  key={`notstarted-${course.id}`}
                  href={`/courses/${course.id}`}
                >
                  <div
                    className={`group rounded-xl border overflow-hidden transition-all duration-300 hover:shadow-md cursor-pointer ${
                      isDarkMode
                        ? 'bg-gray-800/50 border-gray-700 hover:bg-gray-800'
                        : 'bg-white border-gray-100 hover:shadow-lg'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row">
                      <div className="sm:w-32 w-full h-28 sm:h-24 bg-gray-100 dark:bg-gray-700 overflow-hidden">
                        <img
                          src={
                            course.imageUrl ||
                            'https://images.unsplash.com/photo-1446776653964-20c1d3a81b06'
                          }
                          alt={course.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>

                      <div className="flex-1 p-4">
                        <h3
                          className={`font-medium text-sm sm:text-base ${
                            isDarkMode ? 'text-white' : 'text-gray-900'
                          }`}
                        >
                          {course.title}
                        </h3>

                        <p
                          className={`text-xs mt-1 ${
                            isDarkMode ? 'text-gray-400' : 'text-gray-500'
                          }`}
                        >
                          {course.instructorName || 'Shara Academy'}
                        </p>

                        <div className="mt-3">
                          <Button
                            size="sm"
                            className="bg-green-700 hover:bg-green-800"
                          >
                            Start Learning
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : enrolledCount > 0 && completedCount === enrolledCount ? (
            <div
              className={`text-center py-12 rounded-xl border ${
                isDarkMode
                  ? 'bg-gray-800/50 border-gray-700'
                  : 'bg-white border-gray-100'
              }`}
            >
              <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <Award className="h-7 w-7 text-green-600" />
              </div>

              <h3
                className={`text-base font-medium mb-1 ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}
              >
                All Courses Completed! 🎉
              </h3>

              <p
                className={`text-sm mb-4 ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}
              >
                Great job! Enroll in new courses to continue learning
              </p>

              <Link href="/courses">
                <Button className="bg-green-700 hover:bg-green-800">
                  Browse More Courses
                </Button>
              </Link>
            </div>
          ) : (
            <div
              className={`text-center py-12 rounded-xl border ${
                isDarkMode
                  ? 'bg-gray-800/50 border-gray-700'
                  : 'bg-white border-gray-100'
              }`}
            >
              <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                <BookOpen className="h-7 w-7 text-gray-400" />
              </div>

              <h3
                className={`text-base font-medium mb-1 ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}
              >
                No courses enrolled
              </h3>

              <p
                className={`text-sm mb-4 ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-500'
                }`}
              >
                Enroll in a course to start learning
              </p>

              <Link href="/courses">
                <Button className="bg-green-700 hover:bg-green-800">
                  Browse Courses
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Milestone */}
        {avgProgress > 0 && avgProgress < 100 && (
          <div
            className={`rounded-xl border p-5 ${
              isDarkMode
                ? 'bg-gray-800/50 border-gray-700'
                : 'bg-white border-gray-100'
            }`}
          >
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-5 w-5 text-purple-500" />
              <h3
                className={`text-base font-semibold ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}
              >
                Next Milestone
              </h3>
            </div>

            <p
              className={`text-2xl font-bold ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}
            >
              {Math.ceil(avgProgress / 25) * 25}%
            </p>

            <p
              className={`text-xs mt-1 ${
                isDarkMode ? 'text-gray-400' : 'text-gray-500'
              }`}
            >
              Complete {Math.ceil(avgProgress / 25) * 25 - avgProgress}% more
              to reach your next milestone
            </p>

            <div className="mt-3">
              <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-600 rounded-full transition-all"
                  style={{ width: `${avgProgress % 25}%` }}
                />
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Unlock rewards at 100%
              </span>
              <Crown className="h-4 w-4 text-yellow-500" />
            </div>
          </div>
        )}

        {/* AI Climate Tutor (N-ATLAS) */}
        <div className="mt-6">
          <ClimateTutor />
        </div>
      </div>
    </div>
  );
}
