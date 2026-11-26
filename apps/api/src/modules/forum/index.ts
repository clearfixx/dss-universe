export { ForumModule } from './forum.module';
export { ForumFactsModule } from './forum-facts.module';
export {
  FORUM_SEARCH_SOURCE,
  type ForumSearchHit,
  type ForumSearchSource,
} from './contracts/forum-search-source.contract';
export {
  FORUM_POST_FACTS,
  type ForumPostFact,
  type ForumPostFactsReader,
} from './contracts/forum-post-facts.contract';
export {
  FORUM_SUBJECT_VISIBILITY,
  type ForumSubjectRef,
  type ForumSubjectVisibility,
} from './contracts/forum-subject-visibility.contract';
export {
  FORUM_NEWS_FACTS,
  type ForumNewsFacts,
  type ForumNewsFactsReader,
} from './contracts/forum-news-facts.contract';
export {
  FORUM_CONTRIBUTION_TOTALS,
  type ForumContributionTotals,
  type ForumContributionTotalsReader,
} from './contracts/forum-contribution-totals.contract';
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
export {
  FORUM_MEMBER_CARDS,
  type ForumMemberCard,
  type ForumMemberCardReader,
} from './contracts/forum-member-cards.contract';
export {
  FORUM_MEMBER_STATS,
  type ForumMemberStanding,
  type ForumMemberStatsReader,
} from './contracts/forum-member-stats.contract';
