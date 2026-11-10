
'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts'
import { Download, TrendingUp } from 'lucide-react'
import { db } from '@/lib/firebase'
import { collection, getDocs } from 'firebase/firestore'

type UserRecord = {
  id: string
  role?: string
}

type CourseRecord = {
  id: string
  title?: string
  category?: string
  level?: string
  price?: number
  totalStudents?: number
  rating?: number
}

type RoleDistribution = {
  name: string
  value: number
  color: string
}

type LevelDistribution = {
  name: string
  value: number
}

type UserBehavior = {
  day: string
  newUsers: number
  activeUsers: number
  enrollments: number
}

type CoursePerformance = {
  name: string
  completion: number
  satisfaction: number
  enrollment: number
}

type RevenueCategory = {
  name: string
  value: number
}

type AnalyticsData = {
  roleDistribution: RoleDistribution[]
  levelDistribution: LevelDistribution[]
  userBehavior: UserBehavior[]
  coursePerformance: CoursePerformance[]
  revenueByCategory: RevenueCategory[]
  avgEnrollmentPerDay: number
  overallSatisfaction: number
  avgCompletionTime: number
}

const COLORS = ['#1a6b3c', '#0ea5e9', '#f97316']

const REVENUE_COLORS = [
  '#1a6b3c',
  '#0ea5e9',
  '#f97316',
  '#ec4899',
  '#8b5cf6',
  '#14b8a6',
  '#f59e0b',
]

const DEFAULT_USER_BEHAVIOR: UserBehavior[] = [
  { day: 'Mon', newUsers: 45, activeUsers: 380, enrollments: 82 },
  { day: 'Tue', newUsers: 52, activeUsers: 410, enrollments: 95 },
  { day: 'Wed', newUsers: 48, activeUsers: 390, enrollments: 87 },
  { day: 'Thu', newUsers: 61, activeUsers: 450, enrollments: 108 },
  { day: 'Fri', newUsers: 55, activeUsers: 420, enrollments: 98 },
  { day: 'Sat', newUsers: 42, activeUsers: 310, enrollments: 72 },
  { day: 'Sun', newUsers: 38, activeUsers: 280, enrollments: 65 },
]

const DROP_OFF_DATA = [
  { stage: 'Enrolled', percentage: 100 },
  { stage: 'Started', percentage: 85 },
  { stage: 'Mid-Course', percentage: 72 },
  { stage: 'Completed', percentage: 58 },
  { stage: 'Certified', percentage: 45 },
]

const INITIAL_ANALYTICS_DATA: AnalyticsData = {
  roleDistribution: [],
  levelDistribution: [],
  userBehavior: DEFAULT_USER_BEHAVIOR,
  coursePerformance: [],
  revenueByCategory: [],
  avgEnrollmentPerDay: 0,
  overallSatisfaction: 0,
  avgCompletionTime: 32,
}

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState('7d')
  const [loading, setLoading] = useState(true)
  const [analyticsData, setAnalyticsData] =
    useState<AnalyticsData>(INITIAL_ANALYTICS_DATA)

  useEffect(() => {
    let cancelled = false

    async function fetchAnalyticsData() {
      try {
        const [usersSnapshot, coursesSnapshot] = await Promise.all([
          getDocs(collection(db, 'users')),
          getDocs(collection(db, 'courses')),
        ])

        const users: UserRecord[] = usersSnapshot.docs.map((userDoc) => {
          const data = userDoc.data()

          return {
            id: userDoc.id,
            role: typeof data.role === 'string' ? data.role : undefined,
          }
        })

        const courses: CourseRecord[] = coursesSnapshot.docs.map(
          (courseDoc) => {
            const data = courseDoc.data()

            return {
              id: courseDoc.id,
              title:
                typeof data.title === 'string' ? data.title : undefined,
              category:
                typeof data.category === 'string'
                  ? data.category
                  : undefined,
              level:
                typeof data.level === 'string' ? data.level : undefined,
              price:
                typeof data.price === 'number' ? data.price : 0,
              totalStudents:
                typeof data.totalStudents === 'number'
                  ? data.totalStudents
                  : 0,
              rating:
                typeof data.rating === 'number' ? data.rating : undefined,
            }
          }
        )

        const students = users.filter(
          (user) => user.role === 'student',
        ).length

        const professionals = users.filter(
          (user) => user.role === 'professional',
        ).length

        const admins = users.filter(
          (user) => user.role === 'admin',
        ).length

        const roleDistribution: RoleDistribution[] = [
          { name: 'Students', value: students, color: '#3b82f6' },
          {
            name: 'Professionals',
            value: professionals,
            color: '#a855f7',
          },
          { name: 'Admins', value: admins, color: '#16a34a' },
        ]

        const beginner = courses.filter(
          (course) => course.level?.toLowerCase() === 'beginner',
        ).length

        const intermediate = courses.filter(
          (course) => course.level?.toLowerCase() === 'intermediate',
        ).length

        const advanced = courses.filter(
          (course) => course.level?.toLowerCase() === 'advanced',
        ).length

        const levelDistribution: LevelDistribution[] = [
          { name: 'Beginner', value: beginner },
          { name: 'Intermediate', value: intermediate },
          { name: 'Advanced', value: advanced },
        ]

        const categoryMap = new Map<string, number>()

        courses.forEach((course) => {
          const category = course.category || 'Uncategorized'
          const revenue =
            (course.price ?? 0) * (course.totalStudents ?? 0)

          categoryMap.set(
            category,
            (categoryMap.get(category) ?? 0) + revenue,
          )
        })

        const revenueByCategory: RevenueCategory[] = Array.from(
          categoryMap.entries(),
        ).map(([name, value]) => ({
          name,
          value,
        }))

        const coursePerformance: CoursePerformance[] = courses
          .slice(0, 6)
          .map((course) => ({
            name: course.title?.substring(0, 12) || 'Unknown',
            completion:
              (course.totalStudents ?? 0) > 0 ? 60 : 0,
            satisfaction: (course.rating ?? 4.5) * 20,
            enrollment: Math.min(
              ((course.totalStudents ?? 0) / 100) * 20,
              100,
            ),
          }))

        const totalEnrollments = courses.reduce(
          (sum, course) => sum + (course.totalStudents ?? 0),
          0,
        )

        const avgEnrollmentPerDay = Math.round(
          totalEnrollments / 30,
        )

        const ratedCourses = courses.filter(
          (course) => typeof course.rating === 'number',
        )

        const overallSatisfaction =
          ratedCourses.length > 0
            ? ratedCourses.reduce(
                (sum, course) => sum + (course.rating ?? 0),
                0,
              ) / ratedCourses.length
            : 0

        if (cancelled) return

        setAnalyticsData({
          roleDistribution,
          levelDistribution,
          userBehavior: DEFAULT_USER_BEHAVIOR,
          coursePerformance,
          revenueByCategory,
          avgEnrollmentPerDay,
          overallSatisfaction,
          avgCompletionTime: 32,
        })
      } catch (error) {
        console.error('Error fetching analytics data:', error)
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void fetchAnalyticsData()

    return () => {
      cancelled = true
    }
  }, [])

  const handleGenerateReport = () => {
    const rows: (string | number)[][] = [
      ['Analytics & Reports'],
      ['Date range', dateRange],
      ['Generated at', new Date().toLocaleString()],
      [],
      ['Platform Metrics'],
      ['Metric', 'Value'],
      ['Average Enrollment Per Day', analyticsData.avgEnrollmentPerDay],
      ['Overall Satisfaction', analyticsData.overallSatisfaction.toFixed(1)],
      ['Average Completion Time (days)', analyticsData.avgCompletionTime],
      [],
      ['User Distribution'],
      ['Role', 'Count'],
      ...analyticsData.roleDistribution.map((item) => [
        item.name,
        item.value,
      ]),
      [],
      ['Course Level Distribution'],
      ['Level', 'Count'],
      ...analyticsData.levelDistribution.map((item) => [
        item.name,
        item.value,
      ]),
      [],
      ['Revenue by Category'],
      ['Category', 'Estimated Revenue (NGN)'],
      ...analyticsData.revenueByCategory.map((item) => [
        item.name,
        item.value,
      ]),
      [],
      ['Course Performance'],
      ['Course', 'Completion (%)', 'Satisfaction (%)', 'Enrollment (%)'],
      ...analyticsData.coursePerformance.map((item) => [
        item.name,
        item.completion,
        item.satisfaction,
        item.enrollment,
      ]),
    ]

    const escapeCsv = (value: string | number) =>
      `"${String(value).replace(/"/g, '""')}"`

    const csvContent = rows
      .map((row) => row.map(escapeCsv).join(','))
      .join('\r\n')

    const blob = new Blob(['\uFEFF', csvContent], {
      type: 'text/csv;charset=utf-8;',
    })

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = `analytics-report-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-green-700" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            Analytics &amp; Reports
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Comprehensive platform insights and metrics
          </p>
        </div>

        <Button
          className="flex w-full items-center gap-2 md:w-auto"
          onClick={handleGenerateReport}
        >
          <Download size={18} />
          Generate Report
        </Button>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap gap-2">
          {[
            { value: '7d', label: 'Last 7 Days' },
            { value: '30d', label: 'Last 30 Days' },
            { value: '90d', label: 'Last 90 Days' },
            { value: '1y', label: 'Last Year' },
            { value: 'all', label: 'All Time' },
          ].map((range) => (
            <button
              key={range.value}
              type="button"
              onClick={() => setDateRange(range.value)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                dateRange === range.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-foreground hover:bg-muted/80'
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                Avg Enrollment/Day
              </p>
              <p className="mt-2 text-3xl font-bold text-foreground">
                {analyticsData.avgEnrollmentPerDay}
              </p>
            </div>
            <TrendingUp size={24} className="text-green-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                Overall Satisfaction
              </p>
              <p className="mt-2 text-3xl font-bold text-foreground">
                {analyticsData.overallSatisfaction.toFixed(1)}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                / 5.0 stars
              </p>
            </div>
            <div className="text-2xl">⭐</div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                Avg. Time to Completion
              </p>
              <p className="mt-2 text-3xl font-bold text-foreground">
                {analyticsData.avgCompletionTime}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">days</p>
            </div>
            <TrendingUp size={24} className="text-blue-600" />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h3 className="mb-4 text-lg font-semibold text-foreground">
            User Behavior Trends
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analyticsData.userBehavior}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="day" stroke="#666" />
              <YAxis stroke="#666" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                }}
              />
              <Legend />
              <Bar dataKey="newUsers" fill="#0ea5e9" name="New Users" />
              <Bar dataKey="activeUsers" fill="#1a6b3c" name="Active Users" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h3 className="mb-4 text-lg font-semibold text-foreground">
            User Distribution by Role
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={analyticsData.roleDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={100}
                dataKey="value"
              >
                {analyticsData.roleDistribution.map((entry, index) => (
                  <Cell
                    key={`role-${entry.name}-${index}`}
                    fill={entry.color}
                  />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h3 className="mb-4 text-lg font-semibold text-foreground">
            Course Drop-off Analysis
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={DROP_OFF_DATA} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis type="number" stroke="#666" />
              <YAxis
                dataKey="stage"
                type="category"
                stroke="#666"
                width={100}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                }}
              />
              <Bar
                dataKey="percentage"
                fill="#1a6b3c"
                name="Completion (%)"
              />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h3 className="mb-4 text-lg font-semibold text-foreground">
            Course Level Distribution
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analyticsData.levelDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" stroke="#666" />
              <YAxis stroke="#666" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                }}
              />
              <Bar dataKey="value" fill="#0ea5e9" name="Number of Courses" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="mb-4 text-lg font-semibold text-foreground">
          Course Performance Analysis
        </h3>
        <ResponsiveContainer width="100%" height={400}>
          <RadarChart data={analyticsData.coursePerformance}>
            <PolarGrid stroke="#e5e7eb" />
            <PolarAngleAxis dataKey="name" stroke="#666" />
            <PolarRadiusAxis angle={90} domain={[0, 100]} stroke="#666" />
            <Radar
              name="Completion Rate %"
              dataKey="completion"
              stroke="#1a6b3c"
              fill="#1a6b3c"
              fillOpacity={0.6}
            />
            <Radar
              name="Satisfaction %"
              dataKey="satisfaction"
              stroke="#0ea5e9"
              fill="#0ea5e9"
              fillOpacity={0.6}
            />
            <Radar
              name="Enrollment %"
              dataKey="enrollment"
              stroke="#f97316"
              fill="#f97316"
              fillOpacity={0.6}
            />
            <Legend />
            <Tooltip />
          </RadarChart>
        </ResponsiveContainer>
      </Card>

      <Card className="p-6">
        <h3 className="mb-4 text-lg font-semibold text-foreground">
          Revenue by Course Category
        </h3>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={analyticsData.revenueByCategory}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) =>
                  `${name}: ₦${(Number(value) / 1000).toFixed(1)}k`
                }
                outerRadius={100}
                dataKey="value"
              >
                {analyticsData.revenueByCategory.map((item, index) => (
                  <Cell
                    key={`revenue-${item.name}-${index}`}
                    fill={REVENUE_COLORS[index % REVENUE_COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) =>
                  `₦${Number(value ?? 0).toLocaleString()}`
                }
              />
            </PieChart>
          </ResponsiveContainer>

          <div className="space-y-3">
            {analyticsData.revenueByCategory.map((item, index) => (
              <div
                key={item.name}
                className="flex items-center justify-between rounded-lg p-2 hover:bg-muted"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{
                      backgroundColor:
                        REVENUE_COLORS[index % REVENUE_COLORS.length],
                    }}
                  />
                  <span className="text-sm font-medium text-foreground">
                    {item.name}
                  </span>
                </div>

                <span className="text-sm font-semibold text-green-600">
                  ₦{item.value.toLocaleString()}
                </span>
              </div>
            ))}

            {analyticsData.revenueByCategory.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No course revenue data is available yet.
              </p>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}
