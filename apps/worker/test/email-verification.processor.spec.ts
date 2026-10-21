import { describe, expect, it, vi } from "vitest";
import { createEmailVerificationProcessor } from "../src/email-verification.processor";

describe("email verification processor", () => {
  it("stores only the digest and sends a fragment credential", async () => {
    const query = vi
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ rows: [{ id: "user-1", email: "a@dss.test" }] })
      .mockResolvedValueOnce({ rowCount: 1 })
      .mockResolvedValueOnce(undefined);
    const release = vi.fn();
    const pool = { connect: vi.fn().mockResolvedValue({ query, release }) };
    const send = vi.fn().mockResolvedValue(undefined);
    const process = createEmailVerificationProcessor(
      pool as never,
      send,
      "https://dss.test/verify-email",
    );

    await process({
      data: {
        userId: "user-1",
        email: "a@dss.test",
        requestedAt: new Date().toISOString(),
      },
    });

    const insertParameters = query.mock.calls[2]?.[1] as string[];
    expect(insertParameters[1]).toMatch(/^[a-f0-9]{64}$/);
    const mail = send.mock.calls[0]?.[0] as { text: string };
    expect(mail.text).toContain("/verify-email#token=");
    expect(mail.text).not.toContain(insertParameters[1]);
    expect(release).toHaveBeenCalled();
  });
});
