/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: DSS Editor Frontend
 * 📄 File: apps/web/src/features/editor/dss-editor.tsx
 *
 * 🎯 Purpose:
 * Provides the reusable SSR-safe Tiptap surface and custom DSS toolbar.
 *
 * 🧠 Responsibilities:
 * • resolves product profiles into permission-aware toolbar groups;
 * • executes local formatting commands through the headless editor engine;
 * • delegates DSS dialogs such as Media, AI and Content Gate to host modules;
 * • serializes versioned canonical JSON for forms and GraphQL workflows.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

"use client";

import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import {
  AlignCenter,
  AlignLeft,
  AtSign,
  Bold,
  Braces,
  Code,
  FileImage,
  Heading2,
  Italic,
  Link2,
  List,
  ListOrdered,
  LockKeyhole,
  Paperclip,
  Quote,
  Redo2,
  Sparkles,
  Strikethrough,
  Undo2,
  Video,
  type LucideIcon,
} from "lucide-react";
import type {
  EditorDocument,
  EditorPermission,
  EditorProfile,
  EditorToolId,
} from "@dss/editor";
import {
  createEmptyEditorDocument,
  DSS_EDITOR_SCHEMA_VERSION,
  EDITOR_TOOL_DEFINITIONS,
  getEditorProfileDefinition,
  resolveEditorProfile,
} from "@dss/editor";
import { Fragment, useMemo } from "react";

import { createEditorExtensions } from "./editor-extensions";
import styles from "./dss-editor.module.css";

type DialogToolId = Extract<
  EditorToolId,
  | "link"
  | "mention"
  | "image"
  | "video"
  | "attachment"
  | "contentGate"
  | "aiAssist"
>;

export type DssEditorActionRequest = {
  profile: EditorProfile;
  toolId: DialogToolId;
};

type DssEditorProps = {
  profile: EditorProfile;
  permissions?: readonly EditorPermission[];
  initialDocument?: EditorDocument;
  name?: string;
  editable?: boolean;
  ariaLabel?: string;
  onDocumentChange?: (document: EditorDocument) => void;
  onRequestAction?: (request: DssEditorActionRequest) => void;
};

const NO_EDITOR_PERMISSIONS: readonly EditorPermission[] = [];

const TOOL_PRESENTATION: Record<
  EditorToolId,
  { label: string; icon: LucideIcon }
> = {
  bold: { label: "Bold", icon: Bold },
  italic: { label: "Italic", icon: Italic },
  strike: { label: "Strike", icon: Strikethrough },
  inlineCode: { label: "Inline code", icon: Code },
  alignLeft: { label: "Align left", icon: AlignLeft },
  alignCenter: { label: "Align center", icon: AlignCenter },
  link: { label: "Insert link", icon: Link2 },
  heading: { label: "Heading", icon: Heading2 },
  bulletList: { label: "Bullet list", icon: List },
  orderedList: { label: "Ordered list", icon: ListOrdered },
  blockquote: { label: "Quote", icon: Quote },
  codeBlock: { label: "Code block", icon: Braces },
  mention: { label: "Mention user", icon: AtSign },
  image: { label: "Insert image", icon: FileImage },
  video: { label: "Insert video", icon: Video },
  attachment: { label: "Attach file", icon: Paperclip },
  contentGate: { label: "Hidden content", icon: LockKeyhole },
  aiAssist: { label: "DSS AI Core", icon: Sparkles },
  undo: { label: "Undo", icon: Undo2 },
  redo: { label: "Redo", icon: Redo2 },
};

export function DssEditor({
  profile,
  permissions = NO_EDITOR_PERMISSIONS,
  initialDocument,
  name = "documentJson",
  editable = true,
  ariaLabel = "DSS Editor",
  onDocumentChange,
  onRequestAction,
}: DssEditorProps) {
  const definition = getEditorProfileDefinition(profile);
  const resolved = useMemo(
    () => resolveEditorProfile(profile, permissions),
    [permissions, profile],
  );
  const document = initialDocument ?? createEmptyEditorDocument(profile);
  const extensions = useMemo(() => createEditorExtensions(profile), [profile]);
  const editor = useEditor({
    extensions,
    content: document.content,
    editable,
    immediatelyRender: false,
    onUpdate: ({ editor: current }) => {
      onDocumentChange?.({
        schemaVersion: DSS_EDITOR_SCHEMA_VERSION,
        profile,
        content: current.getJSON() as EditorDocument["content"],
      });
    },
  });
  const selectedState = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      json: current?.getJSON() ?? document.content,
      characters: current?.getText().length ?? 0,
      bold: current?.isActive("bold") ?? false,
      italic: current?.isActive("italic") ?? false,
      strike: current?.isActive("strike") ?? false,
      inlineCode: current?.isActive("code") ?? false,
      alignCenter: current?.isActive({ textAlign: "center" }) ?? false,
      heading: current?.isActive("heading", { level: 2 }) ?? false,
      bulletList: current?.isActive("bulletList") ?? false,
      orderedList: current?.isActive("orderedList") ?? false,
      blockquote: current?.isActive("blockquote") ?? false,
      codeBlock: current?.isActive("codeBlock") ?? false,
      canUndo: current?.can().undo() ?? false,
      canRedo: current?.can().redo() ?? false,
    }),
  });
  const state = selectedState ?? {
    json: document.content,
    characters: 0,
    bold: false,
    italic: false,
    strike: false,
    inlineCode: false,
    alignCenter: false,
    heading: false,
    bulletList: false,
    orderedList: false,
    blockquote: false,
    codeBlock: false,
    canUndo: false,
    canRedo: false,
  };
  const canonical: EditorDocument = {
    schemaVersion: DSS_EDITOR_SCHEMA_VERSION,
    profile,
    content: state.json as EditorDocument["content"],
  };

  const isActive = (toolId: EditorToolId): boolean => {
    if (toolId === "alignLeft") return !state.alignCenter;
    if (toolId === "alignCenter") return state.alignCenter;
    if (
      toolId in state &&
      typeof state[toolId as keyof typeof state] === "boolean"
    ) {
      return state[toolId as keyof typeof state] as boolean;
    }
    return false;
  };
  const isDisabled = (toolId: EditorToolId): boolean => {
    if (!editor) return true;
    if (toolId === "undo") return !state.canUndo;
    if (toolId === "redo") return !state.canRedo;
    return (
      EDITOR_TOOL_DEFINITIONS[toolId].action === "DIALOG" && !onRequestAction
    );
  };
  const requestDialog = (toolId: EditorToolId): void => {
    if (EDITOR_TOOL_DEFINITIONS[toolId].action !== "DIALOG") return;
    onRequestAction?.({ profile, toolId: toolId as DialogToolId });
  };
  const runTool = (toolId: EditorToolId): void => {
    if (!editor) return;
    const chain = editor.chain().focus();
    switch (toolId) {
      case "bold":
        chain.toggleBold().run();
        break;
      case "italic":
        chain.toggleItalic().run();
        break;
      case "strike":
        chain.toggleStrike().run();
        break;
      case "inlineCode":
        chain.toggleCode().run();
        break;
      case "alignLeft":
        chain.setTextAlign("left").run();
        break;
      case "alignCenter":
        chain.setTextAlign("center").run();
        break;
      case "heading":
        chain.toggleHeading({ level: 2 }).run();
        break;
      case "bulletList":
        chain.toggleBulletList().run();
        break;
      case "orderedList":
        chain.toggleOrderedList().run();
        break;
      case "blockquote":
        chain.toggleBlockquote().run();
        break;
      case "codeBlock":
        chain.toggleCodeBlock().run();
        break;
      case "undo":
        chain.undo().run();
        break;
      case "redo":
        chain.redo().run();
        break;
      default:
        requestDialog(toolId);
    }
  };

  return (
    <section className={styles.shell} aria-label={ariaLabel}>
      {editable ? (
        <div
          className={styles.toolbar}
          role="toolbar"
          aria-label="Editor tools"
        >
          {resolved.toolbar.map((group, groupIndex) => (
            <Fragment key={group.id}>
              {groupIndex > 0 ? <span className={styles.divider} /> : null}
              {group.tools.map((toolId) => {
                const presentation = TOOL_PRESENTATION[toolId];
                const Icon = presentation.icon;
                return (
                  <Tool
                    key={toolId}
                    label={presentation.label}
                    active={isActive(toolId)}
                    disabled={isDisabled(toolId)}
                    onClick={() => runTool(toolId)}
                  >
                    <Icon size={16} />
                  </Tool>
                );
              })}
            </Fragment>
          ))}
        </div>
      ) : null}
      <EditorContent className={styles.surface} editor={editor} />
      <input
        type="hidden"
        name={name}
        value={JSON.stringify(canonical)}
        readOnly
      />
      <div className={styles.meta}>
        <span>
          {profile} · schema v{DSS_EDITOR_SCHEMA_VERSION}
        </span>
        <span>
          {state.characters.toLocaleString()} /{" "}
          {definition.maxCharacters.toLocaleString()}
        </span>
      </div>
    </section>
  );
}

function Tool({
  label,
  active = false,
  disabled = false,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      data-active={active}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

/** Tiptap flies the engine; every visible switch still belongs to DSS. */
