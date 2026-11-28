"use client";

/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Forum
 * 📄 File: apps/web/src/features/forum/forum-quote-block.tsx
 *
 * 🎯 Purpose:
 * A quote in a forum post. Quotes longer than ten lines are folded, with
 * «Показати все повідомлення» and «Згорнути» (owner 2026-11-28).
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";

/** Ten lines of the post body (leading-7 = 28px). */
export const FORUM_QUOTE_MAX_HEIGHT = 10 * 28;

export function ForumQuoteBlock({
  author,
  number,
  postId,
  children,
}: {
  author?: string;
  number?: number;
  postId?: string;
  children: ReactNode;
}) {
  const body = useRef<HTMLDivElement>(null);
  const [long, setLong] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const element = body.current;
    if (!element) return;
    const measure = () =>
      setLong(element.scrollHeight > FORUM_QUOTE_MAX_HEIGHT + 1);
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(element.firstElementChild ?? element);
    return () => observer.disconnect();
  }, []);

  return (
    <blockquote className="rounded-r-lg border-l-2 border-violet-400 bg-white/[0.03] py-2 pr-3 pl-4 text-slate-300">
      {author ? (
        <p className="mb-1 text-xs text-slate-400">
          <span className="font-semibold text-slate-200">{author}</span>{" "}
          {postId ? (
            <Link
              href={`/community/forum/posts/${postId}`}
              className="text-violet-300 hover:underline"
            >
              #{number}
            </Link>
          ) : null}
        </p>
      ) : null}
      <div
        ref={body}
        className="overflow-hidden"
        style={{
          maxHeight: expanded ? undefined : FORUM_QUOTE_MAX_HEIGHT,
          maskImage:
            long && !expanded
              ? "linear-gradient(to bottom, black 75%, transparent)"
              : undefined,
        }}
      >
        <div className="space-y-2">{children}</div>
      </div>
      {long ? (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded(!expanded)}
          className="mt-1 text-xs font-medium text-violet-300 hover:underline"
        >
          {expanded ? "Згорнути" : "Показати все повідомлення"}
        </button>
      ) : null}
    </blockquote>
  );
}
