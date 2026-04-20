import { Pencil, Search, Trash2, Users } from 'lucide-react';
import type { EmployeeOut, UserRole } from '../../api/employees';
import { Spinner } from '../../components/ui/Spinner';
import { ROLE_LABEL } from './utils';
import { StatusBadge } from './StatusBadge';

type Props = {
  loading: boolean;
  employees: EmployeeOut[];
  filteredEmployees: EmployeeOut[];
  isAdmin: boolean;
  getCompanyName: (id: number | null) => string;
  getDepartmentName: (id: number | null) => string;
  onNavigateCompanyFilter: (companyId: number) => void;
  onEdit: (emp: EmployeeOut) => void;
  onDelete: (emp: EmployeeOut) => void;
  onClearSearch: () => void;
  onCreateFirst: () => void;
};

export function EmployeesTable({
  loading,
  employees,
  filteredEmployees,
  isAdmin,
  getCompanyName,
  getDepartmentName,
  onNavigateCompanyFilter,
  onEdit,
  onDelete,
  onClearSearch,
  onCreateFirst,
}: Props) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-text-muted text-sm">
        <Spinner className="w-4 h-4" /> Loading…
      </div>
    );
  }

  if (employees.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-text-muted">
        <Users size={32} className="mb-3 opacity-30" />
        <p className="text-sm">No employees yet.</p>
        <button onClick={onCreateFirst} className="text-sm text-primary-500 hover:underline mt-1">
          Create one
        </button>
      </div>
    );
  }

  if (filteredEmployees.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-text-muted">
        <Search size={32} className="mb-3 opacity-30" />
        <p className="text-sm">No employees match your search.</p>
        <button onClick={onClearSearch} className="text-sm text-primary-500 hover:underline mt-1">
          Clear search
        </button>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left text-xs text-text-muted font-medium px-4 py-3">Name</th>
            <th className="text-left text-xs text-text-muted font-medium px-4 py-3">Title</th>
            <th className="text-left text-xs text-text-muted font-medium px-4 py-3">Role</th>
            {isAdmin && (
              <th className="text-left text-xs text-text-muted font-medium px-4 py-3">Company</th>
            )}
            <th className="text-left text-xs text-text-muted font-medium px-4 py-3">Department</th>
            <th className="text-left text-xs text-text-muted font-medium px-4 py-3">Status</th>
            <th className="text-right text-xs text-text-muted font-medium px-4 py-3">Hired</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {filteredEmployees.map((emp, i) => (
            <tr
              key={emp.id}
              className={`${i < filteredEmployees.length - 1 ? 'border-b border-border' : ''} hover:bg-surface-hover transition-colors`}
            >
              <td className="px-4 py-3">
                <div className="font-medium text-text-main">{emp.full_name}</div>
                <div className="text-xs text-text-muted">{emp.email}</div>
              </td>
              <td className="px-4 py-3 text-text-muted">{emp.title}</td>
              <td className="px-4 py-3 text-text-muted">
                {ROLE_LABEL[emp.role as UserRole]}
              </td>
              {isAdmin && (
                <td className="px-4 py-3">
                  {emp.company_id != null ? (
                    <button
                      type="button"
                      onClick={() => onNavigateCompanyFilter(emp.company_id!)}
                      className="text-left text-text-muted hover:text-primary-600 hover:underline cursor-pointer"
                      title="Filter by this company"
                    >
                      {getCompanyName(emp.company_id)}
                    </button>
                  ) : (
                    <span className="text-text-muted">—</span>
                  )}
                </td>
              )}
              <td className="px-4 py-3 text-text-muted">{getDepartmentName(emp.department_id)}</td>
              <td className="px-4 py-3">
                <StatusBadge status={emp.status} />
              </td>
              <td className="px-4 py-3 text-right text-text-muted">
                {new Date(emp.hire_date).toLocaleDateString()}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => onEdit(emp)}
                    className="p-1 text-text-muted hover:text-text-main transition-colors cursor-pointer"
                    title="Edit"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => onDelete(emp)}
                    className="p-1 text-text-muted hover:text-red-500 transition-colors cursor-pointer"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
