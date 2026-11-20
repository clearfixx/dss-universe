export { ForumModule } from './forum.module';
export { ForumFactsModule } from './forum-facts.module';
export {
  FORUM_NEWS_FACTS,
  type ForumNewsFacts,
  type ForumNewsFactsReader,
} from './contracts/forum-news-facts.contract';
export {
  FORUM_TOPIC_COUNTS,
  type ForumTopicCounts,
} from './contracts/forum-topic-counts.contract';
export {
  FORUM_ACCOUNT_EVIDENCE,
  type ForumAccountEvidence,
  type ForumAccountEvidenceReader,
} from './contracts/forum-account-evidence.contract';
export {
  FORUM_INTERACTION_DECISIONS,
  FORUM_TOPIC_INTERACTION_KIND,
  type ForumInteractionDecisions,
} from './contracts/forum-interaction-decisions.contract';
export type {
  ForumVisibility,
  ForumViewerFacts,
} from './domain/types/forum-structure.type';
