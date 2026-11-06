import { describe, expect, it } from "vitest";

import { isDrawerOpenForPath } from "./shell-drawer-state";

describe("route-scoped mobile drawer visibility", () => {
  it("preserves an explicitly opened drawer on the current path", () => {
    expect(isDrawerOpenForPath({ pathname: "/news", open: true }, "/news")).toBe(true);
    expect(isDrawerOpenForPath({ pathname: "/news", open: false }, "/news")).toBe(false);
  });

  it("does not project an open drawer into a different destination", () => {
    const opened = { pathname: "/news", open: true };
    expect(isDrawerOpenForPath(opened, "/members")).toBe(false);
    expect(isDrawerOpenForPath(opened, "/news/detail")).toBe(false);
  });

  it("does not re-open when the new route's closed state is committed", () => {
    const afterNavigation = { pathname: "/members", open: false };
    expect(isDrawerOpenForPath(afterNavigation, "/news")).toBe(false);
    expect(isDrawerOpenForPath(afterNavigation, "/members")).toBe(false);
  });
});
