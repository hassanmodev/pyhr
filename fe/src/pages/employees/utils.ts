import type { EmployeeOut, UserRole } from '../../api/employees';

export type ModalMode =
  | { type: 'create' }
  | { type: 'edit'; emp: EmployeeOut }
  | null;

export function apiError(err: unknown) {
  const detail = (err as { response?: { data?: { detail?: unknown } } })?.response?.data?.detail;
  return typeof detail === 'string' ? detail : 'Something went wrong.';
}

export const todayStr = () => new Date().toISOString().split('T')[0];

export const ROLE_LABEL: Record<UserRole, string> = {
  employee: 'Employee',
  hr_manager: 'HR Manager',
  system_admin: 'System Admin',
};

export function assignableRoles(actor: UserRole | undefined): UserRole[] {
  if (actor === 'system_admin') return ['employee', 'hr_manager', 'system_admin'];
  if (actor === 'hr_manager') return ['employee', 'hr_manager'];
  return [];
}
