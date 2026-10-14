/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Content Read Composition
 * 📄 File: apps/api/src/composition/content-reads/infrastructure/news-media-evidence.adapter.ts
 *
 * 🎯 Purpose:
 * Adapts published Media evidence to the News-owned attachment policy port.
 *
 * 🧠 Responsibilities:
 * • exposes only the operation-specific data required by its consumer;
 * • preserves owner validation and propagates failures without defaults.
 *
 * 🏗️ Architecture:
 * Narrow dependency boundary; policy and persistence stay with their owners.
 *
 * ⚠️ Important:
 * No credentials, gate aggregate or ORM transaction crosses this boundary.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Inject, Injectable } from '@nestjs/common';
import {
  MEDIA_PUBLICATION_EVIDENCE,
  type MediaPublicationEvidenceReader,
} from '@api/modules/media';
import type {
  NewsMediaEvidenceReader,
  NewsMediaEvidence,
} from '@api/modules/news';

@Injectable()
export class NewsMediaEvidenceAdapter implements NewsMediaEvidenceReader {
  constructor(
    @Inject(MEDIA_PUBLICATION_EVIDENCE)
    private readonly media: MediaPublicationEvidenceReader,
  ) {}
  async findById(id: string): Promise<NewsMediaEvidence | null> {
    const evidence = await this.media.findById(id);
    return evidence
      ? {
          ownerId: evidence.ownerId,
          isPublic: evidence.isPublic,
          isReady: evidence.isReady,
        }
      : null;
  }
}
