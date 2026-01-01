import { Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { weeklyOpenCommitments } from './weeklyOpenCommitments';

// Note: weeklyOpenCommitments expects a Job, but we're calling it directly
// In a real scenario, we'd create a proper job or refactor
async function callWeeklyOpenCommitments(prisma: PrismaClient) {
  // Create a mock job object for the function
  const mockJob = {
    data: {},
  } as Job;
  return await weeklyOpenCommitments(mockJob, prisma);
}

export async function weeklyEndAndRecap(job: Job, prisma: PrismaClient) {
  try {
    // This job is called Sunday 21:00 to:
    // 1. Post recap for ending week
    // 2. Open new week
    // 3. Post commitment call

    // Find the ACTIVE week that's ending
    const activeWeek = await prisma.week.findFirst({
      where: { status: 'ACTIVE' },
      orderBy: { startsAt: 'desc' },
      include: {
        commitments: {
          include: {
            user: true,
          },
        },
        workouts: {
          include: {
            user: true,
          },
        },
      },
    });

    let recapData = null;

    if (activeWeek) {
      // End the week
      await prisma.week.update({
        where: { id: activeWeek.id },
        data: { status: 'ENDED' },
      });

      // Calculate recap categories
      const goalAchieved = activeWeek.currentPoints >= activeWeek.goalPoints;

      // Group workouts by user
      const workoutsByUser = new Map<string, number>();
      for (const workout of activeWeek.workouts) {
        const count = workoutsByUser.get(workout.userId) || 0;
        workoutsByUser.set(workout.userId, count + 1);
      }

      // Group commitments by user
      const commitmentsByUser = new Map<string, number>();
      for (const commitment of activeWeek.commitments) {
        commitmentsByUser.set(commitment.userId, commitment.committedWorkouts);
      }

      // Categorize users
      const aboveAndBeyond: Array<{ discordId: string; overCommitment: number }> = [];
      const steadyHands: Array<{ discordId: string }> = [];
      const extraSparks: Array<{ discordId: string }> = [];

      for (const [userId, workoutsLogged] of workoutsByUser.entries()) {
        const committed = commitmentsByUser.get(userId) || 0;
        const user = activeWeek.workouts.find((w) => w.userId === userId)?.user;

        if (!user) continue;

        if (committed > 0) {
          if (workoutsLogged > committed) {
            aboveAndBeyond.push({
              discordId: user.discordId,
              overCommitment: workoutsLogged - committed,
            });
          } else if (workoutsLogged === committed) {
            steadyHands.push({ discordId: user.discordId });
          }
          // Users who missed commitment are not publicly named
        } else if (workoutsLogged > 0) {
          extraSparks.push({ discordId: user.discordId });
        }
      }

      recapData = {
        weekId: activeWeek.id,
        goalAchieved,
        goalPoints: activeWeek.goalPoints,
        currentPoints: activeWeek.currentPoints,
        aboveAndBeyond,
        steadyHands,
        extraSparks,
      };
    }

    // Open new week
    const newWeekData = await callWeeklyOpenCommitments(prisma);

    return {
      recap: recapData,
      newWeek: newWeekData,
      action: 'end_and_open',
    };
  } catch (error) {
    console.error('Error ending week and creating recap:', error);
    throw error;
  }
}

