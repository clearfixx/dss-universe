import { describe, expect, it } from "vitest";
import { s3StorageConfiguration } from "./s3-configuration";

const base = { DSS_S3_BUCKET: "private-media", DSS_S3_REGION: "us-east-1" };
describe("S3 infrastructure configuration", () => {
  it("keeps standard credential discovery with AWS endpoints", () => {
    const configuration = s3StorageConfiguration(base);
    expect(configuration.bucket).toBe("private-media");
    expect(configuration.client.credentials).toBeUndefined();
    expect(configuration.client.endpoint).toBeUndefined();
  });
  it("supports explicit loopback MinIO path-style configuration", () => {
    expect(
      s3StorageConfiguration({
        ...base,
        DSS_S3_ENDPOINT: "http://127.0.0.1:19000",
        DSS_S3_FORCE_PATH_STYLE: "true",
      }).client.forcePathStyle,
    ).toBe(true);
  });
  it.each([
    "http://objects.example.com",
    "ftp://objects.example.com",
    "https://user:password@objects.example.com",
    "https://objects.example.com?token=x",
    "https://objects.example.com/path",
    "https://objects.example.com#fragment",
  ])("rejects unsafe endpoint %s", (DSS_S3_ENDPOINT) => {
    expect(() =>
      s3StorageConfiguration({ ...base, DSS_S3_ENDPOINT }),
    ).toThrow();
  });
  it("rejects incomplete or ambiguous configuration", () => {
    expect(() => s3StorageConfiguration({})).toThrow();
    expect(() =>
      s3StorageConfiguration({ ...base, DSS_S3_FORCE_PATH_STYLE: "yes" }),
    ).toThrow();
  });
});
