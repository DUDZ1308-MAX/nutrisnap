import { ExternalLink } from 'lucide-react';
import { useState } from 'react';

const exerciseVideos = [
  {
    id: 'SgIGhOLKpg8',
    exercise: 'Bodyweight squat',
    source: 'Heather Hart, ACSM EP-C · CMC',
    targets: 'Quads · Glutes',
    cues: ['Set your feet around shoulder-width apart.', 'Keep your chest lifted as you sit your hips back.', 'Press through your feet to stand tall.'],
  },
  {
    id: 'Ql8PKKsDE70',
    exercise: 'Push-up',
    source: 'OPEX Exercise Library',
    targets: 'Chest · Shoulders · Triceps',
    cues: ['Keep your body in a steady line.', 'Place your hands just outside shoulder width.', 'Lower with control, then press the floor away.'],
  },
  {
    id: 'dQiBlIk4dfE',
    exercise: 'Deadlift',
    source: 'ACE Certified',
    targets: 'Hamstrings · Glutes · Back',
    cues: ['Hinge at your hips and keep the weight close.', 'Brace your torso before you lift.', 'Stand by driving through your feet.'],
  },
  {
    id: 'M6DZ0Dca17w',
    exercise: 'Forward lunge',
    source: 'American Council on Exercise',
    targets: 'Quads · Glutes · Hamstrings',
    cues: ['Take a step that lets you stay balanced.', 'Lower under control with your torso upright.', 'Keep your front knee tracking in line with your toes.'],
  },
];

export function WorkoutVideoGuide() {
  const [selectedId, setSelectedId] = useState(exerciseVideos[0].id);
  const selected = exerciseVideos.find((video) => video.id === selectedId) ?? exerciseVideos[0];

  return (
    <section
      aria-labelledby="workout-video-guide-title"
      className="mt-8 rounded-[24px] border border-border bg-card p-4 shadow-sm sm:p-6"
      data-testid="section-workout-video-guide"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono-ui text-[10px] uppercase tracking-[.2em] text-primary">Form library</p>
          <h2 id="workout-video-guide-title" className="mt-1 font-display text-2xl tracking-[-.03em]">Watch a movement demo</h2>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">Choose an exercise for a short technique video and a few form cues.</p>
        </div>
        <label className="w-full sm:w-[250px]">
          <span className="mb-1.5 block text-xs font-bold text-muted-foreground">Choose an exercise</span>
          <select
            value={selectedId}
            onChange={(event) => setSelectedId(event.target.value)}
            className="focus-ring h-11 w-full rounded-xl border border-input bg-background px-3 text-sm font-semibold outline-none focus:border-primary"
            data-testid="select-workout-video"
          >
            {exerciseVideos.map((video) => <option key={video.id} value={video.id}>{video.exercise}</option>)}
          </select>
        </label>
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-[minmax(0,1.35fr)_minmax(230px,0.8fr)] md:items-center">
        <div className="aspect-video overflow-hidden rounded-2xl bg-foreground">
          <iframe
            key={selected.id}
            src={`https://www.youtube-nocookie.com/embed/${selected.id}?rel=0`}
            title={`${selected.exercise} technique video`}
            className="h-full w-full border-0"
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            data-testid="iframe-workout-video"
          />
        </div>

        <div className="min-w-0">
          <p className="font-mono-ui text-[9px] uppercase tracking-[.16em] text-muted-foreground">Target focus</p>
          <p className="mt-1 text-xs font-semibold text-primary">{selected.targets}</p>
          <ul className="mt-4 space-y-2.5">
            {selected.cues.map((cue) => (
              <li key={cue} className="flex gap-2.5 text-sm leading-relaxed text-foreground/80">
                <span aria-hidden="true" className="mt-[7px] size-1.5 shrink-0 rounded-full bg-primary" />
                {cue}
              </li>
            ))}
          </ul>
          <a
            href={`https://www.youtube.com/watch?v=${selected.id}`}
            target="_blank"
            rel="noreferrer"
            className="focus-ring mt-4 inline-flex items-center gap-1.5 rounded-lg text-xs font-bold text-primary hover:underline"
            data-testid="link-workout-video-source"
          >
            {selected.exercise} · {selected.source}
            <ExternalLink size={13} />
          </a>
        </div>
      </div>
      <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">Video opens from YouTube. Use a variation that suits your experience, and stop if you feel pain.</p>
    </section>
  );
}