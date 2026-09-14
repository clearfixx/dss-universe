import {
  ArrowRight,
  BookOpen,
  Bot,
  Boxes,
  GraduationCap,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { UniverseArrival } from "./universe-arrival";

const modules = [
  {
    name: "Community Hub",
    description:
      "Find your people. Share a question, a discovery, a different way of thinking.",
    icon: MessageSquare,
  },
  {
    name: "Research Lab",
    description:
      "Follow the ideas moving development forward. News, research and original perspectives.",
    icon: BookOpen,
  },
  {
    name: "Knowledge Forge",
    description:
      "Turn experience into shared knowledge. Built together, improved with every revision.",
    icon: Sparkles,
  },
  {
    name: "Academy",
    description:
      "Make room for your next skill. Learn, practice and grow alongside other builders.",
    icon: GraduationCap,
  },
  {
    name: "DSS Media Platform",
    description:
      "A home for the files and resources that bring your projects to life.",
    icon: Boxes,
  },
  {
    name: "AI Core",
    description:
      "A future companion for your questions, discoveries and creative work.",
    icon: Bot,
  },
];

export function GuestLanding() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#02050d] text-white">
      <UniverseArrival />
      <section id="modules" className="mx-auto max-w-7xl px-6 py-24">
        <p className="text-[10px] tracking-[0.25em] text-blue-400">
          ONE CORE. ENDLESS CONNECTIONS.
        </p>
        <h2 className="mt-4 text-3xl font-medium tracking-tight">
          Explore your Universe.
        </h2>
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {modules.map(({ name, description, icon: Icon }) => (
            <article
              key={name}
              className="rounded-xl border border-blue-300/10 bg-gradient-to-br from-slate-900/50 to-transparent p-6"
            >
              <Icon className="mb-5 size-5 text-blue-400" />
              <h3 className="text-sm font-medium">{name}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-400">
                {description}
              </p>
            </article>
          ))}
        </div>
      </section>
      <section
        id="mission"
        className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-8 border-t border-white/10 px-6 py-14"
      >
        <div>
          <h2 className="text-2xl font-medium">
            Every universe starts with a connection.
          </h2>
          <p className="mt-3 text-sm text-slate-400">
            Build knowledge. Share experience. Help shape what comes next.
          </p>
        </div>
        <Link
          href="/command-deck"
          className="flex items-center gap-3 text-sm text-blue-300"
        >
          Enter Station <ArrowRight size={16} />
        </Link>
      </section>
      <footer className="mx-auto max-w-7xl border-t border-white/10 px-6 py-7 text-xs text-slate-500">
        DSS Universe · Created by developers, for developers.
      </footer>
    </main>
  );
}
