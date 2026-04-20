import type { Dispatch, FormEvent, SetStateAction } from 'react';
import type { EmployeeCreate, UserRole } from '../../api/employees';
import type { CompanyOut } from '../../api/companies';
import type { DeptOut } from '../../api/departments';
import { Modal } from '../../components/ui/Modal';
import { Spinner } from '../../components/ui/Spinner';
import type { ModalMode } from './utils';
import { ROLE_LABEL } from './utils';

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
    >
      <form onSubmit={onSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-text-muted mb-1.5">First name</label>
            <input
              autoFocus
              type="text"
              value={formData.first_name || ''}
              onChange={e => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
              placeholder="John"
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-text-main text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
            />
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1.5">Last name</label>
            <input
              type="text"
              value={formData.last_name || ''}
              onChange={e => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
              placeholder="Doe"
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-text-main text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-text-muted mb-1.5">Email</label>
          <input
            type="email"
            value={formData.email || ''}
            onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
            placeholder="john@example.com"
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-text-main text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-text-muted mb-1.5">Mobile</label>
            <input
              type="text"
              value={formData.mobile || ''}
              onChange={e => setFormData(prev => ({ ...prev, mobile: e.target.value }))}
              placeholder="+1 234 567 890"
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-text-main text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
            />
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1.5">Title</label>
            <input
              type="text"
              value={formData.title || ''}
              onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Software Engineer"
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-text-main text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-text-muted mb-1.5">Address</label>
          <input
            type="text"
            value={formData.address || ''}
            onChange={e => setFormData(prev => ({ ...prev, address: e.target.value }))}
            placeholder="123 Main St, City, Country"
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-text-main text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-text-muted mb-1.5">Hire date</label>
            <input
              type="date"
              value={formData.hire_date || ''}
              onChange={e => setFormData(prev => ({ ...prev, hire_date: e.target.value }))}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-text-main text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition cursor-pointer"
            />
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1.5">Status</label>
            <select
              value={formData.status || 'active'}
              onChange={e =>
                setFormData(prev => ({ ...prev, status: e.target.value as 'active' | 'inactive' }))
              }
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-text-main text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition cursor-pointer"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {isAdmin && (modal.type === 'create' || modal.type === 'edit') && (
            <div>
              <label className="block text-xs text-text-muted mb-1.5">Company</label>
              <select
                value={formData.company_id || ''}
                onChange={e => {
                  const companyId = Number(e.target.value);
                  setFormData(prev => ({
                    ...prev,
                    company_id: companyId,
                    department_id: undefined,
                  }));
                }}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-text-main text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition cursor-pointer"
              >
                {companies.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs text-text-muted mb-1.5">Department</label>
            <select
              value={formData.department_id || ''}
              onChange={e =>
                setFormData(prev => ({
                  ...prev,
                  department_id: e.target.value ? Number(e.target.value) : undefined,
                }))
              }
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-text-main text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition cursor-pointer"
            >
              <option value="">- None -</option>
              {getAvailableDepartments(formData.company_id).map(d => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs text-text-muted mb-1.5">Account role</label>
          {roleLocked && modal.type === 'edit' ? (
            <p className="text-sm text-text-main py-2">{ROLE_LABEL[modal.emp.role]}</p>
          ) : (
            <select
              value={(formData.role as UserRole) || 'employee'}
              onChange={e => setFormData(prev => ({ ...prev, role: e.target.value as UserRole }))}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-text-main text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition cursor-pointer"
            >
              {rolesForMe.map(r => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r]}
                </option>
              ))}
            </select>
          )}
          {!roleLocked && (
            <p className="text-xs text-text-muted mt-1">
              You can assign roles up to your own level ({ROLE_LABEL[userRole ?? 'employee']}).
            </p>
          )}
        </div>

        {modal.type === 'create' && (
          <div>
            <label className="block text-xs text-text-muted mb-1.5">Password</label>
            <input
              type="password"
              value={formData.password || ''}
              onChange={e => setFormData(prev => ({ ...prev, password: e.target.value }))}
              placeholder="••••••••"
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-text-main text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
            />
          </div>
        )}

        {formError && <p className="text-xs text-red-500">{formError}</p>}
        <div className="flex gap-2 justify-end pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-sm text-text-muted hover:text-text-main border border-border hover:bg-surface-hover transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium transition disabled:opacity-60 cursor-pointer"
          >
            {saving && <Spinner className="w-3.5 h-3.5 border-white border-t-white/30" />}
            {modal.type === 'create' ? 'Create' : 'Save'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
