/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Application Shell
 * 📄 File: apps/web/src/components/shell/guest-landing.tsx
 *
 * 🎯 Purpose:
 * Presents DSS Universe to guests and leads them toward registration.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import {
  ArrowRight,
  Bot,
  BookOpen,
  Boxes,
  GraduationCap,
  MessageSquare,
  Orbit,
  Sparkles,
  Users,
} from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const modules = [
  {
    name: "Community Hub",
    description:
      "Forums, discussions, reputation and a living developer community.",
    icon: MessageSquare,
  },
  {
    name: "Research Lab",
    description:
      "News, research, technical publications and curated discoveries.",
    icon: BookOpen,
  },
  {
    name: "Knowledge Forge",
    description:
      "Collaborative manuals and knowledge improved by every revision.",
    icon: Sparkles,
  },
  {
    name: "Academy",
    description: "Community courses, progress tracking and future AI mentors.",
    icon: GraduationCap,
  },
  {
    name: "DSS Media Platform",
    description:
      "Structured files, galleries and reusable media across the universe.",
    icon: Boxes,
  },
  {
    name: "AI Core",
    description:
      "An intelligent layer woven into creation, learning and discovery.",
    icon: Bot,
  },
];

export function GuestLanding() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#030612] text-white">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-3 font-semibold">
          <span className="grid size-10 place-items-center rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 shadow-lg shadow-violet-950">
            <Orbit className="size-6" />
          </span>
          <span>DSS Universe</span>
        </Link>
        <nav className="hidden items-center gap-7 text-sm text-slate-300 md:flex">
          <a href="#modules">Modules</a>
          <a href="#mission">Mission</a>
          <Link href="/command-deck">Command Deck</Link>
        </nav>
        <Button variant="outline">Sign in</Button>
      </header>

      <section className="relative mx-auto grid min-h-[680px] max-w-7xl items-center gap-16 px-6 py-20 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_70%_35%,rgba(124,58,237,0.3),transparent_28rem),radial-gradient(circle_at_20%_60%,rgba(14,165,233,0.18),transparent_26rem)]" />
        <div>
          <Badge className="mb-6 border-violet-400/30 bg-violet-500/10 text-violet-200">
            One universe for builders
          </Badge>
          <h1 className="max-w-3xl text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
            Explore. Learn. Build.{" "}
            <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              Make an impact.
            </span>
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-300">
            DSS Universe connects developers, knowledge, research, courses,
            files and AI-assisted workflows in one evolving ecosystem.
          </p>
          <div className="mt-9 flex flex-wrap gap-4">
            <Button size="lg">
              Enter Station <ArrowRight />
            </Button>
            <Button size="lg" variant="outline" asChild>
              <a href="#modules">Explore the Universe</a>
            </Button>
          </div>
          <div className="mt-10 flex items-center gap-4 text-sm text-slate-400">
            <div className="flex -space-x-2">
              {["AF", "JD", "TS", "MC"].map((initials) => (
                <span
                  key={initials}
                  className="grid size-9 place-items-center rounded-full border-2 border-[#030612] bg-slate-800 text-xs"
                >
                  {initials}
                </span>
              ))}
            </div>
            <span>Join the first astronauts shaping DSS Universe.</span>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-xl">
          <div className="absolute -inset-8 rounded-full bg-violet-600/20 blur-3xl" />
          <Card className="relative overflow-hidden border-blue-400/20 bg-slate-950/70 shadow-2xl shadow-violet-950/40 backdrop-blur-xl">
            <CardHeader className="border-b border-white/10">
              <CardTitle className="flex items-center gap-2 text-base">
                <Orbit className="size-5 text-violet-400" /> Universe status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 p-6">
              {[
                ["Community Hub", "Building connections"],
                ["Research Lab", "Sharing discoveries"],
                ["Academy", "Growing skills"],
                ["AI Core", "Assisting every mission"],
              ].map(([name, description]) => (
                <div
                  key={name}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] p-4"
                >
                  <div>
                    <p className="font-medium">{name}</p>
                    <p className="text-sm text-slate-400">{description}</p>
                  </div>
                  <span className="text-xs text-emerald-400">● Online</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      <section id="modules" className="mx-auto max-w-7xl px-6 py-24">
        <div className="mb-12 max-w-2xl">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-violet-400">
            Universe modules
          </p>
          <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
            Everything needed to learn, create and grow together.
          </h2>
        </div>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {modules.map(({ name, description, icon: Icon }) => (
            <Card
              key={name}
              className="group border-white/10 bg-white/[0.035] transition hover:-translate-y-1 hover:border-violet-400/30"
            >
              <CardContent className="p-6">
                <span className="mb-5 grid size-12 place-items-center rounded-2xl bg-violet-500/15 text-violet-300">
                  <Icon />
                </span>
                <h3 className="text-lg font-semibold">{name}</h3>
                <p className="mt-2 leading-6 text-slate-400">{description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section id="mission" className="mx-auto max-w-7xl px-6 pb-24">
        <div className="flex flex-col items-center justify-between gap-8 rounded-3xl border border-violet-400/20 bg-gradient-to-r from-blue-950/70 to-violet-950/70 p-10 text-center md:flex-row md:text-left">
          <div>
            <Users className="mb-4 text-violet-300" />
            <h2 className="text-3xl font-bold">Ready to join the mission?</h2>
            <p className="mt-2 text-slate-300">
              Build knowledge, share experience and help shape the platform.
            </p>
          </div>
          <Button size="lg">
            Create your account <ArrowRight />
          </Button>
        </div>
      </section>
    </main>
  );
}
