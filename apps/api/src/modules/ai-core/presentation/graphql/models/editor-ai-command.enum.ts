/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: D5 Presentation Boundaries
 * 📄 File: apps/api/src/modules/ai-core/presentation/graphql/models/editor-ai-command.enum.ts
 * 🎯 Purpose: Registers the existing private editor AI command wire enum.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { registerEnumType } from '@nestjs/graphql';
import { EditorAiCommand } from '../../../domain/types/editor-ai-command.type';

registerEnumType(EditorAiCommand, { name: 'EditorAiCommand' });

export { EditorAiCommand };
