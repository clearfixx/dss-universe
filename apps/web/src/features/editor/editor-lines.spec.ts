import { Editor } from "@tiptap/core";
import { afterEach, describe, expect, it } from "vitest";

import { createEditorExtensions } from "./editor-extensions";
import { isolateSelectedLines, wrapSelectionInCodeBlock } from "./editor-lines";

let editor: Editor;
afterEach(() => editor?.destroy());

const text = (value: string) => ({ type: "text", text: value });
const br = { type: "hardBreak" };

/** One paragraph with three soft-broken lines, caret inside the second. */
function threeLines() {
  editor = new Editor({
    extensions: createEditorExtensions("FORUM_REPLY"),
    content: {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [text("one"), br, text("two"), br, text("three")],
        },
      ],
    },
  });
  editor.commands.setTextSelection(6);
}

const blocks = () =>
  (editor.getJSON().content ?? []).map((node) => [
    editor.schema.nodeFromJSON(node).textContent,
    node.attrs?.textAlign === "center",
  ]);

describe("editor line formatting", () => {
  it("centres only the line under the caret", () => {
    threeLines();
    isolateSelectedLines(editor);
    editor.commands.setTextAlign("center");
    expect(blocks()).toEqual([
      ["one", false],
      ["two", true],
      ["three", false],
    ]);
  });

  it("makes every selected line its own list item", () => {
    threeLines();
    editor.commands.setTextSelection({ from: 1, to: 14 });
    isolateSelectedLines(editor, { everyLine: true });
    editor.commands.toggleBulletList();
    const list = editor.getJSON().content![0]!;
    expect(list.type).toBe("bulletList");
    expect(list.content).toHaveLength(3);
  });

  it("keeps all selected lines in a code block and can undo it", () => {
    threeLines();
    editor.commands.setTextSelection({ from: 1, to: 14 });
    expect(wrapSelectionInCodeBlock(editor)).toBe(true);
    expect(editor.getJSON().content![0]).toMatchObject({
      type: "codeBlock",
      attrs: { language: "plaintext" },
      content: [text("one\ntwo\nthree")],
    });
    editor.commands.setTextSelection(2);
    expect(editor.commands.toggleCodeBlock()).toBe(true);
    expect(editor.getJSON().content![0]!.type).toBe("paragraph");
  });
});
