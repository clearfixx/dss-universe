/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 🤖 Module: AI Core
 * 📄 File: apps/api/src/modules/ai-core/presentation/graphql/editor-ai.graphql.ts
 *
 * 🎯 Purpose:
 * Exposes permission-protected, human-confirmed editor AI commands.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { UseGuards } from '@nestjs/common';
import {
  Args,
  Field,
  ID,
  InputType,
  Int,
  Mutation,
  ObjectType,
  registerEnumType,
  Resolver,
} from '@nestjs/graphql';
import { EDITOR_PROFILES, type EditorProfile } from '@dss/editor';
import {
  Equals,
  IsBoolean,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

import { AuthUser, JwtAuthGuard, type AuthenticatedUser } from '@api/core/auth';
import {
  Permission,
  PermissionsGuard,
  RequirePermissions,
} from '@api/core/authorization';

import { EditorAiService } from '../../application/services/editor-ai.service';
import {
  EditorAiCommand,
  type EditorAiCommandResult,
} from '../../domain/types/editor-ai-command.type';

registerEnumType(EditorAiCommand, { name: 'EditorAiCommand' });

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

@ObjectType('EditorAiCommandResult')
class EditorAiCommandResultModel {
  @Field(() => ID)
  generationId!: string;

  @Field()
  provider!: string;

  @Field()
  model!: string;

  @Field()
  promptVersion!: string;

  @Field(() => EditorAiCommand)
  command!: EditorAiCommand;

  @Field()
  generatedText!: string;

  @Field(() => Int, { nullable: true })
  inputTokens!: number | null;

  @Field(() => Int, { nullable: true })
  outputTokens!: number | null;

  @Field()
  generatedContentLabel!: string;

  @Field()
  requiresConfirmation!: boolean;
}

@Resolver()
export class EditorAiResolver {
  constructor(private readonly editorAi: EditorAiService) {}

  @Mutation(() => EditorAiCommandResultModel)
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions(Permission.AiEditorUse)
  runEditorAiCommand(
    @AuthUser() actor: AuthenticatedUser,
    @Args('input') input: RunEditorAiCommandInput,
  ): Promise<EditorAiCommandResult> {
    return this.editorAi.run({
      actorId: actor.id,
      command: input.command,
      profile: input.profile as EditorProfile,
      sourceText: input.sourceText ?? null,
      instruction: input.instruction ?? null,
      language: input.language ?? null,
      externalProcessingConfirmed: input.externalProcessingConfirmed,
    });
  }
}

/** This mutation creates a proposal, never a publication. */
