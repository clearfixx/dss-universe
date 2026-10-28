/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Gamification Delivery Composition
 * 📄 File: apps/api/src/composition/gamification-delivery/contracts/routing.constants.ts
 * 🎯 Purpose: Names isolated capabilities and approved publication parameters.
 * 🧠 Responsibilities: Keeps destination identity separate from Activity markers.
 * 🏗️ Architecture: Destination-local technical constants.
 * ⚠️ Important: These constants start no runner or activation.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export const GAMIFICATION_DESTINATION = 'gamification.v1';
export const GAMIFICATION_ROUTING_CONTROL = Symbol(
  'GAMIFICATION_ROUTING_CONTROL',
);
export const GAMIFICATION_ROUTING_DISCOVERY = Symbol(
  'GAMIFICATION_ROUTING_DISCOVERY',
);
export const GAMIFICATION_ROUTING_PUBLICATION = Symbol(
  'GAMIFICATION_ROUTING_PUBLICATION',
);
export const ROUTING_SOURCE_BATCH = 256;
export const ROUTING_CLAIM_BATCH = 32;
export const ROUTING_PUBLICATION_BUDGET = 5;
export const ROUTING_LEASE_SECONDS = 60;
