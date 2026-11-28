import { sub } from "./sub.mjs";
const dir = "apps/web/src/features/editor";

sub(
  `${dir}/editor-extensions.ts`,
  `  addAttributes: () => ({ language: { default: "plaintext" } }),
  parseHTML: () => [{ tag: "pre" }],`,
  `  addAttributes: () => ({ language: { default: "plaintext" } }),
  addCommands() {
    return {
      toggleCodeBlock:
        () =>
        ({ commands }) =>
          commands.toggleNode(this.name, "paragraph"),
    };
  },
  parseHTML: () => [{ tag: "pre", preserveWhitespace: "full" as const }],`,
);

const editor = `${dir}/dss-editor.tsx`;
sub(
  editor,
  `    const chain = editor.chain().focus();
    switch`,
  `    if (LINE_TOOLS.has(toolId) && !state.codeBlock) {
      if (toolId === "codeBlock") {
        wrapSelectionInCodeBlock(editor);
        return;
      }
      isolateSelectedLines(editor, {
        everyLine: toolId === "bulletList" || toolId === "orderedList",
      });
    }
    const chain = editor.chain().focus();
    switch`,
);
sub(
  editor,
  "const TOOL_PRESENTATION",
  `/** Block tools: they must touch the selected lines, not the whole paragraph. */
const LINE_TOOLS = new Set<EditorToolId>([
  "alignLeft",
  "alignCenter",
  "heading",
  "bulletList",
  "orderedList",
  "blockquote",
  "codeBlock",
]);

const TOOL_PRESENTATION`,
);
sub(
  editor,
  `import { createEditorExtensions } from "./editor-extensions";
`,
  `import { createEditorExtensions } from "./editor-extensions";
import { isolateSelectedLines, wrapSelectionInCodeBlock } from "./editor-lines";
`,
);

sub(
  `${dir}/dss-editor.module.css`,
  ".surface :global(.tiptap ul),",
  `/* Tailwind preflight removes list markers and heading sizes. */
.surface :global(.tiptap ul) {
  list-style: disc;
}

.surface :global(.tiptap ol) {
  list-style: decimal;
}

.surface :global(.tiptap h1) {
  font-size: 1.6rem;
}

.surface :global(.tiptap h2) {
  font-size: 1.4rem;
}

.surface :global(.tiptap h3) {
  font-size: 1.2rem;
}

.surface :global(.tiptap h4) {
  font-size: 1.05rem;
}

.surface :global(.tiptap [data-dss-mention]) {
  color: #c4b5fd;
  font-weight: 700;
}

.surface :global(.tiptap ul),`,
);
