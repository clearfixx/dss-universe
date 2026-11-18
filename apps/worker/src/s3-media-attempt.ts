import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { MediaProcessingJob } from "@dss/jobs";
import {
  S3ObjectStorage,
  resolveStorageKey,
  s3StorageConfiguration,
} from "@dss/storage";
import { ClamAvMediaMalwareScanner } from "./clamav-media-malware.scanner.js";
import { LocalMediaFileProcessor } from "./local-media-file.processor.js";
import type {
  MediaFileProcessor,
  MediaMalwareScanner,
} from "./media-processing.types.js";

export type RemoteMediaAttempt = {
  files: MediaFileProcessor;
  scanner: MediaMalwareScanner;
  close(): Promise<void>;
};

export async function openRemoteMediaAttempt(
  job: MediaProcessingJob,
): Promise<RemoteMediaAttempt> {
  if (job.storageProvider !== "S3" && job.storageProvider !== "MINIO")
    throw new Error("Unsupported Media storage provider.");
  const config = s3StorageConfiguration(process.env);
  const remote = new S3ObjectStorage(config.client, job.bucket);
  let root: string | undefined;
  const close = async () => {
    remote.close();
    if (root) await rm(root, { recursive: true, force: true });
  };
  try {
    root = await mkdtemp(join(tmpdir(), "dss-media-"));
    const directory = root;
    const bytes = await remote.read(job.temporaryKey, job.size);
    if (
      bytes.length !== job.size ||
      createHash("sha256").update(bytes).digest("hex") !== job.checksum
    )
      throw new Error("Media snapshot does not match the accepted upload.");
    // A fixed private staging name is independent of all remote object keys.
    const localJob = {
      ...job,
      storageProvider: "LOCAL",
      temporaryKey: "input",
      destinationKey: "original",
      variants: job.variants.map((variant, index) => ({
        ...variant,
        storageKey: "variant-" + index + ".webp",
      })),
    };
    await writeFile(join(directory, "input"), bytes, {
      flag: "wx",
      mode: 0o600,
    });
    const local = new LocalMediaFileProcessor(directory);
    const scanner = new ClamAvMediaMalwareScanner(
      undefined,
      undefined,
      undefined,
      directory,
    );
    return {
      close,
      scanner: { scan: () => scanner.scan(localJob) },
      files: {
        cleanupSource: () => remote.delete(job.temporaryKey),
        async transform() {
          const result = await local.transform(localJob);
          const publish = async (file: typeof result.original, key: string) => {
            await remote.put(
              key,
              await readFile(resolveStorageKey(directory, file.storageKey)),
              file.mimeType,
            );
            return {
              ...file,
              storageKey: key,
              extension: key.split(".").pop()?.toLowerCase() ?? "",
            };
          };
          const original = await publish(result.original, job.destinationKey);
          const variants: typeof result.variants = [];
          for (const [index, file] of result.variants.entries()) {
            variants.push(await publish(file, job.variants[index]!.storageKey));
          }
          return { original, variants };
        },
      },
    };
  } catch (error) {
    await close();
    throw error;
  }
}
