import { FastifyInstance, FastifyReply } from 'fastify';
import { weeks } from '@forge/shared';

export async function weekRoutes(fastify: FastifyInstance) {
  // GET /weeks/current
  fastify.get('/current', async (request, reply) => {
    try {
      const week = await weeks.findFirst({
        where: {
          status: {
            in: ['OPEN', 'ACTIVE'],
          },
        },
        orderBy: {
          startsAt: 'desc',
        },
        include: {
          _count: {
            select: {
              commitments: true,
              workouts: true,
            },
          },
        },
      });

      if (!week) {
        return reply.code(404).send({ error: 'No active week found' });
      }

      return {
        week: {
          id: week.id,
          startsAt: week.startsAt,
          commitmentsOpenAt: week.commitmentsOpenAt,
          commitmentsCloseAt: week.commitmentsCloseAt,
          endsAt: week.endsAt,
          goalPoints: week.goalPoints,
          currentPoints: week.currentPoints,
          status: week.status,
          progressMessageChannelId: week.progressMessageChannelId,
          progressMessageId: week.progressMessageId,
          commitmentMessageChannelId: week.commitmentMessageChannelId,
          commitmentMessageId: week.commitmentMessageId,
          stats: {
            commitmentsCount: week._count?.commitments || 0,
            workoutsCount: week._count?.workouts || 0,
          },
        },
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to get current week' });
    }
  });
}
