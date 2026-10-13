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
  const gateIds: string[] = [];

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
    for (const key of [
      'permissions.manage',
      'content-gates.configure',
      'users.read',
      'roles.create',
      'roles.read',
      'roles.update',
      'roles.delete',
    ]) {
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
      await prisma.contentGate.deleteMany({ where: { id: { in: gateIds } } });
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

  it('preserves subject summaries, direct/role overlap, errors and guard denial', async () => {
    const subject = await register();
    const denied = await register();
    await prisma.userRole.deleteMany({ where: { userId: denied.user.id } });
    await prisma.userPermission.deleteMany({
      where: { userId: denied.user.id },
    });
    const path = `/api/iam/user-access/${subject.user.id}`;
    await request(app.getHttpServer()).get(path).expect(401);
    await request(app.getHttpServer())
      .get(path)
      .set('Authorization', `Bearer ${denied.tokens.accessToken}`)
      .expect(403);
    await request(app.getHttpServer())
      .post(`${path}/permissions`)
      .set('Authorization', `Bearer ${denied.tokens.accessToken}`)
      .send({ permissionId: probePermissionId })
      .expect(403);
    expect(
      await prisma.userPermission.count({
        where: { userId: subject.user.id, permissionId: probePermissionId },
      }),
    ).toBe(0);
    const summary = await request(app.getHttpServer())
      .get(path)
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);
    expect(Object.keys(summary.body as object).sort()).toEqual(
      ['userId', 'roles', 'directPermissions', 'effectivePermissions'].sort(),
    );
    const role = await prisma.role.create({
      data: {
        name: `${probeRoleName}-summary`,
        label: 'Summary role',
        permissions: { create: { permissionId: probePermissionId } },
      },
    });
    roles.push(role.id);
    await manage('post', `user-access/${subject.user.id}/roles`)
      .send({ roleId: role.id })
      .expect(201);
    await manage('post', `user-access/${subject.user.id}/roles`)
      .send({ roleId: role.id })
      .expect(409);
    const direct = await manage(
      'post',
      `user-access/${subject.user.id}/permissions`,
    )
      .send({ permissionId: probePermissionId })
      .expect(201);
    expect(
      (
        direct.body as { effectivePermissions: string[] }
      ).effectivePermissions.filter((key) => key === probePermissionKey),
    ).toHaveLength(1);
    await manage('post', `user-access/${subject.user.id}/permissions`)
      .send({ permissionId: probePermissionId })
      .expect(409);
    const withoutDirect = await manage(
      'delete',
      `user-access/${subject.user.id}/permissions/${probePermissionId}`,
    ).expect(200);
    expect(
      (withoutDirect.body as { effectivePermissions: string[] })
        .effectivePermissions,
    ).toContain(probePermissionKey);
    const withoutRole = await manage(
      'delete',
      `user-access/${subject.user.id}/roles/${role.id}`,
    ).expect(200);
    expect(
      (withoutRole.body as { effectivePermissions: string[] })
        .effectivePermissions,
    ).not.toContain(probePermissionKey);
    await manage(
      'delete',
      `user-access/${subject.user.id}/permissions/${probePermissionId}`,
    ).expect(404);
    await manage('post', `user-access/${subject.user.id}/permissions`)
      .send({ permissionId: randomUUID() })
      .expect(404);
    await manage('post', `user-access/${randomUUID()}/roles`)
      .send({ roleId: role.id })
      .expect(404);
  });

  it.each(['admin', 'super_admin'])(
    'protects the final normalized %s assignment through HTTP',
    async (name) => {
      const first = await register();
      const second = await register();
      // Whitespace is unique to this run but normalizes to the protected role name.
      // Never mutate the shared seeded administrative roles or their holders.
      const suffix = [...runId]
        .map((character) =>
          character
            .charCodeAt(0)
            .toString(2)
            .replaceAll('0', ' ')
            .replaceAll('1', '\t'),
        )
        .join('');
      const role = await prisma.role.create({
        data: {
          name: `${name}${suffix}`,
          label: 'Owned privileged fixture',
          isSystem: true,
        },
      });
      roles.push(role.id);
      await manage('post', `user-access/${first.user.id}/roles`)
        .send({ roleId: role.id })
        .expect(201);
      await manage(
        'delete',
        `user-access/${first.user.id}/roles/${role.id}`,
      ).expect(400);
      expect(await prisma.userRole.count({ where: { roleId: role.id } })).toBe(
        1,
      );
      await manage('post', `user-access/${second.user.id}/roles`)
        .send({ roleId: role.id })
        .expect(201);
      const removed = await manage(
        'delete',
        `user-access/${first.user.id}/roles/${role.id}`,
      ).expect(200);
      expect(Object.keys(removed.body as object).sort()).toEqual(
        ['userId', 'roles', 'directPermissions', 'effectivePermissions'].sort(),
      );
      expect(removed.body).toMatchObject({ userId: first.user.id });
      await manage(
        'delete',
        `user-access/${first.user.id}/roles/${role.id}`,
      ).expect(404);
      await manage(
        'delete',
        `user-access/${second.user.id}/roles/${role.id}`,
      ).expect(400);
      expect(
        await prisma.userRole.findMany({
          where: { roleId: role.id },
          select: { userId: true },
        }),
      ).toEqual([{ userId: second.user.id }]);
    },
  );

  it('preserves protected role CRUD, assignment errors and response fields through HTTP', async () => {
    const name = `${probeRoleName}-crud`;
    await request(app.getHttpServer())
      .post('/api/iam/roles')
      .send({ name, label: 'Role' })
      .expect(401);
    const unprivileged = await register();
    await request(app.getHttpServer())
      .post('/api/iam/roles')
      .set('Authorization', `Bearer ${unprivileged.tokens.accessToken}`)
      .send({ name, label: 'Role' })
      .expect(403);
    expect(await prisma.role.count({ where: { name } })).toBe(0);
    const created = await manage('post', 'roles')
      .send({ name, label: 'Role', permissionIds: [probePermissionId] })
      .expect(201);
    const id = (created.body as { id: string }).id;
    roles.push(id);
    expect(Object.keys(created.body as object).sort()).toEqual(
      ['id', 'name', 'label', 'description', 'isSystem', 'permissions'].sort(),
    );
    expect(created.body).toMatchObject({
      name,
      isSystem: false,
      permissions: [{ id: probePermissionId, key: probePermissionKey }],
    });
    await manage('post', 'roles')
      .send({ name, label: 'Duplicate' })
      .expect(409);
    await request(app.getHttpServer())
      .get(`/api/iam/roles/${id}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .expect(200);
    await manage('post', `roles/${id}/permissions`)
      .send({ permissionId: probePermissionId })
      .expect(409);
    await manage(
      'delete',
      `roles/${id}/permissions/${probePermissionId}`,
    ).expect(200);
    await manage(
      'delete',
      `roles/${id}/permissions/${probePermissionId}`,
    ).expect(404);
    await manage('post', `roles/${id}/permissions`)
      .send({ permissionId: probePermissionId })
      .expect(201);
    await manage('patch', `roles/${id}`).send({ label: 'Changed' }).expect(200);
    await manage('delete', `roles/${id}`).expect(200);
    await manage('delete', `roles/${id}`).expect(404);
    const system = await prisma.role.create({
      data: { name: `${name}-system`, label: 'System', isSystem: true },
    });
    roles.push(system.id);
    await manage('patch', `roles/${system.id}`)
      .send({ label: 'Unsafe' })
      .expect(400);
    await manage('delete', `roles/${system.id}`).expect(400);
    expect(
      await prisma.role.findUnique({
        where: { id: system.id },
        select: { label: true },
      }),
    ).toEqual({ label: 'System' });
  });

  it('requires group audience before Premium threshold bypass without granting staff tools', async () => {
    const premium = await register();
    const existingPremium = await prisma.role.findUnique({
      where: { name: 'PREMIUM' },
    });
    const premiumRole =
      existingPremium ??
      (await prisma.role.create({
        data: { name: 'PREMIUM', label: 'Premium fixture' },
      }));
    if (!existingPremium) roles.push(premiumRole.id);
    const audienceName = `${probeRoleName}-audience`;
    const audience = await prisma.role.create({
      data: { name: audienceName, label: 'Audience fixture' },
    });
    roles.push(audience.id);
    await manage('post', `user-access/${premium.user.id}/roles`)
      .send({ roleId: premiumRole.id })
      .expect(201);
    await request(app.getHttpServer())
      .get('/api/iam/permissions')
      .set('Authorization', `Bearer ${premium.tokens.accessToken}`)
      .expect(403);
    const created = await request(app.getHttpServer())
      .post('/api/graphql')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        query: `mutation { createContentGate(input: { operator: ANY, requirements: [{kind: GROUP, groupKey: "${audienceName}"}, {kind: REPUTATION, threshold: 1000000}] }) { id } }`,
      })
      .expect(200);
    expect((created.body as { errors?: unknown[] }).errors).toBeUndefined();
    const id = (created.body as { data: { createContentGate: { id: string } } })
      .data.createContentGate.id;
    gateIds.push(id);
    async function evaluate() {
      const response = await request(app.getHttpServer())
        .post('/api/graphql')
        .set('Authorization', `Bearer ${premium.tokens.accessToken}`)
        .send({
          query: `query { evaluateContentGate(id: "${id}") { allowed bypassed unmet notice } }`,
        })
        .expect(200);
      expect((response.body as { errors?: unknown[] }).errors).toBeUndefined();
      return (
        response.body as {
          data: {
            evaluateContentGate: {
              allowed: boolean;
              bypassed: boolean;
              unmet: string[];
            };
          };
        }
      ).data.evaluateContentGate;
    }
    expect(await evaluate()).toMatchObject({
      allowed: false,
      bypassed: false,
      unmet: ['GROUP'],
    });
    await manage('post', `user-access/${premium.user.id}/roles`)
      .send({ roleId: audience.id })
      .expect(201);
    expect(await evaluate()).toMatchObject({
      allowed: true,
      bypassed: true,
      unmet: [],
    });
    await manage(
      'delete',
      `user-access/${premium.user.id}/roles/${audience.id}`,
    ).expect(200);
    expect(await evaluate()).toMatchObject({
      allowed: false,
      bypassed: false,
      unmet: ['GROUP'],
    });
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
