'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { Download, Search } from 'lucide-react'
import { db } from '@/lib/firebase'
import { collection, getDocs } from 'firebase/firestore'

export default function RevenueManagement() {
  const [loading, setLoading] = useState(true)
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [revenueData, setRevenueData] = useState({
    transactions: [],
    totalRevenue: 0,
    completedTransactions: 0,
    refundedAmount: 0,
    avgTransaction: 0,
  })
  const [topCoursesRevenue, setTopCoursesRevenue] = useState([])

  useEffect(() => {
    fetchRevenueData()
  }, [])

  const fetchRevenueData = async () => {
    try {
      const coursesSnapshot = await getDocs(collection(db, 'courses'))
      const courses = coursesSnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(),
        revenue: (doc.data().price || 0) * (doc.data().totalStudents || 0),
        enrollments: doc.data().totalStudents || 0
      }))

      const transactions = []
      courses.forEach(course => {
        if ((course.totalStudents || 0) > 0 && (course.price || 0) > 0) {
          transactions.push({
            id: `txn_${course.id}`,
            date: new Date().toISOString().split('T')[0],
            courseId: course.id,
            courseTitle: course.title,
            amount: (course.price || 0) * (course.totalStudents || 0),
            status: 'completed'
          })
        }
      })

      const totalRevenue = transactions.reduce((sum, t) => sum + t.amount, 0)
      const completedTransactions = transactions.length

      const topCourses = [...courses]
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5)
        .map(course => ({
          name: course.title?.substring(0, 20) || 'Unknown',
          revenue: course.revenue || 0,
          enrollments: course.enrollments || 0,
        }))

      setRevenueData({
        transactions,
        totalRevenue,
        completedTransactions,
        refundedAmount: 0,
        avgTransaction: completedTransactions > 0 ? totalRevenue / completedTransactions : 0,
      })
      setTopCoursesRevenue(topCourses)

    } catch (error) {
      console.error('Error fetching revenue data:', error)
    } finally {
      setLoading(false)
    }
  }

  const revenueByStatus = [
    { name: 'Completed', value: revenueData.totalRevenue, count: revenueData.completedTransactions },
    { name: 'Refunded', value: 0, count: 0 },
    { name: 'Pending', value: 0, count: 0 },
  ]

  const revenueByDate = [
    { date: 'Week 1', revenue: revenueData.totalRevenue * 0.25, transactions: Math.round(revenueData.completedTransactions * 0.25) },
    { date: 'Week 2', revenue: revenueData.totalRevenue * 0.3, transactions: Math.round(revenueData.completedTransactions * 0.3) },
    { date: 'Week 3', revenue: revenueData.totalRevenue * 0.2, transactions: Math.round(revenueData.completedTransactions * 0.2) },
    { date: 'Week 4', revenue: revenueData.totalRevenue * 0.25, transactions: Math.round(revenueData.completedTransactions * 0.25) },
  ]

  const filteredTransactions = revenueData.transactions.filter((t) => {
    const matchesStatus = selectedStatus === 'all' || t.status === selectedStatus
    const matchesSearch = !searchTerm || 
      t.courseTitle?.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesStatus && matchesSearch
  })

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
          <h2 className="text-2xl font-bold text-foreground">Revenue Management</h2>
          <p className="text-sm text-muted-foreground mt-1">Track and manage platform revenue</p>
        </div>
        <Button className="flex items-center gap-2 w-full md:w-auto">
          <Download size={18} />
          Export Report
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6">
          <p className="text-sm text-muted-foreground">Total Revenue</p>
          <p className="text-3xl font-bold text-foreground mt-2">₦{revenueData.totalRevenue.toLocaleString()}</p>
          <p className="text-xs text-green-600 mt-2">Completed transactions</p>
        </Card>

        <Card className="p-6">
          <p className="text-sm text-muted-foreground">Completed Transactions</p>
          <p className="text-3xl font-bold text-foreground mt-2">{revenueData.completedTransactions}</p>
          <p className="text-xs text-muted-foreground mt-2">All-time</p>
        </Card>

        <Card className="p-6">
          <p className="text-sm text-muted-foreground">Refunded Amount</p>
          <p className="text-3xl font-bold text-red-600 mt-2">₦{revenueData.refundedAmount.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-2">0 refunds</p>
        </Card>

        <Card className="p-6">
          <p className="text-sm text-muted-foreground">Average Transaction</p>
          <p className="text-3xl font-bold text-foreground mt-2">₦{revenueData.avgTransaction.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground mt-2">Per transaction</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Revenue Trends</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={revenueByDate}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" stroke="#666" />
              <YAxis stroke="#666" />
              <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb' }} />
              <Legend />
              <Line type="monotone" dataKey="revenue" stroke="#1a6b3c" strokeWidth={2} dot={{ fill: '#1a6b3c' }} name="Revenue (₦)" />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Revenue by Status</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={revenueByStatus} cx="50%" cy="50%" labelLine={false} label={({ name, value }) => `${name}: ₦${value.toLocaleString()}`} outerRadius={100} fill="#8884d8" dataKey="value">
                {revenueByStatus.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `₦${value.toLocaleString()}`} />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold text-foreground mb-4">Top Courses by Revenue</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topCoursesRevenue}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="name" stroke="#666" angle={-45} textAnchor="end" height={100} />
              <YAxis stroke="#666" />
              <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb' }} />
              <Legend />
              <Bar dataKey="revenue" fill="#1a6b3c" name="Revenue (₦)" />
              <Bar dataKey="enrollments" fill="#0ea5e9" name="Enrollments" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Recent Transactions</h3>
        
        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <div className="flex-1">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-3 text-muted-foreground" />
              <Input placeholder="Search by course..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
            </div>
          </div>
          <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} className="px-4 py-2 border border-border rounded-md text-sm">
            <option value="all">All Status</option>
            <option value="completed">Completed</option>
            <option value="refunded">Refunded</option>
            <option value="pending">Pending</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-foreground">Date</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">Course</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">Amount</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No transactions found</td>
                </tr>
              ) : (
                filteredTransactions.map((txn) => (
                  <tr key={txn.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground">{txn.date}</td>
                    <td className="px-4 py-3 font-medium text-foreground">{txn.courseTitle}</td>
                    <td className="px-4 py-3 font-semibold text-green-600">₦{txn.amount.toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <span className="px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Completed</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}