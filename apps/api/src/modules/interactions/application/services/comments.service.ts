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
 * • validates canonical COMMENT documents through DSS Editor;
 * • preserves bounded plain-text input as a compatibility adapter;
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
  createEmptyEditorDocument,
  type EditorDocument,
  type EditorNode,
} from '@dss/editor';

import { EditorService } from '../../../editor/application/services/editor.service';

import {
  COMMENTS_REPOSITORY,
  type CommentsRepository,
} from '../../domain/repositories/comments.repository.interface';
import type { Comment, CommentRevision } from '../../domain/types/comment.type';
import { InteractionTargetsService } from './interaction-targets.service';

const MAX_COMMENT_LENGTH = 5000;
const MAX_MENTIONS = 20;
const MENTION_PATTERN =
  /(^|[^\p{L}\p{N}_])@([\p{L}\p{N}_](?:[\p{L}\p{N}_.-]{0,30}[\p{L}\p{N}_])?)/gu;

@Injectable()
export class CommentsService {
  constructor(
    @Inject(COMMENTS_REPOSITORY)
    private readonly comments: CommentsRepository,
    private readonly targets: InteractionTargetsService,
    private readonly editor: EditorService,
  ) {}

  async create(
    actorId: string,
    targetId: string,
    content: { body?: string; documentJson?: string },
    parentId?: string | null,
  ): Promise<Comment> {
    await this.assertTargetAccess(targetId, actorId, 'COMMENT');
    const normalized = this.normalizeContent(content);
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
      body: normalized.plainText,
      documentJson: normalized.canonicalJson,
      searchText: normalized.searchText,
      mentionedUsernames: this.extractMentionedUsernames(
        normalized.document,
        normalized.plainText,
      ),
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
    content: { body?: string; documentJson?: string },
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
    const normalized = this.normalizeContent(content);
    return this.comments.edit(comment.id, actorId, {
      body: normalized.plainText,
      documentJson: normalized.canonicalJson,
      searchText: normalized.searchText,
      mentionedUsernames: this.extractMentionedUsernames(
        normalized.document,
        normalized.plainText,
      ),
    });
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

  private normalizeContent(content: {
    body?: string;
    documentJson?: string;
  }): ReturnType<EditorService['normalize']> {
    if (Boolean(content.body) === Boolean(content.documentJson)) {
      throw new BadRequestException(
        'Provide exactly one of body or documentJson.',
      );
    }
    const documentJson = content.documentJson
      ? content.documentJson
      : JSON.stringify(this.legacyDocument(content.body ?? ''));
    const projection = this.editor.normalize(documentJson, 'COMMENT');
    if (
      !this.hasMeaningfulContent(projection.document.content) ||
      projection.plainText.length > MAX_COMMENT_LENGTH
    ) {
      throw new BadRequestException(
        `Comment content must be meaningful and project to at most ${MAX_COMMENT_LENGTH} characters.`,
      );
    }
    return projection;
  }

  private legacyDocument(body: string): EditorDocument {
    const clean = body.trim();
    if (!clean) {
      throw new BadRequestException('Comment body cannot be empty.');
    }
    const document = createEmptyEditorDocument('COMMENT');
    document.content.content = [
      {
        type: 'paragraph',
        content: [{ type: 'text', text: clean }],
      },
    ];
    return document;
  }

  private hasMeaningfulContent(node: EditorNode): boolean {
    if (node.type === 'text') return Boolean(node.text?.trim());
    if (['mention', 'mediaReference', 'attachment'].includes(node.type)) {
      return true;
    }
    return (node.content ?? []).some((child) =>
      this.hasMeaningfulContent(child),
    );
  }

  private extractMentionedUsernames(
    document: EditorDocument,
    body: string,
  ): string[] {
    const usernames = new Map<string, string>();
    this.collectStructuredMentions(document.content, usernames);
    for (const match of body.matchAll(MENTION_PATTERN)) {
      const username = match[2];
      if (!username) continue;
      const key = username.toLocaleLowerCase('en-US');
      if (!usernames.has(key)) usernames.set(key, username);
      if (usernames.size > MAX_MENTIONS) {
        throw new BadRequestException(
          `A comment may mention at most ${MAX_MENTIONS} users.`,
        );
      }
    }
    return [...usernames.values()];
  }

  private collectStructuredMentions(
    node: EditorNode,
    usernames: Map<string, string>,
  ): void {
    const username = node.type === 'mention' ? node.attrs?.username : null;
    if (typeof username === 'string') {
      usernames.set(username.toLocaleLowerCase('en-US'), username);
    }
    for (const child of node.content ?? []) {
      this.collectStructuredMentions(child, usernames);
    }
  }
}

/**
 * Canonical JSON has landed. Arbitrary HTML is still denied docking clearance.
 */
