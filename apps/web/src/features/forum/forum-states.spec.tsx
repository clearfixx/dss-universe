import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  ForumReadOnlyNotice,
  ForumStatePanel,
  forumDaysLeft,
} from "./forum-states";

describe("forum system states", () => {
  it("rounds the remaining read-only days up", () => {
    const now = new Date("2026-11-21T10:00:00.000Z");
    expect(forumDaysLeft(new Date("2026-11-28T10:00:00.000Z"), now)).toBe(7);
    expect(forumDaysLeft(new Date("2026-11-21T11:00:00.000Z"), now)).toBe(1);
    expect(forumDaysLeft(new Date("2026-11-20T10:00:00.000Z"), now)).toBe(1);
  });

  it("announces the read-only restriction with its end", () => {
    const until = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 - 60_000);
    render(<ForumReadOnlyNotice until={until.toISOString()} />);
    const notice = screen.getByRole("status");
    expect(notice).toHaveTextContent("Режим «Лише читання»");
    expect(notice).toHaveTextContent("залишилось 2 дні");
  });

  it("renders a state panel heading and actions", () => {
    render(
      <ForumStatePanel
        icon={<span />}
        title="У цьому розділі ще немає тем"
        actions={<button type="button">Створити тему</button>}
      >
        Стань першим.
      </ForumStatePanel>,
    );
    expect(
      screen.getByRole("heading", { name: "У цьому розділі ще немає тем" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Створити тему" })).toBeVisible();
  });
});
