import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { webhookEvents } from '@forge/shared';

interface StravaWebhookBody {
  object_type?: string;
  aspect_type?: string;
  object_id?: number;
  [key: string]: any;
}

interface HevyWebhookBody {
  event_type?: string;
  workout_id?: string;
  [key: string]: any;
}

export async function webhookRoutes(fastify: FastifyInstance) {
  // POST /webhooks/strava
  fastify.post<{ Body: StravaWebhookBody }>('/strava', async (request, reply) => {
    // Stub implementation - will be completed in phase 2
    const payload = request.body;
    const objectId = payload.object_id?.toString() || 'unknown';

    try {
      // Store webhook event for idempotency and processing
      const webhookEvent = await webhookEvents.upsert({
        where: {
          source_sourceEventId: {
            source: 'STRAVA',
            sourceEventId: objectId,
          },
        },
        update: {
          // Update if already exists (shouldn't happen, but handle gracefully)
          payloadJson: JSON.stringify(payload),
          receivedAt: new Date(),
        },
        create: {
          source: 'STRAVA',
          sourceEventId: objectId,
          status: 'PENDING',
          payloadJson: JSON.stringify(payload),
          receivedAt: new Date(),
        },
      });

      // TODO: Enqueue job to process webhook (phase 2)
      // For now, just acknowledge receipt
      fastify.log.info(`Received Strava webhook: ${objectId}`);

      return { received: true, eventId: webhookEvent.id };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to process webhook' });
    }
  });

  // POST /webhooks/hevy
  fastify.post<{ Body: HevyWebhookBody }>('/hevy', async (request, reply) => {
    // Stub implementation - will be completed in phase 2
    const payload = request.body;
    const workoutId = payload.workout_id || 'unknown';

    try {
      // Store webhook event for idempotency and processing
      const webhookEvent = await webhookEvents.upsert({
        where: {
          source_sourceEventId: {
            source: 'HEVY',
            sourceEventId: workoutId,
          },
        },
        update: {
          payloadJson: JSON.stringify(payload),
          receivedAt: new Date(),
        },
        create: {
          source: 'HEVY',
          sourceEventId: workoutId,
          status: 'PENDING',
          payloadJson: JSON.stringify(payload),
          receivedAt: new Date(),
        },
      });

      // TODO: Enqueue job to process webhook (phase 2)
      // For now, just acknowledge receipt
      fastify.log.info(`Received HEVY webhook: ${workoutId}`);

      return { received: true, eventId: webhookEvent.id };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to process webhook' });
    }
  });
}
