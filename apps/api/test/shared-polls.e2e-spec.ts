/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Interaction Platform
 * 📄 File: apps/api/test/shared-polls.e2e-spec.ts
 *
 * 🎯 Purpose:
 * Verifies shared polls and immutable ballots against migrated PostgreSQL.
 *
 * ⚠️ Important:
 * Uses an isolated schema in the disposable dss_test database only.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { randomUUID } from 'node:crypto';
import { AuditRedactionService, AuditWriterService } from '@api/core/audit';
import { OutboxWriterService } from '@api/core/events';
import { PrismaPollsRepository } from '@api/modules/interactions/infrastructure/repositories/prisma-polls.repository';
import { createIsolatedApiSchemaFixture } from './helpers/migrated-api-schema.fixture';

describe('Shared polls (e2e)', () => {
  let fixture: Awaited<ReturnType<typeof createIsolatedApiSchemaFixture>>;
  let polls: PrismaPollsRepository;

  beforeAll(async () => {
    fixture = await createIsolatedApiSchemaFixture();
    polls = new PrismaPollsRepository(
      fixture.prisma,
      new AuditWriterService(new AuditRedactionService()),
      new OutboxWriterService(),
    );
  }, 60000);

  afterAll(async () => {
    await fixture?.close();
  });

  async function user(): Promise<string> {
    const id = randomUUID();
    await fixture.prisma.user.create({
      data: {
        id,
        email: `poll-${id}@dss.test`,
        username: `poll-${id}`,
        passwordHash: 'fixture-hash',
      },
    });
    return id;
  }

  async function target(): Promise<string> {
    const id = randomUUID();
    await fixture.prisma.interactionTarget.create({
      data: {
        id,
        kind: 'forum.topic',
        ownerModule: 'forum',
        ownerType: 'ForumTopic',
        ownerId: randomUUID(),
      },
    });
    return id;
  }

  async function poll(
    visibility: 'OPEN' | 'ANONYMOUS' = 'OPEN',
    maxChoices = 1,
  ) {
    const author = await user();
    const interactionTargetId = await target();
    const { pollId } = await polls.create({
      interactionTargetId,
      createdById: author,
      question: 'Which runtime?',
      options: ['Node', 'Deno', 'Bun'],
      visibility,
      maxChoices,
    });
    const definition = await polls.findDefinition(pollId);
    return { pollId, interactionTargetId, definition: definition! };
  }

  it('creates ordered options with audit and Outbox evidence', async () => {
    const { pollId, interactionTargetId, definition } = await poll();
    expect(definition.optionIds).toHaveLength(3);
    const result = await polls.findByTarget(interactionTargetId, null);
    expect(result).toMatchObject({
      id: pollId,
      totalBallots: 0,
      viewerChoiceIds: null,
    });
    expect(result!.options.map(({ label }) => label)).toEqual([
      'Node',
      'Deno',
      'Bun',
    ]);
    await expect(
      fixture.prisma.outboxEvent.count({
        where: { eventName: 'polls.created.v1', aggregateId: pollId },
      }),
    ).resolves.toBe(1);
  });

  it('allows exactly one ballot per voter under concurrency', async () => {
    const { definition, interactionTargetId } = await poll();
    const voter = await user();
    const outcomes = await Promise.all(
      definition.optionIds.map((optionId) =>
        polls.castBallot(definition, voter, [optionId]),
      ),
    );
    expect(outcomes.filter((outcome) => outcome === 'CAST')).toHaveLength(1);
    expect(
      outcomes.filter((outcome) => outcome === 'ALREADY_VOTED'),
    ).toHaveLength(2);
    const result = await polls.findByTarget(interactionTargetId, voter);
    expect(result!.totalBallots).toBe(1);
    expect(result!.viewerChoiceIds).toHaveLength(1);
    expect(
      result!.options.reduce((sum, option) => sum + option.voteCount, 0),
    ).toBe(1);
  });

  it('counts multi-choice ballots per option and lists open voters', async () => {
    const { definition, pollId, interactionTargetId } = await poll('OPEN', 2);
    const [node, deno] = definition.optionIds;
    const first = await user();
    const second = await user();
    await polls.castBallot(definition, first, [node, deno]);
    await polls.castBallot(definition, second, [node]);
    const result = await polls.findByTarget(interactionTargetId, second);
    expect(result!.totalBallots).toBe(2);
    expect(result!.options.map(({ voteCount }) => voteCount)).toEqual([
      2, 1, 0,
    ]);
    expect(result!.viewerChoiceIds).toEqual([node]);
    await expect(polls.voters(pollId, node, 1, 20)).resolves.toEqual({
      voterIds: [first, second],
      total: 2,
      page: 1,
      limit: 20,
    });
  });

  it('keeps anonymous choices out of shared evidence', async () => {
    const { definition, pollId } = await poll('ANONYMOUS');
    const voter = await user();
    await polls.castBallot(definition, voter, [definition.optionIds[0]]);
    const event = await fixture.prisma.outboxEvent.findFirstOrThrow({
      where: { eventName: 'polls.ballot.cast.v1', aggregateId: pollId },
    });
    expect(event.payload).not.toHaveProperty('optionIds');
  });

  it('rejects changing or deleting polls and ballots in the database', async () => {
    const { definition, pollId } = await poll();
    const voter = await user();
    await polls.castBallot(definition, voter, [definition.optionIds[0]]);
    await expect(
      fixture.prisma.pollBallotChoice.updateMany({
        where: { pollId, voterId: voter },
        data: { optionId: definition.optionIds[1] },
      }),
    ).rejects.toThrow();
    await expect(
      fixture.prisma.pollBallot.deleteMany({
        where: { pollId, voterId: voter },
      }),
    ).rejects.toThrow();
    await expect(
      fixture.prisma.poll.update({
        where: { id: pollId },
        data: { question: 'Rewritten question' },
      }),
    ).rejects.toThrow();
  });

  it('rejects a choice that belongs to another poll', async () => {
    const first = await poll();
    const second = await poll();
    const voter = await user();
    await expect(
      polls.castBallot(first.definition, voter, [
        second.definition.optionIds[0],
      ]),
    ).rejects.toThrow();
  });

  it('allows one poll per interaction target', async () => {
    const { interactionTargetId } = await poll();
    await expect(
      polls.create({
        interactionTargetId,
        createdById: await user(),
        question: 'Second poll?',
        options: ['Yes', 'No'],
        visibility: 'OPEN',
        maxChoices: 1,
      }),
    ).rejects.toThrow();
  });
});
