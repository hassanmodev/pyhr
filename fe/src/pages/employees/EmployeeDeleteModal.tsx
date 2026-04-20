import type { EmployeeOut } from '../../api/employees';
import { Modal } from '../../components/ui/Modal';
import { Spinner } from '../../components/ui/Spinner';

type Props = {
  employee: EmployeeOut;
  deleting: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function EmployeeDeleteModal({ employee, deleting, onClose, onConfirm }: Props) {
  return (
    <Modal title="Delete employee" onClose={() => !deleting && onClose()}>
      <p className="text-sm text-text-muted mb-5">
        Delete <strong className="text-text-main">{employee.full_name}</strong>? This cannot be undone.
        Their user account will also be removed.
      </p>
      <div className="flex gap-2 justify-end">
        <button
          onClick={onClose}
          disabled={deleting}
          className="px-3 py-1.5 rounded-lg text-sm text-text-muted hover:text-text-main border border-border hover:bg-surface-hover transition cursor-pointer disabled:opacity-60"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
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
