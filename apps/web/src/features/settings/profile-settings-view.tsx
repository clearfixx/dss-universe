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

import { DesignScope } from "@/components/ui/design-scope";
import { Label, NativeSelect, Switch as NativeSwitch } from "@/components/ui/choice-fields";
import { Alert, AlertDescription } from "@/components/ui/feedback";
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
  requestViewerEmailVerification,
} from "../profile/profile-actions";
import { TwoFactorSettings } from "./two-factor-settings";

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
    viewerTwoFactorStatus: twoFactor,
  } = settings;

  return (
    <DesignScope className="mx-auto max-w-6xl min-w-0 space-y-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <Badge variant="secondary">
            Account Settings
          </Badge>
          <h1 className="mt-3 font-heading text-3xl font-semibold">Налаштування профілю</h1>
          <p className="mt-2 text-muted-foreground">
            Керуйте публічною інформацією, приватністю, сповіщеннями та сесіями.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/profile/${encodeURIComponent(viewer.username)}`}>Переглянути профіль</Link>
        </Button>
      </header>

      <Card className="border-border bg-card">
        <CardContent className="flex flex-col gap-5 py-5 sm:flex-row sm:items-center">
          <div className="grid size-16 place-items-center rounded-card bg-secondary text-2xl font-bold text-secondary-foreground">
            {completion.percentage}%
          </div>
          <div className="flex-1">
            <div className="flex justify-between text-sm">
              <span className="font-medium">Заповнення профілю</span>
              <span className="text-muted-foreground">
                {completion.completedCount}/{completion.totalCount}
              </span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-label="Заповнення профілю" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(100, Math.max(0, completion.percentage))}>
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${Math.min(100, Math.max(0, completion.percentage))}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
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
          description="Керуйте видимістю профілю, статусом та соціальними даними."
        >
          <form action={updatePrivacySettings} className="space-y-4">
            <Field label="Видимість профілю">
              <NativeSelect
                name="profileVisibility"
                defaultValue={privacy.profileVisibility}
                className="h-9 w-full"
              >
                <option value="PUBLIC">Публічний</option>
                <option value="MEMBERS">Лише учасники</option>
                <option value="PRIVATE">Приватний</option>
              </NativeSelect>
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
                label="Статус онлайн"
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
          description="Виберіть події та частоту отримання сповіщень."
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
            <Field label="Частота email-дайджесту">
              <NativeSelect
                name="digestFrequency"
                defaultValue={notifications.digestFrequency}
                className="h-9 w-full"
              >
                <option value="OFF">Вимкнено</option>
                <option value="DAILY">Щодня</option>
                <option value="WEEKLY">Щотижня</option>
              </NativeSelect>
            </Field>
            <Button type="submit">Зберегти сповіщення</Button>
          </form>
        </SettingsCard>

        <SettingsCard
          icon={Laptop}
          title="Активні сесії"
          description="Пристрої з активними сесіями вашого акаунта."
        >
          <div className="space-y-3">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="flex flex-wrap items-center gap-3 rounded-card border border-border p-3"
              >
                <Laptop className="size-5 text-brand-cyan" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {session.userAgent || "Невідомий пристрій"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {session.ipAddress || "IP приховано"} ·{" "}
                    {new Date(String(session.createdAt)).toLocaleDateString(
                      "uk-UA",
                    )}
                  </p>
                </div>
                {session.current ? (
                  <Badge variant="success">
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
            {sessions.length === 0 ? <Alert><AlertDescription>Активних сесій немає.</AlertDescription></Alert> : null}
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
                className="flex flex-wrap items-center gap-2"
              >
                <Input
                  name="mediaId"
                  aria-label={kind === "avatar" ? "Media ID аватара" : "Media ID обкладинки"}
                  placeholder={`Media ID для ${kind}`}
                  className="min-w-0 flex-1"
                  required
                />
                <Button type="submit" variant="outline">
                  Встановити
                </Button>
                <Button
                  type="submit"
                  variant="ghost"
                  formAction={removeViewerMedia.bind(null, kind)}
                  formNoValidate
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
          description={`Email: ${viewer.email}. Зміна облікових даних завершує активні сесії.`}
        >
          <div className="space-y-5">
            <TwoFactorSettings
              enabled={twoFactor.enabled}
              recoveryCodesRemaining={twoFactor.recoveryCodesRemaining}
            />
            <div className="rounded-lg border border-border p-3 text-sm">
              <p>
                Email:{" "}
                {viewer.emailVerifiedAt ? "підтверджено" : "не підтверджено"}
              </p>
              {!viewer.emailVerifiedAt ? (
                <form action={requestViewerEmailVerification} className="mt-2">
                  <Button type="submit" size="sm" variant="outline">
                    Надіслати лист підтвердження
                  </Button>
                </form>
              ) : null}
            </div>
            <form action={changeViewerEmail} className="space-y-3">
              <Field label="Новий email">
                <Input name="email" type="email" autoComplete="email" required />
              </Field>
              <Field label="Поточний пароль">
                <Input name="currentPassword" type="password" autoComplete="current-password" required />
              </Field>
              <Button type="submit" variant="outline">
                Змінити email
              </Button>
            </form>
            <form
              action={changeViewerPassword}
              className="space-y-3 border-t border-border pt-5"
            >
              <Field label="Поточний пароль">
                <Input name="currentPassword" type="password" autoComplete="current-password" required />
              </Field>
              <Field label="Новий пароль">
                <Input
                  name="newPassword"
                  autoComplete="new-password"
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
              className="space-y-3 border-t border-destructive/30 pt-5"
            >
              <p className="text-sm font-medium text-destructive">
                Деактивація акаунта
              </p>
              <p className="text-xs text-muted-foreground">
                Профіль зникне з публічних списків. Акаунт можна реактивувати
                повторним входом.
              </p>
              <Input
                name="password"
                type="password"
                aria-label="Пароль для деактивації"
                autoComplete="current-password"
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
    </DesignScope>
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
    <Card className="min-w-0 bg-card">
      <CardHeader>
        <div className="mb-2 grid size-10 place-items-center rounded-card bg-secondary text-link">
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
    <Label className="block min-w-0 space-y-2">
      <span>{label}</span>
      {children}
    </Label>
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
    <label className="flex min-h-10 items-center gap-3 rounded-md border border-border px-3 py-2 text-sm text-foreground">
      <NativeSwitch
        name={name}
        value={value}
        defaultChecked={checked}
      />
      {label}
    </label>
  );
}

/**
 * ⚙️ Settings are switches, not side quests.
 */
