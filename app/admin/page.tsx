'use client';

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
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
} from 'recharts'
import { 
  Users, 
  BookOpen, 
  TrendingUp, 
  DollarSign, 
  Eye, 
  Settings, 
  BarChart3,
  ExternalLink,
  ChevronRight,
  Activity,
  CreditCard,
  GraduationCap,
  ShieldCheck,
  RefreshCw
} from 'lucide-react'
import { db } from '@/lib/firebase'
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore'

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalCourses: 0,
    totalRevenue: 0,
    totalEnrollments: 0,
    averageCompletionRate: 0,
    activeUsers: 0,
  })
  const [loading, setLoading] = useState(true)
  const [coursePerformance, setCoursePerformance] = useState([])
  const [userDistribution, setUserDistribution] = useState([])
  const [recentCourses, setRecentCourses] = useState([])
  const [revenueOverTime, setRevenueOverTime] = useState([])
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setRefreshing(true)
      
      // Fetch users
      const usersSnapshot = await getDocs(collection(db, 'users'))
      const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      
      // Fetch courses
      const coursesSnapshot = await getDocs(collection(db, 'courses'))
      const courses = coursesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      
      // Fetch payment requests for accurate revenue
      const paymentsSnapshot = await getDocs(collection(db, 'paymentRequests'))
      const payments = paymentsSnapshot.docs.map(doc => doc.data())
      
      // Calculate total revenue from verified payments
      const verifiedPayments = payments.filter(p => p.status === 'verified')
      const totalRevenue = verifiedPayments.reduce((sum, p) => sum + (p.amount || 0), 0)
      
      // Calculate total enrollments from courses
      const totalEnrollments = courses.reduce((sum, course) => sum + (course.totalStudents || 0), 0)
      
      // Calculate revenue per enrollment
      const revenuePerEnrollment = totalEnrollments > 0 ? totalRevenue / totalEnrollments : 0
      
      // Calculate active users (logged in within last 30 days - using status as proxy)
      const activeUsers = users.filter(u => u.status === 'active' || u.status !== 'inactive').length
      
      // Calculate average completion rate (from enrolled courses that are completed)
      let totalCompletionRate = 0
      let usersWithProgress = 0
      users.forEach(user => {
        if (user.completedCourses && user.enrolledCourses) {
          const rate = (user.completedCourses.length / user.enrolledCourses.length) * 100
          if (!isNaN(rate)) {
            totalCompletionRate += rate
            usersWithProgress++
          }
        }
      })
      const avgCompletionRate = usersWithProgress > 0 ? Math.round(totalCompletionRate / usersWithProgress) : 0
      
      setStats({
        totalUsers: users.length,
        totalCourses: courses.length,
        totalRevenue: totalRevenue,
        totalEnrollments: totalEnrollments,
        averageCompletionRate: avgCompletionRate,
        activeUsers: activeUsers,
      })
      
      // Course performance (top courses by enrollments)
      const performance = courses
        .sort((a, b) => (b.totalStudents || 0) - (a.totalStudents || 0))
        .slice(0, 6)
        .map(course => ({
          name: course.title?.substring(0, 12) || 'Unknown',
          enrollments: course.totalStudents || 0,
          completions: Math.round((course.totalStudents || 0) * (avgCompletionRate / 100)),
          revenue: (course.price || 0) * (course.totalStudents || 0),
        }))
      setCoursePerformance(performance)
      
      // User distribution
      const students = users.filter(u => u.role === 'student' || u.role === 'user').length
      const instructors = users.filter(u => u.role === 'lecturer' || u.role === 'professional' || u.role === 'instructor').length
      const admins = users.filter(u => u.role === 'admin').length
      
      setUserDistribution([
        { name: 'Students', value: students || 1 },
        { name: 'Instructors', value: instructors || 1 },
        { name: 'Admins', value: admins || 1 },
      ])
      
      // Recent courses (last 5 by creation date)
      const coursesWithDates = courses.filter(c => c.createdAt?.toDate).sort((a, b) => {
        const dateA = a.createdAt?.toDate() || new Date(0)
        const dateB = b.createdAt?.toDate() || new Date(0)
        return dateB - dateA
      })
      setRecentCourses(coursesWithDates.slice(0, 5))
      
      // Revenue over time (last 6 months from payment requests)
      const monthlyRevenue = {}
      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5)
      sixMonthsAgo.setDate(1)
      
      verifiedPayments.forEach(payment => {
        const date = payment.verifiedAt?.toDate?.() || payment.submittedAt?.toDate?.() || new Date()
        if (date >= sixMonthsAgo) {
          const monthKey = date.toLocaleString('default', { month: 'short', year: 'numeric' })
          monthlyRevenue[monthKey] = (monthlyRevenue[monthKey] || 0) + (payment.amount || 0)
        }
      })
      
      const revenueData = Object.entries(monthlyRevenue).map(([month, amount]) => ({
        month,
        revenue: amount,
      }))
      setRevenueOverTime(revenueData)
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const adminModules = [
    { title: 'Course Management', href: '/admin/courses-management', icon: BookOpen, color: 'bg-green-100 text-green-700', description: 'Create, edit, and manage courses' },
    { title: 'User Management', href: '/admin/users', icon: Users, color: 'bg-blue-100 text-blue-700', description: 'Manage user accounts and roles' },
    { title: 'Payment Verification', href: '/admin/payments', icon: DollarSign, color: 'bg-yellow-100 text-yellow-700', description: 'Verify bank transfers' },
    { title: 'Revenue Analytics', href: '/admin/revenue', icon: BarChart3, color: 'bg-purple-100 text-purple-700', description: 'Track platform revenue' },
    { title: 'Settings', href: '/admin/settings', icon: Settings, color: 'bg-gray-100 text-gray-700', description: 'Configure platform settings' },
  ]

  const COLORS = ['#1a6b3c', '#0ea5e9', '#94a3b8']

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-700"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">Admin Dashboard</h2>
          <p className="text-sm text-muted-foreground mt-1">Live overview of your platform's performance</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={fetchDashboardData} 
            variant="outline" 
            className="gap-2"
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Link href="/admin/courses-management">
            <Button className="bg-primary hover:bg-primary/90">
              <BookOpen size={18} className="mr-2" />
              Create Course
            </Button>
          </Link>
        </div>
      </div>

      {/* Key Metrics - Live Data */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="p-4 md:p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs md:text-sm text-muted-foreground">Total Users</p>
              <p className="text-2xl md:text-3xl font-bold text-foreground mt-1 md:mt-2">{stats.totalUsers.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-1 md:mt-2">{stats.activeUsers} active</p>
            </div>
            <div className="p-2 md:p-3 bg-blue-100 rounded-lg">
              <Users size={20} className="text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-4 md:p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs md:text-sm text-muted-foreground">Total Courses</p>
              <p className="text-2xl md:text-3xl font-bold text-foreground mt-1 md:mt-2">{stats.totalCourses}</p>
              <p className="text-xs text-muted-foreground mt-1 md:mt-2">Published courses</p>
            </div>
            <div className="p-2 md:p-3 bg-green-100 rounded-lg">
              <BookOpen size={20} className="text-primary" />
            </div>
          </div>
        </Card>

        <Card className="p-4 md:p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs md:text-sm text-muted-foreground">Total Revenue</p>
              <p className="text-2xl md:text-3xl font-bold text-foreground mt-1 md:mt-2">₦{stats.totalRevenue.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-1 md:mt-2">From verified payments</p>
            </div>
            <div className="p-2 md:p-3 bg-yellow-100 rounded-lg">
              <DollarSign size={20} className="text-yellow-600" />
            </div>
          </div>
        </Card>

        <Card className="p-4 md:p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs md:text-sm text-muted-foreground">Total Enrollments</p>
              <p className="text-2xl md:text-3xl font-bold text-foreground mt-1 md:mt-2">{stats.totalEnrollments.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-1 md:mt-2">Across all courses</p>
            </div>
            <div className="p-2 md:p-3 bg-purple-100 rounded-lg">
              <TrendingUp size={20} className="text-purple-600" />
            </div>
          </div>
        </Card>

        <Card className="p-4 md:p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs md:text-sm text-muted-foreground">Avg Completion Rate</p>
              <p className="text-2xl md:text-3xl font-bold text-foreground mt-1 md:mt-2">{stats.averageCompletionRate}%</p>
              <p className="text-xs text-muted-foreground mt-1 md:mt-2">Based on enrolled users</p>
            </div>
            <div className="p-2 md:p-3 bg-cyan-100 rounded-lg">
              <Eye size={20} className="text-cyan-600" />
            </div>
          </div>
        </Card>

        <Card className="p-4 md:p-6 hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs md:text-sm text-muted-foreground">Revenue per Enrollment</p>
              <p className="text-xl md:text-2xl font-bold text-foreground mt-1 md:mt-2">
                ₦{stats.totalEnrollments > 0 ? (stats.totalRevenue / stats.totalEnrollments).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00'}
              </p>
              <p className="text-xs text-muted-foreground mt-1 md:mt-2">Average value per student</p>
            </div>
            <div className="p-2 md:p-3 bg-orange-100 rounded-lg">
              <CreditCard size={20} className="text-orange-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Distribution */}
        <Card className="p-4 md:p-6">
          <h3 className="text-base md:text-lg font-semibold text-foreground mb-4">User Distribution</h3>
          <div className="h-[250px] md:h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={userDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {userDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Revenue Over Time */}
        <Card className="p-4 md:p-6">
          <h3 className="text-base md:text-lg font-semibold text-foreground mb-4">Revenue Over Time</h3>
          <div className="h-[250px] md:h-[300px]">
            {revenueOverTime.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueOverTime}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" stroke="#666" />
                  <YAxis stroke="#666" />
                  <Tooltip 
                    formatter={(value) => [`₦${value.toLocaleString()}`, 'Revenue']}
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb' }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" stroke="#1a6b3c" name="Revenue (₦)" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex justify-center items-center h-full text-gray-500">
                <p>No revenue data available yet</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Course Performance */}
      <Card className="p-4 md:p-6">
        <h3 className="text-base md:text-lg font-semibold text-foreground mb-4">Top Course Performance</h3>
        <div className="h-[300px] md:h-[350px] overflow-x-auto">
          {coursePerformance.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={coursePerformance}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="name" stroke="#666" angle={-45} textAnchor="end" height={80} interval={0} />
                <YAxis stroke="#666" />
                <Tooltip 
                  formatter={(value, name) => {
                    if (name === 'revenue') return [`₦${value.toLocaleString()}`, 'Revenue']
                    return [value, name]
                  }}
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb' }}
                />
                <Legend />
                <Bar dataKey="enrollments" fill="#1a6b3c" name="Enrollments" />
                <Bar dataKey="revenue" fill="#f59e0b" name="Revenue (₦)" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex justify-center items-center h-full text-gray-500">
              <p>No course performance data available</p>
            </div>
          )}
        </div>
      </Card>

      {/* Admin Quick Links */}
      <Card className="p-4 md:p-6">
        <h3 className="text-base md:text-lg font-semibold text-foreground mb-4">Admin Quick Links</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {adminModules.map((module, index) => (
            <Link key={index} href={module.href}>
              <div className="p-4 border border-border rounded-lg hover:shadow-md transition-all hover:-translate-y-1 cursor-pointer">
                <div className={`w-10 h-10 rounded-lg ${module.color} flex items-center justify-center mb-3`}>
                  <module.icon size={20} />
                </div>
                <h4 className="font-semibold text-foreground text-sm">{module.title}</h4>
                <p className="text-xs text-muted-foreground mt-1">{module.description}</p>
                <ChevronRight size={14} className="text-muted-foreground mt-2" />
              </div>
            </Link>
          ))}
        </div>
      </Card>

      {/* Recent Courses */}
      {recentCourses.length > 0 && (
        <Card className="p-4 md:p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-base md:text-lg font-semibold text-foreground">Recent Courses</h3>
            <Link href="/admin/courses-management">
              <Button variant="ghost" size="sm" className="text-primary">
                View All <ExternalLink size={14} className="ml-1" />
              </Button>
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-foreground">Title</th>
                  <th className="px-3 py-2 text-left font-semibold text-foreground hidden sm:table-cell">Level</th>
                  <th className="px-3 py-2 text-left font-semibold text-foreground">Students</th>
                  <th className="px-3 py-2 text-left font-semibold text-foreground hidden md:table-cell">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {recentCourses.map((course) => (
                  <tr key={course.id} className="border-b border-border hover:bg-muted/30">
                    <td className="px-3 py-2 font-medium text-foreground">{course.title?.substring(0, 30) || 'Untitled'}</td>
                    <td className="px-3 py-2 text-muted-foreground hidden sm:table-cell capitalize">{course.level || 'Beginner'}</td>
                    <td className="px-3 py-2 text-muted-foreground">{course.totalStudents || 0}</td>
                    <td className="px-3 py-2 text-green-600 hidden md:table-cell">
                      ₦{((course.price || 0) * (course.totalStudents || 0)).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}