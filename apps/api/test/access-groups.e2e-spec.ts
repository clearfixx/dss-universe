/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: IAM Access Groups E2E
 * 📄 File: apps/api/test/access-groups.e2e-spec.ts
 *
 * 🎯 Purpose:
 * Verifies real group HTTP commands and composed authority using unchanged JWTs.
 *
 * 🧠 Responsibilities:
 * • exercises validation, Premium isolation and Guardian lifecycle;
 * • verifies safe profile display, account disable and atomic audit failures;
 * • cleans uniquely owned fixtures only in the disposable test database.
 *
 * 🏗️ Architecture:
 * Real AppModule, PostgreSQL and Redis; test-only probe consumes the published
 * Authorization decision contract. No production Guardian workflow is invented.
 *
 * ⚠️ Important:
 * This suite requires the migrated, seeded dss_test database, never dev or production.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import {
  Controller,
  Get,
  Inject,
  UseGuards,
  ValidationPipe,
  type INestApplication,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AuthUser, JwtAuthGuard, type AuthenticatedUser } from '@api/core/auth';
import {
  AuthorizationModule,
  ACCESS_CAPABILITY_DECISIONS,
  ACCESS_MEMBERSHIPS_READER,
  type AccessCapabilityDecisions,
  type AccessMembershipsReader,
} from '@api/core/authorization';
import { PrismaService } from '@api/core/database';
import { AuditWriterService } from '@api/core/audit';
import { AppModule } from '../src/app.module';
import { AuthenticationPresentationService } from '../src/composition/identity/application/authentication-presentation.service';
import { EDITOR_CODE_HIGHLIGHTER } from '../src/modules/editor/application/contracts/editor-code-highlighter.interface';
import { cleanupAccessGroupFixtures } from './helpers/access-group-cleanup.fixture';

@Controller('access-group-probe')
@UseGuards(JwtAuthGuard)
class AccessGroupProbeController {
  constructor(
    @Inject(ACCESS_CAPABILITY_DECISIONS)
    private readonly decisions: AccessCapabilityDecisions,
  ) {}
  @Get('guardian')
  async guardian(@AuthUser() actor: AuthenticatedUser) {
    return {
      guardian: await this.decisions.hasKnowledgeForgeGuardian(
        actor.id,
        new Date(),
      ),
    };
  }
}

describe('access-group composed HTTP lifecycle (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let managerToken: string;
  let premiumId: string;
  const subjects: string[] = [];
  const groupIds: string[] = [];
  const roleIds: string[] = [];
  async function register() {
    const suffix = randomUUID();
    const identity = await app.get(AuthenticationPresentationService).register({
      email: `groups-${suffix}@dss.test`,
      username: `groups-${suffix}`,
      password: 'fixture-groups-password-123',
      displayName: 'Group Pilot',
    });
    subjects.push(identity.user.id);
    return identity;
  }
  function call(
    method: 'get' | 'post' | 'patch' | 'put',
    path: string,
    token = managerToken,
  ) {
    return request(app.getHttpServer())
      [method](`/api/iam/access-groups${path}`)
      .set('Authorization', `Bearer ${token}`);
  }
  function probe(token: string) {
    return request(app.getHttpServer())
      .get('/api/access-group-probe/guardian')
      .set('Authorization', `Bearer ${token}`);
  }
  async function create(capabilities: string[] = [], isPublic = true) {
    const response = await call('post', '')
      .send({
        key: `g-${randomUUID()}`,
        displayName: 'Research group',
        capabilities,
        isPublic,
      })
      .expect(201);
    const body = response.body as { id: string; key: string; kind: string };
    groupIds.push(body.id);
    return body;
  }
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule, AuthorizationModule],
      controllers: [AccessGroupProbeController],
    })
      .overrideProvider(EDITOR_CODE_HIGHLIGHTER)
      .useValue({ highlight: () => Promise.resolve('') })
      .compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidUnknownValues: true,
      }),
    );
    await app.init();
    prisma = app.get(PrismaService);
    const manager = await register();
    managerToken = manager.tokens.accessToken;
    const permission = await prisma.permission.findUniqueOrThrow({
      where: { key: 'permissions.manage' },
    });
    await prisma.userPermission.create({
      data: { userId: manager.user.id, permissionId: permission.id },
    });
    premiumId = (
      await prisma.accessGroup.findUniqueOrThrow({ where: { key: 'premium' } })
    ).id;
  });
  afterAll(async () => {
    jest.restoreAllMocks();
    if (prisma) {
      await cleanupAccessGroupFixtures(prisma, subjects, groupIds);
      await prisma.role.deleteMany({ where: { id: { in: roleIds } } });
      await prisma.auditRecord.deleteMany({
        where: { actorId: { in: subjects } },
      });
      await prisma.user.deleteMany({ where: { id: { in: subjects } } });
    }
    await app?.close();
  });
  it('requires current authority; validates DTOs and rejects unsafe capabilities and reserved identity', async () => {
    const subject = await register();
    await request(app.getHttpServer())
      .get('/api/iam/access-groups')
      .expect(401);
    await call('get', '', subject.tokens.accessToken).expect(403);
    await call('post', '', subject.tokens.accessToken)
      .send({ key: 'self-admin', displayName: 'Admin', capabilities: [] })
      .expect(403);
    await call('post', '')
      .send({ key: 'premium', displayName: 'Premium', capabilities: [] })
      .expect(400);
    await call('post', '')
      .send({
        key: 'bad-caps',
        displayName: 'Bad',
        capabilities: ['permissions.manage'],
      })
      .expect(400);
    await call('post', '')
      .send({
        key: 'bad-color',
        displayName: 'Bad',
        capabilities: [],
        color: 'url(secret)',
      })
      .expect(400);
    await call('get', '?limit=101').expect(400);
    const group = await create();
    await call('post', '')
      .send({ key: group.key, displayName: 'Duplicate', capabilities: [] })
      .expect(409);
    await call('patch', `/${group.id}`)
      .send({
        key: 'premium',
        kind: 'PREMIUM',
        displayName: 'Admin',
        enabled: null,
      })
      .expect(400);
    const changed = await call('patch', `/${group.id}`)
      .send({ key: 'premium', kind: 'PREMIUM', displayName: 'Admin' })
      .expect(200);
    expect(changed.body as object).toMatchObject({
      key: group.key,
      kind: 'CUSTOM',
      displayName: 'Admin',
    });
    await call('post', `/${group.id}/memberships`)
      .send({
        subjectId: subject.user.id,
        validFrom: '2030-01-01',
        validUntil: '2029-01-01',
      })
      .expect(400);
    await call('post', `/${group.id}/memberships`)
      .send({ subjectId: randomUUID() })
      .expect(404);
    await call('post', `/${group.id}/memberships`)
      .send({ subjectId: subject.user.id, validFrom: '2030-01-01T12:00:00' })
      .expect(400);
    await call('get', `/${randomUUID()}`).expect(404);
  });
  it('keeps Premium non-staff even alongside a legacy Premium-like system role', async () => {
    const subject = await register();
    const token = subject.tokens.accessToken;
    await call('post', `/${premiumId}/memberships`)
      .send({ subjectId: subject.user.id })
      .expect(201);
    await probe(token).expect(200, { guardian: false });
    await call('get', '', token).expect(403);
    await request(app.getHttpServer())
      .get('/api/iam/permissions')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
    await call('put', `/${premiumId}/capabilities`)
      .send({ capabilities: ['KNOWLEDGE_FORGE_GUARDIAN'] })
      .expect(400);
    const role = await prisma.role.create({
      data: { name: `legacy-premium-${randomUUID()}`, label: 'Premium' },
    });
    roleIds.push(role.id);
    await prisma.userRole.create({
      data: { userId: subject.user.id, roleId: role.id },
    });
    await call('get', '', token).expect(403);
    const permission = await prisma.permission.findUniqueOrThrow({
      where: { key: 'permissions.manage' },
    });
    await prisma.userPermission.create({
      data: { userId: subject.user.id, permissionId: permission.id },
    });
    await call('get', '', token).expect(200);
    await probe(token).expect(200, { guardian: false });
    await prisma.userPermission.delete({
      where: {
        userId_permissionId: {
          userId: subject.user.id,
          permissionId: permission.id,
        },
      },
    });
    await call('get', '', token).expect(403);
  });
  it('honors Guardian overlap, capability removal, disable, revocation and account state without re-login', async () => {
    const subject = await register();
    const token = subject.tokens.accessToken;
    const group = await create(['KNOWLEDGE_FORGE_GUARDIAN']);
    await probe(token).expect(200, { guardian: false });
    const first = await call('post', `/${group.id}/memberships`)
      .send({ subjectId: subject.user.id })
      .expect(201);
    const second = await call('post', `/${group.id}/memberships`)
      .send({ subjectId: subject.user.id })
      .expect(201);
    await probe(token).expect(200, { guardian: true });
    await call('get', '', token).expect(403);
    const id = (first.body as { id: string }).id;
    await call('post', `/memberships/${id}/revoke`)
      .send({ reason: 'Reviewed revocation' })
      .expect(201);
    await call('post', `/memberships/${id}/revoke`)
      .send({ reason: 'Retry' })
      .expect(201);
    expect(
      await prisma.auditRecord.count({
        where: { action: 'iam.access-membership.revoked', targetId: id },
      }),
    ).toBe(1);
    await probe(token).expect(200, { guardian: true });
    await call('patch', `/${group.id}`).send({ enabled: false }).expect(200);
    await probe(token).expect(200, { guardian: false });
    await call('post', `/${group.id}/memberships`)
      .send({ subjectId: subject.user.id })
      .expect(404);
    await call('patch', `/${group.id}`).send({ enabled: true }).expect(200);
    await call('put', `/${group.id}/capabilities`)
      .send({ capabilities: [] })
      .expect(200);
    await probe(token).expect(200, { guardian: false });
    await call('put', `/${group.id}/capabilities`)
      .send({ capabilities: ['KNOWLEDGE_FORGE_GUARDIAN'] })
      .expect(200);
    await probe(token).expect(200, { guardian: true });
    await prisma.user.update({
      where: { id: subject.user.id },
      data: { status: 'BANNED' },
    });
    expect(
      await app
        .get<AccessCapabilityDecisions>(ACCESS_CAPABILITY_DECISIONS)
        .hasKnowledgeForgeGuardian(subject.user.id, new Date()),
    ).toBe(false);
    await probe(token).expect(401);
    await prisma.user.update({
      where: { id: subject.user.id },
      data: { status: 'ACTIVE' },
    });
    await call(
      'post',
      `/memberships/${(second.body as { id: string }).id}/revoke`,
    )
      .send({ reason: 'Remove final grant' })
      .expect(201);
    await probe(token).expect(200, { guardian: false });
    const history = await call(
      'get',
      `/memberships?subjectId=${subject.user.id}&limit=1`,
    ).expect(200);
    const rows = history.body as Array<{ id: string; revokedAt: string }>;
    expect(rows).toHaveLength(1);
    expect(rows[0].revokedAt).toBeTruthy();
    const next = await call(
      'get',
      `/${group.id}/memberships?after=${rows[0].id}&limit=1`,
    ).expect(200);
    expect(next.body as object[]).toHaveLength(1);
  });
  it('uses half-open validity and hides private or expired group metadata from the profile', async () => {
    const subject = await register();
    const visible = await create();
    const hidden = await create(['KNOWLEDGE_FORGE_GUARDIAN'], false);
    await call('patch', `/${visible.id}`)
      .send({ color: '#aabbcc', badgeLabel: 'Pilot', icon: 'rocket' })
      .expect(200);
    await call('post', `/${visible.id}/memberships`)
      .send({
        subjectId: subject.user.id,
        validFrom: '2020-01-01',
        validUntil: '2021-01-01',
      })
      .expect(201);
    await call('post', `/${hidden.id}/memberships`)
      .send({ subjectId: subject.user.id })
      .expect(201);
    const display = () =>
      request(app.getHttpServer())
        .get('/api/users/me/access-groups')
        .set('Authorization', `Bearer ${subject.tokens.accessToken}`);
    await display().expect(200, []);
    const grant = await call('post', `/${visible.id}/memberships`)
      .send({ subjectId: subject.user.id })
      .expect(201);
    await display().expect(200, [
      {
        key: visible.key,
        displayName: 'Research group',
        color: '#aabbcc',
        badgeLabel: 'Pilot',
        icon: 'rocket',
      },
    ]);
    await probe(subject.tokens.accessToken).expect(200, { guardian: true });
    await call(
      'post',
      `/memberships/${(grant.body as { id: string }).id}/revoke`,
    )
      .send({ reason: 'Display revoke' })
      .expect(201);
    await display().expect(200, []);
  });
  it('rolls back HTTP mutations on audit failure and denies unavailable membership evidence', async () => {
    const subject = await register();
    const group = await create();
    const append = jest
      .spyOn(app.get(AuditWriterService), 'append')
      .mockRejectedValue(new Error('Synthetic audit failure'));
    try {
      await call('post', `/${group.id}/memberships`)
        .send({ subjectId: subject.user.id })
        .expect(500);
      await call('patch', `/${group.id}`)
        .send({ displayName: 'Uncommitted' })
        .expect(500);
    } finally {
      append.mockRestore();
    }
    expect(
      await prisma.accessGroupMembership.count({
        where: { subjectId: subject.user.id },
      }),
    ).toBe(0);
    expect(
      await prisma.accessGroup.findUnique({
        where: { id: group.id },
        select: { displayName: true },
      }),
    ).toEqual({ displayName: 'Research group' });
    const read = jest
      .spyOn(
        app.get<AccessMembershipsReader>(ACCESS_MEMBERSHIPS_READER),
        'read',
      )
      .mockRejectedValue(new Error('Synthetic evidence failure'));
    try {
      await probe(subject.tokens.accessToken).expect(500);
    } finally {
      read.mockRestore();
    }
    await probe(subject.tokens.accessToken).expect(200, { guardian: false });
  });
});
