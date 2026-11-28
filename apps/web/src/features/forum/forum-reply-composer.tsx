"use client";

/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Forum
 * 📄 File: apps/web/src/features/forum/forum-reply-composer.tsx
 *
 * 🎯 Purpose:
 * Reply form under a topic: DSS Editor (forum reply profile), reply-to and
 * quotes from post buttons, cooldown and read-only feedback.
 *
 * ⚠️ Important:
 * The API enforces every rule (cooldown, read-only, closed topic, hidden
 * blocks only in enabled forums); the form only explains the result.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import {
  createEmptyEditorDocument,
  type EditorDocument,
  type EditorNode,
} from "@dss/editor";
import { Send, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { DssEditor } from "@/features/editor/dss-editor";

import { createForumReply } from "./forum-actions";
import { forumQuotedNumbers } from "./forum-quote-model";
import {
  FORUM_REPLY_EVENT,
  type ForumReplyTarget,
} from "./forum-topic-controls";

export function ForumReplyComposer({
  topicId,
  path,
  lastPage,
  allowsGatedContent = false,
}: {
  topicId: string;
  path: string;
  /** Path of the last page, where the new reply appears. */
  lastPage: string;
  /** The section lets posts hide content (Command Deck switch). */
  allowsGatedContent?: boolean;
}) {
  const router = useRouter();
  const [document, setDocument] = useState<EditorDocument>(() =>
    createEmptyEditorDocument("FORUM_REPLY"),
  );
  const [version, setVersion] = useState(0);
  const [target, setTarget] = useState<number | null>(null);
  const [insertion, setInsertion] = useState<{
    key: number;
    blocks: EditorNode[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    let key = 0;
    const listener = (event: Event) => {
      const { number, quote, block } = (event as CustomEvent<ForumReplyTarget>)
        .detail;
      if (!quote) setTarget(number);
      if (block) setInsertion({ key: ++key, blocks: [block] });
    };
    window.addEventListener(FORUM_REPLY_EVENT, listener);
    return () => window.removeEventListener(FORUM_REPLY_EVENT, listener);
  }, []);

  function submit() {
    setError(null);
    start(async () => {
      const result = await createForumReply(
        {
          topicId,
          documentJson: JSON.stringify(document),
          replyToNumber: target,
          quotedNumbers: forumQuotedNumbers(document),
        },
        path,
      );
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      setDocument(createEmptyEditorDocument("FORUM_REPLY"));
      setVersion((value) => value + 1);
      setTarget(null);
      setInsertion(null);
      router.push(`${lastPage}#post-${result.data.number}`);
    });
  }

  return (
    <section
      id="forum-reply"
      aria-labelledby="forum-reply-title"
      className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 sm:p-5"
    >
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <h2 id="forum-reply-title" className="font-semibold">
          Ваша відповідь
        </h2>
        {target !== null ? (
          <span className="inline-flex items-center gap-2 rounded-lg bg-violet-500/15 px-2.5 py-1 text-xs text-violet-200">
            Відповідь на #{target}
            <button
              type="button"
              onClick={() => setTarget(null)}
              aria-label="Прибрати ціль відповіді"
              className="rounded hover:text-white"
            >
              <X className="size-3.5" aria-hidden="true" />
            </button>
          </span>
        ) : null}
      </div>
      <DssEditor
        key={version}
        profile="FORUM_REPLY"
        permissions={allowsGatedContent ? ["CONTENT_GATE_CONFIGURE"] : []}
        initialDocument={document}
        onDocumentChange={setDocument}
        insertion={insertion}
        ariaLabel="Текст відповіді"
      />
      <div className="mt-3 flex flex-wrap items-center gap-3">
        {error ? (
          <p role="alert" className="text-sm text-rose-300">
            {error}
          </p>
        ) : (
          <p className="text-xs text-slate-500">
            Між дописами діє кулдаун 60 секунд.
          </p>
        )}
        <Button
          type="button"
          className="ml-auto"
          onClick={submit}
          disabled={pending}
        >
          <Send className="size-4" aria-hidden="true" />
          {pending ? "Надсилаємо…" : "Надіслати відповідь"}
        </Button>
      </div>
    </section>
  );
}
