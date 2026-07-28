/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Profile Frontend
 * 📄 File: apps/web/src/features/profile/profile-view.tsx
 *
 * 🎯 Purpose:
 * Renders the privacy-aware social profile, wall and activity workspace.
 *
 * 🧠 Responsibilities:
 * • composes owner and visitor profile states;
 * • exposes follow and Profile Wall actions;
 * • keeps future gamification fields visibly deferred to Phase 8;
 * • presents responsive DSS profile navigation.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

"use client";

import {
  Activity,
  CalendarDays,
  Code2,
  ExternalLink,
  FileImage,
  Globe2,
  ImagePlus,
  MapPin,
  MessageSquare,
  MoreHorizontal,
  Orbit,
  Pencil,
  Radio,
  Rocket,
  Send,
  ShieldCheck,
  Sparkles,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useTransition } from "react";

import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type {
  ProfileWallQuery,
  PublicProfileQuery,
  UserActivityQuery,
} from "@/gql/graphql";
import { cn } from "@/lib/utils";
import { useProfileUiStore, type ProfileTab } from "@/stores/profile-ui.store";

import { createWallPost, setProfileFollowState } from "./profile-actions";

type Profile = PublicProfileQuery["userByUsername"];
type Wall = ProfileWallQuery["profileWall"] | undefined;
type ActivityPage = UserActivityQuery["userActivity"] | undefined;

type ProfileViewProps = {
  viewerId: string;
  profile: Profile;
  wall: Wall;
  activity: ActivityPage;
};

const tabs: Array<{ id: ProfileTab; label: string; icon: typeof Orbit }> = [
  { id: "overview", label: "Огляд", icon: Orbit },
  { id: "wall", label: "Стіна", icon: MessageSquare },
  { id: "activity", label: "Активність", icon: Activity },
  { id: "about", label: "Про користувача", icon: Sparkles },
];

function initials(profile: Profile): string {
  return (profile.displayName || profile.username)
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function shortDate(value: string): string {
  return new Date(value).toLocaleDateString("uk-UA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function activityLabel(action: string): string {
  const labels: Record<string, string> = {
    "users.profile-wall.post-created.v1": "Опублікував запис на стіні",
    "users.profile-wall.post-retracted.v1": "Видалив запис зі стіни",
  };
  return labels[action] ?? action.replaceAll(".", " ");
}

export function ProfileView({
  viewerId,
  profile,
  wall,
  activity,
}: ProfileViewProps) {
  const activeTab = useProfileUiStore((state) => state.activeTab);
  const setActiveTab = useProfileUiStore((state) => state.setActiveTab);
  const [pending, startTransition] = useTransition();
  const isOwner = viewerId === profile.id;

  function toggleFollow() {
    startTransition(async () => {
      await setProfileFollowState(
        profile.id,
        profile.username,
        profile.isFollowedByViewer,
      );
    });
  }

  const showWall = activeTab === "overview" || activeTab === "wall";
  const showActivity = activeTab === "overview" || activeTab === "activity";
  const showAbout = activeTab === "overview" || activeTab === "about";

  return (
    <div className="mx-auto max-w-[1560px] space-y-5">
      <section className="overflow-hidden rounded-2xl border border-white/10 bg-[#09111f] shadow-2xl shadow-violet-950/20">
        <div
          className="relative min-h-52 overflow-hidden border-b border-white/10 bg-cover bg-center"
          style={
            profile.coverUrl
              ? { backgroundImage: `url("${profile.coverUrl}")` }
              : undefined
          }
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_60%_20%,rgba(124,58,237,.52),transparent_25rem),radial-gradient(circle_at_85%_50%,rgba(37,99,235,.35),transparent_22rem),linear-gradient(120deg,#07111f,#0b1530_55%,#070b17)]" />
          <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_center,white_0,transparent_1px)] [background-size:42px_42px]" />
        </div>

        <div className="relative px-5 pb-5 sm:px-7">
          <div className="-mt-16 flex flex-col gap-5 lg:flex-row lg:items-end">
            <Avatar className="size-32 ring-4 ring-[#09111f]">
              {profile.avatarUrl ? (
                <AvatarImage src={profile.avatarUrl} alt={profile.username} />
              ) : null}
              <AvatarFallback className="bg-violet-950 text-3xl text-violet-200">
                {initials(profile)}
              </AvatarFallback>
              {profile.isOnline ? (
                <AvatarBadge className="size-5 bg-emerald-400 ring-4 ring-[#09111f]" />
              ) : null}
            </Avatar>

            <div className="min-w-0 flex-1 pb-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-3xl font-bold">
                  {profile.displayName || profile.username}
                </h1>
                <ShieldCheck className="size-5 text-violet-400" />
                {profile.isOnline ? (
                  <Badge className="border-emerald-400/20 bg-emerald-400/10 text-emerald-300">
                    Online
                  </Badge>
                ) : null}
              </div>
              <p className="mt-1 text-slate-400">@{profile.username}</p>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-400">
                {profile.location ? (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="size-4" /> {profile.location}
                  </span>
                ) : null}
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="size-4" /> У DSS з{" "}
                  {shortDate(profile.createdAt)}
                </span>
                <span className="flex items-center gap-1.5">
                  <Radio className="size-4" />{" "}
                  {profile.lastSeenAt
                    ? `Активність ${shortDate(profile.lastSeenAt)}`
                    : "Статус приховано"}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pb-1">
              {isOwner ? (
                <Button asChild>
                  <Link href="/settings/profile">
                    <Pencil /> Редагувати профіль
                  </Link>
                </Button>
              ) : (
                <Button
                  onClick={toggleFollow}
                  disabled={pending}
                  variant={profile.isFollowedByViewer ? "secondary" : "default"}
                >
                  {profile.isFollowedByViewer ? <UserCheck /> : <UserPlus />}
                  {profile.isFollowedByViewer ? "Відстежується" : "Підписатися"}
                </Button>
              )}
              <Button variant="outline" disabled title="Phase 15">
                <MessageSquare /> Повідомлення
              </Button>
              <Button variant="ghost" size="icon" aria-label="Дії профілю">
                <MoreHorizontal />
              </Button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 border-t border-white/10 pt-5 sm:grid-cols-3">
            <ProfileMetric
              label="Підписники"
              value={profile.followerCount.toLocaleString("uk-UA")}
              icon={Users}
            />
            <ProfileMetric
              label="Підписки"
              value={profile.followingCount.toLocaleString("uk-UA")}
              icon={UserCheck}
            />
            <ProfileMetric
              label="Гейміфікація"
              value="Відкриється у Phase 8"
              icon={Rocket}
              muted
            />
          </div>
        </div>
      </section>

      <nav className="flex gap-1 overflow-x-auto rounded-xl border border-white/10 bg-white/[0.025] p-1.5">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={cn(
              "flex min-w-max items-center gap-2 rounded-lg px-4 py-2 text-sm text-slate-400 transition",
              activeTab === id && "bg-violet-500/15 text-violet-200",
            )}
          >
            <Icon className="size-4" /> {label}
          </button>
        ))}
      </nav>

      <div className="grid items-start gap-5 xl:grid-cols-[300px_minmax(0,1fr)_310px]">
        <div className={cn("space-y-5", !showAbout && "hidden xl:block")}>
          <AboutCard profile={profile} />
          <SocialLinksCard profile={profile} />
        </div>

        <div className="space-y-5">
          {showWall ? (
            <>
              <WallComposer profile={profile} viewerId={viewerId} />
              <WallFeed wall={wall} profile={profile} />
            </>
          ) : null}
          {showActivity && activeTab !== "overview" ? (
            <ActivityFeed activity={activity} />
          ) : null}
          {activeTab === "about" ? <AboutCard profile={profile} /> : null}
        </div>

        <div className="space-y-5">
          <ContributionCard profile={profile} wall={wall} activity={activity} />
          {showActivity ? <ActivityFeed activity={activity} compact /> : null}
        </div>
      </div>
    </div>
  );
}

function ProfileMetric({
  label,
  value,
  icon: Icon,
  muted = false,
}: {
  label: string;
  value: string;
  icon: typeof Users;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-white/[0.025] px-4 py-3">
      <span
        className={cn(
          "grid size-10 place-items-center rounded-xl bg-violet-500/10 text-violet-300",
          muted && "bg-white/5 text-slate-500",
        )}
      >
        <Icon className="size-5" />
      </span>
      <div>
        <p className="text-xs uppercase tracking-wide text-slate-500">
          {label}
        </p>
        <p className={cn("font-semibold", muted && "text-sm text-slate-400")}>
          {value}
        </p>
      </div>
    </div>
  );
}

function AboutCard({ profile }: { profile: Profile }) {
  return (
    <Card className="bg-white/[0.03]">
      <CardHeader>
        <CardTitle>Про користувача</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="leading-6 text-slate-300">
          {profile.bio || "Користувач ще не додав біографію."}
        </p>
        <div>
          <p className="mb-2 text-xs uppercase tracking-wider text-slate-500">
            Технології
          </p>
          <div className="flex flex-wrap gap-2">
            {profile.technologies.length ? (
              profile.technologies.map((technology) => (
                <Badge key={technology} variant="outline">
                  <Code2 /> {technology}
                </Badge>
              ))
            ) : (
              <span className="text-sm text-slate-500">Не вказані</span>
            )}
          </div>
        </div>
        <div>
          <p className="mb-2 text-xs uppercase tracking-wider text-slate-500">
            Інтереси
          </p>
          <div className="flex flex-wrap gap-2">
            {profile.interests.map((interest) => (
              <Badge key={interest} className="bg-cyan-400/10 text-cyan-200">
                {interest}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SocialLinksCard({ profile }: { profile: Profile }) {
  const iconFor = (platform: string) => {
    if (platform.toLowerCase() === "github") return Code2;
    if (platform.toLowerCase() === "linkedin") return Users;
    return Globe2;
  };
  return (
    <Card className="bg-white/[0.03]">
      <CardHeader>
        <CardTitle>Соціальні посилання</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {profile.socialLinks.map((link) => {
          const Icon = iconFor(link.platform);
          return (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 rounded-lg p-2 text-slate-300 transition hover:bg-white/5"
            >
              <Icon className="size-4 text-violet-300" />
              <span className="min-w-0 flex-1 truncate">
                {link.label || link.platform}
              </span>
              <ExternalLink className="size-3 text-slate-600" />
            </a>
          );
        })}
        {profile.website ? (
          <a
            href={profile.website}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 rounded-lg p-2 text-slate-300 transition hover:bg-white/5"
          >
            <Globe2 className="size-4 text-cyan-300" />
            <span className="min-w-0 flex-1 truncate">{profile.website}</span>
          </a>
        ) : null}
        {!profile.website && profile.socialLinks.length === 0 ? (
          <p className="text-sm text-slate-500">Посилання приховані.</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function WallComposer({
  profile,
  viewerId,
}: {
  profile: Profile;
  viewerId: string;
}) {
  const action = createWallPost.bind(null, profile.id, profile.username);
  return (
    <Card className="bg-white/[0.035]">
      <CardContent>
        <form action={action} className="space-y-3">
          <div className="flex gap-3">
            <Avatar className="mt-1">
              <AvatarFallback>
                {viewerId.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <Textarea
              name="body"
              maxLength={2000}
              placeholder={`Напишіть щось на стіні ${profile.displayName || profile.username}…`}
              className="min-h-24 border-white/10 bg-black/20"
            />
          </div>
          <div className="flex items-center justify-between">
            <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-500">
              <ImagePlus className="size-4" />
              Media ID
              <input
                name="imageMediaId"
                className="w-36 rounded-md border border-white/10 bg-black/20 px-2 py-1"
                placeholder="optional"
              />
            </label>
            <Button type="submit">
              <Send /> Опублікувати
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function WallFeed({ wall, profile }: { wall: Wall; profile: Profile }) {
  if (!wall?.items.length) {
    return (
      <Card className="border-dashed bg-white/[0.02]">
        <CardContent className="py-10 text-center text-slate-500">
          На цій стіні ще немає записів.
        </CardContent>
      </Card>
    );
  }
  return (
    <div className="space-y-4">
      {wall.items.map((post) => (
        <Card key={post.id} className="bg-white/[0.035]">
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Avatar>
                {post.authorId === profile.id && profile.avatarUrl ? (
                  <AvatarImage src={profile.avatarUrl} alt={profile.username} />
                ) : null}
                <AvatarFallback>
                  {post.authorId === profile.id
                    ? initials(profile)
                    : post.authorId.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {post.authorId === profile.id
                    ? profile.displayName || profile.username
                    : "Учасник DSS"}
                </p>
                <p className="text-xs text-slate-500">
                  {shortDate(post.createdAt)}
                </p>
              </div>
              <Button variant="ghost" size="icon" aria-label="Дії запису">
                <MoreHorizontal />
              </Button>
            </div>
            {post.isDeleted ? (
              <div className="rounded-xl border border-dashed border-white/10 p-5 text-sm text-slate-500">
                Цей запис видалено.
              </div>
            ) : (
              <>
                {post.body ? (
                  <p className="whitespace-pre-wrap leading-7 text-slate-200">
                    {post.body}
                  </p>
                ) : null}
                {post.imageMediaId ? (
                  <div className="flex min-h-32 items-center justify-center rounded-xl border border-violet-400/15 bg-gradient-to-br from-violet-950/60 to-blue-950/40 text-violet-200">
                    <FileImage className="mr-2 size-5" /> Вкладене зображення
                  </div>
                ) : null}
                <div className="flex gap-5 border-t border-white/10 pt-3 text-xs text-slate-500">
                  <span>Реакції та коментарі — shared Phase 9</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ActivityFeed({
  activity,
  compact = false,
}: {
  activity: ActivityPage;
  compact?: boolean;
}) {
  return (
    <Card className="bg-white/[0.03]">
      <CardHeader>
        <CardTitle>Остання активність</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {activity?.items.length ? (
          activity.items.slice(0, compact ? 5 : 12).map((entry) => (
            <div key={entry.id} className="flex gap-3">
              <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-violet-500/10 text-violet-300">
                <Activity className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="text-sm text-slate-300">
                  {activityLabel(entry.action)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {entry.module} · {shortDate(entry.occurredAt)}
                </p>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-500">Активності ще немає.</p>
        )}
      </CardContent>
    </Card>
  );
}

function ContributionCard({
  profile,
  wall,
  activity,
}: {
  profile: Profile;
  wall: Wall;
  activity: ActivityPage;
}) {
  return (
    <Card className="bg-white/[0.03]">
      <CardHeader>
        <CardTitle>Внесок у DSS</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3">
        <ProfileMetric
          label="Записи"
          value={(wall?.total ?? 0).toLocaleString("uk-UA")}
          icon={MessageSquare}
        />
        <ProfileMetric
          label="Події"
          value={(activity?.total ?? 0).toLocaleString("uk-UA")}
          icon={Activity}
        />
        <div className="col-span-2 rounded-xl border border-amber-400/15 bg-amber-400/5 p-4">
          <p className="text-xs uppercase tracking-wide text-amber-300">
            Phase 8 ready
          </p>
          <p className="mt-1 text-sm text-slate-400">
            Рівні, очки, репутація та звання підключаться до цього профілю без
            зміни його базової структури.
          </p>
        </div>
        <p className="col-span-2 text-xs text-slate-600">ID: {profile.id}</p>
      </CardContent>
    </Card>
  );
}

/**
 * 🌌 A profile is a person, not a pile of counters.
 * The counters may orbit; identity stays in the center.
 */
