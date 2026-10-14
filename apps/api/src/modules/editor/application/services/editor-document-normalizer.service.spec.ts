/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: DSS Editor Tests
 * 📄 File: apps/api/src/modules/editor/application/services/editor-document-normalizer.service.spec.ts
 *
 * 🎯 Purpose:
 * Proves profile pinning and canonical validation at the public normalization boundary.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { createEmptyEditorDocument } from '@dss/editor';
import { BadRequestException } from '@nestjs/common';
import { EditorDocumentNormalizerService } from './editor-document-normalizer.service';
import { EditorService } from './editor.service';
import type { EditorHtmlRenderer } from '../../infrastructure/rendering/editor-html.renderer';

describe('EditorDocumentNormalizerService', () => {
  const service = new EditorDocumentNormalizerService(
    new EditorService({} as EditorHtmlRenderer),
  );
  it.each(['NEWS', 'COMMENT'] as const)(
    'normalizes only its pinned %s profile',
    (profile) => {
      const document = createEmptyEditorDocument(profile);
      const normalize = (documentJson: string) =>
        profile === 'NEWS'
          ? service.normalizeNews(documentJson)
          : service.normalizeComment(documentJson);
      expect(normalize(JSON.stringify(document))).toEqual({
        document,
        canonicalJson: JSON.stringify(document),
        plainText: '',
        searchText: '',
      });
      const other = createEmptyEditorDocument(
        profile === 'NEWS' ? 'COMMENT' : 'NEWS',
      );
      expect(() => normalize(JSON.stringify(other))).toThrow(
        'Editor document must use the ' + profile + ' profile.',
      );
    },
  );
  it('rejects malformed and oversized JSON instead of fabricating a projection', () => {
    expect(() => service.normalizeNews('{')).toThrow(BadRequestException);
    expect(() => service.normalizeComment('x'.repeat(1_000_001))).toThrow(
      BadRequestException,
    );
  });
});
