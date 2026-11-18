import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
  type S3ClientConfig,
} from "@aws-sdk/client-s3";
import { validateS3Bucket } from "./s3-configuration";
import { normalizeStorageKey } from "./normalize-storage-key";

/** Infrastructure transport shared by S3 and MinIO; Media owns authorization. */
export class S3ObjectStorage {
  private readonly client: S3Client;

  constructor(
    config: S3ClientConfig,
    private readonly bucket: string,
  ) {
    validateS3Bucket(bucket);
    this.client = new S3Client(config);
  }

  async put(key: string, body: Uint8Array, contentType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: normalizeStorageKey(key),
        Body: body,
        ContentType: contentType,
      }),
    );
  }

  async read(key: string, maxBytes: number): Promise<Buffer> {
    const normalized = normalizeStorageKey(key);
    if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0) {
      throw new Error("A positive object read limit is required.");
    }
    const response = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: normalized,
      }),
    );
    const body = response.Body;
    if (!body || !(Symbol.asyncIterator in body) || !("destroy" in body)) {
      throw new Error("Object storage returned an unsupported response body.");
    }
    const chunks: Buffer[] = [];
    let size = 0;
    try {
      if (
        response.ContentLength !== undefined &&
        response.ContentLength > maxBytes
      ) {
        throw new Error("Object exceeds the read limit.");
      }
      for await (const chunk of body) {
        const bytes = Buffer.from(chunk as Uint8Array);
        size += bytes.length;
        if (size > maxBytes) throw new Error("Object exceeds the read limit.");
        chunks.push(bytes);
      }
      return Buffer.concat(chunks, size);
    } finally {
      body.destroy();
    }
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: normalizeStorageKey(key),
      }),
    );
  }

  close(): void {
    this.client.destroy();
  }
}
