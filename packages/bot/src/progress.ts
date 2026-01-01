import { TextChannel, Message } from 'discord.js';
import axios, { AxiosInstance } from 'axios';

export async function createProgressMessage(
  channel: TextChannel,
  week: any,
  apiClient: AxiosInstance
) {
  const workoutsLogged = week.stats?.workoutsCount || 0;
  const pointsRemaining = Math.max(0, week.goalPoints - week.currentPoints);
  const workoutsRemaining = Math.ceil(pointsRemaining / 10);

  // Progress bar: 10 blocks
  const progressPercent = week.goalPoints > 0 ? week.currentPoints / week.goalPoints : 0;
  const filledBlocks = Math.min(10, Math.floor(progressPercent * 10));
  const progressBar = '█'.repeat(filledBlocks) + '░'.repeat(10 - filledBlocks);

  const content = `**FORGE This Week**
Goal: ${week.currentPoints} / ${week.goalPoints}
Workouts logged: ${workoutsLogged}
Members participating: ${week.stats?.commitmentsCount || 0} committed

Progress:
\`${progressBar}\`

${pointsRemaining > 0 ? `Only ${pointsRemaining} points to go, that is ${workoutsRemaining} workouts.` : '🎉 Goal achieved!'}`;

  const message = await channel.send(content);
  await message.pin();

  return message;
}

export async function updateProgressMessage(
  channel: TextChannel,
  messageId: string,
  week: any,
  apiClient: AxiosInstance
) {
  const workoutsLogged = week.stats?.workoutsCount || 0;
  const pointsRemaining = Math.max(0, week.goalPoints - week.currentPoints);
  const workoutsRemaining = Math.ceil(pointsRemaining / 10);

  const progressPercent = week.goalPoints > 0 ? week.currentPoints / week.goalPoints : 0;
  const filledBlocks = Math.min(10, Math.floor(progressPercent * 10));
  const progressBar = '█'.repeat(filledBlocks) + '░'.repeat(10 - filledBlocks);

  const content = `**FORGE This Week**
Goal: ${week.currentPoints} / ${week.goalPoints}
Workouts logged: ${workoutsLogged}
Members participating: ${week.stats?.commitmentsCount || 0} committed

Progress:
\`${progressBar}\`

${pointsRemaining > 0 ? `Only ${pointsRemaining} points to go, that is ${workoutsRemaining} workouts.` : '🎉 Goal achieved!'}`;

  try {
    const message = await channel.messages.fetch(messageId);
    await message.edit(content);
  } catch (error) {
    console.error('Error updating progress message:', error);
  }
}

