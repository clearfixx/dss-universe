/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Content Access
 * 📄 File: apps/api/src/modules/content-access/infrastructure/repositories/prisma-content-gates.repository.integration.spec.ts
 *
 * 🎯 Purpose:
 * Proves audience-before-threshold delivery using real PostgreSQL viewer facts.
 *
 * 🧠 Responsibilities:
 * • isolates gates, account states and role fixtures in an owned schema;
 * • verifies Premium redaction and immediate grant revocation;
 * • rejects inactive viewers before any threshold bypass.
 *
 * 🏗️ Architecture:
 * Real gate repository/evaluator and editor normalization/redaction;
 * rendering is unused. This is not a completed category ACL implementation.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaService } from '@api/core/database';
import { AuditWriterService } from '@api/core/audit';
import { AuditRedactionService } from '@api/core/audit/services/audit-redaction.service';
import { PermissionsRepository } from '@api/core/authorization/repositories/permissions.repository';
import { AccessCapabilityDecisionsService } from '@api/core/authorization/services/access-capability-decisions.service';
import { applyAccessGroupMigration } from '../../../../../test/helpers/access-group-schema.fixture';
import { PrismaAccessGroupRepository } from '../../../iam/infrastructure/repositories/prisma-access-group.repository';
import { PrismaMembershipGrantTransaction } from '../../../../composition/iam-transactions/infrastructure/prisma-membership-grant.transaction';
import { PrismaMembershipGrantWriter } from '../../../iam/infrastructure/repositories/prisma-membership-grant.writer';
import { PrismaTransactionalSubjectExistenceReader } from '../../../auth/infrastructure';
import { PrismaSubjectEligibilityReader } from '../../../auth/infrastructure/repositories/prisma-subject-eligibility.reader';
import { IamMembershipAdapter } from '../../../../composition/access-groups/infrastructure/iam-membership.adapter';
import { ContentAudienceAdapter } from '../../../../composition/access-groups/infrastructure/content-audience.adapter';
import { createEmptyEditorDocument } from '@dss/editor';
import { ContentGatesService } from '../../application/services/content-gates.service';
import { ContentGateDecisionsService } from '../../application/services/content-gate-decisions.service';
import { EditorGateDecisionAdapter } from '../../../../composition/content/infrastructure/editor-gate-decision.adapter';
import { EditorService } from '../../../editor/application/services/editor.service';
import { EditorContentDeliveryService } from '../../../editor/application/services/editor-content-delivery.service';
import type { EditorHtmlRenderer } from '../../../editor/infrastructure/rendering/editor-html.renderer';
import { PrismaContentGatesRepository } from './prisma-content-gates.repository';
import { ContentGateViewerFactsService } from '../../application/services/content-gate-viewer-facts.service';
import { GateAccountEvidenceAdapter } from '../../../../composition/content-reads/infrastructure/gate-account-evidence.adapter';
import { GateCommentCountAdapter } from '../../../../composition/content-reads/infrastructure/gate-comment-count.adapter';
import { GateReputationTotalAdapter } from '../../../../composition/content-reads/infrastructure/gate-reputation-total.adapter';
import { PrismaAccountEvidenceReader } from '../../../auth/infrastructure/repositories/prisma-account-evidence.reader';
import { PrismaCommentCountReader } from '../../../interactions/infrastructure/repositories/prisma-comment-count.reader';
import { PrismaReputationTotalReader } from '../../../reputation/infrastructure/repositories/prisma-reputation-total.reader';

const dbSuite =
  process.env.RUN_AUTH_DB_TESTS === '1' ? describe : describe.skip;
dbSuite('Content Gate audience PostgreSQL integration', () => {
  const schema = `gate_audience_${randomUUID().replaceAll('-', '')}`;
  const tables = [
    'users',
    'roles',
    'user_roles',
    'permissions',
    'role_permissions',
    'user_permissions',
    'audit_records',
    'comments',
    'reputation_entries',
    'content_gates',
    'content_gate_requirements',
  ];
  const admin = new Pool({ connectionString: process.env.DATABASE_URL });
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    options: `-c search_path=${schema},public`,
  });
  const prisma = new PrismaService({ adapter: new PrismaPg(pool, { schema }) });
  const repository = new PrismaContentGatesRepository(prisma);
  const membershipAudit = new AuditWriterService(new AuditRedactionService());
  const memberships = new PrismaAccessGroupRepository(
    prisma,
    membershipAudit,
    new PrismaMembershipGrantTransaction(
      prisma,
      new PrismaMembershipGrantWriter(membershipAudit),
      new PrismaTransactionalSubjectExistenceReader(),
    ),
  );
  const permissions = new PermissionsRepository(prisma);
  const decisions = new AccessCapabilityDecisionsService(
    new IamMembershipAdapter({
      readEffective: (id, at) => memberships.effectiveMemberships(id, at),
    }),
    new PrismaSubjectEligibilityReader(prisma),
    {
      getAccessProfileByUserId: (id) =>
        permissions.findAccessProfileByUserId(id),
    },
  );
  const statistics = new ContentGateViewerFactsService(
    new GateAccountEvidenceAdapter(new PrismaAccountEvidenceReader(prisma)),
    new GateCommentCountAdapter(new PrismaCommentCountReader(prisma)),
    new GateReputationTotalAdapter(new PrismaReputationTotalReader(prisma)),
  );
  const gates = new ContentGatesService(
    repository,
    new ContentAudienceAdapter(decisions),
    statistics,
  );
  let premiumStaffMembershipId: string;
  const editor = new EditorService({
    render: jest.fn(),
  } as unknown as EditorHtmlRenderer);
  const delivery = new EditorContentDeliveryService(
    editor,
    new EditorGateDecisionAdapter(new ContentGateDecisionsService(gates)),
  );
  const gateId = randomUUID();

  beforeAll(async () => {
    await admin.query(`CREATE SCHEMA "${schema}"`);
    for (const table of tables) {
      await pool.query(
        `CREATE TABLE ${table} (LIKE public.${table} INCLUDING ALL)`,
      );
    }
    await applyAccessGroupMigration(pool);
    await pool.query(
      'ALTER TABLE user_roles ADD FOREIGN KEY ("userId") REFERENCES users(id), ADD FOREIGN KEY ("roleId") REFERENCES roles(id)',
    );
    await pool.query(
      'ALTER TABLE content_gates ADD FOREIGN KEY ("ownerId") REFERENCES users(id)',
    );
    await pool.query(
      'ALTER TABLE content_gate_requirements ADD FOREIGN KEY ("gateId") REFERENCES content_gates(id)',
    );
  });
  beforeEach(async () => {
    await pool.query(
      `TRUNCATE access_group_memberships, access_group_capabilities, access_groups, ${tables.join(', ')}`,
    );
    for (const id of ['author', 'premium-only', 'premium-staff', 'staff']) {
      await pool.query(
        'INSERT INTO users (id,email,username,"passwordHash","updatedAt") VALUES ($1,$2,$1,$3,NOW())',
        [id, `${id}@dss.test`, 'synthetic-hash'],
      );
    }
    await pool.query(
      `INSERT INTO roles (id,name,label,"updatedAt") VALUES ('premium','premium','Premium',NOW()), ('staff','moderators','Moderators',NOW())`,
    );
    await pool.query(
      "INSERT INTO user_roles (\"userId\",\"roleId\") VALUES ('author','premium'), ('premium-only','premium'), ('premium-staff','premium'), ('premium-staff','staff'), ('staff','staff')",
    );
    await pool.query(
      `INSERT INTO access_groups (id,key,"displayName",kind,"createdById","updatedAt") VALUES ('premium','premium','Premium','PREMIUM','author',NOW())`,
    );
    for (const subjectId of ['author', 'premium-only', 'premium-staff']) {
      const membership = await memberships.grant(
        {
          groupId: 'premium',
          subjectId,
          validFrom: new Date('2020-01-01'),
          validUntil: null,
        },
        'author',
      );
      if (subjectId === 'premium-staff')
        premiumStaffMembershipId = membership!.id;
    }
    await pool.query(
      'INSERT INTO content_gates (id,"ownerId",operator,"updatedAt") VALUES ($1,$2,$3,NOW())',
      [gateId, 'author', 'ALL'],
    );
    await pool.query(
      'INSERT INTO content_gate_requirements (id,"gateId",kind,threshold,"groupKey") VALUES ($1,$2,$3,NULL,$4), ($5,$2,$6,100,NULL)',
      [randomUUID(), gateId, 'GROUP', 'moderators', randomUUID(), 'REPUTATION'],
    );
  });
  afterAll(async () => {
    await prisma.$disconnect();
    await pool.end();
    await admin.query(`DROP SCHEMA "${schema}" CASCADE`);
    await admin.end();
  });

  function documentJson() {
    const document = createEmptyEditorDocument('NEWS');
    document.content.content = [
      {
        type: 'paragraph',
        content: [{ type: 'text', text: 'Public summary' }],
      },
      {
        type: 'contentGate',
        attrs: { gateId },
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Restricted staff payload' }],
          },
        ],
      },
    ];
    return JSON.stringify(document);
  }

  it.each(['ALL', 'ANY'])(
    'redacts staff content for Premium and author before %s numeric bypass',
    async (operator) => {
      await pool.query('UPDATE content_gates SET operator=$1', [operator]);
      for (const viewer of ['premium-only', 'author']) {
        const projection = await delivery.project(documentJson(), viewer);
        expect(projection.documentJson).toContain('Public summary');
        expect(projection.documentJson).not.toContain(
          'Restricted staff payload',
        );
        expect(projection.gates[0]).toMatchObject({
          allowed: false,
          bypassed: false,
          unmet: ['GROUP'],
        });
      }
      const permitted = await delivery.project(documentJson(), 'premium-staff');
      expect(permitted.documentJson).toContain('Restricted staff payload');
      expect(permitted.gates[0]).toMatchObject({
        allowed: true,
        bypassed: true,
      });
      const ordinary = await delivery.project(documentJson(), 'staff');
      expect(ordinary.documentJson).not.toContain('Restricted staff payload');
      expect(ordinary.gates[0]).toMatchObject({
        allowed: false,
        unmet: ['REPUTATION'],
      });
    },
  );

  it.each(['BANNED', 'DEACTIVATED', 'DELETED'])(
    'rejects %s Premium viewers before returning a projection',
    async (status) => {
      await pool.query('UPDATE users SET status=$1 WHERE id=$2', [
        status,
        'premium-staff',
      ]);
      await expect(
        statistics.read('premium-staff', new Date()),
      ).resolves.toBeNull();
      await expect(
        delivery.project(documentJson(), 'premium-staff'),
      ).rejects.toThrow('Content Gate viewer was not found.');
    },
  );

  it('honors audience and Premium revocation on the next projection', async () => {
    expect(
      (await delivery.project(documentJson(), 'premium-staff')).gates[0]
        .allowed,
    ).toBe(true);
    await pool.query(
      'DELETE FROM user_roles WHERE "userId"=$1 AND "roleId"=$2',
      ['premium-staff', 'staff'],
    );
    expect(
      (await delivery.project(documentJson(), 'premium-staff')).gates[0],
    ).toMatchObject({ allowed: false, unmet: ['GROUP'] });
    await pool.query(
      'INSERT INTO user_roles ("userId","roleId") VALUES ($1,$2)',
      ['premium-staff', 'staff'],
    );
    await memberships.revoke(
      premiumStaffMembershipId,
      'author',
      'Fixture revocation',
      new Date(),
    );
    expect(
      (await delivery.project(documentJson(), 'premium-staff')).gates[0],
    ).toMatchObject({ allowed: false, unmet: ['REPUTATION'] });
  });

  it('denies missing viewers and redacts guest payloads', async () => {
    await expect(statistics.read('missing', new Date())).resolves.toBeNull();
    expect(
      (await delivery.project(documentJson(), null)).documentJson,
    ).not.toContain('Restricted staff payload');
  });
});
