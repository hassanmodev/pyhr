import { useEffect, useState, useMemo, type FormEvent } from 'react';
import { toast } from 'sonner';
import { Navigate, useSearchParams, useNavigate } from 'react-router-dom';
import {
  getEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  type EmployeeOut,
  type EmployeeCreate,
  type EmployeeUpdate,
  type UserRole,
} from '../../api/employees';
import { getCompanies, type CompanyOut } from '../../api/companies';
import { getDepartments, type DeptOut } from '../../api/departments';
import { useAuth } from '../../contexts/AuthContext';
import { EmployeesHeader } from './EmployeesHeader';
import { EmployeesTable } from './EmployeesTable';
import { EmployeeFormModal } from './EmployeeFormModal';
import { EmployeeDeleteModal } from './EmployeeDeleteModal';
import { zodFirstError } from '../../lib/validation/fields';
import { employeeCreateFormSchema, employeeUpdateFormSchema } from '../../lib/validation/employee';
import { assignableRoles, todayStr, type ModalMode, apiError } from './utils';

export function Employees() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'system_admin';
  const rolesForMe = assignableRoles(user?.role);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const filterCompanyId = searchParams.get('company_id');
  const filterDeptId = searchParams.get('department_id');

  const [employees, setEmployees] = useState<EmployeeOut[]>([]);
  const [companies, setCompanies] = useState<CompanyOut[]>([]);
  const [departments, setDepartments] = useState<DeptOut[]>([]);
  const [loading, setLoading] = useState(true);
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
        toast.error('Failed to load employees.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isAdmin, user?.role, filterCompanyId, filterDeptId]);

  const getCompanyName = (id: number | null) => {
    if (id == null) return '—';
    return companies.find(c => c.id === id)?.name || `Company #${id}`;
  };
  const getDepartmentName = (emp: EmployeeOut) => {
    if (emp.department_name?.trim()) return emp.department_name;
    if (!emp.department_id) return '—';
    return departments.find(d => d.id === emp.department_id)?.name || `Dept #${emp.department_id}`;
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
    return employees.filter(
      emp =>
        emp.full_name.toLowerCase().includes(query) ||
        emp.email.toLowerCase().includes(query) ||
        emp.title.toLowerCase().includes(query) ||
        emp.mobile.toLowerCase().includes(query) ||
        (emp.address && emp.address.toLowerCase().includes(query)) ||
        getDepartmentName(emp).toLowerCase().includes(query) ||
        (isAdmin && getCompanyName(emp.company_id).toLowerCase().includes(query)),
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
      role: 'employee',
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
      company_id: emp.company_id ?? undefined,
      role: emp.role,
    });
    setFormError('');
    setModal({ type: 'edit', emp });
  };

  const closeModal = () => {
    if (!saving) setModal(null);
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    const role = formData.role as UserRole | undefined;
    if (role && !rolesForMe.includes(role)) {
      setFormError('You cannot assign that role.');
      return;
    }

    if (modal?.type === 'create') {
      const parsed = employeeCreateFormSchema.safeParse({
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        mobile: formData.mobile,
        address: formData.address,
        title: formData.title,
        hire_date: formData.hire_date,
        status: formData.status ?? 'active',
        department_id: formData.department_id,
        company_id: formData.company_id,
        password: formData.password,
        role: formData.role ?? 'employee',
      });
      if (!parsed.success) {
        setFormError(zodFirstError(parsed.error));
        return;
      }
    } else if (modal?.type === 'edit') {
      const parsed = employeeUpdateFormSchema.safeParse({
        first_name: formData.first_name,
        last_name: formData.last_name,
        email: formData.email,
        mobile: formData.mobile,
        address: formData.address,
        title: formData.title,
        hire_date: formData.hire_date,
        status: formData.status ?? 'active',
        department_id: formData.department_id,
        company_id: formData.company_id,
        role: formData.role ?? modal.emp.role,
      });
      if (!parsed.success) {
        setFormError(zodFirstError(parsed.error));
        return;
      }
    }

    setSaving(true);
    setFormError('');
    try {
      if (modal?.type === 'create') {
        const created = await createEmployee({
          ...(formData as EmployeeCreate),
          role: (formData.role ?? 'employee') as UserRole,
        });
        setEmployees(prev =>
          [...prev, created].sort((a, b) => a.last_name.localeCompare(b.last_name)),
        );
        toast.success(`Created ${created.full_name}.`);
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
        const locked = !isAdmin && modal.emp.role === 'system_admin';
        if (!locked) updateData.role = (formData.role ?? modal.emp.role) as UserRole;
        const updated = await updateEmployee(modal.emp.id, updateData);
        setEmployees(prev => prev.map(e => (e.id === updated.id ? updated : e)));
        toast.success(`Updated ${updated.full_name}.`);
      }
      setModal(null);
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      const name = confirmDelete.full_name;
      await deleteEmployee(confirmDelete.id);
      setEmployees(prev => prev.filter(e => e.id !== confirmDelete.id));
      setConfirmDelete(null);
      toast.success(`Removed ${name}.`);
    } catch (err) {
      setConfirmDelete(null);
      toast.error(apiError(err));
    } finally {
      setDeleting(false);
    }
  };

  if (user?.role === 'employee') {
    return <Navigate to="/" replace />;
  }

  const roleLocked = modal?.type === 'edit' && !isAdmin && modal.emp.role === 'system_admin';

  return (
    <div className="max-w-5xl">
      <EmployeesHeader
        filteredCount={filteredEmployees.length}
        totalCount={employees.length}
        searchText={searchText}
        onSearchTextChange={setSearchText}
        filterCompanyId={filterCompanyId}
        filterDeptId={filterDeptId}
        companies={companies}
        departments={departments}
        onRemoveFilter={removeFilter}
        onClearAllFilters={() => {
          setSearchText('');
          navigate('/employees');
        }}
        onNewEmployee={openCreate}
      />

      <EmployeesTable
        loading={loading}
        employees={employees}
        filteredEmployees={filteredEmployees}
        isAdmin={isAdmin}
        getCompanyName={getCompanyName}
        getDepartmentName={getDepartmentName}
        onNavigateCompanyFilter={companyId => navigate(`/employees?company_id=${companyId}`)}
        onEdit={openEdit}
        onDelete={setConfirmDelete}
        onClearSearch={() => setSearchText('')}
        onCreateFirst={openCreate}
      />

      {modal && (
        <EmployeeFormModal
          modal={modal}
          formData={formData}
          setFormData={setFormData}
          companies={companies}
          isAdmin={isAdmin}
          userRole={user?.role}
          rolesForMe={rolesForMe}
          saving={saving}
          formError={formError}
          roleLocked={roleLocked}
          onClose={closeModal}
          onSubmit={handleSave}
          getAvailableDepartments={getAvailableDepartments}
        />
      )}

      {confirmDelete && (
        <EmployeeDeleteModal
          employee={confirmDelete}
          deleting={deleting}
          onClose={() => setConfirmDelete(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
