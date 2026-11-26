import Link from "next/link";
import { cn } from "@/lib/utils";
import { currentModule, currentSidebarHref, moduleSidebarItems, navigationCurrent, visibleModules } from "./shell-navigation";

type NavigationProps = {
  pathname: string;
  hasSession: boolean;
  canAccessAdminDeck: boolean;
  onNavigate?: () => void;
};

export function SidebarNavigation({ pathname, hasSession, canAccessAdminDeck, onNavigate }: NavigationProps) {
  const active = currentModule(pathname);
  if (!active || !visibleModules(hasSession, canAccessAdminDeck).some((item) => item.href === active.href)) return null;
  const sections = moduleSidebarItems(pathname, hasSession, canAccessAdminDeck);
  const currentHref = currentSidebarHref(pathname, hasSession, canAccessAdminDeck);
  return (
    <nav aria-label={`Розділи: ${active.label}`} className="space-y-1">
      <p className="px-3 py-2 text-xs font-medium text-slate-400">{active.label}</p>
      {sections.map(({ href, label, icon: Icon }) => (
        <Link key={href} href={href} onClick={onNavigate}
          aria-current={currentHref === href ? navigationCurrent(pathname, href) : undefined}
          className={cn("flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm text-slate-300 hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-violet-400", currentHref === href && "bg-violet-500/15 text-violet-100")}>
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
          className="flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm text-slate-300 hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-violet-400">
          <Icon className="size-4 shrink-0" aria-hidden="true" />
          {label}
        </Link>
      ))}
    </nav>
  );
}
