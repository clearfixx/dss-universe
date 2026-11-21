/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Content Read Integration
 * 📄 File: apps/api/src/composition/content-reads/infrastructure/activity-subject-visibility.adapter.ts
 *
 * 🎯 Purpose:
 * Lets Activity ask Forum which forum entries a viewer may see now.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Inject, Injectable } from '@nestjs/common';
import type {
  ActivitySubjectRef,
  ActivitySubjectVisibilityReader,
} from '@api/modules/activity';
import {
  FORUM_SUBJECT_VISIBILITY,
  type ForumSubjectRef,
  type ForumSubjectVisibility,
} from '@api/modules/forum';

const FORUM_MODULE = 'FORUM';
const FORUM_TYPES = new Set(['ForumTopic', 'ForumPost']);

@Injectable()
export class ActivitySubjectVisibilityAdapter implements ActivitySubjectVisibilityReader {
  readonly ownerCheckedModules: ReadonlySet<string> = new Set([FORUM_MODULE]);

  constructor(
    @Inject(FORUM_SUBJECT_VISIBILITY)
    private readonly forum: ForumSubjectVisibility,
  ) {}

  visibleKeys(
    viewerId: string | null,
    subjects: readonly ActivitySubjectRef[],
  ): Promise<ReadonlySet<string>> {
    const forumSubjects: ForumSubjectRef[] = subjects
      .filter(
        (subject) =>
          subject.module === FORUM_MODULE &&
          FORUM_TYPES.has(subject.subjectType),
      )
      .map((subject) => ({
        subjectType: subject.subjectType as ForumSubjectRef['subjectType'],
        subjectId: subject.subjectId,
      }));
    return this.forum.visibleSubjects(viewerId, forumSubjects);
  }
}
