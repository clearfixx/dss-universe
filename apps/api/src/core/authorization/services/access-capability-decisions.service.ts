/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Authorization
 * 📄 File: apps/api/src/core/authorization/services/access-capability-decisions.service.ts
 *
 * 🎯 Purpose:
 * Evaluates isolated Premium/Guardian and current group-management authority.
 *
 * 🧠 Responsibilities:
 * • separates typed group audiences from legacy system-role aliases;
 * • evaluates Premium and Knowledge Forge Guardian from current evidence;
 * • checks account eligibility before any privileged decision.
 *
 * 🏗️ Architecture:
 * Core authorization policy; reads owned ports wired by root composition.
 *
 * ⚠️ Important:
 * Groups never inflate generic permissions; future sanctions need a real policy.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Inject, Injectable } from '@nestjs/common';
import {
  ACCESS_MEMBERSHIPS_READER,
  SUBJECT_ELIGIBILITY_READER,
  type AccessMembershipsReader,
  type SubjectEligibilityReader,
} from '../contracts/access-memberships-reader.contract';
import {
  SUBJECT_ACCESS_READER,
  type SubjectAccessReader,
} from '../contracts/subject-access-reader.interface';
import type {
  AccessCapabilityDecisions,
  AudienceAccessFacts,
} from '../contracts/access-capability-decisions.contract';
@Injectable()
export class AccessCapabilityDecisionsService implements AccessCapabilityDecisions {
  constructor(
    @Inject(ACCESS_MEMBERSHIPS_READER)
    private readonly memberships: AccessMembershipsReader,
    @Inject(SUBJECT_ELIGIBILITY_READER)
    private readonly eligibility: SubjectEligibilityReader,
    @Inject(SUBJECT_ACCESS_READER) private readonly access: SubjectAccessReader,
  ) {}
  async audience(
    subjectId: string,
    at: Date,
  ): Promise<AudienceAccessFacts | null> {
    if (!(await this.eligibility.isEligible(subjectId))) return null;
    const [memberships, access] = await Promise.all([
      this.memberships.read(subjectId, at),
      this.access.getAccessProfileByUserId(subjectId),
    ]);
    return {
      // Bare role keys remain only for existing legacy GROUP rules; custom groups never impersonate them.
      groups: [
        ...new Set([
          ...access.roles.filter((key) => !/^(group|role):/i.test(key)),
          ...access.roles.map((key) => `role:${key}`),
          ...memberships.map(({ key }) => `group:${key}`),
        ]),
      ],
      premium: memberships.some(({ premium }) => premium),
    };
  }
  async hasKnowledgeForgeGuardian(
    subjectId: string,
    at: Date,
  ): Promise<boolean> {
    if (!(await this.eligibility.isEligible(subjectId))) return false;
    return (await this.memberships.read(subjectId, at)).some(
      (fact) =>
        !fact.premium && fact.capabilities.includes('KNOWLEDGE_FORGE_GUARDIAN'),
    );
  }
  async canManageGroups(subjectId: string): Promise<boolean> {
    if (!(await this.eligibility.isEligible(subjectId))) return false;
    return (
      await this.access.getAccessProfileByUserId(subjectId)
    ).permissions.includes('permissions.manage');
  }
}
