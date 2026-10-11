/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/contracts/viewer-profile.contract.ts
 *
 * 🎯 Purpose:
 * Publishes the existing allowlisted viewer profile without ORM or secret fields.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
export type ViewerProfile = Readonly<{
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  bio: string | null;
  location: string | null;
  website: string | null;
  technologies: string[];
  interests: string[];
  avatarUrl: string | null;
  coverUrl: string | null;
  status: 'ACTIVE' | 'DEACTIVATED' | 'BANNED' | 'DELETED';
  emailVerifiedAt: Date | null;
  lastSeenAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}>;

export interface ViewerProfileReader {
  findById(subjectId: string): Promise<ViewerProfile | null>;
}
export const VIEWER_PROFILE_READER = Symbol('VIEWER_PROFILE_READER');
