import {
  getFirestore,
  COLLECTIONS,
  timestampToDate,
  dateToTimestamp,
  docToData,
} from './firebase';
import type {
  User,
  Week,
  Commitment,
  Workout,
  PointsLedger,
  WebhookEvent,
  IntegrationStrava,
  IntegrationHevy,
  GuildConfig,
  UserData,
  WeekData,
  CommitmentData,
  WorkoutData,
  PointsLedgerData,
  WebhookEventData,
  IntegrationStravaData,
  IntegrationHevyData,
  GuildConfigData,
} from './types';
import * as admin from 'firebase-admin';

const db = getFirestore();

// Helper to convert Firestore data to typed object with Date conversion
function convertDates<T extends Record<string, any>>(data: any): T {
  const result = { ...data };
  for (const key in result) {
    if (result[key] instanceof admin.firestore.Timestamp) {
      result[key] = result[key].toDate();
    } else if (result[key] && typeof result[key] === 'object' && result[key].toDate) {
      result[key] = result[key].toDate();
    }
  }
  return result as T;
}

// User operations
export const users = {
  async findById(id: string): Promise<User | null> {
    const doc = await db.collection(COLLECTIONS.USERS).doc(id).get();
    if (!doc.exists) {
      return null;
    }
    const data = convertDates(doc.data()!);
    return { id: doc.id, ...data } as User;
  },

  async findUnique(where: { discordId: string }): Promise<User | null> {
    const snapshot = await db
      .collection(COLLECTIONS.USERS)
      .where('discordId', '==', where.discordId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    const data = convertDates(doc.data());
    return { id: doc.id, ...data } as User;
  },

  async upsert(args: {
    where: { discordId: string };
    update?: Partial<UserData>;
    create: UserData;
  }): Promise<User> {
    const existing = await users.findUnique({ discordId: args.where.discordId });

    if (existing) {
      const updateData: any = { ...args.update };
      // Convert dates to timestamps
      if (updateData.joinedAt) {
        updateData.joinedAt = dateToTimestamp(updateData.joinedAt);
      }

      await db.collection(COLLECTIONS.USERS).doc(existing.id).update(updateData);
      return { ...existing, ...args.update } as User;
    } else {
      const createData: any = { ...args.create };
      if (createData.joinedAt) {
        createData.joinedAt = dateToTimestamp(createData.joinedAt);
      }

      const docRef = await db.collection(COLLECTIONS.USERS).add(createData);
      const doc = await docRef.get();
      const data = convertDates(doc.data()!);
      return { id: doc.id, ...data } as User;
    }
  },

  async update(args: { where: { discordId: string }; data: Partial<UserData> }): Promise<User> {
    const existing = await users.findUnique({ discordId: args.where.discordId });
    if (!existing) {
      throw new Error('User not found');
    }

    const updateData: any = { ...args.data };
    if (updateData.joinedAt) {
      updateData.joinedAt = dateToTimestamp(updateData.joinedAt);
    }

    await db.collection(COLLECTIONS.USERS).doc(existing.id).update(updateData);
    return { ...existing, ...args.data } as User;
  },
};

// Week operations
export const weeks = {
  async findFirst(args: {
    where?: {
      status?: { in?: Week['status'][] };
      startsAt?: { lte?: Date; gt?: Date };
      endsAt?: { gt?: Date };
    };
    orderBy?: { startsAt?: 'asc' | 'desc' };
    include?: { _count?: { select: { commitments?: boolean; workouts?: boolean } } };
  }): Promise<(Week & { _count?: { commitments: number; workouts: number } }) | null> {
    let query: admin.firestore.Query = db.collection(COLLECTIONS.WEEKS);

    if (args.where?.status?.in) {
      query = query.where('status', 'in', args.where.status.in);
    }

    if (args.where?.startsAt?.lte) {
      query = query.where('startsAt', '<=', dateToTimestamp(args.where.startsAt.lte));
    }

    if (args.where?.endsAt?.gt) {
      query = query.where('endsAt', '>', dateToTimestamp(args.where.endsAt.gt));
    }

    if (args.orderBy?.startsAt) {
      query = query.orderBy('startsAt', args.orderBy.startsAt);
    } else {
      query = query.orderBy('startsAt', 'desc');
    }

    query = query.limit(1);

    const snapshot = await query.get();
    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    const data = convertDates(doc.data());

    let result: Week & { _count?: { commitments: number; workouts: number } } = {
      id: doc.id,
      ...data,
    } as Week;

    if (args.include?._count) {
      const weekId = doc.id;
      const [commitmentsCount, workoutsCount] = await Promise.all([
        args.include._count.select?.commitments
          ? db.collection(COLLECTIONS.COMMITMENTS).where('weekId', '==', weekId).get().then((s) => s.size)
          : Promise.resolve(0),
        args.include._count.select?.workouts
          ? db.collection(COLLECTIONS.WORKOUTS).where('weekId', '==', weekId).get().then((s) => s.size)
          : Promise.resolve(0),
      ]);
      result._count = { commitments: commitmentsCount, workouts: workoutsCount };
    }

    return result;
  },

  async findUnique(where: { id: string }): Promise<Week | null> {
    const doc = await db.collection(COLLECTIONS.WEEKS).doc(where.id).get();
    if (!doc.exists) {
      return null;
    }
    const data = convertDates(doc.data()!);
    return { id: doc.id, ...data } as Week;
  },

  async create(data: WeekData): Promise<Week> {
    const createData: any = {
      ...data,
      startsAt: dateToTimestamp(data.startsAt),
      commitmentsOpenAt: dateToTimestamp(data.commitmentsOpenAt),
      commitmentsCloseAt: dateToTimestamp(data.commitmentsCloseAt),
      endsAt: dateToTimestamp(data.endsAt),
    };

    const docRef = await db.collection(COLLECTIONS.WEEKS).add(createData);
    const doc = await docRef.get();
    const docData = convertDates(doc.data()!);
    return { id: doc.id, ...docData } as Week;
  },

  async update(args: { where: { id: string }; data: Partial<WeekData> }): Promise<Week> {
    const updateData: any = { ...args.data };
    if (updateData.startsAt) updateData.startsAt = dateToTimestamp(updateData.startsAt);
    if (updateData.commitmentsOpenAt)
      updateData.commitmentsOpenAt = dateToTimestamp(updateData.commitmentsOpenAt);
    if (updateData.commitmentsCloseAt)
      updateData.commitmentsCloseAt = dateToTimestamp(updateData.commitmentsCloseAt);
    if (updateData.endsAt) updateData.endsAt = dateToTimestamp(updateData.endsAt);

    await db.collection(COLLECTIONS.WEEKS).doc(args.where.id).update(updateData);
    const doc = await db.collection(COLLECTIONS.WEEKS).doc(args.where.id).get();
    const docData = convertDates(doc.data()!);
    return { id: doc.id, ...docData } as Week;
  },
};

// Commitment operations
export const commitments = {
  async findUnique(where: { userId_weekId: { userId: string; weekId: string } }): Promise<Commitment | null> {
    const snapshot = await db
      .collection(COLLECTIONS.COMMITMENTS)
      .where('userId', '==', where.userId_weekId.userId)
      .where('weekId', '==', where.userId_weekId.weekId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    const data = convertDates(doc.data());
    return { id: doc.id, ...data } as Commitment;
  },

  async findMany(args: { where: { weekId: string } }): Promise<Commitment[]> {
    const snapshot = await db
      .collection(COLLECTIONS.COMMITMENTS)
      .where('weekId', '==', args.where.weekId)
      .get();

    return snapshot.docs.map((doc) => {
      const data = convertDates(doc.data());
      return { id: doc.id, ...data } as Commitment;
    });
  },

  async upsert(args: {
    where: { userId_weekId: { userId: string; weekId: string } };
    update?: Partial<CommitmentData>;
    create: CommitmentData;
  }): Promise<Commitment> {
    const existing = await commitments.findUnique({ userId_weekId: args.where.userId_weekId });

    if (existing) {
      const updateData: any = { ...args.update, updatedAt: dateToTimestamp(new Date()) };
      await db.collection(COLLECTIONS.COMMITMENTS).doc(existing.id).update(updateData);
      return { ...existing, ...args.update, updatedAt: new Date() } as Commitment;
    } else {
      const createData: any = {
        ...args.create,
        updatedAt: dateToTimestamp(new Date()),
      };
      const docRef = await db.collection(COLLECTIONS.COMMITMENTS).add(createData);
      const doc = await docRef.get();
      const data = convertDates(doc.data()!);
      return { id: doc.id, ...data } as Commitment;
    }
  },
};

// Workout operations
export const workouts = {
  async findUnique(where: {
    source_sourceEventId: { source: Workout['source']; sourceEventId: string };
  }): Promise<Workout | null> {
    const snapshot = await db
      .collection(COLLECTIONS.WORKOUTS)
      .where('source', '==', where.source_sourceEventId.source)
      .where('sourceEventId', '==', where.source_sourceEventId.sourceEventId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    const data = convertDates(doc.data());
    return { id: doc.id, ...data } as Workout;
  },

  async findMany(args: { where: { weekId: string; userId?: string } }): Promise<Workout[]> {
    let query: admin.firestore.Query = db
      .collection(COLLECTIONS.WORKOUTS)
      .where('weekId', '==', args.where.weekId);

    if (args.where.userId) {
      query = query.where('userId', '==', args.where.userId);
    }

    const snapshot = await query.get();
    return snapshot.docs.map((doc) => {
      const data = convertDates(doc.data());
      return { id: doc.id, ...data } as Workout;
    });
  },

  async create(data: WorkoutData): Promise<Workout> {
    const createData: any = {
      ...data,
      occurredAt: dateToTimestamp(data.occurredAt),
      createdAt: dateToTimestamp(data.createdAt || new Date()),
    };

    const docRef = await db.collection(COLLECTIONS.WORKOUTS).add(createData);
    const doc = await docRef.get();
    const docData = convertDates(doc.data()!);
    return { id: doc.id, ...docData } as Workout;
  },

  async count(args: { where: { weekId: string } }): Promise<number> {
    const snapshot = await db
      .collection(COLLECTIONS.WORKOUTS)
      .where('weekId', '==', args.where.weekId)
      .get();
    return snapshot.size;
  },
};

// PointsLedger operations
export const pointsLedger = {
  async create(data: PointsLedgerData): Promise<PointsLedger> {
    const createData: any = {
      ...data,
      createdAt: dateToTimestamp(data.createdAt || new Date()),
    };

    const docRef = await db.collection(COLLECTIONS.POINTS_LEDGER).add(createData);
    const doc = await docRef.get();
    const docData = convertDates(doc.data()!);
    return { id: doc.id, ...docData } as PointsLedger;
  },
};

// WebhookEvent operations
export const webhookEvents = {
  async findById(id: string): Promise<WebhookEvent | null> {
    const doc = await db.collection(COLLECTIONS.WEBHOOK_EVENTS).doc(id).get();
    if (!doc.exists) {
      return null;
    }
    const data = convertDates(doc.data()!);
    return { id: doc.id, ...data } as WebhookEvent;
  },

  async findUnique(where: {
    source_sourceEventId: { source: WebhookEvent['source']; sourceEventId: string };
  }): Promise<WebhookEvent | null> {
    const snapshot = await db
      .collection(COLLECTIONS.WEBHOOK_EVENTS)
      .where('source', '==', where.source_sourceEventId.source)
      .where('sourceEventId', '==', where.source_sourceEventId.sourceEventId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    const data = convertDates(doc.data());
    return { id: doc.id, ...data } as WebhookEvent;
  },

  async upsert(args: {
    where: { source_sourceEventId: { source: WebhookEvent['source']; sourceEventId: string } };
    update?: Partial<WebhookEventData>;
    create: WebhookEventData;
  }): Promise<WebhookEvent> {
    const existing = await webhookEvents.findUnique({ source_sourceEventId: args.where.source_sourceEventId });

    if (existing) {
      const updateData: any = { ...args.update };
      if (updateData.receivedAt) updateData.receivedAt = dateToTimestamp(updateData.receivedAt);
      if (updateData.processedAt) updateData.processedAt = dateToTimestamp(updateData.processedAt);

      await db.collection(COLLECTIONS.WEBHOOK_EVENTS).doc(existing.id).update(updateData);
      return { ...existing, ...args.update } as WebhookEvent;
    } else {
      const createData: any = {
        ...args.create,
        receivedAt: dateToTimestamp(args.create.receivedAt || new Date()),
      };
      if (createData.processedAt) {
        createData.processedAt = dateToTimestamp(createData.processedAt);
      }

      const docRef = await db.collection(COLLECTIONS.WEBHOOK_EVENTS).add(createData);
      const doc = await docRef.get();
      const data = convertDates(doc.data()!);
      return { id: doc.id, ...data } as WebhookEvent;
    }
  },

  async update(args: { where: { id: string }; data: Partial<WebhookEventData> }): Promise<WebhookEvent> {
    const updateData: any = { ...args.data };
    if (updateData.receivedAt) updateData.receivedAt = dateToTimestamp(updateData.receivedAt);
    if (updateData.processedAt) updateData.processedAt = dateToTimestamp(updateData.processedAt);

    await db.collection(COLLECTIONS.WEBHOOK_EVENTS).doc(args.where.id).update(updateData);
    const doc = await db.collection(COLLECTIONS.WEBHOOK_EVENTS).doc(args.where.id).get();
    const docData = convertDates(doc.data()!);
    return { id: doc.id, ...docData } as WebhookEvent;
  },
};

// Transaction helper (Firestore transactions)
export async function transaction<T>(
  callback: (tx: admin.firestore.Transaction) => Promise<T>
): Promise<T> {
  return db.runTransaction(callback);
}

// Helper for atomic increment (used for week.currentPoints)
export async function incrementWeekPoints(weekId: string, points: number): Promise<void> {
  await db.runTransaction(async (tx) => {
    const weekRef = db.collection(COLLECTIONS.WEEKS).doc(weekId);
    const weekDoc = await tx.get(weekRef);
    if (!weekDoc.exists) {
      throw new Error('Week not found');
    }
    const currentPoints = weekDoc.data()!.currentPoints || 0;
    tx.update(weekRef, { currentPoints: currentPoints + points });
  });
}

// Helper to create workout, points ledger entry, and increment week points atomically
export async function createWorkoutWithPoints(
  workoutData: WorkoutData,
  pointsLedgerData: PointsLedgerData,
  weekId: string,
  points: number
): Promise<Workout> {
  const workoutId = db.collection(COLLECTIONS.WORKOUTS).doc().id;
  const workoutRef = db.collection(COLLECTIONS.WORKOUTS).doc(workoutId);

  return db.runTransaction(async (tx) => {
    // Create workout
    const workoutCreateData: any = {
      ...workoutData,
      occurredAt: dateToTimestamp(workoutData.occurredAt),
      createdAt: dateToTimestamp(workoutData.createdAt || new Date()),
    };
    tx.set(workoutRef, workoutCreateData);

    // Create points ledger entry
    const ledgerRef = db.collection(COLLECTIONS.POINTS_LEDGER).doc();
    const ledgerCreateData: any = {
      ...pointsLedgerData,
      createdAt: dateToTimestamp(pointsLedgerData.createdAt || new Date()),
    };
    tx.set(ledgerRef, ledgerCreateData);

    // Increment week points
    const weekRef = db.collection(COLLECTIONS.WEEKS).doc(weekId);
    const weekDoc = await tx.get(weekRef);
    if (!weekDoc.exists) {
      throw new Error('Week not found');
    }
    const currentPoints = weekDoc.data()!.currentPoints || 0;
    tx.update(weekRef, { currentPoints: currentPoints + points });

    // Return workout data (we already have the ID)
    const workoutDocData = convertDates(workoutCreateData);
    return { id: workoutId, ...workoutDocData } as Workout;
  });
}

// Guild configuration operations
export const guildConfig = {
  async findByGuildId(guildId: string): Promise<GuildConfig | null> {
    const doc = await db.collection(COLLECTIONS.GUILD_CONFIG).doc(guildId).get();
    if (!doc.exists) {
      return null;
    }
    const data = convertDates(doc.data()!);
    return { id: doc.id, ...data } as GuildConfig;
  },

  async upsert(guildId: string, data: Partial<GuildConfigData>): Promise<GuildConfig> {
    const updateData: any = {
      ...data,
      updatedAt: dateToTimestamp(new Date()),
    };

    await db.collection(COLLECTIONS.GUILD_CONFIG).doc(guildId).set(updateData, { merge: true });

    const doc = await db.collection(COLLECTIONS.GUILD_CONFIG).doc(guildId).get();
    const docData = convertDates(doc.data()!);
    return { id: doc.id, ...docData } as GuildConfig;
  },
};

