# DSS Media Platform

> Status: ✅ Architecture Frozen (v1)
>
> Version: 1.0
>
> DSS Universe Architecture Document

---

# Philosophy

The DSS Media Platform is the single gateway for every media asset inside DSS Universe.

No feature module may work with uploaded files directly.

Every avatar, profile cover, blog image, forum attachment, CMS asset, AI generated image or future media type must pass through the DSS Media Platform.

The platform owns the complete media lifecycle.

Feature modules own business logic.

The Media Platform owns media logic.

---

# Why

Without a central media platform every module eventually implements its own:

- upload logic
- filename generation
- image optimization
- mime validation
- storage integration
- resize pipeline
- delete logic
- security checks

This leads to duplicated code, inconsistent behavior and expensive maintenance.

The DSS Media Platform exists to eliminate this problem permanently.

---

# Design Principles

## Single Entry Point

Every uploaded file enters DSS Universe through the Media Platform.

Never directly.

---

## Storage Agnostic

Media must never know where files are stored.

Today's implementation:

- Local Storage

Future implementations:

- Amazon S3
- Cloudflare R2
- Azure Blob Storage
- Google Cloud Storage
- MinIO

Replacing the storage backend must require changing only the Storage Provider.

---

## Feature Agnostic

The Media Platform knows nothing about:

- Users
- Forum
- Blog
- CMS
- Academy

Instead it knows only media operations.

Examples:

Create Avatar

Create Cover

Create Image

Create Attachment

Generate Variants

Delete Media

---

## Immutable Processing Pipeline

Every uploaded media file passes through the same processing stages.

```

Upload

↓

Validation

↓

Mime Verification

↓

Image Processing

↓

Variant Generation

↓

Filename Generation

↓

Storage

↓

Response

```

No feature module may bypass this pipeline.

---

# Responsibilities

The Media Platform owns:

- upload processing
- image conversion
- resize
- thumbnail generation
- filename generation
- mime validation
- file size validation
- metadata extraction
- storage communication
- future CDN integration

The Media Platform does NOT own:

- user profiles
- blog posts
- forum topics
- CMS pages

---

# Platform Architecture

```

Feature Module

↓

DSS Media Platform

↓

DSS Storage Platform

↓

Storage Provider

↓

Disk / S3 / R2 / ...

```

---

# DSS Storage Platform

Storage is independent from Media.

Storage answers only one question:

> Where and how are files stored?

Media answers:

> How should media files behave?

---

# Directory Structure

```

uploads/

users/
avatars/
covers/

blog/
images/

forum/
attachments/
images/

cms/
assets/

academy/

ai/

```

The structure may evolve without affecting feature modules.

---

# Image Standards

Accepted upload formats:

- JPEG
- PNG
- WEBP

Maximum upload size:

5 MB

Internal storage format:

WEBP

Future formats may be added.

---

# Avatar Standard

Generated files:

```

original.webp
avatar_96.webp
avatar_256.webp
avatar_512.webp

```

Feature modules never generate image variants.

Only the Media Platform.

---

# Cover Standard

Generated files:

```

original.webp
cover_large.webp

```

Future variants may be added.

---

# Filename Strategy

The Media Platform owns filename generation.

Feature modules never generate filenames.

Future implementations may use:

- UUID
- ULID
- Hashes
- User IDs

Changing the strategy must not affect feature modules.

---

# Validation

Every upload passes:

- MIME validation
- file size validation
- image decoding
- corruption detection

Future:

- malware scanning
- AI moderation
- EXIF cleanup

---

# Image Processing

The first implementation uses:

- Sharp

Responsibilities:

- resize
- convert to WEBP
- optimize
- strip metadata
- generate variants

Feature modules never call Sharp directly.

---

# Public API

Feature modules communicate only with Media Services.

Example:

```

Users
↓

MediaPlatform.createAvatar()

```

```

Blog
↓

MediaPlatform.createArticleImage()

```

```

Forum
↓

MediaPlatform.createAttachment()

```

The Media Platform decides everything else.

---

# Security

The platform must protect against:

- oversized uploads
- invalid mime types
- corrupted files
- executable uploads
- path traversal
- duplicate filename attacks

Future:

- antivirus scanning
- content moderation

---

# Future Roadmap

Version 1

- Local Storage
- Avatar
- Covers
- Image Resize
- WEBP
- Filename Generator

Version 2

- Blog Images
- Forum Attachments
- CMS Assets
- Gallery Support

Version 3

- S3
- Cloudflare R2
- Signed URLs
- CDN

Version 4

- Video Processing
- Audio Processing
- PDF Preview
- AI Generated Assets

---

# Golden Rule

No DSS module may process media files directly.

Every media operation must go through the DSS Media Platform.

This rule is considered part of the DSS Universe Architecture.

Breaking this rule requires an architecture review.

---

# Final Note

The DSS Media Platform is not an Avatar system.

Avatar is simply the first client of the platform.

The platform exists to provide a single, scalable and future-proof media infrastructure for every module of DSS Universe.

Build once.

Reuse everywhere.

Build. Share. Grow.
