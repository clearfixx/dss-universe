/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: IAM Access Groups
 * 📄 File: apps/api/src/modules/iam/access-groups/domain/access-group.types.ts
 *
 * 🎯 Purpose:
 * Defines isolated group and membership values without ORM or profile data.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export type AccessGroupKind = 'CUSTOM' | 'PREMIUM';
export type AccessCapability = 'KNOWLEDGE_FORGE_GUARDIAN';
export type AccessGroupRecord = Readonly<{
  id: string;
  key: string;
  displayName: string;
  kind: AccessGroupKind;
  enabled: boolean;
  isPublic: boolean;
  color: string | null;
  badgeLabel: string | null;
  icon: string | null;
  createdAt: Date;
  updatedAt: Date;
  capabilities: readonly AccessCapability[];
}>;
export type CreateAccessGroup = Readonly<{
  key: string;
  displayName: string;
  isPublic?: boolean;
  color?: string;
  badgeLabel?: string;
  icon?: string;
  capabilities: readonly AccessCapability[];
}>;
export type UpdateAccessGroup = Readonly<{
  displayName?: string;
  enabled?: boolean;
  isPublic?: boolean;
  color?: string | null;
  badgeLabel?: string | null;
  icon?: string | null;
}>;
export type MembershipRecord = Readonly<{
  id: string;
  groupId: string;
  subjectId: string;
  validFrom: Date;
  validUntil: Date | null;
  grantedById: string;
  createdAt: Date;
  revokedAt: Date | null;
  revokedById: string | null;
  revokeReason: string | null;
}>;
export type GrantAccessMembership = Readonly<{
  groupId: string;
  subjectId: string;
  validFrom: Date;
  validUntil: Date | null;
}>;
export type EffectiveAccessMembership = Readonly<{
  key: string;
  kind: AccessGroupKind;
  capabilities: readonly AccessCapability[];
}>;
