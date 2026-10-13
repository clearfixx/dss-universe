/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: IAM Access Groups
 * 📄 File: apps/api/src/modules/iam/access-groups/contracts/access-group.repository.interface.ts
 *
 * 🎯 Purpose:
 * Defines private auditable group persistence, not a public authorization API.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type {
  AccessCapability,
  AccessGroupRecord,
  CreateAccessGroup,
  UpdateAccessGroup,
  GrantAccessMembership,
  MembershipRecord,
  EffectiveAccessMembership,
} from '../domain/access-group.types';
import type { PublicAccessGroup } from './public-group-display.contract';

export interface AccessGroupRepository {
  publicGroups(
    subjectId: string,
    at: Date,
  ): Promise<readonly PublicAccessGroup[]>;
  list(
    after: string | undefined,
    limit: number,
  ): Promise<readonly AccessGroupRecord[]>;
  memberships(
    filter: Readonly<{ groupId?: string; subjectId?: string }>,
    after: string | undefined,
    limit: number,
  ): Promise<readonly MembershipRecord[]>;
  create(input: CreateAccessGroup, actorId: string): Promise<AccessGroupRecord>;
  findById(id: string): Promise<AccessGroupRecord | null>;
  update(
    id: string,
    input: UpdateAccessGroup,
    actorId: string,
  ): Promise<AccessGroupRecord | null>;
  setCapabilities(
    id: string,
    capabilities: readonly AccessCapability[],
    actorId: string,
  ): Promise<AccessGroupRecord | null>;
  grant(
    input: GrantAccessMembership,
    actorId: string,
  ): Promise<MembershipRecord | null>;
  revoke(
    id: string,
    actorId: string,
    reason: string,
    at: Date,
  ): Promise<MembershipRecord | null>;
  effectiveMemberships(
    subjectId: string,
    at: Date,
  ): Promise<readonly EffectiveAccessMembership[]>;
}
export const IAM_ACCESS_GROUP_REPOSITORY = Symbol(
  'IAM_ACCESS_GROUP_REPOSITORY',
);
