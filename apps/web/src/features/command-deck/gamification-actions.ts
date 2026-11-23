"use server";

/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Command Deck
 * 📄 File: apps/web/src/features/command-deck/gamification-actions.ts
 *
 * 🎯 Purpose:
 * "Зберегти зміни" on Command Deck › Gamification › Правила XP: updates the
 * changed point rules and level thresholds through the existing XP engine
 * mutations (audited by the API).
 *
 * ⚠️ Important:
 * Level thresholds must stay strictly increasing after every single update,
 * so raises are applied from the top level down and cuts from the bottom up.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { forumResult } from "@/features/forum/forum-errors";
import {
  UpdateCommunityPointRuleDocument,
  UpdateLevelDefinitionDocument,
  type UpdateCommunityPointRuleInput,
} from "@/gql/graphql";
import { getClient } from "@/lib/apollo/rsc-client";

import { orderLevelChanges, type LevelChange } from "./gamification-model";

export async function saveXpSettings(input: {
  rules: UpdateCommunityPointRuleInput[];
  levels: LevelChange[];
}) {
  return forumResult(async () => {
    const token = (await cookies()).get("dss_access_token")?.value;
    const context = { headers: { authorization: `Bearer ${token ?? ""}` } };
    for (const rule of input.rules) {
      await getClient().mutate({
        mutation: UpdateCommunityPointRuleDocument,
        variables: { input: rule },
        context,
      });
    }
    for (const change of orderLevelChanges(input.levels)) {
      await getClient().mutate({
        mutation: UpdateLevelDefinitionDocument,
        variables: { input: { level: change.level, threshold: change.to } },
        context,
      });
    }
    revalidatePath("/command-deck/gamification", "layout");
    return input.rules.length + input.levels.length;
  });
}
