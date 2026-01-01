import * as admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Firebase Admin SDK
let app: admin.app.App;

export function initializeFirebase(): admin.app.App {
  if (admin.apps.length === 0) {
    // Check if we have a service account key file
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      app = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } else if (process.env.FIREBASE_PROJECT_ID) {
      // Use default credentials (for Google Cloud environments)
      app = admin.initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID,
      });
    } else {
      throw new Error(
        'Firebase not initialized. Set FIREBASE_SERVICE_ACCOUNT_KEY or FIREBASE_PROJECT_ID environment variable.'
      );
    }
  } else {
    app = admin.app();
  }
  return app;
}

export function getFirestore(): admin.firestore.Firestore {
  if (!app) {
    initializeFirebase();
  }
  return admin.firestore();
}

// Collection names
export const COLLECTIONS = {
  USERS: 'users',
  WEEKS: 'weeks',
  COMMITMENTS: 'commitments',
  WORKOUTS: 'workouts',
  POINTS_LEDGER: 'pointsLedger',
  WEBHOOK_EVENTS: 'webhookEvents',
  INTEGRATION_STRAVA: 'integrationStrava',
  INTEGRATION_HEVY: 'integrationHevy',
  GUILD_CONFIG: 'guildConfig',
} as const;

// Helper to convert Firestore timestamps to Date
export function timestampToDate(timestamp: admin.firestore.Timestamp | Date | null | undefined): Date {
  if (!timestamp) {
    return new Date();
  }
  if (timestamp instanceof Date) {
    return timestamp;
  }
  return timestamp.toDate();
}

// Helper to convert Date to Firestore timestamp
export function dateToTimestamp(date: Date): admin.firestore.Timestamp {
  return admin.firestore.Timestamp.fromDate(date);
}

// Helper to convert Firestore document to typed object
export function docToData<T extends { id: string }>(
  doc: admin.firestore.DocumentSnapshot
): T | null {
  if (!doc.exists) {
    return null;
  }
  return {
    id: doc.id,
    ...doc.data(),
  } as T;
}

