/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Profile Frontend
 * 📄 File: apps/web/src/features/profile/profile-actions.ts
 *
 * 🎯 Purpose:
 * Executes authenticated profile mutations without exposing access tokens to
 * client components.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import {
  ChangeViewerEmailDocument,
  ChangeViewerPasswordDocument,
  CreateProfileWallPostDocument,
  DeactivateViewerAccountDocument,
  FollowProfileDocument,
  RemoveViewerAvatarDocument,
  RemoveViewerCoverDocument,
  RevokeOtherViewerDeviceSessionsDocument,
  RevokeViewerDeviceSessionDocument,
  SetViewerAvatarDocument,
  SetViewerCoverDocument,
  UnfollowProfileDocument,
  UpdateViewerNotificationSettingsDocument,
  UpdateViewerPrivacySettingsDocument,
  UpdateViewerProfileSettingsDocument,
  type NotificationCategory,
  type NotificationDigestFrequency,
  type ProfileVisibility,
} from "@/gql/graphql";
import { getClient } from "@/lib/apollo/rsc-client";

async function context() {
  const token = (await cookies()).get("dss_access_token")?.value;
  if (!token) throw new Error("Authentication required.");
  return { headers: { authorization: `Bearer ${token}` } };
}

function cleanList(value: FormDataEntryValue | null): string[] {
  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function setProfileFollowState(
  userId: string,
  username: string,
  following: boolean,
): Promise<void> {
  await getClient().mutate({
    mutation: following ? UnfollowProfileDocument : FollowProfileDocument,
    variables: { userId },
    context: await context(),
  });
  revalidatePath(`/profile/${username}`);
}

export async function createWallPost(
  profileOwnerId: string,
  username: string,
  formData: FormData,
): Promise<void> {
  const body = String(formData.get("body") ?? "").trim();
  const imageMediaId = String(formData.get("imageMediaId") ?? "").trim();
  if (!body && !imageMediaId) {
    throw new Error("Додайте текст або зображення.");
  }
  await getClient().mutate({
    mutation: CreateProfileWallPostDocument,
    variables: {
      input: {
        profileOwnerId,
        body: body || null,
        imageMediaId: imageMediaId || null,
      },
    },
    context: await context(),
  });
  revalidatePath(`/profile/${username}`);
}

export async function updateProfileSettings(formData: FormData): Promise<void> {
  await getClient().mutate({
    mutation: UpdateViewerProfileSettingsDocument,
    variables: {
      input: {
        displayName: String(formData.get("displayName") ?? "").trim() || null,
        bio: String(formData.get("bio") ?? "").trim() || null,
        location: String(formData.get("location") ?? "").trim() || null,
        website: String(formData.get("website") ?? "").trim() || null,
        technologies: cleanList(formData.get("technologies")),
        interests: cleanList(formData.get("interests")),
      },
    },
    context: await context(),
  });
  revalidatePath("/settings/profile");
}

const privacyKeys = [
  "showLocation",
  "showWebsite",
  "showSocialLinks",
  "showLastSeen",
  "showOnlineStatus",
  "allowFollowers",
  "showFollows",
  "allowWallPosts",
] as const;

export async function updatePrivacySettings(formData: FormData): Promise<void> {
  const switches = Object.fromEntries(
    privacyKeys.map((key) => [key, formData.get(key) === "on"]),
  ) as Record<(typeof privacyKeys)[number], boolean>;
  await getClient().mutate({
    mutation: UpdateViewerPrivacySettingsDocument,
    variables: {
      input: {
        ...switches,
        profileVisibility: String(
          formData.get("profileVisibility") ?? "PUBLIC",
        ) as ProfileVisibility,
      },
    },
    context: await context(),
  });
  revalidatePath("/settings/profile");
}

export async function updateNotificationSettings(
  formData: FormData,
): Promise<void> {
  const categories = formData
    .getAll("categories")
    .map(String) as NotificationCategory[];
  await getClient().mutate({
    mutation: UpdateViewerNotificationSettingsDocument,
    variables: {
      input: {
        inAppCategories: categories,
        emailEnabled: formData.get("emailEnabled") === "on",
        emailCategories: categories,
        digestFrequency: String(
          formData.get("digestFrequency") ?? "OFF",
        ) as NotificationDigestFrequency,
      },
    },
    context: await context(),
  });
  revalidatePath("/settings/profile");
}

export async function revokeSession(sessionId: string): Promise<void> {
  await getClient().mutate({
    mutation: RevokeViewerDeviceSessionDocument,
    variables: { sessionId },
    context: await context(),
  });
  revalidatePath("/settings/profile");
}

export async function revokeOtherSessions(): Promise<void> {
  await getClient().mutate({
    mutation: RevokeOtherViewerDeviceSessionsDocument,
    context: await context(),
  });
  revalidatePath("/settings/profile");
}

export async function updateViewerMedia(
  kind: "avatar" | "cover",
  formData: FormData,
): Promise<void> {
  const mediaId = String(formData.get("mediaId") ?? "").trim();
  if (!mediaId) throw new Error("Media ID is required.");
  await getClient().mutate({
    mutation:
      kind === "avatar" ? SetViewerAvatarDocument : SetViewerCoverDocument,
    variables: { mediaId },
    context: await context(),
  });
  revalidatePath("/settings/profile");
}

export async function removeViewerMedia(
  kind: "avatar" | "cover",
): Promise<void> {
  await getClient().mutate({
    mutation:
      kind === "avatar"
        ? RemoveViewerAvatarDocument
        : RemoveViewerCoverDocument,
    context: await context(),
  });
  revalidatePath("/settings/profile");
}

export async function changeViewerEmail(formData: FormData): Promise<void> {
  await getClient().mutate({
    mutation: ChangeViewerEmailDocument,
    variables: {
      input: {
        email: String(formData.get("email") ?? "").trim(),
        currentPassword: String(formData.get("currentPassword") ?? ""),
      },
    },
    context: await context(),
  });
  (await cookies()).delete("dss_access_token");
}

export async function changeViewerPassword(formData: FormData): Promise<void> {
  await getClient().mutate({
    mutation: ChangeViewerPasswordDocument,
    variables: {
      input: {
        currentPassword: String(formData.get("currentPassword") ?? ""),
        newPassword: String(formData.get("newPassword") ?? ""),
      },
    },
    context: await context(),
  });
  (await cookies()).delete("dss_access_token");
}

export async function deactivateViewerAccount(
  formData: FormData,
): Promise<void> {
  await getClient().mutate({
    mutation: DeactivateViewerAccountDocument,
    variables: {
      input: { password: String(formData.get("password") ?? "") },
    },
    context: await context(),
  });
  (await cookies()).delete("dss_access_token");
}

/**
 * 🔐 The browser asks for a mission. The server carries the clearance.
 */
