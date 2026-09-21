import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { EditorService } from '../../../editor';
import {
  MEDIA_REPOSITORY,
  type MediaRepository,
} from '../../../media/domain/repositories/media.repository.interface';
import {
  NEWS_REPOSITORY,
  type NewsRepository,
} from '../../domain/repositories/news.repository.interface';
import type {
  CreateNewsDraftRequest,
  NewsArticle,
  SaveNewsDraftRequest,
} from '../../domain/types/news-article.type';
import { NewsPostTemplateService } from './news-post-template.service';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const LANGUAGE_PATTERN = /^[a-z]{2}(?:-[A-Z]{2})?$/;

@Injectable()
export class NewsService {
  constructor(
    @Inject(NEWS_REPOSITORY) private readonly news: NewsRepository,
    private readonly editor: EditorService,
    private readonly templates: NewsPostTemplateService,
    @Inject(MEDIA_REPOSITORY) private readonly media: MediaRepository,
  ) {}

  async createDraft(input: CreateNewsDraftRequest): Promise<NewsArticle> {
    const title = input.title.trim();
    const shortText = input.shortText.trim();
    const slug = input.slug.trim().toLowerCase();
    const language = input.language.trim();
    const coverMediaId = input.coverMediaId?.trim() || null;

    if (title.length < 3 || title.length > 180) {
      throw new BadRequestException('News title must be 3–180 characters.');
    }
    if (shortText.length < 10 || shortText.length > 500) {
      throw new BadRequestException(
        'News short text must be 10–500 characters.',
      );
    }
    if (!SLUG_PATTERN.test(slug)) {
      throw new BadRequestException('News slug has an invalid format.');
    }
    if (!LANGUAGE_PATTERN.test(language)) {
      throw new BadRequestException('News language has an invalid format.');
    }
    if (await this.news.findBySlug(language, slug)) {
      throw new ConflictException(
        'News slug already exists for this language.',
      );
    }

    const projection = this.editor.normalize(input.documentJson, 'NEWS');
    const attachmentMediaIds = await this.validateMediaReferences(
      projection.document,
      input.authorId,
    );
    const templateData = this.templates.normalize(
      input.postType,
      input.templateData,
    );
    return this.news.createDraft({
      authorId: input.authorId,
      postType: input.postType,
      visibility: input.visibility,
      language,
      slug,
      title,
      shortText,
      document: projection.document,
      templateData,
      plainText: projection.plainText,
      searchText: projection.searchText,
      coverMediaId,
      attachmentMediaIds,
    });
  }

  findById(id: string): Promise<NewsArticle | null> {
    return this.news.findById(id);
  }

  async saveDraft(
    actorId: string,
    input: SaveNewsDraftRequest,
  ): Promise<NewsArticle> {
    if (!Number.isInteger(input.baseVersion) || input.baseVersion < 1) {
      throw new BadRequestException('News draft base version is invalid.');
    }
    const current = await this.news.findById(input.articleId);
    if (!current) throw new NotFoundException('News draft was not found.');
    if (current.authorId !== actorId) {
      throw new ForbiddenException('Only the draft author may edit it.');
    }
    if (current.status !== 'DRAFT' && current.status !== 'CHANGES_REQUESTED') {
      throw new ConflictException(
        'This News article is not in an editable draft state.',
      );
    }

    const title = input.title.trim();
    const shortText = input.shortText.trim();
    const slug = input.slug.trim().toLowerCase();
    const language = input.language.trim();
    const coverMediaId = input.coverMediaId?.trim() || null;
    this.assertMetadata(title, shortText, slug, language);
    const slugOwner = await this.news.findBySlug(language, slug);
    if (slugOwner && slugOwner.id !== input.articleId) {
      throw new ConflictException(
        'News slug already exists for this language.',
      );
    }
    const projection = this.editor.normalize(input.documentJson, 'NEWS');
    const attachmentMediaIds = await this.validateMediaReferences(
      projection.document,
      actorId,
    );
    const templateData = this.templates.normalize(
      input.postType,
      input.templateData,
    );
    const saved = await this.news.saveDraft({
      articleId: input.articleId,
      authorId: actorId,
      baseVersion: input.baseVersion,
      changeSummary: input.changeSummary?.trim() || null,
      postType: input.postType,
      visibility: input.visibility,
      language,
      slug,
      title,
      shortText,
      document: projection.document,
      templateData,
      plainText: projection.plainText,
      searchText: projection.searchText,
      coverMediaId,
      attachmentMediaIds,
    });
    if (!saved) {
      throw new ConflictException(
        'The News draft changed in another session. Restore the latest version before continuing.',
      );
    }
    return saved;
  }

  private assertMetadata(
    title: string,
    shortText: string,
    slug: string,
    language: string,
  ): void {
    if (title.length < 3 || title.length > 180) {
      throw new BadRequestException('News title must be 3–180 characters.');
    }
    if (shortText.length < 10 || shortText.length > 500) {
      throw new BadRequestException(
        'News short text must be 10–500 characters.',
      );
    }
    if (!SLUG_PATTERN.test(slug)) {
      throw new BadRequestException('News slug has an invalid format.');
    }
    if (!LANGUAGE_PATTERN.test(language)) {
      throw new BadRequestException('News language has an invalid format.');
    }
  }

  private async validateMediaReferences(
    document: import('@dss/editor').EditorDocument,
    actorId: string,
  ): Promise<string[]> {
    const ids = new Set<string>();
    const visit = (node: import('@dss/editor').EditorNode): void => {
      if (node.type === 'attachment') {
        const mediaId = node.attrs?.mediaId;
        if (typeof mediaId === 'string') ids.add(mediaId);
      }
      node.content?.forEach(visit);
    };
    visit(document.content);
    await Promise.all(
      [...ids].map(async (id) => {
        const media = await this.media.findById(id);
        if (!media || (media.ownerId !== actorId && !media.isPublic)) {
          throw new BadRequestException(
            'News attachment is unavailable to this author.',
          );
        }
      }),
    );
    return [...ids];
  }
}
