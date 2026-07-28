/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Profile Frontend
 * 📄 File: apps/web/src/stores/profile-ui.store.ts
 *
 * 🎯 Purpose:
 * Owns transient profile navigation state that does not belong in GraphQL.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { create } from "zustand";

export type ProfileTab = "overview" | "wall" | "activity" | "about";

type ProfileUiState = {
  activeTab: ProfileTab;
  setActiveTab: (tab: ProfileTab) => void;
};

export const useProfileUiStore = create<ProfileUiState>((set) => ({
  activeTab: "overview",
  setActiveTab: (activeTab) => set({ activeTab }),
}));

/**
 * Tabs are local state. Astronauts are server state. Keep the orbits apart.
 */
