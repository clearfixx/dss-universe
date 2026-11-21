/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Interaction Platform
 * 📄 File: apps/api/src/modules/interactions/contracts/poll-commands.contract.ts
 *
 * 🎯 Purpose:
 * Lets owner modules attach one poll to their Interaction Target.
 *
 * ⚠️ Important:
 * The owner decides whether the actor may create a poll (for example a Forum
 * topic author). Owners needing one atomic write with their own aggregate
 * compose it in root composition, as News drafts do.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { CreatePoll } from '../domain/types/poll.type';

export interface PollCommands {
  createPoll(command: CreatePoll): Promise<{ pollId: string }>;
}

export const POLL_COMMANDS = Symbol('POLL_COMMANDS');
