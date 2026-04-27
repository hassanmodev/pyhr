import { useNavigate } from 'react-router-dom';
import { Building2, Pencil, Trash2 } from 'lucide-react';
import { Spinner } from '../components/ui/Spinner';
import type { CompanyOut } from '../api/companies';

type Props = {
  loading: boolean;
  companies: CompanyOut[];
  onOpenCreate: () => void;
  onOpenEdit: (c: CompanyOut) => void;
  onRequestDelete: (c: CompanyOut) => void;
};

export function CompaniesList({
  loading,
  companies,
  onOpenCreate,
  onOpenEdit,
  onRequestDelete,
}: Props) {
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-text-muted text-sm">
        <Spinner className="w-4 h-4" /> Loading…
      </div>
    );
  }
  if (companies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-text-muted">
        <Building2 size={32} className="mb-3 opacity-30" />
        <p className="text-sm">No companies yet.</p>
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
            <th className="text-right text-xs text-text-muted font-medium px-4 py-3">Depts</th>
            <th className="text-right text-xs text-text-muted font-medium px-4 py-3">Employees</th>
            <th className="text-right text-xs text-text-muted font-medium px-4 py-3">Created</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {companies.map((c, i) => (
            <tr
              key={c.id}
              onClick={() => navigate(`/departments?company_id=${c.id}`)}
              className={`${
                i < companies.length - 1 ? 'border-b border-border' : ''
              } hover:bg-surface-hover transition-colors cursor-pointer`}
              title="View departments for this company"
            >
              <td className="px-4 py-3 font-medium text-text-main">{c.name}</td>
              <td className="px-4 py-3 text-right text-text-muted">{c.total_departments}</td>
              <td className="px-4 py-3 text-right text-text-muted">{c.total_employees}</td>
              <td className="px-4 py-3 text-right text-text-muted">
                {new Date(c.created_at).toLocaleDateString()}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      onOpenEdit(c);
                    }}
                    className="p-1 text-text-muted hover:text-text-main transition-colors cursor-pointer"
                    title="Edit"
                    type="button"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      onRequestDelete(c);
                    }}
                    className="p-1 text-text-muted hover:text-red-500 transition-colors cursor-pointer"
                    title="Delete"
                    type="button"
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
