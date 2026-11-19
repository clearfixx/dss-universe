/**
 * DSS File Passport
 * File: apps/api/src/modules/research-lab/application/research-lab.commands.ts
 * Purpose: Transport-neutral RL-1 command and result contracts.
 */
import type {
  ResearchPageKind,
  ResearchProtectionLevel,
  ResearchVisibility,
} from '../domain/types/research-lab.type';

export type ResearchDraftContent = Readonly<{
  title: string;
  summary: string;
  proposedSlug: string;
  documentJson: string;
  metadata?: Readonly<Record<string, unknown>>;
  coverMediaId?: string | null;
}>;

export type CreateResearchDraft = ResearchDraftContent &
  Readonly<{
    actorId: string;
    kind?: ResearchPageKind;
    language?: string;
    protectionLevel?: ResearchProtectionLevel;
    visibility?: ResearchVisibility;
  }>;

export type SaveResearchDraft = ResearchDraftContent &
  Readonly<{
    actorId: string;
    pageId: string;
    expectedVersion: number;
  }>;

export type SubmitResearchDraft = Readonly<{
  actorId: string;
  pageId: string;
  expectedVersion: number;
  editSummary: string;
  policySnapshotHash: string;
  correlationId: string;
}>;

export type ReviewResearchRevision = Readonly<{
  actorId: string;
  pageId: string;
  revisionId: string;
  reason?: string;
  policySnapshotHash: string;
  correlationId: string;
}>;

export type ResearchDraftResult = Readonly<{
  pageId: string;
  draftId: string;
  version: number;
}>;

export type ResearchRevisionResult = Readonly<{
  pageId: string;
  revisionId: string;
  number: number;
  state: string;
}>;
