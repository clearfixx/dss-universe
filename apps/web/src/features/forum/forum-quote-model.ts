/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Forum
 * 📄 File: apps/web/src/features/forum/forum-quote-model.ts
 *
 * 🎯 Purpose:
 * Builds what «Відповісти» and «Цитата» put into the reply editor
 * (owner 2026-11-28): the answered member's bold nickname, or a quote of the
 * whole post.
 *
 * ⚠️ Important:
 * A quote is a copy that everybody reading the new post sees. Hidden blocks
 * must never be copied, even when the quoting member has unlocked them.
 * Files stay with their post (only their uploader may attach them), and
 * quotes inside the quoted post are left out.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { EditorNode } from "@dss/editor";

export type ForumQuoteSource = Readonly<{
  postId: string;
  number: number;
  authorName: string;
  documentJson: string;
}>;

/** Blocks and inline nodes a reply may contain and a quote may copy. */
const COPIED = new Set([
  "text",
  "hardBreak",
  "mention",
  "paragraph",
  "bulletList",
  "orderedList",
  "listItem",
  "codeBlock",
  "horizontalRule",
]);

function copy(node: EditorNode): EditorNode[] {
  // Replies have no headings: a quoted heading becomes a bold paragraph.
  if (node.type === "heading") {
    const content = (node.content ?? []).flatMap(copy).map((child) =>
      child.type === "text"
        ? {
            ...child,
            marks: [
              ...(child.marks ?? []).filter((mark) => mark.type !== "bold"),
              { type: "bold" as const },
            ],
          }
        : child,
    );
    return content.length ? [{ type: "paragraph", content }] : [];
  }
  if (!COPIED.has(node.type)) return [];
  if (!node.content) return [node];
  const content = node.content.flatMap(copy);
  const needsChildren = ["bulletList", "orderedList", "listItem"];
  if (!content.length && needsChildren.includes(node.type)) return [];
  return [{ ...node, content }];
}

function rootOf(documentJson: string): EditorNode | null {
  try {
    const parsed = JSON.parse(documentJson) as { content?: EditorNode };
    return parsed.content ?? null;
  } catch {
    return null;
  }
}

const isBlank = (node: EditorNode) =>
  node.type === "paragraph" && !node.content?.length;

export function forumQuoteNode(source: ForumQuoteSource): EditorNode {
  const content = (rootOf(source.documentJson)?.content ?? []).flatMap(copy);
  while (content.length && isBlank(content[0]!)) content.shift();
  while (content.length && isBlank(content.at(-1)!)) content.pop();
  return {
    type: "blockquote",
    attrs: {
      quotePostId: source.postId,
      quoteNumber: source.number,
      quoteAuthor: source.authorName,
    },
    content: content.length
      ? content
      : [
          {
            type: "paragraph",
            content: [
              { type: "text", text: "[вміст цього допису не цитується]" },
            ],
          },
        ],
  };
}

export function forumReplyMention(user: {
  id: string;
  username: string;
}): EditorNode {
  return {
    type: "paragraph",
    content: [
      {
        type: "mention",
        attrs: { userId: user.id, username: user.username },
        marks: [{ type: "bold" }],
      },
      { type: "text", text: " " },
    ],
  };
}

/** Numbers of the posts whose quotes are still in the document. */
export function forumQuotedNumbers(document: { content?: EditorNode }) {
  const numbers = new Set<number>();
  const visit = (node: EditorNode): void => {
    const number = node.attrs?.quoteNumber;
    if (node.type === "blockquote" && typeof number === "number")
      numbers.add(number);
    node.content?.forEach(visit);
  };
  if (document.content) visit(document.content);
  return [...numbers].sort((a, b) => a - b);
}
