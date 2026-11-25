/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Forum
 * 📄 File: apps/web/src/app/community/(hub)/loading.tsx
 *
 * 🎯 Purpose:
 * Skeleton for the hub page while it streams (P1 D02). Kept out of the
 * section and topic routes on purpose: a streamed response keeps status 200,
 * and hidden or missing resources must answer with a real 404 (P1 §5).
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { ForumPageSkeleton } from "@/features/forum/forum-states";

export default function CommunityLoading() {
  return <ForumPageSkeleton />;
}
