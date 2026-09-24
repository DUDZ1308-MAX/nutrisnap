import { Activity, Apple, Dumbbell, LayoutDashboard, Plus, Settings, Sprout } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link, useLocation } from 'wouter';

const navItems = [
  { href: '/', label: 'Today', icon: LayoutDashboard, testId: 'link-today' },
  { href: '/meals', label: 'Meals', icon: Apple, testId: 'link-meals' },
  { href: '/workouts', label: 'Workouts', icon: Dumbbell, testId: 'link-workouts' },
  { href: '/settings', label: 'Targets', icon: Settings, testId: 'link-settings' },
];

type ShellProps = {
  children: ReactNode;
  onQuickAdd?: (type: 'meal' | 'workout') => void;
};

export function NutriSnapShell({ children, onQuickAdd }: ShellProps) {
  const [location] = useLocation();
  const activePath = location === '/' ? '/' : `/${location.split('/')[1]}`;

  return (
    <div className="app-shell grain flex text-foreground">
      <aside className="hidden md:flex md:w-[246px] md:flex-col md:justify-between bg-sidebar text-sidebar-foreground shrink-0">
        <div>
          <div className="px-7 pt-8 pb-10">
            <Link href="/" className="focus-ring inline-flex items-center gap-3" data-testid="link-brand">
              <span className="grid size-10 place-items-center rounded-[14px] bg-sidebar-primary text-sidebar-primary-foreground shadow-sm">
                <Sprout size={21} strokeWidth={2.2} />
              </span>
              <span>
                <span className="font-display text-[22px] leading-none tracking-[-0.04em]">NutriSnap</span>
                <span className="mt-1 block font-mono-ui text-[9px] uppercase tracking-[.2em] text-sidebar-foreground/55">good days, logged</span>
              </span>
            </Link>
          </div>
          <nav className="px-4" aria-label="Primary navigation">
            <p className="px-3 pb-3 font-mono-ui text-[10px] uppercase tracking-[.22em] text-sidebar-foreground/40">Your rhythm</p>
            <div className="space-y-1">
              {navItems.map(({ href, label, icon: Icon, testId }) => {
                const active = activePath === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    data-testid={testId}
                    className={`focus-ring group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-colors ${active ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground/64 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'}`}
                  >
                    <Icon size={18} strokeWidth={active ? 2.3 : 1.8} />
                    <span>{label}</span>
                    {active && <span className="ml-auto size-1.5 rounded-full bg-sidebar-primary" />}
                  </Link>
                );
              })}
            </div>
          </nav>
        </div>
        <div className="px-5 pb-6">
          <div className="rounded-2xl border border-sidebar-border bg-sidebar-accent/55 p-4">
            <div className="mb-3 flex items-center gap-2 text-sidebar-primary">
              <Activity size={15} />
              <span className="font-mono-ui text-[10px] uppercase tracking-[.16em]">A small nudge</span>
            </div>
            <p className="font-display text-[19px] leading-tight text-sidebar-foreground">Consistency beats perfect.</p>
            <p className="mt-2 text-xs leading-relaxed text-sidebar-foreground/55">Log what happened. Let tomorrow be a fresh page.</p>
          </div>
          <p className="mt-5 px-1 text-[10px] text-sidebar-foreground/35">Stored privately on this device</p>
        </div>
      </aside>

      <main className="min-w-0 flex-1 pb-24 md:pb-0">
        <header className="sticky top-0 z-30 flex h-[76px] items-center justify-between border-b border-border/70 bg-background/90 px-5 backdrop-blur-md sm:px-8 lg:px-12">
          <div className="md:hidden">
            <Link href="/" className="focus-ring inline-flex items-center gap-2" data-testid="link-mobile-brand">
              <span className="grid size-8 place-items-center rounded-[11px] bg-primary text-primary-foreground"><Sprout size={17} /></span>
              <span className="font-display text-xl tracking-[-.04em]">NutriSnap</span>
            </Link>
          </div>
          <div className="hidden md:block">
            <span className="font-mono-ui text-[10px] uppercase tracking-[.19em] text-muted-foreground">Personal wellness journal</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onQuickAdd?.('meal')}
              data-testid="button-quick-add-meal"
              className="focus-ring inline-flex h-9 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-xs font-bold text-foreground shadow-sm transition hover:border-primary/40 hover:text-primary"
            >
              <Plus size={14} /> <span className="hidden sm:inline">Meal</span>
            </button>
            <button
              type="button"
              onClick={() => onQuickAdd?.('workout')}
              data-testid="button-quick-add-workout"
              className="focus-ring inline-flex h-9 items-center gap-1.5 rounded-full bg-primary px-3 text-xs font-bold text-primary-foreground shadow-sm transition hover:brightness-105"
            >
              <Plus size={14} /> <span className="hidden sm:inline">Workout</span>
            </button>
          </div>
        </header>
        <div className="page-enter">{children}</div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 flex h-[72px] items-center justify-around border-t border-border bg-card/95 px-2 backdrop-blur-lg md:hidden" aria-label="Mobile navigation">
        {navItems.map(({ href, label, icon: Icon, testId }) => {
          const active = activePath === href;
          return (
            <Link
              key={href}
              href={href}
              data-testid={`${testId}-mobile`}
              className={`focus-ring flex min-w-[64px] flex-col items-center gap-1 rounded-xl px-3 py-2 text-[10px] font-bold transition ${active ? 'text-primary' : 'text-muted-foreground'}`}
            >
              <Icon size={19} strokeWidth={active ? 2.4 : 1.8} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
