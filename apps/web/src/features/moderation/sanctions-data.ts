/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Moderation
 * 📄 File: apps/web/src/features/moderation/sanctions-data.ts
 *
 * 🎯 Purpose:
 * Server loaders of the sanctions journal (P1 B09): the staff journal across
 * members and the signed-in member's own sanctions.
 *
 * ⚠️ Important:
 * Server only. "DENIED" when the API refuses (the staff page answers 404).
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import "server-only";

import { cookies } from "next/headers";

import { toForumError } from "@/features/forum/forum-errors";
import {
  StaffSanctionsDocument,
  ViewerSanctionsDocument,
  type ModerationSanctionKind,
} from "@/gql/graphql";
import { getClient } from "@/lib/apollo/rsc-client";

export const SANCTIONS_PAGE_SIZE = 20;

async function authContext() {
  const token = (await cookies()).get("dss_access_token")?.value;
  return token ? { headers: { authorization: `Bearer ${token}` } } : null;
}

export async function loadStaffSanctions(input: {
  page: number;
  subjectId: string | null;
  kind: ModerationSanctionKind | null;
  activeOnly: boolean;
}) {
  const context = await authContext();
  if (!context) return "DENIED" as const;
  try {
    const result = await getClient().query({
      query: StaffSanctionsDocument,
      variables: { ...input, limit: SANCTIONS_PAGE_SIZE },
      context,
      fetchPolicy: "no-cache",
    });
    if (!result.data) throw new Error("SANCTIONS_UNAVAILABLE");
    return result.data.moderationSanctions;
  } catch (error) {
    const code = toForumError(error).code;
    if (code === "ACCESS_DENIED" || code === "NOT_SIGNED_IN") {
      return "DENIED" as const;
    }
    throw error;
  }
}

export type StaffSanctionsPage = Exclude<
  Awaited<ReturnType<typeof loadStaffSanctions>>,
  "DENIED"
>;

export async function loadViewerSanctions(page: number) {
  const context = await authContext();
  if (!context) return null;
  const result = await getClient().query({
    query: ViewerSanctionsDocument,
    variables: { page, limit: SANCTIONS_PAGE_SIZE },
    context,
    fetchPolicy: "no-cache",
  });
  return result.data ?? null;
}
