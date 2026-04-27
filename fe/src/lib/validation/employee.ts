import { z } from 'zod';
import {
  zEmailClient,
  zHireDateYmd,
  zMobileClient,
  zNonEmptyTitle,
  zPasswordClient,
  zTrimmedName,
} from './fields';

const statusEnum = z.enum(['active', 'inactive']);
const roleEnum = z.enum(['employee', 'hr_manager', 'system_admin']);

const zCompanyId = z.preprocess(
  v => (typeof v === 'number' && !Number.isNaN(v) ? v : Number(v)),
  z.number().refine(n => Number.isInteger(n) && n > 0, { message: 'Company is required.' }),
);

const zDeptId = z.preprocess(
  v => {
    if (v === undefined || v === null || v === '') return undefined;
    if (typeof v === 'number' && Number.isNaN(v)) return undefined;
    const n = Number(v);
    return Number.isNaN(n) ? undefined : n;
  },
  z.number().int().optional(),
);

const baseShape = {
  first_name: zTrimmedName('First name'),
  last_name: zTrimmedName('Last name'),
  email: zEmailClient,
  mobile: zMobileClient,
  address: z
    .union([z.string(), z.undefined()])
    .transform(s => (typeof s === 'string' && s.trim() ? s.trim() : undefined)),
  title: zNonEmptyTitle,
  hire_date: zHireDateYmd,
  status: statusEnum,
  department_id: zDeptId,
  company_id: zCompanyId,
  role: roleEnum,
};

export const employeeCreateFormSchema = z.object({
  ...baseShape,
  password: zPasswordClient,
});

export const employeeUpdateFormSchema = z.object({
  ...baseShape,
});

export type EmployeeCreateFormValues = z.infer<typeof employeeCreateFormSchema>;
export type EmployeeUpdateFormValues = z.infer<typeof employeeUpdateFormSchema>;
