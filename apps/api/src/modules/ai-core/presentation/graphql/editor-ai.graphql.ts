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
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import type { EditorProfile } from '@dss/editor';
import { AuthUser, JwtAuthGuard, type AuthenticatedUser } from '@api/core/auth';
import {
  Permission,
  PermissionsGuard,
  RequirePermissions,
} from '@api/core/authorization';
import { EditorAiService } from '../../application/services/editor-ai.service';
import type { EditorAiCommandResult } from '../../domain/types/editor-ai-command.type';
import { RunEditorAiCommandInput } from './inputs/run-editor-ai-command.input';
import { EditorAiCommandResultModel } from './models/editor-ai-command-result.model';

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
