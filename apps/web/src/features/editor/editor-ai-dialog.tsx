/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 🤖 Module: DSS Editor Frontend
 * 📄 File: apps/web/src/features/editor/editor-ai-dialog.tsx
 *
 * 🎯 Purpose:
 * Provides the custom, human-confirmed DSS AI Core editor command dialog.
 *
 * 🧠 Responsibilities:
 * • collects command-specific author intent;
 * • makes external processing explicit;
 * • previews labeled generated text before insertion;
 * • returns a suggestion only after a separate Apply action.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

"use client";

import { Bot, Check, Sparkles } from "lucide-react";
import { useState, useTransition } from "react";

import type { EditorProfile } from "@dss/editor";
import type { EditorAiCommand } from "@/gql/graphql";

import {
  runEditorAiCommand,
  type EditorAiCommandSuggestion,
} from "./editor-actions";
import styles from "./editor-ai-dialog.module.css";

const COMMANDS: Array<{ value: EditorAiCommand; label: string }> = [
  { value: "Generate", label: "Generate" },
  { value: "Rewrite", label: "Rewrite selection" },
  { value: "Expand", label: "Expand selection" },
  { value: "Shorten", label: "Shorten selection" },
  { value: "Explain", label: "Explain selection" },
  { value: "GenerateCode", label: "Generate code" },
];

export type EditorAiSelection = Pick<
  EditorAiCommandSuggestion,
  "command" | "generatedText"
> & { language: string | null };

export function EditorAiDialog({
  profile,
  sourceText,
  onClose,
  onApply,
}: {
  profile: EditorProfile;
  sourceText: string;
  onClose: () => void;
  onApply: (selection: EditorAiSelection) => void;
}) {
  const [command, setCommand] = useState<EditorAiCommand>(
    sourceText ? "Rewrite" : "Generate",
  );
  const [instruction, setInstruction] = useState("");
  const [language, setLanguage] = useState("typescript");
  const [confirmed, setConfirmed] = useState(false);
  const [suggestion, setSuggestion] =
    useState<EditorAiCommandSuggestion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const requiresSource: boolean = [
    "Rewrite",
    "Expand",
    "Shorten",
    "Explain",
  ].includes(command);
  const generate = (): void => {
    setError(null);
    setSuggestion(null);
    startTransition(async () => {
      try {
        const result = await runEditorAiCommand({
          command,
          profile,
          sourceText: sourceText || undefined,
          instruction: instruction.trim() || undefined,
          language: command === "GenerateCode" ? language : undefined,
          externalProcessingConfirmed: true,
        });
        setSuggestion(result);
      } catch (reason) {
        setError(
          reason instanceof Error
            ? reason.message
            : "DSS AI Core command failed.",
        );
      }
    });
  };

  return (
    <div className={styles.backdrop} role="presentation" onMouseDown={onClose}>
      <section
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label="DSS AI Core editor assistant"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <span>
            <Bot aria-hidden="true" /> <strong>DSS AI Core</strong>
          </span>
          <button type="button" onClick={onClose} aria-label="Close dialog">
            ×
          </button>
        </header>
        <p>Generate a proposal, review it, then decide whether to apply it.</p>
        <label>
          Command
          <select
            value={command}
            onChange={(event) => {
              setCommand(event.target.value as EditorAiCommand);
              setSuggestion(null);
            }}
          >
            {COMMANDS.map(({ value, label }) => (
              <option
                key={value}
                value={value}
                disabled={
                  !sourceText && !["Generate", "GenerateCode"].includes(value)
                }
              >
                {label}
              </option>
            ))}
          </select>
        </label>
        {sourceText ? (
          <aside>
            <strong>Selected text</strong>
            <span>{sourceText}</span>
          </aside>
        ) : requiresSource ? (
          <p className={styles.error}>Select text before using this command.</p>
        ) : null}
        <label>
          Author instruction
          <textarea
            maxLength={1000}
            rows={3}
            value={instruction}
            placeholder="Describe the result you want…"
            onChange={(event) => setInstruction(event.target.value)}
          />
        </label>
        {command === "GenerateCode" ? (
          <label>
            Code language
            <input
              maxLength={64}
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
            />
          </label>
        ) : null}
        <label className={styles.consent}>
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(event) => setConfirmed(event.target.checked)}
          />
          Send this text and instruction to the configured external AI provider.
        </label>
        <button
          className={styles.generate}
          type="button"
          disabled={pending || !confirmed || (requiresSource && !sourceText)}
          onClick={generate}
        >
          <Sparkles aria-hidden="true" size={16} />
          {pending ? "Generating…" : "Generate proposal"}
        </button>
        {error ? <p className={styles.error}>{error}</p> : null}
        {suggestion ? (
          <section
            className={styles.preview}
            aria-label="AI suggestion preview"
          >
            <span>{suggestion.generatedContentLabel}</span>
            <pre>{suggestion.generatedText}</pre>
            <small>Model: {suggestion.model}</small>
          </section>
        ) : null}
        <footer>
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            disabled={!suggestion || !suggestion.requiresConfirmation}
            onClick={() =>
              suggestion &&
              onApply({
                command: suggestion.command,
                generatedText: suggestion.generatedText,
                language: command === "GenerateCode" ? language : null,
              })
            }
          >
            <Check aria-hidden="true" size={16} /> Apply to editor
          </button>
        </footer>
      </section>
    </div>
  );
}

/** Copilot has a proposal; Commander still has the Apply button. */
