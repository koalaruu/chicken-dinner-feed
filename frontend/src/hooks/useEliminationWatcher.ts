import type { MatchState } from '@cdf/shared';
import { useEffect, useRef } from 'react';
import { useEliminationStore } from '@/stores/elimination-store';

/**
 * Watches match state and automatically triggers elimination popups
 * whenever a team transitions to `isEliminated: true`.
 * Works reliably in both idle (testing/manual) and live match modes.
 */
export function useEliminationWatcher(match: MatchState | undefined) {
  const trigger = useEliminationStore((s) => s.trigger);
  const clear = useEliminationStore((s) => s.clear);

  const prevEliminatedRef = useRef<Set<number>>(new Set());
  const initializedRef = useRef(false);
  const prevMatchIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (!match) return;

    // Reset tracking if match ID changes
    if (prevMatchIdRef.current !== undefined && prevMatchIdRef.current !== match.matchId) {
      prevEliminatedRef.current.clear();
      initializedRef.current = false;
      clear();
    }
    prevMatchIdRef.current = match.matchId;

    // If all teams are alive (e.g. operator reset the match or revived everyone), reset tracking
    const allAlive = match.teams.length > 0 && match.teams.every((t) => !t.isEliminated);
    if (allAlive && prevEliminatedRef.current.size > 0) {
      prevEliminatedRef.current.clear();
      initializedRef.current = true;
      clear();
      return;
    }

    // On initial mount / first match data received:
    // Remember which teams are ALREADY eliminated so we don't spam popups for past events
    if (!initializedRef.current) {
      for (const team of match.teams) {
        if (team.isEliminated) {
          prevEliminatedRef.current.add(team.teamNo);
        }
      }
      initializedRef.current = true;
      return;
    }

    // Detect transitions: any team that wasn't eliminated before, but is eliminated now
    for (const team of match.teams) {
      const wasEliminated = prevEliminatedRef.current.has(team.teamNo);

      if (team.isEliminated && !wasEliminated) {
        prevEliminatedRef.current.add(team.teamNo);
        trigger({
          teamNo: team.teamNo,
          name: team.name,
          placement: team.placement ?? team.rank,
          eliminations: team.eliminations,
          totalPoints: team.totalPoints,
          logoUrl: team.logoUrl,
        });
      } else if (!team.isEliminated && wasEliminated) {
        // Operator revived the team
        prevEliminatedRef.current.delete(team.teamNo);
      }
    }
  }, [match, trigger, clear]);
}
