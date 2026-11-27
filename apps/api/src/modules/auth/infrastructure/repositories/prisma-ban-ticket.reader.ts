/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authentication
 * 📄 File: apps/api/src/modules/auth/infrastructure/repositories/prisma-ban-ticket.reader.ts
 *
 * 🎯 Purpose:
 * Auth-owned verification of ban tickets against the current account.
 *
 * ⚠️ Important:
 * Lifting a ban bumps authVersion, so older tickets stop working.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@api/core/database';
import { TokenService } from '../../application/services/token.service';
import type { AuthBanTickets } from '../../contracts/ban-tickets.contract';

@Injectable()
export class PrismaBanTicketReader implements AuthBanTickets {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
  ) {}

  async subjectOf(ticket: string): Promise<string | null> {
    const claims = await this.tokens.verifyBanTicket(ticket);
    if (!claims) return null;
    const account = await this.prisma.user.findUnique({
      where: { id: claims.subjectId },
      select: { status: true, authVersion: true },
    });
    return account?.status === 'BANNED' &&
      account.authVersion === claims.authVersion
      ? claims.subjectId
      : null;
  }
}
