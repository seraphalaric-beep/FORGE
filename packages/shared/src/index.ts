// Re-export Prisma client
export { PrismaClient } from '@prisma/client';
export * from '@prisma/client';

// Constants
export const POINTS_PER_WORKOUT = 10;
export const DEFAULT_TIMEZONE = 'Europe/Dublin';
export const COMMITMENT_WINDOW_OPEN_HOUR = 21; // Sunday 21:00 Dublin
export const COMMITMENT_WINDOW_CLOSE_HOUR = 9; // Monday 09:00 Dublin
export const COMMITMENT_WINDOW_CLOSE_DAY = 1; // Monday

// Types
export type WeekStatus = 'OPEN' | 'ACTIVE' | 'ENDED';
export type WorkoutSource = 'MANUAL' | 'STRAVA' | 'HEVY';
export type WebhookSource = 'STRAVA' | 'HEVY';
export type WebhookEventStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

// Utility functions
export function createPrismaClient() {
  return new PrismaClient();
}

