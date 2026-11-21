/**
 * Regression guard: the global ValidationPipe uses `whitelist: true`, which
 * silently drops input fields without a class-validator decorator. Category
 * visibility and topic kind were dropped that way, so no category could be
 * created and every topic became a discussion through GraphQL.
 */
import { ArgumentMetadata, ValidationPipe } from '@nestjs/common';
import { ForumCategoryInput, ForumInput } from './forum-structure.resolver';
import {
  CreateForumReplyInput,
  CreateForumTopicInput,
  EditForumPostInput,
} from './forum-topics.resolver';

const pipe = new ValidationPipe({
  transform: true,
  whitelist: true,
  forbidUnknownValues: true,
});

async function passThrough<T extends object>(
  metatype: new () => T,
  value: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const metadata: ArgumentMetadata = { type: 'body', metatype };
  return (await pipe.transform(value, metadata)) as Record<string, unknown>;
}

describe('Forum GraphQL inputs survive the global validation pipe', () => {
  it.each([
    [
      'ForumCategoryInput',
      ForumCategoryInput,
      {
        slug: 'dev',
        title: 'Development',
        description: 'Web and backend',
        position: 1,
        visibility: 'RESTRICTED',
        audienceKeys: ['group:premium'],
        active: true,
      },
    ],
    [
      'ForumInput',
      ForumInput,
      {
        categoryId: 'c',
        parentId: 'p',
        slug: 'web',
        title: 'Web',
        description: 'Frontend',
        position: 2,
        allowsGatedContent: true,
        active: false,
      },
    ],
    [
      'CreateForumTopicInput',
      CreateForumTopicInput,
      { forumId: 'f', kind: 'QUESTION', title: 'Q', documentJson: '{}' },
    ],
    [
      'CreateForumReplyInput',
      CreateForumReplyInput,
      {
        topicId: 't',
        documentJson: '{}',
        replyToNumber: 2,
        quotedNumbers: [1],
      },
    ],
    [
      'EditForumPostInput',
      EditForumPostInput,
      { postId: 'p', expectedRevision: 3, documentJson: '{}', title: 'T' },
    ],
  ])('%s keeps every field', async (_name, metatype, value) => {
    await expect(
      passThrough(metatype as new () => object, value),
    ).resolves.toEqual(value);
  });

  it('rejects unknown enum values instead of dropping them', async () => {
    await expect(
      passThrough(ForumCategoryInput, {
        slug: 's',
        title: 'T',
        position: 0,
        visibility: 'SECRET',
        audienceKeys: [],
        active: true,
      }),
    ).rejects.toThrow();
    await expect(
      passThrough(CreateForumTopicInput, {
        forumId: 'f',
        kind: 'POLL',
        title: 'T',
        documentJson: '{}',
      }),
    ).rejects.toThrow();
  });
});
