import { Client, TextChannel } from 'discord.js';
import axios, { AxiosInstance } from 'axios';
import { createCommitmentMessage } from './commitments';
import { createProgressMessage, updateProgressMessage } from './progress';
import { postWeeklyRecap } from './recap';

const TIMEZONE = 'Europe/Dublin';

// Simple scheduler using setInterval
// In production, consider using a more robust solution
export async function setupScheduledTasks(client: Client, apiClient: AxiosInstance) {
  console.log('Setting up scheduled tasks...');

  // Check every minute for scheduled events
  setInterval(async () => {
    try {
      const now = new Date();
      const dublinTime = new Date(now.toLocaleString('en-US', { timeZone: TIMEZONE }));

      const day = dublinTime.getDay(); // 0 = Sunday, 1 = Monday
      const hour = dublinTime.getHours();
      const minute = dublinTime.getMinutes();

      // Sunday 21:00 - End week, post recap, open new week, post commitment call
      if (day === 0 && hour === 21 && minute === 0) {
        await handleWeeklyEndAndOpen(client, apiClient);
      }

      // Monday 09:00 - Close commitments, set goal, create progress message
      if (day === 1 && hour === 9 && minute === 0) {
        await handleWeeklyClose(client, apiClient);
      }

      // Update progress message periodically (debounced by worker)
      // This is handled by the worker job queue, but we can trigger it here
      // if needed for real-time updates
    } catch (error) {
      console.error('Error in scheduled task:', error);
    }
  }, 60000); // Check every minute
}

async function handleWeeklyEndAndOpen(client: Client, apiClient: AxiosInstance) {
  try {
    console.log('Handling weekly end and open...');

    // Get current week for recap
    const weekResponse = await apiClient.get('/weeks/current');
    const currentWeek = weekResponse.data.week;

    if (currentWeek && currentWeek.status === 'ACTIVE') {
      // Post recap
      const channelId = currentWeek.progressMessageChannelId;
      if (channelId) {
        const channel = (await client.channels.fetch(channelId)) as TextChannel;
        if (channel) {
          await postWeeklyRecap(channel, currentWeek, apiClient);
        }
      }
    }

    // Worker will create new week, but we need to post commitment call
    // For now, we'll create the week here too (should be in worker, but bot posts message)
    // TODO: Better coordination between worker and bot

    // Get active users to tag
    // This would ideally come from a role or stored list
    const participantRoleId = process.env.PARTICIPANT_ROLE_ID;

    // Find commitment channel
    const commitmentChannelId = process.env.COMMITMENT_CHANNEL_ID || process.env.PROGRESS_CHANNEL_ID;
    if (commitmentChannelId) {
      const channel = (await client.channels.fetch(commitmentChannelId)) as TextChannel;
      if (channel) {
        // Get new week (worker should have created it)
        // For MVP, we'll create it here if needed
        const newWeekResponse = await apiClient.get('/weeks/current');
        const newWeek = newWeekResponse.data.week;

        if (newWeek && newWeek.status === 'OPEN') {
          const participantIds = participantRoleId ? [participantRoleId] : [];
          await createCommitmentMessage(channel, newWeek.id, participantIds);
        }
      }
    }
  } catch (error) {
    console.error('Error in handleWeeklyEndAndOpen:', error);
  }
}

async function handleWeeklyClose(client: Client, apiClient: AxiosInstance) {
  try {
    console.log('Handling weekly close...');

    // Worker handles goal calculation, but bot creates/updates progress message
    const weekResponse = await apiClient.get('/weeks/current');
    const week = weekResponse.data.week;

    if (week && week.status === 'ACTIVE') {
      const progressChannelId = process.env.PROGRESS_CHANNEL_ID || week.progressMessageChannelId;
      if (progressChannelId) {
        const channel = (await client.channels.fetch(progressChannelId)) as TextChannel;
        if (channel) {
          const message = await createProgressMessage(channel, week, apiClient);
          // Update week with message IDs
          // This would be done via API endpoint in production
        }
      }
    }
  } catch (error) {
    console.error('Error in handleWeeklyClose:', error);
  }
}

