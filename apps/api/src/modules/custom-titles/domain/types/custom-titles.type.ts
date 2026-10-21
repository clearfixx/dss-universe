/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Custom Titles
 * 📄 File: apps/api/src/modules/custom-titles/domain/types/custom-titles.type.ts
 *
 * 🎯 Purpose:
 * Defines permission-neutral title definitions, grants, selection, and policy.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

export type CustomTitle = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string;
  badge: string;
  isActive: boolean;
  createdById: string;
  updatedById: string;
  createdAt: Date;
  updatedAt: Date;
};

export type UserTitleGrant = {
  id: string;
  userId: string;
  titleId: string;
  grantedById: string;
  grantReason: string;
  grantedAt: Date;
  revokedAt: Date | null;
  revokedById: string | null;
  revokeReason: string | null;
  title: CustomTitle;
  selected: boolean;
};

export type CustomTitleSettings = {
  selectionCooldownDays: number;
  updatedById: string | null;
  updatedAt: Date;
};

export type CreateCustomTitle = Pick<
  CustomTitle,
  'name' | 'slug' | 'description' | 'color' | 'badge'
> & {
  actorId: string;
};

export type UpdateCustomTitle = Pick<
  CustomTitle,
  'id' | 'name' | 'slug' | 'description' | 'color' | 'badge' | 'isActive'
> & {
  actorId: string;
};

export type TitleWriteResult<T> =
  | { status: 'OK'; value: T }
  | { status: 'NOT_FOUND' | 'CONFLICT'; value: null };

export type TitleGrantResult =
  | { status: 'OK'; grant: UserTitleGrant }
  | { status: 'USER_NOT_FOUND' | 'TITLE_NOT_FOUND' | 'CONFLICT'; grant: null };

export type TitleRevokeResult =
  | { status: 'OK'; grant: UserTitleGrant }
  | { status: 'NOT_FOUND' | 'ALREADY_REVOKED'; grant: null };

export type TitleSelectionResult =
  | { status: 'OK' | 'UNCHANGED'; grant: UserTitleGrant; retryAt: null }
  | {
      status: 'NOT_FOUND' | 'INACTIVE' | 'COOLDOWN';
      grant: null;
      retryAt: Date | null;
    };

/**
 * A title is presentation metadata. Authorization never imports this file.
 */
