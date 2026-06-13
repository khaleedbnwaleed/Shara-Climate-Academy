'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, TrendingDown, Users, BookOpen, DollarSign, Star,
  Calendar, Download, Eye, Award, Target, Zap
} from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { useTheme } from '@/context/theme-context';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

export default function LecturerAnalyticsPage() {
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const instructorName = user?.name ?? 'Lecturer';
  
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [courseDistribution, setCourseDistribution] = useState<any[]>([]);
  
  // Stats
  const [totalStudents, setTotalStudents] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [averageRating, setAverageRating] = useState(0);
  const [completionRate, setCompletionRate] = useState(0);
  const [engagementRate, setEngagementRate] = useState(0);
  const [growthRate, setGrowthRate] = useState(0);

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const fetchAnalyticsData = async () => {
    try {
      // Fetch courses
      const q = query(collection(db, 'courses'), where('instructorName', '==', instructorName));
      const coursesSnapshot = await getDocs(q);
      const coursesData = coursesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setCourses(coursesData);
      
      // Fetch all students
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const studentsData = usersSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(u => u.role === 'student' || u.role === 'professional');
      setStudents(studentsData);
      
      // Calculate stats
      const enrolledStudents = studentsData.filter(s => 
        coursesData.some(c => s.enrolledCourses?.includes(c.id))
      );
      setTotalStudents(enrolledStudents.length);
      
      const revenue = coursesData.reduce((sum, c) => sum + ((c.price || 0) * (c.totalStudents || 0)), 0);
      setTotalRevenue(revenue);
      
      const avgRating = coursesData.reduce((sum, c) => sum + (c.rating || 4.5), 0) / (coursesData.length || 1);
      setAverageRating(parseFloat(avgRating.toFixed(1)));
      
      const totalEnrollments = coursesData.reduce((sum, c) => sum + (c.totalStudents || 0), 0);
      const completedEnrollments = coursesData.reduce((sum, c) => sum + (c.completedCount || 0), 0);
      setCompletionRate(totalEnrollments > 0 ? Math.round((completedEnrollments / totalEnrollments) * 100) : 0);
      
      // Engagement Rate
      let totalLessonsCompleted = 0;
      let totalPossibleCompletions = 0;
      coursesData.forEach(course => {
        totalLessonsCompleted += (course.completedCount || 0);
        totalPossibleCompletions += (course.totalStudents || 0);
      });
      setEngagementRate(totalPossibleCompletions > 0 ? Math.round((totalLessonsCompleted / totalPossibleCompletions) * 100) : 0);
      
      // Growth Rate
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
      setGrowthRate(oldEnrollments > 0 ? Math.round(((newEnrollments - oldEnrollments) / oldEnrollments) * 100) : (newEnrollments > 0 ? 100 : 0));
      
      // Calculate REAL monthly data from courses
      const monthlyMap = new Map();
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      coursesData.forEach(course => {
        const createdDate = course.createdAt?.toDate?.() || new Date(course.createdAt);
        const monthIndex = createdDate.getMonth();
        const monthName = months[monthIndex];
        const year = createdDate.getFullYear();
        const key = `${year}-${monthIndex}`;
        
        if (!monthlyMap.has(key)) {
          monthlyMap.set(key, { month: monthName, enrollments: 0, revenue: 0 });
        }
        const existing = monthlyMap.get(key);
        existing.enrollments += (course.totalStudents || 0);
        existing.revenue += ((course.price || 0) * (course.totalStudents || 0));
      });
      
      // Convert to array and sort by month
      const realMonthlyData = Array.from(monthlyMap.values())
        .sort((a, b) => {
          const monthOrder = months.indexOf(a.month) - months.indexOf(b.month);
          return monthOrder;
        })
        .slice(-6); // Last 6 months
      
      setMonthlyData(realMonthlyData.length > 0 ? realMonthlyData : [
        { month: 'Jan', enrollments: 0, revenue: 0 },
        { month: 'Feb', enrollments: 0, revenue: 0 },
        { month: 'Mar', enrollments: 0, revenue: 0 },
        { month: 'Apr', enrollments: 0, revenue: 0 },
        { month: 'May', enrollments: 0, revenue: 0 },
        { month: 'Jun', enrollments: 0, revenue: 0 },
      ]);
      
      // Course distribution by level
      const beginner = coursesData.filter(c => c.level === 'beginner').length;
      const intermediate = coursesData.filter(c => c.level === 'intermediate').length;
      const advanced = coursesData.filter(c => c.level === 'advanced').length;
      setCourseDistribution([
        { name: 'Beginner', value: beginner, color: '#10b981' },
        { name: 'Intermediate', value: intermediate, color: '#3b82f6' },
        { name: 'Advanced', value: advanced, color: '#8b5cf6' },
      ]);
      
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  // Export Report Function
  const handleExportReport = () => {
    const csvData = [
      ['Analytics Report', `Generated: ${new Date().toLocaleString()}`],
      [''],
      ['Summary Metrics'],
      ['Metric', 'Value'],
      ['Total Students', totalStudents],
      ['Total Revenue', `₦${totalRevenue.toLocaleString()}`],
      ['Average Rating', `${averageRating} / 5`],
      ['Completion Rate', `${completionRate}%`],
      ['Engagement Rate', `${engagementRate}%`],
      ['Growth Rate', `${growthRate}%`],
      ['Total Courses', courses.length],
      [''],
      ['Monthly Trends'],
      ['Month', 'Enrollments', 'Revenue (₦)'],
      ...monthlyData.map(d => [d.month, d.enrollments, d.revenue]),
      [''],
      ['Course Distribution by Level'],
      ['Level', 'Count'],
      ...courseDistribution.map(d => [d.name, d.value])
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `analytics_report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const StatCard = ({ icon: Icon, title, value, suffix = '', trend = null, color = 'green' }) => (
    <div className={`rounded-xl p-5 shadow-sm border ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2 rounded-lg bg-${color}-100 dark:bg-${color}-900/30`}>
          <Icon className={`h-5 w-5 text-${color}-600 dark:text-${color}-400`} />
        </div>
        {trend !== null && (
          <span className={`text-xs flex items-center gap-1 ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{value}{suffix}</p>
      <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{title}</p>
    </div>
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-700"></div>
      </div>
    );
  }

  const COLORS = ['#10b981', '#3b82f6', '#8b5cf6'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Analytics</h1>
        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Track your teaching performance and insights</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} title="Total Students" value={totalStudents} />
        <StatCard icon={DollarSign} title="Total Revenue" value={`₦${totalRevenue.toLocaleString()}`} />
        <StatCard icon={Star} title="Avg Rating" value={averageRating} suffix="/5" />
        <StatCard icon={Target} title="Completion Rate" value={completionRate} suffix="%" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Enrollment Trends */}
        <Card className={`p-5 ${isDarkMode ? 'bg-gray-800 border-gray-700' : ''}`}>
          <h3 className={`font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Enrollment Trends</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#374151' : '#e5e7eb'} />
                <XAxis dataKey="month" stroke={isDarkMode ? '#9ca3af' : '#6b7280'} />
                <YAxis stroke={isDarkMode ? '#9ca3af' : '#6b7280'} />
                <Tooltip contentStyle={{ backgroundColor: isDarkMode ? '#1f2937' : '#fff', border: 'none' }} />
                <Legend />
                <Line type="monotone" dataKey="enrollments" stroke="#10b981" strokeWidth={2} name="Enrollments" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Revenue Trends */}
        <Card className={`p-5 ${isDarkMode ? 'bg-gray-800 border-gray-700' : ''}`}>
          <h3 className={`font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Revenue Trends (₦)</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#374151' : '#e5e7eb'} />
                <XAxis dataKey="month" stroke={isDarkMode ? '#9ca3af' : '#6b7280'} />
                <YAxis stroke={isDarkMode ? '#9ca3af' : '#6b7280'} />
                <Tooltip contentStyle={{ backgroundColor: isDarkMode ? '#1f2937' : '#fff', border: 'none' }} />
                <Legend />
                <Bar dataKey="revenue" fill="#3b82f6" name="Revenue (₦)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Course Distribution */}
        <Card className={`p-5 ${isDarkMode ? 'bg-gray-800 border-gray-700' : ''}`}>
          <h3 className={`font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Course Distribution by Level</h3>
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
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: isDarkMode ? '#1f2937' : '#fff', border: 'none' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Performance Metrics */}
        <Card className={`p-5 ${isDarkMode ? 'bg-gray-800 border-gray-700' : ''}`}>
          <h3 className={`font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Performance Metrics</h3>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>Engagement Rate</span>
                <span className="font-semibold text-green-600">{engagementRate}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-600 h-2 rounded-full" style={{ width: `${engagementRate}%` }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>Growth Rate</span>
                <span className="font-semibold text-blue-600">{growthRate}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${growthRate}%` }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>Quality Score</span>
                <span className="font-semibold text-purple-600">{Math.round(averageRating * 20)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-purple-600 h-2 rounded-full" style={{ width: `${Math.round(averageRating * 20)}%` }}></div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Export Button */}
      <div className="flex justify-end">
        <Button variant="outline" className="gap-2" onClick={handleExportReport}>
          <Download className="h-4 w-4" /> Export Report
        </Button>
      </div>
    </div>
  );
}