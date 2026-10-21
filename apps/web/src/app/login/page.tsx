import type { Metadata } from "next";

import { AuthGateway } from "@/features/auth";
import { safeReturnTo } from "@/features/auth/session-contract";

export const metadata: Metadata = {
  title: "Sign in · DSS Universe",
  description: "Sign in to your DSS developer workspace.",
  robots: { index: false, follow: false },
};

type LoginPageProps = {
  searchParams: Promise<{
    loggedOut?: string;
    reason?: string;
    returnTo?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const notice =
    params.loggedOut === "1"
      ? "You have been signed out safely."
      : params.reason === "unavailable"
        ? "We could not verify your session. Sign in again, or retry when the authentication service is available."
        : params.reason === "credentials-changed"
          ? "Your credentials were updated. Sign in again to open a fresh session."
          : params.reason === "account-deactivated"
            ? "Your DSS account has been deactivated and its local session was closed."
            : undefined;
  return (
    <AuthGateway
      mode="login"
      notice={notice}
      returnTo={safeReturnTo(params.returnTo)}
    />
  );
}
