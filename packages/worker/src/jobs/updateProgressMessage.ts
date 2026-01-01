import { Job } from 'bullmq';
import { weeks, workouts, commitments } from '@forge/shared';

// This job is debounced - only one update per 15 seconds
// Called by API after workout logging
export async function updateProgressMessage(job: Job) {
  const { weekId } = job.data;

  try {
    const week = await weeks.findUnique({ id: weekId });

    if (!week) {
      throw new Error(`Week ${weekId} not found`);
    }

    if (!week.progressMessageChannelId || !week.progressMessageId) {
      // Message not created yet, skip
      return;
    }

    // Get counts
    const [workoutsCount, commitmentsCount] = await Promise.all([
      workouts.count({ where: { weekId: week.id } }),
      commitments.findMany({ where: { weekId: week.id } }).then((c) => c.length),
    ]);

    // Format progress message
    const workoutsLogged = workoutsCount;
    const pointsRemaining = Math.max(0, week.goalPoints - week.currentPoints);
    const workoutsRemaining = Math.ceil(pointsRemaining / 10);

    // Progress bar: 10 blocks
    const progressPercent = week.goalPoints > 0 ? week.currentPoints / week.goalPoints : 0;
    const filledBlocks = Math.min(10, Math.floor(progressPercent * 10));
    const progressBar = '█'.repeat(filledBlocks) + '░'.repeat(10 - filledBlocks);

    const message = `**FORGE This Week**
Goal: ${week.currentPoints} / ${week.goalPoints}
Workouts logged: ${workoutsLogged}
Members participating: ${commitmentsCount} committed

Progress:
\`${progressBar}\`

${pointsRemaining > 0 ? `Only ${pointsRemaining} points to go, that is ${workoutsRemaining} workouts.` : '🎉 Goal achieved!'}`;

    // Return message content - bot will handle actual Discord API call
    // This avoids circular dependency and keeps worker focused on business logic
    return {
      channelId: week.progressMessageChannelId,
      messageId: week.progressMessageId,
      content: message,
    };
  } catch (error) {
    console.error(`Error updating progress message for week ${weekId}:`, error);
    throw error;
  }
}
