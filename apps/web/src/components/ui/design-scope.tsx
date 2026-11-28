"use client";

import { createContext, useContext, type ComponentPropsWithoutRef, type PropsWithChildren } from "react";

const DesignScopeContext = createContext<"v1" | undefined>(undefined);

/** Explicit opt-in boundary; React context follows children through portals. */
type DesignScopeProps = PropsWithChildren<ComponentPropsWithoutRef<"div"> & { as?: "div" | "header" | "aside" }>;

export function DesignScope({ children, as: Surface = "div", ...props }: DesignScopeProps) {
  return (
    <DesignScopeContext.Provider value="v1">
      <Surface {...props} data-dss-design="v1">{children}</Surface>
    </DesignScopeContext.Provider>
  );
}

export function useDesignScope() {
  return useContext(DesignScopeContext);
}
