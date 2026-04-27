import { z } from 'zod';

/** Aligned with `be/src/core/validation.py` + `be/src/routers/employees.py` */
const NAME_RE = /^[a-zA-Z\s'.\-]+$/;
const MOBILE_RE = /^\+?[\d\s()\-.]{7,30}$/;

function todayLocalDate(): Date {
  const t = new Date();
  return new Date(t.getFullYear(), t.getMonth(), t.getDate());
}

function parseYmd(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const dt = new Date(y, mo - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
  return dt;
}

export const zodFirstError = (err: z.ZodError) => err.issues[0]?.message ?? 'Invalid input.';

export const zTrimmedName = (field: string) =>
  z
    .string()
    .transform(s => s.trim())
    .refine(s => s.length > 0, { message: `${field} cannot be empty` })
    .refine(s => NAME_RE.test(s), {
      message: `${field} must contain only letters, spaces, hyphens, apostrophes, and periods`,
    });

export const zEmailClient = z
  .string()
  .min(1, 'Email is required.')
  .email('Invalid email format.');

export const zMobileClient = z
  .string()
  .min(1, 'Mobile is required.')
  .transform(s => s.trim())
  .refine(s => MOBILE_RE.test(s), { message: 'Invalid mobile number format' })
  .refine(
    s => s.replace(/\D/g, '').length >= 7,
    { message: 'Mobile number must contain at least 7 digits' },
  );

export const zPasswordClient = z
  .string()
  .min(1, 'Password is required for new employees.')
  .refine(s => s.length >= 8, { message: 'Password must be at least 8 characters long' })
  .refine(s => /[A-Z]/.test(s), { message: 'Password must contain at least one uppercase letter' })
  .refine(s => /[a-z]/.test(s), { message: 'Password must contain at least one lowercase letter' })
  .refine(s => /\d/.test(s), { message: 'Password must contain at least one digit' });

export const zHireDateYmd = z
  .string()
  .min(1, 'Hire date is required.')
  .refine(
    s => {
      const d = parseYmd(s);
      if (!d) return false;
      return d.getTime() <= todayLocalDate().getTime();
    },
    { message: 'Hire date cannot be in the future' },
  );

export const zNonEmptyTitle = z
  .string()
  .transform(s => s.trim())
  .refine(s => s.length > 0, { message: 'Title cannot be empty' });

export const zCompanyName = z
  .string()
  .transform(s => s.trim())
  .refine(s => s.length > 0, { message: 'Name cannot be empty' });

export const zDeptName = z
  .string()
  .transform(s => s.trim())
  .refine(s => s.length > 0, { message: 'Name cannot be empty' });
