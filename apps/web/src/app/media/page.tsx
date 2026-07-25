/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: DSS Media Platform Web
 * 📄 File: apps/web/src/app/media/page.tsx
 *
 * 🎯 Purpose:
 * Composes the authenticated Mission Control Media Library route.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { MediaLibrary } from "@/components/media/media-library";
import { DssApplicationShell } from "@/components/shell/dss-application-shell";

type MediaPageProps = {
  searchParams: Promise<{
    after?: string;
    kind?: string;
    orphaned?: string;
    search?: string;
    status?: string;
    visibility?: string;
  }>;
};

export default async function MediaPage({ searchParams }: MediaPageProps) {
  return (
    <DssApplicationShell>
      <MediaLibrary searchParams={await searchParams} />
    </DssApplicationShell>
  );
}
