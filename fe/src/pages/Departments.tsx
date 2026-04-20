import { useEffect, useState, type FormEvent } from 'react';
import { Plus, Pencil, Trash2, Building2, Users } from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';
import {
  getDepartments, createDepartment, updateDepartment, deleteDepartment,
  type DeptOut,
} from '../api/departments';
import { getCompanies, type CompanyOut } from '../api/companies';
import { useAuth } from '../contexts/AuthContext';
import { Modal } from '../components/ui/Modal';
import { Spinner } from '../components/ui/Spinner';

type ModalMode = { type: 'create' } | { type: 'edit'; dept: DeptOut } | null;

function apiError(err: unknown) {
  const detail = (err as any)?.response?.data?.detail;
  return typeof detail === 'string' ? detail : 'Something went wrong.';
}

export function Departments() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'system_admin';
  const navigate = useNavigate();

  const [departments, setDepartments] = useState<DeptOut[]>([]);
  const [companies, setCompanies] = useState<CompanyOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
          getDepartments(),
          loadCompanies ? getCompanies() : Promise.resolve([]),
        ]);
        setDepartments(depts);
        setCompanies(comps);
      } catch {
        setError('Failed to load departments.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [isAdmin, user?.role]);

  const getCompanyName = (id: number) => companies.find(c => c.id === id)?.name || `Company #${id}`;

  const viewEmployees = (dept: DeptOut) => {
    if (!isAdmin) return;
    navigate(`/employees?company_id=${dept.company_id}&department_id=${dept.id}`);
  };

  const openCreate = () => {
    setNameInput('');
    setCompanyIdInput(isAdmin ? (companies[0]?.id ?? '') : (user?.company_id ?? ''));
    setFormError('');
    setModal({ type: 'create' });
  };

  const openEdit = (d: DeptOut) => {
    setNameInput(d.name);
    setCompanyIdInput(d.company_id);
    setFormError('');
    setModal({ type: 'edit', dept: d });
  };

  const closeModal = () => { if (!saving) setModal(null); };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    const name = nameInput.trim();
    if (!name) { setFormError('Name is required.'); return; }

    const companyId = typeof companyIdInput === 'number' ? companyIdInput : user?.company_id;
    if (!companyId) { setFormError('Company is required.'); return; }

    setSaving(true);
    setFormError('');
    try {
      if (modal?.type === 'create') {
        const created = await createDepartment(name, companyId);
        setDepartments(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      } else if (modal?.type === 'edit') {
        const updated = await updateDepartment(modal.dept.id, name);
        setDepartments(prev => prev.map(d => d.id === updated.id ? updated : d));
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
      await deleteDepartment(confirmDelete.id);
      setDepartments(prev => prev.filter(d => d.id !== confirmDelete.id));
      setConfirmDelete(null);
    } catch (err) {
      setConfirmDelete(null);
      setError(apiError(err));
    } finally {
      setDeleting(false);
    }
  };

  if (user?.role === 'employee') {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-medium text-text-main">Departments</h2>
          <p className="text-sm text-text-muted mt-0.5">{departments.length} total</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium transition cursor-pointer"
        >
          <Plus size={15} />
          New department
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
      ) : departments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-text-muted">
          <Building2 size={32} className="mb-3 opacity-30" />
          <p className="text-sm">No departments yet.</p>
          <button onClick={openCreate} className="text-sm text-primary-500 hover:underline mt-1">
            Create one
          </button>
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs text-text-muted font-medium px-4 py-3">Name</th>
                {isAdmin && (
                  <th className="text-left text-xs text-text-muted font-medium px-4 py-3">Company</th>
                )}
                <th className="text-right text-xs text-text-muted font-medium px-4 py-3">Employees</th>
                <th className="text-right text-xs text-text-muted font-medium px-4 py-3">Created</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {departments.map((d, i) => (
                <tr
                  key={d.id}
                  onClick={() => viewEmployees(d)}
                  className={`${i < departments.length - 1 ? 'border-b border-border' : ''} hover:bg-surface-hover transition-colors ${isAdmin ? 'cursor-pointer' : ''}`}
                  title={isAdmin ? 'Click to view employees' : undefined}
                >
                  <td className="px-4 py-3 font-medium text-text-main">{d.name}</td>
                  {isAdmin && (
                    <td className="px-4 py-3 text-text-muted">{getCompanyName(d.company_id)}</td>
                  )}
                  <td className="px-4 py-3 text-right">
                    <span className="inline-flex items-center gap-1 text-text-muted">
                      <Users size={14} />
                      {d.active_employee_count}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-text-muted">
                    {new Date(d.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); openEdit(d); }}
                        className="p-1 text-text-muted hover:text-text-main transition-colors cursor-pointer"
                        title="Edit"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setConfirmDelete(d); }}
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
          title={modal.type === 'create' ? 'New department' : 'Rename department'}
          onClose={closeModal}
        >
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs text-text-muted mb-1.5">Department name</label>
              <input
                autoFocus
                type="text"
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                placeholder="Engineering"
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-text-main text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
              />
            </div>

            {modal.type === 'create' && isAdmin && (
              <div>
                <label className="block text-xs text-text-muted mb-1.5">Company</label>
                <select
                  value={companyIdInput}
                  onChange={e => setCompanyIdInput(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-text-main text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition cursor-pointer"
                >
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
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
        <Modal title="Delete department" onClose={() => !deleting && setConfirmDelete(null)}>
          <p className="text-sm text-text-muted mb-5">
            Delete <strong className="text-text-main">{confirmDelete.name}</strong>? This cannot be undone.
            {confirmDelete.active_employee_count > 0 && (
              <span className="block mt-1 text-red-500 text-xs">
                This department has {confirmDelete.active_employee_count} active employee(s). Reassign them first.
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
      )}
    </div>
  );
}
