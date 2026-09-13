/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: DSS Editor Frontend
 * 📄 File: apps/web/src/features/editor/editor-actions.ts
 *
 * 🎯 Purpose:
 * Bridges editor file selection to the authenticated DSS Media upload flow.
 *
 * 🧠 Responsibilities:
 * • reads authentication only from the server-side session cookie;
 * • creates a policy-bound upload session through GraphQL;
 * • sends multipart bytes to the Media intake endpoint;
 * • returns lifecycle state without exposing access tokens to the browser.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

"use server";

import { cookies } from "next/headers";

import {
  CreateEditorContentGateDocument,
  InitiateEditorMediaUploadDocument,
  type ContentGateOperator,
  type ContentGateRequirementKind,
} from "@/gql/graphql";
import { getClient } from "@/lib/apollo/rsc-client";
import { siteConfig } from "@/config/site.config";

export type EditorUploadResult = {
  sessionId: string;
  filename: string;
  status: string;
};

export type EditorContentGateInput = {
  operator: ContentGateOperator;
  requirements: Array<{
    kind: ContentGateRequirementKind;
    threshold?: number;
    groupKey?: string;
  }>;
};

export async function createEditorContentGate(
  input: EditorContentGateInput,
): Promise<{ id: string }> {
  const token = (await cookies()).get("dss_access_token")?.value;
  if (!token) throw new Error("Authentication is required.");
  const result = await getClient().mutate({
    mutation: CreateEditorContentGateDocument,
    variables: { input },
    context: { headers: { authorization: `Bearer ${token}` } },
  });
  const gate = result.data?.createContentGate;
  if (!gate) throw new Error("Content Gate was not created.");
  return { id: gate.id };
}

export async function uploadEditorMedia(
  mode: "image" | "attachment",
  formData: FormData,
): Promise<EditorUploadResult> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Choose a non-empty file.");
  }

  const token = (await cookies()).get("dss_access_token")?.value;
  if (!token) throw new Error("Authentication is required.");
  const authorization = { authorization: `Bearer ${token}` };
  const result = await getClient().mutate({
    mutation: InitiateEditorMediaUploadDocument,
    variables: {
      input: {
        policyKey: mode === "image" ? "content-image" : "attachment",
        originalFilename: file.name,
        declaredMimeType: file.type || "application/octet-stream",
        declaredSize: file.size,
      },
    },
    context: { headers: authorization },
  });
  const session = result.data?.initiateMediaUpload;
  if (!session) throw new Error("Media upload session was not created.");

  const body = new FormData();
  body.set("file", file);
  const response = await fetch(
    `${siteConfig.apiUrl}/media/uploads/${session.id}/content`,
    { method: "PUT", headers: authorization, body, cache: "no-store" },
  );
  if (!response.ok) {
    throw new Error(`Media intake failed with status ${response.status}.`);
  }
  const completed = (await response.json()) as { status: string };
  return {
    sessionId: session.id,
    filename: session.originalFilename,
    status: completed.status,
  };
}

/** Bytes travel through Media quarantine; the editor receives only a boarding pass. */
