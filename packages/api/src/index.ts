import Fastify from 'fastify';
import cors from '@fastify/cors';
import dotenv from 'dotenv';
import { createPrismaClient, POINTS_PER_WORKOUT } from '@forge/shared';
import { userRoutes } from './routes/users';
import { weekRoutes } from './routes/weeks';
import { commitmentRoutes } from './routes/commitments';
import { workoutRoutes } from './routes/workouts';
import { webhookRoutes } from './routes/webhooks';

dotenv.config();

const prisma = createPrismaClient();

const fastify = Fastify({
  logger: true,
});

// CORS
fastify.register(cors, {
  origin: true,
});

// Auth middleware: simple shared secret header
fastify.addHook('onRequest', async (request, reply) => {
  // Skip auth for health check
  if (request.url === '/health') {
    return;
  }

  const authHeader = request.headers['x-forge-secret'];
  const expectedSecret = process.env.FORGE_API_SECRET;

  if (!expectedSecret) {
    reply.code(500).send({ error: 'Server configuration error' });
    return;
  }

  if (authHeader !== expectedSecret) {
    reply.code(401).send({ error: 'Unauthorized' });
    return;
  }
});

// Health check
fastify.get('/health', async () => {
  return { status: 'ok' };
});

// Routes
fastify.register(userRoutes, { prefix: '/users' });
fastify.register(weekRoutes, { prefix: '/weeks' });
fastify.register(commitmentRoutes, { prefix: '/commitments' });
fastify.register(workoutRoutes, { prefix: '/workouts' });
fastify.register(webhookRoutes, { prefix: '/webhooks' });

const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3000', 10);
    await fastify.listen({ port, host: '0.0.0.0' });
    console.log(`API server listening on port ${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  await fastify.close();
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await fastify.close();
  await prisma.$disconnect();
  process.exit(0);
});

start();

