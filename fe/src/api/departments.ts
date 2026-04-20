import client from './client';

export interface DeptOut {
  id: number;
  name: string;
  company_id: number;
  active_employee_count: number;
  created_at: string;
}

export const getDepartments = (companyId?: number) =>
  client.get<DeptOut[]>('/departments/', { params: companyId ? { company_id: companyId } : undefined }).then(r => r.data);

export const createDepartment = (name: string, companyId: number) =>
  client.post<DeptOut>('/departments/', { name, company_id: companyId }).then(r => r.data);

export const updateDepartment = (id: number, name: string) =>
  client.patch<DeptOut>(`/departments/${id}`, { name }).then(r => r.data);

export const deleteDepartment = (id: number) =>
  client.delete(`/departments/${id}`);
