"use server";

/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Moderation
 * 📄 File: apps/web/src/features/moderation/sanctions-actions.ts
 *
 * 🎯 Purpose:
 * Revokes one sanction from the staff journal (P1 B09). The API checks
 * moderation.sanctions.revoke, requires a reason and writes the audit.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import {
  forumResult,
  ForumSignInRequired,
} from "@/features/forum/forum-errors";
import { RevokeStaffSanctionDocument } from "@/gql/graphql";
import { getClient } from "@/lib/apollo/rsc-client";

export async function revokeSanction(sanctionId: string, reason: string) {
  return forumResult(async () => {
    const token = (await cookies()).get("dss_access_token")?.value;
    if (!token) throw new ForumSignInRequired();
    const result = await getClient().mutate({
      mutation: RevokeStaffSanctionDocument,
      variables: { input: { sanctionId, reason } },
      context: { headers: { authorization: `Bearer ${token}` } },
    });
    revalidatePath("/community/moderation/sanctions");
    return result.data?.revokeModerationSanction ?? null;
  });
}
