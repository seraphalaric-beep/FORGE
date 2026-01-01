import { POINTS_PER_WORKOUT } from '../index';

describe('Goal Calculation', () => {
  it('should calculate goal points correctly', () => {
    const committedWorkouts = [3, 5, 2, 4];
    const totalCommitted = committedWorkouts.reduce((sum, w) => sum + w, 0);
    const goalPoints = totalCommitted * POINTS_PER_WORKOUT;

    expect(goalPoints).toBe(14 * POINTS_PER_WORKOUT);
    expect(goalPoints).toBe(140);
  });

  it('should handle zero commitments', () => {
    const committedWorkouts: number[] = [];
    const totalCommitted = committedWorkouts.reduce((sum, w) => sum + w, 0);
    const goalPoints = totalCommitted * POINTS_PER_WORKOUT;

    expect(goalPoints).toBe(0);
  });

  it('should handle maximum commitments (7 per user)', () => {
    const committedWorkouts = [7, 7, 7];
    const totalCommitted = committedWorkouts.reduce((sum, w) => sum + w, 0);
    const goalPoints = totalCommitted * POINTS_PER_WORKOUT;

    expect(goalPoints).toBe(21 * POINTS_PER_WORKOUT);
    expect(goalPoints).toBe(210);
  });
});

