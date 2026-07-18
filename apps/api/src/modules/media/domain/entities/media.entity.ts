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
import { MediaStorage } from '../enums/media-storage.enum';
import { MediaVisibility } from '../enums/media-visibility.enum';

export type MediaEntityProps = {
  id: string;
  ownerId: string | null;
  kind: MediaKind;
  visibility: MediaVisibility;
  storage: MediaStorage;
  path: string;
  filename: string;
  originalFilename: string;
  mimeType: string;
  extension: string;
  size: number;
  checksum: string;
  width: number | null;
  height: number | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export class MediaEntity {
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

  get storage(): MediaStorage {
    return this.props.storage;
  }

  get path(): string {
    return this.props.path;
  }

  get filename(): string {
    return this.props.filename;
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
    return this.props.deletedAt !== null;
  }

  get isPublic(): boolean {
    return this.props.visibility === MediaVisibility.PUBLIC;
  }

  get isImage(): boolean {
    return this.props.kind === MediaKind.IMAGE;
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
