import client from './client';

export type UserRole = 'system_admin' | 'hr_manager' | 'employee';

export interface UserOut {
  id: number;
  email: string;
  role: UserRole;
  company_id: number | null;
  is_active: boolean;
}

export const login = (email: string, password: string) =>
  client.post<{ access_token: string }>('/auth/login', { email, password }).then(r => r.data);

export const getMe = () =>
  client.get<UserOut>('/auth/me').then(r => r.data);
