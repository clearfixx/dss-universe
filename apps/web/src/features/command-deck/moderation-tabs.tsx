/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Command Deck
 * 📄 File: apps/web/src/features/command-deck/moderation-tabs.tsx
 *
 * 🎯 Purpose:
 * Switches between the Command Deck moderation pages.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import Link from "next/link";

const TABS = [
  { id: "appeals", label: "Апеляції" },
  { id: "bans", label: "Чинні бани" },
  { id: "rules", label: "Правила спільноти" },
] as const;

export function ModerationTabs({
  active,
}: {
  active: (typeof TABS)[number]["id"];
}) {
  return (
    <nav
      aria-label="Розділи модерації"
      className="mb-5 flex flex-wrap gap-1 border-b border-white/[0.07]"
    >
      {TABS.map((tab) => (
        <Link
          key={tab.id}
          href={`/command-deck/moderation/${tab.id}`}
          aria-current={tab.id === active ? "page" : undefined}
          className={`-mb-px border-b-2 px-3 py-2 text-sm ${
            tab.id === active
              ? "border-violet-400 text-white"
              : "border-transparent text-slate-400 hover:text-white"
          }`}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
