import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Spinner } from '../components/ui/Spinner';
import { zodFirstError } from '../lib/validation/fields';
import { loginFormSchema } from '../lib/validation/login';
import { LoginDemoAccounts, type DemoKey, DEMO_ACCOUNTS } from './login/LoginDemoAccounts';

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeDemo, setActiveDemo] = useState<DemoKey | null>(null);

  const fillDemo = (key: DemoKey) => {
    const d = DEMO_ACCOUNTS[key];
    setEmail(d.email);
    setPassword(d.password);
    setActiveDemo(key);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = loginFormSchema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(zodFirstError(parsed.error));
      return;
    }
    setLoading(true);
    try {
      const me = await login(parsed.data.email, parsed.data.password);
      if (me.role === 'employee') {
        navigate('/', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch {
      toast.error('Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LoginDemoAccounts activeDemo={activeDemo} onSelect={fillDemo}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs text-text-muted mb-1.5">Email</label>
          <input
            type="email"
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
            value={password}
            onChange={e => {
              setPassword(e.target.value);
              setActiveDemo(null);
            }}
            placeholder="••••••••"
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-text-main text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium transition disabled:opacity-60 cursor-pointer"
        >
          {loading && <Spinner className="w-4 h-4 border-white border-t-white/30" />}
          Sign in
        </button>
      </form>
    </LoginDemoAccounts>
  );
}
