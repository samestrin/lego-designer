import { useMemo } from 'react';
import type { Placement } from '../core/tiling';
import { countParts, pieceLabel, partsToCsv } from '../core/partsList';
import { downloadText } from './download';

interface PartsViewProps {
  tiling: Placement[];
}

/** Aggregated piece counts per piece+color, with CSV export. */
export function PartsView({ tiling }: PartsViewProps) {
  const counts = useMemo(() => countParts(tiling), [tiling]);
  const rows = [...counts.entries()];
  const total = rows.reduce((n, [, r]) => n + r.count, 0);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-neutral-800 px-3 py-2">
        <button
          type="button"
          onClick={() => downloadText('lego-parts.csv', partsToCsv(counts), 'text/csv')}
          className="rounded border border-neutral-700 px-3 py-1 text-xs text-neutral-300 hover:border-amber-500 hover:text-amber-400"
        >
          Download CSV
        </button>
        <span className="text-xs text-neutral-500">
          {rows.length} piece/color combos · {total.toLocaleString()} pieces total
        </span>
      </div>
      <div className="flex-1 overflow-auto p-4">
        <table className="w-full max-w-2xl text-sm">
          <thead>
            <tr className="border-b border-neutral-700 text-left text-xs text-neutral-500">
              <th className="py-1 pr-3 font-medium">Color</th>
              <th className="py-1 pr-3 font-medium">Name</th>
              <th className="py-1 pr-3 font-medium">Part</th>
              <th className="py-1 pr-3 font-medium">Brand</th>
              <th className="py-1 pr-3 font-medium">Hex</th>
              <th className="py-1 text-right font-medium">Count</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([key, { piece, color, count }]) => (
              <tr key={key} className="border-b border-neutral-800">
                <td className="py-1.5 pr-3">
                  <span
                    className="inline-block h-4 w-4 rounded-sm border border-neutral-700 align-middle"
                    style={{ backgroundColor: color.hex }}
                  />
                </td>
                <td className="py-1.5 pr-3 text-neutral-200">{color.name}</td>
                <td className="py-1.5 pr-3 text-neutral-400">{pieceLabel(piece)}</td>
                <td className="py-1.5 pr-3 text-neutral-400">{color.brand}</td>
                <td className="py-1.5 pr-3 font-mono text-xs text-neutral-400">
                  {color.hex}
                </td>
                <td className="py-1.5 text-right text-neutral-200">
                  {count.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
