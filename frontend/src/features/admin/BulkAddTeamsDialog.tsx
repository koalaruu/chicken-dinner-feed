import { useEffect, useRef, useState } from 'react';
import type { TeamRosterDocument, TeamRosterEntry } from '@cdf/shared';

export interface BulkAddTeamsDialogProps {
  open: boolean;
  document: TeamRosterDocument;
  onCancel(): void;
  onApply(newTeams: TeamRosterEntry[]): void;
}

const PMCC_SAMPLE_TEAMS = [
  'BIGETRON RA',
  'RRQ RYU',
  'ALTER EGO ARES',
  'BOOM ESPORTS',
  'MORPH TEAM',
  'GENESIS DOGMA',
  'VOIN DONKEY',
  'DEWA UNITED',
  'TALON ESPORTS',
  'KAGENDRA',
  'BULLS ESPORTS',
  'GEEK FAM',
  'GLU SQUAD',
  '21 ESPORTS',
  'PIGMY TEAM',
  'PERSIJA EVOS',
];

const GENERIC_16_TEAMS = Array.from({ length: 16 }, (_, i) => `TEAM ${String(i + 1).padStart(2, '0')}`);

function cleanTeamName(raw: string): string {
  // Strip common prefixes like "Slot 1: ", "1. ", "01 - ", "1) "
  const stripped = raw
    .replace(/^(\s*slot\s*\d+\s*[:\-.]?\s*)/i, '')
    .replace(/^(\s*\d+\s*[:\-.)]\s*)/, '')
    .trim();
  return stripped.slice(0, 24);
}

function parseInput(text: string): string[] {
  if (!text.trim()) return [];
  let lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 1 && lines[0].includes(',')) {
    lines = lines[0].split(',').map((l) => l.trim()).filter(Boolean);
  } else if (lines.length === 1 && lines[0].includes('\t')) {
    lines = lines[0].split('\t').map((l) => l.trim()).filter(Boolean);
  }
  return lines.map(cleanTeamName).filter(Boolean);
}

export function BulkAddTeamsDialog({
  open,
  document,
  onCancel,
  onApply,
}: BulkAddTeamsDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [rawText, setRawText] = useState('');
  const [mode, setMode] = useState<'replace' | 'append'>('replace');

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
      textareaRef.current?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  const parsedNames = parseInput(rawText);

  // Compute what the resulting teams will be
  const previewTeams: TeamRosterEntry[] = (() => {
    if (mode === 'replace') {
      return parsedNames.slice(0, 25).map((name, idx) => ({
        teamNo: idx + 1,
        name,
        logoUrl: null,
      }));
    }

    // Append mode: find next available slots
    const existing = [...document.teams];
    const usedSlots = new Set(existing.map((t) => t.teamNo));
    const result: TeamRosterEntry[] = [...existing];

    for (const name of parsedNames) {
      if (result.length >= 25) break;
      // find next free slot
      let slot = 1;
      while (slot <= 25 && (usedSlots.has(slot) || result.some((t) => t.teamNo === slot))) {
        slot++;
      }
      if (slot <= 25) {
        result.push({ teamNo: slot, name, logoUrl: null });
      }
    }

    return result.sort((a, b) => a.teamNo - b.teamNo);
  })();

  const handleApply = () => {
    if (previewTeams.length === 0) return;
    onApply(previewTeams);
    setRawText('');
  };

  return (
    <dialog
      ref={dialogRef}
      onClose={onCancel}
      onCancel={onCancel}
      className="bg-card text-foreground border-border m-auto w-[min(38rem,calc(100vw-2rem))] rounded-xl border p-0 shadow-2xl backdrop:bg-black/65"
    >
      <div className="flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-4 bg-muted/20">
          <div>
            <h2 className="text-base font-bold flex items-center gap-2">
              <span className="text-amber-400">⚡</span> Bulk Tambah / Paste Tim
            </h2>
            <p className="text-muted-foreground text-xs mt-0.5">
              Tempel daftar nama tim sekaligus (1 nama per baris atau pisahkan koma/tab).
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="text-muted-foreground hover:text-foreground text-xl size-8 flex items-center justify-center rounded-lg hover:bg-muted"
            aria-label="Tutup"
          >
            &times;
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3 overflow-y-auto">
          {/* Quick Preset Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-muted-foreground font-semibold text-[11px] mr-1">Preset Cepat:</span>
            <button
              type="button"
              onClick={() => setRawText(PMCC_SAMPLE_TEAMS.join('\n'))}
              className="px-2.5 py-1 rounded-md border border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 text-xs font-medium transition-colors"
            >
              🎮 Top 16 PMCC ID
            </button>
            <button
              type="button"
              onClick={() => setRawText(GENERIC_16_TEAMS.join('\n'))}
              className="px-2.5 py-1 rounded-md border border-border bg-secondary hover:bg-secondary/80 text-xs font-medium transition-colors"
            >
              🔢 TEAM 01 - 16
            </button>
            {rawText && (
              <button
                type="button"
                onClick={() => setRawText('')}
                className="px-2 py-1 rounded-md text-muted-foreground hover:text-destructive text-xs ml-auto transition-colors"
              >
                Bersihkan
              </button>
            )}
          </div>

          {/* Textarea */}
          <div>
            <label className="text-xs font-semibold block mb-1">
              Daftar Nama Tim <span className="text-muted-foreground font-normal">(Maks. 24 karakter per nama)</span>
            </label>
            <textarea
              ref={textareaRef}
              rows={7}
              placeholder={`Contoh:\n1. BIGETRON RA\n2. RRQ RYU\n3. ALTER EGO ARES\n4. BOOM ESPORTS\n...`}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              className="w-full rounded-lg border border-border bg-background p-2.5 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          {/* Mode Selector */}
          <div className="rounded-lg border border-border p-3 bg-muted/30 space-y-2">
            <span className="text-xs font-bold text-foreground block">Metode Penambahan:</span>
            <div className="flex flex-wrap gap-4 text-xs">
              <label className="flex items-center gap-2 cursor-pointer font-medium">
                <input
                  type="radio"
                  name="bulk-mode"
                  value="replace"
                  checked={mode === 'replace'}
                  onChange={() => setMode('replace')}
                  className="accent-amber-500"
                />
                <span>Ganti Semua Tim (Mulai Slot 1)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer font-medium">
                <input
                  type="radio"
                  name="bulk-mode"
                  value="append"
                  checked={mode === 'append'}
                  onChange={() => setMode('append')}
                  className="accent-amber-500"
                />
                <span>Tambahkan ke Slot Kosong (Append)</span>
              </label>
            </div>
          </div>

          {/* Preview Box */}
          {previewTeams.length > 0 && (
            <div className="rounded-lg border border-border p-3 bg-background">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold flex items-center gap-1.5">
                  <span>Pratinjau Hasil:</span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px]">
                    {previewTeams.length} Slot Terisi
                  </span>
                </span>
                {parsedNames.length > 25 && (
                  <span className="text-[11px] text-amber-400 font-medium">
                    ⚠️ {parsedNames.length - 25} tim dilewati (maks 25)
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 max-h-36 overflow-y-auto p-1 border border-border/50 rounded bg-muted/20">
                {previewTeams.map((t) => (
                  <div
                    key={t.teamNo}
                    className="flex items-center gap-1.5 px-2 py-1 rounded bg-background border border-border text-[11px]"
                  >
                    <span className="text-muted-foreground font-mono font-bold text-[10px] w-4 shrink-0 text-center">
                      {t.teamNo}
                    </span>
                    <span className="font-semibold truncate text-foreground" title={t.name}>
                      {t.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border p-4 bg-muted/20">
          <button
            type="button"
            onClick={onCancel}
            className="px-3.5 py-1.5 rounded-lg border border-border text-xs font-medium hover:bg-muted transition-colors"
          >
            Batal
          </button>

          <button
            type="button"
            disabled={previewTeams.length === 0}
            onClick={handleApply}
            className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition-all disabled:opacity-40 disabled:pointer-events-none shadow"
          >
            Terapkan {previewTeams.length > 0 ? `${previewTeams.length} Tim` : ''}
          </button>
        </div>
      </div>
    </dialog>
  );
}
