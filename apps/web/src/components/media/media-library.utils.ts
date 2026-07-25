/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: DSS Media Platform Web
 * 📄 File: apps/web/src/components/media/media-library.utils.ts
 *
 * 🎯 Purpose:
 * Provides deterministic Media Library filter and presentation helpers.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import type {
  MediaKind,
  MediaLibraryInput,
  MediaStatus,
  MediaVisibility,
} from "@/gql/graphql";

export type MediaLibrarySearchParams = {
  after?: string;
  kind?: string;
  orphaned?: string;
  search?: string;
  status?: string;
  visibility?: string;
};

export const MEDIA_STATUSES: MediaStatus[] = [
  "READY",
  "PROCESSING",
  "FAILED",
  "QUARANTINED",
  "REJECTED",
  "DELETING",
  "DELETED",
];
export const MEDIA_KINDS: MediaKind[] = [
  "IMAGE",
  "DOCUMENT",
  "VIDEO",
  "AUDIO",
  "ARCHIVE",
  "OTHER",
];
export const MEDIA_VISIBILITIES: MediaVisibility[] = [
  "PUBLIC",
  "AUTHENTICATED",
  "PRIVATE",
  "RESTRICTED",
];

function included<T extends string>(
  values: readonly T[],
  value?: string,
): value is T {
  return value !== undefined && values.includes(value as T);
}

export function createMediaLibraryInput(
  params: MediaLibrarySearchParams,
): MediaLibraryInput {
  return {
    first: 24,
    after: params.after,
    search: params.search?.trim() || undefined,
    status: included(MEDIA_STATUSES, params.status) ? params.status : undefined,
    kind: included(MEDIA_KINDS, params.kind) ? params.kind : undefined,
    visibility: included(MEDIA_VISIBILITIES, params.visibility)
      ? params.visibility
      : undefined,
    orphaned: params.orphaned === "true" ? true : undefined,
  };
}

export function formatBytes(value: number): string {
  if (value < 1024) return `${value} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let size = value / 1024;
  let unit = units[0];
  for (let index = 1; size >= 1024 && index < units.length; index += 1) {
    size /= 1024;
    unit = units[index];
  }
  return `${size.toFixed(size >= 10 ? 1 : 2)} ${unit}`;
}

export function createNextPageHref(
  params: MediaLibrarySearchParams,
  cursor: string,
): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value && key !== "after") query.set(key, value);
  }
  query.set("after", cursor);
  return `/media?${query.toString()}`;
}
