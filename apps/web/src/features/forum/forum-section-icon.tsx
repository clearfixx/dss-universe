/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Web Forum
 * 📄 File: apps/web/src/features/forum/forum-section-icon.tsx
 *
 * 🎯 Purpose:
 * Icon tile for forum categories and sections, as in the hub and section
 * mockups. Sections carry no icon in the API yet, so the icon is picked
 * from well-known words in the slug, with a speech-bubble fallback.
 *
 * ⚠️ Important:
 * Purely decorative; the section title is always rendered beside it.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */
import { createElement } from "react";
import {
  Briefcase,
  Code2,
  Coffee,
  FlaskConical,
  GraduationCap,
  Megaphone,
  MessagesSquare,
  Palette,
  Rocket,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react";

const ICONS: ReadonlyArray<[RegExp, LucideIcon]> = [
  [/news|announce|novyn|ogolosh/, Megaphone],
  [/academ|learn|course|navch/, GraduationCap],
  [/research|lab|experiment|doslid/, FlaskConical],
  [/project|proekt/, Rocket],
  [/\bai\b|ai-|ml|intellig/, Sparkles],
  [/career|job|kariera/, Briefcase],
  [/design|ui|ux/, Palette],
  [/offtop|lounge|chill|coffee/, Coffee],
  [/community|spilnot|members|dss/, Users],
  [/dev|code|web|next|react|nest|backend|frontend|tech|arch/, Code2],
];

export function forumSectionIcon(slug: string): LucideIcon {
  return ICONS.find(([pattern]) => pattern.test(slug))?.[1] ?? MessagesSquare;
}

export function ForumSectionIcon({
  slug,
  className = "size-11",
}: {
  slug: string;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-200 ${className}`}
    >
      {createElement(forumSectionIcon(slug), {
        className: "size-1/2",
        strokeWidth: 1.6,
      })}
    </span>
  );
}
