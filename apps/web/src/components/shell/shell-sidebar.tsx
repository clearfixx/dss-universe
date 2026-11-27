import Link from "next/link";
import { cn } from "@/lib/utils";
import { currentModule, currentSidebarHref, moduleSidebarItems, navigationCurrent, visibleModules } from "./shell-navigation";

type NavigationProps = {
  pathname: string;
  hasSession: boolean;
  canAccessAdminDeck: boolean;
  canModerate?: boolean;
  onNavigate?: () => void;
};

export function SidebarNavigation({ pathname, hasSession, canAccessAdminDeck, canModerate = false, onNavigate }: NavigationProps) {
  const active = currentModule(pathname);
  if (!active || !visibleModules(hasSession, canAccessAdminDeck).some((item) => item.href === active.href)) return null;
  const sections = moduleSidebarItems(pathname, hasSession, canAccessAdminDeck, canModerate);
  const currentHref = currentSidebarHref(pathname, hasSession, canAccessAdminDeck, canModerate);
  return (
    <nav aria-label={`Розділи: ${active.label}`} className="space-y-1">
      <p className="px-3 py-2 text-xs font-medium text-muted-foreground">{active.label}</p>
      {sections.map(({ href, label, icon: Icon }) => (
        <Link key={href} href={href} onClick={onNavigate}
          aria-current={currentHref === href ? navigationCurrent(pathname, href) : undefined}
          className={cn("flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring", currentHref === href && "bg-secondary text-foreground")}>
          <Icon className="size-4 shrink-0" aria-hidden="true" />
          {label}
        </Link>
      ))}
    </nav>
  );
}

export function ModuleNavigation({ pathname, hasSession, canAccessAdminDeck, onNavigate }: NavigationProps) {
  return (
    <nav aria-label="Модулі DSS Universe" className="space-y-1">
      {visibleModules(hasSession, canAccessAdminDeck).map(({ href, label, icon: Icon }) => (
        <Link key={href} href={href} onClick={onNavigate} aria-current={navigationCurrent(pathname, href)}
          className="flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
          <Icon className="size-4 shrink-0" aria-hidden="true" />
          {label}
        </Link>
      ))}
    </nav>
  );
}
