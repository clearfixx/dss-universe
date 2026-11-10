export type ShellDrawerState = {
  pathname: string;
  open: boolean;
};

/**
 * A drawer opened on one route must not remain open on a different route.
 * This is a render-time projection, not an effect or cross-page store.
 */
export function isDrawerOpenForPath(
  state: ShellDrawerState,
  pathname: string,
): boolean {
  return state.open && state.pathname === pathname;
}
