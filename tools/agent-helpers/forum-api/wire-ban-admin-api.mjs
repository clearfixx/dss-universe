// Adds the administrator queries of permanent bans; run from the repo root.
import { readFileSync, writeFileSync } from "node:fs";

const read = (file) => readFileSync(file, "utf8").replace(/\r\n/g, "\n");
function edit(file, search, replace) {
  const source = read(file);
  if (!source.includes(search)) throw new Error(`${file}: ${search}`);
  writeFileSync(file, source.replace(search, () => replace));
}

const moderation = "apps/api/src/modules/moderation";
edit(
  `${moderation}/infrastructure/prisma-account-ban-records.ts`,
  "  /** The ban in force for an account, if any. */\n",
  `  /** Rules an administrator can ban for, in numeric order. */
  async banRules(
    actor: ModerationActor,
  ): Promise<Array<{ id: string; code: string; text: string }>> {
    this.require(actor);
    const rows = await this.prisma.communityRule.findMany({
      where: { active: true },
      select: { id: true, code: true, text: true },
    });
    return rows.sort((a, b) => compareRuleCodes(a.code, b.code));
  }

  /** Bans in force, newest first. */
  async inForceList(
    actor: ModerationActor,
    page: number,
    limit: number,
  ): Promise<{ items: AccountBanRecord[]; total: number }> {
    this.require(actor);
    const take = Math.min(Math.max(Math.trunc(limit), 1), 50);
    const where = { liftedAt: null };
    const [rows, total] = await Promise.all([
      this.prisma.accountBan.findMany({
        where,
        orderBy: [{ issuedAt: 'desc' }, { id: 'asc' }],
        skip: (Math.max(Math.trunc(page), 1) - 1) * take,
        take,
      }),
      this.prisma.accountBan.count({ where }),
    ]);
    return { items: rows.map(accountBanRecord), total };
  }

  /** The ban in force for an account, if any. */
`,
);
edit(
  `${moderation}/infrastructure/prisma-account-ban-records.ts`,
  "import { banReference } from '../domain/account-ban.rules';\n",
  "import { banReference } from '../domain/account-ban.rules';\nimport { compareRuleCodes } from '../domain/community-rule.rules';\n",
);

const resolver = `${moderation}/presentation/account-bans.resolver.ts`;
edit(
  resolver,
  "@Resolver()\nexport class AccountBansResolver {",
  `@ObjectType('AccountBanRule')
class AccountBanRuleModel {
  @Field(() => ID) id!: string;
  @Field() code!: string;
  @Field() text!: string;
}

@ObjectType('AccountBanListItem')
class AccountBanListItemModel extends AccountBanModel {
  @Field(() => String, { nullable: true }) subjectName!: string | null;
  @Field(() => String, { nullable: true }) issuedByName!: string | null;
}

@ObjectType('AccountBanList')
class AccountBanListModel {
  @Field(() => [AccountBanListItemModel]) items!: AccountBanListItemModel[];
  @Field(() => Int) total!: number;
}

@Resolver()
export class AccountBansResolver {`,
);
edit(
  resolver,
  "  @Query(() => AccountBanModel, { nullable: true })\n",
  `  @Query(() => [AccountBanRuleModel], {
    description: 'Rules in force; only for those who may ban accounts.',
  })
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.ModerationBansManage)
  accountBanRules(@AuthUser() actor: AuthenticatedUser) {
    return this.execute(this.bans.banRules(actor));
  }

  @Query(() => AccountBanListModel)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.ModerationBansManage)
  async accountBans(
    @AuthUser() actor: AuthenticatedUser,
    @Args('page', { type: () => Int, defaultValue: 1 }) page: number,
    @Args('limit', { type: () => Int, defaultValue: 20 }) limit: number,
  ): Promise<AccountBanListModel> {
    const list = await this.execute(this.bans.inForceList(actor, page, limit));
    const ids = list.items.flatMap((ban) => [ban.subjectId, ban.issuerId]);
    const cards = new Map(
      (this.members ? await this.members.cards([...new Set(ids)]) : []).map(
        (card) => [card.id, card],
      ),
    );
    const name = (id: string) => {
      const card = cards.get(id);
      return card?.displayName || card?.username || null;
    };
    return {
      total: list.total,
      items: list.items.map((ban) => ({
        ...ban,
        subjectName: name(ban.subjectId),
        issuedByName: name(ban.issuerId),
      })),
    };
  }

  @Query(() => AccountBanModel, { nullable: true })
`,
);
edit(resolver, "  InputType,\n", "  InputType,\n  Int,\n");

// The e2e of bans proves both new queries.
edit(
  "apps/api/test/moderation-account-bans.e2e-spec.ts",
  "    await expect(bans.issue(actor, command)).rejects.toMatchObject({\n      code: 'INVALID_STATE',\n    });\n",
  `    await expect(bans.issue(actor, command)).rejects.toMatchObject({
      code: 'INVALID_STATE',
    });
    const listQuery =
      '{ accountBanRules { id } accountBans(limit: 50) { items { reference subjectName issuedByName } } }';
    const denied = await graphql(listQuery, {}, admin.tokens.accessToken);
    expect(denied.errors?.[0].extensions?.code).toBe('FORBIDDEN');
    expect(
      (await bans.banRules(actor)).some(({ id }) => id === rule.id),
    ).toBe(true);
    expect(
      (await bans.inForceList(actor, 1, 50)).items.map(
        ({ reference }) => reference,
      ),
    ).toContain(ban.reference);
`,
);
