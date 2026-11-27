/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Ban
 * 📄 File: apps/web/src/features/ban/ban-data.ts
 *
 * 🎯 Purpose:
 * Server read of the ban notice and appeal state with the ticket.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { BanScreenDocument, type BanScreenQuery } from "@/gql/graphql";
import { getClient } from "@/lib/apollo/rsc-client";

export type BanScreenData = BanScreenQuery;

/** Null when the ticket expired, the ban was lifted or the API is down. */
export async function loadBanScreen(
  ticket: string,
): Promise<BanScreenData | null> {
  try {
    const result = await getClient().query({
      query: BanScreenDocument,
      variables: { ticket },
      fetchPolicy: "no-cache",
    });
    return result.data ?? null;
  } catch {
    return null;
  }
}
