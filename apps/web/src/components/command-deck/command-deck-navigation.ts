/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Command Deck
 * 📄 File: apps/web/src/components/command-deck/command-deck-navigation.ts
 *
 * 🎯 Purpose:
 * Sidebar of the Command Deck admin shell (owner mockups): groups and
 * entries in the mockup order.
 *
 * ⚠️ Important:
 * Entries without a page yet are rendered as "скоро" (href="#", disabled),
 * the same rule as the public navbar. Only real admin pages get an href.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import {
  Activity,
  BarChart3,
  Bot,
  BookOpen,
  Brain,
  CreditCard,
  Download,
  FileStack,
  FlaskConical,
  Gauge,
  Globe,
  GraduationCap,
  Languages,
  LifeBuoy,
  Link2,
  Mail,
  MessagesSquare,
  Rocket,
  Search,
  Server,
  Settings,
  Shield,
  ShieldAlert,
  SlidersHorizontal,
  Users,
  Workflow,
  Wrench,
  Image as ImageIcon,
  type LucideIcon,
} from "lucide-react";

export type CommandDeckEntry = Readonly<{
  label: string;
  icon: LucideIcon;
  href?: string;
  /** Extra path prefixes that highlight this entry (owner mockup). */
  matches?: readonly string[];
}>;

export type CommandDeckGroup = Readonly<{
  label: string;
  entries: readonly CommandDeckEntry[];
}>;

export const COMMAND_DECK_GROUPS: readonly CommandDeckGroup[] = [
  {
    label: "Overview",
    entries: [
      { label: "Station Overview", icon: Gauge, href: "/command-deck" },
      { label: "Analytics", icon: BarChart3 },
      { label: "Activity", icon: Activity },
    ],
  },
  {
    label: "DSS Modules",
    entries: [
      { label: "Mission Log", icon: Rocket },
      {
        label: "Community Hub",
        icon: MessagesSquare,
        href: "/command-deck/community-hub",
        // «Правила XP» mockup: Gamification lives under the Community Hub entry.
        matches: ["/command-deck/gamification"],
      },
      { label: "Research Lab", icon: FlaskConical },
      { label: "Academy", icon: GraduationCap },
      { label: "Downloads", icon: Download },
      { label: "Media Platform", icon: ImageIcon },
      { label: "CMS Builder", icon: FileStack },
    ],
  },
  {
    label: "Community",
    entries: [
      { label: "Users", icon: Users },
      {
        label: "Moderation",
        icon: ShieldAlert,
        href: "/command-deck/moderation/rules",
        matches: ["/command-deck/moderation"],
      },
      { label: "Support Center", icon: LifeBuoy },
    ],
  },
  {
    label: "Intelligence",
    entries: [
      { label: "AI Core", icon: Brain },
      { label: "Automation", icon: Workflow },
      { label: "Knowledge Base", icon: BookOpen },
      { label: "Models & Settings", icon: Bot },
      { label: "Usage & Billing", icon: CreditCard },
    ],
  },
  {
    label: "Platform",
    entries: [
      { label: "General", icon: SlidersHorizontal },
      { label: "SEO", icon: Search },
      { label: "Domain & URLs", icon: Globe },
      { label: "Email", icon: Mail },
      { label: "Security", icon: Shield },
      { label: "Integrations", icon: Link2 },
      { label: "Localization", icon: Languages },
      { label: "System", icon: Server },
      { label: "Maintenance", icon: Wrench },
      { label: "Settings", icon: Settings },
    ],
  },
];

/** The deepest entry whose href prefixes the path. */
export function activeCommandDeckHref(pathname: string): string | null {
  for (const { entries } of COMMAND_DECK_GROUPS) {
    for (const { href, matches } of entries) {
      if (
        href &&
        matches?.some(
          (prefix) => pathname === prefix || pathname.startsWith(prefix + "/"),
        )
      ) {
        return href;
      }
    }
  }
  const hrefs = COMMAND_DECK_GROUPS.flatMap(({ entries }) =>
    entries.map(({ href }) => href).filter((href): href is string => !!href),
  ).sort((a, b) => b.length - a.length);
  return (
    hrefs.find(
      (href) =>
        pathname === href ||
        (href !== "/command-deck" && pathname.startsWith(href + "/")),
    ) ?? null
  );
}
