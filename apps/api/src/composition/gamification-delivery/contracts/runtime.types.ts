/** Broker wake inventory contains coordinates only, never owner input or a DB client. */
export type WakeReference = Readonly<{
  admissionId: string;
  epoch: string;
  sequence: string;
}>;
export interface WakeInventory {
  dueWakes(limit?: number): Promise<readonly WakeReference[]>;
}
export const GAMIFICATION_WAKE_INVENTORY = Symbol(
  'GAMIFICATION_WAKE_INVENTORY',
);
