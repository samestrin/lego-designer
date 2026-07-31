import { downloadText } from './download';

interface GuideViewProps {
  guide: string;
}

const buttonClass =
  'rounded border border-neutral-700 px-3 py-1 text-xs text-neutral-300 hover:border-amber-500 hover:text-amber-400';

/**
 * The build guide. Printing goes through a `print:block` copy rendered at
 * the app root (the app shell is `print:hidden`), so only the guide prints.
 */
export function GuideView({ guide }: GuideViewProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-neutral-800 px-3 py-2">
        <button
          type="button"
          onClick={() => downloadText('lego-guide.txt', guide, 'text/plain')}
          className={buttonClass}
        >
          Download .txt
        </button>
        <button type="button" onClick={() => window.print()} className={buttonClass}>
          Print
        </button>
      </div>
      <div className="flex-1 overflow-auto p-4">
        <pre className="font-mono text-xs leading-relaxed whitespace-pre text-neutral-300">
          {guide}
        </pre>
      </div>
    </div>
  );
}
