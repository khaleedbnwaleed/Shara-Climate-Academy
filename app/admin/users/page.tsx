
'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Lock,
  Unlock,
  Download,
  Search,
  Eye,
  X,
  BookOpen,
  Calendar,
  Shield,
  User,
  ChevronDown,
  Filter,
  CheckCircle,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { db } from '@/lib/firebase';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { useTheme } from '@/context/theme-context';

type UserRecord = {
  id: string;
  name?: string;
  email?: string;
  role?: string;
  status: string;
  enrolledCourses: string[];
  createdAt: Date;
};

type StatCardProps = {
  icon: LucideIcon;
  label: string;
  value: string | number;
  color?: 'green' | 'blue' | 'purple' | 'orange' | 'red';
};

type StatItem = {
  label: string;
  value: number;
  icon: LucideIcon;
  color: NonNullable<StatCardProps['color']>;
};

const statColors = {
  green: {
    background: 'bg-green-50 dark:bg-green-900/20',
    icon: 'text-green-600 dark:text-green-400',
  },
  blue: {
    background: 'bg-blue-50 dark:bg-blue-900/20',
    icon: 'text-blue-600 dark:text-blue-400',
  },
  purple: {
    background: 'bg-purple-50 dark:bg-purple-900/20',
    icon: 'text-purple-600 dark:text-purple-400',
  },
  orange: {
    background: 'bg-orange-50 dark:bg-orange-900/20',
    icon: 'text-orange-600 dark:text-orange-400',
  },
  red: {
    background: 'bg-red-50 dark:bg-red-900/20',
    icon: 'text-red-600 dark:text-red-400',
  },
};

function StatCard({
  icon: Icon,
  label,
  value,
  color = 'green',
}: StatCardProps) {
  const colors = statColors[color];

  return (
    <div className="p-4 rounded-xl border bg-card border-border">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          <p className="text-2xl font-bold mt-1 text-foreground">{value}</p>
        </div>

        <div className={`p-2 rounded-lg ${colors.background}`}>
          <Icon className={`h-5 w-5 ${colors.icon}`} />
        </div>
      </div>
    </div>
  );
}

export default function AccountsManagement() {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';

  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showRoleFilter, setShowRoleFilter] = useState(false);
  const [showStatusFilter, setShowStatusFilter] = useState(false);

  const roles = [
    { value: 'all', label: 'All Roles' },
    { value: 'student', label: 'Students' },
    { value: 'professional', label: 'Professionals' },
    { value: 'admin', label: 'Admins' },
    { value: 'lecturer', label: 'Lecturers' },
  ];

  const statuses = [
    { value: 'all', label: 'All Status' },
    { value: 'active', label: 'Active' },
    { value: 'suspended', label: 'Suspended' },
  ];

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);

        const usersSnapshot = await getDocs(collection(db, 'users'));

        const usersData: UserRecord[] = usersSnapshot.docs.map((userDoc) => {
          const data = userDoc.data();

          return {
            id: userDoc.id,
            name: typeof data.name === 'string' ? data.name : undefined,
            email: typeof data.email === 'string' ? data.email : undefined,
            role: typeof data.role === 'string' ? data.role : undefined,
            status:
              typeof data.status === 'string' ? data.status : 'active',
            enrolledCourses: Array.isArray(data.enrolledCourses)
              ? data.enrolledCourses.filter(
                  (courseId: unknown): courseId is string =>
                    typeof courseId === 'string'
                )
              : [],
            createdAt:
              data.createdAt?.toDate instanceof Function
                ? data.createdAt.toDate()
                : new Date(),
          };
        });

        setUsers(usersData);
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setLoading(false);
      }
    };

    void fetchUsers();
  }, []);

  const handleSuspendUser = async (
    userId: string,
    currentStatus: string
  ) => {
    const newStatus =
      currentStatus === 'active' ? 'suspended' : 'active';

    try {
      await updateDoc(doc(db, 'users', userId), {
        status: newStatus,
      });

      setUsers((currentUsers) =>
        currentUsers.map((user) =>
          user.id === userId
            ? { ...user, status: newStatus }
            : user
        )
      );

      setSelectedUser((currentUser) =>
        currentUser?.id === userId
          ? { ...currentUser, status: newStatus }
          : currentUser
      );
    } catch (error) {
      console.error('Error updating user status:', error);
    }
  };

  const handleViewUser = (user: UserRecord) => {
    setSelectedUser(user);
    setShowUserModal(true);
  };

  const filteredUsers = users.filter((user) => {
    const normalizedSearch = searchTerm.toLowerCase();

    const matchesSearch =
      searchTerm === '' ||
      user.name?.toLowerCase().includes(normalizedSearch) ||
      user.email?.toLowerCase().includes(normalizedSearch);

    const matchesRole =
      selectedRole === 'all' || user.role === selectedRole;

    const matchesStatus =
      selectedStatus === 'all' || user.status === selectedStatus;

    return matchesSearch && matchesRole && matchesStatus;
  });

  const clearAllFilters = () => {
    setSearchTerm('');
    setSelectedRole('all');
    setSelectedStatus('all');
  };

  const stats: StatItem[] = [
    {
      label: 'Total Users',
      value: users.length,
      icon: User,
      color: 'green',
    },
    {
      label: 'Active',
      value: users.filter((user) => user.status === 'active').length,
      icon: CheckCircle,
      color: 'blue',
    },
    {
      label: 'Students',
      value: users.filter((user) => user.role === 'student').length,
      icon: BookOpen,
      color: 'purple',
    },
    {
      label: 'Professionals',
      value: users.filter((user) => user.role === 'professional').length,
      icon: Shield,
      color: 'orange',
    },
    {
      label: 'Admins',
      value: users.filter((user) => user.role === 'admin').length,
      icon: Shield,
      color: 'red',
    },
  ];

  const exportToCSV = () => {
    const headers = [
      'Name',
      'Email',
      'Role',
      'Status',
      'Courses Enrolled',
    ];

    const escapeCSV = (value: string | number) =>
      `"${String(value).replace(/"/g, '""')}"`;

    const csvData = filteredUsers.map((user) => [
      user.name || '',
      user.email || '',
      user.role || '',
      user.status || '',
      user.enrolledCourses.length,
    ]);

    const csvContent = [headers, ...csvData]
      .map((row) => row.map(escapeCSV).join(','))
      .join('\r\n');

    const blob = new Blob(['\uFEFF', csvContent], {
      type: 'text/csv;charset=utf-8;',
    });

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download = `users-export-${new Date()
      .toISOString()
      .split('T')[0]}.csv`;

    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Accounts Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            View and manage user accounts
          </p>
        </div>

        <Button
          onClick={exportToCSV}
          className="bg-green-700 hover:bg-green-800 gap-2 w-full sm:w-auto"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {stats.map((stat) => (
          <StatCard
            key={stat.label}
            icon={stat.icon}
            label={stat.label}
            value={stat.value}
            color={stat.color}
          />
        ))}
      </div>

      {/* Search and filters */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex flex-wrap gap-3">
          {/* Role filter */}
          <div className="relative">
            <Button
              variant="outline"
              onClick={() => setShowRoleFilter((visible) => !visible)}
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              {roles.find((role) => role.value === selectedRole)?.label}
              <ChevronDown className="h-4 w-4" />
            </Button>

            {showRoleFilter && (
              <div
                className={`absolute top-full mt-2 right-0 z-10 rounded-lg shadow-lg border overflow-hidden min-w-[150px] ${
                  isDarkMode
                    ? 'bg-gray-800 border-gray-700'
                    : 'bg-white border-gray-200'
                }`}
              >
                {roles.map((role) => (
                  <button
                    key={role.value}
                    onClick={() => {
                      setSelectedRole(role.value);
                      setShowRoleFilter(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-muted transition-colors ${
                      selectedRole === role.value
                        ? 'bg-primary/10 text-primary'
                        : ''
                    }`}
                  >
                    {role.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Status filter */}
          <div className="relative">
            <Button
              variant="outline"
              onClick={() => setShowStatusFilter((visible) => !visible)}
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              {statuses.find((status) => status.value === selectedStatus)?.label}
              <ChevronDown className="h-4 w-4" />
            </Button>

            {showStatusFilter && (
              <div
                className={`absolute top-full mt-2 right-0 z-10 rounded-lg shadow-lg border overflow-hidden min-w-[150px] ${
                  isDarkMode
                    ? 'bg-gray-800 border-gray-700'
                    : 'bg-white border-gray-200'
                }`}
              >
                {statuses.map((status) => (
                  <button
                    key={status.value}
                    onClick={() => {
                      setSelectedStatus(status.value);
                      setShowStatusFilter(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-muted transition-colors ${
                      selectedStatus === status.value
                        ? 'bg-primary/10 text-primary'
                        : ''
                    }`}
                  >
                    {status.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Active filters */}
      {(searchTerm ||
        selectedRole !== 'all' ||
        selectedStatus !== 'all') && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">
            Active Filters:
          </span>

          {searchTerm && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs">
              Search: {searchTerm}
              <button
                onClick={() => setSearchTerm('')}
                aria-label="Clear search filter"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          {selectedRole !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs">
              Role: {roles.find((role) => role.value === selectedRole)?.label}
              <button
                onClick={() => setSelectedRole('all')}
                aria-label="Clear role filter"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          {selectedStatus !== 'all' && (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs">
              Status:{' '}
              {statuses.find((status) => status.value === selectedStatus)?.label}
              <button
                onClick={() => setSelectedStatus('all')}
                aria-label="Clear status filter"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          <button
            onClick={clearAllFilters}
            className="text-sm text-red-600 hover:text-red-700"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Result count */}
      <div className="flex justify-between items-center">
        <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          Showing{' '}
          <span className="font-semibold">{filteredUsers.length}</span> of{' '}
          {users.length} users
        </p>
      </div>

      {/* Users table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead
              className={`border-b ${
                isDarkMode
                  ? 'bg-gray-800 border-gray-700'
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <tr>
                <th className="px-4 py-3 text-left font-medium text-foreground">
                  User
                </th>
                <th className="px-4 py-3 text-left font-medium text-foreground hidden sm:table-cell">
                  Email
                </th>
                <th className="px-4 py-3 text-left font-medium text-foreground">
                  Role
                </th>
                <th className="px-4 py-3 text-left font-medium text-foreground hidden md:table-cell">
                  Courses
                </th>
                <th className="px-4 py-3 text-left font-medium text-foreground">
                  Status
                </th>
                <th className="px-4 py-3 text-left font-medium text-foreground">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    No users found
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className={`border-b ${
                      isDarkMode ? 'border-gray-700' : 'border-gray-100'
                    } hover:bg-muted/50 transition-colors`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-medium text-green-700 dark:text-green-400">
                            {user.name?.charAt(0)?.toUpperCase() || 'U'}
                          </span>
                        </div>

                        <div>
                          <p className="font-medium text-foreground">
                            {user.name || 'Unknown'}
                          </p>
                          <p className="text-xs text-muted-foreground sm:hidden">
                            {user.email}
                          </p>
                          <p className="text-xs text-muted-foreground hidden sm:block">
                            {user.id.substring(0, 8)}...
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                      {user.email}
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full capitalize ${
                          user.role === 'student'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                            : user.role === 'professional'
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                              : user.role === 'lecturer'
                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                                : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        }`}
                      >
                        {user.role || 'Unknown'}
                      </span>
                    </td>

                    <td className="px-4 py-3 font-medium text-foreground hidden md:table-cell">
                      {user.enrolledCourses.length}
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full capitalize ${
                          user.status === 'active'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                        }`}
                      >
                        {user.status}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleViewUser(user)}
                          className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                          title="View user details"
                          aria-label={`View ${user.name || 'user'} details`}
                        >
                          <Eye className="h-4 w-4 text-blue-600" />
                        </button>

                        <button
                          onClick={() =>
                            void handleSuspendUser(user.id, user.status)
                          }
                          className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                          title={
                            user.status === 'active'
                              ? 'Suspend user'
                              : 'Activate user'
                          }
                          aria-label={
                            user.status === 'active'
                              ? 'Suspend user'
                              : 'Activate user'
                          }
                        >
                          {user.status === 'active' ? (
                            <Lock className="h-4 w-4 text-orange-600" />
                          ) : (
                            <Unlock className="h-4 w-4 text-green-600" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* User details modal */}
      {showUserModal && selectedUser && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowUserModal(false)}
        >
          <div
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
              <h2 className="text-xl font-semibold text-foreground">
                User Details
              </h2>

              <button
                onClick={() => setShowUserModal(false)}
                className="p-1 rounded-lg hover:bg-muted transition-colors"
                aria-label="Close user details"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* User header */}
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <span className="text-2xl font-bold text-green-700 dark:text-green-400">
                    {selectedUser.name?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                </div>

                <div>
                  <h3 className="text-xl font-bold text-foreground">
                    {selectedUser.name || 'Unknown'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedUser.email || 'No email'}
                  </p>

                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full capitalize ${
                        selectedUser.role === 'student'
                          ? 'bg-blue-100 text-blue-800'
                          : selectedUser.role === 'professional'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {selectedUser.role || 'Unknown'}
                    </span>

                    <span
                      className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full capitalize ${
                        selectedUser.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {selectedUser.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* User information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div
                  className={`p-4 rounded-lg ${
                    isDarkMode ? 'bg-gray-700/50' : 'bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground uppercase">
                      User ID
                    </span>
                  </div>
                  <p className="text-sm font-mono text-foreground break-all">
                    {selectedUser.id}
                  </p>
                </div>

                <div
                  className={`p-4 rounded-lg ${
                    isDarkMode ? 'bg-gray-700/50' : 'bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground uppercase">
                      Joined
                    </span>
                  </div>
                  <p className="text-sm text-foreground">
                    {selectedUser.createdAt instanceof Date
                      ? selectedUser.createdAt.toLocaleDateString()
                      : 'N/A'}
                  </p>
                </div>
              </div>

              {/* Enrolled courses */}
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Enrolled Courses ({selectedUser.enrolledCourses.length})
                </h4>

                {selectedUser.enrolledCourses.length > 0 ? (
                  <div className="space-y-2">
                    {selectedUser.enrolledCourses.map((courseId, index) => (
                      <div
                        key={`${courseId}-${index}`}
                        className={`flex items-center justify-between gap-3 p-3 rounded-lg ${
                          isDarkMode ? 'bg-gray-700/30' : 'bg-gray-50'
                        }`}
                      >
                        <span className="text-sm text-foreground font-mono break-all">
                          {courseId}
                        </span>

                        <Link href={`/admin/courses-management/${courseId}`}>
                          <Button variant="ghost" size="sm" className="text-xs">
                            View Course
                          </Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No courses enrolled
                  </p>
                )}
              </div>

              {/* Modal actions */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border">
                <Button
                  onClick={() =>
                    void handleSuspendUser(
                      selectedUser.id,
                      selectedUser.status
                    )
                  }
                  variant={
                    selectedUser.status === 'active'
                      ? 'destructive'
                      : 'default'
                  }
                  className="flex-1"
                >
                  {selectedUser.status === 'active' ? (
                    <>
                      <Lock className="mr-2 h-4 w-4" />
                      Suspend User
                    </>
                  ) : (
                    <>
                      <Unlock className="mr-2 h-4 w-4" />
                      Activate User
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  onClick={() => setShowUserModal(false)}
                  className="flex-1"
                >
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
