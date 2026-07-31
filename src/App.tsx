import { useCallback, useEffect, useMemo, useState } from 'react';
import type { PaletteColor, PixelData } from './core/types';
import { encodeMosaic } from './core/encoder';
import { generateGuide } from './core/guide';
import { enabledColors } from './core/palette';
import { tileMosaic } from './core/tiling';
import { loadImageFile, windowedCrop } from './image/load';
import { Controls } from './ui/Controls';
import { DropZone } from './ui/DropZone';
import { GuideView } from './ui/GuideView';
import { PaletteEditor } from './ui/PaletteEditor';
import { PartsView } from './ui/PartsView';
import { Preview } from './ui/Preview';
import { countMismatches } from './ui/mismatch';
import {
  loadStoredOptions,
  saveStoredOptions,
} from './ui/optionsStorage';
import { loadStoredPalette, saveStoredPalette } from './ui/paletteStorage';

type Tab = 'preview' | 'guide' | 'parts';

const TABS: { id: Tab; label: string }[] = [
  { id: 'preview', label: 'Preview' },
  { id: 'guide', label: 'Guide' },
  { id: 'parts', label: 'Parts' },
];

function App() {
  const [image, setImage] = useState<{ pixels: PixelData; url: string } | null>(null);
  const [cellWidth, setCellWidth] = useState(16);
  const [dither, setDither] = useState(true);
  const [options, setOptions] = useState(loadStoredOptions);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [palette, setPalette] = useState<PaletteColor[]>(loadStoredPalette);
  const [showMismatches, setShowMismatches] = useState(false);
  const [tab, setTab] = useState<Tab>('preview');
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => saveStoredPalette(palette), [palette]);
  useEffect(() => saveStoredOptions(options), [options]);

  const handleFile = useCallback(async (file: File) => {
    try {
      const loaded = await loadImageFile(file);
      setImage((prev) => {
        if (prev) URL.revokeObjectURL(prev.url);
        return loaded;
      });
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'failed to load image');
    }
  }, []);

  // The encoder derives the row count from the cropped image's aspect
  // (rows = round(h * 3*cellWidth / w)), and we always want the source's
  // native aspect, so the crop is a fixed 90% window of the source — same
  // aspect, so the aspect never changes — whose position the offset
  // sliders move within the remaining 10% slack.
  const cropped = useMemo(
    () => (image ? windowedCrop(image.pixels, offsetX, offsetY) : null),
    [image, offsetX, offsetY],
  );

  const mosaic = useMemo(() => {
    if (!cropped || enabledColors(palette).length === 0) return null;
    return encodeMosaic(cropped, cellWidth, palette, { dither });
  }, [cropped, cellWidth, palette, dither]);

  const tiling = useMemo(
    () => (mosaic ? tileMosaic(mosaic, options.setId, options.mode) : null),
    [mosaic, options.setId, options.mode],
  );

  const guide = useMemo(
    () =>
      mosaic
        ? generateGuide(mosaic, { set: options.setId, mode: options.mode })
        : null,
    [mosaic, options.setId, options.mode],
  );
  const mismatchCount = useMemo(
    () => (mosaic ? countMismatches(mosaic) : 0),
    [mosaic],
  );

  return (
    <div className="h-full">
      {/* App shell — hidden when printing (only the guide prints). */}
      <div className="flex h-full flex-col print:hidden">
        <header className="flex items-baseline gap-3 border-b border-neutral-800 px-4 py-2">
          <h1 className="text-sm font-semibold tracking-wide text-amber-500">
            LEGO DESIGNER
          </h1>
          <span className="text-xs text-neutral-500">
            photo → 1×1 plate-edge mosaic
          </span>
        </header>

        <div className="flex min-h-0 flex-1">
          {image ? (
            <>
              <aside className="w-[300px] shrink-0 overflow-auto border-r border-neutral-800">
                <DropZone url={image.url} onFile={handleFile} />
                {loadError && (
                  <p className="px-3 pb-2 text-xs text-red-400">{loadError}</p>
                )}
                <Controls
                  cellWidth={cellWidth}
                  onCellWidth={setCellWidth}
                  dither={dither}
                  onDither={setDither}
                  setId={options.setId}
                  onSetId={(setId) => setOptions((o) => ({ ...o, setId }))}
                  mode={options.mode}
                  onMode={(mode) => setOptions((o) => ({ ...o, mode }))}
                  viewMode={options.viewMode}
                  onViewMode={(viewMode) => setOptions((o) => ({ ...o, viewMode }))}
                  offsetX={offsetX}
                  offsetY={offsetY}
                  onOffsets={(x, y) => {
                    setOffsetX(x);
                    setOffsetY(y);
                  }}
                  showMismatches={showMismatches}
                  onShowMismatches={setShowMismatches}
                  mismatchCount={mismatchCount}
                  mosaic={mosaic}
                  tiling={tiling}
                  onOpenPalette={() => setPaletteOpen(true)}
                />
              </aside>

              <main className="flex min-w-0 flex-1 flex-col">
                <nav className="flex border-b border-neutral-800">
                  {TABS.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTab(t.id)}
                      className={`px-4 py-2 text-sm ${
                        tab === t.id
                          ? 'border-b-2 border-amber-500 text-amber-400'
                          : 'text-neutral-400 hover:text-neutral-200'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </nav>
                <div className="min-h-0 flex-1">
                  {!mosaic ? (
                    <p className="p-6 text-sm text-red-400">
                      No palette colors enabled — enable at least one color in
                      the palette editor.
                    </p>
                  ) : tab === 'preview' ? (
                    <Preview
                      mosaic={mosaic}
                      tiling={tiling!}
                      viewMode={options.viewMode}
                      showMismatches={showMismatches}
                    />
                  ) : tab === 'guide' ? (
                    <GuideView guide={guide ?? ''} />
                  ) : (
                    <PartsView tiling={tiling!} />
                  )}
                </div>
              </main>
            </>
          ) : (
            <main className="flex min-w-0 flex-1 flex-col">
              <DropZone url={null} onFile={handleFile} />
              {loadError && (
                <p className="px-8 pb-4 text-xs text-red-400">{loadError}</p>
              )}
            </main>
          )}
        </div>

        {paletteOpen && (
          <PaletteEditor
            palette={palette}
            onChange={setPalette}
            onClose={() => setPaletteOpen(false)}
          />
        )}
      </div>

      {/* Print-only copy of the guide. */}
      {guide && (
        <pre className="hidden font-mono text-xs whitespace-pre print:block">
          {guide}
        </pre>
      )}
    </div>
  );
}

export default App;
