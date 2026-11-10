
'use client';

import { useState, useEffect } from 'react';
import type { ElementType } from 'react';
import { useAuth } from '@/context/auth-context';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Star,
  Download,
} from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useTheme } from '@/context/theme-context';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

type CourseDate =
  | Date
  | string
  | number
  | { toDate?: () => Date }
  | null
  | undefined;

type LecturerCourse = {
  id: string;
  title?: string;
  instructorName?: string;
  price?: number;
  totalStudents?: number;
  rating?: number;
  completedCount?: number;
  createdAt?: CourseDate;
  level?: string;
};

type LecturerStudent = {
  id: string;
  name?: string;
  email?: string | null;
  role?: string;
  enrolledCourses?: string[];
};

type MonthlyData = {
  month: string;
  enrollments: number;
  revenue: number;
  year?: number;
  monthIndex?: number;
};

type CourseDistribution = {
  name: string;
  value: number;
  color: string;
};

type StatCardProps = {
  icon: ElementType;
  title: string;
  value: string | number;
  suffix?: string;
  trend?: number | null;
  color?: 'green' | 'blue' | 'purple' | 'red';
};

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const COLORS = ['#10b981', '#3b82f6', '#8b5cf6'];

function toDate(value: CourseDate): Date | null {
  if (value == null) return null;

  let date: Date;

  if (value instanceof Date) {
    date = value;
  } else if (typeof value === 'object' && typeof value.toDate === 'function') {
    date = value.toDate();
  } else {
    date = new Date(value as string | number);
  }

  return Number.isNaN(date.getTime()) ? null : date;
}

export default function LecturerAnalyticsPage() {
  const { user } = useAuth();
  const { theme } = useTheme();

  const isDarkMode = theme === 'dark';
  const instructorName = user?.name ?? 'Lecturer';

  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<LecturerCourse[]>([]);
  const [students, setStudents] = useState<LecturerStudent[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [courseDistribution, setCourseDistribution] =
    useState<CourseDistribution[]>([]);

  const [totalStudents, setTotalStudents] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [averageRating, setAverageRating] = useState(0);
  const [completionRate, setCompletionRate] = useState(0);
  const [engagementRate, setEngagementRate] = useState(0);
  const [growthRate, setGrowthRate] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function loadAnalytics() {
      try {
        const coursesQuery = query(
          collection(db, 'courses'),
          where('instructorName', '==', instructorName)
        );

        const coursesSnapshot = await getDocs(coursesQuery);

        const coursesData: LecturerCourse[] = coursesSnapshot.docs.map(
          (courseDoc) => {
            const data = courseDoc.data();

            return {
              id: courseDoc.id,
              title:
                typeof data.title === 'string' ? data.title : undefined,
              instructorName:
                typeof data.instructorName === 'string'
                  ? data.instructorName
                  : undefined,
              price:
                typeof data.price === 'number' ? data.price : 0,
              totalStudents:
                typeof data.totalStudents === 'number'
                  ? data.totalStudents
                  : 0,
              rating:
                typeof data.rating === 'number' ? data.rating : undefined,
              completedCount:
                typeof data.completedCount === 'number'
                  ? data.completedCount
                  : 0,
              createdAt: data.createdAt,
              level:
                typeof data.level === 'string' ? data.level : undefined,
            };
          }
        );

        const usersSnapshot = await getDocs(collection(db, 'users'));

        const studentsData: LecturerStudent[] = usersSnapshot.docs
          .map((userDoc) => {
            const data = userDoc.data();

            return {
              id: userDoc.id,
              name:
                typeof data.name === 'string' ? data.name : undefined,
              email:
                typeof data.email === 'string' ? data.email : null,
              role:
                typeof data.role === 'string' ? data.role : undefined,
              enrolledCourses: Array.isArray(data.enrolledCourses)
                ? data.enrolledCourses.filter(
                    (courseId: unknown): courseId is string =>
                      typeof courseId === 'string'
                  )
                : [],
            };
          })
          .filter(
            (student) =>
              student.role === 'student' ||
              student.role === 'professional'
          );

        if (cancelled) return;

        setCourses(coursesData);
        setStudents(studentsData);

        // Students enrolled in at least one of this lecturer's courses.
        const enrolledStudents = studentsData.filter((student) =>
          coursesData.some((course) =>
            student.enrolledCourses?.includes(course.id)
          )
        );

        setTotalStudents(enrolledStudents.length);

        const revenue = coursesData.reduce(
          (sum, course) =>
            sum + (course.price ?? 0) * (course.totalStudents ?? 0),
          0
        );

        setTotalRevenue(revenue);

        const ratedCourses = coursesData.filter(
          (course) => typeof course.rating === 'number'
        );

        const avgRating =
          ratedCourses.length > 0
            ? ratedCourses.reduce(
                (sum, course) => sum + (course.rating ?? 0),
                0
              ) / ratedCourses.length
            : 0;

        setAverageRating(Number(avgRating.toFixed(1)));

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

        // This metric uses completedCount as a proxy because individual
        // lesson-completion records are not fetched by this dashboard.
        setEngagementRate(
          totalEnrollments > 0
            ? Math.round(
                (completedEnrollments / totalEnrollments) * 100
              )
            : 0
        );

        // Compare enrollments associated with courses created before and
        // during the last three months.
        const now = new Date();
        const threeMonthsAgo = new Date();
        threeMonthsAgo.setMonth(now.getMonth() - 3);

        let oldEnrollments = 0;
        let recentEnrollments = 0;

        coursesData.forEach((course) => {
          const createdDate = toDate(course.createdAt);
          if (!createdDate) return;

          if (createdDate < threeMonthsAgo) {
            oldEnrollments += course.totalStudents ?? 0;
          } else {
            recentEnrollments += course.totalStudents ?? 0;
          }
        });

        setGrowthRate(
          oldEnrollments > 0
            ? Math.round(
                ((recentEnrollments - oldEnrollments) /
                  oldEnrollments) *
                  100
              )
            : recentEnrollments > 0
              ? 100
              : 0
        );

        // Group courses by year and month, then sort chronologically.
        const monthlyMap = new Map<string, MonthlyData>();

        coursesData.forEach((course) => {
          const createdDate = toDate(course.createdAt);
          if (!createdDate) return;

          const monthIndex = createdDate.getMonth();
          const year = createdDate.getFullYear();
          const key = `${year}-${String(monthIndex).padStart(2, '0')}`;

          const existing = monthlyMap.get(key) ?? {
            month: `${MONTHS[monthIndex]} ${year}`,
            enrollments: 0,
            revenue: 0,
            year,
            monthIndex,
          };

          existing.enrollments += course.totalStudents ?? 0;
          existing.revenue +=
            (course.price ?? 0) * (course.totalStudents ?? 0);

          monthlyMap.set(key, existing);
        });

        const realMonthlyData = Array.from(monthlyMap.values())
          .sort((a, b) => {
            const yearDifference = (a.year ?? 0) - (b.year ?? 0);
            return yearDifference !== 0
              ? yearDifference
              : (a.monthIndex ?? 0) - (b.monthIndex ?? 0);
          })
          .slice(-6)
          .map(({ month, enrollments, revenue }) => ({
            month,
            enrollments,
            revenue,
          }));

        setMonthlyData(
          realMonthlyData.length > 0
            ? realMonthlyData
            : MONTHS.slice(0, 6).map((month) => ({
                month,
                enrollments: 0,
                revenue: 0,
              }))
        );

        const beginner = coursesData.filter(
          (course) => course.level === 'beginner'
        ).length;

        const intermediate = coursesData.filter(
          (course) => course.level === 'intermediate'
        ).length;

        const advanced = coursesData.filter(
          (course) => course.level === 'advanced'
        ).length;

        setCourseDistribution([
          { name: 'Beginner', value: beginner, color: '#10b981' },
          { name: 'Intermediate', value: intermediate, color: '#3b82f6' },
          { name: 'Advanced', value: advanced, color: '#8b5cf6' },
        ]);
      } catch (error) {
        console.error('Error fetching lecturer analytics:', error);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadAnalytics();

    return () => {
      cancelled = true;
    };
  }, [instructorName]);

  const handleExportReport = () => {
    const csvData: (string | number)[][] = [
      ['Analytics Report', `Generated: ${new Date().toLocaleString()}`],
      [],
      ['Summary Metrics'],
      ['Metric', 'Value'],
      ['Total Students', totalStudents],
      ['Total Revenue', `₦${totalRevenue.toLocaleString()}`],
      ['Average Rating', `${averageRating} / 5`],
      ['Completion Rate', `${completionRate}%`],
      ['Engagement Rate', `${engagementRate}%`],
      ['Growth Rate', `${growthRate}%`],
      ['Total Courses', courses.length],
      [],
      ['Monthly Trends'],
      ['Month', 'Enrollments', 'Revenue (₦)'],
      ...monthlyData.map((item) => [
        item.month,
        item.enrollments,
        item.revenue,
      ]),
      [],
      ['Course Distribution by Level'],
      ['Level', 'Count'],
      ...courseDistribution.map((item) => [item.name, item.value]),
    ];

    // Escape CSV values so commas and quotes do not break the report.
    const escapeCsv = (value: string | number) =>
      `"${String(value).replace(/"/g, '""')}"`;

    const csvContent = csvData
      .map((row) => row.map(escapeCsv).join(','))
      .join('\r\n');

    const blob = new Blob(['\uFEFF', csvContent], {
      type: 'text/csv;charset=utf-8;',
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = `analytics_report_${
      new Date().toISOString().split('T')[0]
    }.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const StatCard = ({
    icon: Icon,
    title,
    value,
    suffix = '',
    trend = null,
    color = 'green',
  }: StatCardProps) => {
    const colorClasses = {
      green: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
      blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
      purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
      red: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
    };

    return (
      <div
        className={`rounded-xl p-5 shadow-sm border ${
          isDarkMode
            ? 'bg-gray-800 border-gray-700'
            : 'bg-white border-gray-100'
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
            <Icon className="h-5 w-5" />
          </div>

          {trend !== null && (
            <span
              className={`text-xs flex items-center gap-1 ${
                trend >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {trend >= 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {Math.abs(trend)}%
            </span>
          )}
        </div>

        <p
          className={`text-2xl font-bold ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}
        >
          {value}{suffix}
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
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-700" />
      </div>
    );
  }

  const cardClass = `p-5 ${
    isDarkMode ? 'bg-gray-800 border-gray-700' : ''
  }`;

  const headingClass = `font-semibold mb-4 ${
    isDarkMode ? 'text-white' : 'text-gray-900'
  }`;

  return (
    <div className="space-y-6">
      <div>
        <h1
          className={`text-2xl font-bold ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}
        >
          Analytics
        </h1>
        <p
          className={`text-sm ${
            isDarkMode ? 'text-gray-400' : 'text-gray-500'
          }`}
        >
          Track your teaching performance and insights
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          title="Total Students"
          value={totalStudents}
        />
        <StatCard
          icon={DollarSign}
          title="Total Revenue"
          value={`₦${totalRevenue.toLocaleString()}`}
          color="blue"
        />
        <StatCard
          icon={Star}
          title="Avg Rating"
          value={averageRating}
          suffix="/5"
          color="purple"
        />
        <StatCard
          icon={TrendingUp}
          title="Completion Rate"
          value={completionRate}
          suffix="%"
          color="green"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className={cardClass}>
          <h3 className={headingClass}>Enrollment Trends</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={isDarkMode ? '#374151' : '#e5e7eb'}
                />
                <XAxis
                  dataKey="month"
                  stroke={isDarkMode ? '#9ca3af' : '#6b7280'}
                />
                <YAxis
                  stroke={isDarkMode ? '#9ca3af' : '#6b7280'}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDarkMode ? '#1f2937' : '#fff',
                    border: 'none',
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="enrollments"
                  stroke="#10b981"
                  strokeWidth={2}
                  name="Enrollments"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className={cardClass}>
          <h3 className={headingClass}>Revenue Trends (₦)</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={isDarkMode ? '#374151' : '#e5e7eb'}
                />
                <XAxis
                  dataKey="month"
                  stroke={isDarkMode ? '#9ca3af' : '#6b7280'}
                />
                <YAxis
                  stroke={isDarkMode ? '#9ca3af' : '#6b7280'}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDarkMode ? '#1f2937' : '#fff',
                    border: 'none',
                  }}
                />
                <Legend />
                <Bar
                  dataKey="revenue"
                  fill="#3b82f6"
                  name="Revenue (₦)"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className={cardClass}>
          <h3 className={headingClass}>
            Course Distribution by Level
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={courseDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={100}
                  dataKey="value"
                >
                  {courseDistribution.map((entry, index) => (
                    <Cell
                      key={`cell-${entry.name}-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDarkMode ? '#1f2937' : '#fff',
                    border: 'none',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className={cardClass}>
          <h3 className={headingClass}>Performance Metrics</h3>

          <div className="space-y-6">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>
                  Engagement Rate
                </span>
                <span className="font-semibold text-green-600">
                  {engagementRate}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full"
                  style={{
                    width: `${Math.min(100, Math.max(0, engagementRate))}%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>
                  Growth Rate
                </span>
                <span
                  className={`font-semibold ${
                    growthRate >= 0 ? 'text-blue-600' : 'text-red-600'
                  }`}
                >
                  {growthRate}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    growthRate >= 0 ? 'bg-blue-600' : 'bg-red-600'
                  }`}
                  style={{
                    width: `${Math.min(100, Math.max(0, Math.abs(growthRate)))}%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>
                  Quality Score
                </span>
                <span className="font-semibold text-purple-600">
                  {Math.round(averageRating * 20)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-purple-600 h-2 rounded-full"
                  style={{
                    width: `${Math.min(100, Math.max(0, averageRating * 20))}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button
          variant="outline"
          className="gap-2"
          onClick={handleExportReport}
        >
          <Download className="h-4 w-4" />
          Export Report
        </Button>
      </div>
    </div>
  );
}
