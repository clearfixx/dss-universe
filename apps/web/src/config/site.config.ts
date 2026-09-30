export const siteConfig = {
  name: "DSS Universe",
  fullName: "Developer Space Station Universe",
  description:
    "A connected developer platform for building, sharing, and inspiring what comes next.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  apiUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api",
  graphqlUrl:
    process.env.NEXT_PUBLIC_GRAPHQL_URL ?? "http://localhost:4000/api/graphql",
} as const;
