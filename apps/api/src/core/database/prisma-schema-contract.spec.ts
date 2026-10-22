/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Database Contract Tests
 * 📄 File: apps/api/src/core/database/prisma-schema-contract.spec.ts
 *
 * 🎯 Purpose:
 * Guards approved Prisma annotations that preserve historical SQL contracts.
 *
 * 🏗️ Architecture:
 * Static schema evidence only; migrated DB/client behavior is tested separately.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const schema = readFileSync(
  resolve(__dirname, '../../../prisma/schema.prisma'),
  'utf8',
);
function model(name: string): string {
  const match = new RegExp(`^model ${name} \\{([\\s\\S]*?)^\\}`, 'm').exec(
    schema,
  );
  if (!match) throw new Error(`Missing expected Prisma model: ${name}`);
  return match[1];
}

describe('historical Prisma schema contracts', () => {
  it.each([
    'AchievementDefinition',
    'AchievementRule',
    'Comment',
    'CommunityPointRule',
    'CustomTitleSettings',
    'CustomTitle',
    'InteractionTarget',
    'LevelDefinition',
    'ReactionAggregate',
    'Reaction',
    'ReputationPolicy',
    'UserTitleSelection',
  ])('%s retains both its SQL default and Prisma automatic update', (name) => {
    const field = /^\s*updatedAt\s+DateTime\s+([^\r\n]+)$/m.exec(
      model(name),
    )?.[1];
    expect(field).toContain('@default(now())');
    expect(field).toContain('@updatedAt');
  });

  it('Outbox ID retains its existing native UUID representation', () => {
    const id = /^\s*id\s+String\s+([^\r\n]+)$/m.exec(model('OutboxEvent'))?.[1];
    expect(id).toContain('@db.Uuid');
    expect(id).toContain('@id');
    expect(id).toContain('@default(uuid())');
  });

  it('Users retains both existing operational index definitions', () => {
    const users = model('User');
    expect(users).toContain(
      '@@index([loginLockedUntil], map: "users_loginLockedUntil_idx")',
    );
    expect(users).toContain(
      '@@index([status, deactivatedAt], map: "users_status_deactivatedAt_idx")',
    );
  });
});
