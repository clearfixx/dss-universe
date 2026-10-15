/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Custom Titles
 * 📄 File: apps/api/src/modules/custom-titles/contracts/title-grant-transaction.port.ts
 *
 * 🎯 Purpose:
 * Defines an atomic title grant command without exposing persistence or recipient callbacks.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type { TitleGrantResult } from '../domain/types/custom-titles.type';

export type GrantCustomTitle = Readonly<{
  userId: string;
  titleId: string;
  reason: string;
  actorId: string;
}>;
export interface TitleGrantTransaction {
  grant(input: GrantCustomTitle): Promise<TitleGrantResult>;
}
export const TITLE_GRANT_TRANSACTION = Symbol('TITLE_GRANT_TRANSACTION');
