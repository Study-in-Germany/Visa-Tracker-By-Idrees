"use client";

import { useRef, useState } from "react";
import Icon from "./Icon";

/** Styled file chooser with drag-and-drop. Calls onFile with the chosen file (or null when cleared). */
export default function FileDrop({ accept, file, onFile, label = "Choose a file" }: { accept?: string; file: File | null; onFile: (f: File | null) => void; label?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files?.[0]; if (f) onFile(f); }}
      className={`flex flex-col items-center gap-2 rounded-xl border border-dashed px-4 py-8 text-center transition-colors ${over ? "border-clay-500 bg-clay-50" : "border-line-strong bg-paper-raised"}`}
    >
      <input ref={input} type="file" accept={accept} className="sr-only" aria-label={label} onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
      <span className="grid h-10 w-10 place-items-center rounded-lg bg-paper-sunk text-ink-700"><Icon name="upload" /></span>
      {file ? (
        <>
          <p className="text-sm font-medium">{file.name}</p>
          <p className="text-xs text-mute">{(file.size / 1024).toFixed(1)} KB</p>
          <button type="button" onClick={() => { onFile(null); if (input.current) input.current.value = ""; }} className="text-xs font-medium text-clay-600 hover:underline">Remove file</button>
        </>
      ) : (
        <>
          <p className="text-sm font-medium">Drag a file here</p>
          <button type="button" onClick={() => input.current?.click()} className="btn-secondary !min-h-[32px] !text-xs">{label}</button>
        </>
      )}
    </div>
  );
}
