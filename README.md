# FORGE

FORGE is a community fitness accountability bot for Discord, designed for 2026. The product is deliberately simple and group-focused, helping communities track their fitness goals together.

## Architecture

FORGE is built as a monorepo with the following packages:

- **`packages/shared`**: Shared types, constants, Firebase/Firestore utilities, and database helpers
- **`packages/api`**: Fastify REST API for bot and integration webhooks
- **`packages/bot`**: Discord.js bot with slash commands and interactions
- **`packages/worker`**: BullMQ worker for scheduled jobs and webhook processing

## Tech Stack

- **TypeScript**: All packages use TypeScript
- **Firebase/Firestore**: NoSQL database via Firebase Admin SDK
- **Redis**: Queue management with BullMQ
- **Fastify**: REST API framework
- **discord.js v14+**: Discord bot framework
- **BullMQ**: Job queue and scheduling
- **date-fns**: Date/time manipulation with timezone support

## Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0
- Docker and Docker Compose (for local development)
- Firebase project with Firestore enabled
- Redis 7+ (via Docker)

## Setup

### 1. Clone and Install Dependencies

```bash
pnpm install
```

### 2. Start Infrastructure Services

Start Redis using Docker Compose:

```bash
docker-compose up -d
```

This will start:
- Redis on `localhost:6379`

**Note**: Firebase/Firestore is a cloud service and doesn't require local setup. You'll configure it via environment variables.

### 3. Configure Environment Variables

Create `.env` files in each package directory. Start with `packages/shared/.env`:

```env
# Option 1: Service account key (JSON string)
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"your-project-id",...}'

# Option 2: Project ID (uses default credentials in Google Cloud environments)
FIREBASE_PROJECT_ID="your-firebase-project-id"
```

Create `packages/api/.env`:

```env
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'
# OR
FIREBASE_PROJECT_ID="your-firebase-project-id"
FORGE_API_SECRET="your-secret-key-here"
PORT=3000
```

Create `packages/worker/.env`:

```env
FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}'
# OR
FIREBASE_PROJECT_ID="your-firebase-project-id"
REDIS_HOST=localhost
REDIS_PORT=6379
```

Create `packages/bot/.env`:

```env
DISCORD_TOKEN="your-discord-bot-token"
CLIENT_ID="your-discord-application-id"
GUILD_ID="your-discord-guild-id" # Optional, for faster command registration in development
API_BASE_URL="http://localhost:3000"
FORGE_API_SECRET="your-secret-key-here"
COMMITMENT_CHANNEL_ID="your-commitment-channel-id"
PROGRESS_CHANNEL_ID="your-progress-channel-id"
PARTICIPANT_ROLE_ID="your-participant-role-id" # Optional, for tagging users
```

### 4. Set Up Firebase

1. Create a Firebase project at https://console.firebase.google.com
2. Enable Firestore Database
3. Create a service account:
   - Go to Project Settings > Service Accounts
   - Click "Generate New Private Key"
   - Save the JSON file
4. Set the `FIREBASE_SERVICE_ACCOUNT_KEY` environment variable to the JSON content (as a string), or use `FIREBASE_PROJECT_ID` if running in Google Cloud

**Note**: Firestore collections are created automatically on first use. No migrations needed!

### 5. Build All Packages

```bash
pnpm build
```

### 6. Start Services

In separate terminals:

```bash
# Terminal 1: API
cd packages/api
pnpm dev

# Terminal 2: Worker
cd packages/worker
pnpm dev

# Terminal 3: Bot
cd packages/bot
pnpm dev
```

Or run all in parallel:

```bash
pnpm dev
```

## Core Mechanics

### Weekly Cycle

1. **Sunday 21:00 Europe/Dublin**: Commitment window opens
   - Bot posts commitment call message
   - Users select 0-7 workouts they commit to
   - Commitment window closes Monday 09:00

2. **Monday 09:00 Europe/Dublin**: Commitments close
   - Goal is calculated: `sum(committed_workouts) * 10`
   - Week status changes to ACTIVE
   - Bot creates/updates pinned progress message

3. **During the week**: Users log workouts
   - Each workout = 10 points
   - Progress message updates (debounced to avoid rate limits)
   - Users receive DM confirmation

4. **Sunday 21:00 Europe/Dublin**: Week ends
   - Bot posts weekly recap with shout outs
   - New week opens immediately

### Points System

- Each completed workout = **10 points**
- Community goal = sum of all committed workouts × 10
- Goal is calculated once at commitment close and does not change mid-week

### Commitment Rules

- Users can commit 0-7 workouts per week
- Commitments can be changed anytime before Monday 09:00
- Users who don't commit are NOT counted in the weekly goal
- Non-committed users CAN still log workouts and contribute points

## Discord Commands

- `/forge join` - Join FORGE and start your fitness journey
- `/forge leave` - Leave FORGE
- `/forge log` - Log a completed workout (earns 10 points)
- `/forge status` - Check your commitment, workouts, and community progress
- `/forge admin setchannels` - (Admin only) Set commitment and progress channels

## Testing

### Unit Tests

Run unit tests:

```bash
pnpm test
```

Tests cover:
- Goal calculation logic
- Commitment overwrite behaviour
- Workout idempotency

### Integration Test

Run the full weekly cycle simulation:

```bash
# Make sure database is running
docker-compose up -d

# Run integration test
tsx scripts/integration-test.ts
```

The integration test simulates:
1. Creating a week
2. Commitments from 3 users
3. Closing commitments
4. Logging workouts
5. Verifying progress and recap categories

## Manual Testing of Weekly Jobs

To manually trigger weekly jobs for testing:

1. **Test commitment open** (Sunday 21:00):
   - Manually call the worker job or adjust system time
   - Verify commitment message is posted

2. **Test commitment close** (Monday 09:00):
   - Manually trigger the close job
   - Verify goal is calculated correctly
   - Verify progress message is created/pinned

3. **Test week end and recap** (Sunday 21:00):
   - Manually trigger the end job
   - Verify recap message is posted with correct categories
   - Verify new week opens

## Firestore Collections

Key collections (created automatically on first use):
- **users**: Discord users with timezone and active status
- **weeks**: Weekly cycles with status (OPEN, ACTIVE, ENDED)
- **commitments**: User commitments per week (0-7 workouts)
- **workouts**: Logged workouts with source (MANUAL, STRAVA, HEVY)
- **pointsLedger**: Audit trail of all points awarded
- **webhookEvents**: Integration webhook events (idempotency)
- **integrationStrava/integrationHevy**: OAuth tokens for integrations

## Integration Stubs

Phase 2 integrations are stubbed with:
- Database tables for integration identities and tokens
- Webhook endpoints (`POST /webhooks/strava`, `POST /webhooks/hevy`)
- Worker job skeletons for processing webhooks
- Idempotency enforcement via unique constraints

## Development

### Project Structure

```
FORGE/
├── packages/
│   ├── shared/          # Prisma schema, types, constants
│   ├── api/            # Fastify REST API
│   ├── bot/            # Discord.js bot
│   └── worker/         # BullMQ worker and scheduled jobs
├── scripts/            # Integration tests and utilities
├── docker-compose.yml  # Local infrastructure
└── package.json        # Root workspace config
```

### Code Style

- TypeScript strict mode enabled
- Prettier for formatting
- ESLint (can be added)
- All times stored in UTC, displayed in Europe/Dublin

### Adding New Features

1. Update TypeScript types in `packages/shared/src/types.ts` if needed
2. Add Firestore collection helpers in `packages/shared/src/db.ts` if needed
3. Implement in appropriate package
4. Add tests
5. Update documentation

## Environment Variables Reference

### Shared (packages/shared/.env)
- `FIREBASE_SERVICE_ACCOUNT_KEY` - Firebase service account JSON (as string) OR
- `FIREBASE_PROJECT_ID` - Firebase project ID (for default credentials)

### API (packages/api/.env)
- `FIREBASE_SERVICE_ACCOUNT_KEY` or `FIREBASE_PROJECT_ID` - Firebase configuration
- `FORGE_API_SECRET` - Shared secret for bot-API authentication
- `PORT` - API server port (default: 3000)

### Worker (packages/worker/.env)
- `FIREBASE_SERVICE_ACCOUNT_KEY` or `FIREBASE_PROJECT_ID` - Firebase configuration
- `REDIS_HOST` - Redis host (default: localhost)
- `REDIS_PORT` - Redis port (default: 6379)

### Bot (packages/bot/.env)
- `DISCORD_TOKEN` - Discord bot token
- `CLIENT_ID` - Discord application ID
- `GUILD_ID` - (Optional) Discord guild ID for faster command registration
- `API_BASE_URL` - API server URL
- `FORGE_API_SECRET` - Shared secret for bot-API authentication
- `COMMITMENT_CHANNEL_ID` - Channel for commitment messages
- `PROGRESS_CHANNEL_ID` - Channel for progress messages
- `PARTICIPANT_ROLE_ID` - (Optional) Role ID to tag in commitment calls

## Troubleshooting

### Firebase Connection Issues

- Verify `FIREBASE_SERVICE_ACCOUNT_KEY` or `FIREBASE_PROJECT_ID` is set correctly
- Check that Firestore is enabled in your Firebase project
- Verify service account has Firestore permissions
- Check Firebase project billing (Firestore requires a billing account for production)

### Redis Connection Issues

- Check Redis is running: `docker-compose logs redis`
- Verify REDIS_HOST and REDIS_PORT in worker .env

### Bot Not Responding

- Check DISCORD_TOKEN is valid
- Verify API_BASE_URL is correct
- Check FORGE_API_SECRET matches between bot and API
- Review bot logs for errors

### Commands Not Registering

- Check CLIENT_ID is correct
- For faster development, set GUILD_ID
- Commands may take up to 1 hour to register globally

## License

Private project - All rights reserved
