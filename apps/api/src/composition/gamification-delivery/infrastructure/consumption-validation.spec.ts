/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Consumption Input Boundary Verification
 * 📄 File: apps/api/src/composition/gamification-delivery/infrastructure/consumption-validation.spec.ts
 * 🎯 Purpose: Proves malformed technical coordinates cannot reach a database transaction.
 * 🧠 Responsibilities: Covers precision loss, invalid owner dispositions and canonical progress.
 * 🏗️ Architecture: Boundary unit tests; database concurrency is proved separately.
 * ⚠️ Important: Accepting a shape does not authorize a user or execute an owner command.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { PrismaService } from '@api/core/database';
import type {
  ConsumptionClaim,
  OwnerCompletion,
} from '../contracts/consumption.types';
import { PrismaConsumptionRepository } from './prisma-consumption.repository';
import { parseConsumptionProgress } from './consumption-validation';

const claim: ConsumptionClaim = {
  admissionId: '10000000-0000-0000-0000-000000000001',
  token: '20000000-0000-0000-0000-000000000001',
  epoch: 0n,
  sequence: 1n,
  leaseUntil: '2026-11-09T00:01:00.000Z',
};
describe('Consumption technical input boundary', () => {
  it.each([
    { admissionId: 'not-a-uuid' },
    { token: 'not-a-token' },
    { epoch: 0 },
    { sequence: 0n },
    { epoch: -1n },
    { epoch: 9223372036854775808n },
    { sequence: 9223372036854775808n },
    { leaseUntil: 'invalid' },
  ])(
    'rejects malformed coordinates before database access: %p',
    async (patch) => {
      const transaction = jest.fn();
      const repository = new PrismaConsumptionRepository({
        $transaction: transaction,
      } as unknown as PrismaService);
      await expect(
        repository.load({ ...claim, ...patch } as ConsumptionClaim),
      ).rejects.toBeInstanceOf(TypeError);
      expect(transaction).not.toHaveBeenCalled();
    },
  );

  it.each([
    { owner: 'UNKNOWN', disposition: 'COMPLETE' },
    { owner: 'POINTS', disposition: 'ADMIN' },
    { owner: 'LEVELS', disposition: 'APPLIED' },
    { owner: 'ACHIEVEMENTS', disposition: 'RETRY' },
  ])(
    'rejects unsupported outcome before database access: %p',
    async (outcome) => {
      const transaction = jest.fn();
      const repository = new PrismaConsumptionRepository({
        $transaction: transaction,
      } as unknown as PrismaService);
      await expect(
        repository.completeOwner(claim, outcome as OwnerCompletion),
      ).rejects.toBeInstanceOf(TypeError);
      expect(transaction).not.toHaveBeenCalled();
    },
  );

  it.each(['01', '-1', '1.5', '9223372036854775808'])(
    'rejects noncanonical progress coordinate %s',
    (sequence) => {
      expect(() =>
        parseConsumptionProgress({
          scope: { producer: 'p', sourceKind: 's', sourceId: 'id' },
          generation: '1',
          sequence,
        }),
      ).toThrow();
    },
  );

  it('preserves exact maximum signed BigInt coordinates as strings', () => {
    const input = {
      scope: { producer: 'p', sourceKind: 's', sourceId: 'id' },
      generation: '0',
      sequence: '9223372036854775807',
    };
    expect(parseConsumptionProgress(input)).toEqual(input);
  });
});
