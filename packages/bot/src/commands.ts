import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';

// Single command with all subcommands
export const forgeCommand = new SlashCommandBuilder()
  .setName('forge')
  .setDescription('FORGE fitness accountability commands')
  .addSubcommand((subcommand) =>
    subcommand
      .setName('join')
      .setDescription('Join FORGE and start your fitness journey')
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('leave')
      .setDescription('Leave FORGE')
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('log')
      .setDescription('Log a completed workout')
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('status')
      .setDescription('Check your commitment, workouts, and community progress')
  )
  .addSubcommand((subcommand) =>
    subcommand
      .setName('admin')
      .setDescription('Admin commands')
      .addSubcommand((adminSub) =>
        adminSub
          .setName('setchannels')
          .setDescription('Set commitment and progress channels')
          .addChannelOption((option) =>
            option
              .setName('commitment')
              .setDescription('Channel for commitment messages')
              .setRequired(false)
          )
          .addChannelOption((option) =>
            option
              .setName('progress')
              .setDescription('Channel for progress messages')
              .setRequired(false)
          )
      )
  );

export const commands = {
  join: {
    handler: async (interaction: any, apiClient: any) => {
      try {
        const response = await apiClient.post('/users/join', {
          discordId: interaction.user.id,
        });

        await interaction.reply({
          content: `Welcome to FORGE! 🏋️\n\n` +
            `**How it works:**\n` +
            `• Every Sunday at 21:00, you'll be asked to commit to workouts for the week\n` +
            `• Log your workouts using \`/forge log\`\n` +
            `• Each workout is worth 10 points toward our community goal\n` +
            `• Check your progress with \`/forge status\`\n\n` +
            `Let's get moving! 💪`,
          ephemeral: true,
        });
      } catch (error: any) {
        console.error('Error in join command:', error);
        await interaction.reply({
          content: 'Failed to join FORGE. Please try again later.',
          ephemeral: true,
        });
      }
    },
  },

  leave: {
    handler: async (interaction: any, apiClient: any) => {
      try {
        await apiClient.post('/users/leave', {
          discordId: interaction.user.id,
        });

        await interaction.reply({
          content: 'You have left FORGE. We hope to see you again! 👋',
          ephemeral: true,
        });
      } catch (error: any) {
        console.error('Error in leave command:', error);
        await interaction.reply({
          content: 'Failed to leave FORGE. Please try again later.',
          ephemeral: true,
        });
      }
    },
  },

  log: {
    handler: async (interaction: any, apiClient: any) => {
      try {
        const response = await apiClient.post('/workouts/manual', {
          discordId: interaction.user.id,
        });

        await interaction.reply({
          content: `✅ Workout logged! You've earned 10 points. Keep it up! 💪`,
          ephemeral: true,
        });

        // DM confirmation
        try {
          await interaction.user.send(
            `🏋️ **Workout Logged**\n\n` +
            `Your workout has been recorded and you've earned **10 points** toward this week's community goal!\n\n` +
            `Keep up the great work! 💪`
          );
        } catch (dmError) {
          // User may have DMs disabled, that's okay
          console.log('Could not DM user:', dmError);
        }
      } catch (error: any) {
        console.error('Error in log command:', error);
        const errorMessage =
          error.response?.data?.error || 'Failed to log workout. Please try again later.';
        await interaction.reply({
          content: `❌ ${errorMessage}`,
          ephemeral: true,
        });
      }
    },
  },

  status: {
    handler: async (interaction: any, apiClient: any) => {
      try {
        const response = await apiClient.get(`/users/${interaction.user.id}/status`);

        const { commitment, workoutsThisWeek, currentWeek, communityProgress } = response.data;

        let message = `**Your FORGE Status**\n\n`;

        if (!currentWeek) {
          message += `No active week. Check back Sunday at 21:00 for the next commitment window!`;
        } else {
          message += `**This Week:**\n`;
          if (commitment) {
            message += `• Your commitment: ${commitment.committedWorkouts} workouts\n`;
          } else {
            message += `• Your commitment: Not set\n`;
          }
          message += `• Workouts logged: ${workoutsThisWeek}\n\n`;

          message += `**Community Progress:**\n`;
          message += `• Goal: ${communityProgress.currentPoints} / ${communityProgress.goalPoints} points\n`;
          message += `• Total workouts: ${communityProgress.totalWorkouts}\n`;
        }

        await interaction.reply({
          content: message,
          ephemeral: true,
        });
      } catch (error: any) {
        console.error('Error in status command:', error);
        await interaction.reply({
          content: 'Failed to get status. Please try again later.',
          ephemeral: true,
        });
      }
    },
  },

  adminSetChannels: {
    handler: async (interaction: any, apiClient: any) => {
      if (!interaction.member?.permissions?.has(PermissionFlagsBits.Administrator)) {
        return interaction.reply({
          content: '❌ You need administrator permissions to use this command.',
          ephemeral: true,
        });
      }

      // TODO: Implement channel setting (store in database or config)
      await interaction.reply({
        content: 'Channel settings updated (stub - to be implemented)',
        ephemeral: true,
      });
    },
  },
};

