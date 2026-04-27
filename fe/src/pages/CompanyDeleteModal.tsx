import { Modal } from '../components/ui/Modal';
import { Spinner } from '../components/ui/Spinner';
import { apiError } from '../lib/apiError';
import { deleteCompany, type CompanyOut } from '../api/companies';
import { toast } from 'sonner';
import { type SetStateAction, type Dispatch } from 'react';

type Props = {
  company: CompanyOut;
  deleting: boolean;
  setDeleting: Dispatch<SetStateAction<boolean>>;
  setConfirmDelete: Dispatch<SetStateAction<CompanyOut | null>>;
  setCompanies: Dispatch<SetStateAction<CompanyOut[]>>;
};

export function CompanyDeleteModal({
  company,
  deleting,
  setDeleting,
  setConfirmDelete,
  setCompanies,
}: Props) {
  const handleDelete = async () => {
    setDeleting(true);
    try {
      const n = company.name;
      await deleteCompany(company.id);
      setCompanies(prev => prev.filter(c => c.id !== company.id));
      setConfirmDelete(null);
      toast.success(`Deleted "${n}".`);
    } catch (err) {
      setConfirmDelete(null);
      toast.error(apiError(err));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal title="Delete company" onClose={() => !deleting && setConfirmDelete(null)}>
      <p className="text-sm text-text-muted mb-5">
        Delete <strong className="text-text-main">{company.name}</strong>? This cannot be undone.
        {company.total_employees > 0 && (
          <span className="block mt-1 text-red-500 text-xs">
            {company.total_employees} active employee(s) in the list above. Deletion is blocked
            while any employee remains on this company—including inactive, who are not included in
            that count. Reassign or remove everyone first.
          </span>
        )}
      </p>
      <div className="flex gap-2 justify-end">
        <button
          onClick={() => setConfirmDelete(null)}
          disabled={deleting}
          className="px-3 py-1.5 rounded-lg text-sm text-text-muted hover:text-text-main border border-border hover:bg-surface-hover transition cursor-pointer disabled:opacity-60"
        >
          Cancel
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition disabled:opacity-60 cursor-pointer"
        >
          {deleting && <Spinner className="w-3.5 h-3.5 border-white border-t-white/30" />}
          Delete
        </button>
      </div>
    </Modal>
  );
}
