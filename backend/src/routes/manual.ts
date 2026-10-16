import type { IngestSourceKind } from '@cdf/shared';
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';
import type { ManualSource } from '../ingest/manual-source.js';

export interface ManualRoutesOptions {
  manualSource: ManualSource | null;
  currentSource: IngestSourceKind;
}

const teamStatusSchema = z.object({
  teamNo: z.number().int().min(1).max(25),
  aliveCount: z.number().int().min(0).max(4),
  kills: z.number().int().min(0),
  isEliminated: z.boolean(),
});

const manualSnapshotSchema = z.object({
  matchId: z.string().nullable(),
  phase: z.enum(['idle', 'live', 'ended']),
  teams: z.array(teamStatusSchema),
});

const manualStateResponseSchema = z.object({
  enabled: z.boolean(),
  currentSource: z.string(),
  state: manualSnapshotSchema.nullable(),
});

const errorSchema = z.object({ error: z.string() });

export const manualRoutes: FastifyPluginAsyncZod<ManualRoutesOptions> = async (app, options) => {
  const { manualSource, currentSource } = options;

  app.get(
    '/manual/state',
    {
      schema: {
        summary: 'Get current manual live match state',
        tags: ['manual'],
        response: {
          200: manualStateResponseSchema,
        },
      },
    },
    async () => {
      if (!manualSource) {
        return {
          enabled: false,
          currentSource,
          state: null,
        };
      }

      return {
        enabled: true,
        currentSource,
        state: manualSource.getState(),
      };
    },
  );

  app.post(
    '/manual/start',
    {
      schema: {
        summary: 'Start a new manual match',
        tags: ['manual'],
        body: z.object({ matchId: z.string().optional() }).nullish(),
        response: {
          200: manualSnapshotSchema,
          400: errorSchema,
        },
      },
    },
    async (request, reply) => {
      if (!manualSource) {
        return reply.code(400).send({
          error: `Manual match control is disabled. INGEST_SOURCE is set to "${currentSource}". Set it to "manual" in backend/.env to enable.`,
        });
      }

      const matchId = request.body?.matchId;
      return manualSource.startMatch(matchId);
    },
  );

  app.post(
    '/manual/end',
    {
      schema: {
        summary: 'End current manual match',
        tags: ['manual'],
        response: {
          200: manualSnapshotSchema,
          400: errorSchema,
        },
      },
    },
    async (_request, reply) => {
      if (!manualSource) {
        return reply.code(400).send({
          error: `Manual match control is disabled. INGEST_SOURCE is set to "${currentSource}".`,
        });
      }

      return manualSource.endMatch();
    },
  );

  app.post(
    '/manual/reset',
    {
      schema: {
        summary: 'Reset current manual match to idle',
        tags: ['manual'],
        response: {
          200: manualSnapshotSchema,
          400: errorSchema,
        },
      },
    },
    async (_request, reply) => {
      if (!manualSource) {
        return reply.code(400).send({
          error: `Manual match control is disabled. INGEST_SOURCE is set to "${currentSource}".`,
        });
      }

      return manualSource.resetMatch();
    },
  );

  app.post(
    '/manual/team',
    {
      schema: {
        summary: 'Update a team in the manual match (kills, aliveCount, eliminate, revive)',
        tags: ['manual'],
        body: z.object({
          teamNo: z.number().int().min(1).max(25),
          kills: z.number().int().min(0).optional(),
          deltaKills: z.number().int().optional(),
          aliveCount: z.number().int().min(0).max(4).optional(),
          eliminate: z.boolean().optional(),
          revive: z.boolean().optional(),
        }),
        response: {
          200: manualSnapshotSchema,
          400: errorSchema,
        },
      },
    },
    async (request, reply) => {
      if (!manualSource) {
        return reply.code(400).send({
          error: `Manual match control is disabled. INGEST_SOURCE is set to "${currentSource}".`,
        });
      }

      const { teamNo, kills, deltaKills, aliveCount, eliminate, revive } = request.body;

      if (eliminate) {
        manualSource.eliminateTeam(teamNo);
      } else if (revive) {
        manualSource.reviveTeam(teamNo, aliveCount ?? 4);
      } else if (aliveCount !== undefined) {
        manualSource.setTeamAliveCount(teamNo, aliveCount);
      }

      if (kills !== undefined) {
        manualSource.setTeamKills(teamNo, kills);
      } else if (deltaKills !== undefined) {
        manualSource.adjustTeamKills(teamNo, deltaKills);
      }

      return manualSource.getState();
    },
  );
};
