import type { MatchState, OverlayAppearance, Team } from '@cdf/shared';
import { motion } from 'motion/react';

export interface Top4OverlayProps {
  match: MatchState;
  appearance?: OverlayAppearance;
}

const PLAYER_SLOTS = [1, 2, 3, 4] as const;

function Top4TeamCard({ team }: { team: Team }) {
  const playersBySlot = new Map(team.players.map((p) => [p.slot, p]));

  return (
    <motion.div
      layout
      key={team.teamNo}
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.25 } }}
      transition={{ layout: { duration: 0.45, ease: [0.22, 1, 0.36, 1] } }}
      className="flex flex-col w-[240px] sm:w-[270px] rounded-lg overflow-hidden border border-[#d49b35]/60 shadow-[0_10px_30px_rgba(0,0,0,0.85)] backdrop-blur-md select-none"
    >
      {/* Top Header Row */}
      <div className="flex h-[34px] sm:h-[38px] items-stretch">
        {/* Left: Team Name (PMCC Championship Gold) */}
        <div className="flex-1 bg-gradient-to-r from-[#f5c553] via-[#ebb343] to-[#e0a935] px-3 py-1 flex items-center justify-center min-w-0">
          <span className="font-black tracking-wider text-[#18110a] text-xs sm:text-sm uppercase truncate drop-shadow-sm">
            {team.name}
          </span>
        </div>

        {/* Right: ALIVE Status Badge (Dark Airdrop Teal) */}
        <div className="bg-[#16252c] px-2.5 py-1 flex items-center gap-2 border-l border-[#18110a]/30">
          <span className="text-[10px] sm:text-[11px] font-black tracking-widest text-[#2bb0b8]">
            ALIVE
          </span>

          {/* 4 Player Indicator Bars */}
          <div className="flex items-center gap-[3px]">
            {PLAYER_SLOTS.map((slot) => {
              const player = playersBySlot.get(slot);
              // Fallback based on standingPlayerCount if individual player data isn't set
              const isAlive = player
                ? player.liveState === 'alive'
                : slot <= team.standingPlayerCount;
              const isKnocked = player?.liveState === 'knocked';

              return (
                <div
                  key={slot}
                  className={`w-[5px] h-[16px] rounded-[1px] transition-colors duration-300 ${
                    isAlive
                      ? 'bg-[#ffd24c] shadow-[0_0_6px_rgba(255,210,76,0.7)]'
                      : isKnocked
                        ? 'bg-[#f5a524] animate-pulse shadow-[0_0_6px_rgba(245,165,36,0.8)]'
                        : 'bg-[#32383e]/80 border border-white/5'
                  }`}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Footer Row: ELIM & PTS (Deep PMCC Obsidian Mahogany) */}
      <div className="flex h-[28px] sm:h-[32px] items-center justify-between px-3.5 bg-[#18120e]/95 border-t border-[#d49b35]/40 text-xs sm:text-sm">
        <div className="flex items-center gap-1.5">
          <span className="font-black text-[11px] sm:text-xs text-[#d49b35] tracking-wider uppercase">
            ELIM:
          </span>
          <span className="font-black text-white text-xs sm:text-sm tabular-nums">
            {team.eliminations}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="font-black text-[11px] sm:text-xs text-[#d49b35] tracking-wider uppercase">
            PTS:
          </span>
          <span className="font-black text-[#ffd24c] text-xs sm:text-sm tabular-nums">
            {team.totalPoints}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

export function Top4Overlay({ match, appearance }: Top4OverlayProps) {
  // Filter for teams that have appeared
  const appearedTeams = match.teams.filter((t) => t.hasAppeared);
  const aliveTeams = appearedTeams.filter((t) => !t.isEliminated);

  // If there are alive teams, display the alive teams (up to 4).
  // Otherwise, display top 4 appeared teams from match standings.
  const displayTeams =
    aliveTeams.length > 0
      ? aliveTeams.slice(0, 4)
      : appearedTeams.slice(0, 4);

  const scale = appearance?.scale ?? 1;

  return (
    <div
      style={{
        transform: `scale(${scale})`,
        transformOrigin: 'top center',
      }}
      className="fixed top-6 left-1/2 -translate-x-1/2 flex items-center justify-center gap-3 sm:gap-4 z-50 pointer-events-none select-none"
    >
      {displayTeams.map((team) => (
        <Top4TeamCard key={team.teamNo} team={team} />
      ))}
    </div>
  );
}
