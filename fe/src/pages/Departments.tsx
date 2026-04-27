import { useEffect, useState, type MouseEvent } from 'react';
import { toast } from 'sonner';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, X } from 'lucide-react';
import {
  getDepartments,
  type DeptOut,
} from '../api/departments';
import { getCompanies, type CompanyOut } from '../api/companies';
import { useAuth } from '../contexts/AuthContext';
import { DepartmentsList } from './DepartmentsList';
import { DepartmentNameModal } from './DepartmentNameModal';
import { DepartmentDeleteModal } from './DepartmentDeleteModal';

type ModalMode = { type: 'create' } | { type: 'edit'; dept: DeptOut } | null;

export function Departments() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'system_admin';
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const filterCompanyIdRaw = searchParams.get('company_id');
  const filterCompanyId =
    filterCompanyIdRaw != null && filterCompanyIdRaw !== '' && !Number.isNaN(Number(filterCompanyIdRaw))
      ? Number(filterCompanyIdRaw)
      : null;

  const [departments, setDepartments] = useState<DeptOut[]>([]);
  const [companies, setCompanies] = useState<CompanyOut[]>([]);
  const [loading, setLoading] = useState(true);

  const [modal, setModal] = useState<ModalMode>(null);
  const [nameInput, setNameInput] = useState('');
  const [companyIdInput, setCompanyIdInput] = useState<number | ''>('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [confirmDelete, setConfirmDelete] = useState<DeptOut | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (user?.role === 'employee') {
      setLoading(false);
      return;
    }
    const load = async () => {
      try {
        const loadCompanies = isAdmin || user?.role === 'hr_manager';
        const [depts, comps] = await Promise.all([
          getDepartments(filterCompanyId ?? undefined),
          loadCompanies ? getCompanies() : Promise.resolve([]),
        ]);
        setDepartments(depts);
        setCompanies(comps);
      } catch {
        toast.error('Failed to load departments.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isAdmin, user?.role, filterCompanyId]);

  const getCompanyName = (id: number) => companies.find(c => c.id === id)?.name || `Company #${id}`;

  const viewEmployees = (dept: DeptOut) => {
    if (!isAdmin) return;
    navigate(`/employees?company_id=${dept.company_id}&department_id=${dept.id}`);
  };

  const viewCompanyEmployees = (e: MouseEvent, companyId: number) => {
    e.stopPropagation();
    if (!isAdmin) return;
    navigate(`/employees?company_id=${companyId}`);
  };

  const openCreate = () => {
    setNameInput('');
    const fromFilter =
      isAdmin && filterCompanyId != null && companies.some(c => c.id === filterCompanyId)
        ? filterCompanyId
        : '';
    setCompanyIdInput(
      fromFilter !== ''
        ? fromFilter
        : isAdmin
          ? (companies[0]?.id ?? '')
          : (user?.company_id ?? ''),
    );
    setFormError('');
    setModal({ type: 'create' });
  };

  const openEdit = (d: DeptOut) => {
    setNameInput(d.name);
    setCompanyIdInput(d.company_id);
    setFormError('');
    setModal({ type: 'edit', dept: d });
  };

  const closeModal = () => {
    if (!saving) setModal(null);
  };

  if (user?.role === 'employee') {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-medium text-text-main">Departments</h2>
          <p className="text-sm text-text-muted mt-0.5">{departments.length} total</p>
          {filterCompanyId != null && (
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700">
                Company: {companies.find(c => c.id === filterCompanyId)?.name || `#${filterCompanyId}`}
                <button
                  type="button"
                  onClick={() => setSearchParams({})}
                  className="ml-1 hover:text-blue-900 transition-colors cursor-pointer"
                  title="Remove company filter"
                >
                  <X size={12} />
                </button>
              </span>
            </div>
          )}
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium transition cursor-pointer"
          type="button"
        >
          <Plus size={15} />
          New department
        </button>
      </div>

      <DepartmentsList
        loading={loading}
        isAdmin={isAdmin}
        departments={departments}
        onOpenCreate={openCreate}
        onOpenEdit={openEdit}
        onRequestDelete={setConfirmDelete}
        getCompanyName={getCompanyName}
        viewEmployees={viewEmployees}
        viewCompanyEmployees={viewCompanyEmployees}
      />

      {modal && (
        <DepartmentNameModal
          modal={modal}
          nameInput={nameInput}
          setNameInput={setNameInput}
          formError={formError}
          setFormError={setFormError}
          isAdmin={isAdmin}
          companies={companies}
          companyIdInput={companyIdInput}
          setCompanyIdInput={setCompanyIdInput}
          setDepartments={setDepartments}
          saving={saving}
          setSaving={setSaving}
          userCompanyId={user?.company_id}
          onRequestClose={closeModal}
          onSaved={() => setModal(null)}
        />
      )}

      {confirmDelete && (
        <DepartmentDeleteModal
          department={confirmDelete}
          deleting={deleting}
          setDeleting={setDeleting}
          setConfirmDelete={setConfirmDelete}
          setDepartments={setDepartments}
        />
      )}
    </div>
  );
}
