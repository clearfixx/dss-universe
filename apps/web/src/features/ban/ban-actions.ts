"use server";

/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Ban
 * 📄 File: apps/web/src/features/ban/ban-actions.ts
 *
 * 🎯 Purpose:
 * The banned person's actions: send the appeal, remove a screenshot, leave.
 *
 * ⚠️ Important:
 * The ticket stays in an httpOnly cookie and never reaches client code.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  RemoveBanAppealFileDocument,
  SubmitBanAppealDocument,
} from "@/gql/graphql";
import { getClient } from "@/lib/apollo/rsc-client";

import {
  APPEAL_TEXT_MAX,
  APPEAL_TEXT_MIN,
  BAN_COOKIE,
  BAN_PATH,
} from "./ban-contract";

export type BanActionResult = { ok: true } | { ok: false; message: string };

const FAILED: BanActionResult = {
  ok: false,
  message: "Не вдалося виконати дію. Оновіть сторінку й спробуйте ще раз.",
};

async function ticket(): Promise<string | null> {
  return (await cookies()).get(BAN_COOKIE)?.value ?? null;
}

export async function submitAppeal(text: string): Promise<BanActionResult> {
  const value = text.trim();
  if (value.length < APPEAL_TEXT_MIN || value.length > APPEAL_TEXT_MAX)
    return {
      ok: false,
      message: `Напишіть від ${APPEAL_TEXT_MIN} до ${APPEAL_TEXT_MAX} символів.`,
    };
  const current = await ticket();
  if (!current) return FAILED;
  try {
    await getClient().mutate({
      mutation: SubmitBanAppealDocument,
      variables: { ticket: current, text: value },
    });
  } catch {
    return FAILED;
  }
  revalidatePath(BAN_PATH);
  return { ok: true };
}

export async function removeAppealFile(
  fileId: string,
): Promise<BanActionResult> {
  const current = await ticket();
  if (!current) return FAILED;
  try {
    await getClient().mutate({
      mutation: RemoveBanAppealFileDocument,
      variables: { ticket: current, fileId },
    });
  } catch {
    return FAILED;
  }
  revalidatePath(BAN_PATH);
  return { ok: true };
}

export async function leaveBanScreen(): Promise<never> {
  (await cookies()).delete(BAN_COOKIE);
  redirect("/login?loggedOut=1");
}
