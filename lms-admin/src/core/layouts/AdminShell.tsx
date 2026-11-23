import { useEffect } from 'react';
import { NavLink, Outlet, useNavigation } from 'react-router';
import {
  GraduationCap,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from 'lucide-react';
import { adminNav } from '@/core/config/navigation';
import { useUiStore } from '@/core/store/useUiStore';
import { useAdminLogout, useAdminSession } from '@/features/auth';
import { cn } from '@/shared/utils/cn';
import { initials } from '@/shared/utils/initials';
import Breadcrumbs from './Breadcrumbs';

const SidebarBody = ({
  collapsed = false,
  onNavigate,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
}) => (
  <>
    <div
      className={cn(
        'flex h-16 items-center gap-3',
        collapsed ? 'justify-center px-2' : 'px-5',
      )}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-card text-brand shadow-sm">
        <GraduationCap className="h-5 w-5" />
      </div>
      {!collapsed && (
        <div className="leading-tight">
          <span className="block whitespace-nowrap text-lg font-bold">
            Hybrid LMS
          </span>
          <span className="block text-[10px] font-semibold uppercase tracking-wider opacity-70">
            Admin
          </span>
        </div>
      )}
    </div>
    <nav
      className={cn('flex-1 space-y-1 py-2', collapsed ? 'px-2' : 'px-3')}
      aria-label="Main navigation"
    >
      {adminNav.map(({ label, to, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          onClick={onNavigate}
          title={collapsed ? label : undefined}
          aria-label={collapsed ? label : undefined}
          className={({ isActive }) =>
            cn(
              'flex items-center rounded-xl py-2.5 text-sm font-medium no-underline transition-colors',
              collapsed ? 'justify-center px-0' : 'gap-3 px-3',
              isActive
                ? 'bg-card text-brand shadow-sm'
                : 'text-sidebar-foreground/80 hover:bg-white/40 hover:text-sidebar-foreground dark:hover:bg-white/10',
            )
          }
        >
          <Icon className="h-4 w-4 shrink-0" />
          {!collapsed && <span className="whitespace-nowrap">{label}</span>}
        </NavLink>
      ))}
    </nav>
  </>
);

const AdminShell = () => {
  const { data: user } = useAdminSession();
  const { mutate: logout, isPending: isLoggingOut } = useAdminLogout();
  const mobileNavOpen = useUiStore((state) => state.mobileNavOpen);
  const setMobileNavOpen = useUiStore((state) => state.setMobileNavOpen);
  const collapsed = useUiStore((state) => state.sidebarCollapsed);
  const toggleSidebar = useUiStore((state) => state.toggleSidebar);
  const isNavigating = useNavigation().state === 'loading';

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'b') {
        return;
      }
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) {
        return;
      }
      event.preventDefault();
      toggleSidebar();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [toggleSidebar]);

  const ToggleIcon = collapsed ? PanelLeftOpen : PanelLeftClose;

  return (
    <div className="flex min-h-screen bg-background">
      <aside
        id="admin-sidebar"
        className={cn(
          'sticky top-0 hidden h-screen shrink-0 flex-col overflow-hidden bg-sidebar text-sidebar-foreground transition-[width] duration-200 motion-reduce:transition-none md:flex',
          collapsed ? 'w-[72px]' : 'w-64',
        )}
      >
        <SidebarBody collapsed={collapsed} />
      </aside>

      {mobileNavOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 cursor-default border-0 bg-foreground/40"
            onClick={() => setMobileNavOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col bg-sidebar text-sidebar-foreground shadow-xl">
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setMobileNavOpen(false)}
              className="absolute right-3 top-4 rounded-md border-0 bg-transparent p-1"
            >
              <X className="h-5 w-5" />
            </button>
            <SidebarBody onNavigate={() => setMobileNavOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-card/90 px-4 backdrop-blur sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open menu"
              className="rounded-md border-0 bg-transparent p-2 hover:bg-accent md:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={toggleSidebar}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-expanded={!collapsed}
              aria-controls="admin-sidebar"
              title={`${collapsed ? 'Expand' : 'Collapse'} sidebar (Ctrl+B)`}
              className="hidden rounded-md border-0 bg-transparent p-2 hover:bg-accent md:inline-flex"
            >
              <ToggleIcon className="h-5 w-5" />
            </button>
            <span className="text-sm font-medium text-brand">Admin Portal</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <div className="ml-1 hidden text-right sm:block">
              <p className="m-0 text-sm font-medium">{user?.fullName ?? 'Admin'}</p>
              <p className="m-0 text-xs text-muted-foreground">{user?.email}</p>
            </div>
            <div
              className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground"
              aria-hidden="true"
            >
              {initials(user?.fullName)}
            </div>
            <button
              type="button"
              onClick={() => logout()}
              disabled={isLoggingOut}
              aria-label="Sign out"
              className="rounded-md border-0 bg-transparent p-2 hover:bg-accent disabled:opacity-50"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>
        {isNavigating && (
          <div
            role="progressbar"
            aria-label="Loading page"
            className="fixed inset-x-0 top-0 z-50 h-0.5 animate-pulse bg-primary"
          />
        )}
        <main className="min-w-0 flex-1 overflow-x-clip p-4 sm:p-6">
          <Breadcrumbs />
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminShell;
