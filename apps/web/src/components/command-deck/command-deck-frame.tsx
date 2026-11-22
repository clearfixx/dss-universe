/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Command Deck
 * 📄 File: apps/web/src/components/command-deck/command-deck-frame.tsx
 *
 * 🎯 Purpose:
 * Server wrapper of the Command Deck admin shell: loads the signed-in
 * viewer and the highest role label shown in the top bar.
 *
 * ⚠️ Important:
 * Pages guard access themselves (loadAdminCommandDeckAccess) before
 * rendering this frame.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { loadSessionViewer } from "@/features/auth/session-data";
import { lookupMembers } from "@/features/command-deck/command-deck-actions";

import { CommandDeckShell, type CommandDeckCrumb } from "./command-deck-shell";

const ROLE_LABELS: ReadonlyArray<[string, string]> = [
  ["owner", "Owner"],
  ["admin", "Administrator"],
  ["moderator", "Moderator"],
  ["contributor", "Contributor"],
];

export async function CommandDeckFrame({
  breadcrumbs,
  children,
}: {
  breadcrumbs: readonly CommandDeckCrumb[];
  children: ReactNode;
}) {
  const viewer = await loadSessionViewer();
  if (!viewer) notFound();
  const lookup = await lookupMembers(viewer.username);
  const roles = lookup.ok
    ? (lookup.data.find((member) => member.id === viewer.id)?.roles ?? [])
    : [];
  const roleLabel =
    ROLE_LABELS.find(([role]) => roles.includes(role))?.[1] ?? "Staff";
  return (
    <CommandDeckShell
      viewer={viewer}
      roleLabel={roleLabel}
      breadcrumbs={breadcrumbs}
    >
      {children}
    </CommandDeckShell>
  );
}
