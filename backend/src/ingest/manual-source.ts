import type { IngestSourceKind, MatchPhase, TeamRosterEntry } from '@cdf/shared';
import { DEFAULT_TEAM_ROSTER } from '@cdf/shared';
import type { IngestPlayer, IngestSource, IngestSourceEvents, IngestUpdate } from './source.js';

export interface ManualTeamStatus {
  teamNo: number;
  aliveCount: number;
  kills: number;
  isEliminated: boolean;
}

export interface ManualSourceSnapshot {
  matchId: string | null;
  phase: MatchPhase;
  teams: ManualTeamStatus[];
}

export interface ManualSourceOptions {
  roster?: readonly TeamRosterEntry[];
}

export class ManualSource implements IngestSource {
  readonly kind: IngestSourceKind = 'manual';

  private events: IngestSourceEvents | null = null;
  private roster: readonly TeamRosterEntry[];
  private matchId: string | null = null;
  private phase: MatchPhase = 'idle';

  /** teamNo -> { aliveCount: number (0..4), kills: number (>= 0) } */
  private teamStates = new Map<number, { aliveCount: number; kills: number }>();

  constructor(options: ManualSourceOptions = {}) {
    this.roster = options.roster ?? DEFAULT_TEAM_ROSTER.teams;
    this.initTeamStates();
  }

  private initTeamStates(): void {
    for (const team of this.roster) {
      if (!this.teamStates.has(team.teamNo)) {
        this.teamStates.set(team.teamNo, { aliveCount: 4, kills: 0 });
      }
    }
  }

  start(events: IngestSourceEvents): void {
    this.events = events;
    events.onStatus('connected', 'Manual match source active');
    this.emit();
  }

  async stop(): Promise<void> {
    this.events?.onStatus('disconnected', 'Manual source stopped');
    this.events = null;
  }

  setRoster(roster: readonly TeamRosterEntry[]): void {
    this.roster = roster;
    this.initTeamStates();
    this.emit();
  }

  startMatch(customMatchId?: string): ManualSourceSnapshot {
    this.matchId = customMatchId?.trim() || `manual-${Date.now()}`;
    this.phase = 'live';
    for (const team of this.roster) {
      this.teamStates.set(team.teamNo, { aliveCount: 4, kills: 0 });
    }
    this.emit();
    return this.getState();
  }

  endMatch(): ManualSourceSnapshot {
    this.phase = 'ended';
    this.emit();
    return this.getState();
  }

  resetMatch(): ManualSourceSnapshot {
    this.matchId = null;
    this.phase = 'idle';
    for (const team of this.roster) {
      this.teamStates.set(team.teamNo, { aliveCount: 4, kills: 0 });
    }
    this.emit();
    return this.getState();
  }

  setTeamKills(teamNo: number, kills: number): ManualSourceSnapshot {
    const current = this.teamStates.get(teamNo) ?? { aliveCount: 4, kills: 0 };
    this.teamStates.set(teamNo, {
      ...current,
      kills: Math.max(0, Math.trunc(kills)),
    });
    this.emit();
    return this.getState();
  }

  adjustTeamKills(teamNo: number, delta: number): ManualSourceSnapshot {
    const current = this.teamStates.get(teamNo) ?? { aliveCount: 4, kills: 0 };
    return this.setTeamKills(teamNo, current.kills + delta);
  }

  setTeamAliveCount(teamNo: number, aliveCount: number): ManualSourceSnapshot {
    const current = this.teamStates.get(teamNo) ?? { aliveCount: 4, kills: 0 };
    const clamped = Math.max(0, Math.min(4, Math.trunc(aliveCount)));
    this.teamStates.set(teamNo, {
      ...current,
      aliveCount: clamped,
    });
    this.emit();
    return this.getState();
  }

  eliminateTeam(teamNo: number): ManualSourceSnapshot {
    return this.setTeamAliveCount(teamNo, 0);
  }

  reviveTeam(teamNo: number, aliveCount = 4): ManualSourceSnapshot {
    return this.setTeamAliveCount(teamNo, aliveCount);
  }

  getState(): ManualSourceSnapshot {
    const teams: ManualTeamStatus[] = this.roster.map((entry) => {
      const state = this.teamStates.get(entry.teamNo) ?? { aliveCount: 4, kills: 0 };
      return {
        teamNo: entry.teamNo,
        aliveCount: state.aliveCount,
        kills: state.kills,
        isEliminated: state.aliveCount === 0,
      };
    });

    return {
      matchId: this.matchId,
      phase: this.phase,
      teams,
    };
  }

  private buildUpdate(): IngestUpdate {
    const players: IngestPlayer[] = [];

    for (const entry of this.roster) {
      const state = this.teamStates.get(entry.teamNo) ?? { aliveCount: 4, kills: 0 };

      for (let slot = 1; slot <= 4; slot += 1) {
        const isAlive = slot <= state.aliveCount;
        players.push({
          id: `p-${entry.teamNo}-${slot}`,
          name: `${entry.name} P${slot}`,
          teamNo: entry.teamNo,
          slot,
          liveState: isAlive ? 'alive' : 'dead',
          health: isAlive ? 100 : 0,
          healthMax: 100,
          kills: slot === 1 ? state.kills : 0,
          rank: 0,
        });
      }
    }

    return {
      matchId: this.matchId,
      phase: this.phase,
      players,
      inWarmup: false,
    };
  }

  private emit(): void {
    if (!this.events) return;
    this.events.onUpdate(this.buildUpdate());
  }
}
