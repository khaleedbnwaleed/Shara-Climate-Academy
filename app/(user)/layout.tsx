'use client';
import Chatbot from '@/components/chatbot/Chatbot';
import Image from 'next/image';
import { useAuth } from '@/context/auth-context';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { 
  BookOpen, LogOut, LayoutDashboard, User, Moon, Sun, 
  Menu, X, GraduationCap, Award, Calendar, Settings, 
  TrendingUp, Bell, Home, HelpCircle, ChevronRight,
  Sparkles, Target, Activity, Flame
} from 'lucide-react';
import { useTheme } from '@/context/theme-context';

export default function StudentLayout({
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
  const [notifications] = useState(3);
  const [learningStreak, setLearningStreak] = useState(0);
  const [lastActiveDate, setLastActiveDate] = useState<string | null>(null);

  // Calculate real learning streak
  useEffect(() => {
    if (user) {
      calculateStreak();
    }
  }, [user]);

  const calculateStreak = () => {
    const today = new Date().toDateString();
    const savedLastActive = localStorage.getItem(`last_active_${user?.uid}`);
    const savedStreak = localStorage.getItem(`learning_streak_${user?.uid}`);
    
    let streak = savedStreak ? parseInt(savedStreak) : 0;
    
    if (savedLastActive) {
      const lastActive = new Date(savedLastActive);
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      if (lastActive.toDateString() === yesterday.toDateString()) {
        streak = streak + 1;
      } else if (lastActive.toDateString() === today) {
        streak = streak;
      } else {
        streak = 1;
      }
    } else {
      streak = 1;
    }
    
    setLearningStreak(streak);
    setLastActiveDate(today);
    localStorage.setItem(`last_active_${user?.uid}`, today);
    localStorage.setItem(`learning_streak_${user?.uid}`, streak.toString());
  };

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
    if (!loading && user && (user.role === 'lecturer' || user.role === 'admin')) {
      router.replace(user.role === 'lecturer' ? '/lecturer' : '/admin');
    }
  }, [loading, user, router]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    await logout();
    router.replace('/');
  };

  if (loading) {
    return (
      <div className={`h-screen flex items-center justify-center ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50'}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (!user || (user.role !== 'student' && user.role !== 'professional')) {
    return null;
  }

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/courses', label: 'Courses', icon: BookOpen },
    { href: '/my-learning', label: 'My Learning', icon: GraduationCap },
    { href: '/certificates', label: 'Certificates', icon: Award },
    { href: '/profile', label: 'Profile', icon: User },
  ];

  const isActive = (path: string) => {
    if (path === '/dashboard' && pathname === '/dashboard') return true;
    if (path !== '/dashboard' && pathname?.startsWith(path)) return true;
    return false;
  };

  const getStreakMessage = () => {
    if (learningStreak === 0) return 'Start learning today!';
    if (learningStreak === 1) return 'Great start! 🔥';
    if (learningStreak <= 3) return 'Keep it going! 🔥';
    if (learningStreak <= 6) return 'Amazing streak! 🔥';
    return 'Unstoppable! 🔥';
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
          <Link href="/dashboard" className="flex items-center gap-2">
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
                {item.label === 'Certificates' && user?.completedCourses?.length > 0 && (
                  <span className="ml-auto text-xs bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400 px-2 py-0.5 rounded-full">
                    {user.completedCourses.length}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="mb-4 p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
            <div className="flex items-center gap-2 mb-2">
              <Flame className={`h-4 w-4 ${learningStreak >= 3 ? 'text-orange-500' : 'text-green-600'}`} />
              <span className="text-xs font-medium text-green-600 dark:text-green-400">Learning Streak</span>
            </div>
            <p className="text-lg font-bold text-green-700 dark:text-green-400">{learningStreak} day{learningStreak !== 1 ? 's' : ''}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{getStreakMessage()}</p>
            {learningStreak === 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Complete a lesson to start your streak!</p>
            )}
          </div>
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
            <Link href="/dashboard" className="flex items-center gap-2">
              <Image src="/Logo.png" alt="Shara" width={32} height={32} />
              <span className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                Shara Climate
              </span>
            </Link>
            <div className="w-8" />
          </div>
        </header>

        {/* Desktop Top Navbar */}
        <header className={`hidden md:flex sticky top-0 z-40 border-b shadow-sm transition-colors ${
          isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
        }`}>
          <div className="flex h-16 items-center justify-end px-6 flex-1">
            <div className="flex items-center gap-3">
              <button className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                <Bell className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                {notifications > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                )}
              </button>
              <div className="text-right">
                <p className={`text-sm font-medium ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                  {user.name}
                </p>
                <p className={`text-xs capitalize ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
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
          <p>© 2026 Shara Climate Academy. All rights reserved.</p>
        </footer>
      </div>

      {/* Chatbot - Added at the end of the component */}
      <Chatbot />
    </div>
  );
}