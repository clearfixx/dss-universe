"use client";

import { createContext, useContext, type PropsWithChildren } from "react";

const DesignScopeContext = createContext<"v1" | undefined>(undefined);

/** Explicit opt-in boundary; React context follows children through portals. */
export function DesignScope({ children }: PropsWithChildren) {
  return (
    <DesignScopeContext.Provider value="v1">
      <div data-dss-design="v1">{children}</div>
    </DesignScopeContext.Provider>
  );
}

export function useDesignScope() {
  return useContext(DesignScopeContext);
}
