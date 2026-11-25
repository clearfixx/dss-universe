/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Forum (Community Hub)
 * 📄 File: apps/api/src/modules/forum/domain/forum-section-limits.rules.ts
 *
 * 🎯 Purpose:
 * Section limits from the Command Deck mockup "доступ і видимість форуму":
 * attachment size and formats, auto-close of inactive topics and the
 * hidden-content rules (who may add hidden blocks, which block kinds).
 *
 * ⚠️ Important:
 * Pure rules; the topics service enforces them on create, reply and edit.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { ForumCommandError } from './errors/forum-command.error';
import { FORUM_ACCESS_ROLES, type ForumAccessRole } from './forum-access.rules';

export const GATE_BLOCK_TYPES = ['TEXT', 'CODE', 'MEDIA', 'FILES'] as const;
export type GateBlockType = (typeof GATE_BLOCK_TYPES)[number];

export type ForumSectionLimits = {
  attachmentMaxMb: number | null;
  attachmentFormats: string[];
  autoCloseDays: number | null;
  gateViewRole: ForumAccessRole;
  gateCreateRole: ForumAccessRole;
  gateBlockTypes: GateBlockType[];
};

const invalid = (message: string): never => {
  throw new ForumCommandError('INVALID_INPUT', message);
};

export function normalizeSectionLimits(
  input: Partial<ForumSectionLimits>,
): Partial<ForumSectionLimits> {
  const out: Partial<ForumSectionLimits> = {};
  if (input.attachmentMaxMb !== undefined) {
    const value = input.attachmentMaxMb;
    if (
      value !== null &&
      (!Number.isInteger(value) || value < 1 || value > 1024)
    ) {
      invalid('Attachment size limit must be 1–1024 MB or empty.');
    }
    out.attachmentMaxMb = value;
  }
  if (input.attachmentFormats !== undefined) {
    const formats = [
      ...new Set(
        input.attachmentFormats.map((format) =>
          format.trim().toLowerCase().replace(/^\./, ''),
        ),
      ),
    ].filter(Boolean);
    if (formats.length > 30) invalid('At most 30 file formats are allowed.');
    for (const format of formats) {
      if (!/^[a-z0-9]{1,10}$/.test(format)) {
        invalid(`File format "${format}" must be a short extension like pdf.`);
      }
    }
    out.attachmentFormats = formats.sort();
  }
  if (input.autoCloseDays !== undefined) {
    const value = input.autoCloseDays;
    if (
      value !== null &&
      (!Number.isInteger(value) || value < 1 || value > 3650)
    ) {
      invalid('Auto-close must be 1–3650 days or off.');
    }
    out.autoCloseDays = value;
  }
  for (const key of ['gateViewRole', 'gateCreateRole'] as const) {
    const role = input[key];
    if (role === undefined) continue;
    if (!FORUM_ACCESS_ROLES.includes(role)) invalid('Unknown forum role.');
    out[key] = role;
  }
  if (out.gateCreateRole === 'GUEST') {
    invalid('Guests cannot add hidden blocks.');
  }
  if (input.gateBlockTypes !== undefined) {
    const types = [...new Set(input.gateBlockTypes)];
    for (const type of types) {
      if (!GATE_BLOCK_TYPES.includes(type)) {
        invalid('Unknown hidden block type.');
      }
    }
    if (types.length === 0) {
      invalid('Allow at least one block type inside hidden blocks.');
    }
    out.gateBlockTypes = GATE_BLOCK_TYPES.filter((type) =>
      types.includes(type),
    );
  }
  return out;
}

/** Editor node type → hidden-block kind (other nodes count as text). */
export function gateBlockKind(nodeType: string): GateBlockType {
  if (nodeType === 'codeBlock') return 'CODE';
  if (nodeType === 'attachment') return 'FILES';
  if (nodeType === 'mediaReference' || nodeType === 'image') return 'MEDIA';
  return 'TEXT';
}

/** Kinds used inside every hidden block of an editor document. */
export function gateBlockKinds(
  document: unknown,
  gateType: string,
): Set<GateBlockType> {
  const kinds = new Set<GateBlockType>();
  const walk = (node: unknown, inside: boolean) => {
    if (!node || typeof node !== 'object') return;
    const record = node as { type?: unknown; content?: unknown };
    const type = typeof record.type === 'string' ? record.type : '';
    if (inside && type) kinds.add(gateBlockKind(type));
    const here = inside || type === gateType;
    if (Array.isArray(record.content)) {
      for (const child of record.content) walk(child, here);
    } else {
      // EditorDocument: the root node sits in an object `content`.
      walk(record.content, here);
    }
  };
  walk(document, false);
  return kinds;
}

/** File extension of a stored name, lower case, without the dot. */
export function fileExtension(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot < 0 ? '' : name.slice(dot + 1).toLowerCase();
}
