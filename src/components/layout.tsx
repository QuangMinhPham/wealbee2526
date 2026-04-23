import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router';
import {
  Calculator,
  Menu,
  X,
  ChevronDown,
  Home,
  BookOpen,
  LogOut,
  User
} from 'lucide-react';
import { useAuth } from '../lib/auth-context';
import { ThemeToggle } from './theme-toggle';
import { NotificationBell } from './NotificationBell';
import wealbeeLogoUrl from '../assets/BRAND_NAME-logo-color.svg';

interface NavItem {
  label: string;
  icon: any;
  path?: string;
  children?: { label: string; path: string }[];
}

const navItems: NavItem[] = [
  {
    label: 'Trang chủ',
    icon: Home,
    children: [
      { label: 'Danh Mục', path: '/app' },
      { label: 'Thị Trường', path: '/app/markets' },
      { label: 'Bee AI', path: '/app/pi-ai' },
    ]
  },
  {
    label: 'Công Cụ',
    icon: Calculator,
    children: [
      { label: 'Máy Tính Đầu Tư', path: '/app/calculator' },
      { label: 'So Sánh Cổ Phiếu', path: '/app/compare' },
      { label: 'Sức Khỏe Danh Mục', path: '/app/my-goal' },
    ]
  },
  {
    label: 'Kiến Thức',
    icon: BookOpen,
    children: [
      { label: 'Hướng Dẫn', path: '/app/guides' },
      { label: 'Top Cổ Phiếu', path: '/app/top-stocks' },
    ]
  }
];

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedSections, setExpandedSections] = useState<string[]>(['Trang chủ']);
  const location = useLocation();
  const { user, logout } = useAuth();

  const toggleSection = (label: string) => {
    setExpandedSections(prev =>
      prev.includes(label)
        ? prev.filter(item => item !== label)
        : [...prev, label]
    );
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-slate-950 transition-colors duration-200">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-0'
        } bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-700 transition-all duration-300 overflow-hidden flex flex-col`}
      >
        {/* Logo */}
        <div className="p-5 border-b border-gray-200 dark:border-slate-700">
          <img src={wealbeeLogoUrl} alt="Wealbee" className="h-20" />
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3">
          {navItems.map((item) => (
            <div key={item.label} className="mb-1">
              <button
                onClick={() => toggleSection(item.label)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors text-gray-700 dark:text-slate-300"
              >
                <div className="flex items-center gap-2.5">
                  <item.icon className="size-4 text-gray-500 dark:text-slate-400" />
                  {sidebarOpen && (
                    <span className="text-sm font-medium">{item.label}</span>
                  )}
                </div>
                {sidebarOpen && item.children && (
                  <ChevronDown
                    className={`size-3.5 text-gray-400 dark:text-slate-500 transition-transform ${
                      expandedSections.includes(item.label) ? 'rotate-180' : ''
                    }`}
                  />
                )}
              </button>

              {sidebarOpen && item.children && expandedSections.includes(item.label) && (
                <div className="ml-6 mt-0.5 space-y-0.5">
                  {item.children.map((child) => (
                    <Link
                      key={child.path}
                      to={child.path}
                      className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                        isActive(child.path)
                          ? 'bg-[#4980DF]/10 text-[#4980DF] font-medium dark:bg-[#4980DF]/20 dark:text-[#7aa8ef]'
                          : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-slate-200'
                      }`}
                    >
                      {child.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* User Profile */}
        {sidebarOpen && user && (
          <div className="p-4 border-t border-gray-200 dark:border-slate-700">
            <div className="flex items-center gap-3 mb-3">
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-9 h-9 rounded-full" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-[#4980DF]/10 dark:bg-[#4980DF]/20 flex items-center justify-center">
                  <User className="w-4 h-4 text-[#4980DF]" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user.name}</p>
                <p className="text-xs text-gray-500 dark:text-slate-400 truncate">{user.email}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-lg transition-colors text-sm"
            >
              <LogOut className="w-4 h-4" />
              Đăng xuất
            </button>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 px-5 py-3.5">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-gray-600 dark:text-slate-400"
            >
              {sidebarOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>

            <div className="flex-1">
              <h2 className="font-semibold text-gray-900 dark:text-white text-sm">
                {navItems
                  .flatMap(item => item.children || [])
                  .find(child => child.path === location.pathname)?.label || 'Dashboard'}
              </h2>
            </div>

            {/* Notification Bell */}
            <NotificationBell />

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* User avatar (when sidebar closed) */}
            {!sidebarOpen && user && (
              <div className="flex items-center gap-2.5">
                <span className="text-sm text-gray-700 dark:text-slate-300 hidden sm:block">{user.name}</span>
                {user.avatar ? (
                  <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[#4980DF]/10 dark:bg-[#4980DF]/20 flex items-center justify-center">
                    <User className="w-4 h-4 text-[#4980DF]" />
                  </div>
                )}
              </div>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
