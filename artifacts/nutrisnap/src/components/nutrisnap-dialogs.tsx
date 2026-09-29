import { Camera, Check, ImagePlus, X, Bookmark, BookmarkCheck, Sparkles, Search, Loader2, TriangleAlert } from 'lucide-react';
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import type { Meal, MealType, SavedMeal, Workout } from '@/lib/nutrisnap-storage';
import { todayKey, workoutTargetAreas, type WorkoutTarget } from '@/lib/nutrisnap-storage';
import { MuscleMap } from '@/components/muscle-map';
import { useAuth } from '@/lib/auth-context';
import { searchFoods, analyzeMealPhoto, generateNutrition, getMe, type FoodSearchResult, type MealAnalysis } from '@/lib/api';

type ModalProps = { title: string; eyebrow: string; onClose: () => void; children: ReactNode };

function Modal({ title, eyebrow, onClose, children }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overlay = overlayRef.current;
    if (!overlay) return;

    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    window.scrollTo({ top: 0 });
    document.body.style.overflow = 'hidden';

    const focusable = overlay.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') { onCloseRef.current(); return; }
      if (e.key !== 'Tab') return;
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last?.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    }

    overlay.addEventListener('keydown', handleKeyDown);
    first?.focus();

    return () => {
      overlay.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
      previous?.focus();
    };
  }, []);

  const handleOverlayClick = (e: React.MouseEvent) => { if (e.target === e.currentTarget) onClose(); };

  return (
    <>
    {/* MOBILE: full-screen sheet with card scrolling */}
    <div className="fixed inset-0 z-50 bg-background sm:hidden" role="dialog" aria-modal="true" onClick={handleOverlayClick}>
      <div className="mx-auto flex h-full w-full max-w-[620px] flex-col justify-end p-3">
        <div className="max-h-[88vh] overflow-y-auto rounded-[16px] bg-card p-4 shadow-2xl">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <p className="font-mono-ui text-[10px] uppercase tracking-[.2em] text-primary">{eyebrow}</p>
              <h2 className="mt-1 font-display text-2xl tracking-[-.04em] text-card-foreground">{title}</h2>
            </div>
            <button type="button" onClick={onClose} data-testid="button-close-dialog" className="focus-ring grid size-9 place-items-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"><X size={18} /></button>
          </div>
          {children}
        </div>
      </div>
    </div>
    {/* DESKTOP: centered card with scrollable overlay */}
    <div ref={overlayRef} className="fixed inset-0 z-50 hidden overflow-y-auto bg-foreground/35 backdrop-blur-[3px] sm:block" role="dialog" aria-modal="true" onClick={handleOverlayClick}>
      <div className="mx-auto w-full max-w-[620px] p-4 pt-16">
        <div className="max-h-[calc(100vh-6rem)] overflow-y-auto rounded-[26px] bg-card p-7 shadow-2xl">
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
    </div>
    </>
  );
}

function Field({ label, children, wide = false }: { label: string; children: ReactNode; wide?: boolean }) {
  return <label className={`block ${wide ? 'sm:col-span-2' : ''}`}><span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[.12em] text-muted-foreground">{label}</span>{children}</label>;
}

const inputClass = 'focus-ring h-11 w-full rounded-xl border border-input bg-background px-3.5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/10';

const activityTargetMap: Record<string, string[]> = {
  Strength: ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'quads', 'hamstrings', 'glutes'],
  Run: ['quads', 'hamstrings', 'calves', 'glutes'],
  Walk: ['quads', 'calves', 'glutes'],
  Cycle: ['quads', 'hamstrings', 'calves', 'glutes'],
  Yoga: ['core'],
  Swim: ['back', 'shoulders', 'core', 'quads'],
  HIIT: ['quads', 'hamstrings', 'core', 'glutes'],
  Pilates: ['core'],
  Rowing: ['back', 'biceps', 'quads', 'core'],
  'Jump Rope': ['calves', 'quads', 'shoulders'],
  Stretching: [],
  Dance: ['quads', 'glutes', 'core'],
  Other: ['core'],
};

const activityMET: Record<string, number> = {
  Strength: 6.0,
  Run: 9.8,
  Walk: 3.8,
  Cycle: 7.5,
  Yoga: 3.0,
  Swim: 8.0,
  HIIT: 8.0,
  Pilates: 3.8,
  Rowing: 7.0,
  'Jump Rope': 12.3,
  Stretching: 2.3,
  Dance: 5.5,
  Other: 5.0,
};

function calcCaloriesBurned(activity: string, durationMin: number, weightKg: number): number {
  const met = activityMET[activity] ?? 5.0;
  return Math.round(met * weightKg * (durationMin / 60));
}

type MealFormProps = {
  meal?: Meal;
  onClose: () => void;
  onSave: (meal: Omit<Meal, 'id'>) => void;
  savedMeals?: SavedMeal[];
  onSaveFavorite?: (meal: Omit<SavedMeal, 'id'>) => void;
  onDeleteSaved?: (id: string) => void;
};

export function MealDialog({ meal, onClose, onSave, savedMeals = [], onSaveFavorite, onDeleteSaved }: MealFormProps) {
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
  const [lookupSource, setLookupSource] = useState<{ label: string; basis: string | null; kind?: 'search' | 'photo' | 'generate' } | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [analysisError, setAnalysisError] = useState('');
  const [analysis, setAnalysis] = useState<MealAnalysis | null>(null);
  // null while the existing consent receipt is still being read from the server.
  const [consented, setConsented] = useState<boolean | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FoodSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [selectedFood, setSelectedFood] = useState<FoodSearchResult | null>(null);
  const [grams, setGrams] = useState(100);
  // Selecting a result writes its description into the box, which would otherwise
  // fire a fresh search for that description and re-open the list underneath it.
  const [searchPinned, setSearchPinned] = useState(false);

  useEffect(() => {
    let active = true;
    getMe()
      .then((data) => {
        if (active) setConsented(Boolean(data.photoAnalysisConsentAt));
      })
      .catch(() => {
        // If the receipt cannot be read, fall back to showing the disclosure again,
        // which is the safe direction to fail in.
        if (active) setConsented(false);
      });
    return () => {
      active = false;
    };
  }, []);

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
    setLookupSource(null);
    setAnalysis(null);
    setAnalysisError('');
    setSelectedFood(null);
    setGrams(100);
    setSearchQuery('');
    setSearchResults([]);
    setSearchError('');
    setSearchPinned(false);
  }, [meal]);

  useEffect(() => {
    if (searchPinned) {
      setSearchResults([]);
      return;
    }
    const query = searchQuery.trim();
    if (query.length < 2) {
      setSearchResults([]);
      setSearchError('');
      return;
    }

    let active = true;
    setSearching(true);
    const timer = setTimeout(() => {
      searchFoods(query)
        .then((data) => {
          if (!active) return;
          setSearchResults(data.foods);
          setSearchError('');
        })
        .catch((error: unknown) => {
          if (!active) return;
          setSearchResults([]);
          setSearchError(error instanceof Error ? error.message : 'Could not search foods.');
        })
        .finally(() => {
          if (active) setSearching(false);
        });
    }, 300);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [searchQuery, searchPinned]);

  const set = (key: keyof typeof form, value: string | number | MealType | undefined) => setForm((current) => ({ ...current, [key]: value }));
  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 5_000_000) {
      setError('Choose an image smaller than 5 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxW = 600;
        const ratio = Math.min(maxW / img.width, 1);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        set('imageDataUrl', canvas.toDataURL('image/jpeg', 0.75));
        // A new photo invalidates any previous read of it.
        setAnalysis(null);
        setAnalysisError('');
        setLookupSource(null);
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  };
  const handleGenerate = async () => {
    if (!form.name.trim()) {
      setError('Give this meal a name first.');
      return;
    }
    setGenerating(true);
    setError('');
    setAnalysisError('');
    setSelectedFood(null);
    setGrams(100);
    setSearchQuery('');
    setSearchResults([]);
    setSearchError('');
    setSearchPinned(false);
    try {
      const result = await generateNutrition(form.name.trim(), form.imageDataUrl);
      setAnalysis(result);
      // Prefill only. Everything stays editable and nothing is saved until submit.
      setForm((current) => ({
        ...current,
        name: current.name.trim() || result.dishName,
        calories: result.totals.calories,
        protein: Math.round(result.totals.protein),
        carbs: Math.round(result.totals.carbs),
        fat: Math.round(result.totals.fat),
      }));
      setLookupSource({ label: result.dishName, basis: 'generated from description', kind: 'generate' });
    } catch (error) {
      setAnalysisError(error instanceof Error ? error.message : 'Could not generate nutrition facts.');
    } finally {
      setGenerating(false);
    }
  };

  const handleAnalyze = async () => {
    if (!form.imageDataUrl) {
      setAnalysisError('Add a photo first.');
      return;
    }
    setAnalyzing(true);
    setAnalysisError('');
    setGenerating(false);
    setSelectedFood(null);
    setGrams(100);
    setSearchQuery('');
    setSearchResults([]);
    setSearchError('');
    setSearchPinned(false);
    try {
      const result = await analyzeMealPhoto(form.imageDataUrl);
      setAnalysis(result);
      // Consent is recorded server-side on the first successful call, so the
      // disclosure stops being shown from here on.
      setConsented(true);
      // Prefill only. Everything stays editable and nothing is saved until submit.
      setForm((current) => ({
        ...current,
        name: current.name.trim() || result.dishName,
        calories: result.totals.calories,
        protein: Math.round(result.totals.protein),
        carbs: Math.round(result.totals.carbs),
        fat: Math.round(result.totals.fat),
      }));
      setLookupSource({ label: result.dishName, basis: 'estimated from photo', kind: 'photo' });
    } catch (error) {
      setAnalysisError(error instanceof Error ? error.message : 'Could not analyze that photo.');
    } finally {
      setAnalyzing(false);
    }
  };

  const selectFood = (food: FoodSearchResult) => {
    setSelectedFood(food);
    setGrams(100);
    setSearchQuery(food.description);
    setSearchPinned(true);
    setSearchResults([]);
    setAnalysis(null);
    setAnalysisError('');
    const per100 = food.per100g;
    // Prefill only, the same contract as the search and photo paths.
    setForm((current) => ({
      ...current,
      name: current.name.trim() || food.description,
      calories: Math.round(per100.calories ?? 0),
      protein: Math.round(per100.protein ?? 0),
      carbs: Math.round(per100.carbs ?? 0),
      fat: Math.round(per100.fat ?? 0),
    }));
    setLookupSource({ label: food.description, basis: 'USDA · per 100 g', kind: 'search' });
  };

  const applyGrams = (raw: string) => {
    if (!selectedFood) return;
    const value = Number(raw);
    if (!Number.isFinite(value) || value <= 0) return;
    const portion = Math.min(value, 3000);
    setGrams(portion);
    const factor = portion / 100;
    const per100 = selectedFood.per100g;
    setForm((current) => ({
      ...current,
      calories: Math.round((per100.calories ?? 0) * factor),
      protein: Math.round((per100.protein ?? 0) * factor),
      carbs: Math.round((per100.carbs ?? 0) * factor),
      fat: Math.round((per100.fat ?? 0) * factor),
    }));
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
    <>
    <Modal title={meal ? 'Edit meal' : 'Add a meal'} eyebrow="Manual nutrition log" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3 sm:space-y-5">
        {savedMeals.length > 0 && !meal && (
          <div className="rounded-2xl border border-border bg-accent/30 p-3 sm:p-4">
            <div className="mb-2 flex items-center gap-2">
              <Sparkles size={14} className="text-primary" />
              <p className="text-xs font-bold">Quick add from favorites</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {savedMeals.map((saved) => (
                <button
                  key={saved.id}
                  type="button"
                  onClick={() => setForm({ name: saved.name, mealType: saved.mealType as MealType, date: form.date, time: form.time, calories: saved.calories, protein: saved.protein, carbs: saved.carbs, fat: saved.fat, imageDataUrl: undefined })}
                  data-testid={`button-quick-add-${saved.id}`}
                  className="focus-ring inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 text-[11px] font-bold transition hover:border-primary/50 hover:bg-card"
                >
                  {saved.name} <span className="text-muted-foreground">{saved.calories}kcal</span>
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
          <Field label="Meal name" wide>
            <input required autoFocus value={form.name} onChange={(event) => set('name', event.target.value)} maxLength={100} placeholder="e.g. 2 eggs, toast, and coffee" className={inputClass} data-testid="input-meal-name" />
          </Field>
          <Field label="Meal type"><select value={form.mealType} onChange={(event) => set('mealType', event.target.value as MealType)} className={inputClass} data-testid="select-meal-type"><option>Breakfast</option><option>Lunch</option><option>Dinner</option><option>Snack</option></select></Field>
          <Field label="Date"><input type="date" value={form.date} onChange={(event) => set('date', event.target.value)} className={inputClass} data-testid="input-meal-date" /></Field>
          <Field label="Time"><input type="time" value={form.time} onChange={(event) => set('time', event.target.value)} className={inputClass} data-testid="input-meal-time" /></Field>
        </div>

        <div className="rounded-2xl border border-border bg-background/70 p-3 sm:p-4">
          <div className="mb-2 flex items-center justify-between sm:mb-3">
            <div><p className="text-sm font-bold">Nutrition facts</p><p className="text-[11px] text-muted-foreground sm:text-xs">Auto-fill or enter manually.</p></div>
            <span className="rounded-full bg-accent/35 px-2 py-0.5 font-mono-ui text-[10px] font-medium text-foreground" data-testid="nutrition-source-badge">{lookupSource?.kind === 'photo' ? 'Estimated' : lookupSource?.kind === 'generate' ? 'Generated' : lookupSource?.kind === 'search' ? 'Matched' : 'Manual'}</span>
          </div>
          <div className="mb-2 space-y-2 sm:mb-3">
            <button type="button" onClick={handleGenerate} disabled={generating || !form.name.trim()} className="focus-ring w-full h-9 rounded-xl bg-primary px-4 text-xs font-bold text-primary-foreground transition hover:brightness-105 disabled:opacity-40 disabled:cursor-not-allowed sm:h-10 sm:text-sm" data-testid="button-generate-nutrition">
              <span className="inline-flex items-center gap-2"><Sparkles size={15} /> {generating ? 'Generating...' : 'Generate nutrition facts'}</span>
            </button>
            <div className="relative">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  setSearchPinned(false);
                }}
                placeholder="Or search a food name"
                className={`${inputClass} pl-8`}
                data-testid="input-food-search"
              />
            </div>
            {searching ? <p className="text-[11px] text-muted-foreground" data-testid="status-food-searching">Searching...</p> : null}
            {searchError ? <p className="text-xs text-destructive" role="status" data-testid="status-food-search-error">{searchError}</p> : null}
            {!searching && !searchError && searchQuery.trim().length >= 2 && searchResults.length === 0 && !searchPinned ? (
              <p className="text-[11px] text-muted-foreground" data-testid="status-food-search-empty">No foods matched.</p>
            ) : null}
            {searchResults.length > 0 ? (
              <ul className="max-h-56 space-y-1 overflow-y-auto rounded-xl border border-border bg-card p-1" data-testid="list-food-search-results">
                {searchResults.map((food) => (
                  <li key={food.fdcId}>
                    <button
                      type="button"
                      onClick={() => selectFood(food)}
                      data-testid={`button-food-result-${food.fdcId}`}
                      className="focus-ring flex w-full items-baseline justify-between gap-2 rounded-lg px-2 py-1.5 text-left transition hover:bg-accent"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-semibold">{food.description}</span>
                        <span className="block truncate text-[10px] text-muted-foreground">{food.dataType}{food.brand ? ` · ${food.brand}` : ''}</span>
                      </span>
                      <span className="shrink-0 font-mono-ui text-[11px] text-muted-foreground">{Math.round(food.per100g.calories ?? 0)} kcal</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          {lookupSource ? (
            <p className="mb-2 text-[11px] text-muted-foreground sm:text-xs" role="status" data-testid="status-nutrition-source">
              Filled from <span className="font-semibold text-foreground">{lookupSource.label}</span>
              {lookupSource.basis ? <span> · {lookupSource.basis}</span> : null} · check before saving
            </p>
          ) : null}
          {selectedFood ? (
            <div className="mb-2 flex items-end gap-2 sm:mb-3" data-testid="food-portion-row">
              <Field label="Portion · g">
                <input type="number" min="1" max="3000" value={grams} onChange={(event) => applyGrams(event.target.value)} className={inputClass} data-testid="input-meal-grams" />
              </Field>
              <p className="flex-1 pb-2 text-[11px] leading-relaxed text-muted-foreground">
                Scaled from {Math.round(selectedFood.per100g.calories ?? 0)} kcal per 100 g. Check before saving.
              </p>
            </div>
          ) : null}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
            <Field label="Calories"><input type="number" min="0" max="99999" value={form.calories} onChange={(event) => set('calories', Number(event.target.value))} className={inputClass} data-testid="input-meal-calories" /></Field>
            <Field label="Protein · g"><input type="number" min="0" max="9999" value={form.protein} onChange={(event) => set('protein', Number(event.target.value))} className={inputClass} data-testid="input-meal-protein" /></Field>
            <Field label="Carbs · g"><input type="number" min="0" max="9999" value={form.carbs} onChange={(event) => set('carbs', Number(event.target.value))} className={inputClass} data-testid="input-meal-carbs" /></Field>
            <Field label="Fat · g"><input type="number" min="0" max="9999" value={form.fat} onChange={(event) => set('fat', Number(event.target.value))} className={inputClass} data-testid="input-meal-fat" /></Field>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-[1fr_1.2fr] sm:gap-4">
          <label className="group relative flex min-h-[100px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border border-dashed border-primary/35 bg-secondary/45 p-3 text-center transition hover:border-primary hover:bg-secondary sm:min-h-[128px] sm:p-4">
            <input type="file" accept="image/*" capture="environment" onChange={handleFile} className="sr-only" data-testid="input-meal-photo" />
            {form.imageDataUrl ? <img src={form.imageDataUrl} alt="Meal preview" className="absolute inset-0 h-full w-full object-cover opacity-70" data-testid="img-meal-preview" /> : null}
            <span className="relative grid size-8 place-items-center rounded-full bg-card text-primary shadow-sm sm:size-9"><ImagePlus size={16} /></span>
            <span className="relative mt-1.5 text-[11px] font-bold sm:mt-2 sm:text-xs">{form.imageDataUrl ? 'Replace photo' : 'Add a meal photo'}</span>
            <span className="relative mt-0.5 text-[10px] text-muted-foreground">Optional</span>
          </label>
          <div className="rounded-2xl border border-border bg-muted/55 p-3 sm:p-4">
            {consented === false ? (
              <>
                <div className="flex items-start gap-2.5">
                  <Camera size={16} className="mt-0.5 shrink-0 text-primary" />
                  <div className="min-w-0">
                    <p className="text-sm font-bold">Estimate from photo</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      Analyzing sends this photo to Google Gemini, which estimates each component and its
                      portion size. On the free tier, submitted images may be used to improve Google products.
                    </p>
                  </div>
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                  Nothing is saved until you press Add, and every number stays editable.
                </p>
              </>
            ) : (
              <div className="flex items-start gap-2.5">
                <Camera size={16} className="mt-0.5 shrink-0 text-primary" />
                <div>
                  <p className="text-sm font-bold">Estimate from photo</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    You have already agreed to photo analysis. Estimates are a starting point, not a measurement.
                  </p>
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={analyzing || !form.imageDataUrl}
              className="focus-ring mt-3 inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-xs font-bold text-primary-foreground transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40 sm:h-10 sm:text-sm"
              data-testid="button-analyze-photo"
            >
              {analyzing ? (
                <><Loader2 size={15} className="animate-spin" /> Analyzing photo...</>
              ) : consented === false ? (
                'Agree and estimate nutrition'
              ) : (
                'Estimate nutrition from photo'
              )}
            </button>
            {!form.imageDataUrl ? (
              <p className="mt-2 text-center text-[11px] text-muted-foreground">Add a photo to enable this.</p>
            ) : null}
            {analysisError ? (
              <p className="mt-2 text-xs text-destructive" role="status" data-testid="status-analyze-error">{analysisError}</p>
            ) : null}
            {analysis ? (
              <div className="mt-3 rounded-xl border border-border bg-card p-2.5" data-testid="analysis-breakdown">
                <div className="mb-1.5 flex items-center justify-between">
                  <p className="text-[11px] font-bold">What it saw</p>
                  {analysis.overallConfidence !== 'high' ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400">
                      <TriangleAlert size={10} /> {analysis.overallConfidence} confidence
                    </span>
                  ) : null}
                </div>
                <ul className="space-y-0.5">
                  {analysis.items.map((item) => (
                    <li key={item.name} className="flex items-baseline justify-between gap-2 text-[11px]">
                      <span className="truncate">{item.name} <span className="text-muted-foreground">~{Math.round(item.grams)}g</span></span>
                      <span className="shrink-0 font-mono-ui text-muted-foreground">{Math.round(item.calories)} kcal</span>
                    </li>
                  ))}
                </ul>
                {analysis.notes ? <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">{analysis.notes}</p> : null}
                <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">Portion sizes are estimates. Correct anything that looks off before saving.</p>
              </div>
            ) : null}
          </div>
        </div>
        {error ? <p className="text-sm font-semibold text-destructive" role="alert" data-testid="status-meal-form-error">{error}</p> : null}
        <div className="sticky bottom-0 -mx-7 flex flex-col-reverse gap-2 bg-card px-7 pb-7 pt-3 sm:flex-row sm:justify-between">
          <div className="flex gap-2">
            {onSaveFavorite && form.name.trim() && form.calories > 0 && (
              <button type="button" onClick={() => onSaveFavorite({ name: form.name.trim(), mealType: form.mealType, calories: Number(form.calories) || 0, protein: Number(form.protein) || 0, carbs: Number(form.carbs) || 0, fat: Number(form.fat) || 0 })} data-testid="button-save-favorite" className="focus-ring inline-flex h-11 items-center gap-2 rounded-xl border border-border bg-card px-4 text-xs font-bold text-muted-foreground transition hover:bg-muted hover:text-foreground">
                <Bookmark size={14} /> Save as favorite
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} data-testid="button-cancel-meal" className="focus-ring h-11 rounded-xl px-4 text-sm font-bold text-muted-foreground transition hover:bg-muted hover:text-foreground">Cancel</button>
            <button type="submit" data-testid="button-save-meal" className="focus-ring inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground transition hover:brightness-105"><Check size={16} /> {meal ? 'Save changes' : 'Save meal'}</button>
          </div>
        </div>
      </form>
    </Modal>
    </>
  );
}

type WorkoutFormProps = { workout?: Workout; onClose: () => void; onSave: (workout: Omit<Workout, 'id'>) => void };

export function WorkoutDialog({ workout, onClose, onSave }: WorkoutFormProps) {
  const { user } = useAuth();
  const weightKg = user?.weight ?? 70;
  const [form, setForm] = useState<Omit<Workout, 'id'>>({
    name: workout?.name ?? '',
    activity: workout?.activity ?? 'Strength',
    date: workout?.date ?? todayKey(),
    durationMinutes: workout?.durationMinutes ?? 30,
    caloriesBurned: workout?.caloriesBurned ?? calcCaloriesBurned(workout?.activity ?? 'Strength', workout?.durationMinutes ?? 30, user?.weight ?? 70),
    targetAreas: workout?.targetAreas ?? [],
    notes: workout?.notes ?? '',
  });
  const [error, setError] = useState('');
  const set = (key: keyof typeof form, value: string | number | string[]) => setForm((current) => ({ ...current, [key]: value }));
  const toggleTargetArea = (target: WorkoutTarget) => setForm((current) => ({
    ...current,
    targetAreas: current.targetAreas.includes(target)
      ? current.targetAreas.filter((area) => area !== target)
      : [...current.targetAreas, target],
  }));
  const handleActivityChange = (activity: string) => {
    setForm((current) => ({
      ...current,
      activity,
      targetAreas: activityTargetMap[activity] as WorkoutTarget[] ?? [],
      caloriesBurned: calcCaloriesBurned(activity, current.durationMinutes, weightKg),
    }));
  };
  const handleDurationChange = (duration: number) => {
    setForm((current) => ({
      ...current,
      durationMinutes: duration,
      caloriesBurned: calcCaloriesBurned(current.activity, duration, weightKg),
    }));
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) { setError('Give this workout a name first.'); return; }
    setError('');
    onSave({ ...form, name: form.name.trim(), durationMinutes: Number(form.durationMinutes) || 0, caloriesBurned: Number(form.caloriesBurned) || 0, notes: form.notes?.trim() });
  };
  return (
    <Modal title={workout ? 'Edit workout' : 'Add a workout'} eyebrow="Movement log" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Workout name" wide><input required autoFocus value={form.name} onChange={(event) => set('name', event.target.value)} maxLength={100} placeholder="e.g. Lunch break lift" className={inputClass} data-testid="input-workout-name" /></Field>
          <Field label="Activity"><select value={form.activity} onChange={(event) => handleActivityChange(event.target.value)} className={inputClass} data-testid="select-workout-activity"><option>Strength</option><option>Run</option><option>Walk</option><option>Cycle</option><option>Yoga</option><option>Swim</option><option>HIIT</option><option>Pilates</option><option>Rowing</option><option>Jump Rope</option><option>Stretching</option><option>Dance</option><option>Other</option></select></Field>
          <Field label="Date"><input type="date" value={form.date} onChange={(event) => set('date', event.target.value)} className={inputClass} data-testid="input-workout-date" /></Field>
          <Field label="Duration · min"><input type="number" min="0" max="9999" value={form.durationMinutes} onChange={(event) => handleDurationChange(Number(event.target.value))} className={inputClass} data-testid="input-workout-duration" /></Field>
          <Field label="Calories burned (auto)"><input type="number" min="0" max="99999" value={form.caloriesBurned} onChange={(event) => set('caloriesBurned', Number(event.target.value))} className={inputClass} data-testid="input-workout-calories" /></Field>
          <Field label="Notes"><textarea value={form.notes ?? ''} onChange={(event) => set('notes', event.target.value)} maxLength={500} placeholder="How did it feel?" rows={2} className={`${inputClass} h-auto py-2`} data-testid="input-workout-notes" /></Field>
        </div>
        <Field label="Target areas" wide>
          <div className="rounded-2xl border border-border bg-muted/35 p-3">
            <p className="mb-2 text-[11px] text-muted-foreground">Targets auto-fill based on activity.</p>
            <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 sm:gap-2">
              {workoutTargetAreas.map((target) => {
                const selected = form.targetAreas.includes(target.id);
                return (
                  <button
                    key={target.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggleTargetArea(target.id)}
                    data-testid={`button-toggle-target-${target.id}`}
                    className={`focus-ring rounded-lg border px-2 py-1.5 text-left text-[11px] font-bold transition ${selected ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground'}`}
                  >
                    {target.label}
                  </button>
                );
              })}
            </div>
          </div>
        </Field>
        {error ? <p className="text-sm font-semibold text-destructive" role="alert" data-testid="status-workout-form-error">{error}</p> : null}
        <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} data-testid="button-cancel-workout" className="focus-ring h-10 rounded-xl px-4 text-sm font-bold text-muted-foreground transition hover:bg-muted hover:text-foreground">Cancel</button>
          <button type="submit" data-testid="button-save-workout" className="focus-ring inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground transition hover:brightness-105"><Check size={16} /> {workout ? 'Save changes' : 'Save workout'}</button>
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
