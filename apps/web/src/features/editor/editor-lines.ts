/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: DSS Editor Frontend
 * 📄 File: apps/web/src/features/editor/editor-lines.ts
 *
 * 🎯 Purpose:
 * Makes block formatting apply to the selected lines only. Lines separated by
 * soft breaks share one paragraph, so they are split into real paragraphs
 * before alignment, lists, headings, quotes or code blocks are applied.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { Editor } from "@tiptap/core";

/**
 * Splits paragraphs at the soft breaks around the selection. With `everyLine`
 * each selected line also becomes its own paragraph (lists need that).
 */
export function isolateSelectedLines(
  editor: Editor,
  { everyLine = false }: { everyLine?: boolean } = {},
): void {
  const { state } = editor;
  const { from, to } = state.selection;
  const splits: number[] = [];
  state.doc.nodesBetween(from, to, (node, position) => {
    if (node.type.name !== "paragraph") return true;
    const breaks: number[] = [];
    node.forEach((child, offset) => {
      if (child.type.name === "hardBreak") breaks.push(position + 1 + offset);
    });
    const before = breaks.filter((at) => at < from).at(-1);
    const after = breaks.find((at) => at >= to);
    if (before !== undefined) splits.push(before);
    if (after !== undefined) splits.push(after);
    if (everyLine) splits.push(...breaks.filter((at) => at >= from && at < to));
    return false;
  });
  if (!splits.length) return;
  const transaction = state.tr;
  // From the end, so earlier positions stay valid.
  for (const at of splits.sort((a, b) => b - a))
    transaction.delete(at, at + 1).split(at);
  editor.view.dispatch(transaction);
}

/**
 * Turns every selected line into one code block. A code block holds plain
 * text only, so lines are joined with newlines instead of being lost.
 */
export function wrapSelectionInCodeBlock(editor: Editor): boolean {
  isolateSelectedLines(editor);
  const { $from, $to } = editor.state.selection;
  const range = $from.blockRange($to);
  if (!range) return false;
  const lines: string[] = [];
  for (let index = range.startIndex; index < range.endIndex; index += 1) {
    const block = range.parent.child(index);
    if (!block.isTextblock) return false;
    lines.push(
      block.textBetween(0, block.content.size, "\n", (leaf) => {
        if (leaf.type.name === "hardBreak") return "\n";
        return leaf.type.name === "mention"
          ? `@${String(leaf.attrs.username ?? "")}`
          : "";
      }),
    );
  }
  const text = lines.join("\n");
  return editor
    .chain()
    .focus()
    .insertContentAt(
      { from: range.start, to: range.end },
      {
        type: "codeBlock",
        attrs: { language: "plaintext" },
        content: text ? [{ type: "text", text }] : [],
      },
    )
    .run();
}
