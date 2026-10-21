/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: IAM User Access
 * 📄 File: apps/api/src/modules/iam/infrastructure/repositories/prisma-subject-access.repository.ts
 *
 * 🎯 Purpose:
 * Persists IAM assignments without exposing profile data or ORM relation shapes.
 *
 * 🧠 Responsibilities:
 * • delegates subject existence and safe assignments through semantic inputs;
 * • checks owned role and permission existence;
 * • applies ordinary role grants and direct permission mutations.
 *
 * 🏗️ Architecture:
 * Private IAM adapter; root assembles Auth anchors and IAM-owned read facts.
 *
 * ⚠️ Important:
 * No role revocation here: its dedicated locked capability owns final-holder safety.
 * Existing separate check/write/read sequencing and audit policy are preserved.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '@api/core/database';
import {
  IAM_SUBJECT_EXISTENCE_READER,
  type IamSubjectExistenceReader,
} from '../../contracts/subject-existence-reader.contract';
import {
  IAM_ASSIGNMENT_READER,
  type IamAssignmentReader,
} from '../../contracts/assignment-reader.contract';
import type { SubjectAccessRepository } from '../../user-access/contracts/subject-access.repository.interface';
import type { SubjectAccessAssignments } from '../../user-access/types/subject-access-assignments.type';

@Injectable()
export class PrismaSubjectAccessRepository implements SubjectAccessRepository {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(IAM_SUBJECT_EXISTENCE_READER)
    private readonly subjects: IamSubjectExistenceReader,
    @Inject(IAM_ASSIGNMENT_READER)
    private readonly assignments: IamAssignmentReader,
  ) {}
  async findAssignments(
    userId: string,
  ): Promise<SubjectAccessAssignments | null> {
    return this.assignments.find(userId);
  }
  async subjectExists(id: string): Promise<boolean> {
    return this.subjects.exists(id);
  }
  async roleExists(id: string): Promise<boolean> {
    return (
      (await this.prisma.role.findUnique({
        where: { id },
        select: { id: true },
      })) !== null
    );
  }
  async permissionExists(id: string): Promise<boolean> {
    return (
      (await this.prisma.permission.findUnique({
        where: { id },
        select: { id: true },
      })) !== null
    );
  }
  async hasRole(userId: string, roleId: string): Promise<boolean> {
    return (
      (await this.prisma.userRole.findUnique({
        where: { userId_roleId: { userId, roleId } },
        select: { userId: true },
      })) !== null
    );
  }
  async grantRole(userId: string, roleId: string): Promise<void> {
    await this.prisma.userRole.create({
      data: { userId, roleId },
      select: { userId: true },
    });
  }
  async hasDirectPermission(
    userId: string,
    permissionId: string,
  ): Promise<boolean> {
    return (
      (await this.prisma.userPermission.findUnique({
        where: { userId_permissionId: { userId, permissionId } },
        select: { userId: true },
      })) !== null
    );
  }
  async grantPermission(userId: string, permissionId: string): Promise<void> {
    await this.prisma.userPermission.create({
      data: { userId, permissionId },
      select: { userId: true },
    });
  }
  async revokePermission(userId: string, permissionId: string): Promise<void> {
    await this.prisma.userPermission.delete({
      where: { userId_permissionId: { userId, permissionId } },
      select: { userId: true },
    });
  }
}
