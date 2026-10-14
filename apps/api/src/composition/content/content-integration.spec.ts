/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Content Composition Tests
 * 📄 File: apps/api/src/composition/content/content-integration.spec.ts
 *
 * 🎯 Purpose:
 * Pins minimal provider surfaces and explicit closed-kind adaptation.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { MODULE_METADATA } from '@nestjs/common/constants';
import { createEmptyEditorDocument } from '@dss/editor';
import {
  ContentAccessModule,
  CONTENT_GATE_DECISIONS,
  type ContentGateDecisions,
} from '@api/modules/content-access';
import {
  EditorModule,
  EDITOR_DOCUMENT_NORMALIZER,
  type EditorDocumentNormalizer,
} from '@api/modules/editor';
import { NewsDocumentAdapter } from './infrastructure/news-document.adapter';
import { CommentDocumentAdapter } from './infrastructure/comment-document.adapter';
import { EditorGateDecisionAdapter } from './infrastructure/editor-gate-decision.adapter';

describe('Content integration boundaries', () => {
  it('keeps concrete Editor and Content Access services private', () => {
    expect(Reflect.getMetadata(MODULE_METADATA.EXPORTS, EditorModule)).toEqual([
      EDITOR_DOCUMENT_NORMALIZER,
    ]);
    expect(
      Reflect.getMetadata(MODULE_METADATA.EXPORTS, ContentAccessModule),
    ).toEqual([CONTENT_GATE_DECISIONS]);
    expect(
      Reflect.getMetadata(MODULE_METADATA.IMPORTS, EditorModule) ?? [],
    ).toEqual([]);
  });
  it('routes News and comments through different pinned provider operations and strips unused fields', () => {
    const document = createEmptyEditorDocument('NEWS');
    const projection = {
      document,
      canonicalJson: '{}',
      plainText: 'Text',
      searchText: 'text',
      privateField: 'must not escape',
    };
    const editor = {
      normalizeNews: jest.fn().mockReturnValue(projection),
      normalizeComment: jest.fn().mockReturnValue(projection),
    } satisfies jest.Mocked<EditorDocumentNormalizer>;
    expect(new NewsDocumentAdapter(editor).normalize('news')).toEqual({
      document,
      plainText: 'Text',
      searchText: 'text',
    });
    expect(new CommentDocumentAdapter(editor).normalize('comment')).toEqual({
      document,
      canonicalJson: '{}',
      plainText: 'Text',
      searchText: 'text',
    });
    expect(editor.normalizeNews.mock.calls).toEqual([['news']]);
    expect(editor.normalizeComment.mock.calls).toEqual([['comment']]);
  });
  it('translates every supported verdict kind and drops extra provider fields', async () => {
    const unmet = [
      'ACCOUNT_AGE_DAYS',
      'COMMENTS',
      'FORUM_POSTS',
      'PUBLICATIONS',
      'REPUTATION',
      'GROUP',
    ] as const;
    const decisions = {
      evaluate: jest.fn().mockResolvedValue({
        gateId: 'gate',
        allowed: false,
        bypassed: false,
        unmet: [...unmet],
        notice: 'Denied',
        ownerId: 'must not escape',
      }),
    } satisfies jest.Mocked<ContentGateDecisions>;
    expect(
      await new EditorGateDecisionAdapter(decisions).evaluate('gate', null),
    ).toEqual({
      gateId: 'gate',
      allowed: false,
      bypassed: false,
      unmet: [...unmet],
      notice: 'Denied',
    });
    expect(decisions.evaluate.mock.calls).toEqual([['gate', null]]);
  });
  it('propagates provider failures through each root adapter', async () => {
    const failure = new Error('Unavailable');
    const editor = {
      normalizeNews: jest.fn().mockImplementation(() => {
        throw failure;
      }),
      normalizeComment: jest.fn().mockImplementation(() => {
        throw failure;
      }),
    } satisfies jest.Mocked<EditorDocumentNormalizer>;
    expect(() => new NewsDocumentAdapter(editor).normalize('news')).toThrow(
      failure,
    );
    expect(() =>
      new CommentDocumentAdapter(editor).normalize('comment'),
    ).toThrow(failure);
    const decisions = {
      evaluate: jest.fn().mockRejectedValue(failure),
    } satisfies jest.Mocked<ContentGateDecisions>;
    await expect(
      new EditorGateDecisionAdapter(decisions).evaluate('gate', 'viewer'),
    ).rejects.toThrow(failure);
  });
});
