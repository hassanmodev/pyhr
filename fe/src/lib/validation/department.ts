import { z } from 'zod';
import { zDeptName } from './fields';

const zCompanyId = z.preprocess(
  v => (typeof v === 'number' && !Number.isNaN(v) ? v : Number(v)),
  z.number().refine(n => Number.isInteger(n) && n > 0, { message: 'Company is required.' }),
);

export const departmentCreateFormSchema = z.object({
  name: zDeptName,
  company_id: zCompanyId,
});

export const departmentNameFormSchema = z.object({ name: zDeptName });
