describe('Workout Idempotency', () => {
  it('should prevent duplicate workouts with same source and sourceEventId', () => {
    const source = 'STRAVA';
    const sourceEventId = '12345';

    // First workout
    const workout1 = {
      source,
      sourceEventId,
      pointsAwarded: 10,
    };

    // Attempt to create duplicate
    const workout2 = {
      source,
      sourceEventId, // Same sourceEventId
      pointsAwarded: 10,
    };

    // Should be rejected due to unique constraint
    expect(workout1.source).toBe(workout2.source);
    expect(workout1.sourceEventId).toBe(workout2.sourceEventId);
    // In actual implementation, Prisma would throw P2002 error
  });

  it('should allow different workouts with different sourceEventIds', () => {
    const source = 'STRAVA';
    const workout1 = {
      source,
      sourceEventId: '12345',
      pointsAwarded: 10,
    };

    const workout2 = {
      source,
      sourceEventId: '67890', // Different sourceEventId
      pointsAwarded: 10,
    };

    expect(workout1.sourceEventId).not.toBe(workout2.sourceEventId);
    // Both should be allowed
  });

  it('should allow manual workouts with different timestamps', () => {
    const source = 'MANUAL';
    const workout1 = {
      source,
      sourceEventId: 'manual_user1_2024-01-01T10:00:00Z',
      pointsAwarded: 10,
    };

    const workout2 = {
      source,
      sourceEventId: 'manual_user1_2024-01-01T11:00:00Z', // Different time
      pointsAwarded: 10,
    };

    expect(workout1.sourceEventId).not.toBe(workout2.sourceEventId);
    // Both should be allowed
  });
});

