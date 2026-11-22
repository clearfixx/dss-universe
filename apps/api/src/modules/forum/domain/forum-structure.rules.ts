/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Forum (Community Hub)
 * 📄 File: apps/api/src/modules/forum/domain/forum-structure.rules.ts
 *
 * 🎯 Purpose:
 * Pure structure rules: input normalization and category visibility decisions.
 *
 * ⚠️ Important:
 * Database constraints repeat these grammars; both must change together.
 * Visibility is inherited by every forum and subforum of the category.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { normalizeSectionLimits } from './forum-section-limits.rules';
import { ForumCommandError } from './errors/forum-command.error';
import {
  FORUM_VISIBILITIES,
  type ForumCategoryInput,
  type ForumCategoryVisibilityRule,
  type ForumInput,
  type ForumViewerFacts,
} from './types/forum-structure.type';

const SLUG = /^[a-z0-9][a-z0-9-]{0,63}$/;
const AUDIENCE_KEY = /^(role|group):[a-z][a-z0-9_-]{0,63}$/;

function invalid(message: string): never {
  throw new ForumCommandError('INVALID_INPUT', message);
}

function slug(value: string): string {
  const result = value.trim().toLowerCase();
  if (!SLUG.test(result)) {
    invalid('Slug must use lowercase letters, digits and hyphens (1–64).');
  }
  return result;
}

function title(value: string): string {
  const result = value.trim();
  if (result.length < 2 || result.length > 120) {
    invalid('Title must contain 2 to 120 characters.');
  }
  return result;
}

function description(value: string | null): string | null {
  const result = value?.trim() || null;
  if (result && result.length > 1000) {
    invalid('Description must not exceed 1000 characters.');
  }
  return result;
}

function position(value: number): number {
  if (!Number.isInteger(value) || value < 0) {
    invalid('Position must be a non-negative integer.');
  }
  return value;
}

export function normalizeAudienceKeys(keys: readonly string[]): string[] {
  const normalized = [...new Set(keys.map((key) => key.trim().toLowerCase()))];
  if (normalized.length > 50)
    invalid('At most 50 audience entries are allowed.');
  for (const key of normalized) {
    if (!AUDIENCE_KEY.test(key)) {
      invalid(
        `Audience entry "${key}" must look like role:<name> or group:<key>.`,
      );
    }
  }
  return normalized.sort();
}

export function normalizeCategoryInput(
  input: ForumCategoryInput,
): ForumCategoryInput {
  if (!FORUM_VISIBILITIES.includes(input.visibility)) {
    invalid('Unknown category visibility.');
  }
  const audienceKeys = normalizeAudienceKeys(input.audienceKeys);
  if (input.visibility !== 'RESTRICTED' && audienceKeys.length > 0) {
    invalid('Audience entries apply only to RESTRICTED categories.');
  }
  return {
    slug: slug(input.slug),
    title: title(input.title),
    description: description(input.description),
    position: position(input.position),
    visibility: input.visibility,
    audienceKeys,
    active: input.active,
  };
}

export function normalizeForumInput(input: ForumInput): ForumInput {
  if (
    input.pinnedLimit != null &&
    (!Number.isInteger(input.pinnedLimit) ||
      input.pinnedLimit < 0 ||
      input.pinnedLimit > 100)
  ) {
    invalid('Pinned topic limit must be 0–100 or empty.');
  }
  return {
    ...input,
    ...normalizeSectionLimits(input),
    slug: slug(input.slug),
    title: title(input.title),
    description: description(input.description),
    position: position(input.position),
  };
}

/**
 * Decides whether a viewer may see a category (and therefore everything in it).
 * Structure managers always see every category and cannot be excluded.
 */
export function canSeeCategory(
  rule: ForumCategoryVisibilityRule,
  viewer: ForumViewerFacts,
): boolean {
  if (viewer.seesAllCategories) return true;
  switch (rule.visibility) {
    case 'PUBLIC':
      return true;
    case 'MEMBERS':
      return viewer.subjectId !== null;
    case 'RESTRICTED': {
      if (viewer.subjectId === null) return false;
      const held = new Set(viewer.audienceKeys.map((key) => key.toLowerCase()));
      return rule.audienceKeys.some((key) => held.has(key));
    }
  }
}

/** 🗺️ A map that hides rooms from strangers must still show them to the architect. */
