import { useState } from 'react';
import type { TeamRosterDocument, TeamRosterEntry } from '@cdf/shared';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { BulkAddTeamsDialog } from './BulkAddTeamsDialog';

export interface TeamRosterEditorProps {
  document: TeamRosterDocument;
  onChange(document: TeamRosterDocument): void;
}

/**
 * Team names, keyed by PCOB team number.
 *
 * The team number is not editable in place: it is the join key to the live data
 * (specs/PCOB-FINDINGS.md §3), so changing it silently re-points a row at a different squad. Adding
 * and removing rows is how the roster changes shape.
 *
 * There is exactly one name field, not a long one plus a derived short one — matching the ini,
 * which only ever has a single `TeamName=` value per team.
 */
export function TeamRosterEditor({ document, onChange }: TeamRosterEditorProps) {
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [isConfirmClearOpen, setIsConfirmClearOpen] = useState(false);

  const patch = (teamNo: number, changes: Partial<TeamRosterEntry>) =>
    onChange({
      ...document,
      teams: document.teams.map((team) =>
        team.teamNo === teamNo ? { ...team, ...changes } : team,
      ),
    });

  const nextFreeTeamNo = (): number => {
    const used = new Set(document.teams.map((team) => team.teamNo));
    for (let candidate = 1; candidate <= 25; candidate += 1) {
      if (!used.has(candidate)) return candidate;
    }
    return 25;
  };

  const sortedTeams = [...document.teams].sort((a, b) => a.teamNo - b.teamNo);

  const handleBulkApply = (newTeams: TeamRosterEntry[]) => {
    setIsBulkOpen(false);
    onChange({
      ...document,
      teams: newTeams,
    });
  };

  const handleClearAll = () => {
    setIsConfirmClearOpen(false);
    onChange({
      ...document,
      teams: [],
    });
  };

  return (
    <div className="grid gap-3">
      {/* Top Description & Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
        <div>
          <p className="text-muted-foreground text-xs">
            Nomor slot adalah nomor tim di dalam game (1–25). Nama tim adalah yang akan tampil pada seluruh
            overlay siaran.
          </p>
          <span className="text-xs font-semibold text-foreground mt-0.5 inline-block">
            Terisi: <strong className="text-amber-400 font-mono">{document.teams.length}</strong> / 25 slot
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsBulkOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-500/50 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 text-xs font-bold transition-all shadow-sm"
            title="Tambah atau paste daftar tim sekaligus banyak"
          >
            <span>⚡</span> Bulk Add / Paste Tim
          </button>

          {document.teams.length > 0 && (
            <button
              type="button"
              onClick={() => setIsConfirmClearOpen(true)}
              className="px-2.5 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              title="Kosongkan seluruh daftar tim"
            >
              Hapus Semua
            </button>
          )}
        </div>
      </div>

      {/* Empty State */}
      {sortedTeams.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center bg-muted/10 space-y-3">
          <p className="text-muted-foreground text-sm">Belum ada tim yang ditambahkan ke roster.</p>
          <div className="flex justify-center gap-2">
            <button
              type="button"
              onClick={() => setIsBulkOpen(true)}
              className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition-all shadow"
            >
              ⚡ Bulk Tambah / Paste Tim
            </button>
            <button
              type="button"
              className="border-border rounded border px-3 py-1.5 text-xs font-medium hover:bg-secondary"
              onClick={() => {
                onChange({
                  ...document,
                  teams: [{ teamNo: 1, name: 'Team 1', logoUrl: null }],
                });
              }}
            >
              + Tambah 1 Tim
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-2">
          {sortedTeams.map((team) => (
            <div
              key={team.teamNo}
              className="grid grid-cols-[2.5rem_1fr_2rem] items-center gap-2 rounded-lg border border-border/60 bg-card/60 p-1.5 px-2 hover:border-border transition-colors"
            >
              <span className="text-muted-foreground text-center text-sm tabular-nums font-bold">
                {team.teamNo}
              </span>
              <input
                type="text"
                aria-label={`Team ${team.teamNo} name`}
                maxLength={24}
                className="border-border bg-background rounded border px-3 py-1.5 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-amber-500"
                value={team.name}
                onChange={(event) => patch(team.teamNo, { name: event.target.value })}
              />
              <button
                type="button"
                aria-label={`Remove team ${team.teamNo}`}
                className="text-muted-foreground hover:text-destructive text-lg font-bold flex items-center justify-center size-7 rounded hover:bg-muted transition-colors"
                onClick={() =>
                  onChange({
                    ...document,
                    teams: document.teams.filter((entry) => entry.teamNo !== team.teamNo),
                  })
                }
                title={`Hapus Team ${team.teamNo}`}
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Bottom Buttons */}
      <div className="flex flex-wrap items-center gap-2 pt-2">
        <button
          type="button"
          className="border-border rounded-lg border px-3 py-1.5 text-xs font-semibold hover:bg-secondary disabled:opacity-40 transition-colors"
          disabled={document.teams.length >= 25}
          onClick={() => {
            const teamNo = nextFreeTeamNo();
            onChange({
              ...document,
              teams: [...document.teams, { teamNo, name: `T${teamNo}`, logoUrl: null }],
            });
          }}
        >
          + Tambah 1 Tim
        </button>

        <button
          type="button"
          onClick={() => setIsBulkOpen(true)}
          className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-300 hover:bg-amber-500/20 transition-colors"
        >
          ⚡ Bulk Add / Paste Tim
        </button>
      </div>

      {/* Bulk Add Modal */}
      <BulkAddTeamsDialog
        open={isBulkOpen}
        document={document}
        onCancel={() => setIsBulkOpen(false)}
        onApply={handleBulkApply}
      />

      {/* Confirm Clear Modal */}
      <ConfirmDialog
        open={isConfirmClearOpen}
        title="Kosongkan Semua Tim?"
        confirmLabel="Ya, Kosongkan Roster"
        cancelLabel="Batal"
        destructive
        onConfirm={handleClearAll}
        onCancel={() => setIsConfirmClearOpen(false)}
      >
        <p>
          Tindakan ini akan menghapus seluruh daftar {document.teams.length} tim yang ada saat ini. Anda dapat
          menambahkan kembali tim secara manual atau menggunakan <strong>Bulk Add Tim</strong> setelahnya.
        </p>
      </ConfirmDialog>
    </div>
  );
}
