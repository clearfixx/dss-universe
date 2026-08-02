/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: DSS Editor Platform
 * 📄 File: apps/api/src/modules/editor/presentation/graphql/editor.input.ts
 *
 * 🎯 Purpose:
 * Defines the bounded GraphQL input for server-side editor preview.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { Field, InputType } from '@nestjs/graphql';
import { IsString, MaxLength, MinLength } from 'class-validator';

@InputType()
export class PreviewEditorDocumentInput {
  @Field()
  @IsString()
  @MinLength(1)
  @MaxLength(1_000_000)
  documentJson!: string;
}

/** JSON enters through one narrow hatch and meets the validator immediately. */
