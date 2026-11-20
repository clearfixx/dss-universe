/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Forum (Community Hub)
 * 📄 File: apps/api/src/modules/forum/infrastructure/prisma-forum-curation.ts
 *
 * 🎯 Purpose:
 * Implements CH-3a: accepted answers, curated forum tags, topic tags and
 * attaching one shared poll to a topic.
 *
 * ⚠️ Important:
 * Poll creation is delegated to the Interaction Platform through POLL_COMMANDS;
 * one poll per topic is guaranteed by its Interaction Target uniqueness.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditWriterService } from '@api/core/audit';
import { PrismaService, type TransactionClient } from '@api/core/database';
import { createEventEnvelope, OutboxWriterService } from '@api/core/events';
import {
  POLL_COMMANDS,
  type PollCommands,
  type PollVisibility,
} from '@api/modules/interactions';
import {
  FORUM_VIEWER_FACTS,
  type ForumViewerFactsReader,
} from '../contracts/forum-viewer-facts.contract';
import { ForumCommandError } from '../domain/errors/forum-command.error';
import {
  assertCanAcceptAnswer,
  normalizeTag,
  normalizeTopicTagIds,
} from '../domain/forum-curation.rules';
import type { ForumModerationActor } from '../domain/forum-moderation.rules';
import { canEditPost } from '../domain/forum-topic.rules';
import type { ForumViewerFacts } from '../domain/types/forum-structure.type';
import type { ForumTopicSummary } from '../domain/types/forum-topic.type';
import { ForumTopicsService } from './prisma-forum-topics';

const PRODUCER = 'dss.api.forum';

export type ForumTagView = {
  id: string;
  forumId: string;
  slug: string;
  label: string;
  active: boolean;
};

@Injectable()
export class ForumCurationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditWriterService,
    private readonly outbox: OutboxWriterService,
    @Inject(FORUM_VIEWER_FACTS)
    private readonly viewers: ForumViewerFactsReader,
    @Inject(POLL_COMMANDS)
    private readonly polls: PollCommands,
    private readonly topics: ForumTopicsService,
  ) {}

  async acceptAnswer(
    actorId: string,
    topicId: string,
    postId: string,
  ): Promise<ForumTopicSummary> {
    const { topic, actor } = await this.scope(actorId, topicId);
    const answer = await this.prisma.forumPost.findUnique({
      where: { id: postId },
      select: { topicId: true, number: true, authorId: true, state: true },
    });
    if (!answer) this.notFound('Post');
    assertCanAcceptAnswer(topic, answer, topicId, actor);
    await this.prisma.$transaction(async (tx) => {
      const updated = await tx.forumTopic.updateMany({
        where: {
          id: topicId,
          acceptedAnswerPostId: topic.acceptedAnswerPostId,
        },
        data: {
          acceptedAnswerPostId: postId,
          acceptedAt: new Date(),
          acceptedById: actorId,
        },
      });
      if (updated.count !== 1) {
        throw new ForumCommandError(
          'CONFLICT',
          'The accepted answer changed concurrently.',
        );
      }
      await this.record(tx, actorId, 'ForumTopic', topicId, 'answer.accepted', {
        postId,
        answerAuthorId: answer.authorId,
        previousPostId: topic.acceptedAnswerPostId,
      });
    });
    return this.topics.topic(actorId, topicId);
  }

  async clearAcceptedAnswer(
    actorId: string,
    topicId: string,
  ): Promise<ForumTopicSummary> {
    const { topic, actor } = await this.scope(actorId, topicId);
    if (!actor.moderator) this.denied('Only a moderator can clear an answer.');
    if (!topic.acceptedAnswerPostId) {
      throw new ForumCommandError('CONFLICT', 'No answer is accepted.');
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.forumTopic.update({
        where: { id: topicId },
        data: {
          acceptedAnswerPostId: null,
          acceptedAt: null,
          acceptedById: null,
        },
      });
      await this.record(tx, actorId, 'ForumTopic', topicId, 'answer.cleared', {
        previousPostId: topic.acceptedAnswerPostId,
      });
    });
    return this.topics.topic(actorId, topicId);
  }

  async createTag(
    actorId: string,
    forumId: string,
    input: { slug: string; label: string },
  ): Promise<ForumTagView> {
    await this.requireForumModerator(actorId, forumId);
    const tag = normalizeTag(input);
    const id = randomUUID();
    await this.write(async (tx) => {
      await tx.forumTag.create({ data: { id, forumId, ...tag } });
      await this.record(tx, actorId, 'ForumTag', id, 'tag.created', {
        forumId,
        slug: tag.slug,
      });
    });
    return this.tag(id);
  }

  async updateTag(
    actorId: string,
    tagId: string,
    input: { slug: string; label: string; active: boolean },
  ): Promise<ForumTagView> {
    const current = await this.prisma.forumTag.findUnique({
      where: { id: tagId },
      select: { forumId: true },
    });
    if (!current) this.notFound('Tag');
    await this.requireForumModerator(actorId, current.forumId);
    const tag = normalizeTag(input);
    await this.write(async (tx) => {
      await tx.forumTag.update({
        where: { id: tagId },
        data: { ...tag, active: input.active },
      });
      await this.record(tx, actorId, 'ForumTag', tagId, 'tag.updated', {
        slug: tag.slug,
        active: input.active,
      });
    });
    return this.tag(tagId);
  }

  async forumTags(
    viewerId: string | null,
    forumId: string,
  ): Promise<ForumTagView[]> {
    const viewer = await this.viewers.read(viewerId, new Date());
    const forum = await this.topics.visibleForumFor(forumId, viewer);
    const moderator = await this.topics.isModerator(viewer, forum.categoryId);
    return this.prisma.forumTag.findMany({
      where: { forumId, ...(moderator ? {} : { active: true }) },
      orderBy: [{ label: 'asc' }, { id: 'asc' }],
    });
  }

  async setTopicTags(
    actorId: string,
    topicId: string,
    tagIds: string[],
  ): Promise<ForumTopicSummary> {
    const { topic, actor } = await this.scope(actorId, topicId);
    const firstPost = await this.prisma.forumPost.findFirstOrThrow({
      where: { topicId, number: 1 },
      select: { number: true, authorId: true, createdAt: true },
    });
    if (!canEditPost(topic, firstPost, actor, new Date())) {
      this.denied('You can no longer change the tags of this topic.');
    }
    const ids = normalizeTopicTagIds(tagIds);
    const valid = await this.prisma.forumTag.count({
      where: { id: { in: ids }, forumId: topic.forumId, active: true },
    });
    if (valid !== ids.length) {
      throw new ForumCommandError(
        'INVALID_INPUT',
        "Tags must come from the forum's active curated list.",
      );
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.forumTopicTag.deleteMany({ where: { topicId } });
      if (ids.length) {
        await tx.forumTopicTag.createMany({
          data: ids.map((tagId) => ({ topicId, tagId })),
        });
      }
      await this.record(tx, actorId, 'ForumTopic', topicId, 'tags.set', {
        tagIds: ids,
      });
    });
    return this.topics.topic(actorId, topicId);
  }

  async attachPoll(
    actorId: string,
    topicId: string,
    input: {
      question: string;
      options: string[];
      visibility: PollVisibility;
      maxChoices: number;
    },
  ): Promise<{ pollId: string }> {
    const { topic, actor } = await this.scope(actorId, topicId);
    if (topic.authorId !== actorId && !actor.moderator) {
      this.denied('Only the topic author or a moderator can add a poll.');
    }
    if (topic.state !== 'OPEN') {
      throw new ForumCommandError(
        'CONFLICT',
        'Polls can be added only to open topics.',
      );
    }
    try {
      return await this.polls.createPoll({
        interactionTargetId: topic.interactionTargetId,
        createdById: actorId,
        ...input,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ForumCommandError(
          'CONFLICT',
          'The topic already has a poll.',
        );
      }
      throw error;
    }
  }

  private async scope(actorId: string, topicId: string) {
    const viewer = await this.authenticated(actorId);
    const { topic, categoryId } = await this.topics.visibleTopic(
      topicId,
      viewer,
    );
    const actor: ForumModerationActor = {
      id: actorId,
      moderator: await this.topics.isModerator(viewer, categoryId),
      curator: topic.curatorId === actorId,
    };
    return { topic, actor, viewer };
  }

  private async requireForumModerator(actorId: string, forumId: string) {
    const viewer = await this.authenticated(actorId);
    const forum = await this.topics.visibleForumFor(forumId, viewer);
    if (!(await this.topics.isModerator(viewer, forum.categoryId))) {
      this.denied('Only moderators of this category manage its tags.');
    }
  }

  private async authenticated(actorId: string): Promise<ForumViewerFacts> {
    const viewer = await this.viewers.read(actorId, new Date());
    if (viewer.subjectId === null) this.denied('Sign in first.');
    return viewer;
  }

  private tag(id: string): Promise<ForumTagView> {
    return this.prisma.forumTag.findUniqueOrThrow({
      where: { id },
      select: {
        id: true,
        forumId: true,
        slug: true,
        label: true,
        active: true,
      },
    });
  }

  private async write(operation: (tx: TransactionClient) => Promise<void>) {
    try {
      await this.prisma.$transaction(operation);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ForumCommandError(
          'CONFLICT',
          'A tag with this slug already exists in the forum.',
        );
      }
      throw error;
    }
  }

  private async record(
    tx: TransactionClient,
    actorId: string,
    targetType: 'ForumTopic' | 'ForumTag',
    targetId: string,
    action: string,
    metadata: Record<string, string | boolean | null | string[]>,
  ): Promise<void> {
    await this.audit.append(tx, {
      action: 'forum.' + action.replaceAll('.', '_'),
      actorType: 'USER',
      actorId,
      targetType,
      targetId,
      metadata,
    });
    await this.outbox.append(
      tx,
      createEventEnvelope({
        name: 'forum.' + action + '.v1',
        version: 1,
        category: 'integration',
        producer: PRODUCER,
        actorId,
        aggregate: { type: targetType, id: targetId },
        payload: { targetId, ...metadata },
      }),
    );
  }

  private denied(message: string): never {
    throw new ForumCommandError('ACCESS_DENIED', message);
  }

  private notFound(target: string): never {
    throw new ForumCommandError('NOT_FOUND', target + ' was not found.');
  }
}
