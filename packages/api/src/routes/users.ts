import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { users, weeks, commitments, workouts, DEFAULT_TIMEZONE } from '@forge/shared';

interface JoinBody {
  discordId: string;
}

interface LeaveBody {
  discordId: string;
}

interface StatusParams {
  discordId: string;
}

export async function userRoutes(fastify: FastifyInstance) {
  // POST /users/join
  fastify.post<{ Body: JoinBody }>('/join', async (request, reply) => {
    const { discordId } = request.body;

    if (!discordId) {
      return reply.code(400).send({ error: 'discordId is required' });
    }

    try {
      const user = await users.upsert({
        where: { discordId },
        update: { isActive: true },
        create: {
          discordId,
          isActive: true,
          joinedAt: new Date(),
          timezone: DEFAULT_TIMEZONE,
        },
      });

      return { user };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to join user' });
    }
  });

  // POST /users/leave
  fastify.post<{ Body: LeaveBody }>('/leave', async (request, reply) => {
    const { discordId } = request.body;

    if (!discordId) {
      return reply.code(400).send({ error: 'discordId is required' });
    }

    try {
      const user = await users.update({
        where: { discordId },
        data: { isActive: false },
      });

      return { user };
    } catch (error: any) {
      if (error.message === 'User not found') {
        return reply.code(404).send({ error: 'User not found' });
      }
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to leave user' });
    }
  });

  // GET /users/:discordId/status
  fastify.get<{ Params: StatusParams }>('/:discordId/status', async (request, reply) => {
    const { discordId } = request.params;

    try {
      const user = await users.findUnique({ discordId });

      if (!user) {
        return reply.code(404).send({ error: 'User not found' });
      }

      // Get current week
      const currentWeek = await weeks.findFirst({
        where: {
          status: {
            in: ['OPEN', 'ACTIVE'],
          },
        },
        orderBy: {
          startsAt: 'desc',
        },
      });

      if (!currentWeek) {
        return {
          user: {
            discordId: user.discordId,
            isActive: user.isActive,
          },
          currentWeek: null,
          commitment: null,
          workoutsThisWeek: 0,
          communityProgress: null,
        };
      }

      // Get user's commitment for current week
      const commitment = await commitments.findUnique({
        userId_weekId: {
          userId: user.id,
          weekId: currentWeek.id,
        },
      });

      // Get user's workouts for current week
      const userWorkouts = await workouts.findMany({
        where: {
          weekId: currentWeek.id,
          userId: user.id,
        },
      });

      // Get community progress
      const totalWorkouts = await workouts.count({
        where: {
          weekId: currentWeek.id,
        },
      });

      return {
        user: {
          discordId: user.discordId,
          isActive: user.isActive,
        },
        currentWeek: {
          id: currentWeek.id,
          status: currentWeek.status,
          goalPoints: currentWeek.goalPoints,
          currentPoints: currentWeek.currentPoints,
        },
        commitment: commitment
          ? {
              committedWorkouts: commitment.committedWorkouts,
              updatedAt: commitment.updatedAt,
            }
          : null,
        workoutsThisWeek: userWorkouts.length,
        communityProgress: {
          goalPoints: currentWeek.goalPoints,
          currentPoints: currentWeek.currentPoints,
          totalWorkouts,
        },
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to get user status' });
    }
  });
}
