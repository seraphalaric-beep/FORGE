import { Job } from 'bullmq';
import { webhookEvents } from '@forge/shared';

// Stub implementation for phase 2
export async function processWebhookEvent(job: Job) {
  const { webhookEventId } = job.data;

  try {
    const webhookEvent = await webhookEvents.findById(webhookEventId);

    if (!webhookEvent) {
      throw new Error(`Webhook event ${webhookEventId} not found`);
    }

    if (webhookEvent.status === 'COMPLETED') {
      console.log(`Webhook event ${webhookEventId} already processed`);
      return;
    }

    // Update status to PROCESSING
    await webhookEvents.update({
      where: { id: webhookEventId },
      data: { status: 'PROCESSING', processedAt: new Date() },
    });

    // TODO: Phase 2 - Parse payload, fetch workout details, create workout
    // For now, just mark as completed
    await webhookEvents.update({
      where: { id: webhookEventId },
      data: { status: 'COMPLETED' },
    });

    console.log(`Webhook event ${webhookEventId} processed (stub)`);
  } catch (error) {
    console.error(`Error processing webhook event ${webhookEventId}:`, error);
    await webhookEvents.update({
      where: { id: webhookEventId },
      data: { status: 'FAILED' },
    });
    throw error;
  }
}
