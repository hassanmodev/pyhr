import client from './client';

export interface CompanyOut {
  id: number;
  name: string;
  total_departments: number;
  total_employees: number;
  created_at: string;
}

export const getCompanies = () =>
  client.get<CompanyOut[]>('/companies/').then(r => r.data);

export const createCompany = (name: string) =>
  client.post<CompanyOut>('/companies/', { name }).then(r => r.data);

export const updateCompany = (id: number, name: string) =>
  client.patch<CompanyOut>(`/companies/${id}`, { name }).then(r => r.data);

export const deleteCompany = (id: number) =>
  client.delete(`/companies/${id}`);
