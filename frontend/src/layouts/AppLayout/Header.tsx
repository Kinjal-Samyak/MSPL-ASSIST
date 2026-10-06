import { useRef } from 'react';
import { Menu, Monitor, Moon, Search, Sun } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { Avatar, Dropdown, Tooltip } from '@/components/ui';
import { NAVIGATION_ITEMS, ROUTES } from '@/constants';
import { useAuth, useKeyboardShortcut, useTheme, useWorkspace } from '@/hooks';
import type { BreadcrumbItem, ThemeMode } from '@/types';
import { Breadcrumb } from './Breadcrumb';
import { NotificationsMenu } from './NotificationsMenu';

const THEME_ICONS: Record<ThemeMode, typeof Sun> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

function buildBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const nav = NAVIGATION_ITEMS.find(
    (item) => pathname === item.href || pathname.startsWith(item.href + '/')
  );
  return [{ label: 'Home', href: ROUTES.DASHBOARD }, ...(nav ? [{ label: nav.label }] : [])];
}

interface HeaderProps {
  onMobileMenuOpen?: () => void;
}

export function Header({ onMobileMenuOpen }: HeaderProps) {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const { mode, setMode } = useTheme();
  const { workspace } = useWorkspace();
  const ThemeIcon = THEME_ICONS[mode];
  const breadcrumbs = buildBreadcrumbs(pathname);
  const isTrainingEnvironment = workspace.id === 'training';
  const searchInputRef = useRef<HTMLInputElement>(null);

  useKeyboardShortcut('k', () => searchInputRef.current?.focus(), { ctrlOrCmd: true });
  useKeyboardShortcut('Escape', () => searchInputRef.current?.blur());

  const themeItems = [
    {
      id: 'light',
      label: 'Light',
      icon: <Sun className="h-4 w-4" />,
      onClick: () => setMode('light'),
    },
    {
      id: 'dark',
      label: 'Dark',
      icon: <Moon className="h-4 w-4" />,
      onClick: () => setMode('dark'),
    },
    {
      id: 'system',
      label: 'System',
      icon: <Monitor className="h-4 w-4" />,
      onClick: () => setMode('system'),
    },
  ];

  const profileItems = [
    { id: 'profile', label: 'Profile', onClick: () => undefined },
    { id: 'logout', label: 'Sign out', onClick: logout, danger: true, divider: true },
  ];

  return (
    <header className="sticky top-0 z-40 flex h-[64px] shrink-0 items-center gap-3 border-b border-border bg-surface px-5 dark:border-slate-800 dark:bg-slate-950">
      <button
        type="button"
        onClick={onMobileMenuOpen}
        className="rounded-md p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200 lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="min-w-0 flex-1">
        <Breadcrumb items={breadcrumbs} />
      </div>

      {isTrainingEnvironment && (
        <span
          className="hidden rounded-full border border-warning/40 bg-warning/10 px-2.5 py-1 text-xs font-semibold text-amber-900 dark:bg-amber-500/15 dark:text-amber-200 md:inline-flex"
          role="status"
        >
          Training environment
        </span>
      )}

      <div className="hidden w-64 items-center gap-2 rounded-xl border border-transparent bg-slate-100/80 px-3 py-2 transition-all duration-150 motion-reduce:transition-none focus-within:border-yellow-400 focus-within:bg-white focus-within:shadow-sm dark:bg-slate-900 dark:focus-within:border-yellow-500/60 dark:focus-within:bg-slate-900 md:flex">
        <Search className="h-4 w-4 shrink-0 text-gray-400" />
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Search..."
          aria-label="Search"
          className="w-full bg-transparent text-[15px] leading-6 text-gray-900 outline-none placeholder:text-gray-400 dark:text-gray-100"
        />
        <kbd className="hidden shrink-0 rounded border border-slate-300 bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-400 lg:inline-block dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500">
          Ctrl K
        </kbd>
      </div>

      <div className="flex items-center gap-1">
        <NotificationsMenu />

        <Dropdown
          trigger={
            <Tooltip content="Change theme">
              <button className="rounded-md p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200">
                <ThemeIcon className="h-5 w-5" />
              </button>
            </Tooltip>
          }
          items={themeItems}
        />

        <Dropdown
          trigger={
            <button className="flex items-center gap-2 rounded-md py-1 pl-1 pr-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800">
              <Avatar name={user?.name ?? 'User'} size="sm" />
              <span className="hidden max-w-32 truncate text-sm font-medium text-gray-700 dark:text-gray-300 lg:block">
                {user?.name ?? 'User'}
              </span>
            </button>
          }
          items={profileItems}
        />
      </div>
    </header>
  );
}
