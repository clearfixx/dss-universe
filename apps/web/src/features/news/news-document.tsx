import type { ReactNode } from "react";

type EditorNode = {
  type?: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: Array<{ type?: string; attrs?: Record<string, unknown> }>;
  content?: EditorNode[];
};

/**
 * Full News returns the canonical editor envelope
 * `{ schemaVersion, profile, content: { type: "doc", … } }`; legacy documents
 * are the bare root node. Both render from the root node.
 */
export function rootNode(parsed: unknown): EditorNode {
  if (
    parsed &&
    typeof parsed === "object" &&
    "content" in parsed &&
    parsed.content &&
    typeof parsed.content === "object" &&
    !Array.isArray(parsed.content)
  ) {
    return parsed.content as EditorNode;
  }
  return parsed as EditorNode;
}

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
          className="rounded bg-muted px-1 py-0.5 text-link"
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
          className="text-link underline underline-offset-4"
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
    document = rootNode(JSON.parse(documentJson));
  } catch {
    return <p>Не вдалося відобразити текст цієї новини.</p>;
  }
  return (
    <div className="prose prose-invert max-w-none prose-headings:scroll-mt-24 prose-headings:text-foreground prose-p:leading-8 prose-p:text-foreground prose-a:text-link prose-blockquote:border-border prose-blockquote:text-foreground prose-pre:border prose-pre:border-border prose-pre:bg-background">
      {children(document, "document")}
    </div>
  );
}
