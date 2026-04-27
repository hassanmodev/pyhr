import { type FormEvent, type Dispatch, type SetStateAction } from 'react';
import { toast } from 'sonner';
import { Modal } from '../components/ui/Modal';
import { Spinner } from '../components/ui/Spinner';
import { zodFirstError } from '../lib/validation/fields';
import { departmentCreateFormSchema, departmentNameFormSchema } from '../lib/validation/department';
import { apiError } from '../lib/apiError';
import { createDepartment, updateDepartment, type DeptOut } from '../api/departments';
import type { CompanyOut } from '../api/companies';

type Mode = { type: 'create' } | { type: 'edit'; dept: DeptOut };

type Props = {
  modal: Mode;
  nameInput: string;
  setNameInput: Dispatch<SetStateAction<string>>;
  formError: string;
  setFormError: Dispatch<SetStateAction<string>>;
  isAdmin: boolean;
  companies: CompanyOut[];
  companyIdInput: number | '';
  setCompanyIdInput: Dispatch<SetStateAction<number | ''>>;
  setDepartments: Dispatch<SetStateAction<DeptOut[]>>;
  saving: boolean;
  setSaving: Dispatch<SetStateAction<boolean>>;
  userCompanyId: number | null | undefined;
  onRequestClose: () => void;
  onSaved: () => void;
};

export function DepartmentNameModal({
  modal,
  nameInput,
  setNameInput,
  formError,
  setFormError,
  isAdmin,
  companies,
  companyIdInput,
  setCompanyIdInput,
  setDepartments,
  saving,
  setSaving,
  userCompanyId,
  onRequestClose,
  onSaved,
}: Props) {
  const handleSave = async (e: FormEvent) => {
    e.preventDefault();

    if (modal.type === 'create') {
      const companyId =
        typeof companyIdInput === 'number' && !Number.isNaN(companyIdInput)
          ? companyIdInput
          : userCompanyId ?? undefined;
      const v = departmentCreateFormSchema.safeParse({ name: nameInput, company_id: companyId });
      if (!v.success) {
        setFormError(zodFirstError(v.error));
        return;
      }
      setSaving(true);
      setFormError('');
      try {
        const created = await createDepartment(v.data.name, v.data.company_id);
        setDepartments(prev => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
        toast.success(`Created "${created.name}".`);
        onSaved();
      } catch (err) {
        toast.error(apiError(err));
      } finally {
        setSaving(false);
      }
      return;
    }

    const v = departmentNameFormSchema.safeParse({ name: nameInput });
    if (!v.success) {
      setFormError(zodFirstError(v.error));
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const updated = await updateDepartment(modal.dept.id, v.data.name);
      setDepartments(prev => prev.map(d => (d.id === updated.id ? updated : d)));
      toast.success('Department updated.');
      onSaved();
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={modal.type === 'create' ? 'New department' : 'Rename department'}
      onClose={onRequestClose}
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
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}

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
