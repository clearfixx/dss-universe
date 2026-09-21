export const SHARE_CHANNELS = [
  'FACEBOOK',
  'X',
  'THREADS',
  'INSTAGRAM',
  'PINTEREST',
  'COPY_LINK',
  'PRINT',
] as const;

export type ShareChannel = (typeof SHARE_CHANNELS)[number];

export type ShareChannelCount = { channel: ShareChannel; count: number };

export type AudienceEngagementResult = {
  changed: boolean;
  viewCount: number;
  shareCount: number;
  shares: ShareChannelCount[];
};
