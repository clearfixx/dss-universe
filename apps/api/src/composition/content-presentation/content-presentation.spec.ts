/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Content Presentation Composition Tests
 * 📄 File: apps/api/src/composition/content-presentation/content-presentation.spec.ts
 *
 * 🎯 Purpose:
 * Pins existing SDL, guards and allowlisted capability mappings without database IO.
 *
 * 🏗️ Architecture:
 * Root transport tests; HTTP suites separately prove owner policy integration.
 *
 * ⚠️ Important:
 * Source and metadata assertions do not replace authenticated HTTP regressions.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import {
  createSourceFile,
  isImportDeclaration,
  ScriptTarget,
} from 'typescript';
import { GUARDS_METADATA, MODULE_METADATA } from '@nestjs/common/constants';
import {
  GraphQLSchemaBuilderModule,
  GraphQLSchemaFactory,
} from '@nestjs/graphql';
import { Test } from '@nestjs/testing';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  Kind,
  parse,
  print,
  printSchema,
  lexicographicSortSchema,
} from 'graphql';
import { JwtAuthGuard, type AuthenticatedUser } from '@api/core/auth';
import { Permission, PermissionsGuard } from '@api/core/authorization';
import type { ContentGatePolicyView } from '@api/modules/content-access';
import { ContentPresentationModule } from './content-presentation.module';
import { ContentGatesResolver } from './presentation/graphql/content-gate.resolver';
import { EditorResolver } from './presentation/graphql/editor.resolver';
import { CreateContentGateInput } from './presentation/graphql/content-gate.input';
import {
  ContentGateOperator,
  ContentGateRequirementKind,
} from './presentation/graphql/content-gate.enums';

const actor: AuthenticatedUser = {
  id: 'viewer',
  sessionId: 'session',
  email: 'synthetic@dss.test',
  username: 'synthetic',
  roles: [],
  permissions: [],
};
const gate: ContentGatePolicyView = {
  id: 'gate',
  ownerId: 'owner',
  operator: 'ALL',
  requirements: [
    { id: 'requirement', kind: 'GROUP', groupKey: 'crew', threshold: null },
  ],
  createdAt: new Date(0),
  updatedAt: new Date(0),
};
const types = [
  'ContentGateOperator',
  'ContentGateRequirementKind',
  'ContentGateRequirementInput',
  'CreateContentGateInput',
  'ContentGateRequirementModel',
  'ContentGateModel',
  'ContentGateEvaluationModel',
  'PreviewEditorDocumentInput',
  'EditorDocumentPreview',
  'EditorContentGateDecision',
  'EditorDocumentDelivery',
];
const operations = [
  'createContentGate',
  'evaluateContentGate',
  'previewEditorDocument',
  'deliverEditorDocument',
];

describe('Content presentation composition', () => {
  it('keeps owners isolated and ORM imports confined to infrastructure', () => {
    const files = (directory: string): string[] =>
      readdirSync(directory, { withFileTypes: true }).flatMap((entry) =>
        entry.isDirectory()
          ? files(join(directory, entry.name))
          : entry.name.endsWith('.ts') && !entry.name.endsWith('.spec.ts')
            ? [join(directory, entry.name)]
            : [],
      );
    for (const owner of ['content-access', 'editor']) {
      for (const file of files(join(__dirname, '../../modules', owner))) {
        const source = createSourceFile(
          file,
          readFileSync(file, 'utf8'),
          ScriptTarget.Latest,
        );
        for (const declaration of source.statements.filter(
          isImportDeclaration,
        )) {
          const specifier = declaration.moduleSpecifier.getText(source);
          expect(specifier).not.toMatch(/@api\/(modules|composition)\//);
          if (!file.replaceAll('\\', '/').includes('/infrastructure/'))
            expect(specifier).not.toContain('@prisma/');
        }
      }
    }
  });
  it('retains all existing content wire types and operation signatures with one enum identity', async () => {
    const module = await Test.createTestingModule({
      imports: [GraphQLSchemaBuilderModule],
    }).compile();
    try {
      const schema = await module
        .get(GraphQLSchemaFactory)
        .create([ContentGatesResolver, EditorResolver]);
      const before = parse(
        readFileSync(join(__dirname, '../../schema.gql'), 'utf8'),
      );
      const after = parse(printSchema(lexicographicSortSchema(schema)));
      const project = (document: ReturnType<typeof parse>) =>
        document.definitions
          .flatMap((definition) => {
            if (!('name' in definition) || !definition.name) return [];
            if (types.includes(definition.name.value))
              return [print(definition)];
            if (
              definition.kind === Kind.OBJECT_TYPE_DEFINITION &&
              ['Query', 'Mutation'].includes(definition.name.value)
            )
              return (
                definition.fields
                  ?.filter((field) => operations.includes(field.name.value))
                  .map((field) => print(field)) ?? []
              );
            return [];
          })
          .sort();
      expect(project(after)).toHaveLength(types.length + operations.length);
      expect(
        createHash('sha256')
          .update(JSON.stringify(project(before)))
          .digest('hex'),
      ).toBe(
        '60abd5d5fc9b56c566b3b25cf23c335774db84b8028346a596d3d8d00686a2f6',
      );
      expect(project(after)).toEqual(project(before));
    } finally {
      await module.close();
    }
  });

  it('registers exactly two root resolvers', () => {
    expect(
      Reflect.getMetadata(MODULE_METADATA.PROVIDERS, ContentPresentationModule),
    ).toEqual([ContentGatesResolver, EditorResolver]);
  });

  it('preserves authentication and gate configuration permissions', () => {
    const handler = (
      name: 'createContentGate' | 'evaluateContentGate',
    ): object => {
      const value: unknown = Object.getOwnPropertyDescriptor(
        ContentGatesResolver.prototype,
        name,
      )?.value;
      if (typeof value !== 'function')
        throw new Error('Resolver handler missing');
      return value;
    };
    expect(Reflect.getMetadata(GUARDS_METADATA, EditorResolver)).toEqual([
      JwtAuthGuard,
    ]);
    expect(
      Reflect.getMetadata(GUARDS_METADATA, handler('createContentGate')),
    ).toEqual([JwtAuthGuard, PermissionsGuard]);
    expect(
      Reflect.getMetadata('permissions', handler('createContentGate')),
    ).toEqual([Permission.ContentGatesConfigure]);
    expect(
      Reflect.getMetadata(GUARDS_METADATA, handler('evaluateContentGate')),
    ).toEqual([JwtAuthGuard]);
  });

  it('normalizes creation input and excludes fields outside the policy wire projection', async () => {
    const supplied = { ...gate, privateEvidence: 'must not escape' };
    const create = jest.fn().mockResolvedValue(supplied);
    const resolver = new ContentGatesResolver(
      { create },
      { evaluate: jest.fn() },
    );
    expect(
      await resolver.createContentGate(actor, {
        operator: ContentGateOperator.ALL,
        requirements: [
          { kind: ContentGateRequirementKind.GROUP, groupKey: ' crew ' },
        ],
      }),
    ).toEqual(gate);
    expect(create).toHaveBeenCalledWith({
      ownerId: actor.id,
      operator: 'ALL',
      requirements: [{ kind: 'GROUP', groupKey: 'crew', threshold: null }],
    });
  });

  it('maps evaluation without reading facts or granting access', async () => {
    const evaluate = jest.fn().mockResolvedValue({
      gate,
      allowed: false,
      bypassed: false,
      unmet: ['GROUP'],
      notice: 'denied',
      privateEvidence: 'must not escape',
    });
    const resolver = new ContentGatesResolver(
      { create: jest.fn() },
      { evaluate },
    );
    expect(await resolver.evaluateContentGate(actor, 'gate')).toEqual({
      gate,
      allowed: false,
      bypassed: false,
      unmet: ['GROUP'],
      notice: 'denied',
    });
    expect(evaluate).toHaveBeenCalledWith('gate', actor.id);
  });

  it('does not expose an internal document in preview or delivery', async () => {
    const preview = jest.fn().mockResolvedValue({
      canonicalJson: 'canonical',
      html: 'html',
      plainText: 'text',
      searchText: 'search',
      document: 'internal',
    });
    const project = jest.fn().mockResolvedValue({
      documentJson: 'redacted',
      gates: [
        {
          gateId: 'gate',
          allowed: false,
          bypassed: false,
          unmet: ['GROUP'],
          notice: 'denied',
          privateEvidence: 'internal',
        },
      ],
      document: 'protected',
    });
    const resolver = new EditorResolver({ preview }, { project });
    expect(
      await resolver.previewEditorDocument({ documentJson: 'raw' }),
    ).toEqual({
      canonicalJson: 'canonical',
      html: 'html',
      plainText: 'text',
      searchText: 'search',
    });
    expect(
      await resolver.deliverEditorDocument(actor, { documentJson: 'raw' }),
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
    expect(project).toHaveBeenCalledWith('raw', actor.id);
  });

  it('propagates delivery provider failure without returning the input document', async () => {
    const failure = new Error('synthetic gate provider failure');
    const resolver = new EditorResolver(
      { preview: jest.fn() },
      { project: jest.fn().mockRejectedValue(failure) },
    );
    await expect(
      resolver.deliverEditorDocument(actor, { documentJson: 'protected' }),
    ).rejects.toBe(failure);
  });

  it('preserves creation failure without a fallback policy', async () => {
    const failure = new Error('synthetic create failure');
    const resolver = new ContentGatesResolver(
      { create: jest.fn().mockRejectedValue(failure) },
      { evaluate: jest.fn() },
    );
    await expect(
      resolver.createContentGate(actor, {
        operator: ContentGateOperator.ANY,
        requirements: [],
      }),
    ).rejects.toBe(failure);
  });

  it.each(['operator', 'kind'])(
    'rejects unknown %s wire values',
    async (field) => {
      const input = plainToInstance(CreateContentGateInput, {
        operator: field === 'operator' ? 'UNKNOWN' : 'ALL',
        requirements: [
          { kind: field === 'kind' ? 'UNKNOWN' : 'GROUP', groupKey: 'crew' },
        ],
      });
      expect(await validate(input)).not.toHaveLength(0);
    },
  );
});
