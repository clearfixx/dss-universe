import type { Metadata } from "next";
import { AuthGateway } from "@/features/auth/auth-gateway";

export const metadata: Metadata = {
  title: "Reset password · DSS Universe",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function ResetPasswordPage() {
  return <AuthGateway mode="reset" />;
}
