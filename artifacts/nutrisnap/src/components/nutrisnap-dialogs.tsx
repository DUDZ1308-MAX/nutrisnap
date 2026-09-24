import { Camera, Check, ImagePlus, X } from 'lucide-react';
import { useEffect, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import type { Meal, MealType, Workout } from '@/lib/nutrisnap-storage';
import { todayKey } from '@/lib/nutrisnap-storage';

type ModalProps = { title: string; eyebrow: string; onClose: () => void; children: ReactNode };

function Modal({ title, eyebrow, onClose, children }: ModalProps) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/35 p-4 backdrop-blur-[3px]" role="dialog" aria-modal="true">
      <div className="max-h-[92dvh] w-full max-w-[620px] overflow-y-auto rounded-[26px] border border-border bg-card p-5 shadow-2xl sm:p-7">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className="font-mono-ui text-[10px] uppercase tracking-[.2em] text-primary">{eyebrow}</p>
            <h2 className="mt-1 font-display text-3xl tracking-[-.04em] text-card-foreground">{title}</h2>
          </div>
          <button type="button" onClick={onClose} data-testid="button-close-dialog" className="focus-ring grid size-9 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children, wide = false }: { label: string; children: ReactNode; wide?: boolean }) {
  return <label className={`block ${wide ? 'sm:col-span-2' : ''}`}><span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[.12em] text-muted-foreground">{label}</span>{children}</label>;
}

const inputClass = 'focus-ring h-11 w-full rounded-xl border border-input bg-background px-3.5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/10';

type MealFormProps = {
  meal?: Meal;
  onClose: () => void;
  onSave: (meal: Omit<Meal, 'id'>) => void;
};

export function MealDialog({ meal, onClose, onSave }: MealFormProps) {
  const [form, setForm] = useState<Omit<Meal, 'id'>>({
    name: meal?.name ?? '',
    mealType: meal?.mealType ?? 'Breakfast',
    date: meal?.date ?? todayKey(),
    time: meal?.time ?? new Date().toTimeString().slice(0, 5),
    calories: meal?.calories ?? 0,
    protein: meal?.protein ?? 0,
    carbs: meal?.carbs ?? 0,
    fat: meal?.fat ?? 0,
    imageDataUrl: meal?.imageDataUrl,
  });
  const [error, setError] = useState('');

  useEffect(() => {
    setForm({
      name: meal?.name ?? '',
      mealType: meal?.mealType ?? 'Breakfast',
      date: meal?.date ?? todayKey(),
      time: meal?.time ?? new Date().toTimeString().slice(0, 5),
      calories: meal?.calories ?? 0,
      protein: meal?.protein ?? 0,
      carbs: meal?.carbs ?? 0,
      fat: meal?.fat ?? 0,
      imageDataUrl: meal?.imageDataUrl,
    });
  }, [meal]);

  const set = (key: keyof typeof form, value: string | number | MealType | undefined) => setForm((current) => ({ ...current, [key]: value }));
  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 2_500_000) {
      setError('Choose an image smaller than 2.5 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => set('imageDataUrl', String(reader.result));
    reader.readAsDataURL(file);
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) {
      setError('Give this meal a name first.');
      return;
    }
    setError('');
    onSave({ ...form, name: form.name.trim(), calories: Number(form.calories) || 0, protein: Number(form.protein) || 0, carbs: Number(form.carbs) || 0, fat: Number(form.fat) || 0 });
  };

  return (
    <Modal title={meal ? 'Edit meal' : 'Add a meal'} eyebrow="Manual nutrition log" onClose={onClose}>
      <form onSubmit={submit} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Meal name" wide><input required autoFocus value={form.name} onChange={(event) => set('name', event.target.value)} placeholder="e.g. Lemon ricotta toast" className={inputClass} data-testid="input-meal-name" /></Field>
          <Field label="Meal type"><select value={form.mealType} onChange={(event) => set('mealType', event.target.value as MealType)} className={inputClass} data-testid="select-meal-type"><option>Breakfast</option><option>Lunch</option><option>Dinner</option><option>Snack</option></select></Field>
          <Field label="Date"><input type="date" value={form.date} onChange={(event) => set('date', event.target.value)} className={inputClass} data-testid="input-meal-date" /></Field>
          <Field label="Time"><input type="time" value={form.time} onChange={(event) => set('time', event.target.value)} className={inputClass} data-testid="input-meal-time" /></Field>
        </div>

        <div className="rounded-2xl border border-border bg-background/70 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div><p className="text-sm font-bold">Nutrition facts</p><p className="text-xs text-muted-foreground">Enter the values from your label or best knowledge.</p></div>
            <span className="rounded-full bg-accent/35 px-2.5 py-1 font-mono-ui text-[10px] font-medium text-foreground">Manual entry</span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Field label="Calories"><input type="number" min="0" value={form.calories} onChange={(event) => set('calories', Number(event.target.value))} className={inputClass} data-testid="input-meal-calories" /></Field>
            <Field label="Protein · g"><input type="number" min="0" value={form.protein} onChange={(event) => set('protein', Number(event.target.value))} className={inputClass} data-testid="input-meal-protein" /></Field>
            <Field label="Carbs · g"><input type="number" min="0" value={form.carbs} onChange={(event) => set('carbs', Number(event.target.value))} className={inputClass} data-testid="input-meal-carbs" /></Field>
            <Field label="Fat · g"><input type="number" min="0" value={form.fat} onChange={(event) => set('fat', Number(event.target.value))} className={inputClass} data-testid="input-meal-fat" /></Field>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-[1fr_1.2fr]">
          <label className="group relative flex min-h-[128px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-primary/35 bg-secondary/45 p-4 text-center transition hover:border-primary hover:bg-secondary">
            <input type="file" accept="image/*" onChange={handleFile} className="sr-only" data-testid="input-meal-photo" />
            {form.imageDataUrl ? <img src={form.imageDataUrl} alt="Meal preview" className="absolute inset-0 h-full w-full object-cover opacity-70" data-testid="img-meal-preview" /> : null}
            <span className="relative grid size-9 place-items-center rounded-full bg-card text-primary shadow-sm"><ImagePlus size={18} /></span>
            <span className="relative mt-2 text-xs font-bold">{form.imageDataUrl ? 'Replace photo' : 'Add a meal photo'}</span>
            <span className="relative mt-1 text-[10px] text-muted-foreground">Optional · stored on this device</span>
          </label>
          <div className="rounded-2xl border border-border bg-muted/55 p-4">
            <div className="flex items-start gap-2.5"><Camera size={16} className="mt-0.5 shrink-0 text-primary" /><div><p className="text-sm font-bold">Photo analysis unavailable</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">NutriSnap does not identify food or estimate nutrition from photos. Add the facts manually above.</p></div></div>
          </div>
        </div>
        {error ? <p className="text-sm font-semibold text-destructive" role="alert" data-testid="status-meal-form-error">{error}</p> : null}
        <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} data-testid="button-cancel-meal" className="focus-ring h-11 rounded-xl px-4 text-sm font-bold text-muted-foreground transition hover:bg-muted hover:text-foreground">Cancel</button>
          <button type="submit" data-testid="button-save-meal" className="focus-ring inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground transition hover:brightness-105"><Check size={16} /> {meal ? 'Save changes' : 'Save meal'}</button>
        </div>
      </form>
    </Modal>
  );
}

type WorkoutFormProps = { workout?: Workout; onClose: () => void; onSave: (workout: Omit<Workout, 'id'>) => void };

export function WorkoutDialog({ workout, onClose, onSave }: WorkoutFormProps) {
  const [form, setForm] = useState<Omit<Workout, 'id'>>({
    name: workout?.name ?? '',
    activity: workout?.activity ?? 'Strength',
    date: workout?.date ?? todayKey(),
    durationMinutes: workout?.durationMinutes ?? 30,
    caloriesBurned: workout?.caloriesBurned ?? 0,
    notes: workout?.notes ?? '',
  });
  const [error, setError] = useState('');
  const set = (key: keyof typeof form, value: string | number) => setForm((current) => ({ ...current, [key]: value }));
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) { setError('Give this workout a name first.'); return; }
    setError('');
    onSave({ ...form, name: form.name.trim(), durationMinutes: Number(form.durationMinutes) || 0, caloriesBurned: Number(form.caloriesBurned) || 0, notes: form.notes?.trim() });
  };
  return (
    <Modal title={workout ? 'Edit workout' : 'Add a workout'} eyebrow="Movement log" onClose={onClose}>
      <form onSubmit={submit} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Workout name" wide><input required autoFocus value={form.name} onChange={(event) => set('name', event.target.value)} placeholder="e.g. Lunch break lift" className={inputClass} data-testid="input-workout-name" /></Field>
          <Field label="Activity"><select value={form.activity} onChange={(event) => set('activity', event.target.value)} className={inputClass} data-testid="select-workout-activity"><option>Strength</option><option>Run</option><option>Walk</option><option>Cycle</option><option>Yoga</option><option>Swim</option><option>Other</option></select></Field>
          <Field label="Date"><input type="date" value={form.date} onChange={(event) => set('date', event.target.value)} className={inputClass} data-testid="input-workout-date" /></Field>
          <Field label="Duration · min"><input type="number" min="0" value={form.durationMinutes} onChange={(event) => set('durationMinutes', Number(event.target.value))} className={inputClass} data-testid="input-workout-duration" /></Field>
          <Field label="Calories burned"><input type="number" min="0" value={form.caloriesBurned} onChange={(event) => set('caloriesBurned', Number(event.target.value))} className={inputClass} data-testid="input-workout-calories" /></Field>
          <Field label="Notes" wide><textarea value={form.notes} onChange={(event) => set('notes', event.target.value)} placeholder="How did it feel?" rows={3} className={`${inputClass} h-auto py-3`} data-testid="input-workout-notes" /></Field>
        </div>
        {error ? <p className="text-sm font-semibold text-destructive" role="alert" data-testid="status-workout-form-error">{error}</p> : null}
        <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} data-testid="button-cancel-workout" className="focus-ring h-11 rounded-xl px-4 text-sm font-bold text-muted-foreground transition hover:bg-muted hover:text-foreground">Cancel</button>
          <button type="submit" data-testid="button-save-workout" className="focus-ring inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground transition hover:brightness-105"><Check size={16} /> {workout ? 'Save changes' : 'Save workout'}</button>
        </div>
      </form>
    </Modal>
  );
}

export function ConfirmDialog({ title, detail, onClose, onConfirm, testId }: { title: string; detail: string; onClose: () => void; onConfirm: () => void; testId: string }) {
  return (
    <Modal title={title} eyebrow="One last check" onClose={onClose}>
      <p className="max-w-md text-sm leading-relaxed text-muted-foreground">{detail}</p>
      <div className="mt-7 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={onClose} data-testid={`button-cancel-${testId}`} className="focus-ring h-11 rounded-xl px-4 text-sm font-bold text-muted-foreground transition hover:bg-muted hover:text-foreground">Keep it</button>
        <button type="button" onClick={onConfirm} data-testid={`button-confirm-${testId}`} className="focus-ring h-11 rounded-xl bg-destructive px-5 text-sm font-bold text-destructive-foreground transition hover:brightness-105">Delete</button>
      </div>
    </Modal>
  );
}
