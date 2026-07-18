/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Application Shell
 * 📄 File: apps/web/src/components/shell/dss-application-shell.tsx
 *
 * 🎯 Purpose:
 * Provides shared authenticated navigation and module composition.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

"use client";

import {
  Bell,
  BookOpen,
  Bot,
  Boxes,
  GraduationCap,
  LayoutDashboard,
  Menu,
  MessageSquare,
  Orbit,
  Search,
  Settings,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { PropsWithChildren } from "react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useShellStore } from "@/stores/shell.store";

const navigation = [
  { href: "/command-deck", label: "Command Deck", icon: LayoutDashboard },
  { href: "/members", label: "Astronauts", icon: Users },
  { href: "/research", label: "Research Lab", icon: BookOpen },
  { href: "/community", label: "Community Hub", icon: MessageSquare },
  { href: "/knowledge", label: "Knowledge Forge", icon: Orbit },
  { href: "/academy", label: "Academy", icon: GraduationCap },
  { href: "/media", label: "DSS Media Platform", icon: Boxes },
  { href: "/ai", label: "AI Core", icon: Bot },
];

function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="space-y-1 p-3">
      {navigation.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-400 transition hover:bg-white/5 hover:text-white",
            pathname === href && "bg-violet-500/15 text-violet-200",
          )}
        >
          <Icon className="size-4" />
          {label}
        </Link>
      ))}
    </nav>
  );
}

export function DssApplicationShell({ children }: PropsWithChildren) {
  const open = useShellStore((state) => state.mobileNavigationOpen);
  const setOpen = useShellStore((state) => state.setMobileNavigationOpen);

  return (
    <div className="min-h-screen bg-[#040713] text-white">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-white/10 bg-slate-950/80 backdrop-blur-xl lg:block">
        <Link
          href="/"
          className="flex h-20 items-center gap-3 px-6 font-semibold"
        >
          <span className="grid size-10 place-items-center rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600">
            <Orbit className="size-6" />
          </span>
          DSS Universe
        </Link>
        <Navigation />
        <div className="absolute inset-x-3 bottom-4 rounded-xl border border-emerald-400/20 bg-emerald-500/5 p-4 text-xs text-emerald-300">
          ● All systems operational
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-40 flex h-20 items-center gap-4 border-b border-white/10 bg-[#040713]/85 px-4 backdrop-blur-xl sm:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open navigation"
          >
            <Menu />
          </Button>
          <div className="relative hidden max-w-xl flex-1 md:block">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
            <Input
              className="border-white/10 bg-white/[0.04] pl-10"
              placeholder="Search in DSS Universe..."
              aria-label="Global search"
            />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="icon" aria-label="Notifications">
              <Bell />
            </Button>
            <Button variant="ghost" size="icon" aria-label="Settings">
              <Settings />
            </Button>
            <div className="ml-2 flex items-center gap-3 border-l border-white/10 pl-4">
              <Avatar>
                <AvatarFallback>AF</AvatarFallback>
              </Avatar>
              <div className="hidden text-sm sm:block">
                <p className="font-medium">Astronaut</p>
                <p className="text-xs text-slate-500">Commander</p>
              </div>
            </div>
          </div>
        </header>
        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="border-white/10 bg-slate-950 p-0">
          <SheetHeader className="h-20 justify-center border-b border-white/10 px-6">
            <SheetTitle className="flex items-center gap-3 text-white">
              <Orbit className="text-violet-400" /> DSS Universe
            </SheetTitle>
          </SheetHeader>
          <Navigation />
        </SheetContent>
      </Sheet>
    </div>
  );
}
