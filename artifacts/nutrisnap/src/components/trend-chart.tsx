import { useState, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { dateKey, kgToUnit, weightUnitLabel, type WeightUnit } from "@/lib/nutrisnap-storage";

type Metric = "calories" | "protein" | "carbs" | "fat" | "weight" | "workouts";

interface TrendChartProps {
  meals: Array<{ date: string; calories: number; protein: number; carbs: number; fat: number }>;
  workouts: Array<{ date: string; caloriesBurned: number; durationMinutes: number }>;
  /** Canonical kilogram values keyed by local date. */
  weightHistory?: Array<{ date: string; weight: number }>;
  unit?: WeightUnit;
}

const METRICS: { key: Metric; label: string; color: string }[] = [
  { key: "calories", label: "Calories", color: "#f97316" },
  { key: "protein", label: "Protein (g)", color: "#3b82f6" },
  { key: "carbs", label: "Carbs (g)", color: "#22c55e" },
  { key: "fat", label: "Fat (g)", color: "#a855f7" },
  { key: "weight", label: "Weight (kg)", color: "#ef4444" },
  { key: "workouts", label: "Workout Min", color: "#06b6d4" },
];

const RANGES = [
  { key: "7d", label: "7D", days: 7 },
  { key: "30d", label: "30D", days: 30 },
  { key: "90d", label: "90D", days: 90 },
];

export function TrendChart({ meals, workouts, weightHistory = [], unit = "kg" }: TrendChartProps) {
  const [selectedRange, setSelectedRange] = useState("30d");
  const [selectedMetrics, setSelectedMetrics] = useState<Metric[]>(["calories", "protein"]);

  const days = RANGES.find((r) => r.key === selectedRange)?.days ?? 30;
  const weightLabel = `Weight (${weightUnitLabel(unit)})`;
  const metrics = METRICS.map((m) => (m.key === "weight" ? { ...m, label: weightLabel } : m));

  const chartData = useMemo(() => {
    const now = new Date();
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - days);

    const dayMap: Record<string, { date: string; calories: number; protein: number; carbs: number; fat: number; weight: number; workouts: number }> = {};

    // Initialize all days
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = dateKey(d);
      dayMap[key] = { date: key, calories: 0, protein: 0, carbs: 0, fat: 0, weight: 0, workouts: 0 };
    }

    // Aggregate meals
    meals.forEach((m) => {
      const d = m.date?.slice(0, 10);
      if (d && dayMap[d]) {
        dayMap[d].calories += m.calories || 0;
        dayMap[d].protein += m.protein || 0;
        dayMap[d].carbs += m.carbs || 0;
        dayMap[d].fat += m.fat || 0;
      }
    });

    // Aggregate workouts
    workouts.forEach((w) => {
      const d = w.date?.slice(0, 10);
      if (d && dayMap[d]) {
        dayMap[d].workouts += w.durationMinutes || 0;
      }
    });

    // Weight history (fill nearest)
    weightHistory
      .filter((w) => w.date >= dateKey(cutoff))
      .sort((a, b) => a.date.localeCompare(b.date))
      .forEach((w) => {
        const d = w.date.slice(0, 10);
        if (dayMap[d]) dayMap[d].weight = kgToUnit(w.weight, unit) ?? 0;
      });

    // Fill weight gaps with last known
    let lastWeight = 0;
    const keys = Object.keys(dayMap).sort();
    keys.forEach((k) => {
      if (dayMap[k].weight > 0) lastWeight = dayMap[k].weight;
      else if (lastWeight > 0) dayMap[k].weight = lastWeight;
    });

    return Object.values(dayMap).map((d) => ({
      ...d,
      label: new Date(d.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    }));
  }, [meals, workouts, weightHistory, days, unit]);

  const toggleMetric = (m: Metric) => {
    setSelectedMetrics((prev) =>
      prev.includes(m) ? (prev.length === 1 ? prev : prev.filter((x) => x !== m)) : [...prev, m]
    );
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Trends</h3>
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-700 rounded-lg p-0.5">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setSelectedRange(r.key)}
              className={`px-2 py-0.5 text-xs font-medium rounded-md transition-colors ${
                selectedRange === r.key
                  ? "bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {metrics.map((m) => (
          <button
            key={m.key}
            onClick={() => toggleMetric(m.key)}
            className={`px-2 py-0.5 text-xs font-medium rounded-full border transition-colors ${
              selectedMetrics.includes(m.key)
                ? "border-transparent text-white"
                : "border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-slate-300"
            }`}
            style={selectedMetrics.includes(m.key) ? { backgroundColor: m.color } : undefined}
          >
            {m.label}
          </button>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10 }}
            interval={Math.max(0, Math.floor(days / 6))}
            stroke="#94a3b8"
          />
          <YAxis tick={{ fontSize: 10 }} stroke="#94a3b8" width={40} />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1e293b",
              border: "none",
              borderRadius: "8px",
              color: "#f8fafc",
              fontSize: "12px",
            }}
          />
          <Legend wrapperStyle={{ fontSize: "11px" }} />
          {metrics.filter((m) => selectedMetrics.includes(m.key)).map((m) => (
            <Line
              key={m.key}
              type="monotone"
              dataKey={m.key}
              name={m.label}
              stroke={m.color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
