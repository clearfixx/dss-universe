/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: AI Core Presentation
 * 📄 File: apps/api/src/modules/ai-core/presentation/graphql/inputs/run-editor-ai-command.input.spec.ts
 * 🎯 Purpose: Preserves request validation and explicit external-processing consent.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { validateSync } from 'class-validator';
import { EditorAiCommand } from '../models/editor-ai-command.enum';
import { RunEditorAiCommandInput } from './run-editor-ai-command.input';

describe('RunEditorAiCommandInput', () => {
  const valid = {
    command: EditorAiCommand.Generate,
    profile: 'NEWS',
    externalProcessingConfirmed: true,
  };
  it('accepts the existing minimal confirmed request', () => {
    expect(
      validateSync(Object.assign(new RunEditorAiCommandInput(), valid)),
    ).toEqual([]);
  });
  it.each([false, undefined, null, 'true', 1])(
    'rejects missing or non-boolean consent %s',
    (externalProcessingConfirmed) => {
      expect(
        validateSync(
          Object.assign(new RunEditorAiCommandInput(), valid, {
            externalProcessingConfirmed,
          }),
        ),
      ).not.toEqual([]);
    },
  );
  it.each(['command', 'profile'])('rejects an unknown %s', (field) => {
    expect(
      validateSync(
        Object.assign(new RunEditorAiCommandInput(), valid, {
          [field]: 'UNKNOWN',
        }),
      ),
    ).not.toEqual([]);
  });
  it.each([
    ['sourceText', 12000],
    ['instruction', 1000],
    ['language', 64],
  ] as const)('preserves the maximum length of %s', (field, maximum) => {
    expect(
      validateSync(
        Object.assign(new RunEditorAiCommandInput(), valid, {
          [field]: 'a'.repeat(maximum),
        }),
      ),
    ).toEqual([]);
    expect(
      validateSync(
        Object.assign(new RunEditorAiCommandInput(), valid, {
          [field]: 'a'.repeat(maximum + 1),
        }),
      ),
    ).not.toEqual([]);
  });
});
