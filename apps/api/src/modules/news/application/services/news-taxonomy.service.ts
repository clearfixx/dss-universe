import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  NEWS_TAXONOMY_REPOSITORY,
  type NewsTaxonomyRepository,
} from '../../domain/repositories/news-taxonomy.repository.interface';
import type {
  CreateNewsCategory,
  CreateNewsFieldDefinition,
  CreateNewsTag,
} from '../../domain/types/news-taxonomy.type';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const FIELD_KEY_PATTERN = /^[a-z][a-z0-9_]{1,63}$/;

@Injectable()
export class NewsTaxonomyService {
  constructor(
    @Inject(NEWS_TAXONOMY_REPOSITORY)
    private readonly taxonomy: NewsTaxonomyRepository,
  ) {}

  async createCategory(input: CreateNewsCategory) {
    const normalized = {
      ...input,
      name: input.name.trim(),
      slug: input.slug.trim().toLowerCase(),
      description: input.description?.trim() || null,
      icon: input.icon?.trim() || null,
    };
    this.assertNameAndSlug(normalized.name, normalized.slug);
    if (normalized.allowedPostTypes.length === 0) {
      throw new BadRequestException(
        'A News category must allow at least one post type.',
      );
    }
    if (
      normalized.parentId &&
      !(await this.taxonomy.categoryExists(normalized.parentId))
    ) {
      throw new NotFoundException('Parent News category was not found.');
    }
    return this.taxonomy.createCategory(normalized);
  }

  createTag(input: CreateNewsTag) {
    const normalized = {
      ...input,
      name: input.name.trim(),
      slug: input.slug.trim().toLowerCase(),
    };
    this.assertNameAndSlug(normalized.name, normalized.slug);
    return this.taxonomy.createTag(normalized);
  }

  async createFieldDefinition(input: CreateNewsFieldDefinition) {
    const normalized = {
      ...input,
      key: input.key.trim().toLowerCase(),
      label: input.label.trim(),
    };
    if (!FIELD_KEY_PATTERN.test(normalized.key)) {
      throw new BadRequestException('News field key has an invalid format.');
    }
    if (normalized.label.length < 2 || normalized.label.length > 80) {
      throw new BadRequestException(
        'News field label must be 2–80 characters.',
      );
    }
    if (
      normalized.categoryId &&
      !(await this.taxonomy.categoryExists(normalized.categoryId))
    ) {
      throw new NotFoundException('News field category was not found.');
    }
    if (
      (normalized.type === 'SELECT' || normalized.type === 'MULTI_SELECT') &&
      (!Array.isArray(normalized.options) ||
        normalized.options.length === 0 ||
        normalized.options.some(
          (option) => typeof option !== 'string' || option.trim().length === 0,
        ))
    ) {
      throw new BadRequestException(
        'Select News fields require non-empty string options.',
      );
    }
    if (
      await this.taxonomy.scopeFieldKeyExists(
        normalized.categoryId,
        normalized.postType,
        normalized.key,
      )
    ) {
      throw new ConflictException(
        'A News field with this key already exists in the same scope.',
      );
    }
    return this.taxonomy.createFieldDefinition(normalized);
  }

  private assertNameAndSlug(name: string, slug: string): void {
    if (name.length < 2 || name.length > 80) {
      throw new BadRequestException('Name must be 2–80 characters.');
    }
    if (!SLUG_PATTERN.test(slug)) {
      throw new BadRequestException('Slug has an invalid format.');
    }
  }
}
