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
 * blocks reuse the shared News document renderer.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { LockKeyhole } from "lucide-react";

import { NewsDocument } from "@/features/news/news-document";

type Node = {
  type?: string;
  attrs?: Record<string, unknown>;
  content?: Node[];
};
type Document = { content?: Node };

/** The shared renderer walks a `doc` node, so each run becomes its own doc. */
function chunk(nodes: Node[]): string {
  return JSON.stringify({ type: "doc", content: nodes });
}

export function ForumDocument({ documentJson }: { documentJson: string }) {
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
              <NewsDocument documentJson={chunk(part.gate.content)} />
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
          <NewsDocument key={part.key} documentJson={chunk(part.nodes ?? [])} />
        ),
      )}
    </div>
  );
}
