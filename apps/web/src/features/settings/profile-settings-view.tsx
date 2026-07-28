/**
 * ===============================================================
 * 🚀 DSS Universe
 * ---------------------------------------------------------------
 * 📦 Module: Profile Settings Frontend
 * 📄 File: apps/web/src/features/settings/profile-settings-view.tsx
 *
 * 🎯 Purpose:
 * Renders owner-only Phase 7 profile, privacy, notification and session
 * settings using server-side mutation actions.
 *
 * 🚀 Build. Share. Grow.
 * ===============================================================
 */

import {
  Bell,
  CheckCircle2,
  Image,
  KeyRound,
  Laptop,
  Lock,
  Shield,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { NotificationCategory, ProfileSettingsQuery } from "@/gql/graphql";

import {
  changeViewerEmail,
  changeViewerPassword,
  deactivateViewerAccount,
  removeViewerMedia,
  revokeOtherSessions,
  revokeSession,
  updateViewerMedia,
  updateNotificationSettings,
  updatePrivacySettings,
  updateProfileSettings,
} from "../profile/profile-actions";

type Settings = ProfileSettingsQuery;

const notificationCategories: Array<{
  value: NotificationCategory;
  label: string;
}> = [
  { value: "DIRECT_MESSAGES", label: "Особисті повідомлення" },
  { value: "MENTIONS", label: "Згадки" },
  { value: "COMMENTS_REPLIES", label: "Коментарі та відповіді" },
  { value: "REPUTATION", label: "Зміни репутації" },
  { value: "PUBLISHING_REVIEW", label: "Публікації на перевірці" },
  { value: "SUBSCRIPTIONS", label: "Підписки" },
  { value: "SUPPORT", label: "Support Center" },
];

export function ProfileSettingsView({ settings }: { settings: Settings }) {
  const {
    viewer,
    viewerPrivacySettings: privacy,
    viewerProfileCompletion: completion,
    viewerNotificationPreferences: notifications,
    viewerSessions: sessions,
  } = settings;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <Badge className="bg-violet-500/15 text-violet-200">
            Account Settings
          </Badge>
          <h1 className="mt-3 text-3xl font-bold">Налаштування профілю</h1>
          <p className="mt-2 text-slate-400">
            Керуйте публічною інформацією, приватністю, сповіщеннями та сесіями.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/profile/${viewer.username}`}>Переглянути профіль</Link>
        </Button>
      </header>

      <Card className="border-violet-400/20 bg-gradient-to-r from-violet-950/50 to-blue-950/30">
        <CardContent className="flex flex-col gap-5 py-5 sm:flex-row sm:items-center">
          <div className="grid size-16 place-items-center rounded-2xl bg-violet-500/15 text-2xl font-bold text-violet-200">
            {completion.percentage}%
          </div>
          <div className="flex-1">
            <div className="flex justify-between text-sm">
              <span className="font-medium">Заповнення профілю</span>
              <span className="text-slate-400">
                {completion.completedCount}/{completion.totalCount}
              </span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/30">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400"
                style={{ width: `${completion.percentage}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-slate-400">
              {completion.isComplete
                ? "Профіль повністю готовий."
                : `Залишилось: ${completion.missingFields.join(", ")}`}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <SettingsCard
          icon={UserRound}
          title="Публічний профіль"
          description="Інформація, яку бачать інші учасники DSS."
        >
          <form action={updateProfileSettings} className="space-y-4">
            <Field label="Ім’я">
              <Input
                name="displayName"
                defaultValue={viewer.displayName ?? ""}
                maxLength={80}
              />
            </Field>
            <Field label="Біографія">
              <Textarea
                name="bio"
                defaultValue={viewer.bio ?? ""}
                maxLength={500}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Локація">
                <Input
                  name="location"
                  defaultValue={viewer.location ?? ""}
                  maxLength={120}
                />
              </Field>
              <Field label="Вебсайт">
                <Input
                  name="website"
                  type="url"
                  defaultValue={viewer.website ?? ""}
                />
              </Field>
            </div>
            <Field label="Технології (через кому)">
              <Input
                name="technologies"
                defaultValue={viewer.technologies.join(", ")}
              />
            </Field>
            <Field label="Інтереси (через кому)">
              <Input
                name="interests"
                defaultValue={viewer.interests.join(", ")}
              />
            </Field>
            <Button type="submit">
              <CheckCircle2 /> Зберегти профіль
            </Button>
          </form>
        </SettingsCard>

        <SettingsCard
          icon={Lock}
          title="Приватність"
          description="Один policy boundary для профілю, присутності та соціальних даних."
        >
          <form action={updatePrivacySettings} className="space-y-4">
            <Field label="Видимість профілю">
              <select
                name="profileVisibility"
                defaultValue={privacy.profileVisibility}
                className="h-9 w-full rounded-lg border border-white/10 bg-slate-950 px-3 text-sm"
              >
                <option value="PUBLIC">Публічний</option>
                <option value="MEMBERS">Лише учасники</option>
                <option value="PRIVATE">Приватний</option>
              </select>
            </Field>
            <div className="grid gap-2 sm:grid-cols-2">
              <Switch
                name="showLocation"
                label="Показувати локацію"
                checked={privacy.showLocation}
              />
              <Switch
                name="showWebsite"
                label="Показувати вебсайт"
                checked={privacy.showWebsite}
              />
              <Switch
                name="showSocialLinks"
                label="Соціальні посилання"
                checked={privacy.showSocialLinks}
              />
              <Switch
                name="showLastSeen"
                label="Остання активність"
                checked={privacy.showLastSeen}
              />
              <Switch
                name="showOnlineStatus"
                label="Online status"
                checked={privacy.showOnlineStatus}
              />
              <Switch
                name="allowFollowers"
                label="Дозволити підписки"
                checked={privacy.allowFollowers}
              />
              <Switch
                name="showFollows"
                label="Списки підписок"
                checked={privacy.showFollows}
              />
              <Switch
                name="allowWallPosts"
                label="Записи на стіні"
                checked={privacy.allowWallPosts}
              />
            </div>
            <Button type="submit">
              <Shield /> Зберегти приватність
            </Button>
          </form>
        </SettingsCard>

        <SettingsCard
          icon={Bell}
          title="Сповіщення"
          description="Виберіть події та cadence без змішування з delivery layer."
        >
          <form action={updateNotificationSettings} className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-2">
              {notificationCategories.map((category) => (
                <Switch
                  key={category.value}
                  name="categories"
                  value={category.value}
                  label={category.label}
                  checked={notifications.inAppCategories.includes(
                    category.value,
                  )}
                />
              ))}
            </div>
            <Switch
              name="emailEnabled"
              label="Email-сповіщення"
              checked={notifications.emailEnabled}
            />
            <Field label="Email digest">
              <select
                name="digestFrequency"
                defaultValue={notifications.digestFrequency}
                className="h-9 w-full rounded-lg border border-white/10 bg-slate-950 px-3 text-sm"
              >
                <option value="OFF">Вимкнено</option>
                <option value="DAILY">Щодня</option>
                <option value="WEEKLY">Щотижня</option>
              </select>
            </Field>
            <Button type="submit">Зберегти сповіщення</Button>
          </form>
        </SettingsCard>

        <SettingsCard
          icon={Laptop}
          title="Активні сесії"
          description="Пристрої з чинними refresh credentials."
        >
          <div className="space-y-3">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center gap-3 rounded-xl border border-white/10 p-3"
              >
                <Laptop className="size-5 text-cyan-300" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {session.userAgent || "Невідомий пристрій"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {session.ipAddress || "IP приховано"} ·{" "}
                    {new Date(String(session.createdAt)).toLocaleDateString(
                      "uk-UA",
                    )}
                  </p>
                </div>
                {session.current ? (
                  <Badge className="bg-emerald-400/10 text-emerald-300">
                    Поточна
                  </Badge>
                ) : (
                  <form action={revokeSession.bind(null, session.id)}>
                    <Button type="submit" size="sm" variant="outline">
                      Завершити
                    </Button>
                  </form>
                )}
              </div>
            ))}
            <form action={revokeOtherSessions}>
              <Button type="submit" variant="outline">
                Завершити всі інші
              </Button>
            </form>
          </div>
        </SettingsCard>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <SettingsCard
          icon={Image}
          title="Аватар і обкладинка"
          description="Зображення керуються через DSS Media Platform."
        >
          <div className="space-y-4">
            {(["avatar", "cover"] as const).map((kind) => (
              <form
                key={kind}
                action={updateViewerMedia.bind(null, kind)}
                className="flex gap-2"
              >
                <Input
                  name="mediaId"
                  placeholder={`Media ID для ${kind}`}
                  required
                />
                <Button type="submit" variant="outline">
                  Встановити
                </Button>
                <Button
                  type="submit"
                  variant="ghost"
                  formAction={removeViewerMedia.bind(null, kind)}
                >
                  Прибрати
                </Button>
              </form>
            ))}
            <Button asChild variant="outline">
              <Link href="/media">Відкрити Media Library</Link>
            </Button>
          </div>
        </SettingsCard>
        <SettingsCard
          icon={KeyRound}
          title="Безпека акаунта"
          description={`Email: ${viewer.email}. Зміна credentials завершує активні сесії.`}
        >
          <div className="space-y-5">
            <form action={changeViewerEmail} className="space-y-3">
              <Field label="Новий email">
                <Input name="email" type="email" required />
              </Field>
              <Field label="Поточний пароль">
                <Input name="currentPassword" type="password" required />
              </Field>
              <Button type="submit" variant="outline">
                Змінити email
              </Button>
            </form>
            <form
              action={changeViewerPassword}
              className="space-y-3 border-t border-white/10 pt-5"
            >
              <Field label="Поточний пароль">
                <Input name="currentPassword" type="password" required />
              </Field>
              <Field label="Новий пароль">
                <Input
                  name="newPassword"
                  type="password"
                  minLength={8}
                  required
                />
              </Field>
              <Button type="submit" variant="outline">
                Змінити пароль
              </Button>
            </form>
            <form
              action={deactivateViewerAccount}
              className="space-y-3 border-t border-red-400/15 pt-5"
            >
              <p className="text-sm font-medium text-red-300">
                Деактивація акаунта
              </p>
              <p className="text-xs text-slate-500">
                Профіль зникне з публічних списків. Акаунт можна реактивувати
                повторним входом.
              </p>
              <Input
                name="password"
                type="password"
                placeholder="Підтвердіть пароль"
                required
              />
              <Button type="submit" variant="destructive">
                Деактивувати
              </Button>
            </form>
          </div>
        </SettingsCard>
      </div>
    </div>
  );
}

function SettingsCard({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof UserRound;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Card className="bg-white/[0.03]">
      <CardHeader>
        <div className="mb-2 grid size-10 place-items-center rounded-xl bg-violet-500/10 text-violet-300">
          <Icon className="size-5" />
        </div>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-2 text-sm text-slate-300">
      <span>{label}</span>
      {children}
    </label>
  );
}

function Switch({
  name,
  label,
  checked,
  value,
}: {
  name: string;
  label: string;
  checked: boolean;
  value?: string;
}) {
  return (
    <label className="flex items-center gap-3 rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-300">
      <input
        type="checkbox"
        name={name}
        value={value}
        defaultChecked={checked}
        className="size-4 accent-violet-500"
      />
      {label}
    </label>
  );
}

/**
 * ⚙️ Settings are switches, not side quests.
 */
