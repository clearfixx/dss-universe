import { describe, expect, it } from "vitest";

import {
  appealFileError,
  banTicketFrom,
  formatBanDate,
  isOpenDuringBan,
} from "./ban-contract";

describe("ban screen contract", () => {
  it("takes a ticket only from the banned login failure", () => {
    expect(
      banTicketFrom({
        message: "ACCOUNT_BANNED",
        extensions: { banTicket: "t" },
      }),
    ).toBe("t");
    expect(
      banTicketFrom({ message: "Other", extensions: { banTicket: "t" } }),
    ).toBeNull();
    expect(banTicketFrom({ message: "ACCOUNT_BANNED" })).toBeNull();
    expect(banTicketFrom(undefined)).toBeNull();
  });

  it("keeps only the ban screen and login open while banned", () => {
    expect(["/banned", "/banned/files", "/login"].every(isOpenDuringBan)).toBe(
      true,
    );
    expect(["/", "/community", "/bannedx"].some(isOpenDuringBan)).toBe(false);
  });

  it("accepts screenshots only, up to 10 MB", () => {
    expect(appealFileError({ type: "image/png", size: 10 })).toBeNull();
    expect(appealFileError({ type: "application/pdf", size: 10 })).toMatch(
      /лише картинки/,
    );
    expect(
      appealFileError({ type: "image/jpeg", size: 11 * 1024 * 1024 }),
    ).toMatch(/10 МБ/);
    expect(appealFileError({ type: "image/webp", size: 0 })).toMatch(
      /порожній/,
    );
  });

  it("shows the date in Kyiv time", () => {
    expect(formatBanDate("2026-10-16T11:28:00.000Z")).toContain("14:28");
  });
});
