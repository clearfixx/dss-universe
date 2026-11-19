export const RESEARCH_INTERACTION_DECISIONS = Symbol(
  'RESEARCH_INTERACTION_DECISIONS',
);
export interface ResearchInteractionDecisions {
  permits(
    pageId: string,
    targetId: string,
    viewerId: string | null,
    capability: 'READ' | 'COMMENT' | 'REACT' | 'BOOKMARK' | 'SHARE',
  ): Promise<boolean>;
}
