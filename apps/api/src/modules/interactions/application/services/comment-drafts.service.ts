/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Interaction Platform
 * 📄 File: apps/api/src/modules/interactions/application/services/comment-drafts.service.ts
 *
 * 🎯 Purpose:
 * Coordinates private comment draft autosave, restoration and discard flows.
 *
 * 🧠 Responsibilities:
 * • keeps draft ownership inside the Comments bounded context;
 * • validates every snapshot as canonical COMMENT editor JSON;
 * • rechecks target and reply policy before save or restoration;
 * • exposes optimistic conflicts instead of silently overwriting content.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { EditorService } from '../../../editor/application/services/editor.service';
import {
  COMMENT_DRAFTS_REPOSITORY,
  type CommentDraftsRepository,
} from '../../domain/repositories/comment-drafts.repository.interface';
import {
  COMMENTS_REPOSITORY,
  type CommentsRepository,
} from '../../domain/repositories/comments.repository.interface';
import type { CommentDraft } from '../../domain/types/comment-draft.type';
import { InteractionTargetsService } from './interaction-targets.service';

const MAX_LISTED_DRAFTS = 50;

@Injectable()
export class CommentDraftsService {
  constructor(
    @Inject(COMMENT_DRAFTS_REPOSITORY)
    private readonly drafts: CommentDraftsRepository,
    @Inject(COMMENTS_REPOSITORY)
    private readonly comments: CommentsRepository,
    private readonly targets: InteractionTargetsService,
    private readonly editor: EditorService,
  ) {}

  async save(
    actorId: string,
    input: {
      interactionTargetId: string;
      parentId?: string | null;
      documentJson: string;
      baseVersion: number;
    },
  ): Promise<CommentDraft> {
    const parentId = input.parentId ?? null;
    await this.assertTargetAccess(input.interactionTargetId, actorId);
    await this.assertParent(input.interactionTargetId, parentId);
    const projection = this.editor.normalize(input.documentJson, 'COMMENT');
    const saved = await this.drafts.save({
      authorId: actorId,
      interactionTargetId: input.interactionTargetId,
      parentId,
      scopeKey: this.scopeKey(input.interactionTargetId, parentId),
      documentJson: projection.canonicalJson,
      plainText: projection.plainText,
      baseVersion: input.baseVersion,
    });
    if (!saved) {
      throw new ConflictException(
        'The comment draft changed in another session. Restore the latest version before continuing.',
      );
    }
    return saved;
  }

  async restore(
    actorId: string,
    interactionTargetId: string,
    parentId?: string | null,
  ): Promise<CommentDraft | null> {
    const normalizedParentId = parentId ?? null;
    await this.assertTargetAccess(interactionTargetId, actorId);
    await this.assertParent(interactionTargetId, normalizedParentId);
    return this.drafts.findByScope(
      actorId,
      this.scopeKey(interactionTargetId, normalizedParentId),
    );
  }

  async list(actorId: string, limit = 20): Promise<CommentDraft[]> {
    if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LISTED_DRAFTS) {
      throw new BadRequestException(
        `Draft list limit must be between 1 and ${MAX_LISTED_DRAFTS}.`,
      );
    }
    return this.drafts.listByAuthor(actorId, limit);
  }

  async discard(actorId: string, draftId: string): Promise<boolean> {
    const draft = await this.requireOwned(draftId, actorId);
    return this.drafts.delete(draft.id, actorId);
  }

  private async requireOwned(
    draftId: string,
    actorId: string,
  ): Promise<CommentDraft> {
    const draft = await this.drafts.findById(draftId);
    if (!draft) throw new NotFoundException('Comment draft was not found.');
    if (draft.authorId !== actorId) {
      throw new ForbiddenException(
        'Comment drafts are private to their author.',
      );
    }
    return draft;
  }

  private async assertTargetAccess(
    targetId: string,
    actorId: string,
  ): Promise<void> {
    const decision = await this.targets.authorize(targetId, actorId, 'COMMENT');
    if (!decision.allowed) {
      throw new ForbiddenException(
        `Interaction target denied comment drafting: ${decision.reason ?? 'POLICY_DENIED'}.`,
      );
    }
  }

  private async assertParent(
    targetId: string,
    parentId: string | null,
  ): Promise<void> {
    if (!parentId) return;
    const parent = await this.comments.findById(parentId);
    if (!parent) throw new NotFoundException('Reply parent was not found.');
    if (parent.interactionTargetId !== targetId || parent.parentId !== null) {
      throw new BadRequestException('Invalid reply parent for this draft.');
    }
    if (parent.isDeleted) {
      throw new BadRequestException(
        'A deleted comment cannot receive a draft reply.',
      );
    }
  }

  private scopeKey(targetId: string, parentId: string | null): string {
    return `${targetId}:${parentId ?? 'root'}`;
  }
}

/** A browser crash may end a session; it should not erase a good thought. */
