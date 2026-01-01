import { Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';

// Stub implementation for phase 2
export async function processWebhookEvent(job: Job, prisma: PrismaClient) {
  const { webhookEventId } = job.data;

  try {
    const webhookEvent = await prisma.webhookEvent.findUnique({
      where: { id: webhookEventId },
    });

    if (!webhookEvent) {
      throw new Error(`Webhook event ${webhookEventId} not found`);
    }

    if (webhookEvent.status === 'COMPLETED') {
      console.log(`Webhook event ${webhookEventId} already processed`);
      return;
    }

    // Update status to PROCESSING
    await prisma.webhookEvent.update({
      where: { id: webhookEventId },
      data: { status: 'PROCESSING', processedAt: new Date() },
    });

    // TODO: Phase 2 - Parse payload, fetch workout details, create workout
    // For now, just mark as completed
    await prisma.webhookEvent.update({
      where: { id: webhookEventId },
      data: { status: 'COMPLETED' },
    });

    console.log(`Webhook event ${webhookEventId} processed (stub)`);
  } catch (error) {
    console.error(`Error processing webhook event ${webhookEventId}:`, error);
    await prisma.webhookEvent.update({
      where: { id: webhookEventId },
      data: { status: 'FAILED' },
    });
    throw error;
  }
}

