import { useEffect, useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { Navigate, useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, Building2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  getCompanies, createCompany, updateCompany, deleteCompany,
  type CompanyOut,
} from '../api/companies';
import { Modal } from '../components/ui/Modal';
import { Spinner } from '../components/ui/Spinner';

type ModalMode = { type: 'create' } | { type: 'edit'; company: CompanyOut } | null;

function apiError(err: unknown) {
  const detail = (err as any)?.response?.data?.detail;
  return typeof detail === 'string' ? detail : 'Something went wrong.';
}

export function Companies() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<CompanyOut[]>([]);
  const [loading, setLoading] = useState(true);

  const [modal, setModal] = useState<ModalMode>(null);
  const [nameInput, setNameInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const [confirmDelete, setConfirmDelete] = useState<CompanyOut | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (user?.role !== 'system_admin') {
      setLoading(false);
      return;
    }
    getCompanies()
      .then(setCompanies)
      .catch(() => toast.error('Failed to load companies.'))
      .finally(() => setLoading(false));
  }, [user?.role]);

  const openCreate = () => { setNameInput(''); setFormError(''); setModal({ type: 'create' }); };
  const openEdit = (c: CompanyOut) => { setNameInput(c.name); setFormError(''); setModal({ type: 'edit', company: c }); };
  const closeModal = () => { if (!saving) setModal(null); };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    const name = nameInput.trim();
    if (!name) { setFormError('Name is required.'); return; }
    setSaving(true);
    setFormError('');
    try {
      if (modal?.type === 'create') {
        const created = await createCompany(name);
        setCompanies(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
        toast.success(`Created "${created.name}".`);
      } else if (modal?.type === 'edit') {
        const updated = await updateCompany(modal.company.id, name);
        setCompanies(prev => prev.map(c => c.id === updated.id ? updated : c));
        toast.success('Company updated.');
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
      const n = confirmDelete.name;
      await deleteCompany(confirmDelete.id);
      setCompanies(prev => prev.filter(c => c.id !== confirmDelete.id));
      setConfirmDelete(null);
      toast.success(`Deleted "${n}".`);
    } catch (err) {
      setConfirmDelete(null);
      toast.error(apiError(err));
    } finally {
      setDeleting(false);
    }
  };

  if (user?.role !== 'system_admin') {
    return <Navigate to={user?.role === 'employee' ? '/' : '/dashboard'} replace />;
  }

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-medium text-text-main">Companies</h2>
          <p className="text-sm text-text-muted mt-0.5">{companies.length} total</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium transition cursor-pointer"
        >
          <Plus size={15} />
          New company
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center gap-2 text-text-muted text-sm">
          <Spinner className="w-4 h-4" /> Loading…
        </div>
      ) : companies.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-text-muted">
          <Building2 size={32} className="mb-3 opacity-30" />
          <p className="text-sm">No companies yet.</p>
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
                <th className="text-right text-xs text-text-muted font-medium px-4 py-3">Depts</th>
                <th className="text-right text-xs text-text-muted font-medium px-4 py-3">Employees</th>
                <th className="text-right text-xs text-text-muted font-medium px-4 py-3">Created</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {companies.map((c, i) => (
                <tr
                  key={c.id}
                  onClick={() => navigate(`/departments?company_id=${c.id}`)}
                  className={`${i < companies.length - 1 ? 'border-b border-border' : ''} hover:bg-surface-hover transition-colors cursor-pointer`}
                  title="View departments for this company"
                >
                  <td className="px-4 py-3 font-medium text-text-main">{c.name}</td>
                  <td className="px-4 py-3 text-right text-text-muted">{c.total_departments}</td>
                  <td className="px-4 py-3 text-right text-text-muted">{c.total_employees}</td>
                  <td className="px-4 py-3 text-right text-text-muted">
                    {new Date(c.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); openEdit(c); }}
                        className="p-1 text-text-muted hover:text-text-main transition-colors cursor-pointer"
                        title="Edit"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setConfirmDelete(c); }}
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
          title={modal.type === 'create' ? 'New company' : 'Rename company'}
          onClose={closeModal}
        >
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs text-text-muted mb-1.5">Company name</label>
              <input
                autoFocus
                type="text"
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                placeholder="Acme Corp"
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-text-main text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
              />
            </div>
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
        <Modal title="Delete company" onClose={() => !deleting && setConfirmDelete(null)}>
          <p className="text-sm text-text-muted mb-5">
            Delete <strong className="text-text-main">{confirmDelete.name}</strong>? This cannot be undone.
            {confirmDelete.total_employees > 0 && (
              <span className="block mt-1 text-red-500 text-xs">
                {confirmDelete.total_employees} active employee(s) in the list above. Deletion is blocked
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
      )}
    </div>
  );
}
