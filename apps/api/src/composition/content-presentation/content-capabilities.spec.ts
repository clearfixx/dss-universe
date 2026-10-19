/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Content Capability Tests
 * 📄 File: apps/api/src/composition/content-presentation/content-capabilities.spec.ts
 *
 * 🎯 Purpose:
 * Verifies owner-local adapters preserve delegation and exclude internal documents.
 *
 * 🏗️ Architecture:
 * Test-only private owner imports; runtime root consumes only public tokens.
 *
 * ⚠️ Important:
 * Synthetic providers isolate mapping; actual policy is covered by HTTP regressions.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Test } from '@nestjs/testing';
import { ContentGateCreatorService } from '../../modules/content-access/application/services/content-gate-creator.service';
import { ContentGatePolicyEvaluatorService } from '../../modules/content-access/application/services/content-gate-policy-evaluator.service';
import { ContentGatesService } from '../../modules/content-access/application/services/content-gates.service';
import { EditorPreviewReaderService } from '../../modules/editor/application/services/editor-preview-reader.service';
import { EditorDeliveryReaderService } from '../../modules/editor/application/services/editor-delivery-reader.service';
import { EditorService } from '../../modules/editor/application/services/editor.service';
import { EditorContentDeliveryService } from '../../modules/editor/application/services/editor-content-delivery.service';

describe('Content owner capabilities', () => {
  it('delegates creation and evaluation only to the owner use cases', async () => {
    const create = jest.fn().mockResolvedValue({ id: 'gate' });
    const evaluate = jest.fn().mockResolvedValue({ allowed: false });
    const module = await Test.createTestingModule({
      providers: [
        ContentGateCreatorService,
        ContentGatePolicyEvaluatorService,
        { provide: ContentGatesService, useValue: { create, evaluate } },
      ],
    }).compile();
    try {
      const input = {
        ownerId: 'owner',
        operator: 'ALL' as const,
        requirements: [
          { kind: 'GROUP' as const, groupKey: 'crew', threshold: null },
        ],
      };
      expect(await module.get(ContentGateCreatorService).create(input)).toEqual(
        { id: 'gate' },
      );
      expect(create).toHaveBeenCalledWith(input);
      expect(
        await module
          .get(ContentGatePolicyEvaluatorService)
          .evaluate('gate', 'viewer'),
      ).toEqual({ allowed: false });
      expect(evaluate).toHaveBeenCalledWith('gate', 'viewer');
    } finally {
      await module.close();
    }
  });

  it('allowlists preview and delivery without the canonical document object', async () => {
    const preview = jest.fn().mockResolvedValue({
      canonicalJson: 'canonical',
      html: 'html',
      plainText: 'text',
      searchText: 'search',
      document: { private: 'not a transport result' },
    });
    const project = jest.fn().mockResolvedValue({
      documentJson: 'redacted',
      document: { private: 'not a transport result' },
      gates: [
        {
          gateId: 'gate',
          allowed: false,
          bypassed: false,
          unmet: ['GROUP'],
          notice: 'denied',
          privateEvidence: 'not a transport result',
        },
      ],
    });
    const module = await Test.createTestingModule({
      providers: [
        EditorPreviewReaderService,
        EditorDeliveryReaderService,
        { provide: EditorService, useValue: { preview } },
        { provide: EditorContentDeliveryService, useValue: { project } },
      ],
    }).compile();
    try {
      expect(
        await module.get(EditorPreviewReaderService).preview('raw'),
      ).toEqual({
        canonicalJson: 'canonical',
        html: 'html',
        plainText: 'text',
        searchText: 'search',
      });
      expect(
        await module.get(EditorDeliveryReaderService).project('raw', 'viewer'),
      ).toEqual({
        documentJson: 'redacted',
        gates: [
          {
            gateId: 'gate',
            allowed: false,
            bypassed: false,
            unmet: ['GROUP'],
            notice: 'denied',
          },
        ],
      });
      expect(preview).toHaveBeenCalledWith('raw');
      expect(project).toHaveBeenCalledWith('raw', 'viewer');
    } finally {
      await module.close();
    }
  });

  it('propagates owner delivery errors without a raw fallback', async () => {
    const failure = new Error('synthetic provider failure');
    const module = await Test.createTestingModule({
      providers: [
        EditorDeliveryReaderService,
        {
          provide: EditorContentDeliveryService,
          useValue: { project: jest.fn().mockRejectedValue(failure) },
        },
      ],
    }).compile();
    try {
      await expect(
        module.get(EditorDeliveryReaderService).project('protected', 'viewer'),
      ).rejects.toBe(failure);
    } finally {
      await module.close();
    }
  });
});
