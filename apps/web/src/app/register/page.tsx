import type { Metadata } from "next";

import { AuthGateway } from "@/features/auth";
import { safeReturnTo } from "@/features/auth/session-contract";

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
  return <AuthGateway mode="register" returnTo={safeReturnTo(returnTo)} />;
}
