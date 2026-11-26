/**
 * Regression guard: the global ValidationPipe uses `whitelist: true`, which
 * silently drops input fields without a class-validator decorator. Category
 * visibility and topic kind were dropped that way, so no category could be
 * created and every topic became a discussion through GraphQL.
 */
import { ArgumentMetadata, ValidationPipe } from '@nestjs/common';
import {
  ForumCategoryInput,
  ForumInput,
  SaveForumSettingsInput,
} from './forum-structure.resolver';
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
        allowTopics: false,
        allowReplies: true,
        allowPolls: false,
        allowAttachments: true,
        listed: false,
        searchable: true,
        showCounts: false,
        pinnedLimit: 5,
        attachmentMaxMb: 25,
        attachmentFormats: ['pdf', 'zip'],
        autoCloseDays: 30,
        gateViewRole: 'MEMBER',
        gateCreateRole: 'CONTRIBUTOR',
        gateBlockTypes: ['TEXT', 'CODE'],
      },
    ],
    [
      'SaveForumSettingsInput',
      SaveForumSettingsInput,
      {
        categories: [],
        forums: [
          {
            id: 'f',
            resetAccess: false,
            input: {
              categoryId: 'c',
              parentId: null,
              slug: 'web',
              title: 'Web',
              description: null,
              position: 1,
              allowsGatedContent: false,
              active: true,
              allowTopics: true,
              allowReplies: true,
              allowPolls: true,
              allowAttachments: true,
              listed: true,
              searchable: true,
              showCounts: true,
              pinnedLimit: null,
              attachmentMaxMb: 25,
              attachmentFormats: ['pdf', 'zip'],
              autoCloseDays: 30,
              gateViewRole: 'MEMBER',
              gateCreateRole: 'CONTRIBUTOR',
              gateBlockTypes: ['TEXT', 'CODE'],
            },
            access: [
              {
                role: 'MEMBER',
                view: true,
                read: true,
                createTopics: true,
                reply: true,
                editOwn: true,
                deleteOwn: false,
                moderate: false,
              },
            ],
          },
        ],
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
