import Fastify, { type FastifyInstance } from 'fastify';
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ManualSource } from '../ingest/manual-source.js';
import { manualRoutes } from './manual.js';

describe('manual routes', () => {
  let app: FastifyInstance;
  let manualSource: ManualSource;

  beforeEach(async () => {
    manualSource = new ManualSource();
    app = Fastify().withTypeProvider<ZodTypeProvider>();
    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);

    await app.register(manualRoutes, {
      prefix: '/api',
      manualSource,
      currentSource: 'manual',
    });
  });

  afterEach(async () => {
    await app.close();
  });

  it('GET /api/manual/state returns current state', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/manual/state' });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.enabled).toBe(true);
    expect(body.currentSource).toBe('manual');
    expect(body.state.phase).toBe('idle');
  });

  it('POST /api/manual/start starts match and initializes teams', async () => {
    // Bodyless request
    const noBodyRes = await app.inject({
      method: 'POST',
      url: '/api/manual/start',
    });
    expect(noBodyRes.statusCode).toBe(200);
    expect(noBodyRes.json().phase).toBe('live');

    // Empty payload request
    const emptyPayloadRes = await app.inject({
      method: 'POST',
      url: '/api/manual/start',
      payload: {},
    });
    expect(emptyPayloadRes.statusCode).toBe(200);
    expect(emptyPayloadRes.json().phase).toBe('live');

    // With custom matchId
    const response = await app.inject({
      method: 'POST',
      url: '/api/manual/start',
      payload: { matchId: 'custom-match-99' },
    });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.phase).toBe('live');
    expect(body.matchId).toBe('custom-match-99');
  });

  it('POST /api/manual/team updates team kills and alive count', async () => {
    await app.inject({ method: 'POST', url: '/api/manual/start' });

    const updateRes = await app.inject({
      method: 'POST',
      url: '/api/manual/team',
      payload: { teamNo: 1, deltaKills: 3, aliveCount: 2 },
    });
    expect(updateRes.statusCode).toBe(200);
    const body = updateRes.json();
    const team1 = body.teams.find((t: { teamNo: number }) => t.teamNo === 1);
    expect(team1.kills).toBe(3);
    expect(team1.aliveCount).toBe(2);
    expect(team1.isEliminated).toBe(false);

    // Eliminate
    const elimRes = await app.inject({
      method: 'POST',
      url: '/api/manual/team',
      payload: { teamNo: 1, eliminate: true },
    });
    const elimBody = elimRes.json();
    const team1Elim = elimBody.teams.find((t: { teamNo: number }) => t.teamNo === 1);
    expect(team1Elim.aliveCount).toBe(0);
    expect(team1Elim.isEliminated).toBe(true);
  });
});
