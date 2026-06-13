'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  LineChart,
  Line,
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

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState('7d')
  const [loading, setLoading] = useState(true)
  const [analyticsData, setAnalyticsData] = useState({
    roleDistribution: [],
    levelDistribution: [],
    userBehavior: [],
    coursePerformance: [],
    revenueByCategory: [],
    avgEnrollmentPerDay: 0,
    overallSatisfaction: 0,
    avgCompletionTime: 32,
  })

  useEffect(() => {
    fetchAnalyticsData()
  }, [])

  const fetchAnalyticsData = async () => {
    try {
      const usersSnapshot = await getDocs(collection(db, 'users'))
      const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))

      const coursesSnapshot = await getDocs(collection(db, 'courses'))
      const courses = coursesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))

      const students = users.filter(u => u.role === 'student').length
      const professionals = users.filter(u => u.role === 'professional').length
      const admins = users.filter(u => u.role === 'admin').length

      const roleDistribution = [
        { name: 'Students', value: students, color: '#3b82f6' },
        { name: 'Professionals', value: professionals, color: '#a855f7' },
        { name: 'Admins', value: admins, color: '#16a34a' },
      ]

      const beginner = courses.filter(c => c.level === 'Beginner').length
      const intermediate = courses.filter(c => c.level === 'Intermediate').length
      const advanced = courses.filter(c => c.level === 'Advanced').length

      const levelDistribution = [
        { name: 'Beginner', value: beginner },
        { name: 'Intermediate', value: intermediate },
        { name: 'Advanced', value: advanced },
      ]

      const categoryMap = new Map()
      courses.forEach(course => {
        const cat = course.category || 'Uncategorized'
        const revenue = (course.price || 0) * (course.totalStudents || 0)
        categoryMap.set(cat, (categoryMap.get(cat) || 0) + revenue)
      })
      
      const revenueByCategory = Array.from(categoryMap.entries()).map(([name, value]) => ({
        name,
        value,
      }))

      const coursePerformance = courses.slice(0, 6).map(course => ({
        name: course.title?.substring(0, 12) || 'Unknown',
        completion: Math.round((course.totalStudents || 0) > 0 ? 60 : 0),
        satisfaction: (course.rating || 4.5) * 20,
        enrollment: Math.min(((course.totalStudents || 0) / 100) * 20, 100),
      }))

      const avgEnrollmentPerDay = Math.round(courses.reduce((sum, c) => sum + (c.totalStudents || 0), 0) / 30) || 0
      const overallSatisfaction = courses.reduce((sum, c) => sum + (c.rating || 4.5), 0) / (courses.length || 1)

      setAnalyticsData({
        roleDistribution,
        levelDistribution,
        userBehavior: [
          { day: 'Mon', newUsers: 45, activeUsers: 380, enrollments: 82 },
          { day: 'Tue', newUsers: 52, activeUsers: 410, enrollments: 95 },
          { day: 'Wed', newUsers: 48, activeUsers: 390, enrollments: 87 },
          { day: 'Thu', newUsers: 61, activeUsers: 450, enrollments: 108 },
          { day: 'Fri', newUsers: 55, activeUsers: 420, enrollments: 98 },
          { day: 'Sat', newUsers: 42, activeUsers: 310, enrollments: 72 },
          { day: 'Sun', newUsers: 38, activeUsers: 280, enrollments: 65 },
        ],
        coursePerformance,
        revenueByCategory,
        avgEnrollmentPerDay,
        overallSatisfaction,
        avgCompletionTime: 32,
      })
    } catch (error) {
      console.error('Error fetching analytics data:', error)
    } finally {
      setLoading(false)
    }
  }

  const dropOffData = [
    { stage: 'Enrolled', percentage: 100 },
    { stage: 'Started', percentage: 85 },
    { stage: 'Mid-Course', percentage: 72 },
    { stage: 'Completed', percentage: 58 },
    { stage: 'Certified', percentage: 45 },
  ]

  const COLORS = ['#1a6b3c', '#0ea5e9', '#f97316']

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-700"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Analytics & Reports</h2>
          <p className="text-sm text-muted-foreground mt-1">Comprehensive platform insights and metrics</p>
        </div>
        <Button className="flex items-center gap-2 w-full md:w-auto">
          <Download size={18} />
          Generate Report
        </Button>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap gap-2">
          {['7d', '30d', '90d', '1y', 'all'].map(range => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                dateRange === range
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-foreground hover:bg-muted/80'
              }`}
            >
              {range === '7d' && 'Last 7 Days'}
              {range === '30d' && 'Last 30 Days'}
              {range === '90d' && 'Last 90 Days'}
              {range === '1y' && 'Last Year'}
              {range === 'all' && 'All Time'}
            </button>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Avg Enrollment/Day</p>
              <p className="text-3xl font-bold text-foreground mt-2">{analyticsData.avgEnrollmentPerDay}</p>
            </div>
            <TrendingUp size={24} className="text-green-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Overall Satisfaction</p>
              <p className="text-3xl font-bold text-foreground mt-2">{analyticsData.overallSatisfaction.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground mt-2">/ 5.0 stars</p>
            </div>
            <div className="text-2xl">⭐</div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Avg. Time to Completion</p>
              <p className="text-3xl font-bold text-foreground mt-2">{analyticsData.avgCompletionTime}</p>
              <p className="text-xs text-muted-foreground mt-2">days</p>
            </div>
            <TrendingUp size={24} className="text-blue-600" />
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">User Behavior Trends</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analyticsData.userBehavior}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="day" stroke="#666" />
              <YAxis stroke="#666" />
              <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb' }} />
              <Legend />
              <Bar dataKey="newUsers" fill="#0ea5e9" name="New Users" />
              <Bar dataKey="activeUsers" fill="#1a6b3c" name="Active Users" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">User Distribution by Role</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={analyticsData.roleDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {analyticsData.roleDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Course Drop-off Analysis</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dropOffData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis type="number" stroke="#666" />
              <YAxis dataKey="stage" type="category" stroke="#666" width={100} />
              <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb' }} />
              <Bar dataKey="percentage" fill="#1a6b3c" name="Completion (%)" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Course Level Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analyticsData.levelDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" stroke="#666" />
              <YAxis stroke="#666" />
              <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb' }} />
              <Bar dataKey="value" fill="#0ea5e9" name="Number of Courses" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Course Performance Analysis</h3>
        <ResponsiveContainer width="100%" height={400}>
          <RadarChart data={analyticsData.coursePerformance}>
            <PolarGrid stroke="#e5e7eb" />
            <PolarAngleAxis dataKey="name" stroke="#666" />
            <PolarRadiusAxis angle={90} domain={[0, 100]} stroke="#666" />
            <Radar name="Completion Rate %" dataKey="completion" stroke="#1a6b3c" fill="#1a6b3c" fillOpacity={0.6} />
            <Radar name="Satisfaction %" dataKey="satisfaction" stroke="#0ea5e9" fill="#0ea5e9" fillOpacity={0.6} />
            <Radar name="Enrollment %" dataKey="enrollment" stroke="#f97316" fill="#f97316" fillOpacity={0.6} />
            <Legend />
            <Tooltip />
          </RadarChart>
        </ResponsiveContainer>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Revenue by Course Category</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={analyticsData.revenueByCategory}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: $${(value / 1000).toFixed(1)}k`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {['#1a6b3c', '#0ea5e9', '#f97316', '#ec4899', '#8b5cf6', '#14b8a6', '#f59e0b'].map((color, index) => (
                  <Cell key={`cell-${index}`} fill={color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `$${value.toLocaleString()}`} />
            </PieChart>
          </ResponsiveContainer>

          <div className="space-y-3">
            {analyticsData.revenueByCategory.map((item, idx) => (
              <div key={item.name} className="flex items-center justify-between p-2 hover:bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: ['#1a6b3c', '#0ea5e9', '#f97316', '#ec4899', '#8b5cf6', '#14b8a6', '#f59e0b'][idx % 7] }}
                  />
                  <span className="text-sm font-medium text-foreground">{item.name}</span>
                </div>
                <span className="text-sm font-semibold text-green-600">${item.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  )
}