/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Gamification Delivery Composition
 * 📄 File: apps/api/src/composition/gamification-delivery/contracts/routing.types.ts
 * 🎯 Purpose: Defines explicit routing commands without ORM or queue dependencies.
 * 🧠 Responsibilities: Describes control, discovery and publication receipts.
 * 🏗️ Architecture: Technical composition contracts; no scoring policy.
 * ⚠️ Important: Queue acknowledgement is not an award receipt.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export type RoutingOperator = Readonly<{
  actorId: string;
  actorType: 'USER' | 'SYSTEM' | 'SERVICE';
}>;
export type ActivationView = Readonly<{
  state: 'PREPARED' | 'ACTIVE' | 'PAUSED';
  cutoff: Date | null;
  revision: bigint;
}>;
export type DiscoveryResult = Readonly<{
  status: 'NOT_READY' | 'SCANNED';
  examined: number;
  inserted: number;
  epochClosed: boolean;
}>;
export type PublicationClaim = Readonly<{
  eventId: string;
  claimToken: string;
  cycle: number;
  cycleAttempt: number;
}>;
export interface RoutingControl {
  prepare(operator: RoutingOperator): Promise<ActivationView>;
  activate(
    operator: RoutingOperator,
    revision: bigint,
    preflightId: string,
  ): Promise<ActivationView>;
  setPaused(
    paused: boolean,
    operator: RoutingOperator,
    revision: bigint,
  ): Promise<ActivationView>;
}
export interface RoutingDiscovery {
  forward(limit?: number): Promise<DiscoveryResult>;
  reconcile(limit?: number): Promise<DiscoveryResult>;
}
export interface RoutingPublication {
  claim(limit?: number): Promise<readonly PublicationClaim[]>;
  acknowledge(claim: PublicationClaim): Promise<boolean>;
  fail(claim: PublicationClaim): Promise<boolean>;
  recover(limit?: number): Promise<number>;
}
