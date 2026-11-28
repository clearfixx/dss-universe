import Link from "next/link";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      href="/"
      aria-label="DSS Universe — головна"
      className="flex shrink-0 items-center gap-2.5 text-slate-100"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/dss-logo-mark.svg" alt="" width={40} height={35} className="h-[35px] w-10 shrink-0" />
      {compact ? null : (
        <span aria-hidden="true" className="flex flex-col leading-none">
          <span className="text-lg font-extrabold tracking-[0.06em]">DSS</span>
          <span className="text-[10px] font-semibold tracking-[0.28em] text-slate-300">
            UNIVERSE
          </span>
        </span>
      )}
    </Link>
  );
}
