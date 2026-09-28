import { useState, type FormEvent } from 'react';
import { Link, useLocation } from 'wouter';
import { Flame, Eye, EyeOff } from 'lucide-react';
import { resetPassword } from '@/lib/api';

export default function ResetPasswordPage() {
  const [location] = useLocation();
  const token = new URLSearchParams(location.split('?')[1] ?? '').get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('Those passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await resetPassword(token, password);
      setDone(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
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
          <h1 className="font-display text-3xl tracking-[-.05em]">Choose a new password</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {done ? 'Your password has been changed. You can sign in with it now.' : 'Pick something you will remember. At least 8 characters.'}
          </p>
        </div>

        {done ? (
          <Link
            href="/login"
            className="focus-ring flex h-11 w-full items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground transition hover:brightness-105"
            data-testid="button-go-to-login"
          >
            Sign in
          </Link>
        ) : !token ? (
          <div className="space-y-4 rounded-[24px] border border-border bg-card p-6 shadow-sm">
            <div className="rounded-xl bg-destructive/10 px-4 py-3 text-xs font-medium text-destructive">
              This reset link is missing its token. Request a new one to continue.
            </div>
            <Link
              href="/forgot-password"
              className="focus-ring flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-border bg-card text-sm font-bold transition hover:bg-muted"
            >
              Request a new link
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 rounded-[24px] border border-border bg-card p-6 shadow-sm">
            {error && (
              <div className="rounded-xl bg-destructive/10 px-4 py-3 text-xs font-medium text-destructive">{error}</div>
            )}

            <label className="block">
              <span className="text-sm font-bold">New password</span>
              <div className="relative mt-1.5">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="focus-ring h-11 w-full rounded-xl border border-input bg-background px-3 pr-10 text-sm outline-none focus:border-primary"
                  data-testid="input-reset-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>

            <label className="block">
              <span className="text-sm font-bold">Confirm password</span>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Type it again"
                className="focus-ring mt-1.5 h-11 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-primary"
                data-testid="input-reset-password-confirm"
              />
            </label>

            <button
              type="submit"
              disabled={loading}
              className="focus-ring h-11 w-full rounded-xl bg-primary text-sm font-bold text-primary-foreground transition hover:brightness-105 disabled:opacity-50"
              data-testid="button-reset-password"
            >
              {loading ? 'Updating...' : 'Update password'}
            </button>
          </form>
        )}

        <p className="text-center text-xs text-muted-foreground">
          <Link href="/login" className="font-bold text-primary hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
