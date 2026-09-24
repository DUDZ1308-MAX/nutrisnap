import { Activity, ArrowRight, CalendarDays, ChevronRight, CircleAlert, Flame, Pencil, Plus, Search, Sparkles, Target, Trash2, TrendingUp, Utensils } from 'lucide-react';
import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Link, Route, Router as WouterRouter, Switch, useLocation } from 'wouter';
import { ErrorBoundary } from '@/components/error-boundary';
import { NutriSnapShell } from '@/components/nutrisnap-shell';
import { ConfirmDialog, MealDialog, WorkoutDialog } from '@/components/nutrisnap-dialogs';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/toaster';
import NotFound from '@/pages/not-found';
import { todayKey, useNutriSnap, type Goals, type Meal, type Workout } from '@/lib/nutrisnap-storage';

const queryClient = new QueryClient();

const formatDate = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
const fullDate = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
const monthDay = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
const percentage = (value: number, goal: number) => goal > 0 ? Math.min(100, Math.round((value / goal) * 100)) : 0;

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  const [modal, setModal] = useState<'meal' | 'workout' | null>(null);
  const [editingMeal, setEditingMeal] = useState<Meal | undefined>();
  const [editingWorkout, setEditingWorkout] = useState<Workout | undefined>();
  const data = useNutriSnap();
  const closeModal = () => { setModal(null); setEditingMeal(undefined); setEditingWorkout(undefined); };
  const shellAdd = (type: 'meal' | 'workout') => { setModal(type); setEditingMeal(undefined); setEditingWorkout(undefined); };

  if (!data.ready) return <LoadingScreen />;

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <NutriSnapShell onQuickAdd={shellAdd}>
            <RoutedErrorBoundary>
              <Switch>
                <Route path="/">
                  <Overview data={data} onAddMeal={shellAdd} onAddWorkout={shellAdd} onEditMeal={(meal) => { setEditingMeal(meal); setModal('meal'); }} onEditWorkout={(workout) => { setEditingWorkout(workout); setModal('workout'); }} />
                </Route>
                <Route path="/meals">
                  <MealsPage data={data} onAdd={() => shellAdd('meal')} onEdit={(meal) => { setEditingMeal(meal); setModal('meal'); }} />
                </Route>
                <Route path="/workouts">
                  <WorkoutsPage data={data} onAdd={() => shellAdd('workout')} onEdit={(workout) => { setEditingWorkout(workout); setModal('workout'); }} />
                </Route>
                <Route path="/settings"><SettingsPage data={data} /></Route>
                <Route component={NotFound} />
              </Switch>
            </RoutedErrorBoundary>
          </NutriSnapShell>
        </WouterRouter>
        <Toaster />
        {modal === 'meal' ? <MealDialog meal={editingMeal} onClose={closeModal} onSave={(meal) => { editingMeal ? data.updateMeal(editingMeal.id, meal) : data.addMeal(meal); closeModal(); }} /> : null}
        {modal === 'workout' ? <WorkoutDialog workout={editingWorkout} onClose={closeModal} onSave={(workout) => { editingWorkout ? data.updateWorkout(editingWorkout.id, workout) : data.addWorkout(workout); closeModal(); }} /> : null}
      </TooltipProvider>
    </QueryClientProvider>
  );
}

function LoadingScreen() {
  return <div className="grid min-h-[100dvh] place-items-center bg-background"><div className="space-y-3 text-center"><div className="mx-auto size-10 animate-pulse rounded-[14px] bg-primary/25" /><p className="font-display text-xl">Opening your day...</p></div></div>;
}

type Data = ReturnType<typeof useNutriSnap>;
type OverviewProps = { data: Data; onAddMeal: (type: 'meal') => void; onAddWorkout: (type: 'workout') => void; onEditMeal: (meal: Meal) => void; onEditWorkout: (workout: Workout) => void };

function Overview({ data, onAddMeal, onAddWorkout, onEditMeal, onEditWorkout }: OverviewProps) {
  const today = todayKey();
  const todayMeals = useMemo(() => data.meals.filter((meal) => meal.date === today).sort((a, b) => b.time.localeCompare(a.time)), [data.meals, today]);
  const todayWorkouts = useMemo(() => data.workouts.filter((workout) => workout.date === today), [data.workouts, today]);
  const totals = todayMeals.reduce((sum, meal) => ({ calories: sum.calories + meal.calories, protein: sum.protein + meal.protein, carbs: sum.carbs + meal.carbs, fat: sum.fat + meal.fat }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
  const caloriesLeft = Math.max(0, data.goals.calories - totals.calories);
  return (
    <div className="mx-auto max-w-[1320px] px-5 py-8 sm:px-8 lg:px-12 lg:py-12">
      <section className="relative overflow-hidden rounded-[30px] bg-sidebar px-6 py-8 text-sidebar-foreground shadow-[0_22px_55px_-28px_hsl(165_28%_15%/.6)] sm:px-9 sm:py-10 lg:px-12 lg:py-11">
        <div className="absolute -right-12 -top-20 size-72 rounded-full border-[24px] border-sidebar-primary/15" />
        <div className="absolute -bottom-28 right-28 size-64 rounded-full border-[1px] border-sidebar-primary/20" />
        <div className="relative max-w-2xl">
          <p className="font-mono-ui text-[10px] uppercase tracking-[.22em] text-sidebar-primary" data-testid="text-dashboard-eyebrow">Today · {formatDate(today)}</p>
          <h1 className="mt-3 font-display text-4xl leading-[.98] tracking-[-.055em] sm:text-5xl" data-testid="text-dashboard-heading">Make room for<br /><span className="text-sidebar-primary">good energy.</span></h1>
          <p className="mt-5 max-w-md text-sm leading-relaxed text-sidebar-foreground/60" data-testid="text-dashboard-subtitle">{todayMeals.length || todayWorkouts.length ? 'A quick look at what is fueling your day so far.' : 'Your day is still unwritten. Start with one small check-in.'}</p>
          <div className="mt-7 flex flex-wrap gap-2.5">
            <button type="button" onClick={() => onAddMeal('meal')} data-testid="button-dashboard-add-meal" className="focus-ring inline-flex h-11 items-center gap-2 rounded-xl bg-sidebar-primary px-4 text-sm font-bold text-sidebar-primary-foreground transition hover:brightness-105"><Plus size={16} /> Log a meal</button>
            <button type="button" onClick={() => onAddWorkout('workout')} data-testid="button-dashboard-add-workout" className="focus-ring inline-flex h-11 items-center gap-2 rounded-xl border border-sidebar-foreground/20 px-4 text-sm font-bold text-sidebar-foreground transition hover:bg-sidebar-foreground/10"><Activity size={16} /> Log movement</button>
          </div>
        </div>
        <div className="relative mt-10 grid max-w-2xl grid-cols-2 gap-3 border-t border-sidebar-foreground/10 pt-5 sm:mt-12 sm:grid-cols-4">
          {[['Calories', totals.calories, 'kcal'], ['Protein', `${Math.round(totals.protein)}g`, 'of target'], ['Meals', todayMeals.length, 'logged'], ['Movement', todayWorkouts.length, 'sessions']].map(([label, value, suffix], index) => <div key={String(label)} className={`${index > 1 ? 'hidden sm:block' : ''}`}><p className="font-mono-ui text-[9px] uppercase tracking-[.16em] text-sidebar-foreground/45">{label}</p><p className="mt-1 font-display text-2xl text-sidebar-foreground">{value}</p><p className="text-[10px] text-sidebar-foreground/45">{suffix}</p></div>)}
        </div>
      </section>

      <div className="mt-8 grid gap-5 xl:grid-cols-[1.22fr_.78fr]">
        <section className="rounded-[24px] border border-border bg-card p-5 shadow-sm sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div><p className="font-mono-ui text-[10px] uppercase tracking-[.2em] text-muted-foreground">Nutrition balance</p><h2 className="mt-1 font-display text-2xl tracking-[-.04em]">Your fuel, at a glance</h2></div>
            <Link href="/settings" data-testid="link-dashboard-targets" className="focus-ring inline-flex items-center gap-1 text-xs font-bold text-primary">Edit targets <ChevronRight size={14} /></Link>
          </div>
          <div className="mt-7 grid gap-5 sm:grid-cols-[160px_1fr] sm:items-center">
            <div className="relative mx-auto grid size-36 place-items-center rounded-full" style={{ background: `conic-gradient(hsl(var(--primary)) ${percentage(totals.calories, data.goals.calories)}%, hsl(var(--muted)) 0)` }} data-testid="chart-calorie-progress">
              <div className="grid size-[116px] place-items-center rounded-full bg-card text-center"><div><p className="font-display text-3xl">{totals.calories}</p><p className="font-mono-ui text-[9px] uppercase tracking-[.12em] text-muted-foreground">of {data.goals.calories}</p></div></div>
            </div>
            <div className="space-y-4">
              <ProgressLine label="Protein" value={totals.protein} goal={data.goals.protein} color="bg-[#3f8d7b]" unit="g" testId="progress-protein" />
              <ProgressLine label="Carbs" value={totals.carbs} goal={data.goals.carbs} color="bg-[#e1ae38]" unit="g" testId="progress-carbs" />
              <ProgressLine label="Fat" value={totals.fat} goal={data.goals.fat} color="bg-[#df674f]" unit="g" testId="progress-fat" />
            </div>
          </div>
          <div className="mt-6 flex items-center justify-between rounded-xl bg-secondary/60 px-4 py-3"><span className="text-xs font-semibold text-muted-foreground">Remaining today</span><span className="font-mono-ui text-sm font-medium text-foreground" data-testid="text-calories-remaining">{caloriesLeft} kcal</span></div>
        </section>

        <section className="rounded-[24px] border border-border bg-accent/45 p-5 sm:p-6">
          <div className="flex items-start justify-between"><div><p className="font-mono-ui text-[10px] uppercase tracking-[.2em] text-muted-foreground">Movement</p><h2 className="mt-1 font-display text-2xl tracking-[-.04em]">Keep it moving</h2></div><div className="grid size-10 place-items-center rounded-2xl bg-card text-primary"><Flame size={18} /></div></div>
          {todayWorkouts.length ? <div className="mt-6 space-y-3">{todayWorkouts.slice(0, 3).map((workout) => <MiniWorkout key={workout.id} workout={workout} onEdit={() => onEditWorkout(workout)} />)}</div> : <EmptyMini icon={<Activity size={17} />} title="No movement logged yet" detail="A walk around the block counts." />}
          <button type="button" onClick={() => onAddWorkout('workout')} data-testid="button-add-movement-card" className="focus-ring mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-foreground/15 bg-card/55 py-3 text-xs font-bold transition hover:bg-card"><Plus size={14} /> Add movement</button>
        </section>
      </div>

      <section className="mt-5 rounded-[24px] border border-border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex items-center justify-between"><div><p className="font-mono-ui text-[10px] uppercase tracking-[.2em] text-muted-foreground">Today’s plate</p><h2 className="mt-1 font-display text-2xl tracking-[-.04em]">Meals logged</h2></div><Link href="/meals" data-testid="link-view-all-meals" className="focus-ring inline-flex items-center gap-1 text-xs font-bold text-primary">View all <ArrowRight size={14} /></Link></div>
        {todayMeals.length ? <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{todayMeals.slice(0, 6).map((meal) => <MealRow key={meal.id} meal={meal} onEdit={() => onEditMeal(meal)} />)}</div> : <EmptyState title="Your plate is waiting" detail="Log your first meal to see the day take shape." actionLabel="Add a meal" onAction={() => onAddMeal('meal')} icon={<Utensils size={22} />} testId="dashboard-meals" />}
      </section>
    </div>
  );
}

function ProgressLine({ label, value, goal, color, unit, testId }: { label: string; value: number; goal: number; color: string; unit: string; testId: string }) {
  return <div data-testid={testId}><div className="mb-1.5 flex items-center justify-between text-xs"><span className="font-bold">{label}</span><span className="font-mono-ui text-[11px] text-muted-foreground">{Math.round(value)}{unit} <span className="text-muted-foreground/60">/ {goal}{unit}</span></span></div><div className="h-2 overflow-hidden rounded-full bg-muted"><div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${percentage(value, goal)}%` }} /></div></div>;
}

function EmptyMini({ icon, title, detail }: { icon: ReactNode; title: string; detail: string }) {
  return <div className="mt-6 rounded-2xl border border-dashed border-foreground/15 bg-card/35 p-5"><span className="grid size-8 place-items-center rounded-xl bg-card text-primary">{icon}</span><p className="mt-3 text-sm font-bold">{title}</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{detail}</p></div>;
}

function EmptyState({ title, detail, actionLabel, onAction, icon, testId }: { title: string; detail: string; actionLabel: string; onAction: () => void; icon: ReactNode; testId: string }) {
  return <div className="my-5 flex flex-col items-center rounded-2xl border border-dashed border-border bg-background/60 px-5 py-10 text-center" data-testid={`empty-${testId}`}><span className="grid size-11 place-items-center rounded-2xl bg-secondary text-primary">{icon}</span><h3 className="mt-4 font-display text-xl">{title}</h3><p className="mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">{detail}</p><button type="button" onClick={onAction} data-testid={`button-${testId}`} className="focus-ring mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-xs font-bold text-primary-foreground"><Plus size={14} /> {actionLabel}</button></div>;
}

function MiniWorkout({ workout, onEdit }: { workout: Workout; onEdit: () => void }) {
  return <div className="group flex items-center gap-3 rounded-2xl bg-card/75 p-3.5" data-testid={`card-today-workout-${workout.id}`}><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-secondary text-primary"><Activity size={16} /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{workout.name}</p><p className="mt-0.5 text-xs text-muted-foreground">{workout.activity} · {workout.durationMinutes} min</p></div><button type="button" onClick={onEdit} data-testid={`button-edit-today-workout-${workout.id}`} className="focus-ring grid size-8 place-items-center rounded-lg text-muted-foreground opacity-70 transition hover:bg-muted hover:text-foreground"><Pencil size={14} /></button></div>;
}

function MealRow({ meal, onEdit }: { meal: Meal; onEdit: () => void }) {
  return <div className="card-lift flex items-center gap-3 rounded-2xl border border-border bg-background/55 p-3.5" data-testid={`card-meal-${meal.id}`}><div className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-secondary text-primary">{meal.imageDataUrl ? <img src={meal.imageDataUrl} alt="" className="h-full w-full object-cover" data-testid={`img-meal-${meal.id}`} /> : <Utensils size={16} />}</div><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="truncate text-sm font-bold">{meal.name}</p><span className="hidden rounded-full bg-muted px-2 py-0.5 text-[9px] font-bold text-muted-foreground sm:inline">{meal.mealType}</span></div><p className="mt-0.5 text-xs text-muted-foreground">{meal.time} · {meal.calories} kcal</p></div><button type="button" onClick={onEdit} data-testid={`button-edit-meal-${meal.id}`} className="focus-ring grid size-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"><Pencil size={14} /></button></div>;
}

type MealsPageProps = { data: Data; onAdd: () => void; onEdit: (meal: Meal) => void };
function MealsPage({ data, onAdd, onEdit }: MealsPageProps) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('All');
  const [deleting, setDeleting] = useState<Meal | undefined>();
  const filtered = data.meals.filter((meal) => (!query || meal.name.toLowerCase().includes(query.toLowerCase())) && (filter === 'All' || meal.mealType === filter)).sort((a, b) => `${b.date}${b.time}`.localeCompare(`${a.date}${a.time}`));
  return <div className="mx-auto max-w-[1180px] px-5 py-8 sm:px-8 lg:px-12 lg:py-12">
    <PageIntro eyebrow="Food log" title="Meals that make sense." detail="Keep a simple record of what you ate, with nutrition facts you enter yourself." actionLabel="Add meal" onAction={onAdd} testId="meals" />
    <div className="mt-8 flex flex-col gap-3 sm:flex-row"><label className="relative flex-1"><Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search meals" className="focus-ring h-11 w-full rounded-xl border border-input bg-card pl-10 pr-4 text-sm outline-none focus:border-primary" data-testid="input-search-meals" /></label><div className="flex gap-1 overflow-x-auto rounded-xl border border-border bg-card p-1">{['All', 'Breakfast', 'Lunch', 'Dinner', 'Snack'].map((item) => <button key={item} type="button" onClick={() => setFilter(item)} data-testid={`button-filter-meals-${item.toLowerCase()}`} className={`focus-ring whitespace-nowrap rounded-lg px-3 py-2 text-xs font-bold transition ${filter === item ? 'bg-sidebar text-sidebar-foreground' : 'text-muted-foreground hover:bg-muted'}`}>{item}</button>)}</div></div>
    {filtered.length ? <div className="mt-6 space-y-3">{filtered.map((meal, index) => <MealListCard key={meal.id} meal={meal} index={index} onEdit={() => onEdit(meal)} onDelete={() => setDeleting(meal)} />)}</div> : <EmptyState title={data.meals.length ? 'No meals match that search' : 'Nothing on the plate yet'} detail={data.meals.length ? 'Try another name or clear the filter.' : 'Start with the meal you remember best. The nutrition facts stay in your hands.'} actionLabel={data.meals.length ? 'Add a meal anyway' : 'Log your first meal'} onAction={onAdd} icon={<Utensils size={22} />} testId="meals-list" />}
    {deleting ? <ConfirmDialog title={`Delete ${deleting.name}?`} detail="This meal and its nutrition details will be removed from this device. This cannot be undone." onClose={() => setDeleting(undefined)} onConfirm={() => { data.deleteMeal(deleting.id); setDeleting(undefined); }} testId={`meal-${deleting.id}`} /> : null}
  </div>;
}

function MealListCard({ meal, index, onEdit, onDelete }: { meal: Meal; index: number; onEdit: () => void; onDelete: () => void }) {
  return <article className="card-lift stagger-in flex flex-col gap-4 rounded-[22px] border border-border bg-card p-4 shadow-sm sm:flex-row sm:items-center" style={{ animationDelay: `${Math.min(index * 50, 250)}ms` }} data-testid={`row-meal-${meal.id}`}><div className="flex items-center gap-4 sm:flex-1"><div className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-secondary text-primary">{meal.imageDataUrl ? <img src={meal.imageDataUrl} alt="" className="h-full w-full object-cover" data-testid={`img-meal-list-${meal.id}`} /> : <Utensils size={20} />}</div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate font-display text-xl">{meal.name}</h3><span className="rounded-full bg-accent/40 px-2 py-1 text-[10px] font-bold">{meal.mealType}</span></div><p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground"><CalendarDays size={13} /> {fullDate(meal.date)} · {meal.time}</p></div></div><div className="grid grid-cols-4 gap-2 border-t border-border pt-3 sm:w-[360px] sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">{[['Calories', `${meal.calories}`, 'kcal'], ['Protein', `${meal.protein}g`, 'protein'], ['Carbs', `${meal.carbs}g`, 'carbs'], ['Fat', `${meal.fat}g`, 'fat']].map(([label, value, unit]) => <div key={label}><p className="font-mono-ui text-[9px] uppercase tracking-[.1em] text-muted-foreground">{label}</p><p className="mt-1 text-sm font-bold">{value}</p><p className="text-[9px] text-muted-foreground">{unit}</p></div>)}</div><div className="flex gap-1 border-t border-border pt-3 sm:border-0 sm:pt-0"><button type="button" onClick={onEdit} data-testid={`button-edit-meal-list-${meal.id}`} className="focus-ring inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-muted px-3 text-xs font-bold transition hover:bg-secondary sm:flex-none"><Pencil size={13} /> Edit</button><button type="button" onClick={onDelete} data-testid={`button-delete-meal-${meal.id}`} className="focus-ring grid size-9 place-items-center rounded-lg text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"><Trash2 size={14} /></button></div></article>;
}

type WorkoutsPageProps = { data: Data; onAdd: () => void; onEdit: (workout: Workout) => void };
function WorkoutsPage({ data, onAdd, onEdit }: WorkoutsPageProps) {
  const [deleting, setDeleting] = useState<Workout | undefined>();
  const [filter, setFilter] = useState('All');
  const activities = ['All', ...Array.from(new Set(data.workouts.map((workout) => workout.activity)))];
  const filtered = data.workouts.filter((workout) => filter === 'All' || workout.activity === filter).sort((a, b) => `${b.date}${b.name}`.localeCompare(`${a.date}${a.name}`));
  const totalMinutes = data.workouts.reduce((sum, workout) => sum + workout.durationMinutes, 0);
  return <div className="mx-auto max-w-[1180px] px-5 py-8 sm:px-8 lg:px-12 lg:py-12">
    <PageIntro eyebrow="Movement log" title="Move in your own way." detail="Capture the work that makes you feel more like yourself. Every session counts." actionLabel="Add workout" onAction={onAdd} testId="workouts" />
    <div className="mt-8 grid gap-3 sm:grid-cols-3"><SummaryTile label="Sessions" value={data.workouts.length} detail="all time" icon={<Activity size={17} />} testId="workout-summary-sessions" /><SummaryTile label="Minutes" value={totalMinutes} detail="all time" icon={<TrendingUp size={17} />} testId="workout-summary-minutes" /><SummaryTile label="Activities" value={new Set(data.workouts.map((workout) => workout.activity)).size} detail="different ways" icon={<Sparkles size={17} />} testId="workout-summary-activities" /></div>
    <div className="mt-8 flex items-center justify-between gap-3"><div><p className="font-mono-ui text-[10px] uppercase tracking-[.2em] text-muted-foreground">Your sessions</p><h2 className="mt-1 font-display text-2xl">A little momentum</h2></div><div className="flex max-w-[52%] gap-1 overflow-x-auto rounded-xl border border-border bg-card p-1">{activities.map((item) => <button key={item} type="button" onClick={() => setFilter(item)} data-testid={`button-filter-workouts-${item.toLowerCase()}`} className={`focus-ring whitespace-nowrap rounded-lg px-3 py-2 text-xs font-bold ${filter === item ? 'bg-sidebar text-sidebar-foreground' : 'text-muted-foreground hover:bg-muted'}`}>{item}</button>)}</div></div>
    {filtered.length ? <div className="mt-5 grid gap-3 md:grid-cols-2">{filtered.map((workout, index) => <WorkoutCard key={workout.id} workout={workout} index={index} onEdit={() => onEdit(workout)} onDelete={() => setDeleting(workout)} />)}</div> : <EmptyState title="No sessions here yet" detail="Your next workout does not have to be complicated." actionLabel="Log a workout" onAction={onAdd} icon={<Activity size={22} />} testId="workouts-list" />}
    {deleting ? <ConfirmDialog title={`Delete ${deleting.name}?`} detail="This movement log will be removed from this device. This cannot be undone." onClose={() => setDeleting(undefined)} onConfirm={() => { data.deleteWorkout(deleting.id); setDeleting(undefined); }} testId={`workout-${deleting.id}`} /> : null}
  </div>;
}

function SummaryTile({ label, value, detail, icon, testId }: { label: string; value: number; detail: string; icon: ReactNode; testId: string }) {
  return <div className="card-lift rounded-[20px] border border-border bg-card p-4 shadow-sm" data-testid={testId}><div className="flex items-center justify-between"><span className="grid size-8 place-items-center rounded-xl bg-secondary text-primary">{icon}</span><span className="font-mono-ui text-[9px] uppercase tracking-[.16em] text-muted-foreground">{detail}</span></div><p className="mt-4 font-display text-3xl">{value}</p><p className="mt-0.5 text-xs font-bold text-muted-foreground">{label}</p></div>;
}

function WorkoutCard({ workout, index, onEdit, onDelete }: { workout: Workout; index: number; onEdit: () => void; onDelete: () => void }) {
  return <article className="card-lift stagger-in rounded-[22px] border border-border bg-card p-5 shadow-sm" style={{ animationDelay: `${Math.min(index * 60, 240)}ms` }} data-testid={`row-workout-${workout.id}`}><div className="flex items-start justify-between gap-4"><div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-2xl bg-secondary text-primary"><Activity size={19} /></span><div><h3 className="font-display text-xl">{workout.name}</h3><p className="mt-0.5 text-xs text-muted-foreground">{workout.activity} · {monthDay(workout.date)}</p></div></div><div className="flex gap-1"><button type="button" onClick={onEdit} data-testid={`button-edit-workout-${workout.id}`} className="focus-ring grid size-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"><Pencil size={14} /></button><button type="button" onClick={onDelete} data-testid={`button-delete-workout-${workout.id}`} className="focus-ring grid size-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"><Trash2 size={14} /></button></div></div><div className="mt-5 grid grid-cols-2 gap-3 border-t border-border pt-4"><div><p className="font-mono-ui text-[9px] uppercase tracking-[.14em] text-muted-foreground">Duration</p><p className="mt-1 text-sm font-bold">{workout.durationMinutes} min</p></div><div><p className="font-mono-ui text-[9px] uppercase tracking-[.14em] text-muted-foreground">Burned</p><p className="mt-1 text-sm font-bold">{workout.caloriesBurned} kcal</p></div></div>{workout.notes ? <p className="mt-4 rounded-xl bg-muted/60 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">“{workout.notes}”</p> : null}</article>;
}

function PageIntro({ eyebrow, title, detail, actionLabel, onAction, testId }: { eyebrow: string; title: string; detail: string; actionLabel: string; onAction: () => void; testId: string }) {
  return <div className="flex flex-col justify-between gap-6 border-b border-border pb-8 sm:flex-row sm:items-end"><div><p className="font-mono-ui text-[10px] uppercase tracking-[.22em] text-primary" data-testid={`text-${testId}-eyebrow`}>{eyebrow}</p><h1 className="mt-2 max-w-xl font-display text-4xl leading-[.95] tracking-[-.055em] sm:text-5xl" data-testid={`text-${testId}-heading`}>{title}</h1><p className="mt-4 max-w-lg text-sm leading-relaxed text-muted-foreground" data-testid={`text-${testId}-detail`}>{detail}</p></div><button type="button" onClick={onAction} data-testid={`button-add-${testId}`} className="focus-ring inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground transition hover:brightness-105"><Plus size={16} /> {actionLabel}</button></div>;
}

function SettingsPage({ data }: { data: Data }) {
  const [form, setForm] = useState<Goals>(data.goals);
  const [saved, setSaved] = useState(false);
  const set = (key: keyof Goals, value: string) => { setSaved(false); setForm((current) => ({ ...current, [key]: Number(value) || 0 })); };
  const submit = (event: FormEvent) => { event.preventDefault(); data.saveGoals(form); setSaved(true); window.setTimeout(() => setSaved(false), 2400); };
  return <div className="mx-auto max-w-[960px] px-5 py-8 sm:px-8 lg:px-12 lg:py-12">
    <div className="max-w-xl"><p className="font-mono-ui text-[10px] uppercase tracking-[.22em] text-primary" data-testid="text-settings-eyebrow">Personal settings</p><h1 className="mt-2 font-display text-4xl leading-[.95] tracking-[-.055em] sm:text-5xl" data-testid="text-settings-heading">Targets that fit<br />your real life.</h1><p className="mt-4 text-sm leading-relaxed text-muted-foreground">Set the daily numbers you want to use as a helpful reference. They are not a score.</p></div>
    <div className="mt-9 grid gap-5 lg:grid-cols-[1fr_280px]">
      <form onSubmit={submit} className="rounded-[24px] border border-border bg-card p-5 shadow-sm sm:p-7"><div className="flex items-start justify-between border-b border-border pb-5"><div><h2 className="font-display text-2xl">Daily nutrition targets</h2><p className="mt-1 text-xs text-muted-foreground">Adjust these whenever your needs change.</p></div><Target size={21} className="text-primary" /></div><div className="mt-6 space-y-5"><TargetInput label="Calories" unit="kcal" value={form.calories} onChange={(value) => set('calories', value)} testId="calories" /><TargetInput label="Protein" unit="g" value={form.protein} onChange={(value) => set('protein', value)} testId="protein" /><TargetInput label="Carbohydrates" unit="g" value={form.carbs} onChange={(value) => set('carbs', value)} testId="carbs" /><TargetInput label="Fat" unit="g" value={form.fat} onChange={(value) => set('fat', value)} testId="fat" /></div><div className="mt-7 flex flex-col items-stretch gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-muted-foreground">Saved privately in your browser.</p><button type="submit" data-testid="button-save-goals" className="focus-ring inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground transition hover:brightness-105">{saved ? <><Sparkles size={15} /> Saved</> : 'Save targets'}</button></div></form>
      <div className="space-y-5"><div className="rounded-[24px] bg-accent/55 p-5"><div className="flex items-center gap-2 text-primary"><CircleAlert size={16} /><span className="font-mono-ui text-[10px] uppercase tracking-[.18em]">A gentle note</span></div><p className="mt-4 font-display text-2xl leading-tight">Numbers are a map, not a grade.</p><p className="mt-3 text-xs leading-relaxed text-muted-foreground">Targets can give your choices a little shape. Listen to your body first.</p></div><div className="rounded-[24px] border border-border bg-card p-5"><p className="font-mono-ui text-[10px] uppercase tracking-[.18em] text-muted-foreground">Your current split</p><div className="mt-5 space-y-3"><TargetSummary label="Calories" value={form.calories} unit="kcal" /><TargetSummary label="Protein" value={form.protein} unit="g" /><TargetSummary label="Carbs" value={form.carbs} unit="g" /><TargetSummary label="Fat" value={form.fat} unit="g" /></div></div></div>
    </div>
  </div>;
}

function TargetInput({ label, unit, value, onChange, testId }: { label: string; unit: string; value: number; onChange: (value: string) => void; testId: string }) {
  return <label className="flex items-center justify-between gap-4"><span><span className="block text-sm font-bold">{label}</span><span className="mt-0.5 block text-xs text-muted-foreground">Daily goal</span></span><span className="flex items-center gap-2"><input type="number" min="0" value={value} onChange={(event) => onChange(event.target.value)} className="focus-ring h-11 w-28 rounded-xl border border-input bg-background px-3 text-right font-mono-ui text-sm outline-none focus:border-primary" data-testid={`input-goal-${testId}`} /><span className="w-9 text-xs font-bold text-muted-foreground">{unit}</span></span></label>;
}

function TargetSummary({ label, value, unit }: { label: string; value: number; unit: string }) {
  return <div className="flex items-center justify-between text-xs"><span className="font-semibold text-muted-foreground">{label}</span><span className="font-mono-ui font-medium">{value} {unit}</span></div>;
}

export default App;