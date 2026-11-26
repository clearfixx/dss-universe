/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Forum
 * 📄 File: apps/web/src/features/forum/forum-avatar.tsx
 *
 * 🎯 Purpose:
 * Small member avatar for forum lists: the uploaded picture, or the
 * member's initials on the brand gradient.
 *
 * ⚠️ Important:
 * Decorative only (empty alt); the name is always printed next to it.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { forumMemberName, type ForumMemberName } from "./forum-format";

export function forumInitials(name: string): string {
  return (
    name
      .split(/\s+/)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?"
  );
}

export function ForumAvatar({
  member,
  className = "size-8 text-[11px]",
}: {
  member: (ForumMemberName & { avatarUrl?: string | null }) | null | undefined;
  className?: string;
}) {
  if (member?.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={member.avatarUrl}
        alt=""
        className={`shrink-0 rounded-full object-cover ${className}`}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full bg-primary/25 text-violet-100 font-bold text-white ${className}`}
    >
      {forumInitials(forumMemberName(member))}
    </span>
  );
}
