import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { createHash, randomUUID } from "node:crypto";
import { createServer } from "node:net";
import { openRemoteMediaAttempt } from "../../../apps/worker/src/s3-media-attempt.ts";
const storageRequire = createRequire(
  new URL("../../../packages/storage/package.json", import.meta.url),
);
const { S3Client, CreateBucketCommand, DeleteBucketCommand } =
  storageRequire("@aws-sdk/client-s3");
const { S3ObjectStorage, s3StorageConfiguration } =
  storageRequire("@dss/storage");
const endpoint = new URL(process.env.DSS_S3_ENDPOINT);
assert.equal(endpoint.hostname, "127.0.0.1");
const bucket = "dss-test-" + randomUUID();
process.env.DSS_S3_BUCKET = bucket;
const config = s3StorageConfiguration(process.env);
const admin = new S3Client(config.client);
const storage = new S3ObjectStorage(config.client, bucket);
const content = Buffer.from("DSS compatibility fixture");
const job = {
  storageProvider: "MINIO",
  bucket,
  temporaryKey: "temporary/upload",
  destinationKey: "media/original.txt",
  variants: [],
  mimeType: "text/plain",
  size: content.length,
  checksum: createHash("sha256").update(content).digest("hex"),
  processingKind: "PASSTHROUGH",
};
const server = createServer((socket) => {
  let wire = Buffer.alloc(0);
  socket.on("data", (chunk) => {
    wire = Buffer.concat([wire, chunk]);
    if (wire.length === 10 + 4 + content.length + 4) {
      assert.equal(wire.subarray(0, 10).toString(), "zINSTREAM\0");
      assert.equal(wire.readUInt32BE(10), content.length);
      assert.deepEqual(wire.subarray(14, -4), content);
      assert.equal(wire.readUInt32BE(wire.length - 4), 0);
      socket.end("stream: OK\0");
    }
  });
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
process.env.CLAMAV_HOST = "127.0.0.1";
process.env.CLAMAV_PORT = String(server.address().port);
let created = false;
try {
  await admin.send(new CreateBucketCommand({ Bucket: bucket }));
  created = true;
  await storage.put(job.temporaryKey, content, job.mimeType);
  await assert.rejects(
    openRemoteMediaAttempt({ ...job, checksum: "0".repeat(64) }),
    /snapshot/,
  );
  const attempt = await openRemoteMediaAttempt(job);
  try {
    await storage.put(job.temporaryKey, Buffer.from("changed"), job.mimeType);
    assert.deepEqual(await attempt.scanner.scan(job), { status: "CLEAN" });
    const result = await attempt.files.transform(job);
    assert.equal(result.original.checksum, job.checksum);
    assert.deepEqual(
      await storage.read(job.destinationKey, content.length),
      content,
    );
    await attempt.files.cleanupSource(job);
    await assert.rejects(
      storage.read(job.temporaryKey, content.length),
      (error) => error.$metadata?.httpStatusCode === 404,
    );
  } finally {
    await attempt.close();
  }
  const workerRequire = createRequire(
    new URL("../../../apps/worker/package.json", import.meta.url),
  );
  const sharp = workerRequire("sharp");
  const png = await sharp({
    create: { width: 20, height: 12, channels: 3, background: "red" },
  })
    .png()
    .toBuffer();
  const imageJob = {
    ...job,
    mimeType: "image/png",
    processingKind: "IMAGE",
    size: png.length,
    checksum: createHash("sha256").update(png).digest("hex"),
    destinationKey: "media/image.webp",
    variants: [
      {
        name: "thumb",
        storageKey: "media/thumb.webp",
        width: 8,
        height: 8,
        fit: "cover",
      },
    ],
  };
  await storage.put(job.temporaryKey, png, imageJob.mimeType);
  const imageAttempt = await openRemoteMediaAttempt(imageJob);
  try {
    if (process.env.DSS_TEST_REAL_CLAMAV_PORT) {
      const port = Number(process.env.DSS_TEST_REAL_CLAMAV_PORT);
      assert.ok(Number.isInteger(port) && port > 0 && port <= 65535);
      process.env.CLAMAV_PORT = String(port);
      const scanned = await openRemoteMediaAttempt(imageJob);
      try {
        assert.deepEqual(await scanned.scanner.scan(imageJob), {
          status: "CLEAN",
        });
        console.log(
          "PASS real loopback ClamAV scanned the MinIO image snapshot",
        );
      } finally {
        await scanned.close();
      }
    }
    const result = await imageAttempt.files.transform(imageJob);
    assert.equal(result.variants.length, 1);
    assert.equal(result.variants[0].name, "thumb");
    for (const [file, width] of [
      [result.original, 20],
      [result.variants[0], 8],
    ]) {
      const bytes = await storage.read(file.storageKey, file.size);
      assert.equal(
        createHash("sha256").update(bytes).digest("hex"),
        file.checksum,
      );
      const metadata = await sharp(bytes).metadata();
      assert.equal(metadata.format, "webp");
      assert.equal(metadata.width, width);
    }
  } finally {
    await imageAttempt.close();
  }
  if (process.env.DSS_TEST_MEDIA_QUEUE === "true") {
    assert.ok(process.env.DSS_TEST_REAL_CLAMAV_PORT);
    const url = new URL(process.env.DATABASE_URL);
    assert.equal(url.hostname, "127.0.0.1");
    assert.equal(url.port, "5434");
    assert.equal(url.pathname, "/dss_test");
    assert.equal(url.search, "");
    const { Pool } = workerRequire("pg");
    const { Queue, Worker, QueueEvents } = workerRequire("bullmq");
    const { createMediaProcessingProcessor } =
      await import("../../../apps/worker/src/media-processing.processor.ts");
    const { PostgresMediaProcessingStore } =
      await import("../../../apps/worker/src/postgres-media-processing.store.ts");
    const { LocalMediaFileProcessor } =
      await import("../../../apps/worker/src/local-media-file.processor.ts");
    const { ClamAvMediaMalwareScanner } =
      await import("../../../apps/worker/src/clamav-media-malware.scanner.ts");
    const pool = new Pool({ connectionString: url.href });
    const id = randomUUID();
    const name = "s3-fixture-" + id;
    const connection = { host: "127.0.0.1", port: 6380 };
    const queue = new Queue(name, { connection });
    const events = new QueueEvents(name, { connection });
    const processor = createMediaProcessingProcessor(
      new PostgresMediaProcessingStore(pool),
      new LocalMediaFileProcessor(),
      new ClamAvMediaMalwareScanner(),
      openRemoteMediaAttempt,
    );
    const worker = new Worker(name, processor, { connection });
    const data = {
      ...imageJob,
      mediaId: id,
      ownerId: randomUUID(),
      uploadSessionId: randomUUID(),
      policyKey: "avatar",
      originalFilename: "test.png",
      scanRequired: true,
      queuedAt: new Date().toISOString(),
    };
    try {
      await pool.query(
        'INSERT INTO "media" ("id","kind","status","storageProvider","bucket","storageKey","originalFilename","mimeType","extension","size","checksum","updatedAt") VALUES ($1,\'IMAGE\',\'PROCESSING\',\'MINIO\',$2,$3,\'test.png\',\'image/png\',\'png\',$4,$5,NOW())',
        [id, bucket, data.destinationKey, data.size, data.checksum],
      );
      await events.waitUntilReady();
      const queued = await queue.add("process-media-upload.v1", data);
      const outcome = await queued.waitUntilFinished(events, 30000);
      assert.deepEqual(outcome, {
        mediaId: id,
        duplicate: false,
        quarantined: false,
      });
      const {
        rows: [media],
      } = await pool.query(
        "SELECT status,checksum,size FROM media WHERE id=$1",
        [id],
      );
      assert.equal(media.status, "READY");
      const bytes = await storage.read(data.destinationKey, media.size);
      assert.equal(
        createHash("sha256").update(bytes).digest("hex"),
        media.checksum,
      );
      const {
        rows: [thumb],
      } = await pool.query(
        'SELECT bucket,"storageProvider","storageKey" FROM media_variants WHERE "mediaId"=$1 AND name=$2',
        [id, "thumb"],
      );
      assert.deepEqual(thumb, {
        bucket,
        storageProvider: "MINIO",
        storageKey: data.variants[0].storageKey,
      });
      await assert.rejects(
        storage.read(data.temporaryKey, data.size),
        (error) => error.$metadata?.httpStatusCode === 404,
      );
      console.log(
        "PASS BullMQ -> real ClamAV -> MinIO -> PostgreSQL READY, variant location and temporary cleanup",
      );
    } finally {
      await worker.close();
      await events.close();
      await queue.obliterate();
      await queue.close();
      await pool.query("DELETE FROM media WHERE id=$1 AND bucket=$2", [
        id,
        bucket,
      ]);
      await pool.end();
    }
  }
  console.log(
    "PASS MinIO write, checksum, immutable scan/transform snapshot, delivery bytes and source cleanup",
  );
} finally {
  try {
    if (created) {
      await storage.delete(job.temporaryKey);
      await storage.delete(job.destinationKey);
      await storage.delete("media/image.webp");
      await storage.delete("media/thumb.webp");
      await admin.send(new DeleteBucketCommand({ Bucket: bucket }));
    }
  } finally {
    storage.close();
    admin.destroy();
    await new Promise((resolve) => server.close(resolve));
  }
}
