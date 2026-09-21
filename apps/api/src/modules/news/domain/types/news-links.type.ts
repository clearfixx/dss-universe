export const NEWS_INTERNAL_LINK_TYPES = [
  'RELATED',
  'CONTEXTUAL',
  'SERIES',
] as const;
export type NewsInternalLinkType = (typeof NEWS_INTERNAL_LINK_TYPES)[number];

export type NewsInternalLink = {
  id: string;
  sourceArticleId: string;
  targetArticleId: string;
  type: NewsInternalLinkType;
  anchorText: string;
  position: number;
  createdById: string;
  createdAt: Date;
  target: {
    language: string;
    slug: string;
    title: string;
    shortText: string;
    coverMediaId: string | null;
    displayPublishedAt: Date;
  };
};

export type NewsChronologicalNeighbor = {
  id: string;
  language: string;
  slug: string;
  title: string;
  coverMediaId: string | null;
  displayPublishedAt: Date;
};

export type NewsChronologicalNavigation = {
  previous: NewsChronologicalNeighbor | null;
  next: NewsChronologicalNeighbor | null;
};
