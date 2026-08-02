/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: DSS Editor Platform
 * 📄 File: packages/editor/src/validation.ts
 *
 * 🎯 Purpose:
 * Validates untrusted editor JSON against versioned profile allowlists.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import {
  DSS_EDITOR_SCHEMA_VERSION,
  EDITOR_CODE_LANGUAGES,
  EDITOR_PROFILES,
  type EditorDocument,
  type EditorMark,
  type EditorNode,
  type EditorProfile,
} from "./document";
import { getEditorProfileDefinition } from "./profiles";

export type EditorValidationError = {
  path: string;
  code: string;
  message: string;
};

export type EditorValidationResult =
  | { valid: true; document: EditorDocument; errors: [] }
  | { valid: false; errors: EditorValidationError[] };

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SAFE_LINK_PROTOCOLS = new Set(["https:", "http:", "mailto:"]);

export function validateEditorDocument(value: unknown): EditorValidationResult {
  const errors: EditorValidationError[] = [];
  if (!isRecord(value)) {
    return invalid("$", "DOCUMENT_TYPE", "Document must be an object.");
  }
  if (value.schemaVersion !== DSS_EDITOR_SCHEMA_VERSION) {
    errors.push(
      error("schemaVersion", "SCHEMA_VERSION", "Unsupported schema version."),
    );
  }
  if (!isEditorProfile(value.profile)) {
    errors.push(error("profile", "PROFILE", "Unknown editor profile."));
  }
  if (!isRecord(value.content) || value.content.type !== "doc") {
    errors.push(
      error("content", "ROOT_NODE", "Content root must be a doc node."),
    );
  }
  if (errors.length > 0 || !isEditorProfile(value.profile)) {
    return { valid: false, errors };
  }

  const definition = getEditorProfileDefinition(value.profile);
  const counters = { characters: 0, nodes: 0 };
  validateNode(
    value.content as EditorNode,
    "content",
    definition,
    counters,
    errors,
  );
  if (counters.characters > definition.maxCharacters) {
    errors.push(
      error(
        "content",
        "CHARACTER_LIMIT",
        `Document exceeds the ${definition.maxCharacters} character limit.`,
      ),
    );
  }
  if (counters.nodes > definition.maxNodes) {
    errors.push(
      error(
        "content",
        "NODE_LIMIT",
        `Document exceeds the ${definition.maxNodes} node limit.`,
      ),
    );
  }
  if (errors.length > 0) return { valid: false, errors };
  return { valid: true, document: value as EditorDocument, errors: [] };
}

export function assertEditorDocument(value: unknown): EditorDocument {
  const result = validateEditorDocument(value);
  if (!result.valid) {
    throw new Error(
      result.errors
        .map(({ path, message }) => `${path}: ${message}`)
        .join("; "),
    );
  }
  return result.document;
}

function validateNode(
  node: EditorNode,
  path: string,
  definition: ReturnType<typeof getEditorProfileDefinition>,
  counters: { characters: number; nodes: number },
  errors: EditorValidationError[],
): void {
  counters.nodes += 1;
  if (!isRecord(node) || typeof node.type !== "string") {
    errors.push(error(path, "NODE_TYPE", "Node must declare a type."));
    return;
  }
  if (!definition.allowedNodes.includes(node.type)) {
    errors.push(
      error(
        `${path}.type`,
        "NODE_NOT_ALLOWED",
        `Node ${node.type} is not allowed.`,
      ),
    );
    return;
  }
  if (node.type === "text") {
    if (typeof node.text !== "string" || node.text.length === 0) {
      errors.push(
        error(`${path}.text`, "TEXT", "Text nodes require non-empty text."),
      );
    } else {
      counters.characters += node.text.length;
    }
  } else if (node.text !== undefined) {
    errors.push(
      error(
        `${path}.text`,
        "UNEXPECTED_TEXT",
        "Only text nodes may contain text.",
      ),
    );
  }

  validateNodeAttributes(node, path, definition.headingLevels, errors);
  for (const [index, mark] of (node.marks ?? []).entries()) {
    validateMark(
      mark,
      `${path}.marks[${index}]`,
      definition.allowedMarks,
      errors,
    );
  }
  if (node.content !== undefined && !Array.isArray(node.content)) {
    errors.push(
      error(
        `${path}.content`,
        "CONTENT_TYPE",
        "Node content must be an array.",
      ),
    );
    return;
  }
  for (const [index, child] of (node.content ?? []).entries()) {
    validateNode(
      child,
      `${path}.content[${index}]`,
      definition,
      counters,
      errors,
    );
  }
}

function validateNodeAttributes(
  node: EditorNode,
  path: string,
  headingLevels: readonly number[],
  errors: EditorValidationError[],
): void {
  if (node.type === "paragraph" || node.type === "heading") {
    const textAlign = node.attrs?.textAlign;
    if (
      textAlign !== undefined &&
      textAlign !== "left" &&
      textAlign !== "center"
    ) {
      errors.push(
        error(
          `${path}.attrs.textAlign`,
          "TEXT_ALIGNMENT",
          "Text alignment must be left or center.",
        ),
      );
    }
  }
  if (
    node.type === "heading" &&
    !headingLevels.includes(numberAttr(node, "level"))
  ) {
    errors.push(
      error(
        `${path}.attrs.level`,
        "HEADING_LEVEL",
        "Heading level is not allowed.",
      ),
    );
  }
  if (
    node.type === "codeBlock" &&
    !EDITOR_CODE_LANGUAGES.includes(
      stringAttr(node, "language") as (typeof EDITOR_CODE_LANGUAGES)[number],
    )
  ) {
    errors.push(
      error(
        `${path}.attrs.language`,
        "CODE_LANGUAGE",
        "Code language is invalid.",
      ),
    );
  }
  if (node.type === "mention") {
    requireUuidAttr(node, path, "userId", errors);
    requireBoundedStringAttr(node, path, "username", 1, 32, errors);
  }
  if (node.type === "mediaReference") {
    requireUuidAttr(node, path, "mediaId", errors);
    optionalBoundedStringAttr(node, path, "alt", 500, errors);
    optionalBoundedStringAttr(node, path, "caption", 1000, errors);
  }
  if (node.type === "attachment") {
    requireUuidAttr(node, path, "mediaId", errors);
    requireBoundedStringAttr(node, path, "label", 1, 255, errors);
  }
  if (node.type === "contentGate") {
    requireUuidAttr(node, path, "gateId", errors);
  }
}

function validateMark(
  mark: EditorMark,
  path: string,
  allowedMarks: readonly string[],
  errors: EditorValidationError[],
): void {
  if (
    !isRecord(mark) ||
    typeof mark.type !== "string" ||
    !allowedMarks.includes(mark.type)
  ) {
    errors.push(error(path, "MARK_NOT_ALLOWED", "Mark is not allowed."));
    return;
  }
  if (mark.type === "link") {
    const href = mark.attrs?.href;
    if (typeof href !== "string" || !isSafeHref(href)) {
      errors.push(
        error(
          `${path}.attrs.href`,
          "LINK_URL",
          "Link URL is unsafe or invalid.",
        ),
      );
    }
  }
}

function isSafeHref(href: string): boolean {
  try {
    const url = new URL(href, "https://dss.local");
    return href.startsWith("/") || SAFE_LINK_PROTOCOLS.has(url.protocol);
  } catch {
    return false;
  }
}

function requireUuidAttr(
  node: EditorNode,
  path: string,
  key: string,
  errors: EditorValidationError[],
): void {
  if (!UUID_PATTERN.test(stringAttr(node, key))) {
    errors.push(
      error(`${path}.attrs.${key}`, "UUID", `${key} must be a UUID.`),
    );
  }
}

function requireBoundedStringAttr(
  node: EditorNode,
  path: string,
  key: string,
  min: number,
  max: number,
  errors: EditorValidationError[],
): void {
  const value = stringAttr(node, key);
  if (value.length < min || value.length > max) {
    errors.push(
      error(
        `${path}.attrs.${key}`,
        "STRING_LENGTH",
        `${key} must contain ${min} to ${max} characters.`,
      ),
    );
  }
}

function optionalBoundedStringAttr(
  node: EditorNode,
  path: string,
  key: string,
  max: number,
  errors: EditorValidationError[],
): void {
  const value = node.attrs?.[key];
  if (
    value !== undefined &&
    (typeof value !== "string" || value.length > max)
  ) {
    errors.push(
      error(
        `${path}.attrs.${key}`,
        "STRING_LENGTH",
        `${key} must contain at most ${max} characters.`,
      ),
    );
  }
}

function stringAttr(node: EditorNode, key: string): string {
  const value = node.attrs?.[key];
  return typeof value === "string" ? value : "";
}

function numberAttr(node: EditorNode, key: string): number {
  const value = node.attrs?.[key];
  return typeof value === "number" ? value : Number.NaN;
}

function isEditorProfile(value: unknown): value is EditorProfile {
  return (
    typeof value === "string" &&
    EDITOR_PROFILES.includes(value as EditorProfile)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function error(
  path: string,
  code: string,
  message: string,
): EditorValidationError {
  return { path, code, message };
}

function invalid(
  path: string,
  code: string,
  message: string,
): EditorValidationResult {
  return { valid: false, errors: [error(path, code, message)] };
}

/** Validation is Mission Control: unknown payloads do not get docking clearance. */
