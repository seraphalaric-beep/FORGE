// TypeScript types for FORGE data models
// All times stored in UTC, displayed in Europe/Dublin

export type WeekStatus = 'OPEN' | 'ACTIVE' | 'ENDED';
export type WorkoutSource = 'MANUAL' | 'STRAVA' | 'HEVY';
export type WebhookSource = 'STRAVA' | 'HEVY';
export type WebhookEventStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface User {
  id: string;
  discordId: string;
  joinedAt: Date;
  timezone: string;
  isActive: boolean;
}

export interface Week {
  id: string;
  startsAt: Date;
  commitmentsOpenAt: Date;
  commitmentsCloseAt: Date;
  endsAt: Date;
  goalPoints: number;
  currentPoints: number;
  progressMessageChannelId?: string;
  progressMessageId?: string;
  commitmentMessageChannelId?: string;
  commitmentMessageId?: string;
  status: WeekStatus;
}

export interface Commitment {
  id: string;
  weekId: string;
  userId: string;
  committedWorkouts: number; // 0-7
  updatedAt: Date;
}

export interface Workout {
  id: string;
  weekId: string;
  userId: string;
  source: WorkoutSource;
  sourceEventId?: string; // For idempotency: unique per source
  occurredAt: Date;
  pointsAwarded: number;
  createdAt: Date;
}

export interface PointsLedger {
  id: string;
  weekId: string;
  userId: string;
  reason: string;
  points: number;
  createdAt: Date;
}

export interface WebhookEvent {
  id: string;
  source: WebhookSource;
  sourceEventId: string;
  receivedAt: Date;
  processedAt?: Date;
  status: WebhookEventStatus;
  payloadJson: string;
}

export interface IntegrationStrava {
  id: string;
  userId: string;
  athleteId?: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
}

export interface IntegrationHevy {
  id: string;
  userId: string;
  hevyUserId?: string;
  tokenOrKey?: string;
}

export interface GuildConfig {
  id: string; // guildId
  commitmentChannelId?: string;
  progressChannelId?: string;
  participantRoleId?: string;
  updatedAt: Date;
}

// Firestore document data (without id)
export type UserData = Omit<User, 'id'>;
export type WeekData = Omit<Week, 'id'>;
export type CommitmentData = Omit<Commitment, 'id'>;
export type WorkoutData = Omit<Workout, 'id'>;
export type PointsLedgerData = Omit<PointsLedger, 'id'>;
export type WebhookEventData = Omit<WebhookEvent, 'id'>;
export type IntegrationStravaData = Omit<IntegrationStrava, 'id'>;
export type IntegrationHevyData = Omit<IntegrationHevy, 'id'>;
export type GuildConfigData = Omit<GuildConfig, 'id'>;

