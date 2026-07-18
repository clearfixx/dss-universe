export const siteConfig = {
  name: "DSS Universe",
  fullName: "Developer Space Station Universe",
  description:
    "A space-themed developer platform for learning, building, sharing, and growing.",
  url: "http://localhost:3000",
  apiUrl: "http://localhost:4000/api",
  graphqlUrl:
    process.env.NEXT_PUBLIC_GRAPHQL_URL ?? "http://localhost:4000/api/graphql",
} as const;
