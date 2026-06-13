'use client';

import { useAuth } from '@/context/auth-context';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { 
  BookOpen, LogOut, LayoutDashboard, User, Moon, Sun, 
  Menu, X, GraduationCap, BarChart3, Settings, Users
} from 'lucide-react';
import Image from 'next/image';
import { useTheme } from '@/context/theme-context';

export default function LecturerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const isDarkMode = theme === 'dark';
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
    // Redirect students and admins away from lecturer pages
    if (!loading && user && user.role === 'student') {
      router.replace('/dashboard');
    }
    if (!loading && user && user.role === 'admin') {
      router.replace('/admin');
    }
  }, [loading, user, router]);

  const handleLogout = async () => {
    await logout();
    router.replace('/');
  };

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  if (loading) {
    return (
      <div className={`h-screen flex items-center justify-center ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50'}`}>
        Loading...
      </div>
    );
  }

  if (!user || (user.role !== 'professional' && user.role !== 'lecturer')) {
    return null;
  }

  const navItems = [
    { href: '/lecturer', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/lecturer/courses', label: 'My Courses', icon: BookOpen },
    { href: '/lecturer/students', label: 'Students', icon: Users },
    { href: '/lecturer/analytics', label: 'Analytics', icon: BarChart3 },
    { href: '/lecturer/profile', label: 'Profile', icon: Settings },
  ];

  const isActive = (path: string) => {
    if (path === '/lecturer' && pathname === '/lecturer') return true;
    if (path !== '/lecturer' && pathname?.startsWith(path)) return true;
    return false;
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 z-50 h-full w-72 transition-transform duration-300 ease-in-out ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      } ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-xl`}>
        
        {/* Sidebar Header */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-gray-200 dark:border-gray-700">
          <Link href="/lecturer" className="flex items-center gap-2">
            <Image src="/Logo.png" alt="Shara" width={32} height={32} />
            <span className={`font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
              Shara Climate
            </span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1 rounded-lg md:hidden hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className={`h-5 w-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`} />
          </button>
        </div>

        {/* User Info */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <img
              src={user?.avatar || '/default-avatar.png'}
              className="h-10 w-10 rounded-full object-cover border-2 border-green-500"
            />
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-semibold truncate ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                {user.name}
              </p>
              <p className={`text-xs capitalize ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {user.role}
              </p>
            </div>
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-lg transition-colors ${
                isDarkMode ? 'hover:bg-gray-700 text-yellow-400' : 'hover:bg-gray-100 text-gray-600'
              }`}
              aria-label="Toggle theme"
            >
              {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 mx-2 rounded-lg transition-colors ${
                  active
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : `${isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleLogout}
            className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg transition-colors ${
              isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <LogOut className="h-5 w-5" />
            <span className="text-sm font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="md:ml-72">
        {/* Top Navbar (Mobile only) */}
        <header className={`sticky top-0 z-40 border-b shadow-sm transition-colors md:hidden ${
          isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <div className="flex h-16 items-center justify-between px-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Menu className={`h-5 w-5 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`} />
            </button>
            <Link href="/lecturer" className="flex items-center gap-2">
              <Image src="/Logo.png" alt="Shara" width={32} height={32} />
              <span className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                Shara Climate
              </span>
            </Link>
            <div className="w-8" /> {/* Spacer */}
          </div>
        </header>

        {/* Desktop Top Navbar (minimal) */}
        <header className={`hidden md:flex sticky top-0 z-40 border-b shadow-sm transition-colors ${
          isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <div className="flex h-16 items-center justify-end px-6 flex-1">
            <div className="flex items-center gap-3">
              <button
                onClick={toggleTheme}
                className={`p-2 rounded-lg transition-colors ${
                  isDarkMode ? 'hover:bg-gray-700 text-yellow-400' : 'hover:bg-gray-100 text-gray-600'
                }`}
                aria-label="Toggle theme"
              >
                {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
              <div className="text-right">
                <p className={`text-sm font-medium transition-colors ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                  {user.name}
                </p>
                <p className={`text-xs capitalize transition-colors ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {user.role}
                </p>
              </div>
              <img
                src={user?.avatar || '/default-avatar.png'}
                className="h-8 w-8 rounded-full object-cover border border-gray-200 dark:border-gray-600"
              />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="p-4 md:p-6">
          {children}
        </main>

        {/* Footer */}
        <footer className={`border-t py-6 px-4 md:px-6 text-center text-sm transition-colors ${
          isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-400' : 'bg-white border-gray-200 text-gray-600'
        }`}>
          <p>© 2024 Shara Climate Academy - Lecturer Portal</p>
        </footer>
      </div>
    </div>
  );
}