/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Interaction Platform
 * 📄 File: apps/api/src/modules/interactions/domain/poll.rules.ts
 *
 * 🎯 Purpose:
 * Pure validation for poll definitions and ballots.
 *
 * ⚠️ Important:
 * Database constraints repeat these bounds; both must change together.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { BadRequestException } from '@nestjs/common';
import { POLL_VISIBILITIES, type CreatePoll } from './types/poll.type';

export const POLL_MIN_OPTIONS = 2;
export const POLL_MAX_OPTIONS = 20;

export function normalizePollDefinition(input: CreatePoll): CreatePoll {
  const question = input.question.trim();
  if (question.length < 3 || question.length > 300) {
    throw new BadRequestException(
      'Poll question must contain 3 to 300 characters.',
    );
  }
  const options = input.options.map((label) => label.trim());
  if (options.length < POLL_MIN_OPTIONS || options.length > POLL_MAX_OPTIONS) {
    throw new BadRequestException(
      `A poll requires ${POLL_MIN_OPTIONS} to ${POLL_MAX_OPTIONS} options.`,
    );
  }
  if (options.some((label) => label.length < 1 || label.length > 200)) {
    throw new BadRequestException(
      'Poll options must contain 1 to 200 characters.',
    );
  }
  if (
    new Set(options.map((label) => label.toLocaleLowerCase())).size !==
    options.length
  ) {
    throw new BadRequestException('Poll options must be unique.');
  }
  if (!POLL_VISIBILITIES.includes(input.visibility)) {
    throw new BadRequestException('Unknown poll visibility.');
  }
  if (
    !Number.isInteger(input.maxChoices) ||
    input.maxChoices < 1 ||
    input.maxChoices > options.length
  ) {
    throw new BadRequestException(
      'maxChoices must be between 1 and the number of options.',
    );
  }
  return { ...input, question, options };
}

export function normalizeBallot(
  optionIds: readonly string[],
  validOptionIds: ReadonlySet<string>,
  maxChoices: number,
): string[] {
  const unique = [...new Set(optionIds)];
  if (unique.length !== optionIds.length) {
    throw new BadRequestException('A ballot cannot repeat an option.');
  }
  if (unique.length < 1 || unique.length > maxChoices) {
    throw new BadRequestException(
      `A ballot must select between 1 and ${maxChoices} option(s).`,
    );
  }
  if (unique.some((id) => !validOptionIds.has(id))) {
    throw new BadRequestException(
      'A ballot option does not belong to the poll.',
    );
  }
  return unique;
}
