/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: D5 Presentation Boundaries
 * 📄 File: apps/api/src/modules/ai-core/presentation/graphql/inputs/run-editor-ai-command.input.ts
 * 🎯 Purpose: Defines existing editor AI request validation and mandatory consent.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Field, InputType } from '@nestjs/graphql';
import { EDITOR_PROFILES } from '@dss/editor';
import {
  Equals,
  IsBoolean,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { EditorAiCommand } from '../models/editor-ai-command.enum';

@InputType()
export class RunEditorAiCommandInput {
  @Field(() => EditorAiCommand)
  @IsEnum(EditorAiCommand)
  command!: EditorAiCommand;

  @Field()
  @IsString()
  @IsIn(EDITOR_PROFILES)
  profile!: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(12_000)
  sourceText?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(1_000)
  instruction?: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  language?: string;

  @Field()
  @IsBoolean()
  @Equals(true)
  externalProcessingConfirmed!: boolean;
}
