import { type MouseEvent } from 'react';
import { Building2, Pencil, Trash2, Users } from 'lucide-react';
import { Spinner } from '../components/ui/Spinner';
import type { DeptOut } from '../api/departments';
type Props = {
  loading: boolean;
  isAdmin: boolean;
  departments: DeptOut[];
  onOpenCreate: () => void;
  onOpenEdit: (d: DeptOut) => void;
  onRequestDelete: (d: DeptOut) => void;
  getCompanyName: (id: number) => string;
  viewEmployees: (d: DeptOut) => void;
  viewCompanyEmployees: (e: MouseEvent, companyId: number) => void;
};

export function DepartmentsList({
  loading,
  isAdmin,
  departments,
  onOpenCreate,
  onOpenEdit,
  onRequestDelete,
  getCompanyName,
  viewEmployees,
  viewCompanyEmployees,
}: Props) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-text-muted text-sm">
        <Spinner className="w-4 h-4" /> Loading…
      </div>
    );
  }
  if (departments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-text-muted">
        <Building2 size={32} className="mb-3 opacity-30" />
        <p className="text-sm">No departments yet.</p>
        <button onClick={onOpenCreate} className="text-sm text-primary-500 hover:underline mt-1">
          Create one
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
            {isAdmin && (
              <th className="text-left text-xs text-text-muted font-medium px-4 py-3">Company</th>
            )}
            <th className="text-right text-xs text-text-muted font-medium px-4 py-3">Employees</th>
            <th className="text-right text-xs text-text-muted font-medium px-4 py-3">Created</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {departments.map((d, i) => (
            <tr
              key={d.id}
              onClick={() => viewEmployees(d)}
              className={`${
                i < departments.length - 1 ? 'border-b border-border' : ''
              } hover:bg-surface-hover transition-colors ${isAdmin ? 'cursor-pointer' : ''}`}
              title={isAdmin ? 'Click to view employees' : undefined}
            >
              <td className="px-4 py-3 font-medium text-text-main">{d.name}</td>
              {isAdmin && (
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={e => viewCompanyEmployees(e, d.company_id)}
                    className="text-left text-text-muted hover:text-primary-600 hover:underline cursor-pointer"
                    title="View employees in this company"
                  >
                    {getCompanyName(d.company_id)}
                  </button>
                </td>
              )}
              <td className="px-4 py-3 text-right">
                <span className="inline-flex items-center gap-1 text-text-muted">
                  <Users size={14} />
                  {d.active_employee_count}
                </span>
              </td>
              <td className="px-4 py-3 text-right text-text-muted">
                {new Date(d.created_at).toLocaleDateString()}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      onOpenEdit(d);
                    }}
                    className="p-1 text-text-muted hover:text-text-main transition-colors cursor-pointer"
                    title="Edit"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      onRequestDelete(d);
                    }}
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
