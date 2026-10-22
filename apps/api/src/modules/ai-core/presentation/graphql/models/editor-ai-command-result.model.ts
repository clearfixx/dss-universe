/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: D5 Presentation Boundaries
 * 📄 File: apps/api/src/modules/ai-core/presentation/graphql/models/editor-ai-command-result.model.ts
 * 🎯 Purpose: Defines the existing AI command result projection without inference logic.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import { EditorAiCommand } from './editor-ai-command.enum';

@ObjectType('EditorAiCommandResult')
export class EditorAiCommandResultModel {
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
