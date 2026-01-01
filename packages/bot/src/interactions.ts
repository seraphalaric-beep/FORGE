import {
  Interaction,
  ButtonInteraction,
  StringSelectMenuInteraction,
  ModalSubmitInteraction,
} from 'discord.js';
import { commands } from './commands';
import { handleCommitmentSelection, createCommitmentMessage } from './commitments';

export async function handleInteraction(interaction: Interaction, apiClient: any) {
  if (interaction.isChatInputCommand()) {
    const commandName = interaction.options.getSubcommand(false) || interaction.commandName;

    // Handle /forge commands
    if (interaction.commandName === 'forge') {
      const subcommand = interaction.options.getSubcommand(false);

      if (subcommand === 'join' && commands.join) {
        await commands.join.handler(interaction, apiClient);
      } else if (subcommand === 'leave' && commands.leave) {
        await commands.leave.handler(interaction, apiClient);
      } else if (subcommand === 'log' && commands.log) {
        await commands.log.handler(interaction, apiClient);
      } else if (subcommand === 'status' && commands.status) {
        await commands.status.handler(interaction, apiClient);
      } else if (subcommand === 'admin' && commands.adminSetChannels) {
        const adminSub = interaction.options.getSubcommand(false);
        if (adminSub === 'setchannels') {
          await commands.adminSetChannels.handler(interaction, apiClient);
        }
      }
    }
  } else if (interaction.isButton() || interaction.isStringSelectMenu()) {
    // Handle commitment selection
    if (interaction.customId.startsWith('commitment_')) {
      await handleCommitmentSelection(interaction as ButtonInteraction | StringSelectMenuInteraction, apiClient);
    }
  } else if (interaction.isModalSubmit()) {
    // Handle modal submissions if needed
    // Currently no modals, but /forge log could use one in the future
  }
}

