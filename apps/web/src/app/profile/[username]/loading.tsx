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

import { LoadingState } from "@/components/states/async-states";

export default function ProfileLoading() {
  return <LoadingState title="Завантажуємо профіль астронавта" />;
}

/**
 * The airlock is opening. Please keep your helmet on.
 */
