import { Job } from 'bullmq';
import { weeks, commitments, workouts, users } from '@forge/shared';
import { weeklyOpenCommitments } from './weeklyOpenCommitments';

export async function weeklyEndAndRecap(job: Job) {
  try {
    // This job is called Sunday 21:00 to:
    // 1. Post recap for ending week
    // 2. Open new week
    // 3. Post commitment call

    // Find the ACTIVE week that's ending
    const activeWeek = await weeks.findFirst({
      where: { status: { in: ['ACTIVE'] } },
      orderBy: { startsAt: 'desc' },
    });

    let recapData = null;

    if (activeWeek) {
      // End the week
      await weeks.update({
        where: { id: activeWeek.id },
        data: { status: 'ENDED' },
      });

      // Fetch related data
      const [allCommitments, allWorkouts] = await Promise.all([
        commitments.findMany({ where: { weekId: activeWeek.id } }),
        workouts.findMany({ where: { weekId: activeWeek.id } }),
      ]);

      // Calculate recap categories
      const goalAchieved = activeWeek.currentPoints >= activeWeek.goalPoints;

      // Group workouts by user
      const workoutsByUser = new Map<string, number>();
      for (const workout of allWorkouts) {
        const count = workoutsByUser.get(workout.userId) || 0;
        workoutsByUser.set(workout.userId, count + 1);
      }

      // Group commitments by user
      const commitmentsByUser = new Map<string, number>();
      for (const commitment of allCommitments) {
        commitmentsByUser.set(commitment.userId, commitment.committedWorkouts);
      }

      // Get unique user IDs and fetch their data
      const uniqueUserIds = Array.from(new Set([...workoutsByUser.keys(), ...commitmentsByUser.keys()]));
      const userPromises = uniqueUserIds.map((userId) => users.findById(userId));
      const userResults = await Promise.all(userPromises);
      const userMap = new Map<string, { discordId: string }>();
      userResults.forEach((user, index) => {
        if (user) {
          userMap.set(uniqueUserIds[index], user);
        }
      });

      // Categorize users
      const aboveAndBeyond: Array<{ discordId: string; overCommitment: number }> = [];
      const steadyHands: Array<{ discordId: string }> = [];
      const extraSparks: Array<{ discordId: string }> = [];

      for (const [userId, workoutsLogged] of workoutsByUser.entries()) {
        const committed = commitmentsByUser.get(userId) || 0;
        const user = userMap.get(userId);

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
    const newWeekData = await weeklyOpenCommitments(job);

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
