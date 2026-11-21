/**
 * ===============================================================
 * 🚀 DSS Universe
 * 📦 Module: Gamification Delivery Composition
 * 📄 File: apps/api/src/composition/gamification-delivery/contracts/admission-seal.types.ts
 * 🎯 Purpose: Describes immutable legacy and Points-enabled Reputation seals.
 * 🧠 Responsibilities: Keeps applicability and safe owned inputs explicit.
 * 🏗️ Architecture: Root data contract using named public owner types only.
 * ⚠️ Important: Legacy seals keep their original obligations; producer coverage is incomplete.
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import type {
  QualifiedAchievementCommand,
  QualifiedAchievementEvent,
} from '@api/modules/achievements';
import type { QualifiedPointCommand } from '@api/modules/community-points';

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

/** Version 1 seals remain readable and never gain a new Points obligation. */
export type ReputationOwnersAdmissionSeal = Readonly<{
  codecVersion: 2;
  destination: 'gamification.v1';
  descriptor: Readonly<{ id: 'reputation.qualification'; version: 2 }>;
  canonical: ReputationAdmissionSeal['canonical'];
  applicability: Readonly<{
    POINTS: true;
    LEVELS: false;
    ACHIEVEMENTS: true;
  }>;
  inputs: Readonly<{
    POINTS: Readonly<{
      codec: 'points.qualified.v1';
      command: QualifiedPointCommand;
    }>;
    ACHIEVEMENTS: ReputationAdmissionSeal['inputs']['ACHIEVEMENTS'];
  }>;
}>;

export type GamificationAdmissionSeal =
  | ReputationAdmissionSeal
  | ReputationOwnersAdmissionSeal
  | SourceAdmissionSeal;

type SourceSealHeader = Readonly<{
  codecVersion: 2;
  destination: 'gamification.v1';
  canonical: ReputationAdmissionSeal['canonical'];
}>;
export type LevelsAdmissionCommand = ReputationAdmissionSeal['canonical'] & {
  userId: string;
};

export type SourcePointProfileId =
  | 'news.publication'
  | 'comments.lifetime'
  | 'forum.topics'
  | 'forum.replies'
  | 'forum.answers';

export type SourceAdmissionSeal = SourceSealHeader &
  (
    | Readonly<{
        descriptor: Readonly<{
          id: SourcePointProfileId;
          version: 1;
        }>;
        applicability: Readonly<{
          POINTS: true;
          LEVELS: false;
          ACHIEVEMENTS: true;
        }>;
        inputs: Readonly<{
          POINTS: ReputationOwnersAdmissionSeal['inputs']['POINTS'];
          ACHIEVEMENTS: ReputationAdmissionSeal['inputs']['ACHIEVEMENTS'];
        }>;
      }>
    | Readonly<{
        descriptor: Readonly<{ id: 'points.ledger'; version: 1 }>;
        applicability: Readonly<{
          POINTS: false;
          LEVELS: true;
          ACHIEVEMENTS: true;
        }>;
        inputs: Readonly<{
          LEVELS: Readonly<{
            codec: 'levels.event.v1';
            command: LevelsAdmissionCommand;
          }>;
          ACHIEVEMENTS: ReputationAdmissionSeal['inputs']['ACHIEVEMENTS'];
        }>;
      }>
  );
