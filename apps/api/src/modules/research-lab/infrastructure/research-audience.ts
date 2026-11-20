import { Prisma } from '@prisma/client';

export function researchAudience(
  groups: readonly string[],
  authenticated: boolean,
): Prisma.ResearchPageWhereInput {
  if (!authenticated) return { visibility: 'PUBLIC' };
  return {
    OR: [
      { visibility: { in: ['PUBLIC', 'MEMBERS'] } },
      {
        visibility: 'GROUPS',
        audienceGroups: {
          some: {
            groupKey: {
              in: groups
                .filter((key) => key.startsWith('group:'))
                .map((key) => key.slice('group:'.length)),
            },
          },
        },
      },
    ],
  };
}
