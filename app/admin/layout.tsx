'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import {
  Banknote,
  LayoutDashboard,
  BookOpen,
  Users,
  TrendingUp,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Moon,
  UserCheck,
  Sun,
} from 'lucide-react';

import { useAuth } from '@/context/auth-context';
import { useTheme } from '@/context/theme-context';

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  isNaira?: boolean;
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const isDarkMode = theme === 'dark';
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const checkScreen = () => {
      const mobile = window.innerWidth < 768;

      setIsMobile(mobile);
      setSidebarOpen(!mobile);
    };

    checkScreen();

    window.addEventListener('resize', checkScreen);

    return () => window.removeEventListener('resize', checkScreen);
  }, []);

  const navItems: NavItem[] = [
    { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/users', label: 'Accounts', icon: Users },
    {
      href: '/admin/courses-management',
      label: 'Courses',
      icon: BookOpen,
    },
    { href: '/admin/approvals', label: 'Approvals', icon: UserCheck },
    { href: '/admin/analytics', label: 'Analytics', icon: TrendingUp },
    { href: '/admin/payments', label: 'Payments', icon: Banknote },
    {
      href: '/admin/revenue',
      label: 'Revenue',
      icon: Banknote,
      isNaira: true,
    },
    {
      href: '/admin/payouts',
      label: 'Payouts',
      icon: Banknote,
      isNaira: true,
    },
    { href: '/admin/settings', label: 'Settings', icon: Settings },
  ];

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <div
      className={`min-h-screen ${
        isDarkMode ? 'bg-gray-900' : 'bg-gray-50'
      }`}
    >
      {/* Mobile overlay */}
      {sidebarOpen && isMobile && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-50 flex h-full flex-col overflow-hidden border-r transition-all duration-300 ${
          sidebarOpen ? 'w-64' : 'w-0 lg:w-20'
        } ${
          sidebarOpen
            ? 'translate-x-0'
            : '-translate-x-full lg:translate-x-0'
        } ${
          isDarkMode
            ? 'border-gray-700 bg-gray-800'
            : 'border-gray-200 bg-white'
        }`}
      >
        {/* Logo */}
        <div
          className={`flex h-16 items-center justify-between border-b px-4 ${
            isDarkMode ? 'border-gray-700' : 'border-gray-200'
          }`}
        >
          {sidebarOpen && (
            <Link href="/admin" className="flex items-center gap-2">
              <img
                src="/Logo.png"
                alt="Shara"
                className="h-8 w-8 object-contain"
              />
              <span
                className={`font-semibold ${
                  isDarkMode ? 'text-white' : 'text-gray-800'
                }`}
              >
                Admin Panel
              </span>
            </Link>
          )}

          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
            className={`rounded-lg p-2 transition-colors ${
              isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
            } ${!sidebarOpen ? 'mx-auto' : ''}`}
          >
            {sidebarOpen ? (
              <X
                className={`h-5 w-5 ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}
              />
            ) : (
              <Menu
                className={`h-5 w-5 ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}
              />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              pathname.startsWith(`${item.href}/`);

            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => {
                  if (isMobile) {
                    setSidebarOpen(false);
                  }
                }}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all duration-200 ${
                  isActive
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : isDarkMode
                      ? 'text-gray-400 hover:bg-gray-700 hover:text-white'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                {item.isNaira ? (
                  <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center text-lg font-bold text-green-600 dark:text-green-400">
                    ₦
                  </span>
                ) : (
                  <Icon className="h-5 w-5 flex-shrink-0" />
                )}

                {sidebarOpen && (
                  <span className="text-sm">{item.label}</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Theme Toggle */}
        <div
          className={`border-t p-3 ${
            isDarkMode ? 'border-gray-700' : 'border-gray-200'
          }`}
        >
          <button
            type="button"
            onClick={toggleTheme}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 transition-colors ${
              isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
            }`}
          >
            {isDarkMode ? (
              <Sun className="h-5 w-5 text-yellow-400" />
            ) : (
              <Moon className="h-5 w-5 text-gray-600" />
            )}

            {sidebarOpen && (
              <span
                className={`text-sm ${
                  isDarkMode ? 'text-gray-300' : 'text-gray-700'
                }`}
              >
                {isDarkMode ? 'Light Mode' : 'Dark Mode'}
              </span>
            )}
          </button>
        </div>

        {/* User Section */}
        <div
          className={`border-t p-3 ${
            isDarkMode ? 'border-gray-700' : 'border-gray-200'
          }`}
        >
          <div className="relative">
            <button
              type="button"
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 transition-colors ${
                isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
              }`}
            >
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <span className="text-sm font-medium text-green-700 dark:text-green-400">
                  {user?.name?.charAt(0).toUpperCase() || 'A'}
                </span>
              </div>

              {sidebarOpen && (
                <>
                  <div className="flex-1 text-left">
                    <p
                      className={`truncate text-sm font-medium ${
                        isDarkMode ? 'text-white' : 'text-gray-800'
                      }`}
                    >
                      {user?.name || 'Admin'}
                    </p>

                    <p
                      className={`text-xs capitalize ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}
                    >
                      {user?.role}
                    </p>
                  </div>

                  <ChevronDown
                    className={`h-4 w-4 ${
                      isDarkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}
                  />
                </>
              )}
            </button>

            {userMenuOpen && sidebarOpen && (
              <div
                className={`absolute bottom-full left-0 right-0 z-50 mb-2 rounded-lg border py-1 shadow-lg ${
                  isDarkMode
                    ? 'border-gray-700 bg-gray-800'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <button
                  type="button"
                  onClick={handleLogout}
                  className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                    isDarkMode
                      ? 'text-red-400 hover:bg-gray-700'
                      : 'text-red-600 hover:bg-red-50'
                  }`}
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div
        className={`transition-all duration-300 ${
          sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'
        }`}
      >
        {/* Top Header */}
        <header
          className={`sticky top-0 z-30 border-b ${
            isDarkMode
              ? 'border-gray-700 bg-gray-800'
              : 'border-gray-200 bg-white'
          }`}
        >
          <div className="flex h-16 items-center justify-between px-4 md:px-6">
            <div className="flex items-center gap-3">
              <Link
                href="/admin"
                className="flex items-center gap-2 lg:hidden"
              >
                <img
                  src="/Logo.png"
                  alt="Shara"
                  className="h-8 w-8 object-contain"
                />

                <span
                  className={`text-sm font-semibold ${
                    isDarkMode ? 'text-white' : 'text-gray-800'
                  }`}
                >
                  Admin
                </span>
              </Link>

              <button
                type="button"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                aria-label="Toggle sidebar"
                className={`rounded-lg p-2 transition-colors ${
                  isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                }`}
              >
                <Menu
                  className={`h-5 w-5 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-600'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center gap-2 md:gap-3">
              <div className="relative lg:hidden">
                <button
                  type="button"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  aria-label="Open user menu"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30"
                >
                  <span className="text-sm font-medium text-green-700 dark:text-green-400">
                    {user?.name?.charAt(0).toUpperCase() || 'A'}
                  </span>
                </button>

                {userMenuOpen && (
                  <div
                    className={`absolute right-0 top-full z-50 mt-2 w-48 rounded-lg border py-1 shadow-lg ${
                      isDarkMode
                        ? 'border-gray-700 bg-gray-800'
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div
                      className={`border-b px-4 py-2 ${
                        isDarkMode
                          ? 'border-gray-700'
                          : 'border-gray-200'
                      }`}
                    >
                      <p
                        className={`text-sm font-medium ${
                          isDarkMode ? 'text-white' : 'text-gray-800'
                        }`}
                      >
                        {user?.name}
                      </p>

                      <p
                        className={`text-xs ${
                          isDarkMode ? 'text-gray-400' : 'text-gray-500'
                        }`}
                      >
                        {user?.email}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleLogout}
                      className={`flex w-full items-center gap-2 px-4 py-2 text-sm transition-colors ${
                        isDarkMode
                          ? 'text-red-400 hover:bg-gray-700'
                          : 'text-red-600 hover:bg-red-50'
                      }`}
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
