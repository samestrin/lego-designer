import { useCallback, useEffect, useMemo, useState } from 'react';
import type { PaletteColor, PixelData } from './core/types';
import { encodeMosaic } from './core/encoder';
import { buildGuideData, generateGuide } from './core/guide';
import { enabledColors } from './core/palette';
import { tileMosaic } from './core/tiling';
import { loadImageFile, cropRect, DEFAULT_CROP } from './image/load';
import type { CropRect } from './image/load';
import { Controls } from './ui/Controls';
import { CropDialog } from './ui/CropDialog';
import { DropZone } from './ui/DropZone';
import { GuideView } from './ui/GuideView';
import { Welcome } from './ui/Welcome';
import { PaletteEditor } from './ui/PaletteEditor';
import { PartsView } from './ui/PartsView';
import { Preview } from './ui/Preview';
import { PrintGuide } from './ui/PrintGuide';
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
  const [options, setOptions] = useState(loadStoredOptions);
  const [crop, setCrop] = useState<CropRect>(DEFAULT_CROP);
  const [palette, setPalette] = useState<PaletteColor[]>(loadStoredPalette);
  const [showMismatches, setShowMismatches] = useState(false);
  const [tab, setTab] = useState<Tab>('preview');
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [cropOpen, setCropOpen] = useState(false);
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

  // Logo click = back to the drop screen. Palette and option settings are
  // kept; only the image and crop reset.
  const handleHome = useCallback(() => {
    setImage((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return null;
    });
    setCrop(DEFAULT_CROP);
    setLoadError(null);
    setTab('preview');
  }, []);

  // The crop is free-aspect: the encoder derives the row count from the
  // cropped image's aspect, so reframing also reshapes the display.
  const cropped = useMemo(
    () => (image ? cropRect(image.pixels, crop) : null),
    [image, crop],
  );

  const mosaic = useMemo(() => {
    if (!cropped || enabledColors(palette).length === 0) return null;
    return encodeMosaic(cropped, cellWidth, palette, {
      dither: options.ditherStrength > 0,
      ditherStrength: options.ditherStrength / 100,
      contrast: options.contrast,
      saturation: options.saturation,
      leading: options.leading,
    });
  }, [cropped, cellWidth, palette, options.ditherStrength, options.contrast, options.saturation, options.leading]);

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
  const guideData = useMemo(
    () =>
      mosaic
        ? buildGuideData(mosaic, { set: options.setId, mode: options.mode })
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
          <button
            type="button"
            onClick={handleHome}
            title="Back to start"
            className="flex items-center gap-2 text-sm font-semibold tracking-wide text-amber-500 hover:text-amber-400"
          >
            <img src="/favicon.svg" alt="" className="h-5 w-5 rounded" />
            LEGO DESIGNER
          </button>
          <span className="text-xs text-neutral-500">
            photo → LEGO plate-edge mosaic
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
                  ditherStrength={options.ditherStrength}
                  onDitherStrength={(ditherStrength) => setOptions((o) => ({ ...o, ditherStrength }))}
                  contrast={options.contrast}
                  onContrast={(contrast) => setOptions((o) => ({ ...o, contrast }))}
                  saturation={options.saturation}
                  onSaturation={(saturation) => setOptions((o) => ({ ...o, saturation }))}
                  leading={options.leading}
                  onLeading={(leading) => setOptions((o) => ({ ...o, leading }))}
                  setId={options.setId}
                  onSetId={(setId) => setOptions((o) => ({ ...o, setId }))}
                  mode={options.mode}
                  onMode={(mode) => setOptions((o) => ({ ...o, mode }))}
                  onOpenCrop={() => setCropOpen(true)}
                  onResetCrop={() => setCrop(DEFAULT_CROP)}
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
            <main className="min-w-0 flex-1 overflow-auto">
              <Welcome onFile={handleFile} />
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

        {cropOpen && image && (
          <CropDialog
            url={image.url}
            imgWidth={image.pixels.width}
            imgHeight={image.pixels.height}
            cellWidth={cellWidth}
            crop={crop}
            onChange={setCrop}
            onClose={() => setCropOpen(false)}
          />
        )}
      </div>

      {/* Print-only copy of the guide. */}
      {guideData && <PrintGuide data={guideData} />}
    </div>
  );
}

export default App;
