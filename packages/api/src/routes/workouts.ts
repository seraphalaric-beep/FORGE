import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createPrismaClient, POINTS_PER_WORKOUT } from '@forge/shared';

const prisma = createPrismaClient();

interface LogManualWorkoutBody {
  discordId: string;
  occurredAt?: string; // ISO string, defaults to now
}

export async function workoutRoutes(fastify: FastifyInstance) {
  // POST /workouts/manual
  fastify.post<{ Body: LogManualWorkoutBody }>('/manual', async (request, reply) => {
    const { discordId, occurredAt } = request.body;

    if (!discordId) {
      return reply.code(400).send({ error: 'discordId is required' });
    }

    try {
      // Get or create user
      const user = await prisma.user.upsert({
        where: { discordId },
        update: {},
        create: {
          discordId,
          isActive: true,
        },
      });

      // Determine occurredAt (default to now in UTC)
      const workoutOccurredAt = occurredAt ? new Date(occurredAt) : new Date();

      // Find the week this workout belongs to based on occurredAt
      // Week boundaries: startsAt <= occurredAt < endsAt
      const week = await prisma.week.findFirst({
        where: {
          startsAt: {
            lte: workoutOccurredAt,
          },
          endsAt: {
            gt: workoutOccurredAt,
          },
        },
      });

      if (!week) {
        return reply.code(400).send({
          error: 'No active week found for this workout date. Please log workouts during an active week.',
        });
      }

      // Check if workout already exists (idempotency for manual workouts)
      // For manual workouts, we use a deterministic sourceEventId based on user+time
      // This prevents double-logging the same workout
      const sourceEventId = `manual_${user.id}_${workoutOccurredAt.toISOString()}`;

      const existingWorkout = await prisma.workout.findUnique({
        where: {
          source_sourceEventId: {
            source: 'MANUAL',
            sourceEventId,
          },
        },
      });

      if (existingWorkout) {
        return reply.code(409).send({ error: 'This workout has already been logged' });
      }

      // Create workout and update week points atomically
      const result = await prisma.$transaction(async (tx) => {
        // Create workout
        const workout = await tx.workout.create({
          data: {
            weekId: week.id,
            userId: user.id,
            source: 'MANUAL',
            sourceEventId,
            occurredAt: workoutOccurredAt,
            pointsAwarded: POINTS_PER_WORKOUT,
          },
        });

        // Create points ledger entry
        await tx.pointsLedger.create({
          data: {
            weekId: week.id,
            userId: user.id,
            reason: 'workout_logged',
            points: POINTS_PER_WORKOUT,
          },
        });

        // Increment week currentPoints atomically
        await tx.week.update({
          where: { id: week.id },
          data: {
            currentPoints: {
              increment: POINTS_PER_WORKOUT,
            },
          },
        });

        return workout;
      });

      // Return workout and trigger progress update via queue (handled by worker)
      return {
        workout: {
          id: result.id,
          weekId: result.weekId,
          occurredAt: result.occurredAt,
          pointsAwarded: result.pointsAwarded,
        },
        week: {
          id: week.id,
          currentPoints: week.currentPoints + POINTS_PER_WORKOUT,
        },
      };
    } catch (error: any) {
      if (error.code === 'P2002') {
        // Unique constraint violation (idempotency)
        return reply.code(409).send({ error: 'This workout has already been logged' });
      }
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to log workout' });
    }
  });
}

