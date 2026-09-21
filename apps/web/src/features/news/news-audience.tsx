"use client";

import { Copy, Eye, Printer, Share2 } from "lucide-react";
import { useEffect, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import type { FullNewsPageQuery, ShareChannel } from "@/gql/graphql";

import { recordNewsShare, recordNewsView } from "./news-actions";

type Sharing = NonNullable<FullNewsPageQuery["fullNews"]>["sharing"];

const VISITOR_KEY = "dss.news.visitor.v1";
const CHANNELS: Array<{ channel: ShareChannel; label: string }> = [
  { channel: "FACEBOOK", label: "Facebook" },
  { channel: "X", label: "X" },
  { channel: "THREADS", label: "Threads" },
  { channel: "INSTAGRAM", label: "Instagram" },
  { channel: "PINTEREST", label: "Pinterest" },
];

function visitorId(): string {
  try {
    const stored = window.localStorage.getItem(VISITOR_KEY);
    if (stored) return stored;
    const created = window.crypto.randomUUID();
    window.localStorage.setItem(VISITOR_KEY, created);
    return created;
  } catch {
    // Privacy-restricted browsers still receive a non-identifying visitor token.
    return window.crypto.randomUUID();
  }
}

function shareUrl(channel: ShareChannel, url: string, title: string): string {
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  if (channel === "FACEBOOK") {
    return `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
  }
  if (channel === "X") {
    return `https://x.com/intent/post?url=${encodedUrl}&text=${encodedTitle}`;
  }
  if (channel === "THREADS") {
    return `https://www.threads.net/intent/post?text=${encodedTitle}%20${encodedUrl}`;
  }
  if (channel === "PINTEREST") {
    return `https://www.pinterest.com/pin/create/button/?url=${encodedUrl}&description=${encodedTitle}`;
  }
  return "";
}

export function NewsAudience({
  interactionTargetId,
  title,
  initialViewCount,
  initialSharing,
  sharingEnabled,
}: {
  interactionTargetId: string;
  title: string;
  initialViewCount: number;
  initialSharing: Sharing;
  sharingEnabled: boolean;
}) {
  const [viewCount, setViewCount] = useState(initialViewCount);
  const [sharing, setSharing] = useState(initialSharing);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let active = true;
    recordNewsView(interactionTargetId, visitorId())
      .then((result) => {
        if (active && result) setViewCount(result.viewCount);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [interactionTargetId]);

  const count = (channel: ShareChannel) =>
    sharing.channels.find((item) => item.channel === channel)?.count ?? 0;

  const track = (channel: ShareChannel) => {
    startTransition(async () => {
      try {
        const result = await recordNewsShare(
          interactionTargetId,
          visitorId(),
          channel,
        );
        if (result) {
          setSharing({ total: result.shareCount, channels: result.shares });
        }
      } catch {
        setMessage("Дію виконано, але статистику поки не оновлено.");
      }
    });
  };

  const share = async (channel: ShareChannel) => {
    try {
      const url = window.location.href;
      if (channel === "INSTAGRAM") {
        if (navigator.share) await navigator.share({ title, url });
        else {
          await navigator.clipboard.writeText(url);
          setMessage("Посилання скопійовано для Instagram.");
        }
      } else {
        window.open(
          shareUrl(channel, url, title),
          "_blank",
          "noopener,noreferrer",
        );
      }
      track(channel);
    } catch {
      setMessage("Поширення скасовано або недоступне в цьому браузері.");
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setMessage("Посилання скопійовано.");
      track("COPY_LINK");
    } catch {
      setMessage("Браузер не дозволив скопіювати посилання.");
    }
  };

  const print = () => {
    track("PRINT");
    window.print();
  };

  return (
    <section
      aria-label="Перегляди й поширення"
      className="space-y-4 rounded-2xl border border-white/10 bg-slate-950/60 p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 text-sm text-slate-300">
          <Eye className="size-4 text-cyan-300" />
          {viewCount.toLocaleString("uk-UA")} унікальних переглядів
        </span>
        {sharingEnabled ? (
          <span className="inline-flex items-center gap-2 text-sm text-slate-400">
            <Share2 className="size-4" /> {sharing.total} поширень
          </span>
        ) : null}
      </div>
      {sharingEnabled ? (
        <div className="flex flex-wrap gap-2">
          {CHANNELS.map(({ channel, label }) => (
            <Button
              key={channel}
              type="button"
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => void share(channel)}
            >
              {label} <span className="text-slate-500">{count(channel)}</span>
            </Button>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={copy}>
            <Copy /> Копіювати{" "}
            <span className="text-slate-500">{count("COPY_LINK")}</span>
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={print}>
            <Printer /> Друк{" "}
            <span className="text-slate-500">{count("PRINT")}</span>
          </Button>
        </div>
      ) : null}
      {message ? <p className="text-xs text-amber-300">{message}</p> : null}
    </section>
  );
}
