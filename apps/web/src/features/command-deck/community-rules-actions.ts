"use server";

/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Command Deck
 * 📄 File: apps/web/src/features/command-deck/community-rules-actions.ts
 *
 * 🎯 Purpose:
 * Command Deck › Модерація › Правила спільноти: add and edit the numbered
 * rules that a permanent ban refers to.
 *
 * ⚠️ Important:
 * The API checks the permission and validates numbers and texts.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import {
  ForumSignInRequired,
  forumError,
  forumResult,
  type ForumResult,
} from "@/features/forum/forum-errors";
import {
  CreateCommunityRuleDocument,
  UpdateCommunityRuleDocument,
} from "@/gql/graphql";
import { getClient } from "@/lib/apollo/rsc-client";

export type CommunityRuleDraft = Readonly<{
  code: string;
  text: string;
  active: boolean;
}>;

const PATH = "/command-deck/moderation/rules";

async function signedIn() {
  const token = (await cookies()).get("dss_access_token")?.value;
  if (!token) throw new ForumSignInRequired();
  return { headers: { authorization: `Bearer ${token}` } };
}

/** Creates a rule, or updates it when `id` is given. */
export async function saveCommunityRule(
  id: string | null,
  input: CommunityRuleDraft,
): Promise<ForumResult<null>> {
  const result = await forumResult(async () => {
    const context = await signedIn();
    if (id)
      await getClient().mutate({
        mutation: UpdateCommunityRuleDocument,
        variables: { id, input },
        context,
      });
    else
      await getClient().mutate({
        mutation: CreateCommunityRuleDocument,
        variables: { input },
        context,
      });
    return null;
  });
  if (result.ok) revalidatePath(PATH);
  else if (result.error.code === "CONFLICT")
    return {
      ok: false,
      error: forumError("CONFLICT", "Пункт із таким номером уже є."),
    };
  return result;
}
