/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Identity Composition
 * 📄 File: apps/api/src/composition/identity/infrastructure/prisma-registration-transaction.integration.spec.ts
 *
 * 🎯 Purpose:
 * Proves registration commit/rollback and failure ordering in real PostgreSQL.
 *
 * 🧠 Responsibilities:
 * • isolates fixtures and injected database failures in a unique schema;
 * • verifies shared profile/credentials and IAM assignment atomicity;
 * • observes that failed enrollment never reaches token/session issuance.
 *
 * 🏗️ Architecture:
 * Real registration adapter, Auth enrollment and presentation composition;
 * downstream issuance/delivery are instrumented, not HTTP E2E.
 *
 * ⚠️ Important:
 * Never mutate public seed accounts or roles. Drop only this suite's schema.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Test, type TestingModule } from '@nestjs/testing';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '@api/core/database';
import { AuditWriterService } from '@api/core/audit';
import { AUTHENTICATION_FLOWS } from '@api/modules/auth';
import { VIEWER_PROFILE_READER } from '@api/modules/users';
import { AuthService } from '@api/modules/auth/application/services/auth.service';
import { PasswordHashService } from '@api/modules/auth/application/services/password-hash.service';
import { TokenService } from '@api/modules/auth/application/services/token.service';
import { AuthSessionService } from '@api/modules/auth/application/services/auth-session.service';
import { EmailVerificationService } from '@api/modules/auth/application/services/email-verification.service';
import { LoginAbuseProtectionService } from '@api/modules/auth/application/services/login-abuse-protection.service';
import { SecurityAlertService } from '@api/modules/auth/application/services/security-alert.service';
import { TwoFactorService } from '@api/modules/auth/application/services/two-factor.service';
import { ACCOUNT_CREDENTIALS_REPOSITORY } from '@api/modules/auth/domain/repositories/account-credentials.repository.interface';
import { PrismaAccountCredentialsRepository } from '@api/modules/auth/infrastructure/repositories/prisma-account-credentials.repository';
import { AuthenticationPresentationService } from '../application/authentication-presentation.service';
import { REGISTRATION_TRANSACTION } from '../application/contracts/registration-transaction.contract';
import { PrismaRegistrationTransaction } from './prisma-registration-transaction';

const dbSuite =
  process.env.RUN_AUTH_DB_TESTS === '1' ? describe : describe.skip;
dbSuite('registration PostgreSQL atomicity', () => {
  const schema = `registration_${randomUUID().replaceAll('-', '')}`;
  const admin = new Pool({ connectionString: process.env.DATABASE_URL });
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    options: `-c search_path=${schema},public`,
  });
  const prisma = new PrismaService({ adapter: new PrismaPg(pool, { schema }) });
  const registration = new PrismaRegistrationTransaction(prisma);
  const generateTokens = jest.fn();
  const createSession = jest.fn();
  const requestVerification = jest.fn();
  const readProfile = jest.fn();
  let module: TestingModule;
  let presentation: AuthenticationPresentationService;
  const credentials = {
    email: 'pilot@dss.test',
    passwordHash: 'synthetic-hash',
  };
  const input = {
    email: credentials.email,
    password: 'synthetic-registration-password',
    username: 'pilot',
    displayName: 'Pilot',
  };

  beforeAll(async () => {
    await admin.query(`CREATE SCHEMA "${schema}"`);
    for (const table of ['users', 'roles', 'user_roles', 'sessions']) {
      await pool.query(
        `CREATE TABLE ${table} (LIKE public.${table} INCLUDING ALL)`,
      );
    }
    // LIKE retains the public enum; Prisma qualifies inserted enum casts to its schema.
    await pool.query(`
      CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'DEACTIVATED', 'BANNED', 'DELETED');
      ALTER TABLE users ALTER COLUMN status DROP DEFAULT;
      ALTER TABLE users ALTER COLUMN status TYPE "UserStatus" USING status::text::"UserStatus";
      ALTER TABLE users ALTER COLUMN status SET DEFAULT 'ACTIVE'::"UserStatus";
    `);
    await pool.query(
      'ALTER TABLE user_roles ADD FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE, ADD FOREIGN KEY ("roleId") REFERENCES roles(id) ON DELETE CASCADE',
    );
    await pool.query(
      'ALTER TABLE sessions ADD FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE',
    );
    await pool.query('CREATE TABLE registration_failure (stage TEXT NOT NULL)');
    await pool.query(`
      CREATE FUNCTION reject_registration() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF EXISTS (SELECT 1 FROM registration_failure WHERE stage = TG_TABLE_NAME) THEN
          IF NOT EXISTS (SELECT 1 FROM users) THEN
            RAISE EXCEPTION 'test setup failed: subject was not inserted';
          END IF;
          RAISE EXCEPTION 'synthetic registration rejection after subject insert';
        END IF;
        RETURN NEW;
      END $$;
      CREATE TRIGGER reject_profile AFTER INSERT ON users
        FOR EACH ROW EXECUTE FUNCTION reject_registration();
      CREATE TRIGGER reject_assignment AFTER INSERT ON user_roles
        FOR EACH ROW EXECUTE FUNCTION reject_registration();
    `);
    module = await Test.createTestingModule({
      providers: [
        AuthenticationPresentationService,
        AuthService,
        PasswordHashService,
        PrismaAccountCredentialsRepository,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditWriterService, useValue: { append: jest.fn() } },
        { provide: AUTHENTICATION_FLOWS, useExisting: AuthService },
        {
          provide: ACCOUNT_CREDENTIALS_REPOSITORY,
          useExisting: PrismaAccountCredentialsRepository,
        },
        { provide: REGISTRATION_TRANSACTION, useValue: registration },
        { provide: VIEWER_PROFILE_READER, useValue: { findById: readProfile } },
        { provide: TokenService, useValue: { generateTokens } },
        { provide: AuthSessionService, useValue: { create: createSession } },
        {
          provide: EmailVerificationService,
          useValue: { requestAfterRegistration: requestVerification },
        },
        { provide: LoginAbuseProtectionService, useValue: {} },
        { provide: SecurityAlertService, useValue: {} },
        { provide: TwoFactorService, useValue: {} },
      ],
    }).compile();
    presentation = module.get(AuthenticationPresentationService);
  });
  beforeEach(async () => {
    jest.clearAllMocks();
    await pool.query(
      'TRUNCATE user_roles, sessions, users, roles, registration_failure',
    );
    await prisma.role.create({ data: { name: 'user', label: 'User' } });
  });
  afterAll(async () => {
    await module?.close();
    await prisma.$disconnect();
    await pool.end();
    await admin.query(`DROP SCHEMA "${schema}" CASCADE`);
    await admin.end();
  });

  async function expectEmptyRegistration() {
    expect(await prisma.user.count()).toBe(0);
    expect(await prisma.userRole.count()).toBe(0);
    expect(await prisma.session.count()).toBe(0);
  }

  it('commits only the bound profile, credentials and baseline role, returning an opaque ID', async () => {
    const profile = {
      username: 'pilot',
      displayName: 'Pilot',
      roleId: 'forged-admin',
    };
    const store = registration.forProfile(profile);
    profile.username = 'mutated';
    const subjectId = await store.create(credentials);
    expect(typeof subjectId).toBe('string');
    expect(
      await prisma.user.findUnique({
        where: { id: subjectId },
        select: {
          email: true,
          username: true,
          displayName: true,
          passwordHash: true,
        },
      }),
    ).toEqual({
      ...credentials,
      username: 'pilot',
      displayName: 'Pilot',
    });
    const grants = await prisma.userRole.findMany({
      select: { userId: true, role: { select: { name: true } } },
    });
    expect(grants).toEqual([{ userId: subjectId, role: { name: 'user' } }]);
    expect(await prisma.session.count()).toBe(0);
  });

  it('leaves no subject when the required registration role is absent', async () => {
    await prisma.role.deleteMany();
    await expect(
      registration.forProfile(input).create(credentials),
    ).rejects.toThrow();
    await expectEmptyRegistration();
  });

  it.each(['users', 'user_roles'])(
    'rolls the whole database transaction back after %s insertion fails',
    async (stage) => {
      await pool.query('INSERT INTO registration_failure(stage) VALUES ($1)', [
        stage,
      ]);
      await expect(
        registration.forProfile(input).create(credentials),
      ).rejects.toThrow(
        'synthetic registration rejection after subject insert',
      );
      await expectEmptyRegistration();
      expect(await prisma.role.count()).toBe(1);
      await pool.query('DELETE FROM registration_failure');
      await expect(
        registration.forProfile(input).create(credentials),
      ).resolves.toEqual(expect.any(String));
      expect(await prisma.user.count()).toBe(1);
      expect(await prisma.userRole.count()).toBe(1);
    },
  );

  it.each(['email', 'username'] as const)(
    'commits exactly one complete registration on concurrent duplicate %s',
    async (field) => {
      const results = await Promise.allSettled(
        [0, 1].map((index) =>
          registration
            .forProfile({
              username: field === 'username' ? 'same-pilot' : `pilot-${index}`,
            })
            .create({
              email:
                field === 'email' ? 'same@dss.test' : `pilot-${index}@dss.test`,
              passwordHash: credentials.passwordHash,
            }),
        ),
      );
      expect(
        results.filter(({ status }) => status === 'fulfilled'),
      ).toHaveLength(1);
      expect(
        results.filter(({ status }) => status === 'rejected'),
      ).toHaveLength(1);
      expect(await prisma.user.count()).toBe(1);
      expect(await prisma.userRole.count()).toBe(1);
      expect(await prisma.session.count()).toBe(0);
    },
  );

  it.each(['users', 'user_roles'])(
    'never reaches tokens, sessions, verification or profile reads after a real %s failure',
    async (stage) => {
      await pool.query('INSERT INTO registration_failure(stage) VALUES ($1)', [
        stage,
      ]);
      await expect(presentation.register(input)).rejects.toThrow(
        'synthetic registration rejection after subject insert',
      );
      expect(generateTokens).not.toHaveBeenCalled();
      expect(createSession).not.toHaveBeenCalled();
      expect(requestVerification).not.toHaveBeenCalled();
      expect(readProfile).not.toHaveBeenCalled();
      await expectEmptyRegistration();
    },
  );
});
