import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Spinner } from '../components/ui/Spinner';

/** Matches `be/src/seed.py` demo accounts */
const DEMO_ACCOUNTS = {
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

type DemoKey = keyof typeof DEMO_ACCOUNTS;

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeDemo, setActiveDemo] = useState<DemoKey | null>(null);

  const fillDemo = (key: DemoKey) => {
    const d = DEMO_ACCOUNTS[key];
    setEmail(d.email);
    setPassword(d.password);
    setActiveDemo(key);
    setError('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const me = await login(email, password);
      if (me.role === 'employee') {
        navigate('/', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch {
      setError('Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

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
                onClick={() => fillDemo(key)}
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-text-muted mb-1.5">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => {
                setEmail(e.target.value);
                setActiveDemo(null);
              }}
              placeholder="you@company.com"
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-text-main text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs text-text-muted mb-1.5">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={e => {
                setPassword(e.target.value);
                setActiveDemo(null);
              }}
              placeholder="••••••••"
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-text-main text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
            />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium transition disabled:opacity-60 cursor-pointer"
          >
            {loading && <Spinner className="w-4 h-4 border-white border-t-white/30" />}
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}
