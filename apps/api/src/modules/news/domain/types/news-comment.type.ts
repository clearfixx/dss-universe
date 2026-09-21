export type NewsCommentItem = {
  id: string;
  reactionTargetId: string;
  parentId: string | null;
  body: string | null;
  documentJson: string | null;
  isDeleted: boolean;
  editedAt: Date | null;
  createdAt: Date;
  author: {
    id: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
  engagement: {
    upvotes: number;
    downvotes: number;
    score: number;
    viewerReaction: 'UPVOTE' | 'DOWNVOTE' | null;
  };
  children: NewsCommentItem[];
};

export type NewsCommentsPage = {
  items: NewsCommentItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};
