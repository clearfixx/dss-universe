import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import type { Pool } from "pg";
import { createPasswordRecoveryProcessor } from "../src/password-recovery.processor";

function setup(known = true) {
  const query = vi.fn(async (sql: string) => {
    if (sql.startsWith("SELECT"))
      return {
        rows: known
          ? [{ id: "user", email: "dev@example.test", authVersion: 2 }]
          : [],
        rowCount: known ? 1 : 0,
      };
    return { rows: [], rowCount: 1 };
  });
  const release = vi.fn();
  const pool = {
    connect: vi.fn(async () => ({ query, release })),
  } as unknown as Pool;
  const send = vi.fn(async () => {});
  const process = createPasswordRecoveryProcessor(
    pool,
    send,
    "http://localhost:3100/reset-password",
  );
  return { query, release, pool, send, process };
}
const data = () => ({
  email: "dev@example.test",
  requestedAt: new Date().toISOString(),
});

describe("password recovery delivery", () => {
  it("stores only a digest and mails a fragment URL after committing", async () => {
    const s = setup();
    await s.process({ data: data() });
    const mail = s.send.mock.calls[0] as unknown as [{ text: string }];
    const token = mail[0].text.match(/#token=([a-f0-9]{64})/)![1]!;
    const insert = s.query.mock.calls.find(([sql]) =>
      sql.startsWith("INSERT"),
    ) as unknown as [string, unknown[]];
    expect(insert[1][1]).toBe(createHash("sha256").update(token).digest("hex"));
    expect(JSON.stringify(s.query.mock.calls)).not.toContain(token);
    expect(s.query.mock.calls.at(-1)?.[0]).toBe("COMMIT");
    expect(s.release).toHaveBeenCalledOnce();
  });
  it("sends nothing for unknown or inactive accounts", async () => {
    const s = setup(false);
    await s.process({ data: data() });
    expect(s.send).not.toHaveBeenCalled();
  });
  it("discards stale queue requests", async () => {
    const s = setup();
    await s.process({
      data: {
        ...data(),
        requestedAt: new Date(Date.now() - 3600_000).toISOString(),
      },
    });
    expect(s.pool.connect).not.toHaveBeenCalled();
  });
  it("rejects insecure external reset origins", async () => {
    const s = setup();
    await expect(
      createPasswordRecoveryProcessor(
        s.pool,
        s.send,
        "http://example.com/reset",
      )({ data: data() }),
    ).rejects.toThrow("configuration");
    expect(s.send).not.toHaveBeenCalled();
  });
  it("propagates delivery errors to queue retries without logging credentials", async () => {
    const s = setup();
    s.send.mockRejectedValue(
      new Error("SMTP rejected dev@example.test: private body"),
    );
    await expect(s.process({ data: data() })).rejects.toThrow(
      "Password recovery email delivery failed",
    );
  });
});
