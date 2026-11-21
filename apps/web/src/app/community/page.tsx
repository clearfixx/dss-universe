import ModulePage from "../[module]/page";

/**
 * The Community Hub home page waits for approved mockups; until then the
 * static `community` segment (needed by forum routes) keeps the module
 * placeholder instead of falling through to a 404.
 */
export default function CommunityPage() {
  return ModulePage({ params: Promise.resolve({ module: "community" }) });
}
