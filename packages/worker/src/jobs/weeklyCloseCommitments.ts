import { Job } from 'bullmq';
import { weeks, commitments, POINTS_PER_WORKOUT } from '@forge/shared';

export async function weeklyCloseCommitments(job: Job) {
  try {
    // Find the OPEN week
    const openWeek = await weeks.findFirst({
      where: { status: { in: ['OPEN'] } },
      orderBy: { startsAt: 'desc' },
    });

    if (!openWeek) {
      console.log('No open week found to close');
      return;
    }

    // Calculate goal: sum of all committed workouts * 10
    const allCommitments = await commitments.findMany({
      where: { weekId: openWeek.id },
    });

    const totalCommittedWorkouts = allCommitments.reduce((sum, c) => sum + c.committedWorkouts, 0);
    const goalPoints = totalCommittedWorkouts * POINTS_PER_WORKOUT;

    // Update week: set goal and status to ACTIVE
    const updatedWeek = await weeks.update({
      where: { id: openWeek.id },
      data: {
        goalPoints,
        status: 'ACTIVE',
      },
    });

    console.log(`Week ${updatedWeek.id} closed. Goal: ${goalPoints} points (${totalCommittedWorkouts} workouts)`);

    // Return week data for bot to post goal message and create progress message
    return {
      weekId: updatedWeek.id,
      goalPoints: updatedWeek.goalPoints,
      action: 'close_commitments',
    };
  } catch (error) {
    console.error('Error closing commitments:', error);
    throw error;
  }
}
