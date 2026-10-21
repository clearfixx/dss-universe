/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Users
 * 📄 File: apps/api/src/modules/users/domain/types/user-social-link.type.ts
 *
 * 🎯 Purpose:
 * Defines the normalized public social-link profile value.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

export type UserSocialLink = {
  id: string;
  userId: string;
  platform: string;
  label: string | null;
  url: string;
  position: number;
};

export type ReplaceUserSocialLink = {
  platform: string;
  label: string | null;
  url: string;
  position: number;
};
