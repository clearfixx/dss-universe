/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Content Presentation Composition
 * 📄 File: apps/api/src/composition/content-presentation/presentation/graphql/editor.model.ts
 *
 * 🎯 Purpose:
 * Defines GraphQL-safe derived projections for a validated editor document.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Field, ID, ObjectType } from '@nestjs/graphql';
import { ContentGateRequirementKind } from './content-gate.enums';

@ObjectType('EditorDocumentPreview')
export class EditorDocumentPreviewModel {
  @Field()
  canonicalJson!: string;

  @Field()
  html!: string;

  @Field()
  plainText!: string;

  @Field()
  searchText!: string;
}

@ObjectType('EditorContentGateDecision')
export class EditorContentGateDecisionModel {
  @Field(() => ID)
  gateId!: string;

  @Field()
  allowed!: boolean;

  @Field()
  bypassed!: boolean;

  @Field(() => [ContentGateRequirementKind])
  unmet!: ContentGateRequirementKind[];

  @Field()
  notice!: string;
}

@ObjectType('EditorDocumentDelivery')
export class EditorDocumentDeliveryModel {
  @Field()
  documentJson!: string;

  @Field(() => [EditorContentGateDecisionModel])
  gates!: EditorContentGateDecisionModel[];
}

/** The preview is disposable; the canonical JSON is the source of truth. */
