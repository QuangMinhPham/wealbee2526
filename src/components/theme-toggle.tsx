import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

interface ThemeToggleProps {
  className?: string;
  variant?: 'default' | 'ghost-dark'; // ghost-dark = for use on dark backgrounds (landing/login)
}

export function ThemeToggle({ className = '', variant = 'default' }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="w-9 h-9" />;

  const isDark = theme === 'dark';

  const baseStyles =
    variant === 'ghost-dark'
      ? 'p-2 rounded-lg transition-all text-white/70 hover:text-white hover:bg-white/10'
      : 'p-2 rounded-lg transition-all text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800';

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className={`${baseStyles} ${className}`}
      aria-label={isDark ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
      title={isDark ? 'Chế độ sáng' : 'Chế độ tối'}
    >
      {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </button>
  );
}
