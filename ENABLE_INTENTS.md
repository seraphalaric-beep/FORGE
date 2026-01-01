# How to Enable Discord Bot Intents

## Step-by-Step Guide

### 1. Go to Discord Developer Portal
- Visit: https://discord.com/developers/applications
- Log in if needed

### 2. Select Your Application
- Click on your application (Client ID: 1456404036122050734)

### 3. Go to Bot Settings
- In the left sidebar, click **"Bot"**

### 4. Enable Privileged Gateway Intents
Scroll down to the **"Privileged Gateway Intents"** section and enable:

- ✅ **MESSAGE CONTENT INTENT** (Required)
  - This allows the bot to read message content
  - **IMPORTANT**: This is required for the bot to function

### 5. Save Changes
- The changes save automatically

### 6. Restart Your Bot
- Stop the bot (Ctrl+C in the bot terminal)
- Start it again: `pnpm dev` or restart the bot service

## Required Intents

Your bot needs these intents enabled:

1. **Server Members Intent** (if not already enabled)
2. **Message Content Intent** ⚠️ **PRIVILEGED - MUST ENABLE**

## Note

After enabling intents, you may need to:
- Wait a few minutes for changes to propagate
- Re-invite the bot to your server (if it was already invited)
- Restart the bot

