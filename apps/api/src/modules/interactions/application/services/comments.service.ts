/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Interaction Platform
 * 📄 File: apps/api/src/modules/interactions/application/services/comments.service.ts
 *
 * 🎯 Purpose:
 * Coordinates target-authorized shared comment use cases.
 *
 * 🧠 Responsibilities:
 * • authorizes reads and writes through the target owner;
 * • validates bounded plain-text content until DSS Editor lands;
 * • enforces one reply level and same-target parentage;
 * • limits editing, tombstoning and revision access to the author.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  COMMENTS_REPOSITORY,
  type CommentsRepository,
} from '../../domain/repositories/comments.repository.interface';
import type { Comment, CommentRevision } from '../../domain/types/comment.type';
import { InteractionTargetsService } from './interaction-targets.service';

const MAX_COMMENT_LENGTH = 5000;

@Injectable()
export class CommentsService {
  constructor(
    @Inject(COMMENTS_REPOSITORY)
    private readonly comments: CommentsRepository,
    private readonly targets: InteractionTargetsService,
  ) {}

  async create(
    actorId: string,
    targetId: string,
    body: string,
    parentId?: string | null,
  ): Promise<Comment> {
    await this.assertTargetAccess(targetId, actorId, 'COMMENT');
    const cleanBody = this.cleanBody(body);
    const parent = parentId ? await this.requireComment(parentId) : null;
    if (parent) {
      if (parent.interactionTargetId !== targetId) {
        throw new BadRequestException(
          'A reply must use the same interaction target as its parent.',
        );
      }
      if (parent.parentId) {
        throw new BadRequestException('Replies cannot be nested more deeply.');
      }
      if (parent.isDeleted) {
        throw new BadRequestException(
          'A deleted comment cannot receive replies.',
        );
      }
    }
    return this.comments.create({
      interactionTargetId: targetId,
      authorId: actorId,
      parentId: parent?.id ?? null,
      body: cleanBody,
    });
  }

  async list(
    actorId: string,
    targetId: string,
    parentId: string | null,
    page = 1,
    limit = 20,
  ) {
    await this.assertTargetAccess(targetId, actorId, 'READ');
    if (parentId) {
      const parent = await this.requireComment(parentId);
      if (parent.interactionTargetId !== targetId || parent.parentId !== null) {
        throw new BadRequestException('Invalid reply parent for this target.');
      }
    }
    return this.comments.list(targetId, parentId, page, limit);
  }

  async edit(
    actorId: string,
    commentId: string,
    body: string,
  ): Promise<Comment> {
    const comment = await this.requireComment(commentId);
    await this.assertTargetAccess(
      comment.interactionTargetId,
      actorId,
      'COMMENT',
    );
    this.assertAuthor(comment, actorId);
    if (comment.isDeleted) {
      throw new BadRequestException('A deleted comment cannot be edited.');
    }
    return this.comments.edit(comment.id, actorId, this.cleanBody(body));
  }

  async remove(
    actorId: string,
    commentId: string,
    reason?: string | null,
  ): Promise<Comment> {
    const comment = await this.requireComment(commentId);
    this.assertAuthor(comment, actorId);
    if (comment.isDeleted) return comment;
    return this.comments.tombstone(comment.id, actorId, reason?.trim() || null);
  }

  async revisions(
    actorId: string,
    commentId: string,
  ): Promise<CommentRevision[]> {
    const comment = await this.requireComment(commentId);
    this.assertAuthor(comment, actorId);
    return this.comments.revisions(comment.id);
  }

  private async requireComment(id: string): Promise<Comment> {
    const comment = await this.comments.findById(id);
    if (!comment) throw new NotFoundException('Comment was not found.');
    return comment;
  }

  private async assertTargetAccess(
    targetId: string,
    actorId: string,
    capability: 'READ' | 'COMMENT',
  ): Promise<void> {
    const decision = await this.targets.authorize(
      targetId,
      actorId,
      capability,
    );
    if (!decision.allowed) {
      throw new ForbiddenException(
        `Interaction target denied ${capability.toLowerCase()}: ${
          decision.reason ?? 'POLICY_DENIED'
        }.`,
      );
    }
  }

  private assertAuthor(comment: Comment, actorId: string): void {
    if (comment.authorId !== actorId) {
      throw new ForbiddenException('Only the comment author may do that.');
    }
  }

  private cleanBody(body: string): string {
    const clean = body.trim();
    if (!clean || clean.length > MAX_COMMENT_LENGTH) {
      throw new BadRequestException(
        `Comment body must contain 1 to ${MAX_COMMENT_LENGTH} characters.`,
      );
    }
    return clean;
  }
}

/**
 * Today: bounded text. Tomorrow: DSS Editor. Never: arbitrary HTML from orbit.
 */
