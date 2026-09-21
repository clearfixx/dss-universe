import { BadRequestException, ConflictException } from '@nestjs/common';

import type { NewsTaxonomyRepository } from '../../domain/repositories/news-taxonomy.repository.interface';
import { NewsTaxonomyService } from './news-taxonomy.service';

describe('NewsTaxonomyService', () => {
  let repository: jest.Mocked<NewsTaxonomyRepository>;
  let service: NewsTaxonomyService;
  let createCategory: jest.Mock;

  beforeEach(() => {
    createCategory = jest.fn();
    repository = {
      createCategory,
      createTag: jest.fn(),
      createFieldDefinition: jest.fn(),
      categoryExists: jest.fn().mockResolvedValue(true),
      scopeFieldKeyExists: jest.fn().mockResolvedValue(false),
    };
    service = new NewsTaxonomyService(repository);
  });

  it('normalizes hierarchical category metadata', async () => {
    createCategory.mockImplementation((input) =>
      Promise.resolve({
        ...input,
        id: 'category-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    );
    await service.createCategory({
      actorId: 'admin-1',
      parentId: 'parent-1',
      name: ' Development ',
      slug: 'Development',
      description: ' Developer news ',
      icon: ' code ',
      sortOrder: 10,
      isActive: true,
      allowedPostTypes: ['STANDARD', 'TEXT'],
      allowComments: true,
      allowRating: true,
      allowIndexing: true,
    });
    expect(createCategory).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Development',
        slug: 'development',
        description: 'Developer news',
      }),
    );
  });

  it('requires choices for select fields', async () => {
    await expect(
      service.createFieldDefinition({
        actorId: 'admin-1',
        categoryId: null,
        postType: 'STANDARD',
        key: 'difficulty',
        label: 'Difficulty',
        type: 'SELECT',
        required: false,
        showInShort: true,
        showInFull: true,
        includeInSearch: true,
        filterable: true,
        options: [],
        isActive: true,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects duplicate keys inside the same field scope', async () => {
    repository.scopeFieldKeyExists.mockResolvedValue(true);
    await expect(
      service.createFieldDefinition({
        actorId: 'admin-1',
        categoryId: null,
        postType: 'VIDEO',
        key: 'source_url',
        label: 'Source URL',
        type: 'URL',
        required: true,
        showInShort: false,
        showInFull: true,
        includeInSearch: false,
        filterable: false,
        options: null,
        isActive: true,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
