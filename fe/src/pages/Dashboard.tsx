import { useEffect, useState } from 'react';
import { Building2, Users, LayoutGrid } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getCompanies, type CompanyOut } from '../api/companies';
import { StatCard } from '../components/ui/StatCard';
import { Spinner } from '../components/ui/Spinner';

export function Dashboard() {
  const { user } = useAuth();
  const [companies, setCompanies] = useState<CompanyOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getCompanies()
      .then(setCompanies)
      .catch(() => setError('Failed to load data.'))
      .finally(() => setLoading(false));
  }, []);

  const totalEmployees = companies.reduce((sum, c) => sum + c.total_employees, 0);
  const totalDepartments = companies.reduce((sum, c) => sum + c.total_departments, 0);

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
      ) : error ? (
        <p className="text-sm text-red-500">{error}</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard icon={Building2} label="Companies" value={companies.length} />
          <StatCard icon={LayoutGrid} label="Departments" value={totalDepartments} iconClass="text-blue-400" />
          <StatCard icon={Users} label="Employees" value={totalEmployees} iconClass="text-violet-400" />
        </div>
      )}
    </div>
  );
}
