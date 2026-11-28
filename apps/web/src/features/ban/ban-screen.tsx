/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Ban
 * 📄 File: apps/web/src/features/ban/ban-screen.tsx
 *
 * 🎯 Purpose:
 * Ban screen layout from the owner mockup over the owner's station artwork.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import {
  Ban,
  CalendarDays,
  Clock,
  FileText,
  Hash,
  MapPin,
  OctagonAlert,
  UserRound,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import type { ReactNode } from "react";

import { AppealForm } from "./appeal-form";
import { leaveBanScreen } from "./ban-actions";
import { formatBanDate } from "./ban-contract";
import type { BanScreenData } from "./ban-data";

function Row({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-x-3 py-2.5 sm:grid-cols-[1.5rem_10rem_minmax(0,1fr)]">
      <Icon className="size-5 text-slate-300" aria-hidden="true" />
      <dt className="text-sm text-slate-300">{label}</dt>
      <dd className="col-start-2 min-w-0 break-words text-sm text-white sm:col-start-3">
        {children}
      </dd>
    </div>
  );
}

export function BanScreen({ data }: { data: BanScreenData }) {
  const notice = data.accountBanNotice;
  const { appeal, files } = data.banAppealState;
  return (
    <main
      lang="uk"
      className="relative isolate flex min-h-screen flex-col items-center px-3 py-8 text-white"
    >
      <div className="fixed inset-0 -z-10 bg-slate-950">
        <Image
          src="/images/ban-screen-background.webp"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-[20%_center]"
        />
        <div className="absolute inset-0 bg-slate-950/35" />
      </div>

      <div className="flex w-full max-w-3xl flex-col items-center gap-3 text-center">
        <Image src="/brand/dss-logo-mark.svg" alt="" width={64} height={56} />
        <div>
          <p className="text-lg tracking-[0.2em]">DSS UNIVERSE</p>
          <p className="text-[10px] tracking-[0.25em] text-slate-300">
            DEVELOPER SPACE STATION
          </p>
        </div>
        <OctagonAlert className="size-16 text-rose-500" aria-hidden="true" />
        <h1 className="text-2xl font-bold sm:text-3xl">
          Ваш акаунт заблоковано назавжди
        </h1>
        <p className="max-w-xl text-sm text-slate-200 sm:text-base">
          Нам прикро, що так сталося. Але своїми діями ви змусили нас так
          вчинити 😞
          {appeal
            ? null
            : " Якщо ви вважаєте це помилкою, подайте апеляцію нижче."}
        </p>
      </div>

      <dl className="mt-5 w-full max-w-2xl divide-y divide-white/[0.07] rounded-xl border border-white/10 bg-slate-950/75 px-4 py-1 backdrop-blur sm:px-6">
        <Row icon={FileText} label="Порушене правило">
          <span className="font-semibold">Пункт {notice.ruleCode}</span>
          <span className="block text-slate-300">{notice.ruleText}</span>
          <span className="mt-1 block text-xs text-slate-400">
            Коментар: {notice.comment}
          </span>
        </Row>
        <Row icon={MapPin} label="Де порушення">
          {notice.contextPath ?? "Не вказано"}
        </Row>
        <Row icon={UserRound} label="Хто забанив">
          {notice.issuedByName ?? "Адміністрація"}
          <span className="block text-xs text-slate-400">Адміністрація</span>
        </Row>
        <Row icon={CalendarDays} label="Дата й час">
          {formatBanDate(notice.issuedAt)}
        </Row>
        <Row icon={Ban} label="Статус">
          <span className="rounded bg-rose-600 px-2 py-0.5 text-xs font-semibold">
            Перманентний бан
          </span>
        </Row>
        <Row icon={Hash} label="Номер блокування">
          {notice.reference}
        </Row>
      </dl>

      <div className="mt-4 w-full max-w-4xl">
        {appeal === null || appeal === undefined ? (
          <AppealForm files={files} />
        ) : (
          <section
            role="status"
            className="mx-auto max-w-2xl rounded-xl border border-violet-400/20 bg-slate-950/80 p-5 text-center backdrop-blur"
          >
            {appeal.status === "REJECTED" ? (
              <>
                <XCircle
                  className="mx-auto size-10 text-rose-400"
                  aria-hidden="true"
                />
                <h2 className="mt-2 text-lg font-semibold">
                  Апеляцію відхилено
                </h2>
                <p className="mt-2 whitespace-pre-line break-words text-sm text-slate-200">
                  Причина: {appeal.decisionReason}
                </p>
                <p className="mt-2 text-xs text-slate-400">
                  Повторна апеляція неможлива.
                </p>
              </>
            ) : (
              <>
                <Clock
                  className="mx-auto size-10 text-violet-300"
                  aria-hidden="true"
                />
                <h2 className="mt-2 text-lg font-semibold">
                  Ваша апеляція вже на розгляді
                </h2>
                <p className="mt-2 text-sm text-slate-300">
                  Подано {formatBanDate(appeal.submittedAt)}. Увійдіть пізніше,
                  щоб побачити рішення.
                </p>
              </>
            )}
            <form action={leaveBanScreen} className="mt-4">
              <button
                type="submit"
                className="min-h-11 rounded-lg border border-white/15 px-5 text-sm font-semibold hover:border-violet-400"
              >
                Вийти
              </button>
            </form>
          </section>
        )}
      </div>
    </main>
  );
}
