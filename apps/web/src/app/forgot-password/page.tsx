import type { Metadata } from "next";

import { AuthGateway } from "@/features/auth";

export const metadata: Metadata = {
  title: "Recover access · DSS Universe",
  description: "Request a secure password reset link for your DSS account.",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return <AuthGateway mode="recovery" />;
}
