import type {
  AudienceEngagementResult,
  ShareChannel,
} from '../types/audience-engagement.type';

export const AUDIENCE_ENGAGEMENT_REPOSITORY = Symbol(
  'AUDIENCE_ENGAGEMENT_REPOSITORY',
);

export interface AudienceEngagementRepository {
  recordView(
    targetId: string,
    viewerKey: string,
    actorId?: string,
  ): Promise<AudienceEngagementResult>;
  recordShare(
    targetId: string,
    channel: ShareChannel,
    viewerKey: string,
    actorId?: string,
  ): Promise<AudienceEngagementResult>;
}
