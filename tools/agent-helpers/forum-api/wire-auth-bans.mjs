// One-off wiring edits for the Auth side of permanent bans; run from the repo root.
import { readFileSync, writeFileSync } from "node:fs";

function edit(file, search, replace) {
  const source = readFileSync(file, "utf8").replace(/\r\n/g, "\n");
  if (!source.includes(search)) throw new Error(`${file}: ${search}`);
  writeFileSync(file, source.replace(search, replace));
}

const auth = "apps/api/src/modules/auth";

edit(
  `${auth}/application/services/token.service.ts`,
  "  async signTokenPair(\n",
  `  /**
   * A ban ticket is signed with its own derived key, so it can never pass as
   * an access or refresh token and neither of them passes as a ticket.
   */
  async signBanTicket(user: TokenSubject): Promise<string> {
    return this.jwtService.signAsync(
      { sub: user.id, ver: user.authVersion, purpose: 'ban' },
      { secret: this.getBanTicketSecret(), expiresIn: '30m' },
    );
  }

  async verifyBanTicket(
    ticket: string,
  ): Promise<{ subjectId: string; authVersion: number } | null> {
    try {
      const claims = await this.jwtService.verifyAsync<{
        sub?: unknown;
        ver?: unknown;
        purpose?: unknown;
      }>(ticket, { secret: this.getBanTicketSecret() });
      return claims.purpose === 'ban' &&
        typeof claims.sub === 'string' &&
        typeof claims.ver === 'number'
        ? { subjectId: claims.sub, authVersion: claims.ver }
        : null;
    } catch {
      return null;
    }
  }

  private getBanTicketSecret(): string {
    return createHmac('sha256', this.getJwtRefreshSecret())
      .update('dss.ban-ticket.v1')
      .digest('hex');
  }

  async signTokenPair(
`,
);
edit(
  `${auth}/application/services/token.service.ts`,
  "import { Inject, Injectable } from '@nestjs/common';",
  "import { createHmac } from 'node:crypto';\nimport { Inject, Injectable } from '@nestjs/common';",
);

const service = `${auth}/application/services/auth.service.ts`;
edit(
  service,
  `    if (!user || user.status !== 'ACTIVE' || !isPasswordValid) {
      await this.loginProtection.recordFailure(`,
  `    // A banned account continues only to prove the same factors; it ends
    // with a ban ticket instead of a session.
    const banned = user?.status === 'BANNED';
    if (!user || (user.status !== 'ACTIVE' && !banned) || !isPasswordValid) {
      await this.loginProtection.recordFailure(`,
);
edit(
  service,
  `    await this.loginProtection.recordSuccess(email, user, client);
    return this.issueAuthResponse(user.id, client);
  }

  async refresh(`,
  `    await this.loginProtection.recordSuccess(email, user, client);
    if (banned) {
      throw new AccountBannedException(
        await this.tokenService.signBanTicket({
          id: user.id,
          email: user.email,
          authVersion: user.authVersion,
        }),
      );
    }
    return this.issueAuthResponse(user.id, client);
  }

  async refresh(`,
);
edit(
  service,
  "import { InvalidCredentialsException }",
  "import { AccountBannedException } from '../../domain/exceptions/account-banned.exception';\nimport { InvalidCredentialsException }",
);

const mapper = `${auth}/presentation/mappers/map-auth-failure.ts`;
edit(
  mapper,
  "  if (failure instanceof LoginRateLimitedException)",
  `  if (failure instanceof AccountBannedException)
    return new HttpException(
      {
        message: failure.message,
        statusCode: HttpStatus.FORBIDDEN,
        banTicket: failure.banTicket,
      },
      HttpStatus.FORBIDDEN,
    );
  if (failure instanceof LoginRateLimitedException)`,
);
edit(
  mapper,
  "import { EmailAlreadyExistsException }",
  "import { AccountBannedException } from '../../domain/exceptions/account-banned.exception';\nimport { EmailAlreadyExistsException }",
);

const formatter = "apps/api/src/core/graphql/errors/graphql-error.formatter.ts";
edit(
  formatter,
  "  statusCode?: number;\n};",
  "  statusCode?: number;\n  /** The one extra field clients receive: see Auth's banned-login failure. */\n  banTicket?: unknown;\n};",
);
edit(
  formatter,
  "      ...(statusCode ? { statusCode } : {}),\n    },",
  "      ...(statusCode ? { statusCode } : {}),\n      ...(typeof original?.banTicket === 'string'\n        ? { banTicket: original.banTicket }\n        : {}),\n    },",
);

const moduleFile = `${auth}/auth.module.ts`;
edit(
  moduleFile,
  "    { provide: AUTH_ACCOUNT_EVIDENCE, useClass: PrismaAccountEvidenceReader },\n",
  "    { provide: AUTH_ACCOUNT_EVIDENCE, useClass: PrismaAccountEvidenceReader },\n    { provide: AUTH_ACCOUNT_BANS, useClass: PrismaAccountBans },\n",
);
edit(
  moduleFile,
  "    AUTH_ACCOUNT_EVIDENCE,\n    ",
  "    AUTH_ACCOUNT_EVIDENCE,\n    AUTH_ACCOUNT_BANS,\n    ",
);
edit(
  moduleFile,
  "import { AuthService }",
  "import { AUTH_ACCOUNT_BANS } from './contracts/account-bans.contract';\nimport { PrismaAccountBans } from './infrastructure/repositories/prisma-account-bans';\n\nimport { AuthService }",
);

edit(
  `${auth}/index.ts`,
  "export {\n  AUTH_ACCOUNT_EVIDENCE,",
  "export {\n  AUTH_ACCOUNT_BANS,\n  type AuthAccountBans,\n  type StatusBeforeBan,\n} from './contracts/account-bans.contract';\nexport {\n  AUTH_ACCOUNT_EVIDENCE,",
);
