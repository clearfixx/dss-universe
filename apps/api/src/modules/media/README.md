# DSS Media Platform 🖼️

## Purpose

The Media module owns the DSS Universe media platform.

It provides a unified foundation for files used across the system:

- user avatars;
- profile covers;
- forum attachments;
- news images and galleries;
- CMS assets;
- private message attachments;
- course files;
- downloads;
- AI-generated images in future phases.

This module is not only an avatar module.

Avatar support is the first consumer of the DSS Media Platform.

---

## Responsibility

The Media module owns media meaning and metadata.

It is responsible for:

- media ownership;
- media visibility;
- media type;
- media metadata;
- upload rules;
- validation rules;
- relation between media and feature modules;
- future media lifecycle policies.

---

## Storage Boundary

The Media module does not directly write files to disk.

Physical persistence belongs to Core Storage:

```txt
Media Module
  ↓
StorageService
  ↓
StorageProvider
  ↓
LocalStorageProvider / future S3 / future R2

Media answers:

What is this file?
Who owns it?
Can it be used as an avatar?
Is it public or private?
What metadata does it have?

Storage answers:

Where is the file stored?
How is it saved?
How is it deleted?
What URL points to it?
Layer Structure
media/
├── application/
├── domain/
├── infrastructure/
├── presentation/
├── media.module.ts
└── README.md
Layers
Domain

Contains media business concepts.

Examples:

media visibility;
media kind;
media entity;
media validation rules;
domain exceptions.

Domain must not depend on NestJS, Prisma, Swagger, or file system APIs.

Application

Contains use cases and orchestration.

Examples:

upload media;
delete media;
attach media to avatar;
validate media ownership;
prepare media response.

Application may use repositories and Core Storage through stable contracts.

Infrastructure

Contains technical implementations.

Examples:

Prisma media repository;
database mappers;
persistence models;
metadata extraction adapters.

Infrastructure must not contain business policy decisions.

Presentation

Contains HTTP API surface.

Examples:

media controller;
request DTOs;
response DTOs;
Swagger decorators.

Presentation translates HTTP input into application use cases.

First Consumer

The first consumer of the Media Platform is avatar support.

Avatar API:

GraphQL mutation setViewerAvatar(mediaId: ID!)
GraphQL mutation removeViewerAvatar
GET /media/public/:mediaId/:variantName
GET /media/avatars/fallback/:seed.svg

Avatar-specific behavior belongs to the user/profile use case layer, but the uploaded file itself belongs to Media.

Current Status

Media v1 persistence and domain foundations are implemented.

Implemented:

- frozen media and upload lifecycle enums;
- storage-provider, bucket and opaque storage-key identity;
- Media, MediaVariant, MediaReference, MediaUploadSession and MediaAuditLog persistence;
- private/authenticated/restricted visibility;
- reference-aware physical deletion protection;
- domain lifecycle transition rules and tests.
- Prisma repository bound through the Media domain contract;
- centralized avatar, cover, content-image and attachment upload policies;
- declared MIME type, extension and size validation.
- owner-scoped, short-lived upload-session orchestration;
- authenticated GraphQL initiate, inspect and abort operations;
- opaque temporary storage keys and upload-session persistence.
- authenticated multipart binary intake through a dedicated REST boundary;
- binary signature inspection for the Media v1 allowlist;
- exact size and optional SHA-256 checksum verification;
- compensating cleanup when persistence or queueing fails;
- typed BullMQ media-processing jobs and worker boundary validation.
- permanent `Media` records created before queue dispatch;
- Sharp WEBP conversion with EXIF-aware auto-rotation;
- policy-driven avatar, cover and content-image variants;
- atomic PostgreSQL READY/variant persistence;
- retry-safe processing and explicit FAILED state persistence;
- shared absolute local-storage root with path traversal protection.
- bounded Sharp input pixels and fail-fast decoding for hostile image payloads.
- atomic User-to-Media avatar assignment through GraphQL;
- active MediaReference replacement and immutable avatar audit records;
- cached public WEBP variant delivery without exposing storage paths;
- deterministic SVG fallback avatars.
- visibility-aware signed delivery issued through authenticated GraphQL;
- five-minute HMAC capabilities without bucket or storage-key disclosure;
- owner and `media.restricted.read` access enforcement;
- configurable retention with serializable orphan claiming;
- idempotent original/variant cleanup and audited completion/failure.

Not implemented yet:

- malware scanning for document attachments;

Architecture Rule

Do not duplicate Core Storage inside Media.

Media must use:

StorageService

from:

apps/api/src/core/storage

Feature modules must not depend on concrete storage providers.

Future Direction

The Media Platform should later support:

local storage in development;
S3-compatible storage;
Cloudflare R2;
image variants;
private media;
signed URLs;
virus scanning;
moderation workflows;
CDN integration.

The API should be designed so the storage backend can change without rewriting feature modules.
```
