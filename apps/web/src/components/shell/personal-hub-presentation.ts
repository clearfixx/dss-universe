import type { SessionViewer } from "@/features/auth/session-contract";

/** Prefer a non-blank display name, never a whitespace-only label. */
export function viewerDisplayName(viewer: SessionViewer): string {
  return viewer.displayName?.trim() || viewer.username;
}
