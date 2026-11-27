/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Ban
 * 📄 File: apps/web/src/app/banned/page.tsx
 *
 * 🎯 Purpose:
 * The only screen of a banned account (owner mockup): the apology, the ban
 * facts and the appeal or its outcome.
 *
 * ⚠️ Important:
 * No application shell and no session: the ticket cookie is the only input.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";

import { BAN_COOKIE } from "@/features/ban/ban-contract";
import { loadBanScreen } from "@/features/ban/ban-data";
import { BanScreen } from "@/features/ban/ban-screen";

export const metadata: Metadata = {
  title: "Акаунт заблоковано | DSS Universe",
  robots: { index: false, follow: false },
};

export default async function BannedPage() {
  const ticket = (await cookies()).get(BAN_COOKIE)?.value;
  if (!ticket) redirect("/login");
  const data = await loadBanScreen(ticket);
  if (!data)
    return (
      <main
        lang="uk"
        className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-950 px-4 text-center text-white"
      >
        <p>
          Не вдалося показати цю сторінку. Увійдіть ще раз, щоб побачити стан
          свого акаунта.
        </p>
        <Link
          href="/login"
          className="rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-semibold"
        >
          Увійти
        </Link>
      </main>
    );
  return <BanScreen data={data} />;
}
