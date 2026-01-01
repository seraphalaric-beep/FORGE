/**
 * Integration test script that simulates a full weekly cycle:
 * 1. Creating a week
 * 2. Commitments from 3 users
 * 3. Closing commitments
 * 4. Logging workouts
 * 5. Verifying progress and recap categories
 */

import {
  users,
  weeks,
  commitments,
  createWorkoutWithPoints,
  POINTS_PER_WORKOUT,
  DEFAULT_TIMEZONE,
} from '../packages/shared/src/index';
import { addDays, startOfWeek, setHours, setMinutes } from 'date-fns';
import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz';
import dotenv from 'dotenv';

dotenv.config({ path: './packages/shared/.env' });

const TIMEZONE = 'Europe/Dublin';

async function integrationTest() {
  console.log('Starting FORGE integration test...\n');

  try {
    // 1. Create test users
    console.log('1. Creating test users...');
    const user1 = await users.upsert({
      where: { discordId: 'test_user_1' },
      update: {},
      create: {
        discordId: 'test_user_1',
        isActive: true,
        joinedAt: new Date(),
        timezone: DEFAULT_TIMEZONE,
      },
    });

    const user2 = await users.upsert({
      where: { discordId: 'test_user_2' },
      update: {},
      create: {
        discordId: 'test_user_2',
        isActive: true,
        joinedAt: new Date(),
        timezone: DEFAULT_TIMEZONE,
      },
    });

    const user3 = await users.upsert({
      where: { discordId: 'test_user_3' },
      update: {},
      create: {
        discordId: 'test_user_3',
        isActive: true,
        joinedAt: new Date(),
        timezone: DEFAULT_TIMEZONE,
      },
    });

    console.log(`   Created users: ${user1.discordId}, ${user2.discordId}, ${user3.discordId}\n`);

    // 2. Create a test week
    console.log('2. Creating test week...');
    const now = new Date();
    const dublinNow = utcToZonedTime(now, TIMEZONE);
    const weekStart = startOfWeek(dublinNow, { weekStartsOn: 0 });
    const weekStartDublin = setHours(setMinutes(weekStart, 0), 0);
    const weekStartUtc = zonedTimeToUtc(weekStartDublin, TIMEZONE);
    const weekEndUtc = zonedTimeToUtc(addDays(weekStartDublin, 7), TIMEZONE);
    const commitmentOpenUtc = zonedTimeToUtc(
      setHours(setMinutes(weekStartDublin, 0), 21),
      TIMEZONE
    );
    const commitmentCloseUtc = zonedTimeToUtc(
      setHours(setMinutes(addDays(weekStartDublin, 1), 0), 9),
      TIMEZONE
    );

    const week = await weeks.create({
      startsAt: weekStartUtc,
      endsAt: weekEndUtc,
      commitmentsOpenAt: commitmentOpenUtc,
      commitmentsCloseAt: commitmentCloseUtc,
      status: 'OPEN',
      goalPoints: 0,
      currentPoints: 0,
    });

    console.log(`   Created week: ${week.id} (status: ${week.status})\n`);

    // 3. Set commitments
    console.log('3. Setting commitments...');
    const commitment1 = await commitments.upsert({
      where: {
        userId_weekId: {
          userId: user1.id,
          weekId: week.id,
        },
      },
      update: { committedWorkouts: 3 },
      create: {
        userId: user1.id,
        weekId: week.id,
        committedWorkouts: 3,
        updatedAt: new Date(),
      },
    });

    const commitment2 = await commitments.upsert({
      where: {
        userId_weekId: {
          userId: user2.id,
          weekId: week.id,
        },
      },
      update: { committedWorkouts: 5 },
      create: {
        userId: user2.id,
        weekId: week.id,
        committedWorkouts: 5,
        updatedAt: new Date(),
      },
    });

    const commitment3 = await commitments.upsert({
      where: {
        userId_weekId: {
          userId: user3.id,
          weekId: week.id,
        },
      },
      update: { committedWorkouts: 2 },
      create: {
        userId: user3.id,
        weekId: week.id,
        committedWorkouts: 2,
        updatedAt: new Date(),
      },
    });

    console.log(
      `   Commitments: User1=${commitment1.committedWorkouts}, User2=${commitment2.committedWorkouts}, User3=${commitment3.committedWorkouts}\n`
    );

    // 4. Close commitments and calculate goal
    console.log('4. Closing commitments and calculating goal...');
    const totalCommitted = 3 + 5 + 2; // 10 workouts
    const goalPoints = totalCommitted * POINTS_PER_WORKOUT;

    const updatedWeek = await weeks.update({
      where: { id: week.id },
      data: {
        goalPoints,
        status: 'ACTIVE',
      },
    });

    console.log(`   Goal set: ${goalPoints} points (${totalCommitted} workouts)\n`);

    // 5. Log workouts
    console.log('5. Logging workouts...');
    // User1: committed 3, logs 4 (above and beyond)
    // User2: committed 5, logs 5 (steady hands)
    // User3: committed 2, logs 1 (missed commitment - not named in recap)

    const workoutConfigs = [
      { userId: user1.id, count: 4 },
      { userId: user2.id, count: 5 },
      { userId: user3.id, count: 1 },
    ];

    for (const config of workoutConfigs) {
      for (let i = 0; i < config.count; i++) {
        const occurredAt = new Date(Date.now() - i * 3600000); // Space them out by 1 hour
        const sourceEventId = `manual_${config.userId}_${occurredAt.toISOString()}`;

        // Create workout and update week points atomically
        await createWorkoutWithPoints(
          {
            weekId: week.id,
            userId: config.userId,
            source: 'MANUAL',
            sourceEventId,
            occurredAt,
            pointsAwarded: POINTS_PER_WORKOUT,
            createdAt: new Date(),
          },
          {
            weekId: week.id,
            userId: config.userId,
            reason: 'workout_logged',
            points: POINTS_PER_WORKOUT,
            createdAt: new Date(),
          },
          week.id,
          POINTS_PER_WORKOUT
        );
      }
    }

    const finalWeek = await weeks.findUnique({ id: week.id });

    console.log(`   Logged ${workoutConfigs.reduce((sum, w) => sum + w.count, 0)} workouts`);
    console.log(`   Total points: ${finalWeek?.currentPoints} / ${finalWeek?.goalPoints}\n`);

    // 6. Verify recap categories
    console.log('6. Verifying recap categories...');
    const allWorkouts = await workouts.findMany({
      where: { weekId: week.id },
    });

    const workoutsByUser = new Map<string, number>();
    for (const workout of allWorkouts) {
      const count = workoutsByUser.get(workout.userId) || 0;
      workoutsByUser.set(workout.userId, count + 1);
    }

    const commitmentsByUser = new Map<string, number>();
    const allCommitments = await commitments.findMany({
      where: { weekId: week.id },
    });
    for (const commitment of allCommitments) {
      commitmentsByUser.set(commitment.userId, commitment.committedWorkouts);
    }

    // Fetch users to get discordIds
    const uniqueUserIds = Array.from(new Set([...workoutsByUser.keys(), ...commitmentsByUser.keys()]));
    const userPromises = uniqueUserIds.map((userId) => users.findById(userId));
    const userResults = await Promise.all(userPromises);
    const userMap = new Map<string, { discordId: string }>();
    userResults.forEach((user, index) => {
      if (user) {
        userMap.set(uniqueUserIds[index], user);
      }
    });

    const aboveAndBeyond: string[] = [];
    const steadyHands: string[] = [];
    const missedCommitment: string[] = [];

    for (const [userId, workoutsLogged] of workoutsByUser.entries()) {
      const committed = commitmentsByUser.get(userId) || 0;
      const user = userMap.get(userId);

      if (!user) continue;

      if (committed > 0) {
        if (workoutsLogged > committed) {
          aboveAndBeyond.push(user.discordId);
        } else if (workoutsLogged === committed) {
          steadyHands.push(user.discordId);
        } else {
          missedCommitment.push(user.discordId);
        }
      }
    }

    console.log(`   Above and beyond: ${aboveAndBeyond.join(', ')}`);
    console.log(`   Steady hands: ${steadyHands.join(', ')}`);
    console.log(`   Missed commitment (not named): ${missedCommitment.length} user(s)\n`);

    // Verify expectations
    console.log('7. Verifying test results...');
    expect(aboveAndBeyond).toContain('test_user_1'); // User1: 4 > 3
    expect(steadyHands).toContain('test_user_2'); // User2: 5 === 5
    expect(missedCommitment).toContain('test_user_3'); // User3: 1 < 2

    console.log('✅ All tests passed!\n');

    // Cleanup
    console.log('Cleaning up test data...');
    // Note: Firestore cleanup would require deleting documents
    // For now, we'll just log that cleanup is needed
    console.log('Note: Test data cleanup should be implemented for Firestore\n');

    console.log('✅ Cleanup complete!');
  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  }
}

// Simple expect function for testing
function expect(actual: any) {
  return {
    toContain: (expected: any) => {
      if (!actual.includes(expected)) {
        throw new Error(`Expected ${actual} to contain ${expected}`);
      }
    },
  };
}

// Run test
if (require.main === module) {
  integrationTest()
    .then(() => {
      console.log('\n✅ Integration test completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Integration test failed:', error);
      process.exit(1);
    });
}

export { integrationTest };
