/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: API Authorization Verification
 * 📄 File: apps/api/test/authorization.e2e-spec.ts
 *
 * 🎯 Purpose:
 * Proves current IAM grants govern unchanged JWTs through real request composition.
 *
 * 🧠 Responsibilities:
 * • exercises direct and role grant lifecycle through protected HTTP endpoints;
 * • verifies current principal context and fail-closed authority reads;
 * • cleans only uniquely owned subjects, roles and permission fixtures.
 *
 * 🏗️ Architecture:
 * Real AppModule E2E with test-only probe routes and disposable DB/Redis.
 *
 * ⚠️ Important:
 * Tokens are reused across mutations. No signing or guard bypass is used.
 * Test probe permission/role names are unique and never installed in production.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import {
  Controller,
  Get,
  SetMetadata,
  UseGuards,
  ValidationPipe,
  type INestApplication,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import type { App } from 'supertest/types';
import {
  AuthUser,
  JwtAuthGuard,
  Roles,
  RolesGuard,
  type AuthenticatedUser,
} from '@api/core/auth';
import {
  PERMISSIONS_KEY,
  PermissionsGuard,
  SUBJECT_ACCESS_READER,
  type SubjectAccessReader,
} from '@api/core/authorization';
import { PrismaService } from '@api/core/database';
import { AppModule } from '../src/app.module';
import { AuthenticationPresentationService } from '../src/composition/identity/application/authentication-presentation.service';
import { EDITOR_CODE_HIGHLIGHTER } from '../src/modules/editor/application/contracts/editor-code-highlighter.interface';

const runId = randomUUID();
const probePermissionKey = `test.authorization.${runId}`;
const probeRoleName = `test-authz-${runId}`;

@Controller('authorization-probe')
@UseGuards(JwtAuthGuard, PermissionsGuard)
class AuthorizationProbeController {
  @Get('permission')
  @SetMetadata(PERMISSIONS_KEY, [probePermissionKey])
  permission() {
    return { allowed: true };
  }

  @Get('context')
  context(@AuthUser() actor: AuthenticatedUser) {
    return { roles: actor.roles, permissions: actor.permissions };
  }

  @Get('role')
  @Roles(probeRoleName)
  @UseGuards(RolesGuard)
  role() {
    return { allowed: true };
  }
}

describe('authoritative request access (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let managerToken: string;
  let probePermissionId: string;
  const subjects: string[] = [];
  const roles: string[] = [];

  async function register() {
    const suffix = randomUUID();
    const email = `authz-${suffix}@dss.test`;
    const password = 'authz-fixture-password-123';
    const identity = await app.get(AuthenticationPresentationService).register({
      email,
      password,
      username: `authz-${suffix}`,
      displayName: 'Access Pilot',
    });
    subjects.push(identity.user.id);
    return { ...identity, email, password };
  }

  function probe(token: string, path = 'permission') {
    return request(app.getHttpServer())
      .get(`/api/authorization-probe/${path}`)
      .set('Authorization', `Bearer ${token}`);
  }
  function manage(method: 'post' | 'delete' | 'patch', path: string) {
    return request(app.getHttpServer())
      [method](`/api/iam/${path}`)
      .set('Authorization', `Bearer ${managerToken}`);
  }

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [AuthorizationProbeController],
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
    for (const key of ['permissions.manage', 'roles.update', 'roles.delete']) {
      const permission = await prisma.permission.upsert({
        where: { key },
        update: {},
        create: { key, label: key },
      });
      await prisma.userPermission.create({
        data: { userId: manager.user.id, permissionId: permission.id },
      });
    }
    managerToken = (
      await app
        .get(AuthenticationPresentationService)
        .login({ email: manager.email, password: manager.password })
    ).tokens.accessToken;
    probePermissionId = (
      await prisma.permission.create({
        data: { key: probePermissionKey, label: 'Authorization probe' },
      })
    ).id;
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.role.deleteMany({ where: { id: { in: roles } } });
      await prisma.permission.deleteMany({
        where: { key: { startsWith: probePermissionKey } },
      });
      await prisma.auditRecord.deleteMany({
        where: { actorId: { in: subjects } },
      });
      await prisma.user.deleteMany({ where: { id: { in: subjects } } });
    }
    await app?.close();
  });

  it('honors direct revoke, grant, key rename and permission deletion with the same JWT', async () => {
    const subject = await register();
    await prisma.userPermission.create({
      data: { userId: subject.user.id, permissionId: probePermissionId },
    });
    const token = (
      await app
        .get(AuthenticationPresentationService)
        .login({ email: subject.email, password: subject.password })
    ).tokens.accessToken;
    await probe(token).expect(200);
    await manage(
      'delete',
      `user-access/${subject.user.id}/permissions/${probePermissionId}`,
    ).expect(200);
    await probe(token).expect(403);
    const context = await probe(token, 'context').expect(200);
    expect(
      (context.body as { permissions: string[] }).permissions,
    ).not.toContain(probePermissionKey);
    await manage('post', `user-access/${subject.user.id}/permissions`)
      .send({ permissionId: probePermissionId })
      .expect(201);
    await probe(token).expect(200);
    await manage('patch', `permissions/${probePermissionId}`)
      .send({ key: `${probePermissionKey}.renamed` })
      .expect(200);
    await probe(token).expect(403);
    await manage('patch', `permissions/${probePermissionId}`)
      .send({ key: probePermissionKey })
      .expect(200);
    await probe(token).expect(200);
    await manage('delete', `permissions/${probePermissionId}`).expect(200);
    await probe(token).expect(403);
    probePermissionId = (
      await prisma.permission.create({
        data: { key: probePermissionKey, label: 'Authorization probe' },
      })
    ).id;
  });

  it('honors role grant, permission removal, membership revocation and role deletion with an unchanged JWT', async () => {
    const subject = await register();
    const token = subject.tokens.accessToken;
    const role = await prisma.role.create({
      data: {
        name: probeRoleName,
        label: 'Probe role',
        permissions: { create: { permissionId: probePermissionId } },
      },
    });
    roles.push(role.id);
    await probe(token).expect(403);
    await probe(token, 'role').expect(403);
    await manage('post', `user-access/${subject.user.id}/roles`)
      .send({ roleId: role.id })
      .expect(201);
    await probe(token).expect(200);
    await probe(token, 'role').expect(200);
    await manage('post', `user-access/${subject.user.id}/permissions`)
      .send({ permissionId: probePermissionId })
      .expect(201);
    await manage(
      'delete',
      `roles/${role.id}/permissions/${probePermissionId}`,
    ).expect(200);
    await probe(token).expect(200);
    await manage(
      'delete',
      `user-access/${subject.user.id}/permissions/${probePermissionId}`,
    ).expect(200);
    await probe(token).expect(403);
    await manage('post', `roles/${role.id}/permissions`)
      .send({ permissionId: probePermissionId })
      .expect(201);
    await probe(token).expect(200);
    await manage(
      'delete',
      `user-access/${subject.user.id}/roles/${role.id}`,
    ).expect(200);
    await probe(token).expect(403);
    await probe(token, 'role').expect(403);
    await manage('post', `user-access/${subject.user.id}/roles`)
      .send({ roleId: role.id })
      .expect(201);
    await probe(token).expect(200);
    await manage('delete', `roles/${role.id}`).expect(200);
    await probe(token).expect(403);
    await probe(token, 'role').expect(403);
  });

  it('rejects authority failures without using JWT grants or returning a principal', async () => {
    const subject = await register();
    await prisma.userPermission.create({
      data: { userId: subject.user.id, permissionId: probePermissionId },
    });
    const token = (
      await app
        .get(AuthenticationPresentationService)
        .login({ email: subject.email, password: subject.password })
    ).tokens.accessToken;
    await probe(token).expect(200);
    const read = jest
      .spyOn(
        app.get<SubjectAccessReader>(SUBJECT_ACCESS_READER),
        'getAccessProfileByUserId',
      )
      .mockRejectedValue(new Error('Synthetic request authority failure'));
    try {
      await probe(token).expect(500);
      await probe(token, 'context').expect(500);
    } finally {
      read.mockRestore();
    }
    await probe(token).expect(200);
  });

  it('applies direct grant and revocation to an existing GraphQL permission guard with the same JWT', async () => {
    const subject = await register();
    const token = subject.tokens.accessToken;
    const key = 'achievements.manage';
    const permission = await prisma.permission.upsert({
      where: { key },
      update: {},
      create: { key, label: key },
    });
    const query = () =>
      request(app.getHttpServer())
        .post('/api/graphql')
        .set('Authorization', `Bearer ${token}`)
        .send({ query: '{ achievementsAdmin { id } }' })
        .expect(200);
    const denied = await query();
    expect(
      (denied.body as { errors: Array<{ extensions: { code: string } }> })
        .errors[0].extensions.code,
    ).toBe('FORBIDDEN');
    await manage('post', `user-access/${subject.user.id}/permissions`)
      .send({ permissionId: permission.id })
      .expect(201);
    const allowed = await query();
    expect((allowed.body as { errors?: unknown[] }).errors).toBeUndefined();
    expect(
      (allowed.body as { data: { achievementsAdmin: unknown[] } }).data
        .achievementsAdmin,
    ).toEqual(expect.any(Array));
    await manage(
      'delete',
      `user-access/${subject.user.id}/permissions/${permission.id}`,
    ).expect(200);
    const revoked = await query();
    expect(
      (revoked.body as { errors: Array<{ extensions: { code: string } }> })
        .errors[0].extensions.code,
    ).toBe('FORBIDDEN');
  });
});
