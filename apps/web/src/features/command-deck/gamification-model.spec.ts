import { describe, expect, it } from "vitest";

import {
  orderLevelChanges,
  ruleCategory,
  ruleLabel,
} from "./gamification-model";

describe("gamification model", () => {
  it("labels known rules and keeps unknown keys", () => {
    expect(ruleLabel("forum.topic.created")).toBe("Створення теми");
    expect(ruleLabel("shop.order.paid")).toBe("shop.order.paid");
  });

  it("groups rules by producer", () => {
    expect(ruleCategory("forum.reply.created").label).toBe("Форум");
    expect(ruleCategory("news.published").id).toBe("content");
    expect(ruleCategory("knowledge.article.published").id).toBe("content");
    expect(ruleCategory("shop.order.paid")).toEqual({
      id: "other",
      label: "Інше",
    });
  });

  it("orders threshold updates so they stay strictly increasing", () => {
    const order = orderLevelChanges([
      { level: 2, from: 100, to: 150 },
      { level: 3, from: 250, to: 400 },
      { level: 5, from: 1000, to: 700 },
      { level: 4, from: 500, to: 450 },
    ]).map(({ level }) => level);
    expect(order).toEqual([4, 5, 3, 2]);
  });
});
