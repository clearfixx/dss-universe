"use client";

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ModuleNavigation, SidebarNavigation } from "./shell-sidebar";

export function ShellMobileNavigation({ open, setOpen, pathname, hasSession, canAccessAdminDeck }: { open: boolean; setOpen: (open: boolean) => void; pathname: string; hasSession: boolean; canAccessAdminDeck: boolean }) {
  return (
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="left"
          className="border-[color:var(--shell-divider)] bg-[color:var(--shell-surface)] p-0"
        >
          <SheetHeader className="border-b border-[color:var(--shell-divider)] px-5 py-4">
            <SheetTitle className="text-left text-sm text-slate-100">
              Навігація DSS Universe
            </SheetTitle>
            <SheetDescription className="text-left text-xs">
              Оберіть доступний розділ платформи.
            </SheetDescription>
          </SheetHeader>
          <div className="max-h-[calc(100dvh-5rem)] space-y-4 overflow-y-auto px-3 py-4">
            <ModuleNavigation pathname={pathname} hasSession={hasSession} canAccessAdminDeck={canAccessAdminDeck} onNavigate={() => setOpen(false)} />
            <SidebarNavigation
              pathname={pathname}
              hasSession={hasSession}
              canAccessAdminDeck={canAccessAdminDeck}
              onNavigate={() => setOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>
  );
}
