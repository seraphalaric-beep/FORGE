import { Client, GatewayIntentBits, REST, Routes } from 'discord.js';
import dotenv from 'dotenv';
import axios from 'axios';
import { forgeCommand, commands } from './commands';
import { handleInteraction } from './interactions';
import { setupScheduledTasks } from './scheduler';

dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const API_SECRET = process.env.FORGE_API_SECRET || '';

if (!API_SECRET) {
  console.error('FORGE_API_SECRET is required');
  process.exit(1);
}

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'x-forge-secret': API_SECRET,
  },
});

// Register slash commands
async function registerCommands() {
  const rest = new REST().setToken(process.env.DISCORD_TOKEN || '');

  try {
    console.log('Registering slash commands...');

    const commandsData = [forgeCommand.toJSON()];

    if (process.env.GUILD_ID) {
      // Register to specific guild (faster for development)
      await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID || '', process.env.GUILD_ID), {
        body: commandsData,
      });
      console.log(`Registered ${commandsData.length} commands to guild ${process.env.GUILD_ID}`);
    } else {
      // Register globally
      await rest.put(Routes.applicationCommands(process.env.CLIENT_ID || ''), {
        body: commandsData,
      });
      console.log(`Registered ${commandsData.length} commands globally`);
    }
  } catch (error) {
    console.error('Error registering commands:', error);
  }
}

client.once('ready', async () => {
  console.log(`Bot logged in as ${client.user?.tag}`);
  await registerCommands();
  await setupScheduledTasks(client, apiClient);
});

client.on('interactionCreate', async (interaction) => {
  await handleInteraction(interaction, apiClient);
});

client.login(process.env.DISCORD_TOKEN);

// Graceful shutdown
process.on('SIGTERM', () => {
  client.destroy();
  process.exit(0);
});

process.on('SIGINT', () => {
  client.destroy();
  process.exit(0);
});

