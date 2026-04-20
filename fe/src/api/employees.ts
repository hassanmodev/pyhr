import client from './client';
import type { UserRole } from './auth';

export type EmployeeStatus = 'active' | 'inactive';

export type { UserRole };

export interface EmployeeOut {
  id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  mobile: string;
  address: string | null;
  title: string;
  hire_date: string;
  status: EmployeeStatus;
  department_id: number | null;
  company_id: number;
  company_name: string;
  days_employed: number;
  created_at: string;
  user_role: UserRole | null;
}

export interface EmployeeCreate {
  first_name: string;
  last_name: string;
  email: string;
  mobile: string;
  address?: string;
  title: string;
  hire_date: string;
  status: EmployeeStatus;
  department_id?: number;
  company_id: number;
  password: string;
  role: UserRole;
}

export interface EmployeeUpdate {
  first_name?: string;
  last_name?: string;
  email?: string;
  mobile?: string;
  address?: string;
  title?: string;
  hire_date?: string;
  status?: EmployeeStatus;
  department_id?: number;
  company_id?: number;
  role?: UserRole;
}

export const getEmployees = (params?: { company_id?: number; department_id?: number; status?: string }) =>
  client.get<EmployeeOut[]>('/employees/', { params }).then(r => r.data);

export const getMyProfile = () =>
  client.get<EmployeeOut>('/employees/me').then(r => r.data);

export const createEmployee = (data: EmployeeCreate) =>
  client.post<EmployeeOut>('/employees/', data).then(r => r.data);

export const updateEmployee = (id: number, data: EmployeeUpdate) =>
  client.patch<EmployeeOut>(`/employees/${id}`, data).then(r => r.data);

export const deleteEmployee = (id: number) =>
  client.delete(`/employees/${id}`);
