import type { Metadata } from "next";

import { DssApplicationShell } from "@/components/shell/session-application-shell";
import { ErrorState } from "@/components/states/async-states";
import { loadAdminShellVariant } from "@/features/appearance/appearance-data";
import { PlatformAppearanceForm } from "@/features/appearance/platform-appearance-form";

export const metadata: Metadata = {
  title: "Оформлення платформи | DSS Universe",
  robots: { index: false, follow: false },
};

export default async function PlatformAppearancePage() {
  const variant = await loadAdminShellVariant();
  return (
    <DssApplicationShell>
      {variant ? (
        <PlatformAppearanceForm activeVariant={variant} />
      ) : (
        <ErrorState
          title="Налаштування платформи недоступні"
          description="Потрібні повноваження керування системними налаштуваннями."
        />
      )}
    </DssApplicationShell>
  );
}
