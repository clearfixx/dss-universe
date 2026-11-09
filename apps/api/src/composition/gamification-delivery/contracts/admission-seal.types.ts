/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Gamification Delivery Composition
 * 📄 File: apps/api/src/composition/gamification-delivery/contracts/admission-seal.types.ts
 * 🎯 Purpose: Describes the first inactive, descriptor-specific admission seal.
 * 🧠 Responsibilities: Keeps applicability and safe owned inputs explicit.
 * 🏗️ Architecture: Root data contract using named public owner types only.
 * ⚠️ Important: This descriptor does not implement Points or complete producer coverage.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type {
  QualifiedAchievementCommand,
  QualifiedAchievementEvent,
} from '@api/modules/achievements';

export type ReputationAdmissionSeal = Readonly<{
  codecVersion: 1;
  destination: 'gamification.v1';
  descriptor: Readonly<{ id: 'reputation.qualification'; version: 1 }>;
  canonical: Omit<QualifiedAchievementEvent, 'payload'>;
  applicability: Readonly<{
    POINTS: false;
    LEVELS: false;
    ACHIEVEMENTS: true;
  }>;
  inputs: Readonly<{
    ACHIEVEMENTS: Readonly<{
      codec: 'achievements.qualified.v1';
      command: QualifiedAchievementCommand;
    }>;
  }>;
}>;
