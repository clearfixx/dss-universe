/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: DSS Editor Frontend
 * 📄 File: apps/web/src/features/editor/editor-document-view.tsx
 *
 * 🎯 Purpose:
 * Read-only rendering of editor documents (static pages, forum posts): every
 * node of every profile. The caller says where files live and may replace
 * the quote block.
 *
 * ⚠️ Important:
 * Only http(s), mailto and site-relative links become anchors.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

export type DocumentNode = {
  type?: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: Array<{ type?: string; attrs?: Record<string, unknown> }>;
  content?: DocumentNode[];
};

export type QuoteRenderer = (
  quote: DocumentNode,
  children: ReactNode,
  key: string,
) => ReactNode;

type Context = {
  /** Null when the viewer has no address for the file. */
  fileUrl: (mediaId: string) => string | null;
  quote?: QuoteRenderer;
  headings: Array<{ id: string; text: string; level: number }>;
  notes: Map<string, number>;
};

const text = (value: unknown) => (typeof value === "string" ? value : "");

export function safeHref(value: unknown): string | null {
  const href = text(value).trim();
  return /^(https?:\/\/|mailto:)/i.test(href) || /^\/(?!\/)/.test(href)
    ? href
    : /^#[\w-]*$/.test(href)
      ? href
      : null;
}

function plain(node: DocumentNode): string {
  return node.text ?? (node.content ?? []).map(plain).join("");
}

/** Headings and footnote numbers in document order. */
export function indexDocument(root: DocumentNode) {
  const headings: Context["headings"] = [];
  const notes = new Map<string, number>();
  const visit = (node: DocumentNode) => {
    if (node.type === "heading")
      headings.push({
        id: `section-${headings.length + 1}`,
        text: plain(node),
        level: Number(node.attrs?.level ?? 2),
      });
    if (node.type === "footnoteReference") {
      const id = text(node.attrs?.noteId);
      if (id && !notes.has(id)) notes.set(id, notes.size + 1);
    }
    node.content?.forEach(visit);
  };
  visit(root);
  return { headings, notes };
}

function marked(node: DocumentNode, key: string): ReactNode {
  let content: ReactNode = node.text ?? "";
  for (const [index, mark] of (node.marks ?? []).entries()) {
    const markKey = `${key}-${index}`;
    if (mark.type === "bold")
      content = <strong key={markKey}>{content}</strong>;
    if (mark.type === "italic") content = <em key={markKey}>{content}</em>;
    if (mark.type === "strike") content = <s key={markKey}>{content}</s>;
    if (mark.type === "code")
      content = (
        <code key={markKey} className="rounded bg-white/10 px-1 py-0.5">
          {content}
        </code>
      );
    const href = mark.type === "link" ? safeHref(mark.attrs?.href) : null;
    if (href)
      content = (
        <a
          key={markKey}
          href={href}
          rel="noopener noreferrer"
          className="text-violet-300 underline underline-offset-4"
        >
          {content}
        </a>
      );
  }
  return content;
}

function renderer(context: Context) {
  let heading = 0;
  const children = (node: DocumentNode, key: string): ReactNode[] =>
    (node.content ?? []).map((child, index) =>
      render(child, `${key}-${index}`),
    );

  function render(node: DocumentNode, key: string): ReactNode {
    const align: CSSProperties | undefined =
      node.attrs?.textAlign === "center" ? { textAlign: "center" } : undefined;
    switch (node.type) {
      case "text":
        return <span key={key}>{marked(node, key)}</span>;
      case "paragraph":
        return (
          <p key={key} style={align} className="leading-7">
            {children(node, key)}
          </p>
        );
      case "heading": {
        const entry = context.headings[heading++];
        const level = Math.min(Math.max(entry?.level ?? 2, 1), 4);
        // The page title is the only h1.
        const Tag = (["h2", "h2", "h3", "h4"] as const)[level - 1];
        const size = ["text-2xl", "text-2xl", "text-xl", "text-lg"][level - 1];
        return (
          <Tag
            key={key}
            id={entry?.id}
            style={align}
            className={`scroll-mt-24 pt-2 font-semibold text-white ${size}`}
          >
            {children(node, key)}
          </Tag>
        );
      }
      case "bulletList":
        return (
          <ul key={key} className="list-disc space-y-1 pl-6">
            {children(node, key)}
          </ul>
        );
      case "orderedList":
        return (
          <ol key={key} className="list-decimal space-y-1 pl-6">
            {children(node, key)}
          </ol>
        );
      case "listItem":
        return <li key={key}>{children(node, key)}</li>;
      case "taskList":
        return (
          <ul key={key} className="space-y-1">
            {children(node, key)}
          </ul>
        );
      case "taskItem":
        return (
          <li key={key} className="flex gap-2">
            <input
              type="checkbox"
              checked={node.attrs?.checked === true}
              readOnly
              disabled
              className="mt-1.5"
            />
            <div className="min-w-0">{children(node, key)}</div>
          </li>
        );
      case "blockquote":
        if (context.quote) return context.quote(node, children(node, key), key);
        return (
          <blockquote key={key} className="border-l-2 border-violet-400 pl-4">
            {children(node, key)}
          </blockquote>
        );
      case "codeBlock":
        return (
          <pre
            key={key}
            className="overflow-x-auto rounded-lg border border-white/10 bg-slate-950 p-3 text-sm"
          >
            <code>{plain(node)}</code>
          </pre>
        );
      case "horizontalRule":
        return <hr key={key} className="border-white/10" />;
      case "hardBreak":
        return <br key={key} />;
      case "table":
        return (
          <div key={key} className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <tbody>{children(node, key)}</tbody>
            </table>
          </div>
        );
      case "tableRow":
        return <tr key={key}>{children(node, key)}</tr>;
      case "tableHeader":
        return (
          <th
            key={key}
            className="border border-white/10 bg-white/[0.05] px-3 py-2 text-left"
          >
            {children(node, key)}
          </th>
        );
      case "tableCell":
        return (
          <td key={key} className="border border-white/10 px-3 py-2 align-top">
            {children(node, key)}
          </td>
        );
      case "mediaReference":
      case "image": {
        const mediaId = text(node.attrs?.mediaId);
        const source = mediaId ? context.fileUrl(mediaId) : null;
        if (!source) return null;
        const caption = text(node.attrs?.caption);
        return (
          <figure key={key} className="space-y-1">
            {/* The file lives on the API origin with its own cache rules. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={source}
              alt={text(node.attrs?.alt)}
              loading="lazy"
              className="max-w-full rounded-lg"
            />
            {caption ? (
              <figcaption className="text-xs text-slate-400">
                {caption}
              </figcaption>
            ) : null}
          </figure>
        );
      }
      case "attachment":
      case "video": {
        const mediaId = text(node.attrs?.mediaId);
        const href = mediaId ? context.fileUrl(mediaId) : null;
        return href ? (
          <p key={key}>
            <a
              href={href}
              className="text-violet-300 underline underline-offset-4"
            >
              {text(node.attrs?.label) || "Завантажити файл"}
            </a>
          </p>
        ) : null;
      }
      case "mention": {
        const username = text(node.attrs?.username);
        return (
          <Link
            key={key}
            href={`/profile/${encodeURIComponent(username)}`}
            className="font-bold text-violet-300 hover:underline"
          >
            @{username}
          </Link>
        );
      }
      case "footnoteReference": {
        const number = context.notes.get(text(node.attrs?.noteId));
        return number ? (
          <sup key={key}>
            <a href={`#note-${number}`} className="text-violet-300">
              [{number}]
            </a>
          </sup>
        ) : null;
      }
      case "footnoteDefinition": {
        const number = context.notes.get(text(node.attrs?.noteId));
        return (
          <div
            key={key}
            id={number ? `note-${number}` : undefined}
            className="flex gap-2 text-sm text-slate-400"
          >
            <span>{number ? `[${number}]` : "•"}</span>
            <div className="min-w-0">{children(node, key)}</div>
          </div>
        );
      }
      case "tableOfContents":
        return context.headings.length ? (
          <nav
            key={key}
            aria-label="Зміст"
            className="rounded-lg border border-white/10 p-3"
          >
            <p className="mb-1 font-semibold text-white">Зміст</p>
            <ul className="space-y-1 text-sm">
              {context.headings.map((entry) => (
                <li
                  key={entry.id}
                  style={{
                    paddingLeft: `${Math.max(0, entry.level - 2) * 12}px`,
                  }}
                >
                  <a href={`#${entry.id}`} className="text-violet-300">
                    {entry.text}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ) : null;
      default:
        // Unknown nodes keep their readable content.
        return <div key={key}>{children(node, key)}</div>;
    }
  }
  return (root: DocumentNode) => children(root, "page");
}

export function EditorDocumentView({
  documentJson,
  fileUrl,
  quote,
}: {
  documentJson: string;
  fileUrl: Context["fileUrl"];
  quote?: QuoteRenderer;
}) {
  let root: DocumentNode;
  try {
    const parsed = JSON.parse(documentJson) as { content?: DocumentNode };
    root = parsed.content ?? {};
  } catch {
    return <p>Не вдалося відобразити текст.</p>;
  }
  const render = renderer({ fileUrl, quote, ...indexDocument(root) });
  return <div className="space-y-4 text-slate-200">{render(root)}</div>;
}
