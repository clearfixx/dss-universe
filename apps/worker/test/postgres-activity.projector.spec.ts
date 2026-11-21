/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Activity Worker Tests
 * 📄 File: apps/worker/test/postgres-activity.projector.spec.ts
 *
 * 🎯 Purpose:
 * Verifies Activity projection and retraction event handling.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Pool } from "pg";
import type { IntegrationEventJob } from "@dss/jobs";

import { PostgresActivityProjector } from "../src/postgres-activity.projector";

describe("PostgresActivityProjector", () => {
  const query = vi.fn(async () => ({ rowCount: 1 }));
  const release = vi.fn();
  const connect = vi.fn(async () => ({ query, release }));
  const projector = new PostgresActivityProjector({
    query,
    connect,
  } as unknown as Pool);
  beforeEach(() => vi.clearAllMocks());

  it("projects a profile-wall event without copying post content", async () => {
    const event: IntegrationEventJob = {
      eventId: "event-1",
      eventName: "users.profile-wall.post-created.v1",
      eventVersion: 1,
      category: "integration",
      producer: "dss.api.users",
      actorId: "author-1",
      aggregateType: "UserWallPost",
      aggregateId: "post-1",
      payload: {
        profileOwnerId: "owner-1",
        hasImage: true,
        body: "must not be projected",
      },
      occurredAt: "2026-07-27T00:00:00.000Z",
    };

    await projector.project(event);

    const values = query.mock.calls.find(([sql]) =>
      String(sql).includes('INSERT INTO "activity_entries"'),
    )?.[1] as unknown[];
    expect(values).toContain("PROFILE_WALL_POST_CREATED");
    expect(JSON.stringify(values)).not.toContain("must not be projected");
  });

  it("retracts projected activity for a tombstoned subject", async () => {
    await projector.project({
      eventId: "event-2",
      eventName: "users.profile-wall.post-retracted.v1",
      eventVersion: 1,
      category: "integration",
      producer: "dss.api.users",
      aggregateType: "UserWallPost",
      aggregateId: "post-1",
      payload: {},
      occurredAt: "2026-07-27T01:00:00.000Z",
    });

    const statements = query.mock.calls.map(([sql]) => String(sql));
    expect(statements[0]).toBe("BEGIN");
    expect(statements[1]).toContain("pg_advisory_xact_lock");
    expect(statements[2]).toContain('INSERT INTO "activity_retractions"');
    expect(statements[3]).toContain('SET "retractedAt"');
    expect(statements[4]).toBe("COMMIT");
    expect(release).toHaveBeenCalledOnce();
  });

  it("rolls back and releases the client when projection fails", async () => {
    const failure = new Error("synthetic projection failure");
    query.mockResolvedValueOnce({ rowCount: 1 }).mockRejectedValueOnce(failure);
    await expect(
      projector.project({
        eventId: "failed-event",
        eventName: "users.profile-wall.post-retracted.v1",
        eventVersion: 1,
        category: "integration",
        producer: "synthetic",
        aggregateType: "UserWallPost",
        aggregateId: "post-1",
        payload: {},
        occurredAt: "2026-07-27T01:00:00.000Z",
      }),
    ).rejects.toBe(failure);
    expect(query.mock.calls.at(-1)?.[0]).toBe("ROLLBACK");
    expect(release).toHaveBeenCalledWith(false);
    expect(release).toHaveBeenCalledOnce();
  });

  it("projects a published News signal with allow-listed discovery metadata", async () => {
    await projector.project({
      eventId: "event-news-1",
      eventName: "news.article.published.v1",
      eventVersion: 1,
      category: "domain",
      producer: "dss.api.news",
      actorId: "publisher-1",
      aggregateType: "NewsArticle",
      aggregateId: "article-1",
      payload: {
        authorId: "author-1",
        language: "uk",
        slug: "station-update",
        title: "Оновлення станції",
        visibility: "PUBLIC",
        categorySlug: "releases",
        tags: "nextjs,dss",
        document: "must not enter the feed",
      },
      occurredAt: "2026-09-22T12:00:00.000Z",
    });

    const values = query.mock.calls.at(-1)?.[1] as unknown[];
    expect(values).toContain("author-1");
    expect(values).toContain("PUBLIC");
    expect(values).toContain("NewsArticle");
    expect(JSON.stringify(values)).toContain("station-update");
    expect(JSON.stringify(values)).not.toContain("must not enter the feed");
  });

  const forumEvent = (
    eventName: string,
    aggregateType: string,
    payload: Record<string, unknown>,
    producer = "dss.api.forum",
  ): IntegrationEventJob => ({
    eventId: "forum-" + eventName,
    eventName,
    eventVersion: 1,
    category: "integration",
    producer,
    actorId: "actor-1",
    aggregateType,
    aggregateId: "aggregate-1",
    payload,
    occurredAt: "2026-11-21T00:00:00.000Z",
  });

  it("projects forum topics, replies and accepted answers as MEMBERS entries", async () => {
    await projector.project(
      forumEvent("forum.topic.created.v1", "ForumTopic", {
        authorId: "author-1",
        title: "Hello",
        forumId: "forum-1",
      }),
    );
    await projector.project(
      forumEvent("forum.post.created.v1", "ForumPost", {
        authorId: "author-2",
        topicId: "topic-1",
        number: 2,
      }),
    );
    await projector.project(
      forumEvent("forum.answer.accepted.v1", "ForumTopic", {
        authorId: "author-2",
        postId: "post-9",
        topicId: "topic-1",
      }),
    );
    const inserts = query.mock.calls
      .filter(([sql]) => String(sql).includes('INSERT INTO "activity_entries"'))
      .map(([sql, values]) => ({
        sql: String(sql),
        values: values as unknown[],
      }));
    expect(inserts).toHaveLength(3);
    expect(inserts.every(({ sql }) => sql.includes("'MEMBERS'"))).toBe(true);
    expect(inserts.map(({ values }) => values[3])).toEqual([
      "FORUM_TOPIC_CREATED",
      "FORUM_REPLY_CREATED",
      "FORUM_ANSWER_ACCEPTED",
    ]);
    expect(inserts[2].values[5]).toBe("post-9");
  });

  it("rejects forum events from another producer or without an author", async () => {
    await expect(
      projector.project(
        forumEvent(
          "forum.topic.created.v1",
          "ForumTopic",
          { authorId: "a" },
          "dss.api.other",
        ),
      ),
    ).rejects.toThrow("Invalid forum activity event.");
    await expect(
      projector.project(
        forumEvent("forum.post.created.v1", "ForumPost", { topicId: "t" }),
      ),
    ).rejects.toThrow("Forum activity metadata is incomplete.");
  });
});

/**
 * If a deleted post remains famous in the feed, the projector missed the memo.
 */
