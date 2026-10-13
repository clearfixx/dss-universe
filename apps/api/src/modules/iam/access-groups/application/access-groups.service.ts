/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: IAM Access Groups
 * 📄 File: apps/api/src/modules/iam/access-groups/application/access-groups.service.ts
 *
 * 🎯 Purpose:
 * Coordinates authorized access-group commands without ORM or foreign services.
 *
 * 🧠 Responsibilities:
 * • checks current management authority on every operation;
 * • validates owned group policy before private persistence;
 * • maps expected conflicts and missing resources to stable application errors.
 *
 * 🏗️ Architecture:
 * IAM application coordination; no Prisma or foreign feature services.
 *
 * ⚠️ Important:
 * Premium cannot receive delegated capabilities; regrant never rewrites history.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  IAM_ACCESS_GROUP_REPOSITORY,
  type AccessGroupRepository,
} from '../contracts/access-group.repository.interface';
import {
  GROUP_MANAGEMENT_AUTHORITY,
  type GroupManagementAuthority,
} from '../contracts/group-management-authority.contract';
import { AccessGroupKeyConflict } from '../domain/access-group.errors';
import type {
  AccessCapability,
  CreateAccessGroup,
  UpdateAccessGroup,
  GrantAccessMembership,
} from '../domain/access-group.types';
import {
  validateCapabilities,
  validateCreateGroup,
  validateUpdateGroup,
  validateGrant,
  validatePage,
} from './access-group.validation';
@Injectable()
export class AccessGroupsService {
  constructor(
    @Inject(IAM_ACCESS_GROUP_REPOSITORY)
    private readonly groups: AccessGroupRepository,
    @Inject(GROUP_MANAGEMENT_AUTHORITY)
    private readonly authority: GroupManagementAuthority,
  ) {}
  private async authorize(actorId: string): Promise<void> {
    if (!(await this.authority.canManage(actorId)))
      throw new ForbiddenException(
        'Current permission to manage access groups is required.',
      );
  }
  async create(actorId: string, input: CreateAccessGroup) {
    await this.authorize(actorId);
    validateCreateGroup(input);
    try {
      return await this.groups.create(input, actorId);
    } catch (error) {
      if (error instanceof AccessGroupKeyConflict)
        throw new ConflictException(error.message);
      throw error;
    }
  }
  async list(actorId: string, after?: string, limit = 50) {
    await this.authorize(actorId);
    validatePage(limit);
    return this.groups.list(after, limit);
  }
  async find(actorId: string, id: string) {
    await this.authorize(actorId);
    const group = await this.groups.findById(id);
    if (!group) throw new NotFoundException('Access group was not found.');
    return group;
  }
  async update(actorId: string, id: string, input: UpdateAccessGroup) {
    await this.authorize(actorId);
    validateUpdateGroup(input);
    const group = await this.groups.update(id, input, actorId);
    if (!group) throw new NotFoundException('Access group was not found.');
    return group;
  }
  async setCapabilities(
    actorId: string,
    id: string,
    capabilities: readonly AccessCapability[],
  ) {
    await this.authorize(actorId);
    validateCapabilities(capabilities);
    const group = await this.groups.findById(id);
    if (!group) throw new NotFoundException('Access group was not found.');
    if (group.kind === 'PREMIUM' && capabilities.length)
      throw new BadRequestException(
        'Premium cannot grant delegated capabilities.',
      );
    const result = await this.groups.setCapabilities(id, capabilities, actorId);
    if (!result) throw new NotFoundException('Access group was not found.');
    return result;
  }
  async grant(actorId: string, input: GrantAccessMembership) {
    await this.authorize(actorId);
    validateGrant(input);
    const membership = await this.groups.grant(input, actorId);
    if (!membership)
      throw new NotFoundException(
        'Group is missing/disabled or subject was not found.',
      );
    return membership;
  }
  async revoke(actorId: string, id: string, reason: string) {
    await this.authorize(actorId);
    if (typeof reason !== 'string' || !reason.trim() || reason.length > 500)
      throw new BadRequestException('A bounded revocation reason is required.');
    const membership = await this.groups.revoke(
      id,
      actorId,
      reason.trim(),
      new Date(),
    );
    if (!membership)
      throw new NotFoundException('Access membership was not found.');
    return membership;
  }
  async memberships(
    actorId: string,
    filter: Readonly<{ groupId?: string; subjectId?: string }>,
    after?: string,
    limit = 50,
  ) {
    await this.authorize(actorId);
    validatePage(limit);
    if (!filter.groupId && !filter.subjectId)
      throw new BadRequestException('Choose a group or subject.');
    return this.groups.memberships(filter, after, limit);
  }
}
