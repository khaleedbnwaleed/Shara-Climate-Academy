'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  DollarSign, Users, TrendingUp, CheckCircle, AlertCircle, 
  Banknote, Eye, Send, X, Search
} from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, getDoc, setDoc, query, where } from 'firebase/firestore';
import { useTheme } from '@/context/theme-context';

export default function AdminPayoutsPage() {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const [lecturers, setLecturers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLecturer, setSelectedLecturer] = useState<any>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    fetchLecturers();
  }, []);

  const fetchLecturers = async () => {
    try {
      setLoading(true);
      const usersRef = collection(db, 'users');
      // Include both 'lecturer' and 'professional' roles
      const q = query(usersRef, where('role', 'in', ['lecturer', 'professional']));
      const usersSnapshot = await getDocs(q);
      
      const lecturersData = await Promise.all(usersSnapshot.docs.map(async (docSnap) => {
        const lecturer = { id: docSnap.id, ...docSnap.data() };
        
        const bankRef = doc(db, 'lecturerSettings', lecturer.id);
        const bankSnap = await getDoc(bankRef);
        const bankDetails = bankSnap.exists() ? bankSnap.data() : null;
        
        const coursesRef = collection(db, 'courses');
        const coursesQuery = query(coursesRef, where('instructorName', '==', lecturer.name));
        const coursesSnapshot = await getDocs(coursesQuery);
        
        let totalRevenue = 0;
        let totalStudents = 0;
        let courseCount = 0;
        
        coursesSnapshot.docs.forEach(courseDoc => {
          const course = courseDoc.data();
          const revenue = (course.price || 0) * (course.totalStudents || 0);
          totalRevenue += revenue;
          totalStudents += course.totalStudents || 0;
          courseCount++;
        });
        
        const lecturerShare = totalRevenue * 0.7;
        
        return {
          ...lecturer,
          bankDetails,
          totalRevenue,
          lecturerShare,
          totalStudents,
          courseCount,
        };
      }));
      
      setLecturers(lecturersData);
    } catch (error) {
      console.error('Error fetching lecturers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (lecturer: any) => {
    setSelectedLecturer(lecturer);
    setShowDetailsModal(true);
  };

  const handleProcessPayout = async (lecturer: any) => {
    if (!confirm(`Process payout of ₦${lecturer.lecturerShare.toLocaleString()} to ${lecturer.name}?`)) return;
    
    try {
      const payoutRef = doc(db, 'payouts', `${lecturer.id}_${Date.now()}`);
      await setDoc(payoutRef, {
        lecturerId: lecturer.id,
        lecturerName: lecturer.name,
        lecturerEmail: lecturer.email,
        amount: lecturer.lecturerShare,
        bankDetails: lecturer.bankDetails,
        status: 'completed',
        processedAt: new Date(),
      });
      
      alert(`✅ Payout of ₦${lecturer.lecturerShare.toLocaleString()} processed successfully!`);
      await fetchLecturers();
    } catch (error) {
      console.error('Error processing payout:', error);
      alert('❌ Failed to process payout');
    }
  };

  const filteredLecturers = lecturers.filter(lecturer =>
    lecturer.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lecturer.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPending = lecturers.reduce((sum, l) => sum + (l.lecturerShare || 0), 0);
  const totalLecturers = lecturers.length;
  const totalCourseRevenue = lecturers.reduce((sum, l) => sum + (l.totalRevenue || 0), 0);
  const platformRevenue = totalCourseRevenue * 0.3;

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  const StatCard = ({ icon: Icon, label, value, color = 'green', subtext }: any) => (
    <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-100'}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{label}</p>
          <p className={`text-2xl font-bold mt-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{value}</p>
          {subtext && <p className={`text-xs mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>{subtext}</p>}
        </div>
        <div className={`p-2 rounded-lg bg-${color}-50 dark:bg-${color}-900/20`}>
          <Icon className={`h-5 w-5 text-${color}-600 dark:text-${color}-400`} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Payout Management</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage lecturer and instructor payouts</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Instructors" value={totalLecturers} color="blue" />
        <StatCard icon={DollarSign} label="Total Revenue" value={`₦${totalCourseRevenue.toLocaleString()}`} color="green" />
        <StatCard icon={Banknote} label="Pending Payouts" value={`₦${totalPending.toLocaleString()}`} color="orange" />
        <StatCard icon={TrendingUp} label="Platform Fee" value={`₦${platformRevenue.toLocaleString()}`} color="purple" subtext="30% of revenue" />
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search instructors by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {filteredLecturers.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-muted-foreground">No instructors found</p>
            <p className="text-xs text-muted-foreground mt-2">Users need role 'lecturer' or 'professional' to appear here</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex justify-between items-center">
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Showing <span className="font-semibold">{filteredLecturers.length}</span> of {lecturers.length} instructors
            </p>
          </div>

          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className={`border-b ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Instructor</th>
                    <th className="px-4 py-3 text-left font-medium hidden md:table-cell">Email</th>
                    <th className="px-4 py-3 text-left font-medium">Courses</th>
                    <th className="px-4 py-3 text-left font-medium">Students</th>
                    <th className="px-4 py-3 text-left font-medium">Bank</th>
                    <th className="px-4 py-3 text-left font-medium">Due</th>
                    <th className="px-4 py-3 text-left font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLecturers.map((lecturer) => (
                    <tr key={lecturer.id} className={`border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-100'} hover:bg-muted/50`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                            <span className="text-sm font-medium text-green-700 dark:text-green-400">
                              {lecturer.name?.charAt(0)?.toUpperCase() || 'L'}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{lecturer.name || 'Unknown'}</p>
                            <p className="text-xs text-muted-foreground md:hidden">{lecturer.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{lecturer.email}</td>
                      <td className="px-4 py-3 text-foreground">{lecturer.courseCount || 0}</td>
                      <td className="px-4 py-3 text-foreground">{lecturer.totalStudents || 0}</td>
                      <td className="px-4 py-3">
                        {lecturer.bankDetails ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3" /> Set
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">
                            <AlertCircle className="h-3 w-3" /> Not Set
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-semibold text-green-600">₦{(lecturer.lecturerShare || 0).toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleViewDetails(lecturer)}
                            className="p-1.5 rounded-lg hover:bg-muted"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4 text-blue-600" />
                          </button>
                          <button
                            onClick={() => handleProcessPayout(lecturer)}
                            disabled={!lecturer.bankDetails || lecturer.lecturerShare === 0}
                            className="p-1.5 rounded-lg hover:bg-muted disabled:opacity-50"
                            title="Process Payout"
                          >
                            <Send className="h-4 w-4 text-green-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {/* Modal */}
      {showDetailsModal && selectedLecturer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowDetailsModal(false)}>
          <div className={`max-w-2xl w-full max-h-[85vh] overflow-y-auto rounded-xl shadow-xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`} onClick={e => e.stopPropagation()}>
            <div className={`sticky top-0 flex justify-between items-center p-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}>
              <h2 className="text-xl font-semibold text-foreground">Instructor Details</h2>
              <button onClick={() => setShowDetailsModal(false)} className="p-1 rounded-lg hover:bg-muted">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                  <span className="text-2xl font-bold text-green-700">
                    {selectedLecturer.name?.charAt(0)?.toUpperCase() || 'L'}
                  </span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">{selectedLecturer.name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedLecturer.email}</p>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3">Bank Account Details</h4>
                {selectedLecturer.bankDetails ? (
                  <div className={`rounded-lg p-4 ${isDarkMode ? 'bg-gray-700/50' : 'bg-green-50'}`}>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Account Name:</span>
                        <span className="font-medium text-foreground">{selectedLecturer.bankDetails.accountName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Account Number:</span>
                        <span className="font-medium text-foreground">{selectedLecturer.bankDetails.accountNumber}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Bank Name:</span>
                        <span className="font-medium text-foreground">{selectedLecturer.bankDetails.bankName}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className={`rounded-lg p-4 text-center ${isDarkMode ? 'bg-gray-700/50' : 'bg-yellow-50'}`}>
                    <AlertCircle className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No bank account added yet</p>
                    <p className="text-xs text-muted-foreground mt-1">Instructor needs to add bank details in profile</p>
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3">Earnings Summary</h4>
                <div className="space-y-2">
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Total Course Revenue</span>
                    <span className="font-medium">₦{(selectedLecturer.totalRevenue || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-muted-foreground">Instructor Share (70%)</span>
                    <span className="font-medium text-green-600">₦{(selectedLecturer.lecturerShare || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-muted-foreground">Platform Fee (30%)</span>
                    <span className="font-medium text-purple-600">₦{((selectedLecturer.totalRevenue || 0) * 0.3).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <Button
                  onClick={() => handleProcessPayout(selectedLecturer)}
                  disabled={!selectedLecturer.bankDetails || selectedLecturer.lecturerShare === 0}
                  className="flex-1 bg-green-700 hover:bg-green-800"
                >
                  <Send className="mr-2 h-4 w-4" /> Process Payout
                </Button>
                <Button variant="outline" onClick={() => setShowDetailsModal(false)} className="flex-1">
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}