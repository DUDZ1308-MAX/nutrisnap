import { useState, useEffect, useRef, useCallback } from "react";
import { Play, Pause, RotateCcw, Timer } from "lucide-react";

const PRESETS = [30, 60, 90, 120];
const CIRCUMFERENCE = 2 * Math.PI * 45;

export function RestTimer() {
  const [seconds, setSeconds] = useState(60);
  const [remaining, setRemaining] = useState(0);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  useEffect(() => {
    if (!running || remaining <= 0) {
      clearTimer();
      if (remaining <= 0 && running) {
        setRunning(false);
      }
      return;
    }
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearTimer();
          setRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearTimer();
  }, [running, remaining, clearTimer]);

  const start = () => {
    if (remaining <= 0) setRemaining(seconds);
    setRunning(true);
  };

  const pause = () => setRunning(false);

  const reset = () => {
    clearTimer();
    setRunning(false);
    setRemaining(0);
  };

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const progress = seconds > 0 ? ((seconds - remaining) / seconds) * 100 : 0;

  return (
    <div className="rounded-[20px] border border-border bg-card p-4 shadow-sm sm:rounded-[24px] sm:p-6">
      <div className="flex items-center gap-2 mb-3">
        <Timer size={16} className="text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Rest Timer</h3>
      </div>

      {/* Timer display */}
      <div className="relative mx-auto mb-4 flex size-28 items-center justify-center sm:size-32">
        <svg viewBox="0 0 100 100" className="absolute inset-0 size-full -rotate-90">
          <circle cx="50" cy="50" r="45" fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={`${(progress / 100) * CIRCUMFERENCE} ${CIRCUMFERENCE}`}
            className="transition-[stroke-dasharray] duration-1000"
          />
        </svg>
        <div className="text-center">
          <p className="font-mono text-2xl font-bold tabular-nums sm:text-3xl">
            {remaining > 0 ? `${mins}:${secs.toString().padStart(2, "0")}` : `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, "0")}`}
          </p>
          <p className="text-[10px] text-muted-foreground">{running ? "Resting" : remaining > 0 ? "Paused" : "Ready"}</p>
        </div>
      </div>

      {/* Presets */}
      <div className="flex justify-center gap-1.5 mb-4">
        {PRESETS.map((p) => (
          <button
            key={p}
            onClick={() => { setSeconds(p); setRemaining(0); }}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition ${
              seconds === p
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {p}s
          </button>
        ))}
      </div>

      {/* Controls */}
      <div className="flex justify-center gap-2">
        {!running ? (
          <button
            type="button"
            onClick={start}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground transition hover:brightness-105"
          >
            <Play size={14} /> {remaining > 0 ? "Resume" : "Start"}
          </button>
        ) : (
          <button
            type="button"
            onClick={pause}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border px-5 py-2.5 text-xs font-bold transition hover:bg-muted"
          >
            <Pause size={14} /> Pause
          </button>
        )}
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2.5 text-xs font-bold transition hover:bg-muted"
        >
          <RotateCcw size={14} /> Reset
        </button>
      </div>
    </div>
  );
}
