/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Moderation
 * 📄 File: apps/api/src/modules/moderation/domain/community-rule.rules.ts
 *
 * 🎯 Purpose:
 * Validation and ordering of numbered community rules.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { ModerationSanctionError } from './errors/moderation-sanction.error';

const CODE = /^\d{1,3}(\.\d{1,3}){0,2}$/;

export function normalizeRuleCode(value: string): string {
  const code = value.trim().replace(/\.$/, '');
  if (!CODE.test(code))
    throw new ModerationSanctionError(
      'INVALID_INPUT',
      'A rule number looks like 2, 2.3 or 2.3.1.',
    );
  return code;
}

export function normalizeRuleText(value: string): string {
  const text = value.trim();
  if (text.length < 3 || text.length > 1000)
    throw new ModerationSanctionError(
      'INVALID_INPUT',
      'A rule must contain 3 to 1000 characters.',
    );
  return text;
}

/** Numeric order of rule numbers: 2 < 2.2 < 2.10 < 3. */
export function compareRuleCodes(a: string, b: string): number {
  const left = a.split('.').map(Number);
  const right = b.split('.').map(Number);
  for (let i = 0; i < Math.max(left.length, right.length); i += 1) {
    const diff = (left[i] ?? -1) - (right[i] ?? -1);
    if (diff !== 0) return diff;
  }
  return 0;
}
