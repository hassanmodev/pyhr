import { type FormEvent, type Dispatch, type SetStateAction } from 'react';
import { toast } from 'sonner';
import { Modal } from '../components/ui/Modal';
import { Spinner } from '../components/ui/Spinner';
import { zodFirstError } from '../lib/validation/fields';
import { companyNameFormSchema } from '../lib/validation/company';
import { apiError } from '../lib/apiError';
import { createCompany, updateCompany, type CompanyOut } from '../api/companies';

type Mode = { type: 'create' } | { type: 'edit'; company: CompanyOut };

type Props = {
  modal: Mode;
  nameInput: string;
  setNameInput: Dispatch<SetStateAction<string>>;
  formError: string;
  setFormError: Dispatch<SetStateAction<string>>;
  setCompanies: Dispatch<SetStateAction<CompanyOut[]>>;
  saving: boolean;
  setSaving: Dispatch<SetStateAction<boolean>>;
  /** Dismiss (backdrop, X, cancel) when not busy */
  onRequestClose: () => void;
  onSaved: () => void;
};

export function CompanyNameModal({
  modal,
  nameInput,
  setNameInput,
  formError,
  setFormError,
  setCompanies,
  saving,
  setSaving,
  onRequestClose,
  onSaved,
}: Props) {
  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    const v = companyNameFormSchema.safeParse({ name: nameInput });
    if (!v.success) {
      setFormError(zodFirstError(v.error));
      return;
    }
    const name = v.data.name;
    setSaving(true);
    setFormError('');
    try {
      if (modal.type === 'create') {
        const created = await createCompany(name);
        setCompanies(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
        toast.success(`Created "${created.name}".`);
      } else {
        const updated = await updateCompany(modal.company.id, name);
        setCompanies(prev => prev.map(c => (c.id === updated.id ? updated : c)));
        toast.success('Company updated.');
      }
      onSaved();
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={modal.type === 'create' ? 'New company' : 'Rename company'}
      onClose={onRequestClose}
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
            onClick={onRequestClose}
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
