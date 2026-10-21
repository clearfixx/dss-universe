/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Custom Titles
 * 📄 File: apps/api/src/modules/custom-titles/application/services/custom-titles.service.ts
 *
 * 🎯 Purpose:
 * Coordinates permission-neutral custom title definitions and user choices.
 *
 * 🧠 Responsibilities:
 * • validates title presentation metadata and administrative reasons;
 * • coordinates title creation, updates, grants, and revocations;
 * • enforces the configurable display-title selection cooldown;
 * • keeps titles strictly separate from authorization.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  CUSTOM_TITLES_REPOSITORY,
  type CustomTitlesRepository,
} from '../../domain/repositories/custom-titles.repository.interface';
import type {
  CustomTitle,
  CustomTitleSettings,
  UserTitleGrant,
} from '../../domain/types/custom-titles.type';

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

export type CustomTitleDraft = {
  name: string;
  description?: string | null;
  color: string;
  badge: string;
};

export type CustomTitleUpdate = CustomTitleDraft & {
  id: string;
  isActive: boolean;
};

@Injectable()
export class CustomTitlesService {
  constructor(
    @Inject(CUSTOM_TITLES_REPOSITORY)
    private readonly titles: CustomTitlesRepository,
  ) {}

  definitions(includeInactive = false): Promise<CustomTitle[]> {
    return this.titles.definitions(includeInactive);
  }

  grants(userId: string, includeRevoked = false): Promise<UserTitleGrant[]> {
    this.identifier(userId, 'User id');
    return this.titles.grants(userId, includeRevoked);
  }

  settings(): Promise<CustomTitleSettings> {
    return this.titles.settings();
  }

  async create(draft: CustomTitleDraft, actorId: string): Promise<CustomTitle> {
    const normalized = this.normalize(draft);
    const result = await this.titles.create({
      ...normalized,
      slug: this.slug(normalized.name),
      actorId,
    });
    if (result.status === 'CONFLICT') {
      throw new ConflictException('A custom title with this name exists.');
    }
    if (result.status !== 'OK') {
      throw new ConflictException('Custom title could not be created.');
    }
    return result.value;
  }

  async update(
    draft: CustomTitleUpdate,
    actorId: string,
  ): Promise<CustomTitle> {
    this.identifier(draft.id, 'Title id');
    const normalized = this.normalize(draft);
    const result = await this.titles.update({
      id: draft.id,
      ...normalized,
      slug: this.slug(normalized.name),
      isActive: draft.isActive,
      actorId,
    });
    if (result.status === 'NOT_FOUND') {
      throw new NotFoundException('Custom title not found.');
    }
    if (result.status === 'CONFLICT') {
      throw new ConflictException('A custom title with this name exists.');
    }
    if (result.status !== 'OK') {
      throw new ConflictException('Custom title could not be updated.');
    }
    return result.value;
  }

  async grant(
    userId: string,
    titleId: string,
    reason: string,
    actorId: string,
  ): Promise<UserTitleGrant> {
    this.identifier(userId, 'User id');
    this.identifier(titleId, 'Title id');
    const result = await this.titles.grant(
      userId,
      titleId,
      this.reason(reason),
      actorId,
    );
    if (result.status === 'USER_NOT_FOUND') {
      throw new NotFoundException('Custom title recipient not found.');
    }
    if (result.status === 'TITLE_NOT_FOUND') {
      throw new NotFoundException('Active custom title not found.');
    }
    if (result.status === 'CONFLICT') {
      throw new ConflictException('User already has this custom title.');
    }
    if (result.status !== 'OK') {
      throw new ConflictException('Custom title could not be granted.');
    }
    return result.grant;
  }

  async revoke(
    grantId: string,
    reason: string,
    actorId: string,
  ): Promise<UserTitleGrant> {
    this.identifier(grantId, 'Grant id');
    const result = await this.titles.revoke(
      grantId,
      this.reason(reason),
      actorId,
    );
    if (result.status === 'NOT_FOUND') {
      throw new NotFoundException('Custom title grant not found.');
    }
    if (result.status === 'ALREADY_REVOKED') {
      throw new ConflictException('Custom title grant is already revoked.');
    }
    if (result.status !== 'OK') {
      throw new ConflictException('Custom title grant could not be revoked.');
    }
    return result.grant;
  }

  async select(userId: string, grantId: string): Promise<UserTitleGrant> {
    this.identifier(grantId, 'Grant id');
    const result = await this.titles.select(userId, grantId);
    if (result.status === 'NOT_FOUND') {
      throw new NotFoundException('Active custom title grant not found.');
    }
    if (result.status === 'INACTIVE') {
      throw new ConflictException('Archived custom titles cannot be selected.');
    }
    if (result.status === 'COOLDOWN') {
      throw new ConflictException(
        `Display title may be changed after ${result.retryAt?.toISOString()}.`,
      );
    }
    if (result.status !== 'OK' && result.status !== 'UNCHANGED') {
      throw new ConflictException('Custom title could not be selected.');
    }
    return result.grant;
  }

  updateSettings(
    selectionCooldownDays: number,
    actorId: string,
  ): Promise<CustomTitleSettings> {
    if (
      !Number.isInteger(selectionCooldownDays) ||
      selectionCooldownDays < 0 ||
      selectionCooldownDays > 3650
    ) {
      throw new BadRequestException(
        'Title selection cooldown must be an integer between 0 and 3650 days.',
      );
    }
    return this.titles.updateSettings(selectionCooldownDays, actorId);
  }

  private normalize(draft: CustomTitleDraft) {
    const name = draft.name.trim();
    const badge = draft.badge.trim();
    const description = draft.description?.trim() || null;
    if (name.length < 2 || name.length > 64) {
      throw new BadRequestException(
        'Title name must contain 2..64 characters.',
      );
    }
    if (!HEX_COLOR.test(draft.color)) {
      throw new BadRequestException(
        'Title color must be a six-digit hex color.',
      );
    }
    if (badge.length < 1 || badge.length > 64) {
      throw new BadRequestException(
        'Title badge must contain 1..64 characters.',
      );
    }
    if (description && description.length > 500) {
      throw new BadRequestException(
        'Title description must not exceed 500 characters.',
      );
    }
    return {
      name,
      description,
      color: draft.color.toUpperCase(),
      badge,
    };
  }

  private reason(value: string): string {
    const reason = value.trim();
    if (reason.length < 3 || reason.length > 500) {
      throw new BadRequestException('Reason must contain 3..500 characters.');
    }
    return reason;
  }

  private identifier(value: string, label: string): void {
    if (!value.trim()) throw new BadRequestException(`${label} is required.`);
  }

  private slug(name: string): string {
    const value = name
      .normalize('NFKC')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/^-+|-+$/g, '');
    if (!value) {
      throw new BadRequestException(
        'Title name must contain characters suitable for a stable slug.',
      );
    }
    return value.slice(0, 80);
  }
}

/**
 * 🎖️ Titles decorate achievements. They never impersonate permissions.
 */
