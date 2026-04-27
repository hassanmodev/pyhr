import type { FormEvent, Dispatch, SetStateAction } from 'react';
import type { EmployeeCreate, UserRole } from '../../api/employees';
import type { CompanyOut } from '../../api/companies';
import type { DeptOut } from '../../api/departments';
import { Modal } from '../../components/ui/Modal';
import { Spinner } from '../../components/ui/Spinner';
import type { ModalMode } from './utils';
import { EmployeeFormBody } from './EmployeeFormBody';

type Props = {
  modal: Exclude<ModalMode, null>;
  formData: Partial<EmployeeCreate>;
  setFormData: Dispatch<SetStateAction<Partial<EmployeeCreate>>>;
  companies: CompanyOut[];
  isAdmin: boolean;
  userRole: UserRole | undefined;
  rolesForMe: UserRole[];
  saving: boolean;
  formError: string;
  roleLocked: boolean;
  onClose: () => void;
  onSubmit: (e: FormEvent) => void;
  getAvailableDepartments: (companyId?: number) => DeptOut[];
};

export function EmployeeFormModal({
  modal,
  formData,
  setFormData,
  companies,
  isAdmin,
  userRole,
  rolesForMe,
  saving,
  formError,
  roleLocked,
  onClose,
  onSubmit,
  getAvailableDepartments,
}: Props) {
  return (
    <Modal
      title={modal.type === 'create' ? 'New employee' : 'Edit employee'}
      onClose={onClose}
      size="lg"
    >
      <form onSubmit={onSubmit} className="space-y-5">
        <EmployeeFormBody
          modal={modal}
          formData={formData}
          setFormData={setFormData}
          companies={companies}
          isAdmin={isAdmin}
          userRole={userRole}
          rolesForMe={rolesForMe}
          formError={formError}
          roleLocked={roleLocked}
          getAvailableDepartments={getAvailableDepartments}
        />
        <div className="flex gap-3 justify-end pt-2 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-text-muted hover:text-text-main border border-border hover:bg-surface-hover transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium transition disabled:opacity-60 cursor-pointer"
          >
            {saving && <Spinner className="w-3.5 h-3.5 border-white border-t-white/30" />}
            {modal.type === 'create' ? 'Create' : 'Save'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
