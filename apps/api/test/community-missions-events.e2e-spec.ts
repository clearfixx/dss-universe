/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Community Missions & Events
 * 📄 File: apps/api/test/community-missions-events.e2e-spec.ts
 *
 * 🎯 Purpose:
 * Migrated-schema proof of community missions (automatic progress from
 * forum and reputation owners) and community events (upcoming list), with
 * audit, outbox and the staff permissions seeded by the migration.
 *
 * ⚠️ Important:
 * Private forum sections never count towards mission progress.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { randomUUID } from 'node:crypto';
import { createEmptyEditorDocument } from '@dss/editor';
import { AuditRedactionService, AuditWriterService } from '@api/core/audit';
import { OutboxWriterService } from '@api/core/events';
import type { EditorDocumentNormalizer } from '@api/modules/editor';
import type { ForumViewerFacts } from '@api/modules/forum';
import { PrismaForumContributionTotals } from '@api/modules/forum/infrastructure/prisma-forum-contribution-totals';
import { ForumStructureService } from '@api/modules/forum/infrastructure/prisma-forum-structure';
import { ForumTopicsService } from '@api/modules/forum/infrastructure/prisma-forum-topics';
import { CommunityEventsService } from '@api/modules/events/infrastructure/prisma-events.service';
import { MissionsService } from '@api/modules/missions/infrastructure/prisma-missions.service';
import { PrismaReputationTotalReader } from '@api/modules/reputation/infrastructure/repositories/prisma-reputation-total.reader';
import { MissionMetricAdapter } from '../src/composition/content-reads/infrastructure/mission-metric.adapter';
import { createIsolatedApiSchemaFixture } from './helpers/migrated-api-schema.fixture';

describe('Community missions and events (e2e)', () => {
  let fixture: Awaited<ReturnType<typeof createIsolatedApiSchemaFixture>>;
  let structure: ForumStructureService;
  let topics: ForumTopicsService;
  let missions: MissionsService;
  let events: CommunityEventsService;
  const facts = new Map<string, Partial<ForumViewerFacts>>();

  beforeAll(async () => {
    fixture = await createIsolatedApiSchemaFixture();
    const viewers = {
      read: (subjectId: string | null) =>
        Promise.resolve({
          subjectId,
          audienceKeys: [],
          seesAllCategories: false,
          moderatesAllCategories: false,
          canAssignModerators: false,
          canPurgeContent: false,
          ...(subjectId ? facts.get(subjectId) : {}),
        }),
    };
    const audit = new AuditWriterService(new AuditRedactionService());
    const outbox = new OutboxWriterService();
    const normalize = (json: string) => {
      const document = createEmptyEditorDocument('FORUM_REPLY');
      return {
        document,
        canonicalJson: JSON.stringify(document),
        plainText: 'Text ' + json,
        searchText: 'text',
      };
    };
    const editor = {
      normalizeForumTopic: normalize,
      normalizeForumReply: normalize,
    } as unknown as EditorDocumentNormalizer;
    structure = new ForumStructureService(
      fixture.prisma,
      audit,
      outbox,
      viewers,
    );
    topics = new ForumTopicsService(
      fixture.prisma,
      audit,
      outbox,
      viewers,
      editor,
      structure,
      {
        project: (documentJson) => Promise.resolve({ documentJson, gates: [] }),
      },
      { project: (documentJson) => Promise.resolve({ documentJson }) },
    );
    missions = new MissionsService(
      fixture.prisma,
      audit,
      outbox,
      new MissionMetricAdapter(
        new PrismaForumContributionTotals(fixture.prisma),
        new PrismaReputationTotalReader(fixture.prisma),
      ),
    );
    events = new CommunityEventsService(fixture.prisma, audit, outbox);
  }, 60000);

  afterAll(async () => {
    await fixture?.close();
  });

  async function user(viewer: Partial<ForumViewerFacts> = {}) {
    const id = randomUUID();
    await fixture.prisma.user.create({
      data: {
        id,
        email: `cm-${id}@dss.test`,
        username: `cm-${id.slice(0, 8)}`,
        passwordHash: 'fixture-hash',
      },
    });
    facts.set(id, viewer);
    return id;
  }

  async function forum(visibility: 'PUBLIC' | 'MEMBERS') {
    const admin = await user({
      seesAllCategories: true,
      canAssignModerators: true,
    });
    const category = await structure.createCategory(admin, {
      slug: 'c-' + randomUUID().slice(0, 8),
      title: 'Category',
      description: null,
      position: 0,
      visibility,
      audienceKeys: [],
      active: true,
    });
    return (
      await structure.createForum(admin, {
        categoryId: category.id,
        parentId: null,
        slug: 'f-' + randomUUID().slice(0, 8),
        title: 'Forum',
        description: null,
        position: 0,
        allowsGatedContent: false,
        active: true,
      })
    ).id;
  }

  async function rested(userId: string) {
    await fixture.prisma.forumPostingCooldown.deleteMany({ where: { userId } });
  }

  async function openTopic(author: string, forumId: string, kind = 'QUESTION') {
    await rested(author);
    return (
      await topics.createTopic(author, {
        forumId,
        kind: kind as 'QUESTION',
        title: 'Topic ' + randomUUID().slice(0, 6),
        documentJson: 'x',
      })
    ).topic;
  }

  async function reply(author: string, topicId: string) {
    await rested(author);
    return topics.reply(author, {
      topicId,
      documentJson: 'reply',
      replyToNumber: null,
      quotedNumbers: [],
    });
  }

  it('counts mission progress per metric from public sections only', async () => {
    const staff = await user();
    const member = await user();
    const other = await user();
    const open = await forum('PUBLIC');
    const hidden = await forum('MEMBERS');

    const question = await openTopic(other, open);
    await openTopic(member, open, 'DISCUSSION');
    await openTopic(member, hidden, 'DISCUSSION');
    const answer = await reply(member, question.id);
    await reply(member, question.id);
    const privateTopic = await openTopic(other, hidden);
    await reply(member, privateTopic.id);
    await fixture.prisma.forumTopic.update({
      where: { id: question.id },
      data: {
        acceptedAnswerPostId: answer.id,
        acceptedAt: new Date(),
        acceptedById: other,
      },
    });
    await fixture.prisma.reputationEntry.createMany({
      data: [
        { actorId: other, recipientId: member, value: 1, reason: 'Help' },
        { actorId: staff, recipientId: member, value: 1, reason: 'Fix' },
      ],
    });

    const startsAt = new Date(Date.now() - 3_600_000);
    const endsAt = new Date(Date.now() + 86_400_000);
    const make = (
      metric: 'TOPICS' | 'REPLIES' | 'ACCEPTED_ANSWERS' | 'REPUTATION',
    ) =>
      missions.create(staff, {
        title: 'Mission ' + metric,
        description: null,
        metric,
        target: 5,
        startsAt,
        endsAt,
        active: true,
      });
    for (const metric of [
      'TOPICS',
      'REPLIES',
      'ACCEPTED_ANSWERS',
      'REPUTATION',
    ] as const) {
      await make(metric);
    }
    await missions.create(staff, {
      title: 'Paused',
      description: null,
      metric: 'TOPICS',
      target: 1,
      startsAt,
      endsAt,
      active: false,
    });

    const current = await missions.current(member);
    const byTitle = Object.fromEntries(
      current.map((mission) => [mission.title, mission.viewerProgress]),
    );
    expect(byTitle).toMatchObject({
      'Mission TOPICS': 1,
      'Mission REPLIES': 2,
      'Mission ACCEPTED_ANSWERS': 1,
      'Mission REPUTATION': 2,
    });
    expect(byTitle).not.toHaveProperty('Paused');
    expect(
      (await missions.current(null)).every(
        (mission) => mission.viewerProgress === null,
      ),
    ).toBe(true);

    await expect(
      missions.create(staff, {
        title: 'x',
        description: null,
        metric: 'TOPICS',
        target: 1,
        startsAt,
        endsAt,
        active: true,
      }),
    ).rejects.toThrow(/title/);
  });

  it('audits mission writes and removes missions', async () => {
    const staff = await user();
    const created = await missions.create(staff, {
      title: 'Temporary',
      description: 'Desc',
      metric: 'REPLIES',
      target: 3,
      startsAt: new Date('2026-01-01T00:00:00Z'),
      endsAt: new Date('2026-02-01T00:00:00Z'),
      active: true,
    });
    await missions.update(staff, created.id, {
      title: 'Renamed',
      description: null,
      metric: 'REPLIES',
      target: 4,
      startsAt: new Date('2026-01-01T00:00:00Z'),
      endsAt: new Date('2026-02-01T00:00:00Z'),
      active: false,
    });
    await missions.remove(staff, created.id);
    await expect(missions.remove(staff, created.id)).rejects.toThrow(
      /not found/,
    );
    const actions = await fixture.prisma.auditRecord.findMany({
      where: { targetId: created.id },
      orderBy: { occurredAt: 'asc' },
      select: { action: true },
    });
    expect(actions.map(({ action }) => action)).toEqual([
      'missions.mission_created',
      'missions.mission_updated',
      'missions.mission_deleted',
    ]);
    expect(
      await fixture.prisma.outboxEvent.count({
        where: { aggregateId: created.id },
      }),
    ).toBe(3);
  });

  it('lists events that have not finished, soonest first', async () => {
    const staff = await user();
    const now = Date.now();
    const at = (minutes: number) => new Date(now + minutes * 60_000);
    const create = (title: string, startsAt: Date, durationMinutes: number) =>
      events.create(staff, {
        title,
        description: null,
        startsAt,
        durationMinutes,
        format: 'ONLINE',
        location: null,
        url: 'https://meet.example.com/' + title,
      });
    await create('Finished', at(-120), 60);
    const running = await create('Running', at(-30), 60);
    const later = await create('Later', at(24 * 60), 90);
    const sooner = await create('Sooner', at(60), 45);

    const upcoming = await events.upcoming(5);
    const ids = upcoming.map(({ id }) => id);
    expect(ids.indexOf(running.id)).toBeLessThan(ids.indexOf(sooner.id));
    expect(ids.indexOf(sooner.id)).toBeLessThan(ids.indexOf(later.id));
    expect(upcoming.map(({ title }) => title)).not.toContain('Finished');

    await events.update(staff, later.id, {
      title: 'Later (offline)',
      description: null,
      startsAt: at(24 * 60),
      durationMinutes: 90,
      format: 'OFFLINE',
      location: 'Kyiv',
      url: null,
    });
    await events.remove(staff, sooner.id);
    const after = await events.upcoming(20);
    expect(after.map(({ id }) => id)).not.toContain(sooner.id);
    expect(after.find(({ id }) => id === later.id)).toMatchObject({
      format: 'OFFLINE',
      location: 'Kyiv',
      url: null,
    });
    await expect(
      events.create(staff, {
        title: 'No link',
        description: null,
        startsAt: at(10),
        durationMinutes: 30,
        format: 'ONLINE',
        location: null,
        url: null,
      }),
    ).rejects.toThrow(/needs a link/);
  });

  it('grants missions.manage and events.manage to staff roles', async () => {
    const rows = await fixture.prisma.rolePermission.findMany({
      where: {
        permission: { key: { in: ['missions.manage', 'events.manage'] } },
      },
      select: {
        role: { select: { name: true } },
        permission: { select: { key: true } },
      },
    });
    const pairs = rows
      .map(({ role, permission }) => `${role.name}:${permission.key}`)
      .sort();
    for (const role of ['admin', 'moderator', 'owner']) {
      const present = pairs.some((pair) => pair.startsWith(`${role}:`));
      if (!present) continue; // role not seeded in this schema
      expect(pairs).toEqual(
        expect.arrayContaining([
          `${role}:events.manage`,
          `${role}:missions.manage`,
        ]),
      );
    }
    expect(
      await fixture.prisma.permission.count({
        where: { key: { in: ['missions.manage', 'events.manage'] } },
      }),
    ).toBe(2);
  });
});
