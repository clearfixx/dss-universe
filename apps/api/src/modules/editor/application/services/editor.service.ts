/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: DSS Editor Platform
 * 📄 File: apps/api/src/modules/editor/application/services/editor.service.ts
 *
 * 🎯 Purpose:
 * Validates canonical documents and coordinates safe derived projections.
 *
 * 🧠 Responsibilities:
 * • parses bounded untrusted JSON;
 * • enforces the shared versioned profile contract;
 * • derives HTML, plain-text and search projections;
 * • prevents arbitrary HTML from entering content modules.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { BadRequestException, Injectable } from '@nestjs/common';
import {
  projectEditorPlainText,
  projectEditorSearchText,
  validateEditorDocument,
  type EditorProfile,
} from '@dss/editor';

import { EditorHtmlRenderer } from '../../infrastructure/rendering/editor-html.renderer';
import type {
  EditorPreview,
  EditorProjection,
} from '../types/editor-preview.type';

const MAX_DOCUMENT_JSON_BYTES = 1_000_000;

@Injectable()
export class EditorService {
  constructor(private readonly renderer: EditorHtmlRenderer) {}

  async preview(documentJson: string): Promise<EditorPreview> {
    const projection = this.normalize(documentJson);
    return {
      ...projection,
      html: await this.renderer.render(projection.document),
    };
  }

  normalize(
    documentJson: string,
    expectedProfile?: EditorProfile,
  ): EditorProjection {
    if (
      documentJson.length === 0 ||
      Buffer.byteLength(documentJson, 'utf8') > MAX_DOCUMENT_JSON_BYTES
    ) {
      throw new BadRequestException(
        'Editor document JSON has an invalid size.',
      );
    }

    const result = validateEditorDocument(this.parse(documentJson));
    if (!result.valid) {
      throw new BadRequestException({
        message: 'Editor document validation failed.',
        errors: result.errors,
      });
    }

    const document = result.document;
    if (expectedProfile && document.profile !== expectedProfile) {
      throw new BadRequestException(
        `Editor document must use the ${expectedProfile} profile.`,
      );
    }
    return {
      document,
      canonicalJson: JSON.stringify(document),
      plainText: projectEditorPlainText(document),
      searchText: projectEditorSearchText(document),
    };
  }

  private parse(documentJson: string): unknown {
    try {
      return JSON.parse(documentJson) as unknown;
    } catch {
      throw new BadRequestException('Editor document must be valid JSON.');
    }
  }
}

/** Raw HTML is not an editor format. It is an unsupervised spacewalk. */
