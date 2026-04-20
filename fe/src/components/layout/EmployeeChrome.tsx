import { LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export function EmployeeChrome() {
  const { user, logout } = useAuth();

  return (
    <header className="shrink-0 border-b border-border bg-surface px-6 py-3 flex items-center justify-between">
      <span className="text-base font-semibold text-primary-600">pyhr</span>
      <div className="flex items-center gap-4">
        <span className="text-xs text-text-muted truncate max-w-[200px]">{user?.email}</span>
        <button
          type="button"
          onClick={logout}
          className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-main transition-colors"
        >
          <LogOut size={13} />
          Sign out
        </button>
      </div>
    </header>
  );
}
