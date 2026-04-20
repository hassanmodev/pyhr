import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Building2, Users, BookOpen, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface NavItem {
  to: string;
  icon: typeof LayoutDashboard;
  label: string;
  end?: boolean;
}

const ADMIN_NAV: NavItem[] = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/companies', icon: Building2, label: 'Companies' },
  { to: '/departments', icon: BookOpen, label: 'Departments' },
  { to: '/employees', icon: Users, label: 'Employees' },
];

export function Sidebar() {
  const { user, logout } = useAuth();
  const items = ADMIN_NAV;

  return (
    <aside className="w-56 shrink-0 flex flex-col bg-surface border-r border-border">
      <div className="px-5 py-4 border-b border-border">
        <span className="text-base font-semibold text-primary-600">pyhr</span>
      </div>

      <nav className="flex-1 px-2 py-3 space-y-0.5">
        {items.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${isActive
                ? 'bg-primary-50 text-primary-600 font-medium'
                : 'text-text-muted hover:bg-surface-hover hover:text-text-main'
              }`
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-4 py-4 border-t border-border">
        <p className="text-xs text-text-muted truncate mb-0.5">{user?.email}</p>
        <p className="text-xs text-text-muted mb-3">{user?.role}</p>
        <button
          onClick={logout}
          className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-main transition-colors"
        >
          <LogOut size={13} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
