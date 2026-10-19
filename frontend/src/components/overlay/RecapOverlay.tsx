import type { MatchState, OverlayAppearance, Team, SeriesDocument } from '@cdf/shared';
import { motion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';

export interface RecapOverlayProps {
  match: MatchState;
  appearance?: OverlayAppearance;
  /** Force specific display mode */
  defaultMode?: 'all' | 'r1' | 'r2' | 'r3' | 'r4' | 'totals';
  className?: string;
  animate?: boolean;
}

export interface RoundStats {
  round: number; // 1, 2, 3, 4
  placement: number | null;
  eliminations: number;
  placementPoints: number;
  killPoints: number;
  totalPoints: number;
  played: boolean;
}

export interface TeamRecapEntry {
  teamNo: number;
  name: string;
  logoUrl: string | null;
  rounds: [RoundStats, RoundStats, RoundStats, RoundStats];
  wwcdCount: number;
  totalEliminations: number;
  totalPlacementPoints: number;
  totalPoints: number;
  rank: number;
}

type DisplayMode = 'all' | 'r1' | 'r2' | 'r3' | 'r4' | 'totals';

/**
 * Standard PUBG Mobile placement points:
 * 1st: 10, 2nd: 6, 3rd: 5, 4th: 4, 5th: 3, 6th: 2, 7th: 1, 8th: 1, 9th-16th: 0
 */
const PLACEMENT_POINTS_TABLE: Record<number, number> = {
  1: 10,
  2: 6,
  3: 5,
  4: 4,
  5: 3,
  6: 2,
  7: 1,
  8: 1,
};

function getPlacementPoints(placement: number | null): number {
  if (!placement) return 0;
  return PLACEMENT_POINTS_TABLE[placement] ?? 0;
}

export function RecapOverlay({
  match,
  appearance,
  defaultMode = 'all',
  className = 'w-screen h-screen',
  animate = true,
}: RecapOverlayProps) {
  const [mode, setMode] = useState<DisplayMode>(defaultMode);
  const [seriesDoc, setSeriesDoc] = useState<SeriesDocument | null>(null);
  const [seriesStandings, setSeriesStandings] = useState<Team[]>([]);
  const [useSampleData, setUseSampleData] = useState<boolean>(false);
  const [autoCycle, setAutoCycle] = useState<boolean>(false);

  const maxTeams = appearance?.maxTeams ?? 25;

  useEffect(() => {
    const fetchSeries = async () => {
      try {
        const res = await api.getSeries();
        setSeriesDoc(res.document);
        setSeriesStandings(res.standings ?? []);
        // Only auto-enable sample data if neither series nor match has any teams configured
        const hasAnyTeams = (match.teams && match.teams.length > 0) || (res.standings && res.standings.length > 0);
        if (res.document.closedMaps.length === 0 && !hasAnyTeams) {
          setUseSampleData(true);
        }
      } catch {
        // If error fetching series, fallback to sample data only if match has no teams
        if (!match.teams || match.teams.length === 0) {
          setUseSampleData(true);
        }
      }
    };

    void fetchSeries();
    const timer = setInterval(() => void fetchSeries(), 5000);
    return () => clearInterval(timer);
  }, [match.phase, match.teams]);

  // Auto-cycle through views if activated
  useEffect(() => {
    if (!autoCycle) return;
    const modes: DisplayMode[] = ['all', 'r1', 'r2', 'r3', 'r4', 'totals'];
    const interval = setInterval(() => {
      setMode((current) => {
        const nextIdx = (modes.indexOf(current) + 1) % modes.length;
        return modes[nextIdx];
      });
    }, 8000);
    return () => clearInterval(interval);
  }, [autoCycle]);

  // Build the unified 4-round recap dataset
  const recapTeams: TeamRecapEntry[] = useMemo(() => {
    const closedMaps = seriesDoc?.closedMaps ?? [];
    const sourceTeams =
      match.teams && match.teams.length > 0
        ? match.teams
        : seriesStandings.length > 0
          ? seriesStandings
          : [];

    // 1. If sample demo data is active or no teams exist at all
    if (useSampleData || (sourceTeams.length === 0 && closedMaps.length === 0)) {
      return generateSampleRecap(sourceTeams, maxTeams);
    }

    // 2. Build from real series + current live match, respecting maxTeams
    const targetTeams = sourceTeams.slice(0, maxTeams);

    // Map each team across round 1, 2, 3, 4
    const entries: TeamRecapEntry[] = targetTeams.map((team) => {
      const rounds: [RoundStats, RoundStats, RoundStats, RoundStats] = [
        { round: 1, placement: null, eliminations: 0, placementPoints: 0, killPoints: 0, totalPoints: 0, played: false },
        { round: 2, placement: null, eliminations: 0, placementPoints: 0, killPoints: 0, totalPoints: 0, played: false },
        { round: 3, placement: null, eliminations: 0, placementPoints: 0, killPoints: 0, totalPoints: 0, played: false },
        { round: 4, placement: null, eliminations: 0, placementPoints: 0, killPoints: 0, totalPoints: 0, played: false },
      ];

      // Populate from closed maps
      for (let r = 1; r <= 4; r++) {
        const map = closedMaps.find((m) => m.mapNumber === r);
        if (map) {
          const res = map.teams.find((t) => t.teamNo === team.teamNo);
          if (res) {
            rounds[r - 1] = {
              round: r,
              placement: res.placement,
              eliminations: res.eliminations,
              placementPoints: res.placementPoints,
              killPoints: res.killPoints,
              totalPoints: res.totalPoints,
              played: true,
            };
          }
        }
      }

      // If current match is in progress or completed and not yet in closed maps, assign it to the next round slot
      const nextRoundSlot = closedMaps.length + 1;
      if (nextRoundSlot <= 4 && match.phase !== 'idle') {
        const teamInMatch = match.teams.find((t) => t.teamNo === team.teamNo);
        if (teamInMatch) {
          const placement = teamInMatch.placement ?? (teamInMatch.isEliminated ? teamInMatch.rank : null);
          const pPoints = teamInMatch.placementPoints > 0 ? teamInMatch.placementPoints : getPlacementPoints(placement);
          const kPoints = teamInMatch.killPoints > 0 ? teamInMatch.killPoints : teamInMatch.eliminations;
          rounds[nextRoundSlot - 1] = {
            round: nextRoundSlot,
            placement,
            eliminations: teamInMatch.eliminations,
            placementPoints: pPoints,
            killPoints: kPoints,
            totalPoints: pPoints + kPoints,
            played: true,
          };
        }
      }

      const wwcdCount = rounds.filter((r) => r.placement === 1).length;
      const totalEliminations = rounds.reduce((sum, r) => sum + r.eliminations, 0);
      const totalPlacementPoints = rounds.reduce((sum, r) => sum + r.placementPoints, 0);
      const totalPoints = rounds.reduce((sum, r) => sum + r.totalPoints, 0);

      return {
        teamNo: team.teamNo,
        name: team.name,
        logoUrl: team.logoUrl,
        rounds,
        wwcdCount,
        totalEliminations,
        totalPlacementPoints,
        totalPoints,
        rank: 0,
      };
    });

    // Sort by Total Points -> WWCDs -> Placement Points -> Eliminations
    entries.sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      if (b.wwcdCount !== a.wwcdCount) return b.wwcdCount - a.wwcdCount;
      if (b.totalPlacementPoints !== a.totalPlacementPoints) return b.totalPlacementPoints - a.totalPlacementPoints;
      return b.totalEliminations - a.totalEliminations;
    });

    // Assign rank
    entries.forEach((entry, idx) => {
      entry.rank = idx + 1;
    });

    return entries;
  }, [match, seriesDoc, seriesStandings, useSampleData, maxTeams]);

  // Divide into left (Top 8) and right (Bottom 8) to frame the center PMCC golden trophy
  const half = Math.ceil(recapTeams.length / 2);
  const leftTeams = recapTeams.slice(0, half);
  const rightTeams = recapTeams.slice(half);

  const leader = recapTeams[0];

  return (
    <div
      className={`relative overflow-hidden select-none font-sans text-white bg-black ${className}`}
    >
      {/* 3D Background from PMCC stage */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/images/postgame-bg.png')" }}
      />

      {/* Atmospheric Overlays: Dark vignette and glass gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/80 pointer-events-none" />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 50% 50%, rgba(24, 18, 14, 0.25) 0%, rgba(10, 8, 6, 0.8) 75%, rgba(0, 0, 0, 0.95) 100%)',
        }}
      />

      {/* Main Container */}
      <div className="relative z-10 flex flex-col justify-between w-full h-full px-7 py-4 box-border">
        {/* TOP HEADER */}
        <header className="flex items-center justify-between border-b border-[#f5c553]/40 pb-2.5 bg-black/55 backdrop-blur-md px-5 py-2 rounded-xl shadow-[0_4px_30px_rgba(0,0,0,0.85)]">
          {/* Left Brand Badge */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-10 rounded-lg bg-gradient-to-br from-[#f5c553] via-[#ebb343] to-[#d49b35] text-[#18110a] shadow-lg border border-white/40 font-black text-lg">
              <svg className="size-5 text-[#18110a]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l2.4 7.4h7.6l-6.2 4.5 2.4 7.4-6.2-4.5-6.2 4.5 2.4-7.4-6.2-4.5h7.6z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#ffd24c] px-2 py-0.5 rounded bg-[#ffd24c]/15 border border-[#ffd24c]/30">
                  PMCC INDONESIA 2024
                </span>
                <span className="text-[10px] font-bold text-white/60 uppercase tracking-wider">
                  TOURNAMENT STANDINGS & RECAP
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wider bg-gradient-to-r from-white via-[#f5c553] to-[#e0a935] bg-clip-text text-transparent drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]">
                {mode === 'all'
                  ? 'ROUND 1 - 4 COMPREHENSIVE RECAP'
                  : mode === 'totals'
                    ? 'GRAND OVERALL STANDINGS'
                    : `ROUND ${mode.slice(1)} MATCH RECAP`}
              </h1>
            </div>
          </div>

          {/* Center Info Pill */}
          <div className="hidden lg:flex items-center gap-2.5 px-3.5 py-1 rounded-full bg-[#18120e]/95 border border-[#d49b35]/40 shadow-inner">
            <span className="text-xs font-black text-[#ffd24c] uppercase tracking-wider">
              {seriesDoc?.closedMaps ? `${seriesDoc.closedMaps.length} MAPS CLOSED` : 'SERIES LIVE'}
            </span>
            <span className="text-zinc-500">&bull;</span>
            <span className="text-xs font-semibold text-white/80">{recapTeams.length} TEAMS</span>
            <span className="text-zinc-500">&bull;</span>
            <span className="text-xs font-bold text-[#2bb0b8] uppercase">
              {useSampleData ? 'PREVIEW DEMO DATA' : 'OFFICIAL RESULTS'}
            </span>
          </div>

          {/* Right Mode Switchers & Data Toggle */}
          <div className="flex items-center gap-1.5" data-export-ignore="true">
            {/* View Mode Buttons */}
            <div className="flex items-center bg-[#18120e]/90 p-0.5 rounded-lg border border-[#d49b35]/35">
              {(
                [
                  ['all', 'ALL (R1-R4)'],
                  ['r1', 'R1'],
                  ['r2', 'R2'],
                  ['r3', 'R3'],
                  ['r4', 'R4'],
                  ['totals', 'TOTALS'],
                ] as const
              ).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setMode(val)}
                  className={`px-2.5 py-1 rounded text-[11px] font-black transition-all cursor-pointer ${
                    mode === val
                      ? 'bg-gradient-to-r from-[#ffd24c] to-[#d49b35] text-[#18110a] shadow'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Auto Cycle Button */}
            <button
              type="button"
              onClick={() => setAutoCycle((v) => !v)}
              className={`text-[11px] font-bold px-2 py-1 rounded-lg border transition-all cursor-pointer ${
                autoCycle
                  ? 'bg-emerald-600/90 text-white border-emerald-400'
                  : 'bg-[#221812] text-zinc-400 hover:text-zinc-200 border-[#d49b35]/40'
              }`}
              title="Otomatis rotasi halaman round setiap 8 detik"
            >
              {autoCycle ? 'Auto: ON' : 'Auto: OFF'}
            </button>

            {/* Toggle Data Source (Live / Demo) */}
            <button
              type="button"
              onClick={() => setUseSampleData((v) => !v)}
              className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer shadow ${
                useSampleData
                  ? 'bg-[#8b1e1e]/90 hover:bg-[#a32222] text-[#ffd24c] border-[#ffd24c]/50'
                  : 'bg-[#18120e] hover:bg-[#2a1d15] text-[#2bb0b8] border-[#2bb0b8]/40'
              }`}
              title="Beralih antara Hasil Series Asli dan Demo Data PMCC"
            >
              {useSampleData ? 'Mode: Demo' : 'Mode: Live Series'}
            </button>
          </div>
        </header>

        {/* MAIN BODY: 2 Columns framing the Golden Trophy in the Center */}
        <div className="flex-1 flex items-stretch justify-between gap-4 my-2 min-h-0 w-full overflow-hidden">
          {/* LEFT COLUMN: RANKS 1 - 13 */}
          <div className="flex-1 min-w-0 flex flex-col justify-between bg-black/65 backdrop-blur-md rounded-xl p-2.5 border border-[#d49b35]/40 shadow-[0_8px_32px_rgba(0,0,0,0.9)]">
            <RecapTableHeader mode={mode} label={`RANKS 1 - ${leftTeams.length}`} />
            <div className="flex-1 flex flex-col justify-between gap-1 mt-1.5 overflow-hidden">
              {leftTeams.map((team, index) =>
                animate ? (
                  <motion.div
                    key={team.teamNo}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.02, duration: 0.25 }}
                    className="flex-1 min-h-0"
                  >
                    <RecapTeamRow team={team} mode={mode} isLeader={team.rank === 1} />
                  </motion.div>
                ) : (
                  <div key={team.teamNo} className="flex-1 min-h-0">
                    <RecapTeamRow team={team} mode={mode} isLeader={team.rank === 1} />
                  </div>
                ),
              )}
            </div>
          </div>

          {/* CENTER TROPHY FRAMING GAP: Leaves PMCC 3D Trophy fully visible */}
          <div className="w-[130px] xl:w-[160px] shrink-0 flex flex-col items-center justify-end pb-3 pointer-events-none">
            {leader && (
              <div className="flex flex-col items-center text-center px-3 py-2 rounded-xl bg-black/80 backdrop-blur-md border border-[#f5c553]/70 shadow-[0_0_30px_rgba(245,197,83,0.4)] animate-pulse">
                <span className="text-[9px] font-black uppercase tracking-widest text-[#ffd24c]">
                  #1 CURRENT LEADER
                </span>
                <span className="text-sm font-black uppercase text-white truncate max-w-[150px]">
                  {leader.name}
                </span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[10px] font-bold text-[#ffd24c] bg-[#ffd24c]/20 px-1.5 py-0.2 rounded border border-[#ffd24c]/40">
                    {leader.wwcdCount} WWCD
                  </span>
                  <span className="text-[11px] font-black text-[#f5c553]">
                    {leader.totalPoints} PTS
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: RANKS 14 - 25 */}
          <div className="flex-1 min-w-0 flex flex-col justify-between bg-black/65 backdrop-blur-md rounded-xl p-2.5 border border-[#d49b35]/40 shadow-[0_8px_32px_rgba(0,0,0,0.9)]">
            <RecapTableHeader
              mode={mode}
              label={rightTeams.length > 0 ? `RANKS ${leftTeams.length + 1} - ${recapTeams.length}` : 'STANDINGS'}
            />
            <div className="flex-1 flex flex-col justify-between gap-1 mt-1.5 overflow-hidden">
              {rightTeams.map((team, index) =>
                animate ? (
                  <motion.div
                    key={team.teamNo}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: (index + leftTeams.length) * 0.02, duration: 0.25 }}
                    className="flex-1 min-h-0"
                  >
                    <RecapTeamRow team={team} mode={mode} isLeader={false} />
                  </motion.div>
                ) : (
                  <div key={team.teamNo} className="flex-1 min-h-0">
                    <RecapTeamRow team={team} mode={mode} isLeader={false} />
                  </div>
                ),
              )}
            </div>
          </div>
        </div>

        {/* BOTTOM FOOTER */}
        <footer className="flex items-center justify-between border-t border-[#f5c553]/40 pt-2 px-5 bg-black/60 backdrop-blur-md rounded-xl">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-[#f5c553] animate-pulse" />
            <span className="text-[11px] font-black uppercase tracking-wider text-white/90">
              PUBG MOBILE CAMPUS CHALLENGE INDONESIA 2024
            </span>
          </div>

          {/* Explanatory Legend */}
          <div className="hidden md:flex items-center gap-4 text-[10px] font-semibold text-white/70">
            <span>
              <strong className="text-[#ffd24c]">#P:</strong> Placement
            </span>
            <span>&bull;</span>
            <span>
              <strong className="text-[#2bb0b8]">K:</strong> Kills / Eliminations
            </span>
            <span>&bull;</span>
            <span>
              <strong className="text-[#d49b35]">PTS:</strong> Total Round / Overall Points
            </span>
            <span>&bull;</span>
            <span>
              <strong className="text-[#ffd24c]">WWCD:</strong> Winner Winner Chicken Dinner
            </span>
          </div>

          <div className="text-[11px] font-black tracking-widest text-[#ffd24c] uppercase">
            #BE THE ONE
          </div>
        </footer>
      </div>
    </div>
  );
}

/**
 * Table Header depending on current display mode
 */
function RecapTableHeader({ mode, label }: { mode: DisplayMode; label: string }) {
  if (mode === 'all') {
    return (
      <div className="flex items-center justify-between px-2.5 py-1 rounded-lg bg-gradient-to-r from-[#221812] to-[#140e0a] border-b border-[#d49b35]/40 text-[10px] font-black uppercase tracking-wider text-white/80">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-6 text-center text-[#ffd24c] shrink-0">#</span>
          <span className="truncate">{label}</span>
        </div>
        <div className="flex items-center gap-2 text-center font-mono shrink-0">
          <span className="w-16 text-[#ffd24c]/90">R1</span>
          <span className="w-16 text-[#ffd24c]/90">R2</span>
          <span className="w-16 text-[#ffd24c]/90">R3</span>
          <span className="w-16 text-[#ffd24c]/90">R4</span>
          <span className="w-10 text-[#ffd24c]">WWCD</span>
          <span className="w-11 text-[#2bb0b8]">KILL</span>
          <span className="w-14 text-right pr-1 text-[#ffd24c]">TOTAL</span>
        </div>
      </div>
    );
  }

  if (mode === 'totals') {
    return (
      <div className="flex items-center justify-between px-2.5 py-1 rounded-lg bg-gradient-to-r from-[#221812] to-[#140e0a] border-b border-[#d49b35]/40 text-[10px] font-black uppercase tracking-wider text-white/80">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-6 text-center text-[#ffd24c] shrink-0">#</span>
          <span className="truncate">{label}</span>
        </div>
        <div className="flex items-center gap-4 text-right font-mono shrink-0">
          <span className="w-14 text-[#ffd24c]">WWCD</span>
          <span className="w-14 text-[#2bb0b8]">ELIMS</span>
          <span className="w-16 text-[#d49b35]">PLACE PTS</span>
          <span className="w-16 text-[#ffd24c]">TOTAL PTS</span>
        </div>
      </div>
    );
  }

  // Single Round Mode (R1, R2, R3, R4)
  const roundNum = mode.slice(1);
  return (
    <div className="flex items-center justify-between px-2.5 py-1 rounded-lg bg-gradient-to-r from-[#221812] to-[#140e0a] border-b border-[#d49b35]/40 text-[10px] font-black uppercase tracking-wider text-white/80">
      <div className="flex items-center gap-2 min-w-0">
        <span className="w-6 text-center text-[#ffd24c] shrink-0">#</span>
        <span className="truncate">{label}</span>
      </div>
      <div className="flex items-center gap-4 text-right font-mono shrink-0">
        <span className="w-14 text-[#ffd24c]">ROUND #{roundNum}</span>
        <span className="w-14 text-[#2bb0b8]">KILLS</span>
        <span className="w-16 text-[#d49b35]">PLACE PTS</span>
        <span className="w-16 text-[#ffd24c]">ROUND PTS</span>
      </div>
    </div>
  );
}

/**
 * Single Team Row Card
 */
function RecapTeamRow({
  team,
  mode,
  isLeader,
}: {
  team: TeamRecapEntry;
  mode: DisplayMode;
  isLeader: boolean;
}) {
  const isTop3 = team.rank <= 3;

  return (
    <div
      className={`flex items-center justify-between px-2.5 py-1 h-full rounded-lg transition-all border ${
        isLeader
          ? 'bg-gradient-to-r from-[#8b1e1e]/90 via-[#2a1710]/95 to-[#1c120c]/95 border-[#ffd24c] shadow-[0_0_15px_rgba(245,197,83,0.35)]'
          : isTop3
            ? 'bg-gradient-to-r from-[#2a1d15]/90 to-[#18120e]/95 border-[#d49b35]/60 hover:border-[#ffd24c]'
            : 'bg-[#18120e]/85 border-[#d49b35]/25 hover:border-[#d49b35]/50'
      }`}
    >
      {/* Left: Rank Badge + Team Name */}
      <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
        <div
          className={`flex items-center justify-center size-6 rounded-md font-black text-xs shrink-0 shadow ${
            isLeader
              ? 'bg-gradient-to-br from-[#ffd24c] via-[#f5c553] to-[#d49b35] text-[#18110a] border border-white'
              : team.rank === 2
                ? 'bg-gradient-to-br from-zinc-200 to-zinc-400 text-black border border-white/40'
                : team.rank === 3
                  ? 'bg-gradient-to-br from-[#d49b35] to-[#8a5d1b] text-white border border-white/20'
                  : team.rank <= 8
                    ? 'bg-[#16252c] text-[#ffd24c] border border-[#d49b35]/30'
                    : 'bg-black/60 text-zinc-400 border border-zinc-800'
          }`}
        >
          #{team.rank}
        </div>

        <div className="flex items-center gap-1.5 min-w-0 truncate">
          <span
            className={`font-black text-xs uppercase tracking-wide truncate max-w-[170px] ${
              isLeader ? 'text-[#ffd24c] drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]' : 'text-white'
            }`}
          >
            {team.name}
          </span>

          {team.wwcdCount > 0 && mode !== 'all' && (
            <span className="text-[8px] font-black uppercase px-1 py-0.2 rounded bg-[#ffd24c] text-[#18110a] shrink-0">
              {team.wwcdCount}W
            </span>
          )}
        </div>
      </div>

      {/* Right Stats Columns */}
      {mode === 'all' && (
        <div className="flex items-center gap-2 text-center font-mono shrink-0">
          {/* R1, R2, R3, R4 Mini Pills */}
          {team.rounds.map((r) => (
            <RoundMiniPill key={r.round} stats={r} />
          ))}

          {/* WWCD Count */}
          <div className="w-10 flex items-center justify-center shrink-0">
            {team.wwcdCount > 0 ? (
              <span className="px-1.5 py-0.5 rounded bg-[#ffd24c]/20 text-[#ffd24c] border border-[#ffd24c]/50 font-black text-[10px]">
                {team.wwcdCount}🍗
              </span>
            ) : (
              <span className="text-zinc-600 text-xs">-</span>
            )}
          </div>

          {/* Total Kills */}
          <span className="w-11 text-xs font-bold text-[#2bb0b8] tabular-nums shrink-0">
            {team.totalEliminations}
          </span>

          {/* Grand Total Points Badge */}
          <div className="w-14 flex justify-end shrink-0">
            <span
              className={`px-2 py-0.5 rounded text-xs font-black tabular-nums shadow-sm border ${
                isLeader
                  ? 'bg-gradient-to-r from-[#ffd24c] to-[#f5c553] text-[#18110a] border-white'
                  : isTop3
                    ? 'bg-[#16252c] text-[#ffd24c] border-[#ffd24c]/50'
                    : 'bg-black/60 text-white border-zinc-700'
              }`}
            >
              {team.totalPoints}
            </span>
          </div>
        </div>
      )}

      {mode === 'totals' && (
        <div className="flex items-center gap-4 text-right font-mono shrink-0">
          <div className="w-14 flex justify-end">
            {team.wwcdCount > 0 ? (
              <span className="px-2 py-0.5 rounded bg-[#ffd24c]/20 text-[#ffd24c] border border-[#ffd24c]/50 font-black text-xs">
                {team.wwcdCount} WWCD
              </span>
            ) : (
              <span className="text-zinc-600 text-xs">0</span>
            )}
          </div>

          <span className="w-14 text-xs font-bold text-[#2bb0b8] tabular-nums">
            {team.totalEliminations}
          </span>

          <span className="w-16 text-xs font-semibold text-[#d49b35] tabular-nums">
            {team.totalPlacementPoints}
          </span>

          <div className="w-16 flex justify-end">
            <span
              className={`px-2 py-0.5 rounded text-xs font-black tabular-nums shadow-sm border ${
                isLeader
                  ? 'bg-gradient-to-r from-[#ffd24c] to-[#f5c553] text-[#18110a] border-white'
                  : isTop3
                    ? 'bg-[#16252c] text-[#ffd24c] border-[#ffd24c]/50'
                    : 'bg-black/60 text-white border-zinc-700'
              }`}
            >
              {team.totalPoints}
            </span>
          </div>
        </div>
      )}

      {mode !== 'all' && mode !== 'totals' && (
        <SingleRoundRowStats team={team} roundNum={Number(mode.slice(1))} isLeader={isLeader} isTop3={isTop3} />
      )}
    </div>
  );
}

/**
 * Mini cell pill for R1, R2, R3, R4 in comprehensive mode
 */
function RoundMiniPill({ stats }: { stats: RoundStats }) {
  if (!stats.played) {
    return (
      <div className="w-16 h-7 flex items-center justify-center rounded bg-black/35 border border-zinc-800 text-zinc-600 text-[10px]">
        -
      </div>
    );
  }

  const isWWCD = stats.placement === 1;

  return (
    <div
      className={`w-16 h-7 px-1 flex flex-col justify-center rounded border transition-all ${
        isWWCD
          ? 'bg-gradient-to-r from-[#8a681c]/50 to-[#5a3e0f]/50 border-[#ffd24c] shadow-[0_0_8px_rgba(245,197,83,0.3)]'
          : stats.placement && stats.placement <= 3
            ? 'bg-black/55 border-[#d49b35]/40'
            : 'bg-black/40 border-zinc-800/80'
      }`}
    >
      <div className="flex items-center justify-between text-[9px] leading-tight">
        <span
          className={`font-black ${
            isWWCD
              ? 'text-[#ffd24c]'
              : stats.placement && stats.placement <= 3
                ? 'text-white'
                : 'text-zinc-400'
          }`}
        >
          {isWWCD ? '👑 #1' : stats.placement ? `#${stats.placement}` : '-'}
        </span>
        <span className="text-[#2bb0b8] font-bold">{stats.eliminations}k</span>
      </div>
      <div className="flex items-center justify-between mt-0.2 text-[10px] font-mono leading-none">
        <span className="text-[8px] text-zinc-500 uppercase">PTS</span>
        <span className={`font-black ${isWWCD ? 'text-[#ffd24c]' : 'text-white/90'}`}>
          {stats.totalPoints}
        </span>
      </div>
    </div>
  );
}

/**
 * Detail row when focusing on one specific round
 */
function SingleRoundRowStats({
  team,
  roundNum,
  isLeader,
  isTop3,
}: {
  team: TeamRecapEntry;
  roundNum: number;
  isLeader: boolean;
  isTop3: boolean;
}) {
  const round = team.rounds[roundNum - 1];

  if (!round || !round.played) {
    return (
      <div className="flex items-center gap-4 text-right font-mono text-zinc-600 text-xs">
        <span className="w-14">-</span>
        <span className="w-14">-</span>
        <span className="w-16">-</span>
        <span className="w-16">-</span>
      </div>
    );
  }

  const isWWCD = round.placement === 1;

  return (
    <div className="flex items-center gap-4 text-right font-mono shrink-0">
      <div className="w-14 flex justify-end">
        <span
          className={`px-1.5 py-0.5 rounded text-[11px] font-black ${
            isWWCD
              ? 'bg-[#ffd24c] text-[#18110a] shadow'
              : round.placement && round.placement <= 3
                ? 'bg-zinc-300 text-black'
                : 'bg-black/60 text-white'
          }`}
        >
          {isWWCD ? 'WWCD' : `#${round.placement}`}
        </span>
      </div>

      <span className="w-14 text-xs font-bold text-[#2bb0b8] tabular-nums">
        {round.eliminations}
      </span>

      <span className="w-16 text-xs font-semibold text-[#d49b35] tabular-nums">
        {round.placementPoints}
      </span>

      <div className="w-16 flex justify-end">
        <span
          className={`px-2 py-0.5 rounded text-xs font-black tabular-nums shadow-sm border ${
            isLeader
              ? 'bg-gradient-to-r from-[#ffd24c] to-[#f5c553] text-[#18110a] border-white'
              : isTop3
                ? 'bg-[#16252c] text-[#ffd24c] border-[#ffd24c]/50'
                : 'bg-black/60 text-white border-zinc-700'
          }`}
        >
          {round.totalPoints}
        </span>
      </div>
    </div>
  );
}

/**
 * Generates realistic PMCC 4-round tournament recap sample data
 */
function generateSampleRecap(existingTeams: Team[], count: number = 25): TeamRecapEntry[] {
  const sampleNames = [
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
    'EVOS REBORN',
    'AURA ESPORTS',
    'ONIC ESPORTS',
    'NFT ESPORTS',
    'GPX BASRENG',
    'BNET ESPORTS',
    'HFX ESPORTS',
    'ARF TEAM',
    'VICTORY ESPORTS',
  ];

  // Realistic rounds outcomes: [placement, kills] for R1, R2, R3, R4
  const samplePerformance: [number, number][][] = [
    [[1, 8], [4, 6], [1, 11], [2, 9]],   // Rank 1
    [[3, 6], [1, 9], [5, 4], [1, 10]],   // Rank 2
    [[2, 9], [2, 7], [3, 5], [4, 6]],    // Rank 3
    [[4, 5], [3, 8], [2, 8], [7, 3]],    // Rank 4
    [[5, 4], [6, 4], [4, 7], [3, 7]],    // Rank 5
    [[6, 6], [5, 5], [6, 3], [5, 5]],    // Rank 6
    [[7, 3], [7, 3], [7, 4], [6, 6]],    // Rank 7
    [[8, 2], [8, 4], [8, 3], [8, 4]],    // Rank 8
    [[9, 4], [10, 2], [9, 3], [9, 3]],   // Rank 9
    [[10, 3], [9, 3], [12, 1], [10, 3]], // Rank 10
    [[11, 2], [12, 1], [10, 3], [11, 2]],// Rank 11
    [[12, 2], [11, 2], [11, 2], [13, 1]],// Rank 12
    [[13, 1], [14, 1], [13, 2], [12, 2]],// Rank 13
    [[14, 2], [13, 1], [14, 1], [14, 1]],// Rank 14
    [[15, 1], [15, 1], [15, 0], [15, 1]],// Rank 15
    [[16, 0], [16, 0], [16, 1], [16, 0]],// Rank 16
    [[17, 2], [18, 1], [17, 1], [17, 1]],// Rank 17
    [[18, 1], [17, 1], [19, 0], [18, 2]],// Rank 18
    [[19, 1], [20, 0], [18, 1], [19, 1]],// Rank 19
    [[20, 0], [19, 1], [20, 1], [20, 0]],// Rank 20
    [[21, 1], [21, 0], [21, 1], [22, 0]],// Rank 21
    [[22, 0], [22, 1], [22, 0], [21, 1]],// Rank 22
    [[23, 0], [24, 0], [23, 1], [23, 0]],// Rank 23
    [[24, 1], [23, 0], [24, 0], [24, 0]],// Rank 24
    [[25, 0], [25, 0], [25, 0], [25, 0]],// Rank 25
  ];

  const totalToGenerate = Math.min(Math.max(count, 1), 25);

  return Array.from({ length: totalToGenerate }, (_, idx) => {
    const teamNo = idx + 1;
    const teamName = existingTeams[idx]?.name || sampleNames[idx] || `TEAM ${teamNo}`;
    const logoUrl = existingTeams[idx]?.logoUrl || null;
    const perf = samplePerformance[idx] || [[idx + 1, 0], [idx + 1, 0], [idx + 1, 0], [idx + 1, 0]];

    const rounds: [RoundStats, RoundStats, RoundStats, RoundStats] = [
      buildRound(1, perf[0][0], perf[0][1]),
      buildRound(2, perf[1][0], perf[1][1]),
      buildRound(3, perf[2][0], perf[2][1]),
      buildRound(4, perf[3][0], perf[3][1]),
    ];

    const wwcdCount = rounds.filter((r) => r.placement === 1).length;
    const totalEliminations = rounds.reduce((sum, r) => sum + r.eliminations, 0);
    const totalPlacementPoints = rounds.reduce((sum, r) => sum + r.placementPoints, 0);
    const totalPoints = rounds.reduce((sum, r) => sum + r.totalPoints, 0);

    return {
      teamNo,
      name: teamName,
      logoUrl,
      rounds,
      wwcdCount,
      totalEliminations,
      totalPlacementPoints,
      totalPoints,
      rank: idx + 1,
    };
  });
}

function buildRound(round: number, placement: number, eliminations: number): RoundStats {
  const pPoints = getPlacementPoints(placement);
  return {
    round,
    placement,
    eliminations,
    placementPoints: pPoints,
    killPoints: eliminations,
    totalPoints: pPoints + eliminations,
    played: true,
  };
}
