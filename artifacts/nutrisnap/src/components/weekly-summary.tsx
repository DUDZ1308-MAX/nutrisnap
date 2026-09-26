import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { Calendar, Flame, Droplets, Activity } from 'lucide-react';
import * as api from '@/lib/api';

type WeekDay = {
  date: string;
  label: string;
  calories: number;
  protein: number;
  workouts: number;
  durationMinutes: number;
  caloriesBurned: number;
  waterMl: number;
};

type WeekSummary = {
  days: WeekDay[];
  totals: { calories: number; protein: number; workouts: number; durationMinutes: number; caloriesBurned: number; waterMl: number };
  averages: { calories: number; protein: number; workouts: number; waterMl: number };
};

type WeeklySummaryProps = {
  onClose: () => void;
};

export function WeeklySummary({ onClose }: WeeklySummaryProps) {
  const [data, setData] = useState<WeekSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getWeekSummary()
      .then(setData)
      .catch((err) => console.error('Failed to load weekly summary:', err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={onClose} data-testid="modal-weekly-summary">
      <div className="w-full max-w-lg rounded-[24px] border border-border bg-card p-5 shadow-xl sm:p-7" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono-ui text-[10px] uppercase tracking-[.2em] text-muted-foreground">Weekly overview</p>
            <h2 className="mt-1 font-display text-2xl tracking-[-.04em]">Last 7 days</h2>
          </div>
          <div className="grid size-9 place-items-center rounded-2xl bg-primary/15 text-primary">
            <Calendar size={16} />
          </div>
        </div>

        {loading ? (
          <div className="mt-10 flex justify-center"><div className="size-8 animate-pulse rounded-full bg-muted" /></div>
        ) : !data ? (
          <p className="mt-10 text-center text-sm text-muted-foreground">Could not load summary.</p>
        ) : (
          <>
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard icon={<Flame size={14} />} label="Avg calories" value={`${data.averages.calories}`} unit="kcal" color="text-[#df674f]" />
              <StatCard icon={<Activity size={14} />} label="Avg protein" value={`${data.averages.protein}`} unit="g" color="text-[#3f8d7b]" />
              <StatCard icon={<Activity size={14} />} label="Workouts" value={`${data.totals.workouts}`} unit="total" color="text-[#e1ae38]" />
              <StatCard icon={<Droplets size={14} />} label="Avg water" value={`${data.averages.waterMl}`} unit="ml" color="text-[#3b82f6]" />
            </div>

            <div className="mt-6 h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.days} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={40} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))', fontSize: 12 }}
                    labelStyle={{ fontWeight: 700 }}
                    formatter={(value: number, name: string) => {
                      if (name === 'calories') return [`${value} kcal`, 'Eaten'];
                      if (name === 'caloriesBurned') return [`${value} kcal`, 'Burned'];
                      if (name === 'waterMl') return [`${value} ml`, 'Water'];
                      return [value, name];
                    }}
                  />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} formatter={(value: string) => {
                    if (value === 'calories') return 'Eaten';
                    if (value === 'caloriesBurned') return 'Burned';
                    if (value === 'waterMl') return 'Water';
                    return value;
                  }} />
                  <Bar dataKey="calories" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} maxBarSize={28} />
                  <Bar dataKey="caloriesBurned" fill="hsl(var(--chart-1))" radius={[4, 4, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-4 rounded-xl bg-muted/50 p-3">
              <p className="font-mono-ui text-[9px] uppercase tracking-[.14em] text-muted-foreground">Totals this week</p>
              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs">
                <span><strong>{data.totals.calories.toLocaleString()}</strong> kcal eaten</span>
                <span><strong>{data.totals.caloriesBurned.toLocaleString()}</strong> kcal burned</span>
                <span><strong>{data.totals.durationMinutes}</strong> min active</span>
                <span><strong>{data.totals.waterMl.toLocaleString()}</strong> ml water</span>
              </div>
            </div>
          </>
        )}

        <button type="button" onClick={onClose} data-testid="button-close-weekly-summary" className="focus-ring mt-5 flex w-full items-center justify-center rounded-xl border border-border bg-card py-2.5 text-xs font-bold transition hover:bg-muted">
          Close
        </button>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, unit, color }: { icon: React.ReactNode; label: string; value: string; unit: string; color: string }) {
  return (
    <div className="rounded-2xl border border-border bg-background/55 p-3 text-center">
      <span className={`inline-flex items-center gap-1 ${color}`}>{icon}<span className="font-mono-ui text-[9px] uppercase tracking-[.1em] text-muted-foreground">{label}</span></span>
      <p className={`mt-1 font-display text-2xl ${color}`}>{value}</p>
      <p className="text-[9px] text-muted-foreground">{unit}</p>
    </div>
  );
}
