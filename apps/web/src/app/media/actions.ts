/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: DSS Media Platform Web
 * 📄 File: apps/web/src/app/media/actions.ts
 *
 * 🎯 Purpose:
 * Provides authenticated Media Library operator actions.
 *
 * ⚠️ Important:
 * Authentication is read from the server-only session cookie and never
 * accepted from browser form data.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { RetryFailedMediaDocument } from "@/gql/graphql";
import { getClient } from "@/lib/apollo/rsc-client";

export async function retryFailedMedia(formData: FormData): Promise<void> {
  const mediaId = formData.get("mediaId");
  if (typeof mediaId !== "string" || mediaId.length === 0) {
    throw new Error("A valid Media identifier is required.");
  }

  const token = (await cookies()).get("dss_access_token")?.value;
  if (!token) {
    throw new Error("Authentication is required.");
  }

  await getClient().mutate({
    mutation: RetryFailedMediaDocument,
    variables: { mediaId },
    context: {
      headers: { authorization: `Bearer ${token}` },
    },
  });
  revalidatePath("/media");
}
