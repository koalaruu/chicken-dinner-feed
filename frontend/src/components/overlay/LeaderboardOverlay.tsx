import type { MatchState, OverlayAppearance } from '@cdf/shared';
import { motion } from 'motion/react';
import { appearanceToCssVariables, ROW_VARIANTS } from './appearance';
import { LEADERBOARD_METRICS as M, u } from './overlay-scale';
import { TeamRow } from './TeamRow';

const LEGEND = [
  { label: 'ALIVE', color: 'var(--player-alive)' },
  { label: 'KNOCKED', color: 'var(--player-knocked)' },
  { label: 'ELIM', color: 'var(--player-dead)' },
] as const;

export interface LeaderboardOverlayProps {
  match: MatchState;
  appearance: OverlayAppearance;
  /**
   * Whether rows should fade in one after another once the panel has arrived. The timing itself is
   * orchestrated by the panel above, so this only decides whether a row takes part.
   */
  animateRows?: boolean;
}

/**
 * The team standings panel from `specs/example.png`.
 *
 * Rows are rendered in the order the backend supplies, which is already ranked — the overlay never
 * sorts. Two overlays disagreeing about the standings at the same instant would be a visible defect,
 * so ranking is computed once, server-side (ADR-0007).
 */
export function LeaderboardOverlay({
  match,
  appearance,
  animateRows = false,
}: LeaderboardOverlayProps) {
  const columns = `${u(M.rankColumn)} 1fr ${u(M.aliveColumn)} ${u(M.pointsColumn)} ${u(M.elimsColumn)}`;

  // Wiped-out (eliminated) teams are placed at the bottom of the overlay
  const sortedTeams = [...match.teams].sort((a, b) => {
    // 1. Teams that have appeared come before teams that have never appeared
    if (a.hasAppeared !== b.hasAppeared) {
      return Number(b.hasAppeared) - Number(a.hasAppeared);
    }

    // 2. Alive teams first, eliminated (wiped out) teams at the bottom
    if (a.isEliminated !== b.isEliminated) {
      return Number(a.isEliminated) - Number(b.isEliminated);
    }

    // 3. Among eliminated teams: order by placement so earliest wiped team (e.g. 16th) is at the bottom
    if (a.isEliminated && b.isEliminated) {
      if (a.placement !== null && b.placement !== null && a.placement !== b.placement) {
        return a.placement - b.placement;
      }
    }

    // 4. Default: keep server ranking / points order
    return a.rank - b.rank;
  });

  const teams = sortedTeams.slice(0, appearance.maxTeams);

  return (
    <div
      className="relative overflow-hidden"
      style={{
        ...appearanceToCssVariables(appearance),
        width: u(M.panelWidth),
        backgroundColor: '#100b08',
        fontFamily: 'var(--overlay-font-family)',
        borderRadius: u(8),
        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.9), 0 0 20px rgba(245, 197, 83, 0.25)',
        border: `${u(1.5)} solid rgba(245, 197, 83, 0.45)`,
      }}
    >
      {/* 3D Stage Background Image applied directly to the leaderboard panel itself */}
      <div
        className="absolute inset-0 bg-cover pointer-events-none"
        style={{
          backgroundImage: "url('/images/postgame-bg.png')",
          backgroundPosition: 'center 30%',
          opacity: 0.42,
          filter: 'contrast(1.25) brightness(0.95)',
        }}
      />

      {/* Dark esports gradient overlay to ensure perfect contrast for text & alive bars */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(180deg, rgba(20, 14, 10, 0.88) 0%, rgba(14, 10, 8, 0.82) 40%, rgba(8, 6, 4, 0.92) 100%)',
          backdropFilter: 'blur(3px)',
        }}
      />

      {/* Subtle Championship Gold inner glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          boxShadow: 'inset 0 0 16px rgba(245, 197, 83, 0.12)',
        }}
      />

      <div className="relative z-10">
        {/*
         * The accent strip. This is the branding hook — the one colour that makes an overlay look
         * like a particular tournament's rather than generic.
         */}
        <div style={{ height: u(M.accentBarHeight), backgroundColor: 'var(--overlay-accent)' }} />

        {/* Tournament Branding Sub-Header */}
        <div
          className="flex items-center justify-between"
          style={{
            height: u(28),
            paddingInline: u(M.paddingX),
            backgroundColor: 'rgba(20, 14, 10, 0.88)',
            borderBottom: `${u(1)} solid rgba(245, 197, 83, 0.35)`,
          }}
        >
          <div className="flex items-center gap-1.5">
            <span
              className="font-black uppercase tracking-wider text-[10px]"
              style={{ color: 'var(--overlay-accent)' }}
            >
              PMCC INDONESIA 2024
            </span>
            <span className="font-semibold text-white/50 text-[9px] uppercase tracking-wide">
              • STANDINGS
            </span>
          </div>
          {match.matchId ? (
            <span
              className="font-bold uppercase tracking-wider text-[9px] px-1.5 py-0.5 rounded"
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.65)',
                color: 'var(--overlay-accent)',
                border: `${u(1)} solid rgba(245, 197, 83, 0.35)`,
              }}
            >
              MATCH {match.matchId}
            </span>
          ) : (
            <span className="font-bold text-[9px] text-[#2bb0b8] tracking-wider uppercase">
              LIVE
            </span>
          )}
        </div>

        <div
          className="grid items-center"
          style={{
            height: u(M.headerHeight),
            paddingInline: u(M.paddingX),
            gridTemplateColumns: columns,
            columnGap: u(6),
            backgroundColor: 'rgba(16, 11, 8, 0.85)',
            color: 'var(--overlay-text)',
            fontSize: u(12),
            letterSpacing: u(0.6),
            borderBottom: `${u(1)} solid var(--overlay-accent)`,
          }}
        >
          <span className="font-bold">#</span>
          <span className="font-bold">TEAM</span>
          <span className="text-center font-bold">ALIVE</span>
          <span className="text-center font-bold">PTS</span>
          <span className="text-center font-bold">ELIMS</span>
        </div>

        <div className="flex flex-col">
          {teams.map((team, index) =>
            animateRows ? (
              /*
               * A wrapper rather than variants on TeamRow itself: the row already animates its own
               * opacity to dim eliminated teams, and two things writing the same property fight. The
               * two opacities simply multiply, which is the behaviour we want anyway.
               */
              <motion.div key={team.teamNo} variants={ROW_VARIANTS}>
                <TeamRow
                  team={team}
                  displayRank={index + 1}
                  isAlternate={index % 2 === 1}
                />
              </motion.div>
            ) : (
              <TeamRow
                key={team.teamNo}
                team={team}
                displayRank={index + 1}
                isAlternate={index % 2 === 1}
              />
            ),
          )}
        </div>

        {appearance.showLegend && (
          <div
            className="flex items-center justify-center"
            style={{
              height: u(M.legendHeight),
              gap: u(14),
              backgroundColor: 'rgba(16, 11, 8, 0.92)',
              color: 'var(--overlay-text-muted)',
              fontSize: u(10),
              letterSpacing: u(0.5),
              borderTop: `${u(1)} solid rgba(245, 197, 83, 0.2)`,
            }}
          >
            {LEGEND.map((entry) => (
              <span key={entry.label} className="flex items-center" style={{ gap: u(5) }}>
                <span
                  style={{
                    width: u(6),
                    height: u(6),
                    borderRadius: '50%',
                    backgroundColor: entry.color,
                  }}
                />
                {entry.label}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
