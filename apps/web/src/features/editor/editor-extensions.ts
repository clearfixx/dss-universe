/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: DSS Editor Frontend
 * 📄 File: apps/web/src/features/editor/editor-extensions.ts
 *
 * 🎯 Purpose:
 * Maps DSS Editor profiles and custom canonical nodes to Tiptap extensions.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Node, mergeAttributes, type Extensions } from "@tiptap/core";
import TextAlign from "@tiptap/extension-text-align";
import StarterKit from "@tiptap/starter-kit";
import type { EditorProfile } from "@dss/editor";
import { getEditorProfileDefinition } from "@dss/editor";

const MentionNode = Node.create({
  name: "mention",
  group: "inline",
  inline: true,
  atom: true,
  addAttributes: () => ({
    userId: { default: null },
    username: { default: null },
  }),
  parseHTML: () => [{ tag: "span[data-dss-mention]" }],
  renderHTML: ({ HTMLAttributes }) => [
    "span",
    mergeAttributes(HTMLAttributes, { "data-dss-mention": "" }),
    `@${String(HTMLAttributes.username ?? "")}`,
  ],
});

const MediaReferenceNode = Node.create({
  name: "mediaReference",
  group: "block",
  atom: true,
  addAttributes: () => ({
    mediaId: { default: null },
    alt: { default: "" },
    caption: { default: "" },
  }),
  parseHTML: () => [{ tag: "figure[data-dss-media-id]" }],
  renderHTML: ({ HTMLAttributes }) => [
    "figure",
    mergeAttributes(HTMLAttributes, {
      "data-dss-media-id": HTMLAttributes.mediaId,
    }),
    ["div", { class: "dss-editor-media-placeholder" }, "DSS Media"],
  ],
});

const AttachmentNode = Node.create({
  name: "attachment",
  group: "block",
  atom: true,
  addAttributes: () => ({ mediaId: { default: null }, label: { default: "" } }),
  parseHTML: () => [{ tag: "div[data-dss-attachment-id]" }],
  renderHTML: ({ HTMLAttributes }) => [
    "div",
    mergeAttributes(HTMLAttributes, {
      "data-dss-attachment-id": HTMLAttributes.mediaId,
    }),
    `📎 ${String(HTMLAttributes.label ?? "Attachment")}`,
  ],
});

const ContentGateNode = Node.create({
  name: "contentGate",
  group: "block",
  content: "block+",
  defining: true,
  addAttributes: () => ({ gateId: { default: null } }),
  parseHTML: () => [{ tag: "section[data-dss-content-gate]" }],
  renderHTML: ({ HTMLAttributes }) => [
    "section",
    mergeAttributes(HTMLAttributes, { "data-dss-content-gate": "" }),
    0,
  ],
});

const CodeBlockNode = Node.create({
  name: "codeBlock",
  group: "block",
  content: "text*",
  marks: "",
  code: true,
  defining: true,
  addAttributes: () => ({ language: { default: "plaintext" } }),
  parseHTML: () => [{ tag: "pre" }],
  renderHTML: ({ HTMLAttributes }) => [
    "pre",
    { "data-language": HTMLAttributes.language },
    ["code", 0],
  ],
});

const TableNode = Node.create({
  name: "table",
  group: "block",
  content: "tableRow+",
  isolating: true,
  parseHTML: () => [{ tag: "table[data-dss-table]" }],
  renderHTML: ({ HTMLAttributes }) => [
    "table",
    mergeAttributes(HTMLAttributes, { "data-dss-table": "" }),
    ["tbody", 0],
  ],
});

const TableRowNode = Node.create({
  name: "tableRow",
  content: "(tableHeader|tableCell)+",
  parseHTML: () => [{ tag: "tr" }],
  renderHTML: ({ HTMLAttributes }) => ["tr", HTMLAttributes, 0],
});

const TableHeaderNode = Node.create({
  name: "tableHeader",
  content: "block+",
  isolating: true,
  parseHTML: () => [{ tag: "th" }],
  renderHTML: ({ HTMLAttributes }) => ["th", HTMLAttributes, 0],
});

const TableCellNode = Node.create({
  name: "tableCell",
  content: "block+",
  isolating: true,
  parseHTML: () => [{ tag: "td" }],
  renderHTML: ({ HTMLAttributes }) => ["td", HTMLAttributes, 0],
});

const TaskListNode = Node.create({
  name: "taskList",
  group: "block",
  content: "taskItem+",
  parseHTML: () => [{ tag: 'ul[data-type="taskList"]' }],
  renderHTML: ({ HTMLAttributes }) => [
    "ul",
    mergeAttributes(HTMLAttributes, { "data-type": "taskList" }),
    0,
  ],
});

const TaskItemNode = Node.create({
  name: "taskItem",
  content: "paragraph block*",
  defining: true,
  addAttributes: () => ({ checked: { default: false } }),
  addNodeView:
    () =>
    ({ editor, getPos, node }) => {
      const dom = document.createElement("li");
      const checkbox = document.createElement("input");
      const contentDOM = document.createElement("div");
      dom.dataset.type = "taskItem";
      checkbox.type = "checkbox";
      checkbox.checked = node.attrs.checked === true;
      checkbox.setAttribute("aria-label", "Toggle task");
      checkbox.contentEditable = "false";
      const updateChecked = (): void => {
        if (typeof getPos !== "function") return;
        const position = getPos();
        if (position === undefined) return;
        editor.view.dispatch(
          editor.state.tr.setNodeMarkup(position, undefined, {
            ...node.attrs,
            checked: checkbox.checked,
          }),
        );
      };
      checkbox.addEventListener("change", updateChecked);
      dom.append(checkbox, contentDOM);
      return {
        dom,
        contentDOM,
        update: (updatedNode) => {
          if (updatedNode.type.name !== "taskItem") return false;
          node = updatedNode;
          checkbox.checked = updatedNode.attrs.checked === true;
          return true;
        },
        destroy: () => checkbox.removeEventListener("change", updateChecked),
      };
    },
  parseHTML: () => [{ tag: 'li[data-type="taskItem"]' }],
  renderHTML: ({ HTMLAttributes }) => [
    "li",
    mergeAttributes(HTMLAttributes, { "data-type": "taskItem" }),
    [
      "input",
      {
        type: "checkbox",
        disabled: "",
        ...(HTMLAttributes.checked ? { checked: "" } : {}),
      },
    ],
    ["div", 0],
  ],
});

const FootnoteReferenceNode = Node.create({
  name: "footnoteReference",
  group: "inline",
  inline: true,
  atom: true,
  addAttributes: () => ({ noteId: { default: null } }),
  parseHTML: () => [{ tag: "sup[data-dss-footnote-reference]" }],
  renderHTML: ({ HTMLAttributes }) => [
    "sup",
    mergeAttributes(HTMLAttributes, { "data-dss-footnote-reference": "" }),
    `[${String(HTMLAttributes.noteId ?? "")}]`,
  ],
});

const FootnoteDefinitionNode = Node.create({
  name: "footnoteDefinition",
  group: "block",
  content: "block+",
  defining: true,
  addAttributes: () => ({ noteId: { default: null } }),
  parseHTML: () => [{ tag: "aside[data-dss-footnote-definition]" }],
  renderHTML: ({ HTMLAttributes }) => [
    "aside",
    mergeAttributes(HTMLAttributes, { "data-dss-footnote-definition": "" }),
    [
      "span",
      { "aria-hidden": "true" },
      `[${String(HTMLAttributes.noteId ?? "")}]`,
    ],
    ["div", 0],
  ],
});

const TableOfContentsNode = Node.create({
  name: "tableOfContents",
  group: "block",
  atom: true,
  parseHTML: () => [{ tag: "nav[data-dss-table-of-contents]" }],
  renderHTML: ({ HTMLAttributes }) => [
    "nav",
    mergeAttributes(HTMLAttributes, {
      "aria-label": "Table of contents",
      "data-dss-table-of-contents": "",
    }),
    "Table of contents",
  ],
});

export function createEditorExtensions(profile: EditorProfile): Extensions {
  const definition = getEditorProfileDefinition(profile);
  const extensions: Extensions = [
    StarterKit.configure({
      codeBlock: false,
      heading:
        definition.headingLevels.length > 0
          ? { levels: [...definition.headingLevels] as [1, 2, 3, 4] }
          : false,
      link: {
        autolink: true,
        openOnClick: false,
        defaultProtocol: "https",
        protocols: ["http", "https", "mailto"],
        HTMLAttributes: { rel: "nofollow ugc noopener noreferrer" },
      },
    }),
    TextAlign.configure({
      types:
        definition.headingLevels.length > 0
          ? ["heading", "paragraph"]
          : ["paragraph"],
      alignments: ["left", "center"],
      defaultAlignment: "left",
    }),
    CodeBlockNode,
    MentionNode,
    MediaReferenceNode,
    AttachmentNode,
  ];

  if (definition.allowedNodes.includes("contentGate")) {
    extensions.push(ContentGateNode);
  }
  if (definition.allowedNodes.includes("table")) {
    extensions.push(
      TableNode,
      TableRowNode,
      TableHeaderNode,
      TableCellNode,
      TaskListNode,
      TaskItemNode,
      FootnoteReferenceNode,
      FootnoteDefinitionNode,
      TableOfContentsNode,
    );
  }
  return extensions;
}

/** Tiptap supplies the engine; DSS decides which controls may leave the cockpit. */
