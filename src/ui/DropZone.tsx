import { useEffect, useRef, useState } from 'react';

interface DropZoneProps {
  /** Object URL of the loaded image, or null when empty. */
  url: string | null;
  onFile: (file: File) => void;
}

/** Drop area: drag/drop, click-to-browse, and paste-from-clipboard. */
export function DropZone({ url, onFile }: DropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const file = [...(e.clipboardData?.files ?? [])].find((f) =>
        f.type.startsWith('image/'),
      );
      if (file) {
        e.preventDefault();
        onFile(file);
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [onFile]);

  const pick = (files: FileList | null) => {
    const file = files?.[0];
    if (file && file.type.startsWith('image/')) onFile(file);
  };

  if (url) {
    return (
      <div className="p-3">
        <div className="overflow-hidden rounded border border-neutral-700">
          <img src={url} alt="source" className="block w-full" />
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mt-2 w-full rounded border border-neutral-700 px-2 py-1 text-xs text-neutral-300 hover:border-amber-500 hover:text-amber-400"
        >
          Replace image
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => pick(e.target.files)}
        />
      </div>
    );
  }

  return (
    <div className="flex h-full items-center justify-center p-8">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          pick(e.dataTransfer.files);
        }}
        className={`flex h-64 w-full max-w-xl flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed transition-colors ${
          dragOver
            ? 'border-amber-500 bg-amber-500/10 text-amber-400'
            : 'border-neutral-700 text-neutral-400 hover:border-neutral-500'
        }`}
      >
        <span className="text-lg">Drop a photo here</span>
        <span className="text-sm">or click to browse, or paste from clipboard</span>
        <span className="text-xs text-neutral-500">JPG / PNG — stays on your machine</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => pick(e.target.files)}
      />
    </div>
  );
}
