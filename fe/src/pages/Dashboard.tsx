import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Navigate } from 'react-router-dom';
import { Building2, Users, LayoutGrid } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getCompanies, type CompanyOut } from '../api/companies';
import { StatCard } from '../components/ui/StatCard';
import { Spinner } from '../components/ui/Spinner';

export function Dashboard() {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<CompanyOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    if (user?.role === 'employee') {
      setLoading(false);
      return;
    }
    getCompanies()
      .then(c => {
        setCompanies(c);
        setLoadFailed(false);
      })
      .catch(() => {
        setLoadFailed(true);
        toast.error('Failed to load dashboard data.');
      })
      .finally(() => setLoading(false));
  }, [user?.role]);

  const totalEmployees = companies.reduce((sum, c) => sum + c.total_employees, 0);
  const totalDepartments = companies.reduce((sum, c) => sum + c.total_departments, 0);

  if (user?.role === 'employee') {
    return <Navigate to="/" replace />;
  }

  const isAdmin = user?.role === 'system_admin';

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h2 className="text-xl font-medium text-text-main">Dashboard</h2>
        <p className="text-sm text-text-muted mt-1">
          Welcome back, <span className="text-text-main">{user?.email}</span>
        </p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-text-muted text-sm">
          <Spinner className="w-4 h-4" /> Loading…
        </div>
      ) : loadFailed ? (
        <p className="text-sm text-text-muted">Stats unavailable. Check your connection and try again.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            icon={Building2}
            label={isAdmin ? 'Companies' : (companies[0]?.name ?? 'Company')}
            value={companies.length}
            to={isAdmin ? '/companies' : undefined}
          />
          <StatCard
            icon={LayoutGrid}
            label="Departments"
            value={totalDepartments}
            iconClass="text-blue-400"
            to="/departments"
          />
          <StatCard
            icon={Users}
            label="Employees"
            value={totalEmployees}
            iconClass="text-violet-400"
            to="/employees"
          />
        </div>
      )}
    </div>
  );
}
