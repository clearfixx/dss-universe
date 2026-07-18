/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Application Shell
 * 📄 File: apps/web/src/stores/shell.store.ts
 *
 * 🎯 Purpose:
 * Owns transient navigation state that does not belong in Apollo or the URL.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { create } from "zustand";

type ShellState = {
  mobileNavigationOpen: boolean;
  setMobileNavigationOpen: (open: boolean) => void;
  toggleMobileNavigation: () => void;
};

export const useShellStore = create<ShellState>((set) => ({
  mobileNavigationOpen: false,
  setMobileNavigationOpen: (mobileNavigationOpen) => ({
    mobileNavigationOpen,
  }),
  toggleMobileNavigation: () =>
    set((state) => ({
      mobileNavigationOpen: !state.mobileNavigationOpen,
    })),
}));
