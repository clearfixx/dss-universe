/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Identity Composition
 * 📄 File: apps/api/src/composition/identity/infrastructure/authoritative-request-access-reader.ts
 *
 * 🎯 Purpose:
 * Connects request authentication mechanics to current Authorization context.
 *
 * 🧠 Responsibilities:
 * • translates the opaque subject ID to the published access-read capability;
 * • returns only copied role and permission values for this request;
 * • propagates authority failures without using token claims as fallback.
 *
 * 🏗️ Architecture:
 * Root composition adapter implementing the Core Auth consumer-owned port.
 *
 * ⚠️ Important:
 * No positive cache. Auth feature services never receive IAM assignments.
 * Public legacy userId naming maps to the same opaque subject ID.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Inject, Injectable } from '@nestjs/common';
import type { RequestAccessReader } from '@api/core/auth';
import {
  SUBJECT_ACCESS_READER,
  type SubjectAccessReader,
} from '@api/core/authorization';

@Injectable()
export class AuthoritativeRequestAccessReader implements RequestAccessReader {
  constructor(
    @Inject(SUBJECT_ACCESS_READER) private readonly access: SubjectAccessReader,
  ) {}

  async readForSubject(subjectId: string) {
    const profile = await this.access.getAccessProfileByUserId(subjectId);
    return { roles: [...profile.roles], permissions: [...profile.permissions] };
  }
}
