export const RESEARCH_SEARCH_SOURCE = Symbol('RESEARCH_SEARCH_SOURCE');
export interface ResearchSearchSource {
  search(query: {
    term: string;
    page: number;
    pageSize: number;
    viewerId?: string;
  }): Promise<{
    items: Array<{
      id: string;
      revisionId: string;
      kind: string;
      language: string;
      slug: string;
      title: string;
      excerpt: string;
      publishedAt: Date;
    }>;
    total: number;
    categories: Array<{ slug: string; total: number }>;
  }>;
}
