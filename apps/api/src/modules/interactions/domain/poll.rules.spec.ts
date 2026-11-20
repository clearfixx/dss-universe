/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Interaction Platform
 * 📄 File: apps/api/src/modules/interactions/domain/poll.rules.spec.ts
 *
 * 🎯 Purpose:
 * Verifies poll definition and ballot validation.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { BadRequestException } from '@nestjs/common';
import { normalizeBallot, normalizePollDefinition } from './poll.rules';
import type { CreatePoll } from './types/poll.type';

describe('poll rules', () => {
  const base: CreatePoll = {
    interactionTargetId: 'target',
    createdById: 'author',
    question: '  Which editor do you use?  ',
    options: [' VS Code ', 'Neovim', 'JetBrains'],
    visibility: 'OPEN',
    maxChoices: 1,
  };

  it('trims the question and options', () => {
    expect(normalizePollDefinition(base)).toMatchObject({
      question: 'Which editor do you use?',
      options: ['VS Code', 'Neovim', 'JetBrains'],
    });
  });

  it.each([
    { question: 'ab' },
    { question: 'x'.repeat(301) },
    { options: ['Only one'] },
    { options: Array.from({ length: 21 }, (_, i) => `Option ${i}`) },
    { options: ['Same', ' same '] },
    { options: ['Valid', '   '] },
    { maxChoices: 0 },
    { maxChoices: 4 },
    { maxChoices: 1.5 },
    { visibility: 'SECRET' as never },
  ])('rejects invalid definition %j', (override) => {
    expect(() => normalizePollDefinition({ ...base, ...override })).toThrow(
      BadRequestException,
    );
  });

  it('accepts multi-choice polls up to the option count', () => {
    expect(normalizePollDefinition({ ...base, maxChoices: 3 }).maxChoices).toBe(
      3,
    );
  });

  const valid = new Set(['a', 'b', 'c']);

  it('accepts a ballot within maxChoices', () => {
    expect(normalizeBallot(['a'], valid, 1)).toEqual(['a']);
    expect(normalizeBallot(['a', 'c'], valid, 2)).toEqual(['a', 'c']);
  });

  it.each([
    [[], 1],
    [['a', 'b'], 1],
    [['a', 'a'], 2],
    [['x'], 1],
  ])('rejects ballot %j with maxChoices %i', (ids, maxChoices) => {
    expect(() => normalizeBallot(ids, valid, maxChoices)).toThrow(
      BadRequestException,
    );
  });
});
