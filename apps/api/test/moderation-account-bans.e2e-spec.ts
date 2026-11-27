/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Moderation
 * 📄 File: apps/api/test/moderation-account-bans.e2e-spec.ts
 *
 * 🎯 Purpose:
 * Application-level proof of a permanent ban: sessions die, login yields
 * only a ban ticket, the ticket opens only the notice, lifting restores.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types';

import { AppModule } from './../src/app.module';
import { Permission } from './../src/core/authorization';
import { PrismaService } from './../src/core/database';
import { AuthenticationPresentationService } from './../src/composition/identity/application/authentication-presentation.service';
import { EDITOR_CODE_HIGHLIGHTER } from './../src/modules/editor/application/contracts/editor-code-highlighter.interface';
import { AccountBansService } from './../src/modules/moderation/infrastructure/prisma-account-ban-records';

type GraphqlResponse<T> = {
  data?: T;
  errors?: Array<{
    message: string;
    extensions?: { code?: string; banTicket?: string };
  }>;
};

const PASSWORD = 'Banned-pilot-password-123!';

describe('Permanent account bans (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(EDITOR_CODE_HIGHLIGHTER)
      .useValue({ highlight: (code: string) => Promise.resolve(code) })
      .compile();
    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidUnknownValues: true,
      }),
    );
    await app.init();
  }, 60000);

  afterAll(async () => {
    await app?.close();
  });

  async function member(label: string) {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const email = `ban-${label}-${suffix}@dss.test`;
    const session = await app.get(AuthenticationPresentationService).register({
      email,
      username: `ban-${label}-${suffix}`,
      displayName: `Ban ${label}`,
      password: PASSWORD,
    });
    return { ...session, email };
  }

  async function grantRole(userId: string, name: string) {
    const prisma = app.get(PrismaService);
    const role = await prisma.role.upsert({
      where: { name },
      create: { name, label: name },
      update: {},
    });
    await prisma.userRole.create({ data: { userId, roleId: role.id } });
  }

  function graphql<T>(query: string, variables = {}, token?: string) {
    const call = request(app.getHttpServer()).post('/api/graphql');
    if (token) call.set('Authorization', 'Bearer ' + token);
    return call
      .send({ query, variables })
      .expect(200)
      .then((response) => response.body as GraphqlResponse<T>);
  }

  const login = (email: string, password = PASSWORD) =>
    graphql<{ login: { tokens: { accessToken: string } } }>(
      `
        mutation Login($input: LoginInput!) {
          login(input: $input) {
            tokens {
              accessToken
            }
          }
        }
      `,
      { input: { email, password } },
    );

  const noticeQuery = `query Notice($ticket: String!) {
    accountBanNotice(ticket: $ticket) {
      reference ruleCode ruleText comment contextPath issuedByName
    }
  }`;

  it('removes all access, leaves only the notice and restores on lifting', async () => {
    const admin = await member('admin');
    const subject = await member('subject');
    const prisma = app.get(PrismaService);
    const rule = await prisma.communityRule.create({
      data: {
        code: `${Math.floor(Math.random() * 900) + 100}.1`,
        text: 'No spam.',
      },
    });
    const bans = app.get(AccountBansService);
    const actor = {
      id: admin.user.id,
      permissions: [Permission.ModerationBansManage] as string[],
    };
    const command = {
      subjectId: subject.user.id,
      ruleId: rule.id,
      comment: 'Repeated advertising.',
      context: null,
    };

    await expect(
      bans.issue({ id: admin.user.id, permissions: [] }, command),
    ).rejects.toMatchObject({ code: 'ACCESS_DENIED' });
    await expect(
      bans.issue(actor, { ...command, subjectId: admin.user.id }),
    ).rejects.toMatchObject({ code: 'ACCESS_DENIED' });

    const ban = await bans.issue(actor, command);
    expect(ban.reference).toMatch(/^BAN-\d{4}-\d{2}-\d{2}-[0-9A-F]{6}$/);
    await expect(bans.issue(actor, command)).rejects.toMatchObject({
      code: 'INVALID_STATE',
    });

    // The old session no longer works anywhere.
    const stale = await graphql(
      '{ viewerSanctionStatus { activeWarnings } }',
      {},
      subject.tokens.accessToken,
    );
    expect(stale.errors?.[0].extensions?.code).toBe('UNAUTHENTICATED');

    // A wrong password reveals nothing about the ban.
    const wrong = await login(subject.email, 'Not-the-password-123!');
    expect(wrong.errors?.[0].extensions?.banTicket).toBeUndefined();
    expect(wrong.errors?.[0].extensions?.code).toBe('UNAUTHENTICATED');

    const blocked = await login(subject.email);
    expect(blocked.data?.login).toBeUndefined();
    expect(blocked.errors?.[0].message).toBe('ACCOUNT_BANNED');
    const ticket = blocked.errors![0].extensions!.banTicket!;

    const notice = await graphql<{ accountBanNotice: unknown }>(noticeQuery, {
      ticket,
    });
    expect(notice.data?.accountBanNotice).toEqual({
      reference: ban.reference,
      ruleCode: rule.code,
      ruleText: 'No spam.',
      comment: 'Repeated advertising.',
      contextPath: null,
      issuedByName: 'Ban admin',
    });

    // The ticket is not a session token, and a session token is not a ticket.
    const asToken = await graphql(
      '{ viewerSanctionStatus { activeWarnings } }',
      {},
      ticket,
    );
    expect(asToken.errors?.[0].extensions?.code).toBe('UNAUTHENTICATED');
    const asTicket = await graphql(noticeQuery, {
      ticket: admin.tokens.accessToken,
    });
    expect(asTicket.errors?.[0].extensions?.code).toBe('FORBIDDEN');

    await expect(
      bans.lift(actor, ban.id, 'Issued by mistake.'),
    ).resolves.toMatchObject({ liftReason: 'Issued by mistake.' });
    await expect(bans.lift(actor, ban.id, 'Again.')).rejects.toMatchObject({
      code: 'INVALID_STATE',
    });
    const spent = await graphql(noticeQuery, { ticket });
    expect(spent.errors?.[0].extensions?.code).toBe('FORBIDDEN');
    const restored = await login(subject.email);
    expect(restored.data?.login.tokens.accessToken).toBeTruthy();
  }, 60000);

  it('never bans the owner and lets only the owner ban an administrator', async () => {
    const admin = await member('second-admin');
    const owner = await member('owner');
    const otherAdmin = await member('other-admin');
    await grantRole(owner.user.id, 'owner');
    await grantRole(otherAdmin.user.id, 'admin');
    const bans = app.get(AccountBansService);
    const rule = await app.get(PrismaService).communityRule.create({
      data: {
        code: `${Math.floor(Math.random() * 900) + 100}.2`,
        text: 'Respect others.',
      },
    });
    const as = (id: string) => ({
      id,
      permissions: [Permission.ModerationBansManage] as string[],
    });
    const against = (subjectId: string) => ({
      subjectId,
      ruleId: rule.id,
      comment: 'Test ban.',
      context: null,
    });

    await expect(
      bans.issue(as(admin.user.id), against(owner.user.id)),
    ).rejects.toMatchObject({ code: 'ACCESS_DENIED' });
    await expect(
      bans.issue(as(admin.user.id), against(otherAdmin.user.id)),
    ).rejects.toMatchObject({ code: 'ACCESS_DENIED' });
    await expect(
      bans.issue(as(owner.user.id), against(otherAdmin.user.id)),
    ).resolves.toMatchObject({ subjectId: otherAdmin.user.id });
  }, 60000);
});
