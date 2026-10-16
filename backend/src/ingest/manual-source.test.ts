import type { TeamRosterEntry } from '@cdf/shared';
import { afterEach, describe, expect, it } from 'vitest';
import type { IngestUpdate } from './source.js';
import { ManualSource } from './manual-source.js';

function testRoster(...teamNos: number[]): TeamRosterEntry[] {
  return teamNos.map((teamNo) => ({ teamNo, name: `Team ${teamNo}`, logoUrl: null }));
}

describe('ManualSource', () => {
  let source: ManualSource | null = null;

  afterEach(async () => {
    await source?.stop();
    source = null;
  });

  it('starts in idle state and transitions to live on startMatch', () => {
    source = new ManualSource({ roster: testRoster(1, 2) });
    const updates: IngestUpdate[] = [];

    source.start({
      onUpdate: (update) => updates.push(update),
      onStatus: () => {},
    });

    expect(updates.length).toBe(1);
    expect(updates[0]?.phase).toBe('idle');
    expect(updates[0]?.matchId).toBeNull();

    source.startMatch('test-match-1');
    expect(updates.length).toBe(2);
    expect(updates[1]?.phase).toBe('live');
    expect(updates[1]?.matchId).toBe('test-match-1');
  });

  it('controls kills and alive player slots accurately', () => {
    source = new ManualSource({ roster: testRoster(1) });
    let latestUpdate: IngestUpdate | null = null;

    source.start({
      onUpdate: (update) => {
        latestUpdate = update;
      },
      onStatus: () => {},
    });

    source.startMatch('match-1');
    source.setTeamKills(1, 5);

    const team1Players = latestUpdate?.players.filter((p) => p.teamNo === 1) ?? [];
    expect(team1Players.length).toBe(4);
    const totalKills = team1Players.reduce((acc, p) => acc + p.kills, 0);
    expect(totalKills).toBe(5);

    // Set 2 alive
    source.setTeamAliveCount(1, 2);
    const alivePlayers = latestUpdate?.players.filter((p) => p.teamNo === 1 && p.liveState === 'alive') ?? [];
    const deadPlayers = latestUpdate?.players.filter((p) => p.teamNo === 1 && p.liveState === 'dead') ?? [];
    expect(alivePlayers.length).toBe(2);
    expect(deadPlayers.length).toBe(2);

    // Eliminate
    source.eliminateTeam(1);
    const remainingAlive = latestUpdate?.players.filter((p) => p.teamNo === 1 && p.liveState === 'alive') ?? [];
    expect(remainingAlive.length).toBe(0);

    // Revive
    source.reviveTeam(1);
    const revivedAlive = latestUpdate?.players.filter((p) => p.teamNo === 1 && p.liveState === 'alive') ?? [];
    expect(revivedAlive.length).toBe(4);
  });
});
