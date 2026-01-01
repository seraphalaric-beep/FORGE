import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { weeks, users, commitments } from '@forge/shared';

interface SetCommitmentBody {
  discordId: string;
  weekId: string;
  committedWorkouts: number;
}

export async function commitmentRoutes(fastify: FastifyInstance) {
  // POST /commitments
  fastify.post<{ Body: SetCommitmentBody }>('/', async (request, reply) => {
    const { discordId, weekId, committedWorkouts } = request.body;

    if (discordId === undefined || weekId === undefined || committedWorkouts === undefined) {
      return reply.code(400).send({ error: 'discordId, weekId, and committedWorkouts are required' });
    }

    if (committedWorkouts < 0 || committedWorkouts > 7) {
      return reply.code(400).send({ error: 'committedWorkouts must be between 0 and 7' });
    }

    try {
      // Verify week exists and is in OPEN status
      const week = await weeks.findUnique({ id: weekId });

      if (!week) {
        return reply.code(404).send({ error: 'Week not found' });
      }

      if (week.status !== 'OPEN') {
        return reply.code(400).send({ error: 'Commitments are closed for this week' });
      }

      // Get or create user
      const user = await users.upsert({
        where: { discordId },
        update: {},
        create: {
          discordId,
          isActive: true,
          joinedAt: new Date(),
          timezone: 'Europe/Dublin',
        },
      });

      // Upsert commitment (overwrites if exists)
      const commitment = await commitments.upsert({
        where: {
          userId_weekId: {
            userId: user.id,
            weekId: week.id,
          },
        },
        update: {
          committedWorkouts,
        },
        create: {
          userId: user.id,
          weekId: week.id,
          committedWorkouts,
          updatedAt: new Date(),
        },
      });

      return { commitment };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to set commitment' });
    }
  });
}
