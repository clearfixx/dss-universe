/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: DSS Editor Frontend
 * 📄 File: apps/web/src/features/editor/dss-editor.tsx
 *
 * 🎯 Purpose:
 * Provides the reusable SSR-safe Tiptap editing surface for DSS profiles.
 *
 * 🧠 Responsibilities:
 * • initializes Tiptap only inside a narrow Client Component boundary;
 * • exposes profile-specific controls and nodes;
 * • serializes versioned canonical JSON for forms and GraphQL workflows;
 * • never accepts arbitrary HTML as canonical input.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

"use client";

import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import {
  Bold,
  Braces,
  Code,
  Heading2,
  Italic,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Strikethrough,
  Undo2,
} from "lucide-react";
import type { EditorDocument, EditorProfile } from "@dss/editor";
import {
  createEmptyEditorDocument,
  DSS_EDITOR_SCHEMA_VERSION,
  getEditorProfileDefinition,
} from "@dss/editor";
import { useMemo } from "react";

import { createEditorExtensions } from "./editor-extensions";
import styles from "./dss-editor.module.css";

type DssEditorProps = {
  profile: EditorProfile;
  initialDocument?: EditorDocument;
  name?: string;
  editable?: boolean;
  ariaLabel?: string;
};

export function DssEditor({
  profile,
  initialDocument,
  name = "documentJson",
  editable = true,
  ariaLabel = "DSS Editor",
}: DssEditorProps) {
  const definition = getEditorProfileDefinition(profile);
  const document = initialDocument ?? createEmptyEditorDocument(profile);
  const extensions = useMemo(() => createEditorExtensions(profile), [profile]);
  const editor = useEditor({
    extensions,
    content: document.content,
    editable,
    immediatelyRender: false,
  });
  const selectedState = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      json: current?.getJSON() ?? document.content,
      characters: current?.getText().length ?? 0,
      bold: current?.isActive("bold") ?? false,
      italic: current?.isActive("italic") ?? false,
      strike: current?.isActive("strike") ?? false,
      code: current?.isActive("code") ?? false,
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
    code: false,
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

  return (
    <section className={styles.shell} aria-label={ariaLabel}>
      {editable ? (
        <div
          className={styles.toolbar}
          role="toolbar"
          aria-label="Editor tools"
        >
          <Tool
            label="Bold"
            active={state.bold}
            onClick={() => editor?.chain().focus().toggleBold().run()}
          >
            <Bold size={16} />
          </Tool>
          <Tool
            label="Italic"
            active={state.italic}
            onClick={() => editor?.chain().focus().toggleItalic().run()}
          >
            <Italic size={16} />
          </Tool>
          <Tool
            label="Strike"
            active={state.strike}
            onClick={() => editor?.chain().focus().toggleStrike().run()}
          >
            <Strikethrough size={16} />
          </Tool>
          <Tool
            label="Inline code"
            active={state.code}
            onClick={() => editor?.chain().focus().toggleCode().run()}
          >
            <Code size={16} />
          </Tool>
          <span className={styles.divider} />
          {profile !== "COMPACT" ? (
            <Tool
              label="Heading"
              active={state.heading}
              onClick={() =>
                editor?.chain().focus().toggleHeading({ level: 2 }).run()
              }
            >
              <Heading2 size={16} />
            </Tool>
          ) : null}
          <Tool
            label="Bullet list"
            active={state.bulletList}
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
          >
            <List size={16} />
          </Tool>
          <Tool
            label="Ordered list"
            active={state.orderedList}
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          >
            <ListOrdered size={16} />
          </Tool>
          <Tool
            label="Quote"
            active={state.blockquote}
            onClick={() => editor?.chain().focus().toggleBlockquote().run()}
          >
            <Quote size={16} />
          </Tool>
          <Tool
            label="Code block"
            active={state.codeBlock}
            onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
          >
            <Braces size={16} />
          </Tool>
          <span className={styles.divider} />
          <Tool
            label="Undo"
            disabled={!state.canUndo}
            onClick={() => editor?.chain().focus().undo().run()}
          >
            <Undo2 size={16} />
          </Tool>
          <Tool
            label="Redo"
            disabled={!state.canRedo}
            onClick={() => editor?.chain().focus().redo().run()}
          >
            <Redo2 size={16} />
          </Tool>
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

/** The toolbar may sparkle; canonical JSON still wears the flight suit. */
