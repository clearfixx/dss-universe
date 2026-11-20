export const NEWS_SEARCH_SOURCE = Symbol('NEWS_SEARCH_SOURCE');

export interface NewsSearchSource {
  searchArticles(query: {
    term: string;
    page: number;
    pageSize: number;
    viewerId?: string;
  }): Promise<{
    items: Array<{
      id: string;
      title: string;
      slug: string;
      language: string;
      excerpt: string;
      publishedAt: Date;
    }>;
    total: number;
    categories: Array<{ slug: string; total: number }>;
  }>;
}
