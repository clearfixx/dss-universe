import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { siteConfig } from "@/config/site.config";

const foundationItems = [
  "Monorepo",
  "NestJS API",
  "Next.js Web",
  "PostgreSQL",
  "Redis",
  "Prisma",
  "shadcn/ui",
  "Tailwind CSS",
];

export default function HomePage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[#050816] text-white">
      <section className="relative mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center px-6 py-20 text-center">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.18),_transparent_35%),radial-gradient(circle_at_bottom,_rgba(124,58,237,0.18),_transparent_40%)]" />

        <Badge variant="secondary" className="mb-5">
          Phase 0 / Foundation
        </Badge>

        <h1 className="max-w-4xl text-5xl font-bold tracking-tight md:text-7xl">
          {siteConfig.name}
        </h1>

        <p className="mt-6 max-w-2xl text-lg text-slate-300">
          Developer Space Station is coming online. The foundation is active,
          the API is connected, and the universe is ready to expand.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button>Enter Station</Button>
          <Button variant="outline">View System Status</Button>
        </div>

        <Separator className="my-12 max-w-2xl bg-white/10" />

        <div className="grid w-full gap-4 md:grid-cols-4">
          {foundationItems.map((item) => (
            <Card key={item} className="border-white/10 bg-white/5 text-white">
              <CardHeader>
                <CardTitle className="text-base">{item}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-400">Online</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
