import { describe, expect, it, vi } from "vitest";
import { createSecurityEmailAlertProcessor } from "../src/security-email-alert.processor";

describe("security email alert processor", () => {
  it("renders a lock alert without credentials or client metadata", async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const process = createSecurityEmailAlertProcessor(send);
    await process({
      data: {
        eventId: "event-1",
        kind: "ACCOUNT_LOCKED",
        email: "astro@dss.test",
        occurredAt: "2026-09-30T18:00:00.000Z",
      },
    });
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "astro@dss.test",
        subject: expect.stringContaining("locked"),
        text: expect.stringContaining("2026-09-30T18:00:00.000Z"),
      }),
    );
    expect(JSON.stringify(send.mock.calls)).not.toMatch(
      /password=|token=|Device:|IP:/,
    );
  });

  it("sends an email-change alert to the previous address", async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const process = createSecurityEmailAlertProcessor(send);
    await process({
      data: {
        eventId: "event-2",
        kind: "EMAIL_CHANGED",
        email: "old@dss.test",
        occurredAt: "2026-09-30T18:00:00.000Z",
      },
    });
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ to: "old@dss.test" }),
    );
  });
});
