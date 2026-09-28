import { useState, type FormEvent } from 'react';
import { Link } from 'wouter';
import { Flame, MailCheck, ArrowLeft } from 'lucide-react';
import { requestPasswordReset } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await requestPasswordReset(email);
      setSent(true);
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
          <h1 className="font-display text-3xl tracking-[-.05em]">Reset your password</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {sent
              ? 'If that email has a NutriSnap account, a reset link is on its way.'
              : 'Enter the email you signed up with and we will send you a link to choose a new password.'}
          </p>
        </div>

        {sent ? (
          <div className="space-y-4 rounded-[24px] border border-border bg-card p-6 shadow-sm">
            <div className="flex items-start gap-3 rounded-xl bg-secondary/60 px-4 py-3.5">
              <MailCheck size={18} className="mt-0.5 shrink-0 text-primary" />
              <p className="text-xs leading-relaxed text-muted-foreground">
                The link is valid for one hour and can only be used once. Check your spam folder if it has not arrived in a few minutes.
              </p>
            </div>
            <Link
              href="/login"
              className="focus-ring flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-border bg-card text-sm font-bold transition hover:bg-muted"
              data-testid="button-back-to-login"
            >
              <ArrowLeft size={15} /> Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 rounded-[24px] border border-border bg-card p-6 shadow-sm">
            {error && (
              <div className="rounded-xl bg-destructive/10 px-4 py-3 text-xs font-medium text-destructive">{error}</div>
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
                data-testid="input-forgot-email"
              />
            </label>

            <button
              type="submit"
              disabled={loading}
              className="focus-ring h-11 w-full rounded-xl bg-primary text-sm font-bold text-primary-foreground transition hover:brightness-105 disabled:opacity-50"
              data-testid="button-send-reset-link"
            >
              {loading ? 'Sending...' : 'Send reset link'}
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
