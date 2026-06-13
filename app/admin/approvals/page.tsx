'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  CheckCircle, XCircle, Clock, Users, Search, Mail, UserCheck, 
  UserX, Calendar, Eye, AlertCircle, Loader2
} from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, updateDoc, query, where } from 'firebase/firestore';
import { useTheme } from '@/context/theme-context';
import Link from 'next/link';

export default function AdminApprovalsPage() {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchPendingUsers();
  }, []);

  const fetchPendingUsers = async () => {
    try {
      setLoading(true);
      const usersRef = collection(db, 'users');
      // Fetch professionals and lecturers who are not approved yet
      const q = query(
        usersRef, 
        where('role', 'in', ['professional', 'lecturer']),
        where('approved', '==', false)
      );
      const querySnapshot = await getDocs(q);
      const users = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setPendingUsers(users);
    } catch (error) {
      console.error('Error fetching pending users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId: string, userEmail: string) => {
    if (!confirm(`Approve ${userEmail} as an instructor?`)) return;
    
    setProcessing(true);
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        approved: true,
        status: 'active',
        approvedAt: new Date(),
      });
      
      // Remove from list
      setPendingUsers(pendingUsers.filter(u => u.id !== userId));
      alert(`✅ ${userEmail} has been approved! They can now log in.`);
    } catch (error) {
      console.error('Error approving user:', error);
      alert('Failed to approve user');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (userId: string, userEmail: string) => {
    if (!confirm(`Reject ${userEmail}'s application?`)) return;
    
    setProcessing(true);
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        approved: false,
        status: 'rejected',
        rejectedAt: new Date(),
      });
      
      // Remove from list
      setPendingUsers(pendingUsers.filter(u => u.id !== userId));
      alert(`❌ ${userEmail} has been rejected.`);
    } catch (error) {
      console.error('Error rejecting user:', error);
      alert('Failed to reject user');
    } finally {
      setProcessing(false);
    }
  };

  const handleViewDetails = (user: any) => {
    setSelectedUser(user);
    setShowDetailsModal(true);
  };

  const filteredUsers = pendingUsers.filter(user =>
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  const StatCard = ({ icon: Icon, label, value, color = 'blue' }) => (
    <div className={`p-4 rounded-xl border ${isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-100'}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className={`text-xs font-medium uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>{label}</p>
          <p className={`text-2xl font-bold mt-1 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{value}</p>
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
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Instructor Approvals</h1>
        <p className="text-sm text-muted-foreground mt-1">Review and approve instructor applications</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard icon={Users} label="Pending Approvals" value={pendingUsers.length} color="orange" />
        <StatCard icon={UserCheck} label="Total Instructors" value="-" color="green" />
        <StatCard icon={Clock} label="Avg Response Time" value="< 24 hrs" color="blue" />
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Pending Approvals List */}
      {filteredUsers.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No Pending Approvals</h3>
            <p className="text-muted-foreground">All instructor applications have been reviewed.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredUsers.map((user) => (
            <Card key={user.id} className={`overflow-hidden ${isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-white border-gray-100'}`}>
              <div className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                    <span className="text-lg font-bold text-orange-700 dark:text-orange-400">
                      {user.name?.charAt(0)?.toUpperCase() || '?'}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{user.name || 'No name provided'}</h3>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">
                        {user.role}
                      </span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Applied: {user.createdAt?.toDate?.().toLocaleDateString() || 'Recently'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleViewDetails(user)}
                    className="p-2 rounded-lg hover:bg-muted transition-colors"
                    title="View Details"
                  >
                    <Eye className="h-5 w-5 text-blue-600" />
                  </button>
                  <Button
                    onClick={() => handleApprove(user.id, user.email)}
                    disabled={processing}
                    className="bg-green-600 hover:bg-green-700 gap-2"
                  >
                    <CheckCircle className="h-4 w-4" /> Approve
                  </Button>
                  <Button
                    onClick={() => handleReject(user.id, user.email)}
                    disabled={processing}
                    variant="outline"
                    className="text-red-600 hover:text-red-700 border-red-300 hover:border-red-400 gap-2"
                  >
                    <XCircle className="h-4 w-4" /> Reject
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* User Details Modal */}
      {showDetailsModal && selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowDetailsModal(false)}>
          <div className={`max-w-2xl w-full max-h-[85vh] overflow-y-auto rounded-xl shadow-xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`} onClick={e => e.stopPropagation()}>
            <div className={`sticky top-0 flex justify-between items-center p-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}>
              <h2 className="text-xl font-semibold text-foreground">Application Details</h2>
              <button onClick={() => setShowDetailsModal(false)} className="p-1 rounded-lg hover:bg-muted transition-colors">
                <XCircle className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* User Info */}
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                  <span className="text-2xl font-bold text-orange-700 dark:text-orange-400">
                    {selectedUser.name?.charAt(0)?.toUpperCase() || '?'}
                  </span>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">{selectedUser.name || 'No name provided'}</h3>
                  <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 capitalize">
                      {selectedUser.role}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Applied: {selectedUser.createdAt?.toDate?.().toLocaleString() || 'Recently'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Application Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                  <p className="text-sm text-muted-foreground mb-1">Status</p>
                  <p className="font-medium text-foreground capitalize">{selectedUser.status || 'pending'}</p>
                </div>
                <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                  <p className="text-sm text-muted-foreground mb-1">User ID</p>
                  <p className="font-mono text-xs text-foreground">{selectedUser.id}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-border">
                <Button
                  onClick={() => handleApprove(selectedUser.id, selectedUser.email)}
                  disabled={processing}
                  className="flex-1 bg-green-600 hover:bg-green-700 gap-2"
                >
                  <CheckCircle className="h-4 w-4" /> Approve Application
                </Button>
                <Button
                  onClick={() => handleReject(selectedUser.id, selectedUser.email)}
                  disabled={processing}
                  variant="outline"
                  className="flex-1 text-red-600 hover:text-red-700 border-red-300 hover:border-red-400 gap-2"
                >
                  <XCircle className="h-4 w-4" /> Reject Application
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}