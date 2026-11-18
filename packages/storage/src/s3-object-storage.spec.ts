import { createServer, type Server } from "node:http";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { S3ObjectStorage } from "./s3-object-storage";

describe("S3 transport over real HTTP", () => {
  let server: Server;
  let storage: S3ObjectStorage;
  let requests: string[];

  beforeEach(async () => {
    requests = [];
    server = createServer((request, response) => {
      requests.push(`${request.method} ${request.url?.split("?")[0]}`);
      if (request.method === "GET") {
        if (request.url?.includes("/chunked")) response.write("he");
        else response.setHeader("Content-Length", "5");
        response.end("hello");
      } else {
        request.resume();
        request.once("end", () => {
          response.statusCode = request.method === "DELETE" ? 204 : 200;
          response.end();
        });
      }
    });
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    const address = server.address();
    if (!address || typeof address === "string")
      throw new Error("Missing HTTP address");
    storage = new S3ObjectStorage(
      {
        endpoint: `http://127.0.0.1:${address.port}`,
        region: "us-east-1",
        forcePathStyle: true,
        credentials: { accessKeyId: "synthetic", secretAccessKey: "synthetic" },
        maxAttempts: 1,
      },
      "dss-test",
    );
  });

  afterEach(async () => {
    storage.close();
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  });

  it("routes put/read/delete to a private bucket and canonical key", async () => {
    await storage.put("temporary/object", Buffer.from("hello"), "text/plain");
    expect((await storage.read("temporary/object", 5)).toString()).toBe(
      "hello",
    );
    await storage.delete("temporary/object");
    expect(requests).toEqual([
      "PUT /dss-test/temporary/object",
      "GET /dss-test/temporary/object",
      "DELETE /dss-test/temporary/object",
    ]);
  });

  it("rejects unsafe keys and invalid limits before network operations", async () => {
    await expect(
      storage.put("../escape", Buffer.from("x"), "text/plain"),
    ).rejects.toThrow();
    await expect(storage.read("valid/key", 0)).rejects.toThrow();
    await expect(storage.delete("/absolute")).rejects.toThrow();
    expect(requests).toEqual([]);
  });

  it("enforces the byte limit without Content-Length", async () => {
    await expect(storage.read("valid/chunked", 6)).rejects.toThrow(
      "read limit",
    );
    expect((await storage.read("valid/chunked", 7)).length).toBe(7);
  });

  it("rejects an oversized response", async () => {
    await expect(storage.read("valid/key", 4)).rejects.toThrow("read limit");
  });
});
