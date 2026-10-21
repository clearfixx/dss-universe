/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: DSS Editor Frontend
 * 📄 File: apps/web/src/features/editor/editor-content-gate-dialog.tsx
 *
 * 🎯 Purpose:
 * Provides the custom DSS builder for persisted ALL/ANY Content Gate policies.
 *
 * 🧠 Responsibilities:
 * • collects bounded global eligibility requirements;
 * • distinguishes numeric thresholds from group membership;
 * • persists the policy through a token-safe server action;
 * • returns only the immutable gate ID to the editor document.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

"use client";

import { Plus, ShieldCheck, Trash2 } from "lucide-react";
import { useState } from "react";

import {
  createEditorContentGate,
  type EditorContentGateInput,
} from "./editor-actions";
import styles from "./editor-content-gate-dialog.module.css";

type Requirement = EditorContentGateInput["requirements"][number];
const KINDS: Array<{ value: Requirement["kind"]; label: string }> = [
  { value: "ACCOUNT_AGE_DAYS", label: "Account age (days)" },
  { value: "COMMENTS", label: "Comments" },
  { value: "FORUM_POSTS", label: "Forum topics" },
  { value: "PUBLICATIONS", label: "Publications" },
  { value: "REPUTATION", label: "Reputation" },
  { value: "GROUP", label: "User group" },
];

export function EditorContentGateDialog({
  onClose,
  onSelect,
}: {
  onClose: () => void;
  onSelect: (gateId: string) => void;
}) {
  const [operator, setOperator] = useState<"ALL" | "ANY">("ALL");
  const [requirements, setRequirements] = useState<Requirement[]>([
    { kind: "ACCOUNT_AGE_DAYS", threshold: 30 },
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (index: number, next: Requirement): void => {
    setRequirements((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? next : item)),
    );
  };
  const save = async (): Promise<void> => {
    setSaving(true);
    setError(null);
    try {
      const gate = await createEditorContentGate({ operator, requirements });
      onSelect(gate.id);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Content Gate creation failed.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.backdrop} role="presentation" onMouseDown={onClose}>
      <section
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-label="Configure hidden content"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <span>
            <ShieldCheck aria-hidden="true" /> <strong>Content Gate</strong>
          </span>
          <button type="button" onClick={onClose} aria-label="Close dialog">
            ×
          </button>
        </header>
        <p>
          Show the protected block when {operator === "ALL" ? "all" : "any"}{" "}
          requirements pass.
        </p>
        <div className={styles.operator}>
          {(["ALL", "ANY"] as const).map((value) => (
            <button
              key={value}
              type="button"
              data-active={operator === value}
              onClick={() => setOperator(value)}
            >
              {value === "ALL" ? "All requirements" : "Any requirement"}
            </button>
          ))}
        </div>
        <div className={styles.requirements}>
          {requirements.map((requirement, index) => (
            <div
              className={styles.requirement}
              key={`${requirement.kind}-${index}`}
            >
              <select
                aria-label={`Requirement ${index + 1}`}
                value={requirement.kind}
                onChange={(event) => {
                  const kind = event.target.value as Requirement["kind"];
                  update(
                    index,
                    kind === "GROUP"
                      ? { kind, groupKey: "Premium" }
                      : { kind, threshold: 0 },
                  );
                }}
              >
                {KINDS.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              {requirement.kind === "GROUP" ? (
                <input
                  aria-label="Required group"
                  value={requirement.groupKey ?? ""}
                  onChange={(event) =>
                    update(index, {
                      kind: "GROUP",
                      groupKey: event.target.value,
                    })
                  }
                />
              ) : (
                <input
                  aria-label="Required value"
                  type="number"
                  min={0}
                  value={requirement.threshold ?? 0}
                  onChange={(event) =>
                    update(index, {
                      kind: requirement.kind,
                      threshold: Number(event.target.value),
                    })
                  }
                />
              )}
              <button
                type="button"
                aria-label="Remove requirement"
                disabled={requirements.length === 1}
                onClick={() =>
                  setRequirements((current) =>
                    current.filter((_, itemIndex) => itemIndex !== index),
                  )
                }
              >
                <Trash2 aria-hidden="true" size={16} />
              </button>
            </div>
          ))}
        </div>
        <button
          className={styles.add}
          type="button"
          disabled={requirements.length >= 6}
          onClick={() =>
            setRequirements((current) => [
              ...current,
              { kind: "COMMENTS", threshold: 1 },
            ])
          }
        >
          <Plus aria-hidden="true" size={16} /> Add requirement
        </button>
        <aside>
          Premium always bypasses ordinary gates with a visible notice.
          Moderation restrictions will override it.
        </aside>
        {error ? <p className={styles.error}>{error}</p> : null}
        <footer>
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button type="button" disabled={saving} onClick={() => void save()}>
            {saving ? "Creating…" : "Create gate"}
          </button>
        </footer>
      </section>
    </div>
  );
}

/** Hidden content needs real rules, not a CSS invisibility cloak. */
