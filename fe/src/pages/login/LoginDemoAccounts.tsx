import type { ReactNode } from 'react';

/** Matches `be/src/seed.py` demo accounts */
export const DEMO_ACCOUNTS = {
  admin: {
    label: 'Admin',
    description: 'System admin — all companies',
    email: 'admin@pyhr.dev',
    password: 'admin1234',
  },
  hr: {
    label: 'HR',
    description: 'HR manager — CairoTech',
    email: 'hr@cairotech.eg',
    password: 'hr1234',
  },
  employee: {
    label: 'Employee',
    description: 'Employee — Engineering, CairoTech',
    email: 'youssef.Khaled@cairotech.eg',
    password: 'employee1234',
  },
} as const;

export type DemoKey = keyof typeof DEMO_ACCOUNTS;

type Props = {
  activeDemo: DemoKey | null;
  onSelect: (key: DemoKey) => void;
  children: ReactNode;
};

export function LoginDemoAccounts({ activeDemo, onSelect, children }: Props) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="bg-surface border border-border rounded-2xl p-8 w-full max-w-sm shadow-sm">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-primary-600">pyhr</h1>
          <p className="text-sm text-text-muted mt-1">Sign in to continue</p>
        </div>

        <div className="mb-6">
          <p className="text-xs text-text-muted mb-2">Demo accounts</p>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(DEMO_ACCOUNTS) as DemoKey[]).map(key => (
              <button
                key={key}
                type="button"
                onClick={() => onSelect(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition cursor-pointer ${
                  activeDemo === key
                    ? 'bg-primary-50 border-primary-300 text-primary-700'
                    : 'bg-background border-border text-text-main hover:border-primary-200'
                }`}
              >
                {DEMO_ACCOUNTS[key].label}
              </button>
            ))}
          </div>
          {activeDemo && (
            <p className="text-xs text-text-muted mt-2">
              <span className="text-text-main font-medium">{DEMO_ACCOUNTS[activeDemo].label}</span>
              {' — '}
              {DEMO_ACCOUNTS[activeDemo].description}
            </p>
          )}
        </div>

        {children}
      </div>
    </div>
  );
}
