/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Command Deck
 * 📄 File: apps/web/src/features/command-deck/gamification-data.ts
 *
 * 🎯 Purpose:
 * Server loader for Command Deck › Gamification › Правила XP: the global
 * Community Points rules and level thresholds (P1 C06).
 *
 * ⚠️ Important:
 * Server only. The API requires the points/levels settings permissions.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import "server-only";

import { cookies } from "next/headers";

import { CommandDeckXpRulesDocument } from "@/gql/graphql";
import { getClient } from "@/lib/apollo/rsc-client";

export async function loadXpRules() {
  const token = (await cookies()).get("dss_access_token")?.value;
  const result = await getClient().query({
    query: CommandDeckXpRulesDocument,
    context: token
      ? { headers: { authorization: `Bearer ${token}` } }
      : undefined,
    fetchPolicy: "no-cache",
  });
  if (!result.data) throw new Error("XP_RULES_UNAVAILABLE");
  return result.data;
}

export type XpRulesData = Awaited<ReturnType<typeof loadXpRules>>;
