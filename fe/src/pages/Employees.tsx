import { useEffect, useState, useMemo, type FormEvent } from 'react';
import { Plus, Pencil, Trash2, Users, X, Search } from 'lucide-react';
import { Navigate, useSearchParams, useNavigate } from 'react-router-dom';
import {
  getEmployees, createEmployee, updateEmployee, deleteEmployee,
  type EmployeeOut, type EmployeeCreate, type EmployeeUpdate,
} from '../api/employees';
import { getCompanies, type CompanyOut } from '../api/companies';
import { getDepartments, type DeptOut } from '../api/departments';
import { useAuth } from '../contexts/AuthContext';
import { Modal } from '../components/ui/Modal';
import { Spinner } from '../components/ui/Spinner';

type ModalMode = { type: 'create' } | { type: 'edit'; emp: EmployeeOut } | null;

function apiError(err: unknown) {
  const detail = (err as any)?.response?.data?.detail;
  return typeof detail === 'string' ? detail : 'Something went wrong.';
}

const todayStr = () => new Date().toISOString().split('T')[0];

export function Employees() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'system_admin';
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const filterCompanyId = searchParams.get('company_id');
  const filterDeptId = searchParams.get('department_id');

  const [employees, setEmployees] = useState<EmployeeOut[]>([]);
  const [companies, setCompanies] = useState<CompanyOut[]>([]);
  const [departments, setDepartments] = useState<DeptOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchText, setSearchText] = useState('');

  const [modal, setModal] = useState<ModalMode>(null);
  const [formData, setFormData] = useState<Partial<EmployeeCreate>>({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [confirmDelete, setConfirmDelete] = useState<EmployeeOut | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (user?.role === 'employee') {
      setLoading(false);
      return;
    }
    const load = async () => {
      try {
        const params: { company_id?: number; department_id?: number } = {};
        if (filterCompanyId) params.company_id = Number(filterCompanyId);
        if (filterDeptId) params.department_id = Number(filterDeptId);

        const loadCompanies = isAdmin || user?.role === 'hr_manager';
        const [emps, comps, depts] = await Promise.all([
          getEmployees(Object.keys(params).length > 0 ? params : undefined),
          loadCompanies ? getCompanies() : Promise.resolve([]),
          getDepartments(),
        ]);
        setEmployees(emps);
        setCompanies(comps);
        setDepartments(depts);
      } catch {
        setError('Failed to load employees.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isAdmin, user?.role, filterCompanyId, filterDeptId]);

  const getCompanyName = (id: number) => companies.find(c => c.id === id)?.name || `Company #${id}`;
  const getDepartmentName = (id: number | null) => {
    if (!id) return '-';
    return departments.find(d => d.id === id)?.name || `Dept #${id}`;
  };

  const removeFilter = (key: 'company_id' | 'department_id') => {
    const newParams = new URLSearchParams(searchParams);
    newParams.delete(key);
    if (newParams.size === 0) {
      navigate('/employees');
    } else {
      setSearchParams(newParams);
    }
  };

  const filteredEmployees = useMemo(() => {
    if (!searchText.trim()) return employees;
    const query = searchText.toLowerCase();
    return employees.filter(emp =>
      emp.full_name.toLowerCase().includes(query) ||
      emp.email.toLowerCase().includes(query) ||
      emp.title.toLowerCase().includes(query) ||
      emp.mobile.toLowerCase().includes(query) ||
      (emp.address && emp.address.toLowerCase().includes(query)) ||
      getDepartmentName(emp.department_id).toLowerCase().includes(query) ||
      (isAdmin && getCompanyName(emp.company_id).toLowerCase().includes(query))
    );
  }, [employees, searchText, departments, companies, isAdmin]);

  const getAvailableDepartments = (companyId?: number) => {
    if (!companyId) return [];
    return departments.filter(d => d.company_id === companyId);
  };

  const openCreate = () => {
    const defaultCompanyId = (isAdmin ? companies[0]?.id : user?.company_id) ?? undefined;
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      mobile: '',
      address: '',
      title: '',
      hire_date: todayStr(),
      status: 'active',
      department_id: undefined,
      company_id: defaultCompanyId,
      password: '',
    });
    setFormError('');
    setModal({ type: 'create' });
  };

  const openEdit = (emp: EmployeeOut) => {
    setFormData({
      first_name: emp.first_name,
      last_name: emp.last_name,
      email: emp.email,
      mobile: emp.mobile,
      address: emp.address || '',
      title: emp.title,
      hire_date: emp.hire_date,
      status: emp.status,
      department_id: emp.department_id || undefined,
      company_id: emp.company_id,
    });
    setFormError('');
    setModal({ type: 'edit', emp });
  };

  const closeModal = () => { if (!saving) setModal(null); };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    const firstName = formData.first_name?.trim();
    const lastName = formData.last_name?.trim();
    const email = formData.email?.trim();
    const mobile = formData.mobile?.trim();
    const title = formData.title?.trim();
    const hireDate = formData.hire_date;
    const companyId = formData.company_id;
    const password = formData.password;

    if (!firstName) { setFormError('First name is required.'); return; }
    if (!lastName) { setFormError('Last name is required.'); return; }
    if (!email) { setFormError('Email is required.'); return; }
    if (!mobile) { setFormError('Mobile is required.'); return; }
    if (!title) { setFormError('Title is required.'); return; }
    if (!hireDate) { setFormError('Hire date is required.'); return; }
    if (!companyId) { setFormError('Company is required.'); return; }
    if (modal?.type === 'create' && !password) { setFormError('Password is required for new employees.'); return; }

    setSaving(true);
    setFormError('');
    try {
      if (modal?.type === 'create') {
        const created = await createEmployee(formData as EmployeeCreate);
        setEmployees(prev => [...prev, created].sort((a, b) => a.last_name.localeCompare(b.last_name)));
      } else if (modal?.type === 'edit') {
        const updateData: EmployeeUpdate = {
          first_name: formData.first_name,
          last_name: formData.last_name,
          email: formData.email,
          mobile: formData.mobile,
          address: formData.address,
          title: formData.title,
          hire_date: formData.hire_date,
          status: formData.status,
          department_id: formData.department_id,
        };
        if (isAdmin) updateData.company_id = formData.company_id;
        const updated = await updateEmployee(modal.emp.id, updateData);
        setEmployees(prev => prev.map(e => e.id === updated.id ? updated : e));
      }
      setModal(null);
    } catch (err) {
      setFormError(apiError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      await deleteEmployee(confirmDelete.id);
      setEmployees(prev => prev.filter(e => e.id !== confirmDelete.id));
      setConfirmDelete(null);
    } catch (err) {
      setConfirmDelete(null);
      setError(apiError(err));
    } finally {
      setDeleting(false);
    }
  };

  const statusBadge = (status: string) => {
    const isActive = status === 'active';
    return (
      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
        {status}
      </span>
    );
  };

  if (user?.role === 'employee') {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div className="flex-1">
          <h2 className="text-xl font-medium text-text-main">Employees</h2>
          <p className="text-sm text-text-muted mt-0.5">
            {filteredEmployees.length} of {employees.length} shown
          </p>
          {/* Search input */}
          <div className="relative mt-3 max-w-sm">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              placeholder="Search by name, email, title..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-background text-text-main text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
            />
            {searchText && (
              <button
                onClick={() => setSearchText('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-main transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>
          {/* Filter pills */}
          {(filterCompanyId || filterDeptId) && (
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              {filterCompanyId && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700">
                  Company: {companies.find(c => c.id === Number(filterCompanyId))?.name || `#${filterCompanyId}`}
                  <button
                    onClick={() => removeFilter('company_id')}
                    className="ml-1 hover:text-blue-900 transition-colors cursor-pointer"
                    title="Remove company filter"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}
              {filterDeptId && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-700">
                  Dept: {departments.find(d => d.id === Number(filterDeptId))?.name || `#${filterDeptId}`}
                  <button
                    onClick={() => removeFilter('department_id')}
                    className="ml-1 hover:text-purple-900 transition-colors cursor-pointer"
                    title="Remove department filter"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}
              <button
                onClick={() => { setSearchText(''); navigate('/employees'); }}
                className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-text-main transition-colors cursor-pointer"
                title="Clear all filters"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium transition cursor-pointer shrink-0"
        >
          <Plus size={15} />
          New employee
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <p className="text-sm text-red-500 mb-4">{error}</p>
      )}

      {/* List */}
      {loading ? (
        <div className="flex items-center gap-2 text-text-muted text-sm">
          <Spinner className="w-4 h-4" /> Loading…
        </div>
      ) : employees.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-text-muted">
          <Users size={32} className="mb-3 opacity-30" />
          <p className="text-sm">No employees yet.</p>
          <button onClick={openCreate} className="text-sm text-primary-500 hover:underline mt-1">
            Create one
          </button>
        </div>
      ) : filteredEmployees.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-text-muted">
          <Search size={32} className="mb-3 opacity-30" />
          <p className="text-sm">No employees match your search.</p>
          <button onClick={() => setSearchText('')} className="text-sm text-primary-500 hover:underline mt-1">
            Clear search
          </button>
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs text-text-muted font-medium px-4 py-3">Name</th>
                <th className="text-left text-xs text-text-muted font-medium px-4 py-3">Title</th>
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
                  {isAdmin && (
                    <td className="px-4 py-3 text-text-muted">{getCompanyName(emp.company_id)}</td>
                  )}
                  <td className="px-4 py-3 text-text-muted">{getDepartmentName(emp.department_id)}</td>
                  <td className="px-4 py-3">{statusBadge(emp.status)}</td>
                  <td className="px-4 py-3 text-right text-text-muted">
                    {new Date(emp.hire_date).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(emp)}
                        className="p-1 text-text-muted hover:text-text-main transition-colors cursor-pointer"
                        title="Edit"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => setConfirmDelete(emp)}
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
      )}

      {/* Create / Edit modal */}
      {modal && (
        <Modal
          title={modal.type === 'create' ? 'New employee' : 'Edit employee'}
          onClose={closeModal}
        >
          <form onSubmit={handleSave} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
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
                  onChange={e => setFormData(prev => ({ ...prev, status: e.target.value as 'active' | 'inactive' }))}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-text-main text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition cursor-pointer"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            {/* Company & Department */}
            <div className="grid grid-cols-2 gap-4">
              {modal.type === 'create' && isAdmin ? (
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
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              ) : modal.type === 'edit' && isAdmin ? (
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
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              ) : null}

              <div>
                <label className="block text-xs text-text-muted mb-1.5">Department</label>
                <select
                  value={formData.department_id || ''}
                  onChange={e => setFormData(prev => ({ ...prev, department_id: e.target.value ? Number(e.target.value) : undefined }))}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-text-main text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition cursor-pointer"
                >
                  <option value="">- None -</option>
                  {getAvailableDepartments(formData.company_id).map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Password - only for create */}
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
                onClick={closeModal}
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
      )}

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <Modal title="Delete employee" onClose={() => !deleting && setConfirmDelete(null)}>
          <p className="text-sm text-text-muted mb-5">
            Delete <strong className="text-text-main">{confirmDelete.full_name}</strong>? This cannot be undone.
            Their user account will also be removed.
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
      )}
    </div>
  );
}
