export {
  RESEARCH_LAB_AUTHORITY_DECISIONS,
  type ResearchLabAuthorityDecisions,
} from './contracts/research-lab-authority.contract';
export { ResearchLabModule } from './research-lab.module';
export type {
  CreateResearchDraft,
  SaveResearchDraft,
  SubmitResearchDraft,
  ReviewResearchRevision,
  ResearchPublicationCommand,
  RollbackResearchPage,
  ResearchDraftResult,
  ResearchRevisionResult,
} from './application/research-lab.commands';
export {
  ResearchLabCommandError,
  type ResearchLabCommandErrorCode,
} from './domain/errors/research-lab-command.error';
export {
  RESEARCH_INTERACTION_DECISIONS,
  type ResearchInteractionDecisions,
} from './contracts/research-interaction-decisions';
export {
  RESEARCH_SEARCH_SOURCE,
  type ResearchSearchSource,
} from './contracts/research-search-source';
