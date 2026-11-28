/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Static Pages
 * 📄 File: apps/api/src/modules/static-pages/domain/static-page.rules.ts
 *
 * 🎯 Purpose:
 * Errors and validation of static page facts.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export type StaticPageErrorCode =
  | 'ACCESS_DENIED'
  | 'NOT_FOUND'
  | 'INVALID_INPUT'
  | 'CONFLICT';

export class StaticPageError extends Error {
  constructor(
    readonly code: StaticPageErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'StaticPageError';
  }
}

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function invalid(message: string): never {
  throw new StaticPageError('INVALID_INPUT', message);
}

export function normalizeSlug(value: string): string {
  const slug = value.trim().toLowerCase();
  if (slug.length > 80 || !SLUG.test(slug))
    invalid(
      'An address uses Latin letters, digits and single hyphens, up to 80 characters.',
    );
  return slug;
}

export function normalizeTitle(value: string): string {
  const title = value.trim();
  if (title.length < 3 || title.length > 160)
    invalid('A title must contain 3 to 160 characters.');
  return title;
}

export function normalizeDescription(value: string): string {
  const description = value.trim();
  if (description.length > 300)
    invalid('A description must not exceed 300 characters.');
  return description;
}

/** Whether a document tree contains a node of the given type. */
export function containsNode(node: unknown, type: string): boolean {
  if (Array.isArray(node))
    return node.some((child) => containsNode(child, type));
  if (typeof node !== 'object' || node === null) return false;
  const record = node as { type?: unknown; content?: unknown };
  return record.type === type || containsNode(record.content, type);
}
