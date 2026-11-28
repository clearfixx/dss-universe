import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  COMING_SOON_MODULES,
  currentModule,
  currentSidebarHref,
  moduleSidebarItems,
  navigationCurrent,
  visibleModules,
} from "./shell-navigation";

type NavigationProps = {
  pathname: string;
  hasSession: boolean;
  canAccessAdminDeck: boolean;
  canModerate?: boolean;
  onNavigate?: () => void;
  /** Icon-only rail (desktop collapsed mode). Labels move to aria-label and title. */
  compact?: boolean;
};

const linkClass =
  "flex min-h-9 items-center gap-2 rounded-md px-3 text-sm text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring";
const compactLinkClass =
  "mx-auto flex size-10 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring";

/**
 * Fixed zone (owner decision 2026-11-28, variant B): the global modules are
 * always listed here, independent of the current page. The top navbar no
 * longer repeats them.
 */
export function ModuleNavigation({ pathname, hasSession, canAccessAdminDeck, onNavigate, compact = false }: NavigationProps) {
  return (
    <nav aria-label="Модулі DSS Universe" className="space-y-1">
      <p className={compact ? "sr-only" : "px-3 py-2 text-xs font-medium text-muted-foreground"}>Основна навігація</p>
      {visibleModules(hasSession, canAccessAdminDeck).map(({ href, label, icon: Icon }) => {
        const current = navigationCurrent(pathname, href);
        return (
          <Link key={href} href={href} onClick={onNavigate} aria-current={current}
            aria-label={compact ? label : undefined}
            title={compact ? label : undefined}
            className={cn(compact ? compactLinkClass : linkClass, current && "bg-secondary text-foreground")}>
            <Icon className="size-4 shrink-0" aria-hidden="true" />
            {compact ? null : label}
          </Link>
        );
      })}
      {compact ? null : COMING_SOON_MODULES.map((label) => (
        <span key={label} aria-disabled="true"
          className="flex min-h-9 items-center gap-2 px-3 text-sm text-muted-foreground/70">
          {label} <span className="text-xs">(скоро)</span>
        </span>
      ))}
    </nav>
  );
}

/**
 * Contextual zone: sections of the module that owns the current page.
 * Hidden when the module has no sub-sections (only its overview entry) and
 * in the icon-only rail, where it is reached by expanding the sidebar.
 */
export function SidebarNavigation({ pathname, hasSession, canAccessAdminDeck, canModerate = false, onNavigate, compact = false }: NavigationProps) {
  if (compact) return null;
  const active = currentModule(pathname);
  if (!active || !visibleModules(hasSession, canAccessAdminDeck).some((item) => item.href === active.href)) return null;
  const sections = moduleSidebarItems(pathname, hasSession, canAccessAdminDeck, canModerate);
  if (sections.length <= 1) return null;
  const currentHref = currentSidebarHref(pathname, hasSession, canAccessAdminDeck, canModerate);
  return (
    <nav aria-label={`Розділи: ${active.label}`} className="space-y-1">
      <p className="px-3 py-2 text-xs font-medium text-muted-foreground">{active.label}</p>
      {sections.map(({ href, label, icon: Icon }) => (
        <Link key={href} href={href} onClick={onNavigate}
          aria-current={currentHref === href ? navigationCurrent(pathname, href) : undefined}
          className={cn(linkClass, currentHref === href && "bg-secondary text-foreground")}>
          <Icon className="size-4 shrink-0" aria-hidden="true" />
          {label}
        </Link>
      ))}
    </nav>
  );
}

/** Mobile drawer: one scrollable list with the same model as the desktop sidebar. */
export function ShellNavigationPanel(props: NavigationProps) {
  return (
    <div className="space-y-5">
      <ModuleNavigation {...props} />
      <SidebarNavigation {...props} />
    </div>
  );
}
