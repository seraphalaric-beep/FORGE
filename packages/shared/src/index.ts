// Re-export Firebase utilities
export * from './firebase';
export * from './types';
export * from './db';

// Constants
export const POINTS_PER_WORKOUT = 10;
export const DEFAULT_TIMEZONE = 'Europe/Dublin';
export const COMMITMENT_WINDOW_OPEN_HOUR = 21; // Sunday 21:00 Dublin
export const COMMITMENT_WINDOW_CLOSE_HOUR = 9; // Monday 09:00 Dublin
export const COMMITMENT_WINDOW_CLOSE_DAY = 1; // Monday

// Initialize Firebase on import
import { initializeFirebase } from './firebase';
initializeFirebase();
