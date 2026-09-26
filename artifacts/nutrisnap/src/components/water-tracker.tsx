import { Droplets, Minus, Plus } from 'lucide-react';
import type { WaterEntry } from '@/lib/nutrisnap-storage';

type WaterTrackerProps = {
  totalMl: number;
  goalMl: number;
  entries: WaterEntry[];
  onAdd: (amountMl: number) => void;
  onRemove: (id: string) => void;
};

const CUP_ML = 250;

export function WaterTracker({ totalMl, goalMl, entries, onAdd, onRemove }: WaterTrackerProps) {
  const cups = Math.ceil(goalMl / CUP_ML);
  const filledCups = Math.min(Math.floor(totalMl / CUP_ML), cups);
  const percentage = goalMl > 0 ? Math.min(100, Math.round((totalMl / goalMl) * 100)) : 0;
  const lastEntry = entries.length > 0 ? entries[entries.length - 1] : null;

  return (
    <section className="rounded-[20px] border border-border bg-card p-4 shadow-sm sm:rounded-[24px] sm:p-6" data-testid="section-water-tracker">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono-ui text-[10px] uppercase tracking-[.2em] text-muted-foreground">Hydration</p>
          <h2 className="mt-1 font-display text-xl tracking-[-.04em] sm:text-2xl">Stay hydrated</h2>
        </div>
        <div className="grid size-9 place-items-center rounded-2xl bg-[#3b82f6]/15 text-[#3b82f6] sm:size-10">
          <Droplets size={16} />
        </div>
      </div>

      <div className="mt-5 flex items-center gap-5">
        <div className="relative grid size-20 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(#3b82f6 ${percentage}%, hsl(var(--muted)) 0)` }}>
          <div className="grid size-[64px] place-items-center rounded-full bg-card text-center">
            <div>
              <p className="font-display text-xl">{totalMl}</p>
              <p className="font-mono-ui text-[8px] uppercase tracking-[.12em] text-muted-foreground">of {goalMl}ml</p>
            </div>
          </div>
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold">{percentage}% of daily goal</p>
          <p className="mt-1 text-xs text-muted-foreground">{filledCups} of {cups} cups logged</p>
          <div className="mt-3 flex gap-1.5">
            {Array.from({ length: Math.min(cups, 10) }).map((_, i) => (
              <div
                key={i}
                className={`size-3 rounded-full transition-colors ${i < filledCups ? 'bg-[#3b82f6]' : 'bg-muted'}`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 flex items-center gap-2">
        <button
          type="button"
          onClick={() => onAdd(CUP_ML)}
          data-testid="button-add-water"
          className="focus-ring inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-[#3b82f6] text-sm font-bold text-white transition hover:brightness-110"
        >
          <Plus size={16} /> Add cup ({CUP_ML}ml)
        </button>
        {lastEntry && (
          <button
            type="button"
            onClick={() => onRemove(lastEntry.id)}
            data-testid="button-remove-water"
            className="focus-ring inline-flex h-10 items-center justify-center gap-1 rounded-xl border border-border bg-card px-3 text-xs font-bold text-muted-foreground transition hover:bg-muted"
          >
            <Minus size={14} /> Undo
          </button>
        )}
      </div>
    </section>
  );
}
