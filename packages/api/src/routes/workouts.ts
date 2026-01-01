import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  users,
  weeks,
  workouts,
  createWorkoutWithPoints,
  POINTS_PER_WORKOUT,
  DEFAULT_TIMEZONE,
} from '@forge/shared';

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
      const user = await users.upsert({
        where: { discordId },
        update: {},
        create: {
          discordId,
          isActive: true,
          joinedAt: new Date(),
          timezone: DEFAULT_TIMEZONE,
        },
      });

      // Determine occurredAt (default to now in UTC)
      const workoutOccurredAt = occurredAt ? new Date(occurredAt) : new Date();

      // Find the week this workout belongs to based on occurredAt
      // Week boundaries: startsAt <= occurredAt < endsAt
      const week = await weeks.findFirst({
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

      const existingWorkout = await workouts.findUnique({
        source_sourceEventId: {
          source: 'MANUAL',
          sourceEventId,
        },
      });

      if (existingWorkout) {
        return reply.code(409).send({ error: 'This workout has already been logged' });
      }

      // Create workout and update week points atomically using transaction
      const result = await createWorkoutWithPoints(
        {
          weekId: week.id,
          userId: user.id,
          source: 'MANUAL',
          sourceEventId,
          occurredAt: workoutOccurredAt,
          pointsAwarded: POINTS_PER_WORKOUT,
          createdAt: new Date(),
        },
        {
          weekId: week.id,
          userId: user.id,
          reason: 'workout_logged',
          points: POINTS_PER_WORKOUT,
          createdAt: new Date(),
        },
        week.id,
        POINTS_PER_WORKOUT
      );

      // Get updated week to return current points
      const updatedWeek = await weeks.findUnique({ id: week.id });

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
          currentPoints: updatedWeek?.currentPoints || week.currentPoints + POINTS_PER_WORKOUT,
        },
      };
    } catch (error: any) {
      // Check for duplicate (idempotency)
      if (error.message?.includes('already exists') || error.code === 'ALREADY_EXISTS') {
        return reply.code(409).send({ error: 'This workout has already been logged' });
      }
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to log workout' });
    }
  });
}
