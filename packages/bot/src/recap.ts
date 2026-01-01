import { TextChannel, EmbedBuilder } from 'discord.js';
import axios, { AxiosInstance } from 'axios';

export async function postWeeklyRecap(
  channel: TextChannel,
  week: any,
  apiClient: AxiosInstance
) {
  try {
    // Fetch detailed week data with user info
    // This would ideally come from the worker job result
    // For MVP, we'll calculate it here

    const goalAchieved = week.currentPoints >= week.goalPoints;

    const embed = new EmbedBuilder()
      .setTitle('🏋️ FORGE Weekly Recap')
      .setDescription(
        `**Goal:** ${week.currentPoints} / ${week.goalPoints} points\n` +
        `${goalAchieved ? '✅ **Goal Achieved!** 🎉' : '❌ Goal not met this week'}`
      )
      .setColor(goalAchieved ? 0x57f287 : 0xed4245)
      .setFooter({ text: 'Keep pushing forward! 💪' });

    // TODO: Add shout outs from worker job data
    // For MVP, we'll add a placeholder
    embed.addFields({
      name: 'Shout Outs',
      value: 'Calculating... (to be implemented with worker integration)',
    });

    await channel.send({ embeds: [embed] });
  } catch (error) {
    console.error('Error posting weekly recap:', error);
  }
}

