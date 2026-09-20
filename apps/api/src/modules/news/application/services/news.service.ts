import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
} from '@nestjs/common';

import { EditorService } from '../../../editor';
import {
  NEWS_REPOSITORY,
  type NewsRepository,
} from '../../domain/repositories/news.repository.interface';
import type {
  CreateNewsDraftRequest,
  NewsArticle,
} from '../../domain/types/news-article.type';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const LANGUAGE_PATTERN = /^[a-z]{2}(?:-[A-Z]{2})?$/;

@Injectable()
export class NewsService {
  constructor(
    @Inject(NEWS_REPOSITORY) private readonly news: NewsRepository,
    private readonly editor: EditorService,
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
    return this.news.createDraft({
      authorId: input.authorId,
      postType: input.postType,
      visibility: input.visibility,
      language,
      slug,
      title,
      shortText,
      document: projection.document,
      plainText: projection.plainText,
      searchText: projection.searchText,
      coverMediaId,
    });
  }

  findById(id: string): Promise<NewsArticle | null> {
    return this.news.findById(id);
  }
}
