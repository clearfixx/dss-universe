"use server";

/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Static Pages
 * 📄 File: apps/web/src/features/static-pages/static-page-actions.ts
 *
 * 🎯 Purpose:
 * Administrator actions: create, save, publish and unpublish a page.
 *
 * ⚠️ Important:
 * The API checks cms.pages.manage, the revision and the document.
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
  CreateStaticPageDocument,
  PublishStaticPageDocument,
  SaveStaticPageDocument,
  UnpublishStaticPageDocument,
} from "@/gql/graphql";
import { getClient } from "@/lib/apollo/rsc-client";

export type StaticPageDraft = Readonly<{
  slug: string;
  title: string;
  description: string;
  documentJson: string;
}>;

/** Where the editor continues after a successful write. */
export type SavedStaticPage = Readonly<{
  id: string;
  revision: number;
  published: boolean;
  hasUnpublishedChanges: boolean;
}>;

type Written = {
  id: string;
  revision: number;
  publishedAt?: unknown;
  hasUnpublishedChanges: boolean;
};

const LIST_PATH = "/command-deck/pages";

async function signedIn() {
  const token = (await cookies()).get("dss_access_token")?.value;
  if (!token) throw new ForumSignInRequired();
  return { headers: { authorization: `Bearer ${token}` } };
}

async function write(
  run: () => Promise<Written | null | undefined>,
): Promise<ForumResult<SavedStaticPage>> {
  const result = await forumResult(async (): Promise<SavedStaticPage> => {
    const page = await run();
    if (!page) throw new Error("The page was not returned.");
    return {
      id: page.id,
      revision: page.revision,
      published: Boolean(page.publishedAt),
      hasUnpublishedChanges: page.hasUnpublishedChanges,
    };
  });
  if (result.ok) revalidatePath(LIST_PATH);
  else if (result.error.code === "CONFLICT")
    return {
      ok: false,
      error: forumError(
        "CONFLICT",
        "Ця адреса вже зайнята або сторінку змінили в іншому вікні. Оновіть сторінку й спробуйте ще раз.",
      ),
    };
  return result;
}

export async function createStaticPage(input: StaticPageDraft) {
  return write(async () => {
    const result = await getClient().mutate({
      mutation: CreateStaticPageDocument,
      variables: { input },
      context: await signedIn(),
    });
    return result.data?.createStaticPage;
  });
}

export async function saveStaticPage(
  id: string,
  expectedRevision: number,
  input: StaticPageDraft,
) {
  return write(async () => {
    const result = await getClient().mutate({
      mutation: SaveStaticPageDocument,
      variables: { id, expectedRevision, input },
      context: await signedIn(),
    });
    return result.data?.saveStaticPage;
  });
}

export async function publishStaticPage(id: string, expectedRevision: number) {
  return write(async () => {
    const result = await getClient().mutate({
      mutation: PublishStaticPageDocument,
      variables: { id, expectedRevision },
      context: await signedIn(),
    });
    return result.data?.publishStaticPage;
  });
}

export async function unpublishStaticPage(id: string) {
  return write(async () => {
    const result = await getClient().mutate({
      mutation: UnpublishStaticPageDocument,
      variables: { id },
      context: await signedIn(),
    });
    return result.data?.unpublishStaticPage;
  });
}
