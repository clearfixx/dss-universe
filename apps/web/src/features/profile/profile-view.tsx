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
  Award,
  CalendarDays,
  Code2,
  Crown,
  ExternalLink,
  FileImage,
  Globe2,
  ImagePlus,
  MapPin,
  MessageSquare,
  Orbit,
  Pencil,
  Radio,
  Send,
  Sparkles,
  Star,
  Trophy,
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
import { DesignScope } from "@/components/ui/design-scope";
import { NativeSelect, Radio } from "@/components/ui/choice-fields";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type {
  ProfileWallQuery,
  ProfileGamificationQuery,
  PublicProfileQuery,
  UserActivityQuery,
} from "@/gql/graphql";
import { presentActivity } from "@/features/activity/activity-presenters";
import { cn } from "@/lib/utils";
import { useProfileUiStore, type ProfileTab } from "@/stores/profile-ui.store";

import {
  createWallPost,
  giveProfileReputation,
  selectViewerCustomTitle,
  setProfileFollowState,
} from "./profile-actions";

type Profile = PublicProfileQuery["userByUsername"];
type Wall = ProfileWallQuery["profileWall"] | undefined;
type ActivityPage = UserActivityQuery["userActivity"] | undefined;
type Gamification = ProfileGamificationQuery | undefined;

type ProfileViewProps = {
  viewerId: string;
  profile: Profile;
  wall: Wall;
  activity: ActivityPage;
  gamification: Gamification;
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

/** Wall labels stay profile-owned; other modules present their own events. */
function presentEntry(entry: {
  module: string;
  action: string;
  subjectType: string;
  subjectId: string;
}) {
  return entry.module === "users"
    ? { title: activityLabel(entry.action), href: null }
    : presentActivity(entry);
}

export function ProfileView({
  viewerId,
  profile,
  wall,
  activity,
  gamification,
}: ProfileViewProps) {
  const activeTab = useProfileUiStore((state) => state.activeTab);
  const setActiveTab = useProfileUiStore((state) => state.setActiveTab);
  const [pending, startTransition] = useTransition();
  const isGuest = viewerId.length === 0;
  const isOwner = viewerId === profile.id;
  const selectedTitle = gamification?.userCustomTitles.find(
    (grant) => grant.selected && grant.title.isActive,
  )?.title;

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
    <DesignScope className="mx-auto max-w-[1560px] min-w-0 space-y-4">
      <section className="overflow-hidden rounded-card border border-border bg-card">
        <div
          className="relative min-h-44 overflow-hidden border-b border-border bg-muted bg-cover bg-center sm:min-h-52"
          style={
            profile.coverUrl
              ? { backgroundImage: `url("${profile.coverUrl}")` }
              : undefined
          }
        >
        </div>

        <div className="relative px-5 pb-5 sm:px-7">
          <div className="-mt-16 flex flex-col gap-5 lg:flex-row lg:items-end">
            <Avatar className="size-24 ring-4 ring-card sm:size-32">
              {profile.avatarUrl ? (
                <AvatarImage src={profile.avatarUrl} alt={profile.username} />
              ) : null}
              <AvatarFallback className="bg-secondary text-3xl text-secondary-foreground">
                {initials(profile)}
              </AvatarFallback>
              {profile.isOnline ? (
                <AvatarBadge className="size-5 bg-success ring-4 ring-card" />
              ) : null}
            </Avatar>

            <div className="min-w-0 flex-1 pb-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="break-words font-heading text-3xl font-semibold">
                  {profile.displayName || profile.username}
                </h1>
                {selectedTitle ? (
                  <Badge
                    style={{
                      borderColor: `${selectedTitle.color}66`,
                      color: selectedTitle.color,
                      backgroundColor: `${selectedTitle.color}14`,
                    }}
                  >
                    <Crown /> {selectedTitle.badge} {selectedTitle.name}
                  </Badge>
                ) : null}
                {profile.isOnline ? (
                  <Badge className="border-success/20 bg-success/10 text-success">
                    Online
                  </Badge>
                ) : null}
              </div>
              <p className="mt-1 text-muted-foreground">@{profile.username}</p>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
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
              ) : isGuest ? (
                <Button asChild>
                  <Link
                    href={`/login?returnTo=${encodeURIComponent(`/profile/${encodeURIComponent(profile.username)}`)}`}
                  >
                    <UserPlus /> Увійти, щоб підписатися
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
            </div>
          </div>

          <div className="mt-5 grid gap-3 border-t border-border pt-5 sm:grid-cols-3">
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
              value={`Рівень ${gamification?.levelProgress.currentLevel ?? 0} · ${(gamification?.levelProgress.balance ?? 0).toLocaleString("uk-UA")} очок`}
              icon={Trophy}
            />
          </div>
        </div>
      </section>

      <nav aria-label="Розділи профілю" className="flex gap-1 overflow-x-auto rounded-card border border-border bg-card p-1.5">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            aria-pressed={activeTab === id}
            className={cn(
              "flex min-w-max items-center gap-2 rounded-lg px-4 py-2 text-sm text-muted-foreground transition-colors focus-visible:outline-2 focus-visible:outline-ring",
              activeTab === id && "bg-secondary text-link",
            )}
          >
            <Icon className="size-4" /> {label}
          </button>
        ))}
      </nav>

      <div className="grid min-w-0 items-start gap-4 xl:grid-cols-[minmax(0,260px)_minmax(0,1fr)_minmax(0,280px)]">
        <div className={cn("min-w-0 space-y-4", !showAbout && "hidden xl:block")}>
          <AboutCard profile={profile} />
          <SocialLinksCard profile={profile} />
        </div>

        <div className="min-w-0 space-y-4">
          {showWall ? (
            <>
              {isGuest ? null : (
                <WallComposer profile={profile} viewerId={viewerId} />
              )}
              <WallFeed wall={wall} profile={profile} />
            </>
          ) : null}
          {showActivity && activeTab !== "overview" ? (
            <ActivityFeed activity={activity} />
          ) : null}
        </div>

        <div className="min-w-0 space-y-4">
          <GamificationCard
            gamification={gamification}
            isOwner={isOwner}
            username={profile.username}
          />
          <AchievementsCard gamification={gamification} />
          <ProgressHistoryCard gamification={gamification} />
          {!isOwner && !isGuest ? <ReputationCard profile={profile} /> : null}
          <ContributionCard profile={profile} wall={wall} activity={activity} />
          {activeTab === "overview" ? <ActivityFeed activity={activity} compact /> : null}
        </div>
      </div>
    </DesignScope>
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
    <div className="flex min-w-0 items-center gap-2 rounded-md bg-muted px-3 py-3">
      <span
        className={cn(
          "grid size-9 shrink-0 place-items-center rounded-md bg-secondary text-link",
          muted && "bg-muted text-muted-foreground",
        )}
      >
        <Icon className="size-5" />
      </span>
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className={cn("font-semibold", muted && "text-sm text-muted-foreground")}>
          {value}
        </p>
      </div>
    </div>
  );
}

function AboutCard({ profile }: { profile: Profile }) {
  return (
    <Card className="bg-card">
      <CardHeader>
        <CardTitle>Про користувача</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="leading-6 text-foreground">
          {profile.bio || "Користувач ще не додав біографію."}
        </p>
        <div>
          <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">
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
              <span className="text-sm text-muted-foreground">Не вказані</span>
            )}
          </div>
        </div>
        <div>
          <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">
            Інтереси
          </p>
          <div className="flex flex-wrap gap-2">
            {profile.interests.map((interest) => (
              <Badge key={interest} className="bg-brand-cyan/10 text-brand-cyan">
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
    <Card className="bg-card">
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
              className="flex items-center gap-3 rounded-lg p-2 text-foreground transition hover:bg-muted"
            >
              <Icon className="size-4 text-link" />
              <span className="min-w-0 flex-1 truncate">
                {link.label || link.platform}
              </span>
              <ExternalLink className="size-3 text-muted-foreground" />
            </a>
          );
        })}
        {profile.website ? (
          <a
            href={profile.website}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 rounded-lg p-2 text-foreground transition hover:bg-muted"
          >
            <Globe2 className="size-4 text-brand-cyan" />
            <span className="min-w-0 flex-1 truncate">{profile.website}</span>
          </a>
        ) : null}
        {!profile.website && profile.socialLinks.length === 0 ? (
          <p className="text-sm text-muted-foreground">Посилання приховані.</p>
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
    <Card className="bg-card">
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
              className="min-h-24"
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
              <ImagePlus className="size-4" />
              Media ID
              <Input
                name="imageMediaId"
                className="w-36"
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
      <Card className="border-dashed bg-card">
        <CardContent className="py-10 text-center text-muted-foreground">
          На цій стіні ще немає записів.
        </CardContent>
      </Card>
    );
  }
  return (
    <div className="space-y-4">
      {wall.items.map((post) => (
        <Card key={post.id} className="bg-card">
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
                <p className="text-xs text-muted-foreground">
                  {shortDate(post.createdAt)}
                </p>
              </div>
            </div>
            {post.isDeleted ? (
              <div className="rounded-card border border-dashed border-border p-5 text-sm text-muted-foreground">
                Цей запис видалено.
              </div>
            ) : (
              <>
                {post.body ? (
                  <p className="whitespace-pre-wrap leading-7 text-foreground">
                    {post.body}
                  </p>
                ) : null}
                {post.imageMediaId ? (
                  <div className="flex min-h-32 items-center justify-center rounded-card border border-border bg-muted text-link">
                    <FileImage className="mr-2 size-5" /> Вкладене зображення
                  </div>
                ) : null}
                <div className="flex gap-5 border-t border-border pt-3 text-xs text-muted-foreground">
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
    <Card className="bg-card">
      <CardHeader>
        <CardTitle>Остання активність</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {activity?.items.length ? (
          activity.items.slice(0, compact ? 5 : 12).map((entry) => (
            <div key={entry.id} className="flex gap-3">
              <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-secondary text-link">
                <Activity className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="text-sm text-foreground">
                  {(() => {
                    const shown = presentEntry(entry);
                    return shown.href ? (
                      <Link href={shown.href} className="hover:text-link">
                        {shown.title}
                      </Link>
                    ) : (
                      shown.title
                    );
                  })()}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {entry.module} · {shortDate(entry.occurredAt)}
                </p>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">Активності ще немає.</p>
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
    <Card className="bg-card">
      <CardHeader>
        <CardTitle>Внесок у DSS</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
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
        <p className="text-xs sm:col-span-2 xl:col-span-1 2xl:col-span-2 text-xs text-muted-foreground">ID: {profile.id}</p>
      </CardContent>
    </Card>
  );
}

function GamificationCard({
  gamification,
  isOwner,
  username,
}: {
  gamification: Gamification;
  isOwner: boolean;
  username: string;
}) {
  const level = gamification?.levelProgress;
  const titles =
    gamification?.userCustomTitles.filter(
      (grant) => !grant.revokedAt && grant.title.isActive,
    ) ?? [];
  const progress = Math.min(100, Math.max(0, level?.progressPercent ?? 0));

  return (
    <Card className="overflow-hidden border-border bg-card">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Trophy className="size-5 text-warning" /> Прогрес
          </span>
          <Badge className="bg-secondary text-link">
            Рівень {level?.currentLevel ?? 0}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <div className="mb-2 flex items-end justify-between">
            <div>
              <p className="text-2xl font-bold">
                {(level?.balance ?? 0).toLocaleString("uk-UA")}
              </p>
              <p className="text-xs text-muted-foreground">Community Points</p>
            </div>
            <p className="text-sm font-medium text-success">
              {gamification?.reputationHistory.score ?? 0} репутації
            </p>
          </div>
          <div
            className="h-2 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-label="Прогрес поточного рівня"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress)}
          >
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-2 flex justify-between text-xs text-muted-foreground">
            <span>{Math.round(progress)}%</span>
            <span>
              {level?.nextLevel
                ? `${level.pointsNeeded.toLocaleString("uk-UA")} до рівня ${level.nextLevel}`
                : "Максимальний рівень"}
            </span>
          </div>
        </div>

        <div>
          <p className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
            <Crown className="size-3.5" /> Звання
          </p>
          <div className="flex flex-wrap gap-2">
            {titles.length ? (
              titles.map((grant) => (
                <Badge
                  key={grant.id}
                  variant="outline"
                  style={{
                    borderColor: `${grant.title.color}66`,
                    color: grant.title.color,
                  }}
                >
                  {grant.title.badge} {grant.title.name}
                </Badge>
              ))
            ) : (
              <span className="text-sm text-muted-foreground">
                Звання ще не отримані.
              </span>
            )}
          </div>
          {isOwner && titles.length > 1 ? (
            <form
              action={selectViewerCustomTitle.bind(null, username)}
              className="mt-3 flex gap-2"
            >
              <NativeSelect
                name="grantId"
                defaultValue={
                  titles.find((grant) => grant.selected)?.id ?? titles[0]?.id
                }
                aria-label="Звання для відображення"
                className="h-9 min-w-0 flex-1"
              >
                {titles.map((grant) => (
                  <option key={grant.id} value={grant.id}>
                    {grant.title.badge} {grant.title.name}
                  </option>
                ))}
              </NativeSelect>
              <Button type="submit" size="sm" variant="outline">
                Обрати
              </Button>
            </form>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function ReputationCard({ profile }: { profile: Profile }) {
  const action = giveProfileReputation.bind(null, profile.id, profile.username);
  return (
    <Card className="border-success/10 bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Star className="size-5 text-success" /> Змінити репутацію
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-success/20 bg-success/5 px-3 py-2 text-sm text-success has-checked:ring-1 has-checked:ring-success">
              <Radio name="value" value="1" required /> +1
            </label>
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive has-checked:ring-1 has-checked:ring-destructive">
              <Radio name="value" value="-1" required /> −1
            </label>
          </div>
          <Textarea
            name="reason"
            minLength={3}
            maxLength={500}
            required
            aria-label="Причина оцінки"
            placeholder="Опишіть причину оцінки…"
            className="min-h-20"
          />
          <Button type="submit" className="w-full">
            Надіслати оцінку
          </Button>
          <p className="text-xs leading-5 text-muted-foreground">
            Одну оцінку конкретному користувачу можна залишити раз на 24 години.
            Автор і причина будуть видимі отримувачу.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}

function AchievementsCard({ gamification }: { gamification: Gamification }) {
  const awards = gamification?.userAchievements ?? [];
  return (
    <Card className="bg-card">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Award className="size-5 text-brand-cyan" /> Досягнення
          </span>
          <span className="text-sm font-normal text-muted-foreground">
            {awards.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {awards.length ? (
          <div className="grid grid-cols-3 gap-2">
            {awards.slice(0, 6).map((award) => (
              <div
                key={award.id}
                title={`${award.achievement.name}: ${award.reason}`}
                className="group grid min-h-20 place-items-center rounded-card border bg-muted p-2 text-center"
                style={{
                  borderColor: `${award.achievement.color}4D`,
                  backgroundColor: `${award.achievement.color}0D`,
                }}
              >
                <span className="text-xl">{award.achievement.badge}</span>
                <span className="line-clamp-2 text-[11px] text-foreground">
                  {award.achievement.name}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-card border border-dashed border-border p-6 text-center">
            <Star className="mx-auto size-6 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">
              Перші досягнення ще попереду.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ProgressHistoryCard({ gamification }: { gamification: Gamification }) {
  const points = gamification?.communityPointsHistory.items ?? [];
  const reputation = gamification?.reputationHistory.items ?? [];
  if (!points.length && !reputation.length) return null;

  return (
    <Card className="bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="size-5 text-link" /> Історія прогресу
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {points.slice(0, 3).map((entry) => (
          <div key={entry.id} className="flex items-start gap-3">
            <span
              className={cn(
                "grid min-w-10 place-items-center rounded-lg px-2 py-1 text-xs font-bold",
                entry.points >= 0
                  ? "bg-brand-cyan/10 text-brand-cyan"
                  : "bg-destructive/10 text-destructive",
              )}
            >
              {entry.points > 0 ? "+" : ""}
              {entry.points}
            </span>
            <div className="min-w-0">
              <p className="text-sm text-foreground">{entry.reason}</p>
              <p className="mt-1 text-xs text-muted-foreground">{entry.ruleKey}</p>
            </div>
          </div>
        ))}
        {reputation.slice(0, 3).map((entry) => (
          <div
            key={entry.id}
            className="border-t border-border pt-3 text-sm"
          >
            <p className="text-foreground">
              <span
                className={
                  entry.value > 0 ? "text-success" : "text-destructive"
                }
              >
                {entry.value > 0 ? "+1" : "−1"}
              </span>{" "}
              від{" "}
              <strong>
                {entry.actor.displayName || `@${entry.actor.username}`}
              </strong>
            </p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {entry.reason}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/**
 * 🌌 A profile is a person, not a pile of counters.
 * The counters may orbit; identity stays in the center.
 */
