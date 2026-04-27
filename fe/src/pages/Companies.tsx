import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Navigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getCompanies, type CompanyOut } from '../api/companies';
import { CompaniesList } from './CompaniesList';
import { CompanyNameModal } from './CompanyNameModal';
import { CompanyDeleteModal } from './CompanyDeleteModal';

type ModalMode = { type: 'create' } | { type: 'edit'; company: CompanyOut } | null;

export function Companies() {
  const { user } = useAuth();
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

  const openCreate = () => {
    setNameInput('');
    setFormError('');
    setModal({ type: 'create' });
  };
  const openEdit = (c: CompanyOut) => {
    setNameInput(c.name);
    setFormError('');
    setModal({ type: 'edit', company: c });
  };
  const closeModal = () => {
    if (!saving) setModal(null);
  };

  if (user?.role !== 'system_admin') {
    return <Navigate to={user?.role === 'employee' ? '/' : '/dashboard'} replace />;
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-medium text-text-main">Companies</h2>
          <p className="text-sm text-text-muted mt-0.5">{companies.length} total</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium transition cursor-pointer"
          type="button"
        >
          <Plus size={15} />
          New company
        </button>
      </div>

      <CompaniesList
        loading={loading}
        companies={companies}
        onOpenCreate={openCreate}
        onOpenEdit={openEdit}
        onRequestDelete={setConfirmDelete}
      />

      {modal && (
        <CompanyNameModal
          modal={modal}
          nameInput={nameInput}
          setNameInput={setNameInput}
          formError={formError}
          setFormError={setFormError}
          setCompanies={setCompanies}
          saving={saving}
          setSaving={setSaving}
          onRequestClose={closeModal}
          onSaved={() => setModal(null)}
        />
      )}

      {confirmDelete && (
        <CompanyDeleteModal
          company={confirmDelete}
          deleting={deleting}
          setDeleting={setDeleting}
          setConfirmDelete={setConfirmDelete}
          setCompanies={setCompanies}
        />
      )}
    </div>
  );
}
