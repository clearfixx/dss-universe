import Link from "next/link";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      href="/"
      aria-label="DSS Universe — головна"
      className="flex shrink-0 items-center gap-2.5 text-slate-100"
    >
      <svg width="34" height="34" viewBox="0 0 40 40" aria-hidden="true" className="shrink-0">
        <circle cx="20" cy="20" r="10.5" fill="none" stroke="#ece9ff" strokeWidth="4" />
        <ellipse
          cx="20"
          cy="20"
          rx="18.5"
          ry="6.5"
          fill="none"
          stroke="#a78bfa"
          strokeWidth="2.5"
          transform="rotate(-22 20 20)"
        />
      </svg>
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
