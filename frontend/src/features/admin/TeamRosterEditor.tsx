import type { TeamRosterDocument, TeamRosterEntry } from '@cdf/shared';

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

  return (
    <div className="grid gap-3">
      <p className="text-muted-foreground text-xs">
        Nomor slot adalah nomor tim di dalam game (1–25). Nama tim adalah yang akan tampil pada seluruh
        overlay siaran. Klik <strong>Save teams</strong> untuk menyimpan perubahan nama tim.
      </p>

      <div className="grid gap-2">
        {[...document.teams]
          .sort((a, b) => a.teamNo - b.teamNo)
          .map((team) => (
            <div
              key={team.teamNo}
              className="grid grid-cols-[2.5rem_1fr_2rem] items-center gap-2"
            >
              <span className="text-muted-foreground text-center text-sm tabular-nums font-bold">
                {team.teamNo}
              </span>
              <input
                type="text"
                aria-label={`Team ${team.teamNo} name`}
                maxLength={24}
                className="border-border bg-background rounded border px-3 py-1.5 text-sm font-semibold"
                value={team.name}
                onChange={(event) => patch(team.teamNo, { name: event.target.value })}
              />
              <button
                type="button"
                aria-label={`Remove team ${team.teamNo}`}
                className="text-muted-foreground hover:text-destructive text-sm"
                onClick={() =>
                  onChange({
                    ...document,
                    teams: document.teams.filter((entry) => entry.teamNo !== team.teamNo),
                  })
                }
              >
                ×
              </button>
            </div>
          ))}
      </div>

      <button
        type="button"
        className="border-border w-fit rounded border px-3 py-1.5 text-xs disabled:opacity-40"
        disabled={document.teams.length >= 25}
        onClick={() => {
          const teamNo = nextFreeTeamNo();
          onChange({
            ...document,
            teams: [...document.teams, { teamNo, name: `T${teamNo}`, logoUrl: null }],
          });
        }}
      >
        Add a team
      </button>
    </div>
  );
}
