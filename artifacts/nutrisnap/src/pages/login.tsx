import { useState, type FormEvent } from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/lib/auth-context';
import { Flame, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const [, navigate] = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-[100dvh] place-items-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="mx-auto mb-4 grid size-14 place-items-center rounded-[18px] bg-primary text-primary-foreground">
            <Flame size={26} />
          </div>
          <h1 className="font-display text-3xl tracking-[-.05em]">Welcome back</h1>
          <p className="mt-2 text-sm text-muted-foreground">Sign in to continue tracking your nutrition.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-[24px] border border-border bg-card p-6 shadow-sm">
          {error && (
            <div className="rounded-xl bg-destructive/10 px-4 py-3 text-xs font-medium text-destructive">
              {error}
            </div>
          )}

          <label className="block">
            <span className="text-sm font-bold">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="focus-ring mt-1.5 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary"
              data-testid="input-login-email"
            />
          </label>

          <label className="block">
            <span className="text-sm font-bold">Password</span>
            <div className="relative mt-1.5">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                className="focus-ring h-11 w-full rounded-xl border border-input bg-background px-3 pr-10 text-sm outline-none focus:border-primary"
                data-testid="input-login-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="focus-ring h-11 w-full rounded-xl bg-primary text-sm font-bold text-primary-foreground transition hover:brightness-105 disabled:opacity-50"
            data-testid="button-login"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          Don't have an account?{' '}
          <Link href="/register" className="font-bold text-primary hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
