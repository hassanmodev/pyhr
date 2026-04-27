import { type Dispatch, type SetStateAction } from 'react';
import { toast } from 'sonner';
import { Modal } from '../components/ui/Modal';
import { Spinner } from '../components/ui/Spinner';
import { apiError } from '../lib/apiError';
import { deleteDepartment, type DeptOut } from '../api/departments';

type Props = {
  department: DeptOut;
  deleting: boolean;
  setDeleting: Dispatch<SetStateAction<boolean>>;
  setConfirmDelete: Dispatch<SetStateAction<DeptOut | null>>;
  setDepartments: Dispatch<SetStateAction<DeptOut[]>>;
};

export function DepartmentDeleteModal({
  department,
  deleting,
  setDeleting,
  setConfirmDelete,
  setDepartments,
}: Props) {
  const handleDelete = async () => {
    setDeleting(true);
    try {
      const n = department.name;
      await deleteDepartment(department.id);
      setDepartments(prev => prev.filter(d => d.id !== department.id));
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
    <Modal title="Delete department" onClose={() => !deleting && setConfirmDelete(null)}>
      <p className="text-sm text-text-muted mb-5">
        Delete <strong className="text-text-main">{department.name}</strong>? This cannot be undone.
        {department.active_employee_count > 0 && (
          <span className="block mt-1 text-amber-600 dark:text-amber-500 text-xs">
            {department.active_employee_count} active employee(s) here. Deleting this department
            clears department on those rows (inactive employees in this department too).
          </span>
        )}
      </p>
      <div className="flex gap-2 justify-end">
        <button
          onClick={() => setConfirmDelete(null)}
          disabled={deleting}
          className="px-3 py-1.5 rounded-lg text-sm text-text-muted hover:text-text-main border border-border hover:bg-surface-hover transition cursor-pointer disabled:opacity-60"
          type="button"
        >
          Cancel
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-medium transition disabled:opacity-60 cursor-pointer"
          type="button"
        >
          {deleting && <Spinner className="w-3.5 h-3.5 border-white border-t-white/30" />}
          Delete
        </button>
      </div>
    </Modal>
  );
}
