/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Forum (Community Hub)
 * 📄 File: apps/api/src/modules/forum/infrastructure/prisma-forum-subject-visibility.ts
 *
 * 🎯 Purpose:
 * Batch read-time visibility for forum topics and posts (fail closed).
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '@api/core/database';
import type {
  ForumSubjectRef,
  ForumSubjectVisibility,
} from '../contracts/forum-subject-visibility.contract';
import {
  FORUM_VIEWER_FACTS,
  type ForumViewerFactsReader,
} from '../contracts/forum-viewer-facts.contract';
import { canSeeCategory } from '../domain/forum-structure.rules';

const MAX_SUBJECTS = 200;

@Injectable()
export class PrismaForumSubjectVisibility implements ForumSubjectVisibility {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(FORUM_VIEWER_FACTS)
    private readonly viewers: ForumViewerFactsReader,
  ) {}

  async visibleSubjects(
    viewerId: string | null,
    subjects: readonly ForumSubjectRef[],
  ): Promise<ReadonlySet<string>> {
    const bounded = subjects.slice(0, MAX_SUBJECTS);
    if (bounded.length === 0) return new Set();
    const viewer = await this.viewers.read(viewerId, new Date());
    const postIds = bounded
      .filter(({ subjectType }) => subjectType === 'ForumPost')
      .map(({ subjectId }) => subjectId);
    const posts = postIds.length
      ? await this.prisma.forumPost.findMany({
          where: { id: { in: postIds } },
          select: { id: true, topicId: true, state: true },
        })
      : [];
    const topicIds = [
      ...new Set([
        ...bounded
          .filter(({ subjectType }) => subjectType === 'ForumTopic')
          .map(({ subjectId }) => subjectId),
        ...posts.map(({ topicId }) => topicId),
      ]),
    ];
    const topics = await this.prisma.forumTopic.findMany({
      where: { id: { in: topicIds } },
      select: {
        id: true,
        state: true,
        mergedIntoTopicId: true,
        forum: {
          select: {
            active: true,
            parent: { select: { active: true } },
            category: {
              select: {
                active: true,
                visibility: true,
                audience: { select: { subjectKey: true } },
              },
            },
          },
        },
      },
    });
    const visibleTopics = new Set(
      topics
        .filter(
          (topic) =>
            topic.state !== 'TRASHED' &&
            topic.mergedIntoTopicId === null &&
            (viewer.seesAllCategories ||
              (topic.forum.active &&
                (topic.forum.parent?.active ?? true) &&
                topic.forum.category.active)) &&
            canSeeCategory(
              {
                visibility: topic.forum.category.visibility,
                audienceKeys: topic.forum.category.audience.map(
                  ({ subjectKey }) => subjectKey,
                ),
              },
              viewer,
            ),
        )
        .map(({ id }) => id),
    );
    const visible = new Set<string>();
    for (const subject of bounded) {
      if (
        subject.subjectType === 'ForumTopic' &&
        visibleTopics.has(subject.subjectId)
      ) {
        visible.add('ForumTopic:' + subject.subjectId);
      }
    }
    for (const post of posts) {
      if (post.state === 'VISIBLE' && visibleTopics.has(post.topicId)) {
        visible.add('ForumPost:' + post.id);
      }
    }
    return visible;
  }
}
