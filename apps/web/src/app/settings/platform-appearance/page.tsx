import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { DssApplicationShell } from "@/components/shell/session-application-shell";
import { loadAdminShellVariant } from "@/features/appearance/appearance-data";
import { PlatformAppearanceForm } from "@/features/appearance/platform-appearance-form";

export const metadata: Metadata = {
  title: "Оформлення платформи | DSS Universe",
  robots: { index: false, follow: false },
};

export default async function PlatformAppearancePage() {
  const variant = await loadAdminShellVariant();
  if (!variant) notFound();

  return (
    <DssApplicationShell pageTitle={{ pathname: "/settings/platform-appearance", title: "Оформлення платформи" }}>
      <PlatformAppearanceForm activeVariant={variant} />
    </DssApplicationShell>
  );
}
