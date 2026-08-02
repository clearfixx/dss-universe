/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: DSS Editor Platform
 * 📄 File: apps/api/src/modules/editor/presentation/graphql/editor.model.ts
 *
 * 🎯 Purpose:
 * Defines GraphQL-safe derived projections for a validated editor document.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Field, ObjectType } from '@nestjs/graphql';

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

/** The preview is disposable; the canonical JSON is the source of truth. */
