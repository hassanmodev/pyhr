import type { Dispatch, SetStateAction } from 'react';
import type { EmployeeCreate, UserRole } from '../../api/employees';
import type { CompanyOut } from '../../api/companies';
import type { DeptOut } from '../../api/departments';
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
  formError: string;
  roleLocked: boolean;
  getAvailableDepartments: (companyId?: number) => DeptOut[];
};

const inputClass =
  'w-full px-3 py-2.5 rounded-lg border border-border bg-background text-text-main text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition';

export function EmployeeFormBody({
  modal,
  formData,
  setFormData,
  companies,
  isAdmin,
  userRole,
  rolesForMe,
  formError,
  roleLocked,
  getAvailableDepartments,
}: Props) {
  return (
    <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-2">
      <div className="grid grid-cols-2 gap-x-5 gap-y-4">
        <div>
          <label className="block text-xs text-text-muted mb-2">First name</label>
          <input
            autoFocus
            type="text"
            value={formData.first_name || ''}
            onChange={e => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
            placeholder="John"
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-2">Last name</label>
          <input
            type="text"
            value={formData.last_name || ''}
            onChange={e => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
            placeholder="Doe"
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label className="block text-xs text-text-muted mb-2">Email</label>
        <input
          type="email"
          value={formData.email || ''}
          onChange={e => setFormData(prev => ({ ...prev, email: e.target.value }))}
          placeholder="john@example.com"
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-x-5 gap-y-4">
        <div>
          <label className="block text-xs text-text-muted mb-2">Mobile</label>
          <input
            type="text"
            value={formData.mobile || ''}
            onChange={e => setFormData(prev => ({ ...prev, mobile: e.target.value }))}
            placeholder="+1 234 567 890"
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-2">Title</label>
          <input
            type="text"
            value={formData.title || ''}
            onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
            placeholder="Software Engineer"
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label className="block text-xs text-text-muted mb-2">Address</label>
        <input
          type="text"
          value={formData.address || ''}
          onChange={e => setFormData(prev => ({ ...prev, address: e.target.value }))}
          placeholder="123 Main St, City, Country"
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-x-5 gap-y-4">
        <div>
          <label className="block text-xs text-text-muted mb-2">Hire date</label>
          <input
            type="date"
            value={formData.hire_date || ''}
            onChange={e => setFormData(prev => ({ ...prev, hire_date: e.target.value }))}
            className={`${inputClass} cursor-pointer`}
          />
        </div>
        <div>
          <label className="block text-xs text-text-muted mb-2">Status</label>
          <select
            value={formData.status || 'active'}
            onChange={e =>
              setFormData(prev => ({ ...prev, status: e.target.value as 'active' | 'inactive' }))
            }
            className={`${inputClass} cursor-pointer`}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-5 gap-y-4">
        {isAdmin && (modal.type === 'create' || modal.type === 'edit') && (
          <div>
            <label className="block text-xs text-text-muted mb-2">Company</label>
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
              className={`${inputClass} cursor-pointer`}
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
          <label className="block text-xs text-text-muted mb-2">Department</label>
          <select
            value={formData.department_id || ''}
            onChange={e =>
              setFormData(prev => ({
                ...prev,
                department_id: e.target.value ? Number(e.target.value) : undefined,
              }))
            }
            className={`${inputClass} cursor-pointer`}
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
        <label className="block text-xs text-text-muted mb-2">Account role</label>
        {roleLocked && modal.type === 'edit' ? (
          <p className="text-sm text-text-main py-2">{ROLE_LABEL[modal.emp.role]}</p>
        ) : (
          <select
            value={(formData.role as UserRole) || 'employee'}
            onChange={e => setFormData(prev => ({ ...prev, role: e.target.value as UserRole }))}
            className={`${inputClass} cursor-pointer`}
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
          <label className="block text-xs text-text-muted mb-2">Password</label>
          <input
            type="password"
            value={formData.password || ''}
            onChange={e => setFormData(prev => ({ ...prev, password: e.target.value }))}
            placeholder="••••••••"
            className={inputClass}
          />
        </div>
      )}

      {formError && <p className="text-xs text-red-500">{formError}</p>}
    </div>
  );
}
