import type { WorkoutTarget } from '@/lib/nutrisnap-storage';

const baseFill = '#dddcd0';
const muscleFill = '#e67755';
const outline = '#a8aa9b';

function areaFill(targets: WorkoutTarget[], target: WorkoutTarget) {
  return targets.includes(target) ? muscleFill : baseFill;
}

function BodySide({ side, targets, compact }: { side: 'front' | 'back'; targets: WorkoutTarget[]; compact: boolean }) {
  const front = side === 'front';
  return (
    <div className="flex flex-col items-center">
      <span className={`font-mono-ui uppercase tracking-[.16em] text-muted-foreground ${compact ? 'text-[7px]' : 'text-[9px]'}`}>{front ? 'Front' : 'Back'}</span>
      <svg
        viewBox="0 0 100 166"
        className={compact ? 'mt-1 h-[104px] w-[64px]' : 'mt-2 h-[190px] w-[116px]'}
        role="presentation"
      >
        <g fill={baseFill} stroke={outline} strokeWidth="1.1" strokeLinejoin="round" strokeLinecap="round">
          <circle cx="50" cy="12" r="7" />
          <path d="M46 19h8v9h-8z" />
          <path d="M39 28c4-2 7-3 11-3s7 1 11 3l7 6-5 23-4 20H41l-4-20-5-23 7-6z" />
          <path d="M34 30 27 34 20 52l-5 16 5 2 8-15 7-13 6-8z" />
          <path d="m66 30 7 4 7 18 5 16-5 2-8-15-8-13-6-8z" />
          <path d="m15 68-3 13 5 2 5-13zM85 68l3 13-5 2-5-13z" />
          <path d="M42 76c-2 11-4 23-4 34l-2 17 2 25 5 1 4-25 3-22V77z" />
          <path d="M58 76c2 11 4 23 4 34l2 17-2 25-5 1-4-25-3-22V77z" />
          <path d="m38 151-2 9 11 1 1-2-3-2-2-6zM62 151l2 9-11 1-1-2 3-2 2-6z" />
        </g>

        {front ? (
          <g stroke={outline} strokeWidth="0.7" strokeLinejoin="round">
            <path d="M36 31c4-3 8-4 13-4v12c-5 1-9-1-12-4z" fill={areaFill(targets, 'shoulders')} />
            <path d="M64 31c-4-3-8-4-13-4v12c5 1 9-1 12-4z" fill={areaFill(targets, 'shoulders')} />
            <path d="M40 40c3-2 7-3 10-2v13c-4 1-8-1-11-4z" fill={areaFill(targets, 'chest')} />
            <path d="M60 40c-3-2-7-3-10-2v13c4 1 8-1 11-4z" fill={areaFill(targets, 'chest')} />
            <path d="m35 39 5 1-2 14-6 1-3-7zM65 39l-5 1 2 14 6 1 3-7z" fill={areaFill(targets, 'biceps')} />
            <path d="M46 52h8l2 21-6 5-6-5z" fill={areaFill(targets, 'core')} />
            <path d="M41 79c3-1 6-2 8-1v30l-4 11-7-1 1-16zM59 79c-3-1-6-2-8-1v30l4 11 7-1-1-16z" fill={areaFill(targets, 'quads')} />
            <path d="m39 120 7 1-2 24-5 2-3-5zM61 120l-7 1 2 24 5 2 3-5z" fill={areaFill(targets, 'calves')} />
          </g>
        ) : (
          <g stroke={outline} strokeWidth="0.7" strokeLinejoin="round">
            <path d="M40 29c3-3 7-4 10-4s7 1 10 4l4 8-14 7-14-7z" fill={areaFill(targets, 'back')} />
            <path d="M38 37 49 43l-2 22-8 7-5-18zM62 37 51 43l2 22 8 7 5-18z" fill={areaFill(targets, 'back')} />
            <path d="m35 39 5 1-2 14-6 1-3-7zM65 39l-5 1 2 14 6 1 3-7z" fill={areaFill(targets, 'triceps')} />
            <path d="M41 71c5 2 13 2 18 0l4 13-8 5h-10l-8-5z" fill={areaFill(targets, 'glutes')} />
            <path d="M41 87c3 1 6 1 9 0v22l-4 11-7-1 1-16zM59 87c-3 1-6 1-9 0v22l4 11 7-1-1-16z" fill={areaFill(targets, 'hamstrings')} />
            <path d="m39 120 7 1-2 24-5 2-3-5zM61 120l-7 1 2 24 5 2 3-5z" fill={areaFill(targets, 'calves')} />
          </g>
        )}
      </svg>
    </div>
  );
}

export function MuscleMap({ targets, compact = false }: { targets: WorkoutTarget[]; compact?: boolean }) {
  const labels = targets.length ? targets.join(', ') : 'none selected';
  return (
    <div
      className={`flex items-end justify-center ${compact ? 'gap-2' : 'gap-5'}`}
      role="img"
      aria-label={`Workout target muscle map, highlighted areas: ${labels}`}
      data-testid={compact ? 'visual-workout-target-map-compact' : 'visual-workout-target-map'}
    >
      <BodySide side="front" targets={targets} compact={compact} />
      <BodySide side="back" targets={targets} compact={compact} />
    </div>
  );
}