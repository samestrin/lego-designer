import { DropZone } from './DropZone';

interface WelcomeProps {
  onFile: (file: File) => void;
}

const STEPS: { n: string; title: string; body: string }[] = [
  {
    n: '1',
    title: 'Drop a photo',
    body: 'JPG or PNG, straight from your machine — nothing is uploaded anywhere.',
  },
  {
    n: '2',
    title: 'Tune the build',
    body: 'Width in cells, piece set, dither, contrast — watch the brick preview update live.',
  },
  {
    n: '3',
    title: 'Print & build',
    body: "The guide lists pieces course by course. Build the wall bottom-up from the frame, that's it.",
  },
];

/** Empty-state landing: quick explainer above the drop zone. */
export function Welcome({ onFile }: WelcomeProps) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-8 p-8">
      <div className="max-w-xl text-center">
        <h2 className="text-xl font-semibold text-neutral-200">
          Turn a photo into a LEGO mosaic
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-neutral-400">
          Not studs-up — <span className="text-neutral-200">plate edges</span>. Each
          1×1 plate shows a thin colored edge, three stacked plates make one
          ANSI-style cell (▀▄█), and the whole mosaic builds as a single
          standing wall — the face you build IS the display. Pure pixel art by
          default — enable trans colors and leading and it becomes literal
          stained glass.
        </p>
      </div>

      <div className="grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
        {STEPS.map((s) => (
          <div
            key={s.n}
            className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-4"
          >
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-semibold text-amber-500">{s.n}</span>
              <span className="text-sm font-medium text-neutral-200">{s.title}</span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-neutral-400">{s.body}</p>
          </div>
        ))}
      </div>

      <div className="w-full max-w-xl">
        <DropZone url={null} onFile={onFile} />
      </div>

      <p className="max-w-xl text-center text-xs leading-relaxed text-neutral-500">
        Works best with bold, high-contrast art — comic styles beat photos.
        Enable trans colors in the palette editor for the stained-glass look.
      </p>
    </div>
  );
}
