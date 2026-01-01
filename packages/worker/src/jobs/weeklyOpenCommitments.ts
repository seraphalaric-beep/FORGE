import { Job } from 'bullmq';
import { weeks } from '@forge/shared';
import { addDays, startOfWeek, setHours, setMinutes } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

const TIMEZONE = 'Europe/Dublin';
const COMMITMENT_OPEN_HOUR = 21; // Sunday 21:00
const COMMITMENT_CLOSE_HOUR = 9; // Monday 09:00

export async function weeklyOpenCommitments(job: Job) {
  try {
    // End current ACTIVE week if it exists
    const activeWeek = await weeks.findFirst({
      where: { status: { in: ['ACTIVE'] } },
      orderBy: { startsAt: 'desc' },
    });

    if (activeWeek) {
      await weeks.update({
        where: { id: activeWeek.id },
        data: { status: 'ENDED' },
      });
    }

    // Calculate new week boundaries in Dublin timezone
    const now = new Date();
    const dublinNow = toZonedTime(now, TIMEZONE);

    // Start of this week (Sunday 00:00 Dublin)
    const weekStart = startOfWeek(dublinNow, { weekStartsOn: 0 });
    const weekStartDublin = setHours(setMinutes(weekStart, 0), 0);
    const weekStartUtc = fromZonedTime(weekStartDublin, TIMEZONE);

    // End of week (next Sunday 00:00 Dublin)
    const weekEndDublin = addDays(weekStartDublin, 7);
    const weekEndUtc = fromZonedTime(weekEndDublin, TIMEZONE);

    // Commitment open: Sunday 21:00 Dublin
    const commitmentOpenDublin = setHours(setMinutes(weekStartDublin, 0), COMMITMENT_OPEN_HOUR);
    const commitmentOpenUtc = fromZonedTime(commitmentOpenDublin, TIMEZONE);

    // Commitment close: Monday 09:00 Dublin
    const commitmentCloseDublin = setHours(setMinutes(addDays(weekStartDublin, 1), 0), COMMITMENT_CLOSE_HOUR);
    const commitmentCloseUtc = fromZonedTime(commitmentCloseDublin, TIMEZONE);

    // Create new week
    const newWeek = await weeks.create({
      startsAt: weekStartUtc,
      endsAt: weekEndUtc,
      commitmentsOpenAt: commitmentOpenUtc,
      commitmentsCloseAt: commitmentCloseUtc,
      status: 'OPEN',
      goalPoints: 0,
      currentPoints: 0,
    });

    console.log(`New week opened: ${newWeek.id}`);

    // Return week data for bot to post commitment call
    return {
      weekId: newWeek.id,
      action: 'open_commitments',
    };
  } catch (error) {
    console.error('Error opening commitments:', error);
    throw error;
  }
}
