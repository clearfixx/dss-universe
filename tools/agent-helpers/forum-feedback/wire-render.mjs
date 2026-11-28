import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { sub } from "./sub.mjs";

// 1. The complete renderer of static pages becomes the shared document view.
const pagePath = "apps/web/src/features/static-pages/static-page-document.tsx";
const viewPath = "apps/web/src/features/editor/editor-document-view.tsx";
const page = readFileSync(pagePath, "utf8").replace(/\r\n/g, "\n");
mkdirSync("apps/web/src/features/editor", { recursive: true });
writeFileSync(
  viewPath,
  page
    .replace("📦 Module: Web Static Pages", "📦 Module: DSS Editor Frontend")
    .replace(pagePath, viewPath)
    .replace(
      ` * Server rendering of a published static page document: every node of the
 * ADMIN editor profile, files through the page's public file route.`,
      ` * Read-only rendering of editor documents (static pages, forum posts): every
 * node of every profile. The caller says where files live and may replace
 * the quote block.`,
    )
    .replaceAll("StaticPageDocument", "EditorDocumentView")
    .replaceAll("PageNode", "DocumentNode"),
);
sub(
  viewPath,
  `type Context = {
  fileUrl: (mediaId: string) => string;`,
  `export type QuoteRenderer = (
  quote: DocumentNode,
  children: ReactNode,
  key: string,
) => ReactNode;

type Context = {
  /** Null when the viewer has no address for the file. */
  fileUrl: (mediaId: string) => string | null;
  quote?: QuoteRenderer;`,
);
sub(
  viewPath,
  `      case "blockquote":
        return (`,
  `      case "blockquote":
        if (context.quote)
          return context.quote(node, children(node, key), key);
        return (`,
);
sub(
  viewPath,
  `        const mediaId = text(node.attrs?.mediaId);
        if (!mediaId) return null;
        const caption`,
  `        const mediaId = text(node.attrs?.mediaId);
        const source = mediaId ? context.fileUrl(mediaId) : null;
        if (!source) return null;
        const caption`,
);
sub(
  viewPath,
  `              src={context.fileUrl(mediaId)}`,
  `              src={source}`,
);
sub(
  viewPath,
  `        const mediaId = text(node.attrs?.mediaId);
        return mediaId ? (
          <p key={key}>
            <a
              href={context.fileUrl(mediaId)}`,
  `        const mediaId = text(node.attrs?.mediaId);
        const href = mediaId ? context.fileUrl(mediaId) : null;
        return href ? (
          <p key={key}>
            <a
              href={href}`,
);
sub(
  viewPath,
  `            className="text-violet-300"
          >
            @{username}`,
  `            className="font-bold text-violet-300 hover:underline"
          >
            @{username}`,
);
sub(
  viewPath,
  `export function EditorDocumentView({
  documentJson,
  fileUrl,
}: {
  documentJson: string;
  fileUrl: (mediaId: string) => string;
}) {`,
  `export function EditorDocumentView({
  documentJson,
  fileUrl,
  quote,
}: {
  documentJson: string;
  fileUrl: Context["fileUrl"];
  quote?: QuoteRenderer;
}) {`,
);
sub(
  viewPath,
  `    return <p>Не вдалося відобразити сторінку.</p>;`,
  `    return <p>Не вдалося відобразити текст.</p>;`,
);
sub(
  viewPath,
  `  const render = renderer({ fileUrl, ...indexDocument(root) });`,
  `  const render = renderer({ fileUrl, quote, ...indexDocument(root) });`,
);

writeFileSync(
  pagePath,
  page.slice(0, page.indexOf("import Link")) +
    `export {
  EditorDocumentView as StaticPageDocument,
  indexDocument,
  safeHref,
  type DocumentNode as PageNode,
} from "@/features/editor/editor-document-view";
`,
);

// 2. Forum posts render through it.
const forum = "apps/web/src/features/forum/forum-document.tsx";
sub(
  forum,
  ` * arrives as an empty \`contentGate\` node and is shown as a lock card. Ordinary
 * blocks reuse the shared News document renderer.`,
  ` * arrives as an empty \`contentGate\` node and is shown as a lock card. Ordinary
 * blocks use the shared editor document view; quotes fold after ten lines.`,
);
sub(
  forum,
  `import { NewsDocument } from "@/features/news/news-document";
`,
  `import {
  EditorDocumentView,
  type QuoteRenderer,
} from "@/features/editor/editor-document-view";

import { ForumQuoteBlock } from "./forum-quote-block";
`,
);
sub(
  forum,
  `/** The shared renderer walks a \`doc\` node, so each run becomes its own doc. */
function chunk(nodes: Node[]): string {
  return JSON.stringify({ type: "doc", content: nodes });
}

export function ForumDocument({ documentJson }: { documentJson: string }) {`,
  `/** The shared view walks an envelope, so each run becomes its own document. */
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
        typeof quotePostId === "string" && /^[\\w-]+$/.test(quotePostId)
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
  );`,
);
sub(
  forum,
  `              <NewsDocument documentJson={chunk(part.gate.content)} />`,
  `              {view(part.gate.content)}`,
);
sub(
  forum,
  `          <NewsDocument key={part.key} documentJson={chunk(part.nodes ?? [])} />`,
  `          <div key={part.key}>{view(part.nodes ?? [])}</div>`,
);

// 3. The post card passes files and hides numbers whose quote is in the text.
const card = "apps/web/src/features/forum/forum-post-card.tsx";
sub(
  card,
  `  const canEdit =
    visible &&`,
  `  // Quotes written into the text show their own header; older posts only
  // remember the numbers.
  const embedded = post.documentJson
    ? forumQuotedNumbers(JSON.parse(post.documentJson))
    : [];
  const quotedElsewhere = post.quotedNumbers.filter(
    (number) => !embedded.includes(number),
  );

  const canEdit =
    visible &&`,
);
sub(
  card,
  `              {post.quotedNumbers.length ? (`,
  `              {quotedElsewhere.length ? (`,
);
sub(
  card,
  `                  {post.quotedNumbers.map((number) => (`,
  `                  {quotedElsewhere.map((number) => (`,
);
let source = readFileSync(card, "utf8").replace(/\r\n/g, "\n");
source = source.replaceAll(
  `<ForumDocument documentJson={post.documentJson} />`,
  `<ForumDocument
                    documentJson={post.documentJson}
                    files={post.attachments}
                  />`,
);
writeFileSync(card, source);
sub(
  card,
  `import { ForumDocument } from "./forum-document";
`,
  `import { ForumDocument } from "./forum-document";
import { forumQuotedNumbers } from "./forum-quote-model";
`,
);

// 4. The editor keeps who a quote is from.
const extensions = "apps/web/src/features/editor/editor-extensions.ts";
sub(
  extensions,
  `import { Node, mergeAttributes, type Extensions } from "@tiptap/core";`,
  `import {
  Extension,
  Node,
  mergeAttributes,
  type Extensions,
} from "@tiptap/core";`,
);
const attribute = (name, key, number) => `      ${key}: {
        default: null,
        parseHTML: (element: HTMLElement) => ${
          number
            ? `Number(element.getAttribute("${name}")) || null`
            : `element.getAttribute("${name}")`
        },
        renderHTML: (attributes: Record<string, unknown>) =>
          attributes.${key} ? { "${name}": String(attributes.${key}) } : {},
      },
`;
sub(
  extensions,
  `const MentionNode = Node.create({`,
  `/** Whose post a forum quote copies; ordinary quotes leave these empty. */
const QuoteSource = Extension.create({
  name: "dssQuoteSource",
  addGlobalAttributes: () => [
    {
      types: ["blockquote"],
      attributes: {
${attribute("data-quote-post", "quotePostId")}${attribute("data-quote-number", "quoteNumber", true)}${attribute("data-quote-author", "quoteAuthor")}      },
    },
  ],
});

const MentionNode = Node.create({`,
);
sub(
  extensions,
  `    CodeBlockNode,
    MentionNode,`,
  `    CodeBlockNode,
    QuoteSource,
    MentionNode,`,
);
sub(
  "apps/web/src/features/editor/dss-editor.module.css",
  `.surface :global(.tiptap code) {`,
  `.surface :global(.tiptap blockquote[data-quote-author])::before {
  display: block;
  color: #94a3b8;
  font-size: 0.75rem;
  font-weight: 600;
  content: attr(data-quote-author) " #" attr(data-quote-number);
}

.surface :global(.tiptap blockquote[data-quote-author]) {
  max-height: 18rem;
  overflow-y: auto;
}

.surface :global(.tiptap code) {`,
);

// 5. The editor accepts blocks pushed by its host (reply and quote buttons).
const editor = "apps/web/src/features/editor/dss-editor.tsx";
sub(
  editor,
  `  onDocumentChange?: (document: EditorDocument) => void;
  onRequestAction`,
  `  onDocumentChange?: (document: EditorDocument) => void;
  /** Blocks to append; a new \`key\` appends again. */
  insertion?: { key: number; blocks: EditorNode[] } | null;
  onRequestAction`,
);
sub(
  editor,
  `  onDocumentChange,
  onRequestAction,
}: DssEditorProps) {`,
  `  onDocumentChange,
  insertion = null,
  onRequestAction,
}: DssEditorProps) {`,
);
sub(
  editor,
  `  const selectedState = useEditorState({`,
  `  const inserted = useRef(0);
  useEffect(() => {
    if (!editor || !insertion || inserted.current === insertion.key) return;
    inserted.current = insertion.key;
    // A quote is followed by an empty line to answer on.
    const blocks =
      insertion.blocks.at(-1)?.type === "blockquote"
        ? [...insertion.blocks, { type: "paragraph" }]
        : insertion.blocks;
    const { doc } = editor.state;
    const blank =
      doc.childCount === 1 &&
      doc.firstChild?.type.name === "paragraph" &&
      doc.firstChild.content.size === 0;
    editor
      .chain()
      .insertContentAt(
        blank ? { from: 0, to: doc.content.size } : doc.content.size,
        blocks,
      )
      .focus("end", { scrollIntoView: false })
      .run();
  }, [editor, insertion]);
  const selectedState = useEditorState({`,
);
sub(
  editor,
  `import { Fragment, useMemo, useState } from "react";`,
  `import { Fragment, useEffect, useMemo, useRef, useState } from "react";`,
);

// 6. Composer, event and buttons.
const controls = "apps/web/src/features/forum/forum-topic-controls.tsx";
sub(
  controls,
  `export type ForumReplyTarget = { number: number; quote: boolean };`,
  `export type ForumReplyTarget = {
  number: number;
  quote: boolean;
  /** What the editor receives: the nickname or the quoted post. */
  block: EditorNode | null;
};`,
);
sub(
  controls,
  `import { Bell, BellRing } from "lucide-react";`,
  `import type { EditorNode } from "@dss/editor";
import { Bell, BellRing } from "lucide-react";`,
);

const composer = "apps/web/src/features/forum/forum-reply-composer.tsx";
sub(
  composer,
  ` * Reply form under a topic: DSS Editor (forum reply profile), reply-to and
 * quote targets from post buttons, cooldown and read-only feedback.`,
  ` * Reply form under a topic: DSS Editor (forum reply profile), reply-to and
 * quotes from post buttons, cooldown and read-only feedback.`,
);
sub(
  composer,
  `  const [target, setTarget] = useState<ForumReplyTarget | null>(null);`,
  `  const [target, setTarget] = useState<number | null>(null);
  const [insertion, setInsertion] = useState<{
    key: number;
    blocks: EditorNode[];
  } | null>(null);`,
);
sub(
  composer,
  `    const listener = (event: Event) =>
      setTarget((event as CustomEvent<ForumReplyTarget>).detail);`,
  `    let key = 0;
    const listener = (event: Event) => {
      const { number, quote, block } = (event as CustomEvent<ForumReplyTarget>)
        .detail;
      if (!quote) setTarget(number);
      if (block) setInsertion({ key: ++key, blocks: [block] });
    };`,
);
sub(
  composer,
  `          replyToNumber: target && !target.quote ? target.number : null,
          quotedNumbers: target?.quote ? [target.number] : [],`,
  `          replyToNumber: target,
          quotedNumbers: forumQuotedNumbers(document),`,
);
sub(
  composer,
  `      setTarget(null);
      router.push`,
  `      setTarget(null);
      setInsertion(null);
      router.push`,
);
sub(
  composer,
  `            {target.quote ? "Цитата" : "Відповідь на"} #{target.number}`,
  `            Відповідь на #{target}`,
);
sub(composer, `        {target ? (`, `        {target !== null ? (`);
sub(
  composer,
  `        onDocumentChange={setDocument}
        ariaLabel`,
  `        onDocumentChange={setDocument}
        insertion={insertion}
        ariaLabel`,
);
sub(
  composer,
  `import { createEmptyEditorDocument, type EditorDocument } from "@dss/editor";`,
  `import {
  createEmptyEditorDocument,
  type EditorDocument,
  type EditorNode,
} from "@dss/editor";`,
);
sub(
  composer,
  `import { createForumReply } from "./forum-actions";
`,
  `import { createForumReply } from "./forum-actions";
import { forumQuotedNumbers } from "./forum-quote-model";
`,
);

const bar = "apps/web/src/features/forum/forum-post-action-bar.tsx";
sub(
  bar,
  `  post: Readonly<{ id: string; number: number; state: string }>;`,
  `  post: Readonly<{
    id: string;
    number: number;
    state: string;
    documentJson?: string | null;
    author?: {
      id: string;
      username: string;
      displayName?: string | null;
    } | null;
  }>;`,
);
sub(
  bar,
  `          onClick={() =>
            targetForumReply({ number: post.number, quote: false })
          }`,
  `          onClick={() =>
            targetForumReply({
              number: post.number,
              quote: false,
              block: post.author ? forumReplyMention(post.author) : null,
            })
          }`,
);
sub(
  bar,
  `          disabled={!canReply || !visible}
          onClick={() => targetForumReply({ number: post.number, quote: true })}`,
  `          disabled={!canReply || !visible || !post.documentJson}
          onClick={() =>
            targetForumReply({
              number: post.number,
              quote: true,
              block: forumQuoteNode({
                postId: post.id,
                number: post.number,
                authorName: forumMemberName(post.author),
                documentJson: post.documentJson ?? "",
              }),
            })
          }`,
);
sub(
  bar,
  `import { ForumPostNetworkDialog } from "./forum-post-network-dialog";
`,
  `import { forumMemberName } from "./forum-format";
import { ForumPostNetworkDialog } from "./forum-post-network-dialog";
import { forumQuoteNode, forumReplyMention } from "./forum-quote-model";
`,
);

// 7. Moderators and admins cancel a reputation change from the journal.
sub(
  "apps/api/src/modules/reputation/presentation/graphql/resolvers/reputation.resolver.ts",
  `  reputationHistory(
    @Args('userId', { type: () => ID }) userId: string,
    @Args('pagination', { nullable: true }) pagination?: ReputationPageInput,
  ): Promise<ReputationHistory> {
    return this.reputation.history(userId, pagination?.page, pagination?.limit);
  }`,
  `  async reputationHistory(
    @AuthUser() viewer: AuthenticatedUser,
    @Args('userId', { type: () => ID }) userId: string,
    @Args('pagination', { nullable: true }) pagination?: ReputationPageInput,
  ): Promise<ReputationHistory & { viewerCanReverse: boolean }> {
    const history = await this.reputation.history(
      userId,
      pagination?.page,
      pagination?.limit,
    );
    return {
      ...history,
      viewerCanReverse: viewer.permissions.includes(
        Permission.ReputationReverse,
      ),
    };
  }`,
);
