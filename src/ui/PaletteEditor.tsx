import { useState } from 'react';
import type { PaletteColor } from '../core/types';
import { defaultPalette } from '../core/palette';

interface PaletteEditorProps {
  palette: PaletteColor[];
  onChange: (palette: PaletteColor[]) => void;
  onClose: () => void;
}

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'color'
  );
}

/** Slide-over palette editor: enable/disable colors and add custom ones. */
export function PaletteEditor({ palette, onChange, onClose }: PaletteEditorProps) {
  const [name, setName] = useState('');
  const [hex, setHex] = useState('#C91A09');
  const [brand, setBrand] = useState('');
  const [translucent, setTranslucent] = useState(false);

  const toggle = (id: string) => {
    onChange(
      palette.map((c) => (c.id === id ? { ...c, enabled: !c.enabled } : c)),
    );
  };

  const addCustom = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    let id = `custom-${slugify(trimmed)}`;
    let n = 2;
    while (palette.some((c) => c.id === id)) {
      id = `custom-${slugify(trimmed)}-${n++}`;
    }
    onChange([
      ...palette,
      {
        id,
        name: trimmed,
        hex: hex.toUpperCase(),
        brand: brand.trim() || 'gobricks',
        enabled: true,
        ...(translucent ? { translucent: true } : {}),
      },
    ]);
    setName('');
    setBrand('');
    setTranslucent(false);
  };

  const enabledCount = palette.filter((c) => c.enabled).length;

  return (
    <div
      className="fixed inset-0 z-10 flex justify-end bg-black/60"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex h-full w-full max-w-md flex-col border-l border-neutral-700 bg-neutral-900"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Palette editor"
      >
        <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-3">
          <h2 className="text-sm font-medium text-neutral-200">
            Palette ({enabledCount} of {palette.length} enabled)
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-neutral-700 px-2 py-0.5 text-xs text-neutral-400 hover:border-amber-500 hover:text-amber-400"
          >
            Close
          </button>
        </div>

        <div className="flex-1 overflow-auto px-4 py-2">
          {palette.map((c) => (
            <label
              key={c.id}
              className="flex cursor-pointer items-center gap-3 border-b border-neutral-800 py-1.5 text-sm"
            >
              <input
                type="checkbox"
                checked={c.enabled}
                onChange={() => toggle(c.id)}
                className="accent-amber-500"
              />
              <span
                className="h-4 w-4 shrink-0 rounded-sm border border-neutral-700"
                style={{ backgroundColor: c.hex }}
              />
              <span className="flex-1 text-neutral-200">{c.name}</span>
              {c.translucent && (
                <span className="rounded border border-sky-800 px-1 text-[10px] text-sky-400">
                  trans
                </span>
              )}
              <span className="text-xs text-neutral-500">{c.brand}</span>
            </label>
          ))}
        </div>

        <div className="border-t border-neutral-800 p-4">
          <h3 className="mb-2 text-xs font-medium text-neutral-400">Add custom color</h3>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={hex}
              onChange={(e) => setHex(e.target.value)}
              aria-label="custom color"
              className="h-8 w-10 shrink-0 cursor-pointer rounded border border-neutral-700 bg-neutral-800"
            />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="name"
              className="min-w-0 flex-1 rounded border border-neutral-700 bg-neutral-800 px-2 py-1 text-sm text-neutral-200 placeholder-neutral-600"
            />
            <input
              type="text"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="gobricks"
              className="w-24 rounded border border-neutral-700 bg-neutral-800 px-2 py-1 text-sm text-neutral-200 placeholder-neutral-600"
            />
            <button
              type="button"
              onClick={addCustom}
              disabled={!name.trim()}
              className="rounded border border-neutral-700 px-3 py-1 text-sm text-neutral-300 hover:border-amber-500 hover:text-amber-400 disabled:opacity-40"
            >
              Add
            </button>
          </div>
          <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs text-neutral-400">
            <input
              type="checkbox"
              checked={translucent}
              onChange={(e) => setTranslucent(e.target.checked)}
              className="accent-amber-500"
            />
            translucent (trans-clear / trans-color)
          </label>
          <button
            type="button"
            onClick={() => onChange(defaultPalette())}
            className="mt-3 w-full rounded border border-neutral-700 px-2 py-1 text-xs text-neutral-400 hover:border-amber-500 hover:text-amber-400"
          >
            Reset to defaults
          </button>
        </div>
      </div>
    </div>
  );
}
