/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Qualification Work Verification
 * 📄 File: apps/api/test/qualified-achievements-query-work.e2e-spec.ts
 * 🎯 Purpose: Measures real bounded inventory/retirement work over synthetic grant history.
 * 🧠 Responsibilities: Covers 0/1/64/65/1024 rows, persisted restart progress and the production SQL plans.
 * 🏗️ Architecture: Owned migrated schema and real evidence writers; historical population is fixture setup.
 * ⚠️ Important: Per-page measurements are not a production latency SLA or producer/admission proof.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { Pool } from 'pg';
import { AuditRedactionService, AuditWriterService } from '@api/core/audit';
import { OutboxWriterService } from '@api/core/events';
import { PrismaQualifiedAchievementsRepository } from '../src/modules/achievements/infrastructure/repositories/prisma-qualified-achievements.repository';
import {
  achievementInventoryWindow,
  achievementRetirementWindow,
} from '../src/modules/achievements/infrastructure/repositories/achievement-retirement-window.sql';
import type {
  QualifiedAchievementCommand,
  QualifiedAchievementFact,
} from '../src/modules/achievements/domain/types/qualified-achievement.type';
import { createIsolatedApiSchemaFixture } from './helpers/migrated-api-schema.fixture';

type PlanNode = {
  'Node Type': string;
  'Relation Name'?: string;
  'Index Name'?: string;
  'Actual Rows': number;
  'Actual Loops'?: number;
  'Rows Removed by Filter'?: number;
  Plans?: PlanNode[];
};
type PlanReport = { Plan: PlanNode; 'Execution Time': number };
function nodes(node: PlanNode): PlanNode[] {
  return [node, ...(node.Plans ?? []).flatMap(nodes)];
}

describe('Qualified Achievements bounded query work (e2e)', () => {
  let fixture: Awaited<ReturnType<typeof createIsolatedApiSchemaFixture>>;
  let pool: Pool;
  const datasets = new Map<
    number,
    {
      cursorId: string;
      sourceId: string;
      facts: QualifiedAchievementFact[];
      awardIds: string[];
    }
  >();
  const measurements: {
    population: number;
    examined: number;
    queries: number;
    elapsedMs: number;
  }[] = [];
  function owner() {
    return new PrismaQualifiedAchievementsRepository(
      fixture.prisma,
      new AuditWriterService(new AuditRedactionService()),
      new OutboxWriterService(),
    );
  }
  beforeAll(async () => {
    fixture = await createIsolatedApiSchemaFixture({ captureQueries: true });
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      options: `-c search_path=${fixture.schema},public`,
    });
    const userId = randomUUID();
    await fixture.prisma.user.create({
      data: {
        id: userId,
        username: userId,
        email: `${userId}@dss.invalid`,
        passwordHash: 'synthetic-not-a-login',
      },
    });
    for (const population of [0, 1, 64, 65, 1024]) {
      const sourceId = randomUUID();
      const factId = randomUUID();
      const eventId = randomUUID();
      const original: QualifiedAchievementFact = {
        producer: 'synthetic.qualification-work',
        sourceKind: 'Synthetic',
        sourceId,
        factId,
        canonicalEventId: eventId,
        revision: '1',
        action: 'QUALIFY',
        qualificationId: randomUUID(),
        qualificationRevision: '1',
        qualificationEventId: eventId,
        qualificationFactId: factId,
        retiredThroughRevision: '0',
        predecessorWithdrawalFactId: null,
        contractVersion: 1,
      };
      const withdrawal: QualifiedAchievementFact = {
        ...original,
        factId: randomUUID(),
        canonicalEventId: randomUUID(),
        action: 'WITHDRAW',
        revision: '2',
        retiredThroughRevision: '1',
      };
      const command: QualifiedAchievementCommand = {
        event: {
          eventId: withdrawal.canonicalEventId,
          eventName: 'synthetic.work.withdrawn.v1',
          eventVersion: 1,
          producer: original.producer,
          sourceType: original.sourceKind,
          sourceId,
          occurredAt: '2026-11-08T12:00:00.000Z',
          payload: {},
        },
        facts: [original, withdrawal],
        contribution: null,
      };
      await owner().prepare(command);
      const cursor =
        await fixture.prisma.achievementSourceCursor.findUniqueOrThrow({
          where: {
            producer_sourceKind_sourceId: {
              producer: original.producer,
              sourceKind: original.sourceKind,
              sourceId,
            },
          },
        });
      const fact = await fixture.prisma.achievementSourceFact.findUniqueOrThrow(
        { where: { cursorId_revision: { cursorId: cursor.id, revision: 1n } } },
      );
      const definitions = Array.from({ length: population }, (_, index) => ({
        id: randomUUID(),
        key: `${sourceId}.${index}`,
        slug: `${sourceId}-${index}`,
        name: 'Synthetic work grant',
        color: '#112233',
        badge: 'synthetic',
        createdById: userId,
        updatedById: userId,
      }));
      const rules = definitions.map((definition) => ({
        id: randomUUID(),
        achievementId: definition.id,
        eventName: 'synthetic.work.qualified.v1',
        createdById: userId,
        updatedById: userId,
      }));
      const awardIds = definitions.map(
        (_, index) => `work-${sourceId}-${String(index).padStart(4, '0')}`,
      );
      if (population > 0) {
        await fixture.prisma.achievementDefinition.createMany({
          data: definitions,
        });
        await fixture.prisma.achievementRule.createMany({ data: rules });
        await fixture.prisma.achievementAward.createMany({
          data: definitions.map((definition, index) => ({
            id: awardIds[index],
            userId,
            achievementId: definition.id,
            ruleId: rules[index].id,
            kind: 'RULE' as const,
            reason: 'Synthetic retained history',
            sourceEventId: original.canonicalEventId,
            sourceEventName: rules[index].eventName,
            sourceType: original.sourceKind,
            sourceId,
          })),
        });
        await fixture.prisma.achievementAwardQualification.createMany({
          data: awardIds.map((awardId) => ({
            awardId,
            cursorId: cursor.id,
            factId: fact.id,
            qualificationRevision: 1n,
            sourceEventId: original.canonicalEventId,
          })),
        });
        if (population === 1024)
          await fixture.prisma.achievementAwardRevocation.createMany({
            data: awardIds.slice(0, 512).map((awardId) => ({
              awardId,
              reason: 'Synthetic already-revoked history',
            })),
          });
      }
      datasets.set(population, {
        cursorId: cursor.id,
        sourceId,
        facts: command.facts.slice(),
        awardIds,
      });
    }
    await pool.query('ANALYZE achievement_award_qualifications');
    await pool.query('ANALYZE achievement_awards');
  }, 60000);
  afterAll(async () => {
    try {
      await pool?.end();
    } finally {
      await fixture?.close();
    }
  });

  async function step(population: number) {
    const data = datasets.get(population);
    if (!data) throw new Error('Expected the synthetic dataset.');
    const before = fixture.queries.length;
    const started = performance.now();
    const result = await owner().advanceSources(data.facts);
    const elapsedMs = performance.now() - started;
    const queries = fixture.queries.length - before;
    expect(result.examined).toBeLessThanOrEqual(64);
    expect(queries).toBeLessThanOrEqual(512);
    measurements.push({
      population,
      examined: result.examined,
      queries,
      elapsedMs,
    });
    console.info('synthetic-qualification-work', {
      population,
      status: result.status,
      examined: result.examined,
      queries,
      elapsedMs,
    });
    return result;
  }

  it.each([0, 1, 64, 65])(
    'finishes %i grants through finite persisted pages and actual evidence',
    async (population) => {
      let ready = false;
      let examined = 0;
      for (let page = 0; page < 8; page++) {
        const result = await step(population);
        examined += result.examined;
        if (result.status === 'READY') {
          ready = true;
          break;
        }
        expect(result.status).toBe('CONTINUE');
      }
      expect(ready).toBe(true);
      expect(examined).toBe(population * 2);
      const data = datasets.get(population)!;
      expect(
        await fixture.prisma.achievementAwardRevocation.count({
          where: { awardId: { in: data.awardIds } },
        }),
      ).toBe(population);
      expect(
        await fixture.prisma.auditRecord.count({
          where: {
            targetId: { in: data.awardIds },
            action: 'achievements.award.revoked',
          },
        }),
      ).toBe(population);
      expect(
        await fixture.prisma.achievementSourceCursor.findUniqueOrThrow({
          where: { id: data.cursorId },
        }),
      ).toMatchObject({
        phase: 'STABLE',
        appliedRevision: 2n,
        targetRevision: 2n,
      });
    },
  );

  for (let page = 0; page < 16; page++) {
    it(`resumes the1024-row inventory at persisted page${page + 1}`, async () => {
      await expect(step(1024)).resolves.toMatchObject({
        status: 'CONTINUE',
        examined: 64,
      });
      const data = datasets.get(1024)!;
      expect(
        await fixture.prisma.achievementSourceCursor.findUniqueOrThrow({
          where: { id: data.cursorId },
        }),
      ).toMatchObject({
        phase: 'RETIRING',
        enrollmentState: 'PENDING',
        appliedRevision: 0n,
        inventoryAfterId: data.awardIds[(page + 1) * 64 - 1],
      });
    });
  }
  for (let page = 0; page < 16; page++) {
    it(`resumes the1024-row retirement at persisted page${page + 1}, counting revoked history`, async () => {
      await expect(step(1024)).resolves.toMatchObject({
        status: 'CONTINUE',
        examined: 64,
      });
      const data = datasets.get(1024)!;
      expect(
        await fixture.prisma.achievementSourceCursor.findUniqueOrThrow({
          where: { id: data.cursorId },
        }),
      ).toMatchObject({
        phase: 'RETIRING',
        enrollmentState: 'READY',
        appliedRevision: 0n,
        retirementAfterRevision: 1n,
        retirementAfterAwardId: data.awardIds[(page + 1) * 64 - 1],
      });
    });
  }
  it('finalizes1024 grants only after the empty indexed frontier and retains exact new evidence', async () => {
    await expect(step(1024)).resolves.toEqual({ status: 'READY', examined: 0 });
    const data = datasets.get(1024)!;
    expect(
      await fixture.prisma.achievementAwardRevocation.count({
        where: { awardId: { in: data.awardIds } },
      }),
    ).toBe(1024);
    expect(
      await fixture.prisma.auditRecord.count({
        where: {
          targetId: { in: data.awardIds },
          action: 'achievements.award.revoked',
        },
      }),
    ).toBe(512);
    expect(
      await fixture.prisma.outboxEvent.count({
        where: {
          aggregateId: { in: data.awardIds },
          eventName: 'achievements.award.revoked.v1',
        },
      }),
    ).toBe(512);
    expect(
      await fixture.prisma.achievementSourceCursor.findUniqueOrThrow({
        where: { id: data.cursorId },
      }),
    ).toMatchObject({
      phase: 'STABLE',
      appliedRevision: 2n,
      targetRevision: 2n,
      retiredThrough: 1n,
    });
    expect(
      measurements
        .filter((entry) => entry.population === 1024)
        .reduce((sum, entry) => sum + entry.examined, 0),
    ).toBe(2048);
  });

  it.each([0, 1, 64, 65, 1024])(
    'uses the actual source windows for %i rows at initial and exhausted frontiers',
    async (population) => {
      const data = datasets.get(population)!;
      const cursor =
        await fixture.prisma.achievementSourceCursor.findUniqueOrThrow({
          where: { id: data.cursorId },
        });
      for (const positioned of [false, true]) {
        const windows = [
          {
            name: 'inventory',
            relation: 'achievement_awards',
            index: 'achievement_source_inventory_idx',
            sql: achievementInventoryWindow({
              sourceKind: 'Synthetic',
              sourceId: data.sourceId,
              afterId: positioned ? cursor.inventoryAfterId : null,
            }),
          },
          {
            name: 'event inventory',
            relation: 'achievement_awards',
            index: 'achievement_event_inventory_idx',
            sql: achievementInventoryWindow({
              sourceKind: '@event',
              sourceId: data.facts[0].qualificationEventId,
              afterId: positioned ? cursor.inventoryAfterId : null,
            }),
          },
          {
            name: 'retirement',
            relation: 'achievement_award_qualifications',
            index: 'achievement_qualification_retirement_idx',
            sql: achievementRetirementWindow({
              cursorId: data.cursorId,
              retiredThrough: 1n,
              after:
                positioned &&
                cursor.retirementAfterRevision !== null &&
                cursor.retirementAfterAwardId !== null
                  ? {
                      revision: cursor.retirementAfterRevision,
                      awardId: cursor.retirementAfterAwardId,
                    }
                  : null,
            }),
          },
        ];
        for (const window of windows) {
          const result = await pool.query<{ 'QUERY PLAN': PlanReport[] }>(
            `EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON) ${window.sql.text}`,
            window.sql.values,
          );
          const report = result.rows[0]['QUERY PLAN'][0];
          expect(report.Plan['Actual Rows']).toBe(
            positioned ? 0 : Math.min(population, 64),
          );
          const sourceNodes = nodes(report.Plan).filter(
            (node) => node['Relation Name'] === window.relation,
          );
          console.info('synthetic-qualification-source-plan', {
            population,
            window: window.name,
            positioned,
            nodes: sourceNodes.map((node) => ({
              type: node['Node Type'],
              index: node['Index Name'],
              returned: node['Actual Rows'],
              loops: node['Actual Loops'] ?? 1,
              removed: node['Rows Removed by Filter'] ?? 0,
            })),
          });
          // Preserve the committed small-input filter bound. Actual loop counts
          // remain visible, and large-history source visits are bounded below.
          if (population < 1024) {
            expect(
              sourceNodes.reduce(
                (sum, node) =>
                  sum + node['Actual Rows'] * (node['Actual Loops'] ?? 1),
                0,
              ),
            ).toBeLessThanOrEqual(population);
            expect(
              sourceNodes.every(
                (node) =>
                  (node['Rows Removed by Filter'] ?? 0) <=
                  Math.min(population, 64),
              ),
            ).toBe(true);
          }
          if (population === 1024) {
            expect(
              sourceNodes.reduce(
                (sum, node) =>
                  sum +
                  (node['Rows Removed by Filter'] ?? 0) *
                    (node['Actual Loops'] ?? 1),
                0,
              ),
            ).toBeLessThanOrEqual(1);
            expect(
              sourceNodes.reduce(
                (sum, node) =>
                  sum + node['Actual Rows'] * (node['Actual Loops'] ?? 1),
                0,
              ),
            ).toBeLessThanOrEqual(64);
            expect(sourceNodes.every((node) => node['Actual Rows'] <= 64)).toBe(
              true,
            );
            expect(
              sourceNodes.every(
                (node) => (node['Rows Removed by Filter'] ?? 0) <= 1,
              ),
            ).toBe(true);
            expect(
              sourceNodes.some((node) => node['Index Name'] === window.index),
            ).toBe(true);
            expect(
              sourceNodes.every((node) => node['Node Type'] !== 'Seq Scan'),
            ).toBe(true);
          }
          console.info('synthetic-qualification-query-plan', {
            population,
            window: window.name,
            positioned,
            selected: report.Plan['Actual Rows'],
            executionMs: report['Execution Time'],
          });
        }
      }
    },
  );
});
