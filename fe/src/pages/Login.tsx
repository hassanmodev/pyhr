import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Spinner } from '../components/ui/Spinner';

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/', { replace: true });
    } catch {
      setError('Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="bg-surface border border-border rounded-2xl p-8 w-full max-w-sm shadow-sm">
        <div className="mb-8">
          <h1 className="text-xl font-semibold text-primary-600">pyhr</h1>
          <p className="text-sm text-text-muted mt-1">Sign in to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-text-muted mb-1.5">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
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
              onChange={e => setPassword(e.target.value)}
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
