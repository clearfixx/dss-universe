/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Command Deck
 * 📄 File: apps/web/src/features/command-deck/community-hub-admin-model.ts
 *
 * 🎯 Purpose:
 * Pure (server- and client-safe) model of the Community Hub settings:
 * editable forum drafts and their mapping to the API input.
 *
 * ⚠️ Important:
 * No React or "use client" here, so server pages can call these helpers.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type {
  ForumAccessRole,
  ForumGateBlockType,
  ForumInput,
} from "@/gql/graphql";

/** Editable copy of a forum section (Forum or ForumSubforum from the API). */
export type ForumDraft = {
  id: string;
  categoryId: string;
  parentId: string | null;
  slug: string;
  title: string;
  description: string | null;
  position: number;
  active: boolean;
  allowsGatedContent: boolean;
  allowTopics: boolean;
  allowReplies: boolean;
  allowPolls: boolean;
  allowAttachments: boolean;
  listed: boolean;
  searchable: boolean;
  showCounts: boolean;
  pinnedLimit: number | null;
  attachmentMaxMb: number | null;
  attachmentFormats: string[];
  autoCloseDays: number | null;
  gateViewRole: ForumAccessRole;
  gateCreateRole: ForumAccessRole;
  gateBlockTypes: ForumGateBlockType[];
};

export function toForumDraft(forum: ForumDraft): ForumDraft {
  return {
    id: forum.id,
    categoryId: forum.categoryId,
    parentId: forum.parentId,
    slug: forum.slug,
    title: forum.title,
    description: forum.description,
    position: forum.position,
    active: forum.active,
    allowsGatedContent: forum.allowsGatedContent,
    allowTopics: forum.allowTopics,
    allowReplies: forum.allowReplies,
    allowPolls: forum.allowPolls,
    allowAttachments: forum.allowAttachments,
    listed: forum.listed,
    searchable: forum.searchable,
    showCounts: forum.showCounts,
    pinnedLimit: forum.pinnedLimit,
    attachmentMaxMb: forum.attachmentMaxMb,
    attachmentFormats: [...forum.attachmentFormats],
    autoCloseDays: forum.autoCloseDays,
    gateViewRole: forum.gateViewRole,
    gateCreateRole: forum.gateCreateRole,
    gateBlockTypes: [...forum.gateBlockTypes],
  };
}

export function toForumInput(draft: ForumDraft): ForumInput {
  const { id: _id, ...input } = draft;
  void _id;
  return input;
}
