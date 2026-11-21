/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Activity
 * 📄 File: apps/api/src/modules/activity/domain/ports/activity-subject-visibility.interface.ts
 *
 * 🎯 Purpose:
 * Consumer-owned port that asks subject owners, at read time, which projected
 * entries the viewer may see now.
 *
 * ⚠️ Important:
 * Entries of modules that require an owner check are dropped when the owner
 * does not confirm them (fail closed). Other modules keep their existing rules.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export type ActivitySubjectRef = Readonly<{
  module: string;
  subjectType: string;
  subjectId: string;
}>;

export interface ActivitySubjectVisibilityReader {
  /** Modules whose entries must be confirmed by their owner at read time. */
  readonly ownerCheckedModules: ReadonlySet<string>;
  visibleKeys(
    viewerId: string | null,
    subjects: readonly ActivitySubjectRef[],
  ): Promise<ReadonlySet<string>>;
}

export const ACTIVITY_SUBJECT_VISIBILITY = Symbol(
  'ACTIVITY_SUBJECT_VISIBILITY',
);
