"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import {
  ApproveNewsDocument,
  CancelNewsScheduleDocument,
  CreateNewsDraftDocument,
  PublishNewsDocument,
  RequestNewsChangesDocument,
  SaveNewsDraftDocument,
  ScheduleNewsDocument,
  SubmitNewsForReviewDocument,
  SetNewsPinDocument,
  RemoveNewsPinDocument,
  type NewsPinScope,
  type CreateNewsDraftInput,
  type SaveNewsDraftInput,
} from "@/gql/graphql";
import { getClient } from "@/lib/apollo/rsc-client";

async function context() {
  const token = (await cookies()).get("dss_access_token")?.value;
  if (!token) throw new Error("Увійдіть, щоб працювати з новинами.");
  return { headers: { authorization: `Bearer ${token}` } };
}

export async function manageNewsPin(
  action: "set" | "remove",
  articleId: string,
  options?: { scope: NewsPinScope; categoryId?: string; expiresAt?: string },
) {
  const auth = await context();
  const client = getClient();
  if (action === "set") {
    if (!options) throw new Error("Оберіть область закріплення.");
    await client.mutate({
      mutation: SetNewsPinDocument,
      variables: {
        input: {
          articleId,
          scope: options.scope,
          categoryId: options.categoryId || undefined,
          expiresAt: options.expiresAt || undefined,
        },
      },
      context: auth,
    });
  } else {
    await client.mutate({
      mutation: RemoveNewsPinDocument,
      variables: { articleId },
      context: auth,
    });
  }
  revalidatePath("/news");
  revalidatePath(`/newsroom/${articleId}`);
}

export async function createDraft(input: CreateNewsDraftInput) {
  const result = await getClient().mutate({
    mutation: CreateNewsDraftDocument,
    variables: { input },
    context: await context(),
  });
  revalidatePath("/newsroom");
  return result.data?.createNewsDraft ?? null;
}

export async function saveDraft(input: SaveNewsDraftInput) {
  const result = await getClient().mutate({
    mutation: SaveNewsDraftDocument,
    variables: { input },
    context: await context(),
  });
  revalidatePath("/newsroom");
  return result.data?.saveNewsDraft ?? null;
}

export async function runNewsWorkflow(
  action: "submit" | "changes" | "approve" | "publish" | "schedule" | "cancel",
  articleId: string,
  options?: { reason?: string; scheduledFor?: string },
) {
  const auth = await context();
  const client = getClient();
  let article;
  if (action === "submit") {
    article = (
      await client.mutate({
        mutation: SubmitNewsForReviewDocument,
        variables: { articleId },
        context: auth,
      })
    ).data?.submitNewsForReview.article;
  } else if (action === "changes") {
    article = (
      await client.mutate({
        mutation: RequestNewsChangesDocument,
        variables: { input: { articleId, reason: options?.reason } },
        context: auth,
      })
    ).data?.requestNewsChanges.article;
  } else if (action === "approve") {
    article = (
      await client.mutate({
        mutation: ApproveNewsDocument,
        variables: { input: { articleId, reason: options?.reason } },
        context: auth,
      })
    ).data?.approveNews.article;
  } else if (action === "publish") {
    article = (
      await client.mutate({
        mutation: PublishNewsDocument,
        variables: { input: { articleId } },
        context: auth,
      })
    ).data?.publishNews.article;
  } else if (action === "schedule") {
    if (!options?.scheduledFor) throw new Error("Оберіть час публікації.");
    article = (
      await client.mutate({
        mutation: ScheduleNewsDocument,
        variables: { input: { articleId, scheduledFor: options.scheduledFor } },
        context: auth,
      })
    ).data?.scheduleNews.article;
  } else {
    article = (
      await client.mutate({
        mutation: CancelNewsScheduleDocument,
        variables: { input: { articleId, reason: options?.reason } },
        context: auth,
      })
    ).data?.cancelNewsSchedule.article;
  }
  revalidatePath("/newsroom");
  revalidatePath(`/newsroom/${articleId}`);
  return article ?? null;
}
