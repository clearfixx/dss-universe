"use client";

import { createEmptyEditorDocument, type EditorDocument } from "@dss/editor";
import { ArrowLeft, LoaderCircle, Save, Send } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { DesignScope } from "@/components/ui/design-scope";
import { NativeSelect } from "@/components/ui/choice-fields";
import { Alert } from "@/components/ui/feedback";
import { editorialStatus } from "./editorial-status";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DssEditor } from "@/features/editor/dss-editor";
import type {
  NewsEditorialFieldsFragment,
  NewsPostType,
  NewsVisibility,
  NewsPinScope,
} from "@/gql/graphql";

import {
  createDraft,
  manageNewsPin,
  runNewsWorkflow,
  saveDraft,
} from "./newsroom-actions";

function initialDocument(
  article?: NewsEditorialFieldsFragment | null,
): EditorDocument {
  if (!article) return createEmptyEditorDocument("NEWS");
  try {
    return JSON.parse(article.documentJson) as EditorDocument;
  } catch {
    return createEmptyEditorDocument("NEWS");
  }
}

export function NewsEditorWorkspace({
  article,
}: {
  article?: NewsEditorialFieldsFragment | null;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(article?.title ?? "");
  const [slug, setSlug] = useState(article?.slug ?? "");
  const [shortText, setShortText] = useState(article?.shortText ?? "");
  const [language, setLanguage] = useState(article?.language ?? "uk");
  const [postType, setPostType] = useState<NewsPostType>(
    article?.postType ?? "STANDARD",
  );
  const [visibility, setVisibility] = useState<NewsVisibility>(
    article?.visibility ?? "PUBLIC",
  );
  const [coverMediaId, setCoverMediaId] = useState(article?.coverMediaId ?? "");
  const [document, setDocument] = useState(() => initialDocument(article));
  const [currentVersion, setCurrentVersion] = useState(
    article?.currentVersion ?? 1,
  );
  const [status, setStatus] = useState(article?.status ?? "DRAFT");
  const [reason, setReason] = useState("");
  const [scheduledFor, setScheduledFor] = useState("");
  const [pinScope, setPinScope] = useState<NewsPinScope>("GLOBAL");
  const [pinCategoryId, setPinCategoryId] = useState("");
  const [pinExpiresAt, setPinExpiresAt] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const editable =
    !article || status === "DRAFT" || status === "CHANGES_REQUESTED";

  const persist = () =>
    startTransition(async () => {
      try {
        const common = {
          postType,
          visibility,
          language,
          slug,
          title,
          shortText,
          documentJson: JSON.stringify(document),
          templateDataJson: article?.templateDataJson ?? "{}",
          coverMediaId: coverMediaId || undefined,
        };
        const saved = article
          ? await saveDraft({
              ...common,
              articleId: article.id,
              baseVersion: currentVersion,
              changeSummary: reason || undefined,
            })
          : await createDraft(common);
        if (!saved) throw new Error("Не вдалося зберегти новину.");
        setCurrentVersion(saved.currentVersion);
        setStatus(saved.status);
        setMessage("Збережено.");
        if (!article) router.replace(`/newsroom/${saved.id}`);
        else router.refresh();
      } catch (error) {
        setMessage(
          error instanceof Error ? error.message : "Не вдалося зберегти.",
        );
      }
    });

  const workflow = (action: Parameters<typeof runNewsWorkflow>[0]) => {
    if (!article) return;
    startTransition(async () => {
      try {
        const updated = await runNewsWorkflow(action, article.id, {
          reason,
          scheduledFor: scheduledFor
            ? new Date(scheduledFor).toISOString()
            : undefined,
        });
        if (updated) {
          setStatus(updated.status);
          setCurrentVersion(updated.currentVersion);
        }
        setMessage("Статус оновлено.");
        router.refresh();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Дія недоступна.");
      }
    });
  };

  const pin = (action: "set" | "remove") => {
    if (!article) return;
    startTransition(async () => {
      try {
        await manageNewsPin(action, article.id, {
          scope: pinScope,
          categoryId: pinScope === "CATEGORY" ? pinCategoryId : undefined,
          expiresAt: pinExpiresAt
            ? new Date(pinExpiresAt).toISOString()
            : undefined,
        });
        setMessage(
          action === "set" ? "Новину закріплено." : "Закріплення знято.",
        );
        router.refresh();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Дія недоступна.");
      }
    });
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <DesignScope className="bg-transparent">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            href="/newsroom"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-link"
          >
            <ArrowLeft className="size-4" /> Newsroom
          </Link>
          <h1 className="mt-3 font-heading text-3xl font-semibold">
            {article ? "Редагування новини" : "Нова новина"}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {article ? (
            <Badge variant={editorialStatus(status).variant}>
              {editorialStatus(status).label} · v{currentVersion}
            </Badge>
          ) : (
            <Badge>Нова чернетка</Badge>
          )}
          <Button onClick={persist} disabled={pending || !editable}>
            {pending ? <LoaderCircle className="animate-spin" /> : <Save />}{" "}
            Зберегти
          </Button>
        </div>
      </header>
      </DesignScope>
      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_21rem]">
        <section aria-label="Редагування матеріалу" className="min-w-0 space-y-4 rounded-card border border-border bg-card p-4 sm:p-6">
          <DesignScope className="space-y-4 bg-transparent">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block min-w-0 space-y-2 text-sm font-medium">
              Заголовок
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={!editable}
              />
            </label>
            <label className="block min-w-0 space-y-2 text-sm font-medium">
              Slug
              <Input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                disabled={!editable}
              />
            </label>
          </div>
          <label className="block min-w-0 space-y-2 text-sm font-medium">
            Короткий текст
            <Textarea
              value={shortText}
              onChange={(e) => setShortText(e.target.value)}
              disabled={!editable}
              rows={4}
            />
          </label>
          </DesignScope>
          <DssEditor
            profile="NEWS"
            permissions={["MEDIA_UPLOAD"]}
            initialDocument={document}
            editable={editable}
            onDocumentChange={setDocument}
            ariaLabel="Редактор повної новини"
          />
        </section>
        <aside className="min-w-0">
          <DesignScope className="space-y-4 bg-transparent">
          <section className="space-y-4 rounded-card border border-border bg-card p-5">
            <h2 className="font-heading text-xl font-semibold">Параметри</h2>
            <label className="block min-w-0 space-y-2 text-sm font-medium">
              Тип
              <NativeSelect
                className="h-9 w-full"
                value={postType}
                onChange={(e) => setPostType(e.target.value as NewsPostType)}
                disabled={!editable}
              >
                {["STANDARD", "TEXT", "GALLERY", "VIDEO", "AUDIO"].map(
                  (value) => (
                    <option key={value}>{value}</option>
                  ),
                )}
              </NativeSelect>
            </label>
            <label className="block min-w-0 space-y-2 text-sm font-medium">
              Видимість
              <NativeSelect
                className="h-9 w-full"
                value={visibility}
                onChange={(e) =>
                  setVisibility(e.target.value as NewsVisibility)
                }
                disabled={!editable}
              >
                <option>PUBLIC</option>
                <option>MEMBERS</option>
              </NativeSelect>
            </label>
            <label className="block min-w-0 space-y-2 text-sm font-medium">
              Мова
              <Input
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                disabled={!editable}
              />
            </label>
            <label className="block min-w-0 space-y-2 text-sm font-medium">
              Cover Media ID
              <Input
                value={coverMediaId}
                onChange={(e) => setCoverMediaId(e.target.value)}
                disabled={!editable}
                placeholder="UUID обкладинки"
              />
            </label>
          </section>
          {article ? (
            <section className="space-y-3 rounded-card border border-border bg-card p-5">
              <h2 className="font-heading text-xl font-semibold">Редакційний workflow</h2>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                aria-label="Причина або примітка"
                placeholder="Причина або примітка"
              />
              <Input
                type="datetime-local"
                aria-label="Дата та час публікації"
                value={scheduledFor}
                onChange={(e) => setScheduledFor(e.target.value)}
              />
              <div className="flex flex-wrap gap-2">
                {editable ? (
                  <Button
                    size="sm"
                    onClick={() => workflow("submit")}
                    disabled={pending}
                  >
                    <Send /> На перевірку
                  </Button>
                ) : null}
                {status === "IN_REVIEW" ? (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => workflow("changes")}
                      disabled={pending}
                    >
                      Повернути
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => workflow("approve")}
                      disabled={pending}
                    >
                      Схвалити
                    </Button>
                  </>
                ) : null}
                {status === "APPROVED" ? (
                  <>
                    <Button
                      size="sm"
                      onClick={() => workflow("publish")}
                      disabled={pending}
                    >
                      Опублікувати
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => workflow("schedule")}
                      disabled={pending}
                    >
                      Запланувати
                    </Button>
                  </>
                ) : null}
                {status === "SCHEDULED" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => workflow("cancel")}
                    disabled={pending}
                  >
                    Скасувати план
                  </Button>
                ) : null}
              </div>
            </section>
          ) : null}
          {article && status === "PUBLISHED" ? (
            <section className="space-y-3 rounded-card border border-border bg-card p-5">
              <h2 className="font-heading text-xl font-semibold">Закріплення</h2>
              <NativeSelect
                className="h-9 w-full"
                aria-label="Область закріплення"
                value={pinScope}
                onChange={(event) =>
                  setPinScope(event.target.value as NewsPinScope)
                }
              >
                <option value="GLOBAL">У всіх новинах</option>
                <option value="CATEGORY">У категорії</option>
              </NativeSelect>
              {pinScope === "CATEGORY" ? (
                <Input
                  value={pinCategoryId}
                  onChange={(event) => setPinCategoryId(event.target.value)}
                  aria-label="UUID категорії"
                  placeholder="UUID категорії"
                />
              ) : null}
              <label className="block space-y-2 text-sm text-foreground">
                Закріпити до (необовʼязково)
                <Input
                  type="datetime-local"
                  value={pinExpiresAt}
                  onChange={(event) => setPinExpiresAt(event.target.value)}
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => pin("set")} disabled={pending}>
                  Закріпити
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => pin("remove")}
                  disabled={pending}
                >
                  Зняти
                </Button>
              </div>
            </section>
          ) : null}
          {message ? (
            <Alert role="status">{message}</Alert>
          ) : null}
          </DesignScope>
        </aside>
      </div>
    </div>
  );
}
