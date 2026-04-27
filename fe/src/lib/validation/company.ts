import { z } from 'zod';
import { zCompanyName } from './fields';

export const companyNameFormSchema = z.object({ name: zCompanyName });
