import { Archive, Download, File, FileImage, FileText } from "lucide-react";

import type { FullNewsPageQuery } from "@/gql/graphql";
import { siteConfig } from "@/config/site.config";

type Attachment = NonNullable<
  FullNewsPageQuery["fullNews"]
>["attachments"][number];

const formatter = new Intl.NumberFormat("uk-UA", { maximumFractionDigits: 1 });

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} Б`;
  if (bytes < 1024 ** 2) return `${formatter.format(bytes / 1024)} КБ`;
  if (bytes < 1024 ** 3) return `${formatter.format(bytes / 1024 ** 2)} МБ`;
  return `${formatter.format(bytes / 1024 ** 3)} ГБ`;
}

function downloadUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${new URL(siteConfig.apiUrl).origin}${path}`;
}

function FileIcon({
  mimeType,
  extension,
}: Pick<Attachment, "mimeType" | "extension">) {
  const className = "size-7";
  if (mimeType === "application/pdf") return <FileText className={className} />;
  if (mimeType.startsWith("image/")) return <FileImage className={className} />;
  if (["zip", "rar", "7z", "tar", "gz"].includes(extension.toLowerCase())) {
    return <Archive className={className} />;
  }
  return <File className={className} />;
}

export function NewsAttachments({ items }: { items: Attachment[] }) {
  if (!items.length) return null;
  return (
    <section className="space-y-4 rounded-card border border-border bg-card p-6 sm:p-8">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-cyan">
          Матеріали
        </p>
        <h2 className="mt-1 text-2xl font-semibold">Вкладені файли</h2>
      </div>
      <div className="grid gap-3">
        {items.map((item) => (
          <article
            key={item.id}
            className="grid gap-4 rounded-md border border-border bg-muted/40 p-4 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center"
          >
            <div className="rounded-card border border-border bg-muted p-3 text-link">
              <FileIcon mimeType={item.mimeType} extension={item.extension} />
            </div>
            <div className="min-w-0">
              <h3 className="truncate font-medium text-foreground">{item.label}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {item.kind} · {formatBytes(item.size)} · {item.filename}
              </p>
              <dl className="mt-2 grid gap-1 text-xs text-muted-foreground">
                <div className="flex min-w-0 gap-2">
                  <dt className="shrink-0 font-semibold text-muted-foreground">
                    SHA-256
                  </dt>
                  <dd
                    className="truncate font-mono"
                    title={item.checksumSha256}
                  >
                    {item.checksumSha256}
                  </dd>
                </div>
                {item.checksumSha1 ? (
                  <div className="flex min-w-0 gap-2">
                    <dt className="shrink-0 font-semibold text-muted-foreground">
                      SHA-1
                    </dt>
                    <dd
                      className="truncate font-mono"
                      title={item.checksumSha1}
                    >
                      {item.checksumSha1}
                    </dd>
                  </div>
                ) : null}
                {item.checksumMd5 ? (
                  <div className="flex min-w-0 gap-2">
                    <dt className="shrink-0 font-semibold text-muted-foreground">
                      MD5
                    </dt>
                    <dd className="truncate font-mono" title={item.checksumMd5}>
                      {item.checksumMd5}
                    </dd>
                  </div>
                ) : null}
                <div className="flex gap-2">
                  <dt className="font-semibold text-muted-foreground">MIME</dt>
                  <dd className="font-mono">{item.mimeType}</dd>
                </div>
              </dl>
            </div>
            <a
              href={downloadUrl(item.downloadUrl)}
              download={item.filename}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border px-4 text-sm font-medium text-link transition hover:border-ring hover:bg-muted"
            >
              <Download className="size-4" /> Завантажити
            </a>
          </article>
        ))}
      </div>
    </section>
  );
}
