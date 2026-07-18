/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Media
 * 📄 File: apps/api/src/modules/media/domain/entities/media.entity.ts
 *
 * 🎯 Purpose:
 * Represents a DSS media resource in the domain layer.
 *
 * 🧠 Responsibilities:
 * • describes media identity and optional ownership;
 * • stores media metadata;
 * • separates media meaning from physical storage implementation;
 * • stays independent from business usage relationships.
 *
 * 🏗️ Architecture:
 * Domain entity.
 * Must not depend on NestJS, Prisma, Swagger, or filesystem APIs.
 *
 * ⚠️ Important:
 * Media does not know whether it is used as an avatar, cover, forum
 * attachment, CMS asset, or news image.
 *
 * Business modules own those relationships.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { MediaKind } from '../enums/media-kind.enum';
import { MediaStatus } from '../enums/media-status.enum';
import { MediaStorageProvider } from '../enums/media-storage-provider.enum';
import { MediaVisibility } from '../enums/media-visibility.enum';

export type MediaEntityProps = {
  id: string;
  ownerId: string | null;
  kind: MediaKind;
  status: MediaStatus;
  visibility: MediaVisibility;
  storageProvider: MediaStorageProvider;
  bucket: string;
  storageKey: string;
  originalFilename: string;
  mimeType: string;
  extension: string;
  size: number;
  checksum: string;
  width: number | null;
  height: number | null;
  durationMs: number | null;
  altText: string | null;
  caption: string | null;
  metadata: Record<string, unknown> | null;
  failureCode: string | null;
  failureReason: string | null;
  readyAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export class MediaEntity {
  private static readonly transitions: Readonly<
    Record<MediaStatus, readonly MediaStatus[]>
  > = {
    [MediaStatus.PENDING]: [MediaStatus.UPLOADING, MediaStatus.REJECTED],
    [MediaStatus.UPLOADING]: [
      MediaStatus.PROCESSING,
      MediaStatus.FAILED,
      MediaStatus.REJECTED,
    ],
    [MediaStatus.PROCESSING]: [
      MediaStatus.READY,
      MediaStatus.FAILED,
      MediaStatus.REJECTED,
      MediaStatus.QUARANTINED,
    ],
    [MediaStatus.READY]: [MediaStatus.QUARANTINED, MediaStatus.DELETING],
    [MediaStatus.FAILED]: [MediaStatus.PROCESSING, MediaStatus.DELETING],
    [MediaStatus.REJECTED]: [MediaStatus.DELETING],
    [MediaStatus.QUARANTINED]: [
      MediaStatus.PROCESSING,
      MediaStatus.REJECTED,
      MediaStatus.DELETING,
    ],
    [MediaStatus.DELETING]: [MediaStatus.DELETED],
    [MediaStatus.DELETED]: [],
  };

  constructor(private readonly props: MediaEntityProps) {}

  get id(): string {
    return this.props.id;
  }

  get ownerId(): string | null {
    return this.props.ownerId;
  }

  get kind(): MediaKind {
    return this.props.kind;
  }

  get visibility(): MediaVisibility {
    return this.props.visibility;
  }

  get status(): MediaStatus {
    return this.props.status;
  }

  get storageProvider(): MediaStorageProvider {
    return this.props.storageProvider;
  }

  get bucket(): string {
    return this.props.bucket;
  }

  get storageKey(): string {
    return this.props.storageKey;
  }

  get originalFilename(): string {
    return this.props.originalFilename;
  }

  get mimeType(): string {
    return this.props.mimeType;
  }

  get extension(): string {
    return this.props.extension;
  }

  get size(): number {
    return this.props.size;
  }

  get checksum(): string {
    return this.props.checksum;
  }

  get width(): number | null {
    return this.props.width;
  }

  get height(): number | null {
    return this.props.height;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  get deletedAt(): Date | null {
    return this.props.deletedAt;
  }

  get isDeleted(): boolean {
    return this.props.status === MediaStatus.DELETED;
  }

  get isPublic(): boolean {
    return this.props.visibility === MediaVisibility.PUBLIC;
  }

  get isImage(): boolean {
    return this.props.kind === MediaKind.IMAGE;
  }

  canTransitionTo(status: MediaStatus): boolean {
    return MediaEntity.transitions[this.status].includes(status);
  }

  transitionTo(status: MediaStatus, at = new Date()): MediaEntity {
    if (!this.canTransitionTo(status)) {
      throw new Error(
        `Invalid media status transition: ${this.status} -> ${status}.`,
      );
    }
    return new MediaEntity({
      ...this.props,
      status,
      readyAt: status === MediaStatus.READY ? at : this.props.readyAt,
      deletedAt: status === MediaStatus.DELETED ? at : this.props.deletedAt,
      updatedAt: at,
    });
  }

  toJSON(): MediaEntityProps {
    return {
      ...this.props,
    };
  }
}

/**
 * -----------------------------------------------------------------------------
 * 🖼️ Media Wisdom
 *
 * A file without metadata is just space junk.
 * DSS prefers useful cargo. ☄️
 * -----------------------------------------------------------------------------
 */
