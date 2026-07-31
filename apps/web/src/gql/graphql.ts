/* eslint-disable */
/** Internal type. DO NOT USE DIRECTLY. */
type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** Internal type. DO NOT USE DIRECTLY. */
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type ChangeEmailInput = {
  currentPassword: string;
  email: string;
};

export type ChangePasswordInput = {
  currentPassword: string;
  newPassword: string;
};

export type CreateWallPostInput = {
  body?: string | null | undefined;
  imageMediaId?: string | number | null | undefined;
  profileOwnerId: string | number;
};

export type DeactivateAccountInput = {
  password: string;
};

export type GiveReputationInput = {
  reason: string;
  recipientId: string | number;
  value: number;
};

export type LeaderboardInput = {
  limit?: number;
  page?: number;
  period?: LeaderboardPeriod;
};

export type LeaderboardPeriod =
  | 'ALL_TIME'
  | 'MONTH'
  | 'YEAR';

export type LoginInput = {
  email: string;
  password: string;
};

export type MediaKind =
  | 'ARCHIVE'
  | 'AUDIO'
  | 'DOCUMENT'
  | 'IMAGE'
  | 'OTHER'
  | 'VIDEO';

export type MediaLibraryInput = {
  after?: string | null | undefined;
  first?: number;
  kind?: MediaKind | null | undefined;
  orphaned?: boolean | null | undefined;
  ownerId?: string | null | undefined;
  search?: string | null | undefined;
  status?: MediaStatus | null | undefined;
  visibility?: MediaVisibility | null | undefined;
};

export type MediaStatus =
  | 'DELETED'
  | 'DELETING'
  | 'FAILED'
  | 'PENDING'
  | 'PROCESSING'
  | 'QUARANTINED'
  | 'READY'
  | 'REJECTED'
  | 'UPLOADING';

export type MediaVisibility =
  | 'AUTHENTICATED'
  | 'PRIVATE'
  | 'PUBLIC'
  | 'RESTRICTED';

export type MembersDirectoryInput = {
  limit?: number;
  onlineOnly?: boolean;
  page?: number;
  role?: string | null | undefined;
  search?: string | null | undefined;
  sort?: MembersDirectorySort;
};

export type MembersDirectorySort =
  | 'LAST_ACTIVE'
  | 'NEWEST'
  | 'OLDEST'
  | 'USERNAME_ASC'
  | 'USERNAME_DESC';

export type NotificationCategory =
  | 'COMMENTS_REPLIES'
  | 'DIRECT_MESSAGES'
  | 'MENTIONS'
  | 'PUBLISHING_REVIEW'
  | 'REPUTATION'
  | 'SUBSCRIPTIONS'
  | 'SUPPORT';

export type NotificationDigestFrequency =
  | 'DAILY'
  | 'OFF'
  | 'WEEKLY';

export type ProfileCompletionField =
  | 'AVATAR'
  | 'BIO'
  | 'COVER'
  | 'INTERESTS'
  | 'LOCATION'
  | 'SOCIAL_LINKS'
  | 'TECHNOLOGIES'
  | 'WEBSITE';

export type ProfileVisibility =
  | 'MEMBERS'
  | 'PRIVATE'
  | 'PUBLIC';

export type RegisterInput = {
  displayName: string;
  email: string;
  password: string;
  username: string;
};

export type UpdateNotificationPreferencesInput = {
  digestFrequency: NotificationDigestFrequency;
  emailCategories: Array<NotificationCategory>;
  emailEnabled: boolean;
  inAppCategories: Array<NotificationCategory>;
};

export type UpdateUserPrivacyInput = {
  allowFollowers: boolean;
  allowWallPosts: boolean;
  profileVisibility: ProfileVisibility;
  showFollows: boolean;
  showLastSeen: boolean;
  showLocation: boolean;
  showOnlineStatus: boolean;
  showSocialLinks: boolean;
  showWebsite: boolean;
};

export type UpdateViewerProfileInput = {
  bio?: string | null | undefined;
  displayName?: string | null | undefined;
  interests?: Array<string> | null | undefined;
  location?: string | null | undefined;
  technologies?: Array<string> | null | undefined;
  website?: string | null | undefined;
};

export type UsersPageInput = {
  limit?: number;
  page?: number;
};

export type ApiInfoQueryVariables = Exact<{ [key: string]: never; }>;


export type ApiInfoQuery = { apiInfo: { name: string, status: string, transport: string } };

export type LoginMutationVariables = Exact<{
  input: LoginInput;
}>;


export type LoginMutation = { login: { user: { id: string, username: string, displayName: string | null, email: string }, tokens: { accessToken: string, refreshToken: string } } };

export type RegisterMutationVariables = Exact<{
  input: RegisterInput;
}>;


export type RegisterMutation = { register: { user: { id: string, username: string, displayName: string | null, email: string }, tokens: { accessToken: string, refreshToken: string } } };

export type MediaLibraryQueryVariables = Exact<{
  input?: MediaLibraryInput | null | undefined;
}>;


export type MediaLibraryQuery = { mediaLibrary: { items: Array<{ id: string, ownerId: string | null, kind: MediaKind, status: MediaStatus, visibility: MediaVisibility, originalFilename: string, mimeType: string, extension: string, size: number, width: number | null, height: number | null, failureCode: string | null, createdAt: unknown, updatedAt: unknown }>, pageInfo: { hasNextPage: boolean, endCursor: string | null } }, mediaLibraryMetrics: { totalMedia: number, originalBytes: number, variantBytes: number, totalBytes: number, orphanedMedia: number, failedMedia: number, quarantinedMedia: number } };

export type RetryFailedMediaMutationVariables = Exact<{
  mediaId: string | number;
}>;


export type RetryFailedMediaMutation = { retryFailedMedia: { id: string, status: MediaStatus, failureCode: string | null, updatedAt: unknown } };

export type PublicProfileQueryVariables = Exact<{
  username: string;
}>;


export type PublicProfileQuery = { viewer: { id: string }, userByUsername: { id: string, username: string, displayName: string | null, bio: string | null, location: string | null, website: string | null, technologies: Array<string>, interests: Array<string>, avatarUrl: string | null, coverUrl: string | null, followerCount: number, followingCount: number, isFollowedByViewer: boolean, isOnline: boolean, lastSeenAt: string | null, createdAt: string, socialLinks: Array<{ id: string, platform: string, label: string | null, url: string, position: number }> } };

export type ProfileWallQueryVariables = Exact<{
  profileOwnerId: string | number;
  pagination?: UsersPageInput | null | undefined;
}>;


export type ProfileWallQuery = { profileWall: { total: number, page: number, limit: number, totalPages: number, items: Array<{ id: string, interactionTargetId: string, profileOwnerId: string, authorId: string, body: string | null, imageMediaId: string | null, isDeleted: boolean, deletedAt: string | null, createdAt: string, updatedAt: string }> } };

export type UserActivityQueryVariables = Exact<{
  userId: string | number;
  pagination?: UsersPageInput | null | undefined;
}>;


export type UserActivityQuery = { userActivity: { total: number, page: number, limit: number, totalPages: number, items: Array<{ id: string, actorId: string, module: string, action: string, subjectType: string, subjectId: string, occurredAt: string }> } };

export type ProfileGamificationQueryVariables = Exact<{
  userId: string | number;
}>;


export type ProfileGamificationQuery = { levelProgress: { balance: number, currentLevel: number, currentThreshold: number, nextLevel: number | null, nextThreshold: number | null, pointsIntoLevel: number, pointsNeeded: number, progressPercent: number }, communityPointsHistory: { total: number, balance: number, items: Array<{ id: string, points: number, reason: string, ruleKey: string, occurredAt: unknown }> }, reputationHistory: { score: number, total: number, items: Array<{ id: string, value: number, reason: string, createdAt: unknown, actor: { id: string, username: string, displayName: string | null, avatarUrl: string | null } }> }, userAchievements: Array<{ id: string, awardedAt: unknown, reason: string, achievement: { id: string, key: string, name: string, description: string | null, color: string, badge: string } }>, userCustomTitles: Array<{ id: string, selected: boolean, grantedAt: unknown, grantReason: string, revokedAt: unknown, title: { id: string, name: string, description: string | null, color: string, badge: string, isActive: boolean } }> };

export type MembersDirectoryQueryVariables = Exact<{
  input?: MembersDirectoryInput | null | undefined;
  leaderboardInput?: LeaderboardInput | null | undefined;
}>;


export type MembersDirectoryQuery = { members: { total: number, page: number, limit: number, totalPages: number, items: Array<{ id: string, username: string, displayName: string | null, avatarUrl: string | null, isOnline: boolean, roles: Array<string>, createdAt: string }> }, presenceSummary: { onlineMembers: number, onlineGuests: number, onlineCrawlers: number, totalOnline: number, sampledAt: unknown }, leaderboard: { period: LeaderboardPeriod, startsAt: string | null, endsAt: string, generatedAt: string, total: number, viewerRank: number | null, viewerCommunityPoints: number | null, items: Array<{ rank: number, userId: string, username: string, displayName: string | null, avatarUrl: string | null, communityPoints: number, currentLevel: number, reputation: number, selectedTitle: { name: string, color: string, badge: string } | null }> } };

export type ProfileSettingsQueryVariables = Exact<{ [key: string]: never; }>;


export type ProfileSettingsQuery = { viewer: { id: string, username: string, displayName: string | null, email: string, bio: string | null, location: string | null, website: string | null, technologies: Array<string>, interests: Array<string>, avatarUrl: string | null, coverUrl: string | null, createdAt: string, socialLinks: Array<{ id: string, platform: string, label: string | null, url: string, position: number }> }, viewerPrivacySettings: { profileVisibility: ProfileVisibility, showLocation: boolean, showWebsite: boolean, showSocialLinks: boolean, showLastSeen: boolean, showOnlineStatus: boolean, allowFollowers: boolean, showFollows: boolean, allowWallPosts: boolean }, viewerProfileCompletion: { percentage: number, completedCount: number, totalCount: number, isComplete: boolean, completedFields: Array<ProfileCompletionField>, missingFields: Array<ProfileCompletionField> }, viewerSessions: Array<{ id: string, current: boolean, userAgent: string | null, ipAddress: string | null, createdAt: unknown, expiresAt: unknown }>, viewerNotificationPreferences: { inAppCategories: Array<NotificationCategory>, emailEnabled: boolean, emailCategories: Array<NotificationCategory>, digestFrequency: NotificationDigestFrequency } };

export type FollowProfileMutationVariables = Exact<{
  userId: string | number;
}>;


export type FollowProfileMutation = { followUser: { userId: string, followerCount: number, followingCount: number } };

export type UnfollowProfileMutationVariables = Exact<{
  userId: string | number;
}>;


export type UnfollowProfileMutation = { unfollowUser: { userId: string, followerCount: number, followingCount: number } };

export type GiveProfileReputationMutationVariables = Exact<{
  input: GiveReputationInput;
}>;


export type GiveProfileReputationMutation = { giveReputation: { id: string, recipientId: string, value: number, reason: string, createdAt: unknown } };

export type SelectViewerCustomTitleMutationVariables = Exact<{
  grantId: string | number;
}>;


export type SelectViewerCustomTitleMutation = { selectCustomTitle: { id: string, selected: boolean, title: { id: string, name: string, color: string, badge: string } } };

export type CreateProfileWallPostMutationVariables = Exact<{
  input: CreateWallPostInput;
}>;


export type CreateProfileWallPostMutation = { createProfileWallPost: { id: string, interactionTargetId: string, profileOwnerId: string, authorId: string, body: string | null, imageMediaId: string | null, isDeleted: boolean, createdAt: string, updatedAt: string } };

export type RemoveProfileWallPostMutationVariables = Exact<{
  postId: string | number;
  reason?: string | null | undefined;
}>;


export type RemoveProfileWallPostMutation = { removeProfileWallPost: { id: string, isDeleted: boolean, deletedAt: string | null } };

export type UpdateViewerProfileSettingsMutationVariables = Exact<{
  input: UpdateViewerProfileInput;
}>;


export type UpdateViewerProfileSettingsMutation = { updateViewerProfile: { id: string, username: string, displayName: string | null, bio: string | null, location: string | null, website: string | null, technologies: Array<string>, interests: Array<string>, updatedAt: string } };

export type UpdateViewerPrivacySettingsMutationVariables = Exact<{
  input: UpdateUserPrivacyInput;
}>;


export type UpdateViewerPrivacySettingsMutation = { updateViewerPrivacy: { profileVisibility: ProfileVisibility, showLocation: boolean, showWebsite: boolean, showSocialLinks: boolean, showLastSeen: boolean, showOnlineStatus: boolean, allowFollowers: boolean, showFollows: boolean, allowWallPosts: boolean } };

export type UpdateViewerNotificationSettingsMutationVariables = Exact<{
  input: UpdateNotificationPreferencesInput;
}>;


export type UpdateViewerNotificationSettingsMutation = { updateViewerNotificationPreferences: { inAppCategories: Array<NotificationCategory>, emailEnabled: boolean, emailCategories: Array<NotificationCategory>, digestFrequency: NotificationDigestFrequency } };

export type RevokeViewerDeviceSessionMutationVariables = Exact<{
  sessionId: string | number;
}>;


export type RevokeViewerDeviceSessionMutation = { revokeViewerSession: { success: boolean } };

export type RevokeOtherViewerDeviceSessionsMutationVariables = Exact<{ [key: string]: never; }>;


export type RevokeOtherViewerDeviceSessionsMutation = { revokeOtherViewerSessions: { success: boolean, revokedCount: number } };

export type ChangeViewerEmailMutationVariables = Exact<{
  input: ChangeEmailInput;
}>;


export type ChangeViewerEmailMutation = { changeViewerEmail: { success: boolean } };

export type ChangeViewerPasswordMutationVariables = Exact<{
  input: ChangePasswordInput;
}>;


export type ChangeViewerPasswordMutation = { changeViewerPassword: { success: boolean } };

export type DeactivateViewerAccountMutationVariables = Exact<{
  input: DeactivateAccountInput;
}>;


export type DeactivateViewerAccountMutation = { deactivateAccount: { success: boolean } };

export type SetViewerAvatarMutationVariables = Exact<{
  mediaId: string | number;
}>;


export type SetViewerAvatarMutation = { setViewerAvatar: { id: string, avatarUrl: string | null } };

export type RemoveViewerAvatarMutationVariables = Exact<{ [key: string]: never; }>;


export type RemoveViewerAvatarMutation = { removeViewerAvatar: { id: string, avatarUrl: string | null } };

export type SetViewerCoverMutationVariables = Exact<{
  mediaId: string | number;
}>;


export type SetViewerCoverMutation = { setViewerCover: { id: string, coverUrl: string | null } };

export type RemoveViewerCoverMutationVariables = Exact<{ [key: string]: never; }>;


export type RemoveViewerCoverMutation = { removeViewerCover: { id: string, coverUrl: string | null } };

export type ViewerQueryVariables = Exact<{ [key: string]: never; }>;


export type ViewerQuery = { viewer: { id: string, username: string, displayName: string | null, email: string, avatarUrl: string | null, status: string, createdAt: string } };


export const ApiInfoDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ApiInfo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"apiInfo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"transport"}}]}}]}}]} as unknown as DocumentNode<ApiInfoQuery, ApiInfoQueryVariables>;
export const LoginDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"Login"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"LoginInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"login"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"email"}}]}},{"kind":"Field","name":{"kind":"Name","value":"tokens"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"accessToken"}},{"kind":"Field","name":{"kind":"Name","value":"refreshToken"}}]}}]}}]}}]} as unknown as DocumentNode<LoginMutation, LoginMutationVariables>;
export const RegisterDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"Register"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"RegisterInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"register"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"user"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"email"}}]}},{"kind":"Field","name":{"kind":"Name","value":"tokens"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"accessToken"}},{"kind":"Field","name":{"kind":"Name","value":"refreshToken"}}]}}]}}]}}]} as unknown as DocumentNode<RegisterMutation, RegisterMutationVariables>;
export const MediaLibraryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"MediaLibrary"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"MediaLibraryInput"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"mediaLibrary"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"ownerId"}},{"kind":"Field","name":{"kind":"Name","value":"kind"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"visibility"}},{"kind":"Field","name":{"kind":"Name","value":"originalFilename"}},{"kind":"Field","name":{"kind":"Name","value":"mimeType"}},{"kind":"Field","name":{"kind":"Name","value":"extension"}},{"kind":"Field","name":{"kind":"Name","value":"size"}},{"kind":"Field","name":{"kind":"Name","value":"width"}},{"kind":"Field","name":{"kind":"Name","value":"height"}},{"kind":"Field","name":{"kind":"Name","value":"failureCode"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"pageInfo"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"hasNextPage"}},{"kind":"Field","name":{"kind":"Name","value":"endCursor"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"mediaLibraryMetrics"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"totalMedia"}},{"kind":"Field","name":{"kind":"Name","value":"originalBytes"}},{"kind":"Field","name":{"kind":"Name","value":"variantBytes"}},{"kind":"Field","name":{"kind":"Name","value":"totalBytes"}},{"kind":"Field","name":{"kind":"Name","value":"orphanedMedia"}},{"kind":"Field","name":{"kind":"Name","value":"failedMedia"}},{"kind":"Field","name":{"kind":"Name","value":"quarantinedMedia"}}]}}]}}]} as unknown as DocumentNode<MediaLibraryQuery, MediaLibraryQueryVariables>;
export const RetryFailedMediaDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RetryFailedMedia"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"mediaId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"retryFailedMedia"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"mediaId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"mediaId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"failureCode"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<RetryFailedMediaMutation, RetryFailedMediaMutationVariables>;
export const PublicProfileDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"PublicProfile"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"username"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"viewer"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}}]}},{"kind":"Field","name":{"kind":"Name","value":"userByUsername"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"username"},"value":{"kind":"Variable","name":{"kind":"Name","value":"username"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"bio"}},{"kind":"Field","name":{"kind":"Name","value":"location"}},{"kind":"Field","name":{"kind":"Name","value":"website"}},{"kind":"Field","name":{"kind":"Name","value":"technologies"}},{"kind":"Field","name":{"kind":"Name","value":"interests"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"coverUrl"}},{"kind":"Field","name":{"kind":"Name","value":"followerCount"}},{"kind":"Field","name":{"kind":"Name","value":"followingCount"}},{"kind":"Field","name":{"kind":"Name","value":"isFollowedByViewer"}},{"kind":"Field","name":{"kind":"Name","value":"isOnline"}},{"kind":"Field","name":{"kind":"Name","value":"lastSeenAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"socialLinks"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"platform"}},{"kind":"Field","name":{"kind":"Name","value":"label"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"position"}}]}}]}}]}}]} as unknown as DocumentNode<PublicProfileQuery, PublicProfileQueryVariables>;
export const ProfileWallDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ProfileWall"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"profileOwnerId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"pagination"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"UsersPageInput"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"profileWall"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"profileOwnerId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"profileOwnerId"}}},{"kind":"Argument","name":{"kind":"Name","value":"pagination"},"value":{"kind":"Variable","name":{"kind":"Name","value":"pagination"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"interactionTargetId"}},{"kind":"Field","name":{"kind":"Name","value":"profileOwnerId"}},{"kind":"Field","name":{"kind":"Name","value":"authorId"}},{"kind":"Field","name":{"kind":"Name","value":"body"}},{"kind":"Field","name":{"kind":"Name","value":"imageMediaId"}},{"kind":"Field","name":{"kind":"Name","value":"isDeleted"}},{"kind":"Field","name":{"kind":"Name","value":"deletedAt"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"total"}},{"kind":"Field","name":{"kind":"Name","value":"page"}},{"kind":"Field","name":{"kind":"Name","value":"limit"}},{"kind":"Field","name":{"kind":"Name","value":"totalPages"}}]}}]}}]} as unknown as DocumentNode<ProfileWallQuery, ProfileWallQueryVariables>;
export const UserActivityDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"UserActivity"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"userId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"pagination"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"UsersPageInput"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"userActivity"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"userId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"userId"}}},{"kind":"Argument","name":{"kind":"Name","value":"pagination"},"value":{"kind":"Variable","name":{"kind":"Name","value":"pagination"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"actorId"}},{"kind":"Field","name":{"kind":"Name","value":"module"}},{"kind":"Field","name":{"kind":"Name","value":"action"}},{"kind":"Field","name":{"kind":"Name","value":"subjectType"}},{"kind":"Field","name":{"kind":"Name","value":"subjectId"}},{"kind":"Field","name":{"kind":"Name","value":"occurredAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"total"}},{"kind":"Field","name":{"kind":"Name","value":"page"}},{"kind":"Field","name":{"kind":"Name","value":"limit"}},{"kind":"Field","name":{"kind":"Name","value":"totalPages"}}]}}]}}]} as unknown as DocumentNode<UserActivityQuery, UserActivityQueryVariables>;
export const ProfileGamificationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ProfileGamification"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"userId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"levelProgress"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"userId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"userId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"balance"}},{"kind":"Field","name":{"kind":"Name","value":"currentLevel"}},{"kind":"Field","name":{"kind":"Name","value":"currentThreshold"}},{"kind":"Field","name":{"kind":"Name","value":"nextLevel"}},{"kind":"Field","name":{"kind":"Name","value":"nextThreshold"}},{"kind":"Field","name":{"kind":"Name","value":"pointsIntoLevel"}},{"kind":"Field","name":{"kind":"Name","value":"pointsNeeded"}},{"kind":"Field","name":{"kind":"Name","value":"progressPercent"}}]}},{"kind":"Field","name":{"kind":"Name","value":"communityPointsHistory"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"userId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"userId"}}},{"kind":"Argument","name":{"kind":"Name","value":"pagination"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"page"},"value":{"kind":"IntValue","value":"1"}},{"kind":"ObjectField","name":{"kind":"Name","value":"limit"},"value":{"kind":"IntValue","value":"5"}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"total"}},{"kind":"Field","name":{"kind":"Name","value":"balance"}},{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"points"}},{"kind":"Field","name":{"kind":"Name","value":"reason"}},{"kind":"Field","name":{"kind":"Name","value":"ruleKey"}},{"kind":"Field","name":{"kind":"Name","value":"occurredAt"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"reputationHistory"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"userId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"userId"}}},{"kind":"Argument","name":{"kind":"Name","value":"pagination"},"value":{"kind":"ObjectValue","fields":[{"kind":"ObjectField","name":{"kind":"Name","value":"page"},"value":{"kind":"IntValue","value":"1"}},{"kind":"ObjectField","name":{"kind":"Name","value":"limit"},"value":{"kind":"IntValue","value":"5"}}]}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"score"}},{"kind":"Field","name":{"kind":"Name","value":"total"}},{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"value"}},{"kind":"Field","name":{"kind":"Name","value":"reason"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"actor"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}}]}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"userAchievements"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"userId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"userId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"awardedAt"}},{"kind":"Field","name":{"kind":"Name","value":"reason"}},{"kind":"Field","name":{"kind":"Name","value":"achievement"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"key"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"badge"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"userCustomTitles"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"userId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"userId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"selected"}},{"kind":"Field","name":{"kind":"Name","value":"grantedAt"}},{"kind":"Field","name":{"kind":"Name","value":"grantReason"}},{"kind":"Field","name":{"kind":"Name","value":"revokedAt"}},{"kind":"Field","name":{"kind":"Name","value":"title"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"description"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"badge"}},{"kind":"Field","name":{"kind":"Name","value":"isActive"}}]}}]}}]}}]} as unknown as DocumentNode<ProfileGamificationQuery, ProfileGamificationQueryVariables>;
export const MembersDirectoryDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"MembersDirectory"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"MembersDirectoryInput"}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"leaderboardInput"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"LeaderboardInput"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"members"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"isOnline"}},{"kind":"Field","name":{"kind":"Name","value":"roles"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"total"}},{"kind":"Field","name":{"kind":"Name","value":"page"}},{"kind":"Field","name":{"kind":"Name","value":"limit"}},{"kind":"Field","name":{"kind":"Name","value":"totalPages"}}]}},{"kind":"Field","name":{"kind":"Name","value":"presenceSummary"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"onlineMembers"}},{"kind":"Field","name":{"kind":"Name","value":"onlineGuests"}},{"kind":"Field","name":{"kind":"Name","value":"onlineCrawlers"}},{"kind":"Field","name":{"kind":"Name","value":"totalOnline"}},{"kind":"Field","name":{"kind":"Name","value":"sampledAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"leaderboard"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"leaderboardInput"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"period"}},{"kind":"Field","name":{"kind":"Name","value":"startsAt"}},{"kind":"Field","name":{"kind":"Name","value":"endsAt"}},{"kind":"Field","name":{"kind":"Name","value":"generatedAt"}},{"kind":"Field","name":{"kind":"Name","value":"total"}},{"kind":"Field","name":{"kind":"Name","value":"viewerRank"}},{"kind":"Field","name":{"kind":"Name","value":"viewerCommunityPoints"}},{"kind":"Field","name":{"kind":"Name","value":"items"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"rank"}},{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"communityPoints"}},{"kind":"Field","name":{"kind":"Name","value":"currentLevel"}},{"kind":"Field","name":{"kind":"Name","value":"reputation"}},{"kind":"Field","name":{"kind":"Name","value":"selectedTitle"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"badge"}}]}}]}}]}}]}}]} as unknown as DocumentNode<MembersDirectoryQuery, MembersDirectoryQueryVariables>;
export const ProfileSettingsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"ProfileSettings"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"viewer"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"bio"}},{"kind":"Field","name":{"kind":"Name","value":"location"}},{"kind":"Field","name":{"kind":"Name","value":"website"}},{"kind":"Field","name":{"kind":"Name","value":"technologies"}},{"kind":"Field","name":{"kind":"Name","value":"interests"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"coverUrl"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"socialLinks"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"platform"}},{"kind":"Field","name":{"kind":"Name","value":"label"}},{"kind":"Field","name":{"kind":"Name","value":"url"}},{"kind":"Field","name":{"kind":"Name","value":"position"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"viewerPrivacySettings"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"profileVisibility"}},{"kind":"Field","name":{"kind":"Name","value":"showLocation"}},{"kind":"Field","name":{"kind":"Name","value":"showWebsite"}},{"kind":"Field","name":{"kind":"Name","value":"showSocialLinks"}},{"kind":"Field","name":{"kind":"Name","value":"showLastSeen"}},{"kind":"Field","name":{"kind":"Name","value":"showOnlineStatus"}},{"kind":"Field","name":{"kind":"Name","value":"allowFollowers"}},{"kind":"Field","name":{"kind":"Name","value":"showFollows"}},{"kind":"Field","name":{"kind":"Name","value":"allowWallPosts"}}]}},{"kind":"Field","name":{"kind":"Name","value":"viewerProfileCompletion"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"percentage"}},{"kind":"Field","name":{"kind":"Name","value":"completedCount"}},{"kind":"Field","name":{"kind":"Name","value":"totalCount"}},{"kind":"Field","name":{"kind":"Name","value":"isComplete"}},{"kind":"Field","name":{"kind":"Name","value":"completedFields"}},{"kind":"Field","name":{"kind":"Name","value":"missingFields"}}]}},{"kind":"Field","name":{"kind":"Name","value":"viewerSessions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"current"}},{"kind":"Field","name":{"kind":"Name","value":"userAgent"}},{"kind":"Field","name":{"kind":"Name","value":"ipAddress"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"expiresAt"}}]}},{"kind":"Field","name":{"kind":"Name","value":"viewerNotificationPreferences"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"inAppCategories"}},{"kind":"Field","name":{"kind":"Name","value":"emailEnabled"}},{"kind":"Field","name":{"kind":"Name","value":"emailCategories"}},{"kind":"Field","name":{"kind":"Name","value":"digestFrequency"}}]}}]}}]} as unknown as DocumentNode<ProfileSettingsQuery, ProfileSettingsQueryVariables>;
export const FollowProfileDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"FollowProfile"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"userId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"followUser"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"userId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"userId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"followerCount"}},{"kind":"Field","name":{"kind":"Name","value":"followingCount"}}]}}]}}]} as unknown as DocumentNode<FollowProfileMutation, FollowProfileMutationVariables>;
export const UnfollowProfileDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UnfollowProfile"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"userId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"unfollowUser"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"userId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"userId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"userId"}},{"kind":"Field","name":{"kind":"Name","value":"followerCount"}},{"kind":"Field","name":{"kind":"Name","value":"followingCount"}}]}}]}}]} as unknown as DocumentNode<UnfollowProfileMutation, UnfollowProfileMutationVariables>;
export const GiveProfileReputationDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"GiveProfileReputation"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"GiveReputationInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"giveReputation"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"recipientId"}},{"kind":"Field","name":{"kind":"Name","value":"value"}},{"kind":"Field","name":{"kind":"Name","value":"reason"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]} as unknown as DocumentNode<GiveProfileReputationMutation, GiveProfileReputationMutationVariables>;
export const SelectViewerCustomTitleDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SelectViewerCustomTitle"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"grantId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"selectCustomTitle"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"grantId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"grantId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"selected"}},{"kind":"Field","name":{"kind":"Name","value":"title"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"color"}},{"kind":"Field","name":{"kind":"Name","value":"badge"}}]}}]}}]}}]} as unknown as DocumentNode<SelectViewerCustomTitleMutation, SelectViewerCustomTitleMutationVariables>;
export const CreateProfileWallPostDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"CreateProfileWallPost"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"CreateWallPostInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createProfileWallPost"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"interactionTargetId"}},{"kind":"Field","name":{"kind":"Name","value":"profileOwnerId"}},{"kind":"Field","name":{"kind":"Name","value":"authorId"}},{"kind":"Field","name":{"kind":"Name","value":"body"}},{"kind":"Field","name":{"kind":"Name","value":"imageMediaId"}},{"kind":"Field","name":{"kind":"Name","value":"isDeleted"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<CreateProfileWallPostMutation, CreateProfileWallPostMutationVariables>;
export const RemoveProfileWallPostDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RemoveProfileWallPost"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"postId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}},{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"reason"}},"type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"removeProfileWallPost"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"postId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"postId"}}},{"kind":"Argument","name":{"kind":"Name","value":"reason"},"value":{"kind":"Variable","name":{"kind":"Name","value":"reason"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"isDeleted"}},{"kind":"Field","name":{"kind":"Name","value":"deletedAt"}}]}}]}}]} as unknown as DocumentNode<RemoveProfileWallPostMutation, RemoveProfileWallPostMutationVariables>;
export const UpdateViewerProfileSettingsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateViewerProfileSettings"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateViewerProfileInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateViewerProfile"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"bio"}},{"kind":"Field","name":{"kind":"Name","value":"location"}},{"kind":"Field","name":{"kind":"Name","value":"website"}},{"kind":"Field","name":{"kind":"Name","value":"technologies"}},{"kind":"Field","name":{"kind":"Name","value":"interests"}},{"kind":"Field","name":{"kind":"Name","value":"updatedAt"}}]}}]}}]} as unknown as DocumentNode<UpdateViewerProfileSettingsMutation, UpdateViewerProfileSettingsMutationVariables>;
export const UpdateViewerPrivacySettingsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateViewerPrivacySettings"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateUserPrivacyInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateViewerPrivacy"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"profileVisibility"}},{"kind":"Field","name":{"kind":"Name","value":"showLocation"}},{"kind":"Field","name":{"kind":"Name","value":"showWebsite"}},{"kind":"Field","name":{"kind":"Name","value":"showSocialLinks"}},{"kind":"Field","name":{"kind":"Name","value":"showLastSeen"}},{"kind":"Field","name":{"kind":"Name","value":"showOnlineStatus"}},{"kind":"Field","name":{"kind":"Name","value":"allowFollowers"}},{"kind":"Field","name":{"kind":"Name","value":"showFollows"}},{"kind":"Field","name":{"kind":"Name","value":"allowWallPosts"}}]}}]}}]} as unknown as DocumentNode<UpdateViewerPrivacySettingsMutation, UpdateViewerPrivacySettingsMutationVariables>;
export const UpdateViewerNotificationSettingsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateViewerNotificationSettings"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"UpdateNotificationPreferencesInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateViewerNotificationPreferences"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"inAppCategories"}},{"kind":"Field","name":{"kind":"Name","value":"emailEnabled"}},{"kind":"Field","name":{"kind":"Name","value":"emailCategories"}},{"kind":"Field","name":{"kind":"Name","value":"digestFrequency"}}]}}]}}]} as unknown as DocumentNode<UpdateViewerNotificationSettingsMutation, UpdateViewerNotificationSettingsMutationVariables>;
export const RevokeViewerDeviceSessionDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RevokeViewerDeviceSession"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"sessionId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"revokeViewerSession"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"sessionId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"sessionId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}}]}}]}}]} as unknown as DocumentNode<RevokeViewerDeviceSessionMutation, RevokeViewerDeviceSessionMutationVariables>;
export const RevokeOtherViewerDeviceSessionsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RevokeOtherViewerDeviceSessions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"revokeOtherViewerSessions"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}},{"kind":"Field","name":{"kind":"Name","value":"revokedCount"}}]}}]}}]} as unknown as DocumentNode<RevokeOtherViewerDeviceSessionsMutation, RevokeOtherViewerDeviceSessionsMutationVariables>;
export const ChangeViewerEmailDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ChangeViewerEmail"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ChangeEmailInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"changeViewerEmail"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}}]}}]}}]} as unknown as DocumentNode<ChangeViewerEmailMutation, ChangeViewerEmailMutationVariables>;
export const ChangeViewerPasswordDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"ChangeViewerPassword"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ChangePasswordInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"changeViewerPassword"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}}]}}]}}]} as unknown as DocumentNode<ChangeViewerPasswordMutation, ChangeViewerPasswordMutationVariables>;
export const DeactivateViewerAccountDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"DeactivateViewerAccount"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"DeactivateAccountInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"deactivateAccount"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"success"}}]}}]}}]} as unknown as DocumentNode<DeactivateViewerAccountMutation, DeactivateViewerAccountMutationVariables>;
export const SetViewerAvatarDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SetViewerAvatar"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"mediaId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"setViewerAvatar"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"mediaId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"mediaId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}}]}}]}}]} as unknown as DocumentNode<SetViewerAvatarMutation, SetViewerAvatarMutationVariables>;
export const RemoveViewerAvatarDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RemoveViewerAvatar"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"removeViewerAvatar"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}}]}}]}}]} as unknown as DocumentNode<RemoveViewerAvatarMutation, RemoveViewerAvatarMutationVariables>;
export const SetViewerCoverDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SetViewerCover"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"mediaId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"setViewerCover"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"mediaId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"mediaId"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"coverUrl"}}]}}]}}]} as unknown as DocumentNode<SetViewerCoverMutation, SetViewerCoverMutationVariables>;
export const RemoveViewerCoverDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"RemoveViewerCover"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"removeViewerCover"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"coverUrl"}}]}}]}}]} as unknown as DocumentNode<RemoveViewerCoverMutation, RemoveViewerCoverMutationVariables>;
export const ViewerDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"Viewer"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"viewer"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"username"}},{"kind":"Field","name":{"kind":"Name","value":"displayName"}},{"kind":"Field","name":{"kind":"Name","value":"email"}},{"kind":"Field","name":{"kind":"Name","value":"avatarUrl"}},{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"createdAt"}}]}}]}}]} as unknown as DocumentNode<ViewerQuery, ViewerQueryVariables>;