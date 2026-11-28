/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Forum
 * 📄 File: apps/web/src/features/forum/forum-document.tsx
 *
 * 🎯 Purpose:
 * Renders a forum post's viewer-safe Editor document.
 *
 * ⚠️ Important:
 * The API already removed what the viewer may not read: a locked hidden block
 * arrives as an empty `contentGate` node and is shown as a lock card. Ordinary
 * blocks use the shared editor document view; quotes fold after ten lines.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { LockKeyhole } from "lucide-react";

import {
  EditorDocumentView,
  type QuoteRenderer,
} from "@/features/editor/editor-document-view";

import { ForumQuoteBlock } from "./forum-quote-block";

type Node = {
  type?: string;
  attrs?: Record<string, unknown>;
  content?: Node[];
};
type Document = { content?: Node };

/** The shared view walks an envelope, so each run becomes its own document. */
function chunk(nodes: Node[]): string {
  return JSON.stringify({ content: { type: "doc", content: nodes } });
}

const quote: QuoteRenderer = (node, children, key) => {
  const { quoteAuthor, quoteNumber, quotePostId } = node.attrs ?? {};
  return (
    <ForumQuoteBlock
      key={key}
      author={typeof quoteAuthor === "string" ? quoteAuthor : undefined}
      number={typeof quoteNumber === "number" ? quoteNumber : undefined}
      postId={
        typeof quotePostId === "string" && /^[\w-]+$/.test(quotePostId)
          ? quotePostId
          : undefined
      }
    >
      {children}
    </ForumQuoteBlock>
  );
};

export function ForumDocument({
  documentJson,
  files = [],
}: {
  documentJson: string;
  /** The post's files the viewer may open, for inline images and links. */
  files?: ReadonlyArray<{ mediaId: string; downloadUrl: string }>;
}) {
  const fileUrl = (mediaId: string) =>
    files.find((file) => file.mediaId === mediaId)?.downloadUrl ?? null;
  const view = (nodes: Node[]) => (
    <div className="space-y-4">
      <EditorDocumentView
        documentJson={chunk(nodes)}
        fileUrl={fileUrl}
        quote={quote}
      />
    </div>
  );
  let document: Document;
  try {
    document = JSON.parse(documentJson) as Document;
  } catch {
    return null;
  }
  const blocks = document.content?.content ?? [];
  const parts: Array<{ key: string; gate?: Node; nodes?: Node[] }> = [];
  let run: Node[] = [];
  blocks.forEach((node, index) => {
    if (node.type === "contentGate") {
      if (run.length) parts.push({ key: `r${index}`, nodes: run });
      run = [];
      parts.push({ key: `g${index}`, gate: node });
    } else run.push(node);
  });
  if (run.length) parts.push({ key: "rEnd", nodes: run });

  return (
    <div className="space-y-4 text-[15px] leading-7 text-slate-200 [&_a]:text-violet-300">
      {parts.map((part) =>
        part.gate ? (
          part.gate.content?.length ? (
            <section
              key={part.key}
              className="rounded-xl border border-violet-500/40 bg-violet-500/10 p-4"
              aria-label="Прихований блок (відкрито)"
            >
              <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-violet-300">
                <LockKeyhole className="size-3.5" aria-hidden="true" />
                Прихований блок
              </p>
              {view(part.gate.content)}
            </section>
          ) : (
            <div
              key={part.key}
              className="flex items-center gap-3 rounded-xl border border-dashed border-white/15 bg-white/5 p-4 text-sm text-slate-400"
            >
              <LockKeyhole
                className="size-5 text-violet-300"
                aria-hidden="true"
              />
              <span>
                <strong className="text-slate-200">Прихований блок.</strong>{" "}
                Відкриється, коли виконаєте умову автора.
              </span>
            </div>
          )
        ) : (
          <div key={part.key}>{view(part.nodes ?? [])}</div>
        ),
      )}
    </div>
  );
}
