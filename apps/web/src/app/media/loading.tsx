/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: DSS Media Platform Web
 * 📄 File: apps/web/src/app/media/loading.tsx
 *
 * 🎯 Purpose:
 * Provides the route-level loading state for the Media Library.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { LoadingState } from "@/components/states/async-states";

export default function MediaLoading() {
  return <LoadingState title="Scanning the Media Library" />;
}
