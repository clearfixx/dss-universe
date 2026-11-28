/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Profile Frontend
 * 📄 File: apps/web/src/app/profile/[username]/loading.tsx
 *
 * 🎯 Purpose:
 * Provides a stable profile loading state during streamed navigation.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { DesignScope } from "@/components/ui/design-scope";
import { LoadingState, Skeleton } from "@/components/ui/feedback";

export default function ProfileLoading() {
  return (
    <DesignScope className="mx-auto max-w-[1560px] p-4">
      <LoadingState aria-label="Завантажуємо профіль астронавта">
        <Skeleton className="h-52 rounded-card" />
        <div className="grid gap-4 xl:grid-cols-3">
          <Skeleton className="h-48 rounded-card" />
          <Skeleton className="h-64 rounded-card" />
          <Skeleton className="h-48 rounded-card" />
        </div>
      </LoadingState>
    </DesignScope>
  );
}

/**
 * The airlock is opening. Please keep your helmet on.
 */
