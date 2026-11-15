/** DSS File Passport — ignored diagnostic; real repositories, synthetic owned schema, no production activation. */
const { createRequire } = require('node:module');
const { resolve } = require('node:path');
const assert = require('node:assert/strict');
const root = resolve(__dirname, '../..');
const api = createRequire(resolve(root, 'apps/api/package.json'));
api('ts-node').register({ project: resolve(root, 'apps/api/tsconfig.json'), transpileOnly: true });
api('tsconfig-paths').register({ baseUrl: root, paths: { '@api/*': ['apps/api/src/*'] } });
api('reflect-metadata');
const { Pool } = api('pg');
const source = (path) => api(resolve(root, 'apps/api', path));
const { createIsolatedApiSchemaFixture } = source('test/helpers/migrated-api-schema.fixture');
const { AuditWriterService, AuditRedactionService } = source('src/core/audit');
const { PrismaRoutingControlRepository } = source('src/composition/gamification-delivery/infrastructure/prisma-routing-control.repository');
const { PrismaRoutingDiscoveryRepository } = source('src/composition/gamification-delivery/infrastructure/prisma-routing-discovery.repository');
async function main() {
  const url = new URL(process.env.DATABASE_URL);
  assert.equal(url.hostname, '127.0.0.1'); assert.equal(url.port, '5434'); assert.equal(url.pathname, '/dss_test');
  const fixture = await createIsolatedApiSchemaFixture();
  const pool = new Pool({ connectionString: process.env.DATABASE_URL, options: `-c search_path=${fixture.schema},public` });
  try {
    const operator = { actorId: 'synthetic:epoch-probe', actorType: 'SERVICE' };
    const control = new PrismaRoutingControlRepository(fixture.prisma, new AuditWriterService(new AuditRedactionService()));
    await control.prepare(operator); await control.activate(operator, 0n, 'synthetic:preflight');
    await pool.query(`INSERT INTO outbox_events
      (id,"eventName","eventVersion","eventCategory",producer,payload,"occurredAt","createdAt","updatedAt")
      SELECT gen_random_uuid(),'synthetic.epoch.v1',1,'integration','synthetic','{}',a.cutoff,
      a.cutoff+(g-50000)*interval '1 millisecond',a.cutoff
      FROM gamification_activations a CROSS JOIN generate_series(1,100000) AS g`);
    await pool.query(`INSERT INTO gamification_deliveries (destination,"eventId")
      SELECT a.destination,e.id FROM gamification_activations a JOIN outbox_events e ON e."createdAt">=a.cutoff
      ORDER BY e."createdAt",e.id LIMIT 45000`);
    await pool.query('ANALYZE outbox_events'); await pool.query('ANALYZE gamification_deliveries');
    const discovery = new PrismaRoutingDiscoveryRepository(fixture.prisma);
    const epochs = [];
    for (let epoch = 0; epoch < 2; epoch++) {
      const began = performance.now(); let batches = 0; let examined = 0; let inserted = 0; let closed = false;
      while (!closed) {
        const result = await discovery.reconcile(256);
        assert.equal(result.status, 'SCANNED'); assert(result.examined <= 256);
        batches++; examined += result.examined; inserted += result.inserted; closed = result.epochClosed;
        assert(batches <= 196, 'Known finite fixture epoch did not close');
      }
      assert.equal(examined, 50001); assert.equal(inserted, epoch === 0 ? 5001 : 0);
      epochs.push({ epoch, batches, examined, inserted, elapsedMs: Math.round((performance.now() - began) * 100) / 100 });
    }
    assert.equal(await fixture.prisma.gamificationDelivery.count(), 50001);
    assert.equal(await fixture.prisma.communityPointEntry.count(), 0);
    console.log(JSON.stringify({ sourceRows: 100000, excluded: 49999, initiallyRouted: 45000, batchSize: 256, epochs, queueStarted: false, effectsInvoked: false }));
  } finally { try { await pool.end(); } finally { await fixture.close(); } }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
