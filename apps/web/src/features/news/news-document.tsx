import type { ReactNode } from "react";

type EditorNode = {
  type?: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: Array<{ type?: string; attrs?: Record<string, unknown> }>;
  content?: EditorNode[];
};

function textNode(node: EditorNode, key: string): ReactNode {
  let content: ReactNode = node.text ?? "";
  for (const [index, mark] of (node.marks ?? []).entries()) {
    const markKey = `${key}-mark-${index}`;
    if (mark.type === "bold")
      content = <strong key={markKey}>{content}</strong>;
    if (mark.type === "italic") content = <em key={markKey}>{content}</em>;
    if (mark.type === "strike") content = <s key={markKey}>{content}</s>;
    if (mark.type === "code")
      content = (
        <code
          key={markKey}
          className="rounded bg-white/10 px-1 py-0.5 text-cyan-200"
        >
          {content}
        </code>
      );
    if (mark.type === "link" && typeof mark.attrs?.href === "string") {
      content = (
        <a
          key={markKey}
          href={mark.attrs.href}
          rel="noreferrer"
          className="text-cyan-300 underline underline-offset-4"
        >
          {content}
        </a>
      );
    }
  }
  return content;
}

function children(node: EditorNode, key: string) {
  return (node.content ?? []).map((child, index) =>
    renderNode(child, `${key}-${index}`),
  );
}

function renderNode(node: EditorNode, key: string): ReactNode {
  if (node.type === "text") return <span key={key}>{textNode(node, key)}</span>;
  if (node.type === "paragraph") return <p key={key}>{children(node, key)}</p>;
  if (node.type === "heading") {
    const level = Number(node.attrs?.level ?? 2);
    if (level === 1) return <h1 key={key}>{children(node, key)}</h1>;
    if (level === 3) return <h3 key={key}>{children(node, key)}</h3>;
    if (level === 4) return <h4 key={key}>{children(node, key)}</h4>;
    return <h2 key={key}>{children(node, key)}</h2>;
  }
  if (node.type === "bulletList")
    return <ul key={key}>{children(node, key)}</ul>;
  if (node.type === "orderedList")
    return <ol key={key}>{children(node, key)}</ol>;
  if (node.type === "listItem") return <li key={key}>{children(node, key)}</li>;
  if (node.type === "blockquote")
    return <blockquote key={key}>{children(node, key)}</blockquote>;
  if (node.type === "codeBlock")
    return (
      <pre key={key}>
        <code>
          {(node.content ?? []).map((child) => child.text ?? "").join("")}
        </code>
      </pre>
    );
  if (node.type === "horizontalRule") return <hr key={key} />;
  if (node.type === "hardBreak") return <br key={key} />;
  return <div key={key}>{children(node, key)}</div>;
}

export function NewsDocument({ documentJson }: { documentJson: string }) {
  let document: EditorNode;
  try {
    document = JSON.parse(documentJson) as EditorNode;
  } catch {
    return <p>Не вдалося відобразити текст цієї новини.</p>;
  }
  return (
    <div className="prose prose-invert max-w-none prose-headings:scroll-mt-24 prose-headings:text-white prose-p:leading-8 prose-p:text-slate-300 prose-a:text-cyan-300 prose-blockquote:border-cyan-400 prose-blockquote:text-slate-300 prose-pre:border prose-pre:border-white/10 prose-pre:bg-slate-950">
      {children(document, "document")}
    </div>
  );
}
