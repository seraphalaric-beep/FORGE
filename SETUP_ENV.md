# Environment Variables Setup Guide

Copy these templates to create `.env` files in each package directory.

## packages/shared/.env

```env
# Firebase Configuration
# Option 1: Service account key (JSON string)
# Copy your Firebase service account JSON and paste it here as a single-line string
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"your-project-id",...}'

# Option 2: Project ID (uses default credentials in Google Cloud environments)
# FIREBASE_PROJECT_ID="your-firebase-project-id"
```

## packages/api/.env

```env
# Firebase Configuration
# Option 1: Service account key (JSON string)
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'
# OR Option 2: Project ID
# FIREBASE_PROJECT_ID="your-firebase-project-id"

# API Configuration
FORGE_API_SECRET="your-secret-key-here"
PORT=3000
```

## packages/worker/.env

```env
# Firebase Configuration
# Option 1: Service account key (JSON string)
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'
# OR Option 2: Project ID
# FIREBASE_PROJECT_ID="your-firebase-project-id"

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
```

## packages/bot/.env

```env
# Discord Bot Configuration
DISCORD_TOKEN="your-discord-bot-token"
CLIENT_ID="your-discord-application-id"
GUILD_ID="your-discord-guild-id" # Optional, for faster command registration in development

# API Configuration
API_BASE_URL="http://localhost:3000"
FORGE_API_SECRET="your-secret-key-here"

# Channel Configuration
COMMITMENT_CHANNEL_ID="your-commitment-channel-id"
PROGRESS_CHANNEL_ID="your-progress-channel-id"
PARTICIPANT_ROLE_ID="your-participant-role-id" # Optional, for tagging users
```

## Quick Setup Commands

After creating the `.env` files, you can copy them using PowerShell:

```powershell
# Copy templates (you'll need to edit them with your actual values)
Copy-Item SETUP_ENV.md packages/shared/.env  # Then edit manually
# Or create them manually in each package directory
```


