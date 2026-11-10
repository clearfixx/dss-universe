import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthGateway } from "@/features/auth";
import { safeReturnTo } from "@/features/auth/session-contract";
import { loadSessionViewer } from "@/features/auth/session-data";

export const metadata: Metadata = {
  title: "Create account · DSS Universe",
  description: "Create your developer identity in DSS Universe.",
  robots: { index: false, follow: false },
};

type RegisterPageProps = {
  searchParams: Promise<{ returnTo?: string }>;
};

export default async function RegisterPage({
  searchParams,
}: RegisterPageProps) {
  const { returnTo } = await searchParams;
  const destination = safeReturnTo(returnTo);
  if (await loadSessionViewer()) redirect(destination);
  return <AuthGateway mode="register" returnTo={destination} />;
}
