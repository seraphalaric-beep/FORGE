import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createPrismaClient } from '@forge/shared';

const prisma = createPrismaClient();

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
      const user = await prisma.user.upsert({
        where: { discordId },
        update: { isActive: true },
        create: {
          discordId,
          isActive: true,
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
      const user = await prisma.user.update({
        where: { discordId },
        data: { isActive: false },
      });

      return { user };
    } catch (error) {
      if ((error as any).code === 'P2025') {
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
      const user = await prisma.user.findUnique({
        where: { discordId },
        include: {
          commitments: {
            include: {
              week: true,
            },
            orderBy: {
              week: {
                startsAt: 'desc',
              },
            },
            take: 1,
          },
        },
      });

      if (!user) {
        return reply.code(404).send({ error: 'User not found' });
      }

      // Get current week
      const currentWeek = await prisma.week.findFirst({
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
      const commitment = await prisma.commitment.findUnique({
        where: {
          userId_weekId: {
            userId: user.id,
            weekId: currentWeek.id,
          },
        },
      });

      // Get user's workouts for current week
      const workouts = await prisma.workout.findMany({
        where: {
          weekId: currentWeek.id,
          userId: user.id,
        },
      });

      // Get community progress
      const totalWorkouts = await prisma.workout.count({
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
        workoutsThisWeek: workouts.length,
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

