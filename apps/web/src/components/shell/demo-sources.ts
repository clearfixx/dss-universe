/** Illustrative excerpts only: these are not published articles or real citations. */
export const demoSources = [
  [
    {
      title: "Anatomy of a token-based session",
      excerpt:
        "An access token proves a short-lived authorization claim. A refresh session controls how that authorization can be renewed and revoked.",
    },
    {
      title: "Choosing a session lifetime",
      excerpt:
        "Short access-token lifetimes reduce the window of exposure. Refresh-session expiry and rotation define the longer-lived account experience.",
    },
    {
      title: "What happens when a token expires?",
      excerpt:
        "Keep a single refresh request in flight, retry the original request once after success, and return to sign-in when the refresh session is no longer valid.",
    },
    {
      title: "Build your first authenticated endpoint",
      excerpt:
        "Practice validating a signed token, rejecting an expired token and checking permission for the requested resource.",
    },
  ],
  [
    {
      title: "A feature-first React project",
      excerpt:
        "Keep a feature’s components, local state and data helpers together. Move reusable primitives into shared UI only when their boundaries are clear.",
    },
    {
      title: "Server data and interface state",
      excerpt:
        "Fetched records and temporary UI choices have different lifecycles. Separating them makes loading, cache updates and navigation easier to reason about.",
    },
    {
      title: "When should a component become shared?",
      excerpt:
        "Start with the concrete use case. Compare the second use case before extracting an abstraction, rather than anticipating every possible variant.",
    },
    {
      title: "Refactor a growing React screen",
      excerpt:
        "Identify feature boundaries, move state closer to its consumers and check that keyboard interaction still works after the refactor.",
    },
  ],
  [
    {
      title: "Narrowing a union type",
      excerpt:
        "Use a discriminating field to tell variants apart. TypeScript can then infer which properties are available inside each branch.",
    },
    {
      title: "Where static types stop",
      excerpt:
        "A type annotation does not validate an HTTP response. Parse external data at the boundary before trusting it inside the application.",
    },
    {
      title: "Learning generics through small examples",
      excerpt:
        "Start with a function that preserves the type of its input. Add constraints only when the implementation needs a specific property.",
    },
    {
      title: "Your first strict TypeScript project",
      excerpt:
        "Build a small searchable list. Model its items, represent loading states with a union and handle invalid external data explicitly.",
    },
  ],
];
