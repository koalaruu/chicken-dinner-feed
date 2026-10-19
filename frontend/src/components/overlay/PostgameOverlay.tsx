import type { MatchState, OverlayAppearance, Team } from '@cdf/shared';
import { motion } from 'motion/react';
import { useState } from 'react';

export interface PostgameOverlayProps {
  match: MatchState;
  appearance?: OverlayAppearance;
  /** Force specific display mode: 'match' (single match result) or 'series' (accumulated) */
  defaultMode?: 'match' | 'series';
  className?: string;
  animate?: boolean;
}

export function PostgameOverlay({
  match,
  defaultMode = 'match',
  className = 'w-screen h-screen',
  animate = true,
}: PostgameOverlayProps) {
  const [mode, setMode] = useState<'match' | 'series'>(defaultMode);

  // Teams sorted by rank (displays all teams)
  const sortedTeams = [...match.teams].sort((a, b) => a.rank - b.rank);

  // Distribute all teams evenly into left and right columns
  const half = Math.ceil(sortedTeams.length / 2);
  const leftTeams = sortedTeams.slice(0, half);
  const rightTeams = sortedTeams.slice(half);

  const winner = sortedTeams[0];

  return (
    <div
      className={`relative overflow-hidden select-none font-sans text-white bg-black ${className}`}
    >
      {/* 3D Background from PMCC stage (0001.png) */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/images/postgame-bg.png')" }}
      />

      {/* Atmospheric Overlays: Vignette and dark glass to keep trophy visible in center */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/75 pointer-events-none" />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 50% 50%, rgba(24, 18, 14, 0.2) 0%, rgba(10, 8, 6, 0.75) 75%, rgba(0, 0, 0, 0.92) 100%)',
        }}
      />

      {/* Main Content Layout */}
      <div className="relative z-10 flex flex-col justify-between w-full h-full px-8 py-5 box-border">
        {/* TOP HEADER */}
        <header className="flex items-center justify-between border-b border-[#f5c553]/40 pb-3 bg-black/40 backdrop-blur-md px-6 py-2.5 rounded-xl shadow-[0_4px_30px_rgba(0,0,0,0.8)]">
          {/* Left Brand Badge */}
          <div className="flex items-center gap-3.5">
            <div className="flex items-center justify-center size-11 rounded-lg bg-gradient-to-br from-[#f5c553] via-[#ebb343] to-[#d49b35] text-[#18110a] shadow-lg border border-white/30 font-black text-lg">
              <svg className="size-6 text-[#18110a]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2l2.4 7.4h7.6l-6.2 4.5 2.4 7.4-6.2-4.5-6.2 4.5 2.4-7.4-6.2-4.5h7.6z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#ffd24c] px-2 py-0.5 rounded bg-[#ffd24c]/10 border border-[#ffd24c]/30">
                  PMCC INDONESIA 2024
                </span>
                <span className="text-[10px] font-bold text-white/60 uppercase tracking-wider">
                  PENS ESPORTS BROADCAST
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-wider bg-gradient-to-r from-white via-[#f5c553] to-[#e0a935] bg-clip-text text-transparent drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]">
                {mode === 'match' ? 'MATCH STANDINGS' : 'OVERALL STANDINGS'}
              </h1>
            </div>
          </div>

          {/* Center Match Info Pill */}
          <div className="hidden md:flex items-center gap-3 px-4 py-1.5 rounded-full bg-[#18120e]/90 border border-[#d49b35]/40 shadow-inner">
            <span className="text-xs font-black text-[#ffd24c] uppercase tracking-wider">
              {match.matchId ? `MATCH: ${match.matchId}` : 'MATCH COMPLETED'}
            </span>
            <span className="text-zinc-500">&bull;</span>
            <span className="text-xs font-semibold text-white/80">{sortedTeams.length} TEAMS</span>
            <span className="text-zinc-500">&bull;</span>
            <span className="text-xs font-bold text-[#2bb0b8] uppercase">
              {match.phase === 'ended' ? 'FINAL RESULTS' : 'LIVE ACCUMULATED'}
            </span>
          </div>

          {/* Right Mode Toggle / Winner Spotlight */}
          <div className="flex items-center gap-2">
            {winner && (
              <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-lg bg-gradient-to-r from-[#ffd24c]/20 to-transparent border border-[#ffd24c]/40">
                <span className="text-xs font-black text-[#ffd24c]">WWCD:</span>
                <span className="text-xs font-black uppercase text-white truncate max-w-[120px]">
                  {winner.name}
                </span>
              </div>
            )}

            <button
              type="button"
              data-export-ignore="true"
              onClick={() => setMode((m) => (m === 'match' ? 'series' : 'match'))}
              className="text-xs font-bold px-3 py-1.5 rounded-lg bg-[#221812] hover:bg-[#2d2018] border border-[#d49b35]/50 text-[#f5c553] transition-all cursor-pointer shadow"
              title="Klik untuk beralih antara Hasil Match dan Akumulasi Turnamen"
            >
              Mode: <span className="underline">{mode === 'match' ? 'Match' : 'Overall'}</span>
            </button>
          </div>
        </header>

        {/* CENTER TABLES SECTION: 2 Columns framing the Golden Trophy in the Center */}
        <div className="flex-1 flex items-stretch justify-between gap-5 my-3 min-h-0 w-full overflow-hidden">
          {/* LEFT COLUMN */}
          <div className="flex-1 min-w-0 flex flex-col justify-between bg-black/60 backdrop-blur-md rounded-xl p-3 border border-[#d49b35]/40 shadow-[0_8px_32px_rgba(0,0,0,0.85)]">
            <TableHeader label={leftTeams.length > 0 ? `RANKS 1 - ${leftTeams.length}` : 'STANDINGS'} />
            <div className="flex-1 flex flex-col justify-between gap-1.5 mt-2 overflow-hidden">
              {leftTeams.map((team, index) =>
                animate ? (
                  <motion.div
                    key={team.teamNo}
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03, duration: 0.3 }}
                    className="flex-1 min-h-0"
                  >
                    <TeamRowCard team={team} isWinner={team.rank === 1} />
                  </motion.div>
                ) : (
                  <div key={team.teamNo} className="flex-1 min-h-0">
                    <TeamRowCard team={team} isWinner={team.rank === 1} />
                  </div>
                ),
              )}
            </div>
          </div>

          {/* CENTER TROPHY FRAMING GAP: Leaves PMCC 3D Trophy fully visible */}
          <div className="w-[140px] xl:w-[170px] shrink-0 flex flex-col items-center justify-end pb-4 pointer-events-none">
            {winner && (
              <div className="flex flex-col items-center text-center px-3 py-2 rounded-xl bg-black/70 backdrop-blur-md border border-[#f5c553]/60 shadow-[0_0_30px_rgba(245,197,83,0.35)] animate-pulse">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#ffd24c]">
                  CHICKEN DINNER
                </span>
                <span className="text-sm font-black uppercase text-white truncate max-w-[160px]">
                  {winner.name}
                </span>
                <span className="text-[10px] font-extrabold text-[#d49b35]">
                  {winner.totalPoints} TOTAL PTS
                </span>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN */}
          <div className="flex-1 min-w-0 flex flex-col justify-between bg-black/60 backdrop-blur-md rounded-xl p-3 border border-[#d49b35]/40 shadow-[0_8px_32px_rgba(0,0,0,0.85)]">
            <TableHeader
              label={
                rightTeams.length > 0
                  ? `RANKS ${leftTeams.length + 1} - ${sortedTeams.length}`
                  : ''
              }
            />
            <div className="flex-1 flex flex-col justify-between gap-1.5 mt-2 overflow-hidden">
              {rightTeams.map((team, index) =>
                animate ? (
                  <motion.div
                    key={team.teamNo}
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: (index + leftTeams.length) * 0.03, duration: 0.3 }}
                    className="flex-1 min-h-0"
                  >
                    <TeamRowCard team={team} isWinner={false} />
                  </motion.div>
                ) : (
                  <div key={team.teamNo} className="flex-1 min-h-0">
                    <TeamRowCard team={team} isWinner={false} />
                  </div>
                ),
              )}
            </div>
          </div>
        </div>

        {/* BOTTOM FOOTER */}
        <footer className="flex items-center justify-between border-t border-[#f5c553]/40 pt-2.5 px-6 bg-black/50 backdrop-blur-md rounded-xl">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-[#f5c553] animate-pulse" />
            <span className="text-xs font-black uppercase tracking-wider text-white/90">
              PUBG MOBILE CAMPUS CHALLENGE INDONESIA
            </span>
          </div>

          <div className="flex items-center gap-4 text-[11px] font-semibold text-white/60">
            <span>
              <strong className="text-[#2bb0b8]">ELIMS:</strong> Elimination Points
            </span>
            <span>&bull;</span>
            <span>
              <strong className="text-[#d49b35]">RANK PTS:</strong> Placement Points
            </span>
            <span>&bull;</span>
            <span>
              <strong className="text-[#ffd24c]">TOTAL:</strong> Overall Match Score
            </span>
          </div>

          <div className="text-xs font-black tracking-widest text-[#ffd24c] uppercase">
            #BE THE ONE
          </div>
        </footer>
      </div>
    </div>
  );
}

function TableHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#221812] to-[#140e0a] border-b border-[#d49b35]/40 text-[11px] font-black uppercase tracking-wider text-white/80">
      <div className="flex items-center gap-3">
        <span className="w-8 text-center text-[#ffd24c]">#</span>
        <span>{label}</span>
      </div>
      <div className="flex items-center gap-5 text-right font-mono">
        <span className="w-12 text-[#2bb0b8]">ELIMS</span>
        <span className="w-16 text-[#d49b35]">PLACE</span>
        <span className="w-16 text-[#ffd24c]">TOTAL</span>
      </div>
    </div>
  );
}

function TeamRowCard({ team, isWinner }: { team: Team; isWinner: boolean }) {
  const isTop3 = team.rank <= 3;

  return (
    <div
      className={`flex items-center justify-between px-3 py-1.5 h-full rounded-lg transition-all border ${
        isWinner
          ? 'bg-gradient-to-r from-[#8b1e1e]/90 via-[#2a1710]/95 to-[#1c120c]/95 border-[#ffd24c] shadow-[0_0_18px_rgba(245,197,83,0.35)]'
          : isTop3
            ? 'bg-gradient-to-r from-[#2a1d15]/90 to-[#18120e]/95 border-[#d49b35]/60 hover:border-[#ffd24c]'
            : 'bg-[#18120e]/85 border-[#d49b35]/25 hover:border-[#d49b35]/50'
      }`}
    >
      {/* Left: Rank + Logo + Name */}
      <div className="flex items-center gap-2.5 min-w-0">
        {/* Rank Badge */}
        <div
          className={`flex items-center justify-center size-7 rounded-md font-black text-xs shrink-0 shadow ${
            isWinner
              ? 'bg-gradient-to-br from-[#ffd24c] via-[#f5c553] to-[#d49b35] text-[#18110a] border border-white'
              : team.rank === 2
                ? 'bg-gradient-to-br from-zinc-200 to-zinc-400 text-black border border-white/40'
                : team.rank === 3
                  ? 'bg-gradient-to-br from-[#d49b35] to-[#8a5d1b] text-white border border-white/20'
                  : 'bg-[#16252c] text-[#ffd24c] border border-[#d49b35]/30'
          }`}
        >
          #{team.rank}
        </div>

        {/* Team Name + WWCD Badge */}
        <div className="flex items-center gap-2 min-w-0 truncate">
          <span
            className={`font-black text-sm uppercase tracking-wide truncate ${
              isWinner ? 'text-[#ffd24c] drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)]' : 'text-white'
            }`}
          >
            {team.name}
          </span>

          {isWinner && (
            <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-[#ffd24c] text-[#18110a] shrink-0 shadow">
              WWCD
            </span>
          )}
        </div>
      </div>

      {/* Right Stats: ELIMS, PLACE PTS, TOTAL PTS */}
      <div className="flex items-center gap-5 text-right font-mono shrink-0">
        <span className="w-12 text-sm font-bold text-[#2bb0b8] tabular-nums">
          {team.eliminations}
        </span>

        <span className="w-16 text-xs font-semibold text-[#d49b35] tabular-nums">
          {team.placementPoints}
        </span>

        <div className="w-16 flex justify-end">
          <span
            className={`px-2 py-0.5 rounded text-sm font-black tabular-nums shadow-sm border ${
              isWinner
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
    </div>
  );
}
