import { isQualifiedPointCommand } from './qualified-points-validation.contract';

describe('Qualified Points pure shape boundary', () => {
  it('returns false for controlled invalid commands without persistence or eligibility IO', () => {
    expect(isQualifiedPointCommand(null)).toBe(false);
    expect(isQualifiedPointCommand({})).toBe(false);
  });

  it('preserves unexpected failure identity rather than interpreting it as invalid data', () => {
    const failure = new Error('Synthetic supplied object failure');
    const supplied = {
      contractVersion: 1,
      event: null,
      recipientId: 'opaque',
      facts: [],
      contribution: null,
      facets: [],
    };
    Object.defineProperty(supplied, 'contractVersion', {
      enumerable: true,
      get() {
        throw failure;
      },
    });
    expect(() => isQualifiedPointCommand(supplied)).toThrow(failure);
  });
});
