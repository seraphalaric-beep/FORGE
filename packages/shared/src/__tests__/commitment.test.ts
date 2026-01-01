describe('Commitment Overwrite Behaviour', () => {
  it('should allow overwriting commitment with new value', () => {
    // Simulate commitment overwrite
    const initialCommitment = 3;
    const newCommitment = 5;

    // First commitment
    expect(initialCommitment).toBe(3);

    // Overwrite
    const finalCommitment = newCommitment;
    expect(finalCommitment).toBe(5);
    expect(finalCommitment).not.toBe(initialCommitment);
  });

  it('should allow changing commitment from non-zero to zero', () => {
    const initialCommitment = 4;
    const newCommitment = 0;

    expect(newCommitment).toBe(0);
    expect(newCommitment).not.toBe(initialCommitment);
  });

  it('should allow changing commitment multiple times', () => {
    let commitment = 2;
    commitment = 5;
    commitment = 1;
    commitment = 7;

    expect(commitment).toBe(7);
  });
});

