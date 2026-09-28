import { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface MacroPieChartProps {
  protein: number;
  carbs: number;
  fat: number;
}

const COLORS = ["#3b82f6", "#22c55e", "#a855f7"];
const LABELS = ["Protein", "Carbs", "Fat"];

export function MacroPieChart({ protein, carbs, fat }: MacroPieChartProps) {
  const data = useMemo(() => {
    const total = protein + carbs + fat;
    if (total === 0) return [];
    return [
      { name: "Protein", value: protein, grams: `${Math.round(protein)}g` },
      { name: "Carbs", value: carbs, grams: `${Math.round(carbs)}g` },
      { name: "Fat", value: fat, grams: `${Math.round(fat)}g` },
    ];
  }, [protein, carbs, fat]);

  const total = protein + carbs + fat;

  if (total === 0) {
    return (
      <div className="rounded-[20px] border border-border bg-card p-4 shadow-sm sm:rounded-[24px] sm:p-6">
        <p className="font-mono-ui text-[10px] uppercase tracking-[.2em] text-muted-foreground">Macros</p>
        <h2 className="mt-1 font-display text-xl tracking-[-.04em] sm:text-2xl">Macro breakdown</h2>
        <div className="mt-6 flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-8 text-center">
          <p className="text-sm text-muted-foreground">Log meals to see your macro distribution</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[20px] border border-border bg-card p-4 shadow-sm sm:rounded-[24px] sm:p-6">
      <p className="font-mono-ui text-[10px] uppercase tracking-[.2em] text-muted-foreground">Macros</p>
      <h2 className="mt-1 font-display text-xl tracking-[-.04em] sm:text-2xl">Macro breakdown</h2>

      <div className="mt-4 flex flex-col items-center sm:flex-row sm:gap-4">
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={45}
              outerRadius={70}
              paddingAngle={3}
              dataKey="value"
              strokeWidth={0}
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "#1e293b",
                border: "none",
                borderRadius: "8px",
                color: "#f8fafc",
                fontSize: "12px",
              }}
              formatter={(value: number, name: string) => [`${Math.round(value)}g (${Math.round((value / total) * 100)}%)`, name]}
            />
          </PieChart>
        </ResponsiveContainer>

        <div className="mt-2 space-y-2 sm:mt-0">
          {data.map((item, i) => (
            <div key={item.name} className="flex items-center gap-2.5">
              <div className="size-3 rounded-full" style={{ backgroundColor: COLORS[i] }} />
              <div className="flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-xs font-medium text-foreground">{item.name}</span>
                  <span className="font-mono text-xs text-muted-foreground">{item.grams}</span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${(item.value / total) * 100}%`,
                      backgroundColor: COLORS[i],
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
