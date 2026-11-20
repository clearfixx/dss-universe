import type { S3ClientConfig } from "@aws-sdk/client-s3";

export function validateS3Bucket(bucket: string): void {
  if (
    !/^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(bucket) ||
    bucket.includes("..") ||
    /^\d+\.\d+\.\d+\.\d+$/.test(bucket)
  ) {
    throw new Error("Invalid object storage bucket.");
  }
}

export type S3StorageConfiguration = Readonly<{
  bucket: string;
  client: S3ClientConfig;
}>;

/** Configuration belongs to infrastructure; persisted locations select reads. */
export function s3StorageConfiguration(
  environment: Readonly<Record<string, string | undefined>>,
): S3StorageConfiguration {
  const bucket = environment.DSS_S3_BUCKET;
  const region = environment.DSS_S3_REGION;
  if (!bucket || !region) throw new Error("S3 bucket and region are required.");
  validateS3Bucket(bucket);
  const endpoint = environment.DSS_S3_ENDPOINT;
  if (endpoint) {
    const url = new URL(endpoint);
    if (
      !["https:", "http:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      (url.pathname !== "/" && url.pathname !== "")
    )
      throw new Error("Invalid S3 endpoint.");
    if (
      url.protocol === "http:" &&
      !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
    ) {
      throw new Error("S3 requires HTTPS outside loopback endpoints.");
    }
  }
  const pathStyle = environment.DSS_S3_FORCE_PATH_STYLE;
  if (pathStyle !== undefined && !["true", "false"].includes(pathStyle)) {
    throw new Error("S3 path style must be true or false.");
  }
  // The SDK owns the standard AWS credential chain; secrets stay outside config logs.
  return {
    bucket,
    client: {
      region,
      endpoint,
      forcePathStyle: pathStyle === "true",
      maxAttempts: 3,
    },
  };
}
