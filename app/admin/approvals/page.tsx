'use client';

import { useState, useEffect, useCallback } from 'react';
import type { LucideIcon } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import {
  CheckCircle,
  XCircle,
  Clock,
  Users,
  Search,
  UserCheck,
  Calendar,
  Eye,
} from 'lucide-react';

import { db } from '@/lib/firebase';
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';

import { useTheme } from '@/context/theme-context';

type UserRole = 'professional' | 'lecturer';

interface ApprovalUser {
  id: string;
  name?: string;
  email: string;
  role: UserRole;
  approved?: boolean;
  status?: string;
  createdAt?: Timestamp | Date | null;
  [key: string]: unknown;
}

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  color?: 'blue' | 'green' | 'orange';
}

const colorStyles = {
  blue: {
    background: 'bg-blue-50 dark:bg-blue-900/20',
    icon: 'text-blue-600 dark:text-blue-400',
  },
  green: {
    background: 'bg-green-50 dark:bg-green-900/20',
    icon: 'text-green-600 dark:text-green-400',
  },
  orange: {
    background: 'bg-orange-50 dark:bg-orange-900/20',
    icon: 'text-orange-600 dark:text-orange-400',
  },
};

function StatCard({
  icon: Icon,
  label,
  value,
  color = 'blue',
}: StatCardProps) {
  const styles = colorStyles[color];

  return (
    <div className="p-4 rounded-xl border bg-card border-border">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className="text-2xl font-bold mt-1 text-foreground">
            {value}
          </p>
        </div>

        <div className={`p-2 rounded-lg ${styles.background}`}>
          <Icon className={`h-5 w-5 ${styles.icon}`} />
        </div>
      </div>
    </div>
  );
}

function formatDate(
  value: ApprovalUser['createdAt'],
  includeTime = false
): string {
  if (!value) return 'Recently';

  try {
    const date =
      value instanceof Timestamp
        ? value.toDate()
        : value instanceof Date
          ? value
          : null;

    if (!date || Number.isNaN(date.getTime())) {
      return 'Recently';
    }

    return includeTime
      ? date.toLocaleString()
      : date.toLocaleDateString();
  } catch {
    return 'Recently';
  }
}

export default function AdminApprovalsPage() {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  const [pendingUsers, setPendingUsers] = useState<ApprovalUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] =
    useState<ApprovalUser | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [processingUserId, setProcessingUserId] = useState<string | null>(
    null
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchPendingUsers = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage(null);

      const usersRef = collection(db, 'users');

      const usersQuery = query(
        usersRef,
        where('role', 'in', ['professional', 'lecturer']),
        where('approved', '==', false)
      );

      const snapshot = await getDocs(usersQuery);

      const users: ApprovalUser[] = snapshot.docs.map((userDoc) => {
        const data = userDoc.data();

        return {
          ...data,
          id: userDoc.id,
          email: typeof data.email === 'string' ? data.email : '',
          role: data.role as UserRole,
        };
      });

      setPendingUsers(users);
    } catch (error: unknown) {
      console.error('Error fetching pending users:', error);
      setErrorMessage('Unable to load pending applications. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchPendingUsers();
  }, [fetchPendingUsers]);

  const handleApprovalAction = async (
    user: ApprovalUser,
    action: 'approve' | 'reject'
  ) => {
    const actionLabel = action === 'approve' ? 'approve' : 'reject';

    if (processingUserId !== null) return;

    const confirmed = window.confirm(
      `${action === 'approve' ? 'Approve' : 'Reject'} ${
        user.email || user.name || 'this application'
      }?`
    );

    if (!confirmed) return;

    setProcessingUserId(user.id);
    setErrorMessage(null);

    try {
      const userRef = doc(db, 'users', user.id);

      if (action === 'approve') {
        await updateDoc(userRef, {
          approved: true,
          status: 'active',
          approvedAt: Timestamp.now(),
        });
      } else {
        await updateDoc(userRef, {
          approved: false,
          status: 'rejected',
          rejectedAt: Timestamp.now(),
        });
      }

      setPendingUsers((currentUsers) =>
        currentUsers.filter((currentUser) => currentUser.id !== user.id)
      );

      setSelectedUser((currentUser) =>
        currentUser?.id === user.id ? null : currentUser
      );

      setShowDetailsModal(false);

      window.alert(
        action === 'approve'
          ? `${user.email || user.name} has been approved.`
          : `${user.email || user.name}'s application has been rejected.`
      );
    } catch (error: unknown) {
      console.error(`Error attempting to ${actionLabel} user:`, error);

      window.alert(
        `Failed to ${actionLabel} this application. Please try again.`
      );
    } finally {
      setProcessingUserId(null);
    }
  };

  const handleViewDetails = (user: ApprovalUser) => {
    setSelectedUser(user);
    setShowDetailsModal(true);
  };

  const filteredUsers = pendingUsers.filter((user) => {
    const search = searchTerm.trim().toLowerCase();

    return (
      user.name?.toLowerCase().includes(search) ||
      user.email.toLowerCase().includes(search)
    );
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div
          className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"
          role="status"
          aria-label="Loading applications"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Instructor Approvals
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Review and approve instructor applications
        </p>
      </div>

      {errorMessage && (
        <div
          role="alert"
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-300"
        >
          <p>{errorMessage}</p>
          <Button variant="outline" onClick={() => void fetchPendingUsers()}>
            Try again
          </Button>
        </div>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          icon={Users}
          label="Pending Approvals"
          value={pendingUsers.length}
          color="orange"
        />

        <StatCard
          icon={UserCheck}
          label="Total Instructors"
          value="-"
          color="green"
        />

        <StatCard
          icon={Clock}
          label="Avg Response Time"
          value="< 24 hrs"
          color="blue"
        />
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />

        <Input
          placeholder="Search by name or email..."
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          className="pl-10"
        />
      </div>

      {/* Applications */}
      {filteredUsers.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />

            <h3 className="text-lg font-medium text-foreground mb-2">
              {searchTerm
                ? 'No Matching Applications'
                : 'No Pending Approvals'}
            </h3>

            <p className="text-muted-foreground">
              {searchTerm
                ? 'Try another name or email address.'
                : 'There are no pending instructor applications to review.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredUsers.map((user) => {
            const isProcessing = processingUserId === user.id;

            return (
              <Card
                key={user.id}
                className={`overflow-hidden ${
                  isDarkMode
                    ? 'bg-gray-800/50 border-gray-700'
                    : 'bg-white border-gray-100'
                }`}
              >
                <div className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-12 w-12 shrink-0 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                      <span className="text-lg font-bold text-orange-700 dark:text-orange-400">
                        {user.name?.charAt(0)?.toUpperCase() || '?'}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <h3 className="font-semibold text-foreground">
                        {user.name || 'No name provided'}
                      </h3>

                      <p className="text-sm text-muted-foreground break-all">
                        {user.email || 'No email provided'}
                      </p>

                      <div className="flex flex-wrap items-center gap-3 mt-1">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 capitalize">
                          {user.role}
                        </span>

                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Applied: {formatDate(user.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleViewDetails(user)}
                      title="View Details"
                      aria-label={`View application for ${user.name || user.email}`}
                      disabled={processingUserId !== null}
                    >
                      <Eye className="h-5 w-5 text-blue-600" />
                    </Button>

                    <Button
                      onClick={() =>
                        void handleApprovalAction(user, 'approve')
                      }
                      disabled={processingUserId !== null}
                      className="bg-green-600 hover:bg-green-700 gap-2"
                    >
                      {isProcessing ? (
                        <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                      ) : (
                        <CheckCircle className="h-4 w-4" />
                      )}
                      Approve
                    </Button>

                    <Button
                      onClick={() =>
                        void handleApprovalAction(user, 'reject')
                      }
                      disabled={processingUserId !== null}
                      variant="outline"
                      className="text-red-600 hover:text-red-700 border-red-300 hover:border-red-400 gap-2"
                    >
                      <XCircle className="h-4 w-4" />
                      Reject
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Application Details Modal */}
      {showDetailsModal && selectedUser && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => {
            if (processingUserId === null) {
              setShowDetailsModal(false);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="application-details-title"
            className={`max-w-2xl w-full max-h-[85vh] overflow-y-auto rounded-xl shadow-xl ${
              isDarkMode ? 'bg-gray-800' : 'bg-white'
            }`}
            onClick={(event) => event.stopPropagation()}
          >
            <div
              className={`sticky top-0 flex justify-between items-center p-4 border-b ${
                isDarkMode ? 'border-gray-700' : 'border-gray-100'
              }`}
            >
              <h2
                id="application-details-title"
                className="text-xl font-semibold text-foreground"
              >
                Application Details
              </h2>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowDetailsModal(false)}
                disabled={processingUserId !== null}
                aria-label="Close application details"
              >
                <XCircle className="h-5 w-5" />
              </Button>
            </div>

            <div className="p-6 space-y-6">
              {/* User Information */}
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 shrink-0 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                  <span className="text-2xl font-bold text-orange-700 dark:text-orange-400">
                    {selectedUser.name?.charAt(0)?.toUpperCase() || '?'}
                  </span>
                </div>

                <div className="min-w-0">
                  <h3 className="text-xl font-bold text-foreground">
                    {selectedUser.name || 'No name provided'}
                  </h3>

                  <p className="text-sm text-muted-foreground break-all">
                    {selectedUser.email || 'No email provided'}
                  </p>

                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 capitalize">
                      {selectedUser.role}
                    </span>

                    <span className="text-xs text-muted-foreground">
                      Applied: {formatDate(selectedUser.createdAt, true)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Application Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div
                  className={`p-4 rounded-lg ${
                    isDarkMode ? 'bg-gray-700/50' : 'bg-gray-50'
                  }`}
                >
                  <p className="text-sm text-muted-foreground mb-1">
                    Status
                  </p>

                  <p className="font-medium text-foreground capitalize">
                    {selectedUser.status || 'pending'}
                  </p>
                </div>

                <div
                  className={`p-4 rounded-lg ${
                    isDarkMode ? 'bg-gray-700/50' : 'bg-gray-50'
                  }`}
                >
                  <p className="text-sm text-muted-foreground mb-1">
                    User ID
                  </p>

                  <p className="font-mono text-xs text-foreground break-all">
                    {selectedUser.id}
                  </p>
                </div>
              </div>

              {/* Application Actions */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border">
                <Button
                  onClick={() =>
                    void handleApprovalAction(selectedUser, 'approve')
                  }
                  disabled={processingUserId !== null}
                  className="flex-1 bg-green-600 hover:bg-green-700 gap-2"
                >
                  <CheckCircle className="h-4 w-4" />
                  Approve Application
                </Button>

                <Button
                  onClick={() =>
                    void handleApprovalAction(selectedUser, 'reject')
                  }
                  disabled={processingUserId !== null}
                  variant="outline"
                  className="flex-1 text-red-600 hover:text-red-700 border-red-300 hover:border-red-400 gap-2"
                >
                  <XCircle className="h-4 w-4" />
                  Reject Application
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
