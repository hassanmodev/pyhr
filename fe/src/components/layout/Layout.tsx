import { Navigate, Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { HrTopNav } from './HrTopNav';
import { EmployeeChrome } from './EmployeeChrome';
import { useAuth } from '../../contexts/AuthContext';
import { Spinner } from '../ui/Spinner';

export function Layout() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Spinner className="w-5 h-5" />
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const isAdmin = user.role === 'system_admin';
  const isHr = user.role === 'hr_manager';

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {isAdmin && <Sidebar />}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {isHr && <HrTopNav />}
        {user.role === 'employee' && <EmployeeChrome />}
        <main className="flex-1 overflow-y-auto p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
