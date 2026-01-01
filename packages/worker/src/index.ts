import dotenv from 'dotenv';
import { Worker, Queue } from 'bullmq';
import IORedis from 'ioredis';
import { createPrismaClient, POINTS_PER_WORKOUT } from '@forge/shared';
import { processWebhookEvent } from './jobs/processWebhookEvent';
import { updateProgressMessage } from './jobs/updateProgressMessage';
import { weeklyOpenCommitments } from './jobs/weeklyOpenCommitments';
import { weeklyCloseCommitments } from './jobs/weeklyCloseCommitments';
import { weeklyEndAndRecap } from './jobs/weeklyEndAndRecap';

dotenv.config();

const prisma = createPrismaClient();

// Redis connection
const connection = new IORedis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  maxRetriesPerRequest: null,
});

// Queue definitions
export const webhookQueue = new Queue('webhook-processing', { connection });
export const progressQueue = new Queue('progress-update', { connection });
export const schedulerQueue = new Queue('scheduler', { connection });

// Workers
const webhookWorker = new Worker('webhook-processing', processWebhookEvent, { connection });
const progressWorker = new Worker('progress-update', updateProgressMessage, { connection });

// Setup repeatable jobs for weekly schedule
async function setupScheduledJobs() {
  // Sunday 21:00 Europe/Dublin = 20:00 UTC (Dublin is UTC+0 in winter, UTC+1 in summer)
  // Using UTC 20:00 as approximation (should use proper timezone library in production)
  await schedulerQueue.add(
    'weekly-end-and-open',
    {},
    {
      repeat: {
        pattern: '0 20 * * 0', // Sunday 20:00 UTC (approximately 21:00 Dublin)
      },
    }
  );

  // Monday 09:00 Europe/Dublin = 08:00 UTC (winter) or 09:00 UTC (summer)
  // Using UTC 08:00 as approximation
  await schedulerQueue.add(
    'weekly-close-commitments',
    {},
    {
      repeat: {
        pattern: '0 8 * * 1', // Monday 08:00 UTC (approximately 09:00 Dublin)
      },
    }
  );

  console.log('Scheduled jobs configured');
}

// Scheduler worker
const schedulerWorker = new Worker(
  'scheduler',
  async (job) => {
    if (job.name === 'weekly-end-and-open') {
      await weeklyEndAndRecap(job.data, prisma);
    } else if (job.name === 'weekly-close-commitments') {
      await weeklyCloseCommitments(job.data, prisma);
    }
  },
  { connection }
);

// Error handlers
webhookWorker.on('completed', (job) => {
  console.log(`Webhook job ${job.id} completed`);
});

webhookWorker.on('failed', (job, err) => {
  console.error(`Webhook job ${job?.id} failed:`, err);
});

progressWorker.on('completed', (job) => {
  console.log(`Progress update job ${job.id} completed`);
});

progressWorker.on('failed', (job, err) => {
  console.error(`Progress update job ${job?.id} failed:`, err);
});

schedulerWorker.on('completed', (job) => {
  console.log(`Scheduler job ${job.id} completed`);
});

schedulerWorker.on('failed', (job, err) => {
  console.error(`Scheduler job ${job?.id} failed:`, err);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  await webhookWorker.close();
  await progressWorker.close();
  await schedulerWorker.close();
  await connection.quit();
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await webhookWorker.close();
  await progressWorker.close();
  await schedulerWorker.close();
  await connection.quit();
  await prisma.$disconnect();
  process.exit(0);
});

// Initialize
setupScheduledJobs().then(() => {
  console.log('Worker started');
});

