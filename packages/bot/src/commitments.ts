import {
  ButtonInteraction,
  StringSelectMenuInteraction,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  EmbedBuilder,
  TextChannel,
} from 'discord.js';
import axios from 'axios';

export async function handleCommitmentSelection(
  interaction: ButtonInteraction | StringSelectMenuInteraction,
  apiClient: any
) {
  try {
    const weekId = interaction.customId.split('_')[1];
    let selectedValue: number;

    if (interaction.isStringSelectMenu()) {
      selectedValue = parseInt(interaction.values[0], 10);
    } else {
      // Button interaction - extract value from customId
      selectedValue = parseInt(interaction.customId.split('_')[2] || '0', 10);
    }

    // Set commitment via API
    await apiClient.post('/commitments', {
      discordId: interaction.user.id,
      weekId,
      committedWorkouts: selectedValue,
    });

    await interaction.reply({
      content: `✅ Your commitment for this week: **${selectedValue} workouts**\n\n` +
        `You can change your commitment anytime before Monday 09:00.`,
      ephemeral: true,
    });
  } catch (error: any) {
    console.error('Error handling commitment selection:', error);
    const errorMessage =
      error.response?.data?.error || 'Failed to set commitment. Please try again.';

    if (errorMessage.includes('closed')) {
      await interaction.reply({
        content: `❌ ${errorMessage}\n\nCommitments are only open Sunday 21:00 - Monday 09:00.`,
        ephemeral: true,
      });
    } else {
      await interaction.reply({
        content: `❌ ${errorMessage}`,
        ephemeral: true,
      });
    }
  }
}

export async function createCommitmentMessage(
  channel: TextChannel,
  weekId: string,
  participantIds: string[]
) {
  // Create select menu for 0-7 workouts
  const selectMenu = new StringSelectMenuBuilder()
    .setCustomId(`commitment_${weekId}`)
    .setPlaceholder('Select how many workouts you commit to this week')
    .addOptions([
      { label: '0 workouts', value: '0', description: 'I will not commit this week' },
      { label: '1 workout', value: '1', description: 'I commit to 1 workout' },
      { label: '2 workouts', value: '2', description: 'I commit to 2 workouts' },
      { label: '3 workouts', value: '3', description: 'I commit to 3 workouts' },
      { label: '4 workouts', value: '4', description: 'I commit to 4 workouts' },
      { label: '5 workouts', value: '5', description: 'I commit to 5 workouts' },
      { label: '6 workouts', value: '6', description: 'I commit to 6 workouts' },
      { label: '7 workouts', value: '7', description: 'I commit to 7 workouts' },
    ]);

  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu);

  const embed = new EmbedBuilder()
    .setTitle('🏋️ FORGE Weekly Commitment')
    .setDescription(
      `It's time to commit to your workouts for this week!\n\n` +
        `Select how many workouts you plan to complete. You can change your commitment anytime before Monday 09:00.\n\n` +
        `**Remember:** Each workout is worth 10 points toward our community goal! 💪`
    )
    .setColor(0x5865f2)
    .setFooter({ text: 'Commitments close Monday 09:00' });

  // Tag participants if provided
  const mentionText = participantIds.length > 0 ? `<@&${participantIds[0]}>\n\n` : '';

  const message = await channel.send({
    content: mentionText,
    embeds: [embed],
    components: [row as any],
  });

  return message;
}

